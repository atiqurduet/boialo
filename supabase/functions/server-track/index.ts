import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOT_PATTERNS = /bot|crawl|spider|slurp|mediapartners|headless|phantom|selenium|puppeteer|playwright|lighthouse|pagespeed|gtmetrix|pingdom|wget|curl/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const events: any[] = Array.isArray(body) ? body : [body];

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const serverDetectedBot = userAgent ? BOT_PATTERNS.test(userAgent) : false;

    // Build rows synchronously (cheap)
    const rows = events.map((evt: any) => ({
      event_name: evt.event_name || "unknown",
      event_data: evt.event_data || {},
      page_path: evt.page_path || null,
      page_title: evt.page_title || null,
      referrer: evt.referrer || null,
      user_id: evt.user_id || null,
      session_id: evt.session_id || null,
      fingerprint_id: evt.fingerprint_id || null,
      device_type: evt.device_type || null,
      browser: evt.browser || null,
      os: evt.os || null,
      screen_resolution: evt.screen_resolution || null,
      viewport_width: evt.viewport_width || null,
      viewport_height: evt.viewport_height || null,
      language: evt.language || null,
      country: evt.country || null,
      city: evt.city || null,
      ip_address: ip,
      user_agent: userAgent,
      connection_type: evt.connection_type || null,
      utm_source: evt.utm_source || null,
      utm_medium: evt.utm_medium || null,
      utm_campaign: evt.utm_campaign || null,
      is_bot: evt.is_bot || serverDetectedBot,
      dedup_key: evt.dedup_key || null,
      attribution_source: evt.attribution_source || null,
      attribution_medium: evt.attribution_medium || null,
      attribution_campaign: evt.attribution_campaign || null,
      attribution_type: evt.attribution_type || 'last_touch',
      scroll_depth: typeof evt.event_data?.depth === 'number' ? evt.event_data.depth : (typeof evt.event_data?.scroll_depth === 'number' ? evt.event_data.scroll_depth : null),
      time_on_page: typeof evt.event_data?.time_on_page === 'number' ? evt.event_data.time_on_page : null,
      engagement_score: typeof evt.event_data?.engagement_score === 'number' ? evt.event_data.engagement_score : null,
      interaction_count: typeof evt.event_data?.clicks === 'number' ? evt.event_data.clicks : null,
      rage_click: (typeof evt.event_data?.rage_clicks === 'number' && evt.event_data.rage_clicks > 0) || false,
      dead_click: (typeof evt.event_data?.dead_clicks === 'number' && evt.event_data.dead_clicks > 0) || false,
      exit_intent: evt.event_name === 'ExitIntent' || false,
      core_web_vitals: evt.event_name === 'WebVitals' ? evt.event_data : null,
      click_x: typeof evt.event_data?.x === 'number' ? evt.event_data.x : null,
      click_y: typeof evt.event_data?.y === 'number' ? evt.event_data.y : null,
      click_element: typeof evt.event_data?.el === 'string' ? evt.event_data.el : (typeof evt.event_data?.element === 'string' ? evt.event_data.element : null),
      page_load_time: typeof evt.event_data?.load_complete === 'number' ? evt.event_data.load_complete : null,
    }));

    // Do ALL DB/API work in background using waitUntil
    EdgeRuntime.waitUntil(processInBackground(rows));

    // Return immediately
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

async function processInBackground(rows: any[]) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert events
    const { error } = await supabase.from("server_side_events").insert(rows);
    if (error && !error.message?.includes('duplicate key')) {
      console.error("Insert error:", error.message);
    }

    // Engagement scores
    const engagementEvents = rows.filter(r => r.event_name === 'EngagementReport');
    for (const evt of engagementEvents) {
      if (!evt.session_id || !evt.page_path) continue;
      try {
        await supabase.from("engagement_scores").insert({
          session_id: evt.session_id,
          fingerprint_id: evt.fingerprint_id,
          user_id: evt.user_id,
          page_path: evt.page_path,
          scroll_depth: typeof evt.event_data?.scroll_depth === 'number' ? evt.event_data.scroll_depth : 0,
          time_on_page: typeof evt.event_data?.time_on_page === 'number' ? evt.event_data.time_on_page : 0,
          click_count: typeof evt.event_data?.clicks === 'number' ? evt.event_data.clicks : 0,
          rage_clicks: typeof evt.event_data?.rage_clicks === 'number' ? evt.event_data.rage_clicks : 0,
          dead_clicks: typeof evt.event_data?.dead_clicks === 'number' ? evt.event_data.dead_clicks : 0,
          interaction_count: typeof evt.event_data?.scroll_events === 'number' ? evt.event_data.scroll_events : 0,
          engagement_score: typeof evt.engagement_score === 'number' ? evt.engagement_score : 0,
          core_web_vitals: evt.core_web_vitals,
        });
      } catch (e) {
        console.error("Engagement insert error:", e);
      }
    }

    // Attribution
    const pageViews = rows.filter(r => r.event_name === 'PageView' && !r.is_bot);
    for (const pv of pageViews) {
      if (!pv.session_id) continue;
      const { data: existing } = await supabase
        .from("user_attributions")
        .select("id, total_visits")
        .eq("session_id", pv.session_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_attributions").update({
          last_touch_source: pv.attribution_source,
          last_touch_medium: pv.attribution_medium,
          last_touch_campaign: pv.attribution_campaign,
          last_touch_at: new Date().toISOString(),
          total_visits: (existing.total_visits || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_attributions").insert({
          user_id: pv.user_id,
          session_id: pv.session_id,
          fingerprint_id: pv.fingerprint_id,
          first_touch_source: pv.attribution_source,
          first_touch_medium: pv.attribution_medium,
          first_touch_campaign: pv.attribution_campaign,
          last_touch_source: pv.attribution_source,
          last_touch_medium: pv.attribution_medium,
          last_touch_campaign: pv.attribution_campaign,
        });
      }
    }

    // Purchase attribution
    const purchases = rows.filter(r => r.event_name === 'Purchase');
    for (const p of purchases) {
      if (!p.session_id) continue;
      const revenue = p.event_data?.value || 0;
      await supabase.rpc('increment_attribution_conversions' as any, {
        p_session_id: p.session_id,
        p_revenue: revenue,
      }).catch(() => {});
    }

    // Ad platform forwarding
    const conversionEvents = ["Purchase", "AddToCart", "InitiateCheckout", "ViewContent", "Lead", "CompleteRegistration", "AddToWishlist", "Search"];
    const conversions = rows.filter(r => conversionEvents.includes(r.event_name) && !r.is_bot);

    if (conversions.length > 0) {
      const { data: settings } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["fb_pixel_id", "fb_capi_token", "tiktok_pixel_id", "tiktok_access_token", "ga_measurement_id", "ga_api_secret"]);

      const getSetting = (key: string) => {
        let val = settings?.find((s: any) => s.setting_key === key)?.setting_value;
        try { if (typeof val === 'string') val = JSON.parse(val); } catch {}
        return typeof val === 'string' && val.length > 3 ? val : null;
      };

      // Facebook CAPI
      const fbPixelId = getSetting("fb_pixel_id");
      const fbToken = getSetting("fb_capi_token");
      if (fbPixelId && fbToken) {
        try {
          const fbEvents = conversions.map((r) => ({
            event_name: r.event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: r.dedup_key || crypto.randomUUID(),
            action_source: "website",
            event_source_url: r.page_path ? `https://boialo.lovable.app${r.page_path}` : undefined,
            user_data: {
              client_ip_address: r.ip_address,
              client_user_agent: r.user_agent,
              external_id: r.user_id || r.fingerprint_id || r.session_id,
            },
            custom_data: { ...r.event_data, currency: r.event_data?.currency || 'BDT', value: r.event_data?.value || 0 },
          }));
          const res = await fetch(`https://graph.facebook.com/v21.0/${fbPixelId}/events?access_token=${fbToken}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: fbEvents })
          });
          await res.text();
        } catch (e) { console.error("FB CAPI error:", e); }
      }

      // TikTok Events API
      const ttPixelId = getSetting("tiktok_pixel_id");
      const ttToken = getSetting("tiktok_access_token");
      if (ttPixelId && ttToken) {
        try {
          const ttEventMap: Record<string, string> = {
            Purchase: "CompletePayment", AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout",
            ViewContent: "ViewContent", Lead: "SubmitForm", CompleteRegistration: "CompleteRegistration",
            AddToWishlist: "AddToWishlist", Search: "Search",
          };
          const ttEvents = conversions.map((r) => ({
            pixel_code: ttPixelId,
            event: ttEventMap[r.event_name] || r.event_name,
            event_id: r.dedup_key || crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            context: { user_agent: r.user_agent, ip: r.ip_address, page: { url: r.page_path ? `https://boialo.lovable.app${r.page_path}` : undefined }, user: { external_id: r.user_id || r.fingerprint_id || r.session_id } },
            properties: { currency: r.event_data?.currency || "BDT", value: r.event_data?.value || 0 },
          }));
          const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
            method: "POST", headers: { "Content-Type": "application/json", "Access-Token": ttToken }, body: JSON.stringify({ event_source: "web", event_source_id: ttPixelId, data: ttEvents })
          });
          await res.text();
        } catch (e) { console.error("TikTok error:", e); }
      }

      // GA4
      const gaMeasurementId = getSetting("ga_measurement_id");
      const gaApiSecret = getSetting("ga_api_secret");
      if (gaMeasurementId && gaApiSecret) {
        try {
          const gaEventMap: Record<string, string> = {
            Purchase: "purchase", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout",
            ViewContent: "view_item", Lead: "generate_lead", CompleteRegistration: "sign_up",
            AddToWishlist: "add_to_wishlist", Search: "search",
          };
          for (const r of conversions) {
            const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${gaMeasurementId}&api_secret=${gaApiSecret}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ client_id: r.fingerprint_id || r.session_id || crypto.randomUUID(), user_id: r.user_id || undefined, events: [{ name: gaEventMap[r.event_name] || r.event_name.toLowerCase(), params: { currency: r.event_data?.currency || "BDT", value: r.event_data?.value || 0, engagement_time_msec: 100 } }] })
            });
            await res.text();
          }
        } catch (e) { console.error("GA4 error:", e); }
      }
    }
  } catch (e) {
    console.error("Background processing error:", e);
  }
}
