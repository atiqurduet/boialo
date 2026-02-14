import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSProvider {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  config: Record<string, string>;
}

interface Product {
  id: string;
  title_bn: string;
  title_en: string;
  release_date: string;
  slug: string;
}

async function sendViaTwilio(phone: string, message: string): Promise<boolean> {
  const account_sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const auth_token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from_number = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!account_sid || !auth_token || !from_number) return false;
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
      method: "POST", headers: { "Authorization": `Basic ${btoa(`${account_sid}:${auth_token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, From: from_number, Body: message }),
    });
    if (!response.ok) { await response.text(); return false; }
    return true;
  } catch { return false; }
}

async function sendViaSSLWireless(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { api_token, sid } = config;
  if (!api_token || !sid) return false;
  const response = await fetch("https://smsplus.sslwireless.com/api/v3/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_token, sid, msisdn: phone.replace("+88", "").replace("+", ""), sms: message, csms_id: `preorder_${Date.now()}` }) });
  return response.ok;
}

async function sendViaBulkSMSBD(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { api_key, sender_id } = config;
  if (!api_key || !sender_id) return false;
  const params = new URLSearchParams({ api_key, type: "text", number: phone.replace("+88", "").replace("+", ""), senderid: sender_id, message });
  const response = await fetch(`https://bulksmsbd.net/api/smsapi?${params}`);
  return response.ok;
}

async function sendSMS(phone: string, message: string, provider: SMSProvider): Promise<boolean> {
  switch (provider.provider) {
    case "twilio": return sendViaTwilio(phone, message);
    case "ssl_wireless": return sendViaSSLWireless(phone, message, provider.config);
    case "bulksmsbd": return sendViaBulkSMSBD(phone, message, provider.config);
    default: return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH CHECK: Require admin role or service role key ---
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow service role key (for cron/system calls)
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;

    if (!isServiceRole) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", claimsData.claims.sub).maybeSingle();
      if (!roleData || !["admin", "manager"].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    // --- END AUTH CHECK ---

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing pre-orders for date: ${today}`);

    const { data: expiredPreorders, error: fetchError } = await supabase.from("products").select("id, title_bn, title_en, release_date, slug").eq("is_preorder", true).eq("is_active", true).lte("release_date", today);

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch pre-orders" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!expiredPreorders || expiredPreorders.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No pre-orders to process", processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const processedProducts: string[] = [];
    const failedProducts: string[] = [];

    for (const product of expiredPreorders as Product[]) {
      const { error: updateError } = await supabase.from("products").update({ is_preorder: false, updated_at: new Date().toISOString() }).eq("id", product.id);
      if (updateError) { failedProducts.push(product.title_bn); } else { processedProducts.push(product.title_bn); }
    }

    // Notify admins
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (adminRoles && adminRoles.length > 0) {
      const { data: adminProfiles } = await supabase.from("profiles").select("phone, full_name").in("id", adminRoles.map(r => r.user_id)).not("phone", "is", null);
      if (adminProfiles && adminProfiles.length > 0) {
        const { data: providers } = await supabase.from("sms_providers").select("*").eq("is_active", true).order("is_default", { ascending: false }).limit(1);
        if (providers && providers.length > 0) {
          const provider = providers[0] as SMSProvider;
          const message = processedProducts.length > 0
            ? `বইআলো: ${processedProducts.length}টি প্রি-অর্ডার পণ্য আজ প্রকাশিত হয়েছে। পণ্য: ${processedProducts.slice(0, 3).join(', ')}${processedProducts.length > 3 ? '...' : ''}`
            : `বইআলো: প্রি-অর্ডার প্রক্রিয়াকরণ সম্পন্ন। কোনো পণ্য আপডেট হয়নি।`;
          for (const admin of adminProfiles) { if (admin.phone) await sendSMS(admin.phone, message, provider); }
        }
      }
    }

    await supabase.from("admin_audit_logs").insert({ action: "preorder_auto_processed", table_name: "products", new_values: { processed_count: processedProducts.length, failed_count: failedProducts.length, products: processedProducts, date: today } });

    return new Response(JSON.stringify({ success: true, message: `Processed ${processedProducts.length} pre-orders`, processed: processedProducts.length, failed: failedProducts.length, products: processedProducts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Pre-order processor error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
