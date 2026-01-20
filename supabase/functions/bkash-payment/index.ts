import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BkashConfig {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox: boolean;
}

// Get bKash base URL based on sandbox mode
const getBkashBaseUrl = (sandbox: boolean) => {
  return sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";
};

// Get bKash grant token
const getGrantToken = async (config: BkashConfig): Promise<string> => {
  const baseUrl = getBkashBaseUrl(config.sandbox);
  
  const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "username": config.username,
      "password": config.password,
    },
    body: JSON.stringify({
      app_key: config.app_key,
      app_secret: config.app_secret,
    }),
  });

  const data = await response.json();
  
  if (data.statusCode !== "0000") {
    console.error("bKash token grant error:", data);
    throw new Error(data.statusMessage || "Failed to get bKash token");
  }

  return data.id_token;
};

// Create bKash payment
const createPayment = async (
  config: BkashConfig,
  token: string,
  amount: number,
  orderId: string,
  callbackUrl: string
) => {
  const baseUrl = getBkashBaseUrl(config.sandbox);
  
  const response = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
      "X-APP-Key": config.app_key,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: orderId,
      callbackURL: callbackUrl,
      amount: amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: orderId,
    }),
  });

  const data = await response.json();
  
  if (data.statusCode !== "0000") {
    console.error("bKash create payment error:", data);
    throw new Error(data.statusMessage || "Failed to create bKash payment");
  }

  return data;
};

// Execute bKash payment
const executePayment = async (
  config: BkashConfig,
  token: string,
  paymentID: string
) => {
  const baseUrl = getBkashBaseUrl(config.sandbox);
  
  const response = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
      "X-APP-Key": config.app_key,
    },
    body: JSON.stringify({
      paymentID: paymentID,
    }),
  });

  const data = await response.json();
  
  return data;
};

// Query bKash payment status
const queryPayment = async (
  config: BkashConfig,
  token: string,
  paymentID: string
) => {
  const baseUrl = getBkashBaseUrl(config.sandbox);
  
  const response = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
      "X-APP-Key": config.app_key,
    },
    body: JSON.stringify({
      paymentID: paymentID,
    }),
  });

  const data = await response.json();
  return data;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, orderId, amount, paymentID, callbackUrl } = await req.json();

    // Get bKash config from database
    const { data: paymentMethod, error: configError } = await supabase
      .from("payment_methods")
      .select("config")
      .eq("provider", "bkash")
      .eq("is_active", true)
      .single();

    if (configError || !paymentMethod) {
      console.error("bKash config error:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "bKash is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const config = paymentMethod.config as BkashConfig;

    // Validate config
    if (!config.app_key || !config.app_secret || !config.username || !config.password) {
      return new Response(
        JSON.stringify({ success: false, error: "bKash credentials are incomplete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get grant token
    const token = await getGrantToken(config);

    if (action === "create") {
      // Create payment
      if (!orderId || !amount || !callbackUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const result = await createPayment(config, token, amount, orderId, callbackUrl);

      return new Response(
        JSON.stringify({
          success: true,
          paymentID: result.paymentID,
          bkashURL: result.bkashURL,
          statusCode: result.statusCode,
          statusMessage: result.statusMessage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "execute") {
      // Execute payment after callback
      if (!paymentID) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing paymentID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const result = await executePayment(config, token, paymentID);

      if (result.statusCode === "0000" && result.transactionStatus === "Completed") {
        return new Response(
          JSON.stringify({
            success: true,
            transactionStatus: result.transactionStatus,
            trxID: result.trxID,
            paymentID: result.paymentID,
            amount: result.amount,
            payerReference: result.payerReference,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.statusMessage || "Payment execution failed",
            statusCode: result.statusCode,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "query") {
      // Query payment status
      if (!paymentID) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing paymentID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const result = await queryPayment(config, token, paymentID);

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("bKash payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Payment processing failed";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
