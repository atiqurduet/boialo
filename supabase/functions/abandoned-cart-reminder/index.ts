import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH CHECK: Require admin role or service role key ---
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;

    if (!isServiceRole) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const supabaseTmp = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await supabaseTmp.from("user_roles").select("role").eq("user_id", claimsData.claims.sub).maybeSingle();
      if (!roleData || !["admin", "manager"].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }
    // --- END AUTH CHECK ---

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting abandoned cart reminder process...");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: abandonedCarts, error: cartsError } = await supabase
      .from("abandoned_checkouts")
      .select("*")
      .eq("recovered", false)
      .lt("last_activity_at", oneHourAgo)
      .gt("last_activity_at", twentyFourHoursAgo)
      .not("email", "is", null);

    if (cartsError) throw cartsError;

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ message: "No abandoned carts to process" }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: template, error: templateError } = await supabase.from("email_templates").select("*").eq("template_type", "abandoned_cart").eq("is_active", true).single();
    if (templateError || !template) {
      return new Response(JSON.stringify({ error: "No abandoned cart email template found" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];
    const siteUrl = Deno.env.get("SITE_URL") || "https://boialo.lovable.app";

    for (const cart of abandonedCarts) {
      try {
        const cartItems = cart.cart_items as Array<{ quantity: number }> || [];
        const itemCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

        let html = template.html_content
          .replace(/\{\{name\}\}/g, cart.full_name || "প্রিয় গ্রাহক")
          .replace(/\{\{item_count\}\}/g, itemCount.toString())
          .replace(/\{\{total\}\}/g, (cart.subtotal || 0).toString())
          .replace(/\{\{cart_url\}\}/g, `${siteUrl}/cart`);

        let subject = template.subject
          .replace(/\{\{name\}\}/g, cart.full_name || "প্রিয় গ্রাহক")
          .replace(/\{\{item_count\}\}/g, itemCount.toString());

        const emailResponse = await supabase.functions.invoke("send-email", { body: { to: cart.email, subject, html } });

        if (emailResponse.error) {
          results.push({ email: cart.email, success: false, error: emailResponse.error.message });
        } else {
          results.push({ email: cart.email, success: true });

          const { data: existingSubscriber } = await supabase.from("email_subscribers").select("id").eq("email", cart.email).single();
          if (!existingSubscriber) {
            await supabase.from("email_subscribers").insert({ email: cart.email, full_name: cart.full_name, phone: cart.phone, user_id: cart.user_id, source: "abandoned_cart" });
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({ email: cart.email, success: false, error: errMsg });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({ message: "Abandoned cart reminders processed", total: results.length, success: successCount, failed: results.length - successCount, results }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in abandoned-cart-reminder function:", error);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
