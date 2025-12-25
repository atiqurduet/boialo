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

interface Order {
  id: string;
  order_number: string;
  status: string;
  full_name: string;
  phone: string;
  total: number;
  tracking_number: string | null;
  courier_provider: string | null;
}

// Status messages in Bengali
const statusMessages: Record<string, (order: Order) => string> = {
  confirmed: (order) => 
    `বইআলো: আপনার অর্ডার #${order.order_number} নিশ্চিত করা হয়েছে। মোট: ৳${order.total}। ধন্যবাদ!`,
  
  processing: (order) => 
    `বইআলো: আপনার অর্ডার #${order.order_number} প্রস্তুত হচ্ছে। শীঘ্রই ডেলিভারি হবে।`,
  
  shipped: (order) => {
    let msg = `বইআলো: আপনার অর্ডার #${order.order_number} শিপ করা হয়েছে।`;
    if (order.tracking_number) {
      msg += ` ট্র্যাকিং: ${order.tracking_number}`;
    }
    if (order.courier_provider) {
      msg += ` (${order.courier_provider})`;
    }
    return msg;
  },
  
  delivered: (order) => 
    `বইআলো: আপনার অর্ডার #${order.order_number} সফলভাবে ডেলিভারি হয়েছে। ধন্যবাদ!`,
  
  cancelled: (order) => 
    `বইআলো: আপনার অর্ডার #${order.order_number} বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে যোগাযোগ করুন।`,
};

// SMS sending functions (reused from send-otp)
async function sendViaTwilio(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { account_sid, auth_token, from_number } = config;
  
  if (!account_sid || !auth_token || !from_number) {
    console.error("Twilio config incomplete");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;
  const auth = btoa(`${account_sid}:${auth_token}`);

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

  console.log("SMS sent via Twilio");
  return true;
}

async function sendViaMSG91(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { auth_key, sender_id, template_id } = config;

  if (!auth_key || !sender_id) {
    console.error("MSG91 config incomplete");
    return false;
  }

  const url = "https://control.msg91.com/api/v5/otp/";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "authkey": auth_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: template_id || "default",
      sender: sender_id,
      short_url: "0",
      mobiles: phone.replace("+", ""),
      message: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("MSG91 error:", error);
    return false;
  }

  console.log("SMS sent via MSG91");
  return true;
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
      csms_id: `order_${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SSL Wireless error:", error);
    return false;
  }

  console.log("SMS sent via SSL Wireless");
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

  console.log("SMS sent via BulkSMSBD");
  return true;
}

async function sendSMS(phone: string, message: string, provider: SMSProvider): Promise<boolean> {
  switch (provider.provider) {
    case "twilio":
      return sendViaTwilio(phone, message, provider.config);
    case "msg91":
      return sendViaMSG91(phone, message, provider.config);
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
    const { order_id, new_status, order_number, phone, full_name, total, tracking_number, courier_provider } = await req.json();
    
    console.log("Order SMS notification request:", { order_id, new_status, order_number });

    // Validate required fields
    if (!order_id && !order_number) {
      return new Response(
        JSON.stringify({ error: "order_id or order_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let order: Order;

    // If order details provided directly, use them
    if (phone && order_number && new_status) {
      order = {
        id: order_id || "",
        order_number,
        status: new_status,
        full_name: full_name || "গ্রাহক",
        phone,
        total: total || 0,
        tracking_number: tracking_number || null,
        courier_provider: courier_provider || null,
      };
    } else {
      // Fetch order from database
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq(order_id ? "id" : "order_number", order_id || order_number)
        .single();

      if (orderError || !orderData) {
        console.error("Error fetching order:", orderError);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      order = {
        id: orderData.id,
        order_number: orderData.order_number,
        status: new_status || orderData.status,
        full_name: orderData.full_name,
        phone: orderData.phone,
        total: orderData.total,
        tracking_number: orderData.tracking_number,
        courier_provider: orderData.courier_provider,
      };
    }

    // Check if we have a message for this status
    const messageGenerator = statusMessages[order.status];
    if (!messageGenerator) {
      console.log(`No SMS message configured for status: ${order.status}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No SMS configured for this status",
          status: order.status 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = messageGenerator(order);
    console.log(`SMS message for ${order.phone}: ${message}`);

    // Get default active SMS provider
    const { data: providers, error: providerError } = await supabase
      .from("sms_providers")
      .select("*")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1);

    if (providerError) {
      console.error("Error fetching SMS provider:", providerError);
    }

    let smsSent = false;
    let providerName = "none";

    if (providers && providers.length > 0) {
      const provider = providers[0] as SMSProvider;
      providerName = provider.name;
      smsSent = await sendSMS(order.phone, message, provider);
    }

    if (smsSent) {
      console.log(`SMS sent successfully to ${order.phone} via ${providerName}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "SMS sent successfully",
          provider: providerName,
          order_number: order.order_number,
          status: order.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SMS not sent (no provider or failed)
    console.log(`SMS not sent for order ${order.order_number} - no active provider or send failed`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Order status update processed",
        warning: "No SMS provider configured or SMS send failed",
        order_number: order.order_number,
        status: order.status,
        // For testing, log the message that would have been sent
        debug_message: message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Order SMS notification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
