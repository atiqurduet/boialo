import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = new URL(req.url).searchParams.get("base_url") || "https://boialo.com";

    // Static pages
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/shop", priority: "0.9", changefreq: "daily" },
      { url: "/categories", priority: "0.8", changefreq: "weekly" },
      { url: "/authors", priority: "0.7", changefreq: "weekly" },
      { url: "/publishers", priority: "0.7", changefreq: "weekly" },
      { url: "/offers", priority: "0.8", changefreq: "daily" },
      { url: "/preorder", priority: "0.8", changefreq: "daily" },
      { url: "/blog", priority: "0.7", changefreq: "daily" },
      { url: "/bundles", priority: "0.6", changefreq: "weekly" },
      { url: "/gift-cards", priority: "0.5", changefreq: "monthly" },
      { url: "/about", priority: "0.5", changefreq: "monthly" },
      { url: "/contact", priority: "0.5", changefreq: "monthly" },
      { url: "/faq", priority: "0.5", changefreq: "monthly" },
      { url: "/terms", priority: "0.3", changefreq: "yearly" },
      { url: "/privacy", priority: "0.3", changefreq: "yearly" },
      { url: "/refund-policy", priority: "0.4", changefreq: "yearly" },
    ];

    // Products (books)
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Universal Products
    const { data: universalProducts } = await supabase
      .from("universal_products")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Universal Categories
    const { data: universalCategories } = await supabase
      .from("universal_categories")
      .select("slug, product_type, updated_at")
      .eq("is_active", true);

    // Writers
    const { data: writers } = await supabase
      .from("writers")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Publishers
    const { data: publishers } = await supabase
      .from("publishers")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Blog posts
    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published");

    // Dynamic pages
    const { data: dynamicPages } = await supabase
      .from("pages")
      .select("slug, updated_at")
      .eq("is_active", true)
      .eq("is_private", false);

    // Product types for category landing
    const { data: productTypes } = await supabase
      .from("product_types")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Static pages
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Products (books)
    for (const p of products || []) {
      xml += `
  <url>
    <loc>${baseUrl}/product/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Universal Products
    for (const p of universalProducts || []) {
      xml += `
  <url>
    <loc>${baseUrl}/universal-product/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Book Categories
    for (const c of categories || []) {
      xml += `
  <url>
    <loc>${baseUrl}/categories/${c.slug}</loc>
    <lastmod>${new Date(c.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Universal Categories
    for (const c of universalCategories || []) {
      xml += `
  <url>
    <loc>${baseUrl}/category/${c.product_type}/${c.slug}</loc>
    <lastmod>${new Date(c.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Product type landing pages
    for (const pt of productTypes || []) {
      xml += `
  <url>
    <loc>${baseUrl}/category/${pt.slug}</loc>
    <lastmod>${new Date(pt.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Writers
    for (const w of writers || []) {
      xml += `
  <url>
    <loc>${baseUrl}/authors/${w.slug}</loc>
    <lastmod>${new Date(w.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Publishers
    for (const p of publishers || []) {
      xml += `
  <url>
    <loc>${baseUrl}/publishers/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Blog posts
    for (const b of blogPosts || []) {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${b.slug}</loc>
    <lastmod>${new Date(b.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Dynamic pages
    for (const dp of dynamicPages || []) {
      xml += `
  <url>
    <loc>${baseUrl}/${dp.slug}</loc>
    <lastmod>${new Date(dp.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
