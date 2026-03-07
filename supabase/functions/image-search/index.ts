import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Use Gemini to analyze the image and extract search keywords
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify the product(s) shown. Return ONLY a JSON object with these fields:
- "keywords": array of search keywords in both Bangla and English (product name, brand, category, type)
- "description_bn": a short Bangla description of what you see
- "description_en": a short English description
- "product_type": one of "book", "electronics", "clothing", "cosmetics", "food", "stationery", "other"
- "brand": brand name if visible, otherwise null
- "color": dominant color if relevant, otherwise null

Example: {"keywords":["Samsung Galaxy","স্যামসাং","মোবাইল","phone"],"description_bn":"একটি স্যামসাং গ্যালাক্সি মোবাইল ফোন","description_en":"A Samsung Galaxy mobile phone","product_type":"electronics","brand":"Samsung","color":"black"}

Return ONLY the JSON, no markdown or extra text.`
              },
              {
                type: "image_url",
                image_url: { url: image }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI analysis failed:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to analyze image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response - handle potential markdown wrapping
    let analysis;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      analysis = {
        keywords: [content.slice(0, 50)],
        description_bn: "পণ্য শনাক্ত করা যায়নি",
        description_en: "Could not identify product",
        product_type: "other",
        brand: null,
        color: null,
      };
    }

    // Step 2: Search products using extracted keywords
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const keywords = (analysis.keywords || []).slice(0, 8);
    const searchResults: any[] = [];

    // Search both products and universal_products with each keyword
    for (const keyword of keywords) {
      if (!keyword || keyword.length < 2) continue;
      const sanitized = keyword.replace(/[%_\\]/g, "\\$&").slice(0, 100);

      const [booksRes, universalRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images")
          .eq("is_active", true)
          .or(`title_bn.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%,author.ilike.%${sanitized}%,publisher.ilike.%${sanitized}%`)
          .limit(5),
        supabase
          .from("universal_products")
          .select("id, name_bn, name_en, slug, price, original_price, discount_percent, brand, images, product_type")
          .eq("is_active", true)
          .or(`name_bn.ilike.%${sanitized}%,name_en.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`)
          .limit(5),
      ]);

      // Normalize and add
      (booksRes.data || []).forEach((p) => {
        if (!searchResults.find((r) => r.id === p.id)) {
          searchResults.push({ ...p, source: "book" });
        }
      });
      (universalRes.data || []).forEach((p) => {
        if (!searchResults.find((r) => r.id === p.id)) {
          searchResults.push({
            id: p.id,
            title_bn: p.name_bn,
            title_en: p.name_en,
            slug: p.slug,
            price: p.price,
            original_price: p.original_price,
            discount_percent: p.discount_percent,
            author: p.brand,
            publisher: p.product_type,
            images: p.images,
            source: "universal",
            product_type: p.product_type,
          });
        }
      });
    }

    // Track analytics
    supabase.from("search_analytics").insert({
      query: `[image] ${analysis.description_en || "image search"}`.slice(0, 200),
      results_count: searchResults.length,
    }).then();

    return new Response(
      JSON.stringify({
        products: searchResults.slice(0, 20),
        analysis,
        totalProducts: searchResults.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
