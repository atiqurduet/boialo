import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) throw bErr;

    const results: Array<{ bucket: string; path: string; url: string; size: number }> = [];

    const walk = async (bucket: string, prefix = "") => {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      for (const item of data || []) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        // Folders have no id
        if (!item.id) {
          await walk(bucket, full);
        } else {
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(full, 60 * 60 * 24 * 7);
          if (signed?.signedUrl) {
            results.push({
              bucket,
              path: full,
              url: signed.signedUrl,
              size: (item.metadata as any)?.size ?? 0,
            });
          }
        }
      }
    };

    for (const b of buckets || []) {
      await walk(b.name);
    }

    return new Response(
      JSON.stringify({ count: results.length, files: results }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});