import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "Missing product_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get product
    const { data: product } = await adminClient
      .from("digital_products")
      .select("id, file_url, is_free, title_bn")
      .eq("id", product_id)
      .single();

    if (!product || !product.file_url) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check purchase (or free)
    const { data: purchase } = await adminClient
      .from("digital_purchases")
      .select("id, expires_at")
      .eq("product_id", product_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!product.is_free && !purchase) {
      return new Response(
        JSON.stringify({ error: "আপনি এই বইটি কেনেননি" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (purchase?.expires_at && new Date(purchase.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "অ্যাক্সেসের মেয়াদ শেষ" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For free products, auto-create purchase
    if (product.is_free && !purchase) {
      await adminClient.from("digital_purchases").insert({
        user_id: user.id,
        product_id: product.id,
        product_type: "ebook",
      });
    }

    // Extract storage path
    const urlParts = product.file_url.split("/storage/v1/object/public/digital-files/");
    let storagePath: string;

    if (urlParts.length === 2) {
      storagePath = decodeURIComponent(urlParts[1]);
    } else {
      const altParts = product.file_url.split("/digital-files/");
      if (altParts.length === 2) {
        storagePath = decodeURIComponent(altParts[1].split("?")[0]);
      } else {
        return new Response(JSON.stringify({ error: "Invalid file path" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate a short-lived signed URL (15 minutes)
    const { data: signedUrlData, error: signedError } = await adminClient.storage
      .from("digital-files")
      .createSignedUrl(storagePath, 900); // 15 minutes

    if (signedError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedError);
      return new Response(JSON.stringify({ error: "Could not generate read URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        title: product.title_bn,
        expires_in: 900,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Secure read error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
