import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    // Get IP & user agent from request
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const rows = events.map((evt: any) => ({
      event_name: evt.event_name || "unknown",
      event_data: evt.event_data || {},
      page_path: evt.page_path || null,
      page_title: evt.page_title || null,
      referrer: evt.referrer || null,
      user_id: evt.user_id || null,
      session_id: evt.session_id || null,
      device_type: evt.device_type || null,
      browser: evt.browser || null,
      os: evt.os || null,
      screen_resolution: evt.screen_resolution || null,
      language: evt.language || null,
      country: evt.country || null,
      city: evt.city || null,
      ip_address: ip,
      user_agent: userAgent,
      utm_source: evt.utm_source || null,
      utm_medium: evt.utm_medium || null,
      utm_campaign: evt.utm_campaign || null,
    }));

    const { error } = await supabase.from("server_side_events").insert(rows);
    if (error) throw error;

    // Forward conversion events to Facebook CAPI if configured
    if (["Purchase", "AddToCart", "InitiateCheckout", "ViewContent", "Lead"].includes(rows[0]?.event_name)) {
      try {
        const { data: settings } = await supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["fb_pixel_id", "fb_capi_token"]);

        const pixelId = settings?.find((s: any) => s.setting_key === "fb_pixel_id")?.setting_value;
        const accessToken = settings?.find((s: any) => s.setting_key === "fb_capi_token")?.setting_value;

        if (pixelId && accessToken) {
          const fbEvents = rows.map((r) => ({
            event_name: r.event_name,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_source_url: r.page_path || undefined,
            user_data: {
              client_ip_address: r.ip_address,
              client_user_agent: r.user_agent,
              external_id: r.user_id || r.session_id,
            },
            custom_data: r.event_data,
          }));

          await fetch(
            `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: fbEvents }),
            }
          );
        }
      } catch (e) {
        console.error("FB CAPI forward error:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Server track error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
