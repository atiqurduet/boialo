import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EXTS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};
const ALLOWED_FOLDERS = [
  "products",
  "ebooks",
  "banners",
  "blog",
  "branding",
  "universal",
  "general",
];

function uuidv4() {
  return crypto.randomUUID();
}

async function hmacSha256Hex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hmacSecret = Deno.env.get("MEDIA_HMAC_SECRET");

    if (!hmacSecret) {
      return new Response(
        JSON.stringify({ error: "MEDIA_HMAC_SECRET not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", {
      _user_id: userData.user.id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action || "upload";
    const folder = String(body.folder || "general").toLowerCase();

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload") {
      const originalName = String(body.filename || "file.jpg");
      const extMatch = originalName.match(/\.([a-z0-9]{2,5})$/i);
      const ext = (extMatch?.[1] || "").toLowerCase();
      if (!ALLOWED_EXTS[ext]) {
        return new Response(
          JSON.stringify({ error: "Extension not allowed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const filename = `${uuidv4()}.${ext}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const token = await hmacSha256Hex(
        hmacSecret,
        `${folder}|${filename}|${timestamp}`,
      );

      return new Response(
        JSON.stringify({
          filename,
          folder,
          timestamp,
          token,
          mime_type: ALLOWED_EXTS[ext],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "delete") {
      const filename = String(body.filename || "");
      const year = String(body.year || "");
      const month = String(body.month || "");
      if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i.test(filename)) {
        return new Response(JSON.stringify({ error: "Invalid filename" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
        return new Response(JSON.stringify({ error: "Invalid date" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const token = await hmacSha256Hex(
        hmacSecret,
        `${folder}/${year}/${month}|${filename}|${timestamp}`,
      );
      return new Response(
        JSON.stringify({ token, timestamp }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("media-sign-upload error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
