import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OfferNotificationRequest {
  offer_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { offer_id }: OfferNotificationRequest = await req.json();

    console.log("Sending offer notification for offer:", offer_id);

    // Get the offer details
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offer_id)
      .single();

    if (offerError || !offer) {
      console.error("Offer not found:", offerError);
      return new Response(
        JSON.stringify({ error: "Offer not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the new offer email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", "new_offer")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("No active new offer template found");
      return new Response(
        JSON.stringify({ error: "No new offer email template found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from("email_subscribers")
      .select("*")
      .eq("status", "active");

    if (subscribersError) {
      console.error("Error fetching subscribers:", subscribersError);
      throw subscribersError;
    }

    console.log(`Found ${subscribers?.length || 0} active subscribers`);

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscribers" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://boialo.lovable.app";
    const endDate = offer.end_date 
      ? new Date(offer.end_date).toLocaleDateString("bn-BD")
      : "সীমিত সময়";

    // Create a campaign for tracking
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        name: `Offer: ${offer.name_bn}`,
        subject: template.subject.replace(/\{\{offer_name\}\}/g, offer.name_bn),
        content: template.html_content,
        campaign_type: "offer",
        status: "sending",
        total_recipients: subscribers.length,
      })
      .select()
      .single();

    if (campaignError) {
      console.error("Error creating campaign:", campaignError);
    }

    const emails: string[] = [];
    const subscriberIds: string[] = [];

    for (const subscriber of subscribers) {
      // Replace template variables
      let html = template.html_content
        .replace(/\{\{offer_name\}\}/g, offer.name_bn)
        .replace(/\{\{offer_description\}\}/g, offer.description_bn || "")
        .replace(/\{\{discount\}\}/g, (offer.discount_value || 0).toString())
        .replace(/\{\{end_date\}\}/g, endDate)
        .replace(/\{\{offer_url\}\}/g, `${siteUrl}/offers/${offer.slug}`);

      emails.push(subscriber.email);
      subscriberIds.push(subscriber.id);
    }

    // Send emails in batches
    const batchSize = 50;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batchEmails = emails.slice(i, i + batchSize);
      const batchSubscriberIds = subscriberIds.slice(i, i + batchSize);

      let subject = template.subject.replace(/\{\{offer_name\}\}/g, offer.name_bn);
      let html = template.html_content
        .replace(/\{\{offer_name\}\}/g, offer.name_bn)
        .replace(/\{\{offer_description\}\}/g, offer.description_bn || "")
        .replace(/\{\{discount\}\}/g, (offer.discount_value || 0).toString())
        .replace(/\{\{end_date\}\}/g, endDate)
        .replace(/\{\{offer_url\}\}/g, `${siteUrl}/offers/${offer.slug}`);

      const emailResponse = await supabase.functions.invoke("send-email", {
        body: {
          to: batchEmails,
          subject,
          html,
          campaign_id: campaign?.id,
          subscriber_ids: batchSubscriberIds,
        },
      });

      if (emailResponse.data?.results) {
        totalSent += emailResponse.data.results.filter((r: { success: boolean }) => r.success).length;
        totalFailed += emailResponse.data.results.filter((r: { success: boolean }) => !r.success).length;
      }
    }

    // Update campaign status
    if (campaign) {
      await supabase
        .from("email_campaigns")
        .update({
          status: "sent",
          sent_count: totalSent,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }

    console.log(`Offer notification complete: ${totalSent} sent, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        message: "Offer notification sent",
        offer: offer.name_bn,
        total_subscribers: subscribers.length,
        sent: totalSent,
        failed: totalFailed,
        campaign_id: campaign?.id,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in offer-notification function:", error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
