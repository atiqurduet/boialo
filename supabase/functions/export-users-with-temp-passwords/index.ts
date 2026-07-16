import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out + "!A9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const all: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      all.push(...data.users);
      if (data.users.length < 1000) break;
      page++;
    }

    const rows = [["email", "temp_password", "user_id", "full_name", "phone", "created_at", "status"]];
    let ok = 0, fail = 0;
    for (const u of all) {
      if (!u.email) { rows.push(["", "", u.id, "", u.phone ?? "", u.created_at, "skipped_no_email"]); continue; }
      const pw = genPassword();
      const { error } = await supabase.auth.admin.updateUserById(u.id, { password: pw });
      if (error) {
        fail++;
        rows.push([u.email, "", u.id, u.user_metadata?.full_name ?? "", u.phone ?? "", u.created_at, `error:${error.message}`]);
      } else {
        ok++;
        rows.push([u.email, pw, u.id, u.user_metadata?.full_name ?? "", u.phone ?? "", u.created_at, "reset"]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    return new Response(csv, {
      headers: { ...corsHeaders, "Content-Type": "text/csv", "X-Ok": String(ok), "X-Fail": String(fail) },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});