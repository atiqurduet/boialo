import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NagadConfig {
  merchant_id: string;
  merchant_number: string;
  public_key: string;
  private_key: string;
  sandbox: boolean;
}

const getNagadBaseUrl = (sandbox: boolean) =>
  sandbox ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs" : "https://api.mynagad.com/api/dfs";

const generateTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const generateRandomString = (length: number) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

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
    const { action, orderId, amount, callbackUrl, paymentRefId } = await req.json();

    // Get Nagad config
    const { data: paymentMethod, error: configError } = await supabase
      .from("payment_methods")
      .select("config")
      .eq("provider", "nagad")
      .eq("is_active", true)
      .single();

    if (configError || !paymentMethod) {
      return new Response(JSON.stringify({ success: false, error: "নগদ কনফিগার করা হয়নি" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const config = paymentMethod.config as NagadConfig;
    if (!config.merchant_id || !config.merchant_number) {
      return new Response(JSON.stringify({ success: false, error: "নগদ ক্রেডেনশিয়াল অসম্পূর্ণ" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const baseUrl = getNagadBaseUrl(config.sandbox);
    const timestamp = generateTimestamp();

    if (action === "create") {
      if (!orderId || !amount || !callbackUrl) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      // Verify order ownership
      const { data: order } = await supabase.from("orders").select("user_id").eq("id", orderId).single();
      if (!order || order.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: "Order not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const orderRef = `ORD${Date.now()}`;

      // Step 1: Initialize payment
      const initPayload = {
        merchantId: config.merchant_id,
        datetime: timestamp,
        orderId: orderRef,
        challenge: generateRandomString(40),
      };

      const initRes = await fetch(
        `${baseUrl}/check-out/initialize/${config.merchant_id}/${orderRef}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": "127.0.0.1", "X-KM-Client-Type": "PC_WEB" },
          body: JSON.stringify(initPayload),
        }
      );

      const initData = await initRes.json();
      if (!initData.paymentReferenceId) {
        return new Response(JSON.stringify({ success: false, error: initData.message || "নগদ পেমেন্ট শুরু করতে ব্যর্থ", details: initData }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      // Step 2: Complete initialization
      const completePayload = {
        merchantId: config.merchant_id,
        orderId: orderRef,
        currencyCode: "050",
        amount: amount.toString(),
        challenge: initData.challenge,
      };

      const completeRes = await fetch(
        `${baseUrl}/check-out/complete/${initData.paymentReferenceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": "127.0.0.1", "X-KM-Client-Type": "PC_WEB" },
          body: JSON.stringify(completePayload),
        }
      );

      const completeData = await completeRes.json();

      if (completeData.callBackUrl) {
        return new Response(JSON.stringify({
          success: true,
          paymentRefId: initData.paymentReferenceId,
          nagadURL: completeData.callBackUrl,
          orderRef,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: false, error: completeData.message || "নগদ পেমেন্ট তৈরি ব্যর্থ", details: completeData }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });

    } else if (action === "verify") {
      if (!paymentRefId) {
        return new Response(JSON.stringify({ success: false, error: "Missing paymentRefId" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

      const verifyRes = await fetch(
        `${baseUrl}/verify/payment/${paymentRefId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json", "X-KM-Api-Version": "v-0.2.0", "X-KM-IP-V4": "127.0.0.1", "X-KM-Client-Type": "PC_WEB" },
        }
      );

      const verifyData = await verifyRes.json();

      if (verifyData.status === "Success") {
        return new Response(JSON.stringify({
          success: true,
          status: verifyData.status,
          transactionId: verifyData.issuerPaymentRefNo,
          amount: verifyData.amount,
          orderId: verifyData.orderId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: false, error: verifyData.message || "পেমেন্ট যাচাই ব্যর্থ", status: verifyData.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
  } catch (error: unknown) {
    console.error("Nagad payment error:", error);
    const msg = error instanceof Error ? error.message : "Payment processing failed";
    return new Response(JSON.stringify({ success: false, error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
