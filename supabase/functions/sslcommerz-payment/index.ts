import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SSLConfig {
  store_id: string;
  store_passwd: string;
  sandbox: boolean;
}

const getSSLBaseUrl = (sandbox: boolean) =>
  sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, orderId, amount, customerName, customerEmail, customerPhone, customerAddress, callbackUrl, valId, transactionId } = await req.json();

    // Get SSLCommerz config
    const { data: paymentMethod, error: configError } = await supabase
      .from("payment_methods")
      .select("config")
      .eq("provider", "sslcommerz")
      .eq("is_active", true)
      .single();

    if (configError || !paymentMethod) {
      return new Response(JSON.stringify({ success: false, error: "SSLCommerz কনফিগার করা হয়নি" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const config = paymentMethod.config as SSLConfig;
    if (!config.store_id || !config.store_passwd) {
      return new Response(JSON.stringify({ success: false, error: "SSLCommerz ক্রেডেনশিয়াল অসম্পূর্ণ" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const baseUrl = getSSLBaseUrl(config.sandbox);

    if (action === "create") {
      if (!orderId || !amount) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      // Verify order ownership
      const { data: order } = await supabase.from("orders").select("user_id, order_number").eq("id", orderId).single();
      if (!order || order.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: "Order not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const successUrl = `${callbackUrl}?status=success&order_id=${orderId}`;
      const failUrl = `${callbackUrl}?status=failed&order_id=${orderId}`;
      const cancelUrl = `${callbackUrl}?status=cancel&order_id=${orderId}`;
      const ipnUrl = `${supabaseUrl}/functions/v1/sslcommerz-ipn`;

      const formData = new URLSearchParams();
      formData.append("store_id", config.store_id);
      formData.append("store_passwd", config.store_passwd);
      formData.append("total_amount", amount.toString());
      formData.append("currency", "BDT");
      formData.append("tran_id", order.order_number);
      formData.append("success_url", successUrl);
      formData.append("fail_url", failUrl);
      formData.append("cancel_url", cancelUrl);
      formData.append("ipn_url", ipnUrl);
      formData.append("cus_name", customerName || "Customer");
      formData.append("cus_email", customerEmail || "customer@example.com");
      formData.append("cus_phone", customerPhone || "01700000000");
      formData.append("cus_add1", customerAddress || "Dhaka");
      formData.append("cus_city", "Dhaka");
      formData.append("cus_country", "Bangladesh");
      formData.append("shipping_method", "NO");
      formData.append("product_name", `Order #${order.order_number}`);
      formData.append("product_category", "ecommerce");
      formData.append("product_profile", "general");
      formData.append("value_a", orderId); // Store order ID
      formData.append("value_b", order.order_number);
      // Enable all payment channels
      formData.append("multi_card_name", "");
      formData.append("allowed_bin", "");

      const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.status === "SUCCESS" && data.GatewayPageURL) {
        return new Response(JSON.stringify({
          success: true,
          gatewayUrl: data.GatewayPageURL,
          sessionKey: data.sessionkey,
          transactionId: order.order_number,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: false,
        error: data.failedreason || "SSLCommerz সেশন তৈরি ব্যর্থ",
        details: data,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });

    } else if (action === "validate") {
      if (!valId) {
        return new Response(JSON.stringify({ success: false, error: "Missing validation ID" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      const response = await fetch(
        `${baseUrl}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${config.store_id}&store_passwd=${config.store_passwd}&format=json`
      );

      const data = await response.json();

      if (data.status === "VALID" || data.status === "VALIDATED") {
        return new Response(JSON.stringify({
          success: true,
          status: data.status,
          transactionId: data.tran_id,
          amount: data.amount,
          cardType: data.card_type,
          cardNo: data.card_no,
          bankTranId: data.bank_tran_id,
          validatedOn: data.validated_on,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: false,
        error: "Transaction validation failed",
        status: data.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "refund") {
      if (!transactionId || !amount) {
        return new Response(JSON.stringify({ success: false, error: "Missing fields for refund" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      const refundId = `REF${Date.now()}`;
      const formData = new URLSearchParams();
      formData.append("store_id", config.store_id);
      formData.append("store_passwd", config.store_passwd);
      formData.append("bank_tran_id", transactionId);
      formData.append("refund_amount", amount.toString());
      formData.append("refund_remarks", "Customer refund request");
      formData.append("refe_id", refundId);

      const response = await fetch(`${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await response.json();

      return new Response(JSON.stringify({
        success: data.APIConnect === "DONE",
        refundId,
        refundStatus: data.status,
        refundRefId: data.refund_ref_id,
        details: data,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
  } catch (error: unknown) {
    console.error("SSLCommerz error:", error);
    const msg = error instanceof Error ? error.message : "Payment processing failed";
    return new Response(JSON.stringify({ success: false, error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
