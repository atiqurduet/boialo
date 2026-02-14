import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  campaign_id?: string;
  subscriber_ids?: string[];
}

interface ProviderConfig {
  api_key?: string;
  server_prefix?: string;
  audience_id?: string;
  from_email?: string;
  access_key?: string;
  secret_key?: string;
  region?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Input validation
    const to = body.to;
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 500) : '';
    const html = typeof body.html === 'string' ? body.html.slice(0, 500000) : '';
    const from = typeof body.from === 'string' ? body.from.trim().slice(0, 255) : undefined;
    const campaign_id = typeof body.campaign_id === 'string' ? body.campaign_id.trim() : undefined;
    const subscriber_ids = Array.isArray(body.subscriber_ids) ? body.subscriber_ids : undefined;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : (typeof to === 'string' ? [to] : []);
    
    if (recipients.length === 0 || recipients.length > 500) {
      return new Response(
        JSON.stringify({ error: "1 to 500 recipient emails required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    for (const email of recipients) {
      if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
        return new Response(
          JSON.stringify({ error: `Invalid email address: ${String(email).slice(0, 50)}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Subject and HTML content are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate campaign_id as UUID if provided
    if (campaign_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid campaign ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending email to:", recipients.length, "recipients");

    // Get default provider
    const { data: provider, error: providerError } = await supabase
      .from("email_providers")
      .select("*")
      .eq("is_default", true)
      .eq("is_active", true)
      .single();

    if (providerError || !provider) {
      console.error("No active default email provider found");
      return new Response(
        JSON.stringify({ error: "No active email provider configured" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const config = provider.config as ProviderConfig;
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const email of recipients) {
      try {
        let success = false;
        let errorMsg = "";

        switch (provider.provider) {
          case "resend":
            const resendResult = await sendWithResend(config, email, subject, html, from);
            success = resendResult.success;
            errorMsg = resendResult.error || "";
            break;

          case "mailchimp":
            const mailchimpResult = await sendWithMailchimp(config, email, subject, html);
            success = mailchimpResult.success;
            errorMsg = mailchimpResult.error || "";
            break;

          case "sendgrid":
            const sendgridResult = await sendWithSendgrid(config, email, subject, html, from);
            success = sendgridResult.success;
            errorMsg = sendgridResult.error || "";
            break;

          default:
            errorMsg = `Unsupported provider: ${provider.provider}`;
        }

        results.push({ email, success, error: errorMsg || undefined });

        // Log the email
        const subscriberId = subscriber_ids?.[recipients.indexOf(email)];
        await supabase.from("email_logs").insert({
          campaign_id,
          subscriber_id: subscriberId,
          email,
          subject,
          status: success ? "sent" : "failed",
          error_message: errorMsg || null,
          sent_at: success ? new Date().toISOString() : null,
        });

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error sending to ${email}:`, error);
        results.push({ email, success: false, error: errMsg });
      }
    }

    // Update campaign stats if campaign_id provided
    if (campaign_id) {
      const successCount = results.filter(r => r.success).length;
      await supabase
        .from("email_campaigns")
        .update({
          sent_count: successCount,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);
    }

    const allSuccess = results.every(r => r.success);
    console.log("Email send results:", results);

    return new Response(
      JSON.stringify({ 
        success: allSuccess, 
        results,
        provider: provider.provider 
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendWithResend(
  config: ProviderConfig,
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.api_key) {
    return { success: false, error: "Resend API key not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      from: from || config.from_email || "onboarding@resend.dev",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend error:", error);
    return { success: false, error };
  }

  return { success: true };
}

async function sendWithMailchimp(
  config: ProviderConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.api_key || !config.server_prefix) {
    return { success: false, error: "Mailchimp credentials not configured" };
  }

  // Mailchimp Transactional (Mandrill) API
  const response = await fetch("https://mandrillapp.com/api/1.0/messages/send.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: config.api_key,
      message: {
        html,
        subject,
        from_email: config.from_email || "noreply@example.com",
        to: [{ email: to, type: "to" }],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Mailchimp error:", error);
    return { success: false, error };
  }

  const result = await response.json();
  if (result[0]?.status === "rejected" || result[0]?.status === "invalid") {
    return { success: false, error: result[0].reject_reason || "Email rejected" };
  }

  return { success: true };
}

async function sendWithSendgrid(
  config: ProviderConfig,
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.api_key) {
    return { success: false, error: "SendGrid API key not configured" };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from || config.from_email || "noreply@example.com" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("SendGrid error:", error);
    return { success: false, error };
  }

  return { success: true };
}
