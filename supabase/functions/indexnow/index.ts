import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IndexNow API - Instant indexing for Bing, Yandex, Seznam, Naver
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, host } = await req.json();
    const siteHost = host || "boialo.com";
    const apiKey = Deno.env.get("INDEXNOW_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "INDEXNOW_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlList = Array.isArray(urls) ? urls : [urls];
    const fullUrls = urlList.map((u: string) =>
      u.startsWith("http") ? u : `https://${siteHost}${u}`
    );

    // Submit to IndexNow (covers Bing, Yandex, Seznam, Naver)
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: siteHost,
        key: apiKey,
        keyLocation: `https://${siteHost}/${apiKey}.txt`,
        urlList: fullUrls,
      }),
    });

    // Also submit to Bing directly
    const bingResponse = await fetch("https://www.bing.com/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: siteHost,
        key: apiKey,
        keyLocation: `https://${siteHost}/${apiKey}.txt`,
        urlList: fullUrls,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        indexnow_status: response.status,
        bing_status: bingResponse.status,
        urls_submitted: fullUrls.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
