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

    // Create client with user's token
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

    // Use service role to check purchase and get file
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the product
    const { data: product } = await adminClient
      .from("digital_products")
      .select("id, file_url, file_name, slug, file_format, is_free, max_downloads")
      .eq("id", product_id)
      .single();

    if (!product || !product.file_url) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check purchase record
    const { data: purchase } = await adminClient
      .from("digital_purchases")
      .select("id, download_count, max_downloads, expires_at")
      .eq("product_id", product_id)
      .eq("user_id", user.id)
      .maybeSingle();

    // For free products, auto-create purchase if not exists
    if (product.is_free && !purchase) {
      await adminClient.from("digital_purchases").insert({
        user_id: user.id,
        product_id: product.id,
        product_type: "ebook",
        max_downloads: product.max_downloads || 5,
      });
    } else if (!product.is_free && !purchase) {
      return new Response(
        JSON.stringify({ error: "আপনি এই প্রোডাক্টটি কেনেননি" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate download limits
    if (purchase) {
      if (
        purchase.max_downloads &&
        (purchase.download_count || 0) >= purchase.max_downloads
      ) {
        return new Response(
          JSON.stringify({ error: "ডাউনলোড সীমা শেষ হয়ে গেছে" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "ডাউনলোড মেয়াদ শেষ হয়ে গেছে" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Increment download count
      await adminClient
        .from("digital_purchases")
        .update({ download_count: (purchase.download_count || 0) + 1 })
        .eq("id", purchase.id);
    }

    // Extract storage path from file_url
    // URL format: https://<project>.supabase.co/storage/v1/object/public/digital-files/<path>
    const urlParts = product.file_url.split("/storage/v1/object/public/digital-files/");
    let storagePath: string;
    
    if (urlParts.length === 2) {
      storagePath = decodeURIComponent(urlParts[1]);
    } else {
      // Try signed URL format or direct path
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

    // Download from storage using admin client
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("digital-files")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "File not found in storage" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName =
      product.file_name || `${product.slug}.${product.file_format || "pdf"}`;

    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Secure download error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
