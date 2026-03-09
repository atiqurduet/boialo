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

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "index";
    const baseUrl = url.searchParams.get("base_url") || "https://boialo.com";

    // Sitemap Index - splits into multiple sitemaps for better crawling
    if (type === "index") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/api/sitemap?type=static</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=products</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=universal-products</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=categories</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=writers</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=publishers</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=blog</loc></sitemap>
  <sitemap><loc>${baseUrl}/api/sitemap?type=pages</loc></sitemap>
</sitemapindex>`;
      return xmlResponse(xml);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    switch (type) {
      case "static":
        xml += generateStaticUrls(baseUrl);
        break;
      case "products":
        xml += await generateProductUrls(supabase, baseUrl);
        break;
      case "universal-products":
        xml += await generateUniversalProductUrls(supabase, baseUrl);
        break;
      case "categories":
        xml += await generateCategoryUrls(supabase, baseUrl);
        break;
      case "writers":
        xml += await generateWriterUrls(supabase, baseUrl);
        break;
      case "publishers":
        xml += await generatePublisherUrls(supabase, baseUrl);
        break;
      case "blog":
        xml += await generateBlogUrls(supabase, baseUrl);
        break;
      case "pages":
        xml += await generatePageUrls(supabase, baseUrl);
        break;
      default:
        // Full sitemap fallback
        xml += generateStaticUrls(baseUrl);
        xml += await generateProductUrls(supabase, baseUrl);
        xml += await generateUniversalProductUrls(supabase, baseUrl);
        xml += await generateCategoryUrls(supabase, baseUrl);
        xml += await generateWriterUrls(supabase, baseUrl);
        xml += await generatePublisherUrls(supabase, baseUrl);
        xml += await generateBlogUrls(supabase, baseUrl);
        xml += await generatePageUrls(supabase, baseUrl);
    }

    xml += `\n</urlset>`;
    return xmlResponse(xml);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}

function urlEntry(loc: string, opts: { lastmod?: string; changefreq?: string; priority?: string; images?: { url: string; title?: string }[] } = {}) {
  let entry = `\n  <url>\n    <loc>${loc}</loc>`;
  if (opts.lastmod) entry += `\n    <lastmod>${opts.lastmod}</lastmod>`;
  if (opts.changefreq) entry += `\n    <changefreq>${opts.changefreq}</changefreq>`;
  if (opts.priority) entry += `\n    <priority>${opts.priority}</priority>`;
  // Hreflang
  entry += `\n    <xhtml:link rel="alternate" hreflang="bn" href="${loc}" />`;
  entry += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`;
  // Images
  if (opts.images) {
    for (const img of opts.images) {
      entry += `\n    <image:image>`;
      entry += `\n      <image:loc>${escapeXml(img.url)}</image:loc>`;
      if (img.title) entry += `\n      <image:title>${escapeXml(img.title)}</image:title>`;
      entry += `\n    </image:image>`;
    }
  }
  entry += `\n  </url>`;
  return entry;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toDate(d: string) {
  return new Date(d).toISOString().split("T")[0];
}

function generateStaticUrls(baseUrl: string) {
  const pages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/shop", priority: "0.9", changefreq: "daily" },
    { url: "/categories", priority: "0.8", changefreq: "weekly" },
    { url: "/authors", priority: "0.7", changefreq: "weekly" },
    { url: "/publishers", priority: "0.7", changefreq: "weekly" },
    { url: "/offers", priority: "0.8", changefreq: "daily" },
    { url: "/preorder", priority: "0.8", changefreq: "daily" },
    { url: "/blog", priority: "0.7", changefreq: "daily" },
    { url: "/bundles", priority: "0.6", changefreq: "weekly" },
    { url: "/ebooks", priority: "0.7", changefreq: "weekly" },
    { url: "/gift-cards", priority: "0.5", changefreq: "monthly" },
    { url: "/about", priority: "0.5", changefreq: "monthly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
    { url: "/faq", priority: "0.5", changefreq: "monthly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/refund-policy", priority: "0.4", changefreq: "yearly" },
  ];
  return pages.map(p => urlEntry(`${baseUrl}${p.url}`, { changefreq: p.changefreq, priority: p.priority })).join("");
}

async function generateProductUrls(supabase: any, baseUrl: string) {
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at, title_bn, cover_image")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (products || []).map((p: any) =>
    urlEntry(`${baseUrl}/product/${p.slug}`, {
      lastmod: toDate(p.updated_at),
      changefreq: "weekly",
      priority: "0.8",
      images: p.cover_image ? [{ url: p.cover_image, title: p.title_bn }] : [],
    })
  ).join("");
}

async function generateUniversalProductUrls(supabase: any, baseUrl: string) {
  const { data } = await supabase
    .from("universal_products")
    .select("slug, updated_at, title_bn, cover_image")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (data || []).map((p: any) =>
    urlEntry(`${baseUrl}/universal-product/${p.slug}`, {
      lastmod: toDate(p.updated_at),
      changefreq: "weekly",
      priority: "0.8",
      images: p.cover_image ? [{ url: p.cover_image, title: p.title_bn }] : [],
    })
  ).join("");
}

async function generateCategoryUrls(supabase: any, baseUrl: string) {
  const { data: cats } = await supabase
    .from("categories")
    .select("slug, updated_at, image_url, name_bn")
    .eq("is_active", true);

  const { data: uCats } = await supabase
    .from("universal_categories")
    .select("slug, product_type, updated_at, image_url, name_bn")
    .eq("is_active", true);

  const { data: ptypes } = await supabase
    .from("product_types")
    .select("slug, updated_at")
    .eq("is_active", true);

  let xml = "";
  for (const c of cats || []) {
    xml += urlEntry(`${baseUrl}/categories/${c.slug}`, {
      lastmod: toDate(c.updated_at),
      changefreq: "weekly",
      priority: "0.7",
      images: c.image_url ? [{ url: c.image_url, title: c.name_bn }] : [],
    });
  }
  for (const c of uCats || []) {
    xml += urlEntry(`${baseUrl}/category/${c.product_type}/${c.slug}`, {
      lastmod: toDate(c.updated_at),
      changefreq: "weekly",
      priority: "0.7",
      images: c.image_url ? [{ url: c.image_url, title: c.name_bn }] : [],
    });
  }
  for (const pt of ptypes || []) {
    xml += urlEntry(`${baseUrl}/category/${pt.slug}`, {
      lastmod: toDate(pt.updated_at),
      changefreq: "weekly",
      priority: "0.7",
    });
  }
  return xml;
}

async function generateWriterUrls(supabase: any, baseUrl: string) {
  const { data } = await supabase
    .from("writers")
    .select("slug, updated_at, image_url, name_bn")
    .eq("is_active", true);

  return (data || []).map((w: any) =>
    urlEntry(`${baseUrl}/authors/${w.slug}`, {
      lastmod: toDate(w.updated_at),
      changefreq: "monthly",
      priority: "0.6",
      images: w.image_url ? [{ url: w.image_url, title: w.name_bn }] : [],
    })
  ).join("");
}

async function generatePublisherUrls(supabase: any, baseUrl: string) {
  const { data } = await supabase
    .from("publishers")
    .select("slug, updated_at, logo_url, name_bn")
    .eq("is_active", true);

  return (data || []).map((p: any) =>
    urlEntry(`${baseUrl}/publishers/${p.slug}`, {
      lastmod: toDate(p.updated_at),
      changefreq: "monthly",
      priority: "0.6",
      images: p.logo_url ? [{ url: p.logo_url, title: p.name_bn }] : [],
    })
  ).join("");
}

async function generateBlogUrls(supabase: any, baseUrl: string) {
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, featured_image, title_bn")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (data || []).map((b: any) =>
    urlEntry(`${baseUrl}/blog/${b.slug}`, {
      lastmod: toDate(b.updated_at),
      changefreq: "weekly",
      priority: "0.7",
      images: b.featured_image ? [{ url: b.featured_image, title: b.title_bn }] : [],
    })
  ).join("");
}

async function generatePageUrls(supabase: any, baseUrl: string) {
  const { data } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("is_active", true)
    .eq("is_private", false);

  return (data || []).map((dp: any) =>
    urlEntry(`${baseUrl}/${dp.slug}`, {
      lastmod: toDate(dp.updated_at),
      changefreq: "weekly",
      priority: "0.6",
    })
  ).join("");
}
