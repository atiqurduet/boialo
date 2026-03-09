import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side prerender for SEO crawlers - generates full HTML with meta tags
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const baseUrl = "https://boialo.com";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let title = "বইআলো - বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ";
    let description = "বইআলো - বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ। সেরা দামে বই কিনুন।";
    let image = `${baseUrl}/og-image.png`;
    let canonical = `${baseUrl}${path}`;
    let jsonLd: object[] = [];

    // Product page
    const productMatch = path.match(/^\/product\/(.+)$/);
    if (productMatch) {
      const { data: product } = await supabase
        .from("products")
        .select("*, writers(*), publishers(*)")
        .eq("slug", productMatch[1])
        .eq("is_active", true)
        .single();

      if (product) {
        title = `${product.title_bn} | বইআলো`;
        description = product.meta_description || product.description_bn?.substring(0, 160) || description;
        image = product.cover_image || image;

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "Book",
          name: product.title_bn,
          description: description,
          image: image,
          url: canonical,
          isbn: product.isbn || undefined,
          author: product.writers ? { "@type": "Person", name: (product.writers as any).name_bn } : undefined,
          publisher: product.publishers ? { "@type": "Organization", name: (product.publishers as any).name_bn } : undefined,
          offers: {
            "@type": "Offer",
            price: product.discount_price || product.price,
            priceCurrency: "BDT",
            availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "বইআলো" },
          },
        });
      }
    }

    // Category page
    const categoryMatch = path.match(/^\/categories\/(.+)$/);
    if (categoryMatch) {
      const { data: category } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", categoryMatch[1])
        .single();

      if (category) {
        title = `${category.name_bn} - বই | বইআলো`;
        description = category.meta_description || `${category.name_bn} ক্যাটাগরির সকল বই। বইআলো থেকে সেরা দামে কিনুন।`;
      }
    }

    // Blog post
    const blogMatch = path.match(/^\/blog\/(.+)$/);
    if (blogMatch) {
      const { data: post } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", blogMatch[1])
        .eq("status", "published")
        .single();

      if (post) {
        title = `${post.title_bn} | বইআলো ব্লগ`;
        description = post.meta_description || post.excerpt_bn || description;
        image = post.featured_image || image;

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title_bn,
          description: description,
          image: image,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          author: { "@type": "Organization", name: "বইআলো" },
          publisher: {
            "@type": "Organization",
            name: "বইআলো",
            logo: { "@type": "ImageObject", url: `${baseUrl}/favicon.ico` },
          },
        });
      }
    }

    // Writer page
    const writerMatch = path.match(/^\/authors\/(.+)$/);
    if (writerMatch) {
      const { data: writer } = await supabase
        .from("writers")
        .select("*")
        .eq("slug", writerMatch[1])
        .single();

      if (writer) {
        title = `${writer.name_bn} - লেখকের বই | বইআলো`;
        description = writer.meta_description || `${writer.name_bn} এর সকল বই বইআলোতে পাওয়া যায়। সেরা দামে কিনুন।`;
        image = writer.image_url || image;

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "Person",
          name: writer.name_bn,
          url: canonical,
          image: writer.image_url || undefined,
          description: writer.bio_bn || undefined,
        });
      }
    }

    // Generate full HTML for crawlers
    const html = `<!DOCTYPE html>
<html lang="bn" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:site_name" content="বইআলো">
  <meta property="og:locale" content="bn_BD">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">
  
  <!-- Bing -->
  <meta name="msvalidate.01" content="">
  <meta name="bingbot" content="index, follow">
  
  <!-- Hreflang -->
  <link rel="alternate" hreflang="bn" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${canonical}">
  
  ${jsonLd.map(ld => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`).join("\n  ")}
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${canonical}">Visit Page</a>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
