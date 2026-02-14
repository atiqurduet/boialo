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

// Twilio SMS sender - uses config from database or env variables
async function sendViaTwilio(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  // Try database config first, then fall back to environment variables
  const account_sid = config.account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
  const auth_token = config.auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");
  const from_number = config.from_number || Deno.env.get("TWILIO_PHONE_NUMBER");
  
  if (!account_sid || !auth_token || !from_number) {
    console.error("Twilio credentials not configured (neither in database nor environment)");
    return false;
  }

  console.log("Using Twilio with account:", account_sid.substring(0, 8) + "...");

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

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("Twilio error:", responseText);
      return false;
    }

    console.log("SMS sent via Twilio successfully");
    return true;
  } catch (error) {
    console.error("Twilio request error:", error);
    return false;
  }
}

// MSG91 SMS sender
async function sendViaMSG91(phone: string, message: string, config: Record<string, string>): Promise<boolean> {
  const { auth_key, sender_id, template_id, route } = config;

  if (!auth_key || !sender_id) {
    console.error("MSG91 config incomplete");
    return false;
  }

  // Extract OTP from message for template
  const otpMatch = message.match(/\d{6}/);
  const otp = otpMatch ? otpMatch[0] : message;

  const url = "https://control.msg91.com/api/v5/flow/";
  
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
      VAR1: otp,
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

// SSL Wireless SMS sender (Bangladesh)
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
      csms_id: `otp_${Date.now()}`,
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

// BulkSMSBD sender
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

// Main SMS sender function - supports all providers with database config
async function sendSMS(phone: string, message: string, provider: SMSProvider): Promise<boolean> {
  console.log(`Attempting to send SMS via ${provider.name} (${provider.provider})`);
  
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
    const body = await req.json();
    
    // Input validation
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 20) : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const userOtp = typeof body.otp === 'string' ? body.otp.trim().slice(0, 6) : '';

    // Validate phone format (Bangladesh: +880XXXXXXXXXX or 01XXXXXXXXX)
    const phoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
    if (!phone || !phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
      return new Response(
        JSON.stringify({ error: "Valid Bangladesh phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate action
    if (!['send', 'verify'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "send") {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      const { error: insertError } = await supabase
        .from("phone_verifications")
        .insert({
          phone: phone,
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      const message = `আপনার বইআলো OTP কোড: ${otp}। এটি ৫ মিনিটের জন্য বৈধ।`;
      let smsSent = false;

      if (providers && providers.length > 0) {
        const provider = providers[0] as SMSProvider;
        smsSent = await sendSMS(phone, message, provider);
        
        if (smsSent) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "OTP sent successfully",
              provider: provider.name
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fallback: No provider configured
      console.log(`OTP generated for ${phone} (SMS not sent - no active provider)`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP generated",
          warning: "No SMS provider configured."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (action === "verify") {
      if (!userOtp) {
        return new Response(
          JSON.stringify({ error: "OTP is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: verification, error: findError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("otp_code", userOtp)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error("Error finding verification:", findError);
        return new Response(
          JSON.stringify({ error: "Verification failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!verification) {
        // Check attempts
        const { data: latestAttempt } = await supabase
          .from("phone_verifications")
          .select("attempts")
          .eq("phone", phone)
          .eq("verified", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestAttempt && latestAttempt.attempts >= 3) {
          return new Response(
            JSON.stringify({ error: "Too many attempts. Please request a new OTP." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Increment attempts
        await supabase
          .from("phone_verifications")
          .update({ attempts: (latestAttempt?.attempts || 0) + 1 })
          .eq("phone", phone)
          .eq("verified", false);

        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("OTP error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
