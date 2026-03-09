import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IPN (Instant Payment Notification) handler for SSLCommerz
// This is called by SSLCommerz servers after payment completion

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SSLCommerz sends POST with form data
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = value.toString(); });

    const tranId = data.tran_id;
    const status = data.status;
    const valId = data.val_id;
    const amount = data.amount;
    const cardType = data.card_type;
    const bankTranId = data.bank_tran_id;
    const orderId = data.value_a; // We stored order UUID here

    console.log(`SSLCommerz IPN: tran_id=${tranId}, status=${status}, val_id=${valId}`);

    if (!tranId || !status) {
      return new Response("Missing data", { status: 400 });
    }

    // Validate with SSLCommerz
    const { data: paymentMethod } = await supabase
      .from("payment_methods")
      .select("config")
      .eq("provider", "sslcommerz")
      .eq("is_active", true)
      .single();

    if (!paymentMethod) {
      return new Response("Config not found", { status: 400 });
    }

    const config = paymentMethod.config as { store_id: string; store_passwd: string; sandbox: boolean };
    const baseUrl = config.sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";

    // Validate transaction
    if (valId) {
      const validateRes = await fetch(
        `${baseUrl}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${config.store_id}&store_passwd=${config.store_passwd}&format=json`
      );
      const validateData = await validateRes.json();

      if (validateData.status === "VALID" || validateData.status === "VALIDATED") {
        // Update order status
        if (orderId) {
          await supabase.from("orders").update({
            status: "confirmed",
            transaction_id: bankTranId || valId,
          }).eq("id", orderId);

          // Insert status history
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            status: "confirmed",
            notes: `SSLCommerz payment confirmed. Card: ${cardType || 'N/A'}, Amount: ৳${amount}`,
          });
        }
      }
    }

    return new Response("IPN Received", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("SSLCommerz IPN error:", error);
    return new Response("Error", { status: 500 });
  }
});
