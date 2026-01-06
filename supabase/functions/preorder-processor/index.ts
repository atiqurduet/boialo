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

// SMS sending functions
async function sendViaTwilio(phone: string, message: string): Promise<boolean> {
  const account_sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const auth_token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from_number = Deno.env.get("TWILIO_PHONE_NUMBER");
  
  if (!account_sid || !auth_token || !from_number) {
    console.error("Twilio environment variables not configured");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;
  const auth = btoa(`${account_sid}:${auth_token}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: from_number,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Twilio request error:", error);
    return false;
  }
}

async function sendViaSSLWireless(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { api_token, sid } = config;

  if (!api_token || !sid) {
    console.error("SSL Wireless config incomplete");
    return false;
  }

  const url = "https://smsplus.sslwireless.com/api/v3/send-sms";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_token: api_token,
      sid: sid,
      msisdn: phone.replace("+88", "").replace("+", ""),
      sms: message,
      csms_id: `preorder_${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SSL Wireless error:", error);
    return false;
  }

  return true;
}

async function sendViaBulkSMSBD(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { api_key, sender_id } = config;

  if (!api_key || !sender_id) {
    console.error("BulkSMSBD config incomplete");
    return false;
  }

  const url = `https://bulksmsbd.net/api/smsapi`;
  const params = new URLSearchParams({
    api_key: api_key,
    type: "text",
    number: phone.replace("+88", "").replace("+", ""),
    senderid: sender_id,
    message: message,
  });

  const response = await fetch(`${url}?${params}`);

  if (!response.ok) {
    const error = await response.text();
    console.error("BulkSMSBD error:", error);
    return false;
  }

  return true;
}

async function sendSMS(phone: string, message: string, provider: SMSProvider): Promise<boolean> {
  switch (provider.provider) {
    case "twilio":
      return sendViaTwilio(phone, message);
    case "ssl_wireless":
      return sendViaSSLWireless(phone, message, provider.config);
    case "bulksmsbd":
      return sendViaBulkSMSBD(phone, message, provider.config);
    default:
      console.error("Unknown SMS provider:", provider.provider);
      return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Processing pre-orders for date: ${today}`);

    // Find all pre-order products where release_date <= today
    const { data: expiredPreorders, error: fetchError } = await supabase
      .from("products")
      .select("id, title_bn, title_en, release_date, slug")
      .eq("is_preorder", true)
      .eq("is_active", true)
      .lte("release_date", today);

    if (fetchError) {
      console.error("Error fetching expired pre-orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pre-orders" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredPreorders || expiredPreorders.length === 0) {
      console.log("No expired pre-orders found");
      return new Response(
        JSON.stringify({ success: true, message: "No pre-orders to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredPreorders.length} expired pre-orders`);

    const processedProducts: string[] = [];
    const failedProducts: string[] = [];

    // Update each pre-order product
    for (const product of expiredPreorders as Product[]) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          is_preorder: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", product.id);

      if (updateError) {
        console.error(`Failed to update product ${product.id}:`, updateError);
        failedProducts.push(product.title_bn);
      } else {
        console.log(`Updated product ${product.id}: ${product.title_bn}`);
        processedProducts.push(product.title_bn);
      }
    }

    // Get admin phone numbers from site_settings or profiles with admin role
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const adminUserIds = adminRoles.map(r => r.user_id);
      
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .in("id", adminUserIds)
        .not("phone", "is", null);

      if (adminProfiles && adminProfiles.length > 0) {
        // Get SMS provider
        const { data: providers } = await supabase
          .from("sms_providers")
          .select("*")
          .eq("is_active", true)
          .order("is_default", { ascending: false })
          .order("sort_order", { ascending: true })
          .limit(1);

        if (providers && providers.length > 0) {
          const provider = providers[0] as SMSProvider;
          
          const message = processedProducts.length > 0
            ? `বইআলো: ${processedProducts.length}টি প্রি-অর্ডার পণ্য আজ প্রকাশিত হয়েছে। পণ্য: ${processedProducts.slice(0, 3).join(', ')}${processedProducts.length > 3 ? '...' : ''}`
            : `বইআলো: প্রি-অর্ডার প্রক্রিয়াকরণ সম্পন্ন। কোনো পণ্য আপডেট হয়নি।`;

          // Send SMS to all admins
          for (const admin of adminProfiles) {
            if (admin.phone) {
              await sendSMS(admin.phone, message, provider);
              console.log(`Notification sent to admin: ${admin.full_name || admin.phone}`);
            }
          }
        } else {
          console.log("No SMS provider configured - notifications not sent");
        }
      }
    }

    // Log to admin audit
    await supabase
      .from("admin_audit_logs")
      .insert({
        action: "preorder_auto_processed",
        table_name: "products",
        new_values: {
          processed_count: processedProducts.length,
          failed_count: failedProducts.length,
          products: processedProducts,
          date: today,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedProducts.length} pre-orders`,
        processed: processedProducts.length,
        failed: failedProducts.length,
        products: processedProducts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Pre-order processor error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
