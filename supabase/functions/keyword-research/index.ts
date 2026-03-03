import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "competitor_analysis": {
        const { competitors, siteUrl, niche } = data;
        systemPrompt = `You are an expert SEO analyst for Bangladesh e-commerce market, especially for book stores and online shops. Analyze competitor keywords and provide actionable insights. Always respond in valid JSON format.`;
        userPrompt = `Analyze these competitor websites for an e-commerce bookstore in Bangladesh:
Competitors: ${competitors.join(", ")}
My site: ${siteUrl || "boialo.com"}
Niche: ${niche || "Online bookstore, lifestyle products"}

Provide a JSON response with this exact structure:
{
  "competitor_keywords": [{"keyword": "...", "keyword_bn": "...", "volume": "high/medium/low", "difficulty": "easy/medium/hard", "competitor": "..."}],
  "keyword_gaps": [{"keyword": "...", "keyword_bn": "...", "opportunity": "...", "priority": "high/medium/low"}],
  "content_ideas": [{"title_bn": "...", "title_en": "...", "target_keyword": "...", "type": "blog/category/landing"}],
  "ranking_tips": ["..."]
}
Include at least 20 competitor keywords, 10 keyword gaps, 5 content ideas, and 5 ranking tips. Focus on Bengali and English keywords relevant to Bangladesh market.`;
        break;
      }

      case "trending_keywords": {
        const { category, date } = data;
        systemPrompt = `You are an expert SEO analyst specializing in Bangladesh e-commerce trends. Provide current trending keywords and search patterns. Always respond in valid JSON format.`;
        userPrompt = `What are the current trending search keywords in Bangladesh for e-commerce, specifically for online bookstores and lifestyle products?

Category focus: ${category || "all"}
Current date context: ${date || new Date().toISOString().split('T')[0]}

Provide a JSON response with this exact structure:
{
  "daily_trends": [{"keyword": "...", "keyword_bn": "...", "trend": "rising/stable/declining", "volume": "high/medium/low", "category": "..."}],
  "seasonal_keywords": [{"keyword": "...", "keyword_bn": "...", "season": "...", "peak_months": "..."}],
  "emerging_topics": [{"topic": "...", "topic_bn": "...", "relevance": "...", "keywords": ["..."]}],
  "google_trends_equivalent": [{"keyword": "...", "keyword_bn": "...", "search_interest": 0-100, "related_queries": ["..."]}]
}
Include at least 15 daily trends, 8 seasonal keywords, 5 emerging topics, and 10 Google Trends equivalents. Focus on Bangladesh and Bangla language searches.`;
        break;
      }

      case "keyword_suggestions": {
        const { page_title, page_type, existing_keywords, description } = data;
        systemPrompt = `You are an expert SEO keyword strategist for Bangladesh e-commerce. Suggest highly relevant keywords for ranking. Always respond in valid JSON format.`;
        userPrompt = `Suggest the best SEO keywords for this page:
Title: ${page_title}
Type: ${page_type} (book/category/blog/product)
Existing keywords: ${existing_keywords || "none"}
Description: ${description || "none"}

Provide a JSON response with this exact structure:
{
  "primary_keywords": [{"keyword": "...", "keyword_bn": "...", "relevance": 0-100, "difficulty": "easy/medium/hard", "search_volume": "high/medium/low"}],
  "secondary_keywords": [{"keyword": "...", "keyword_bn": "...", "relevance": 0-100}],
  "long_tail_keywords": [{"keyword": "...", "keyword_bn": "...", "intent": "informational/transactional/navigational"}],
  "lsi_keywords": [{"keyword": "...", "keyword_bn": "...", "context": "..."}],
  "meta_title_suggestions": ["..."],
  "meta_description_suggestions": ["..."]
}
Include at least 10 primary, 10 secondary, 8 long-tail, 5 LSI keywords. Focus on Bengali (BN) and English keywords for Bangladesh market.`;
        break;
      }

      case "site_ranking_analysis": {
        const { pages, site_url } = data;
        systemPrompt = `You are an expert SEO analyst. Analyze pages and suggest ranking improvements. Always respond in valid JSON format.`;
        userPrompt = `Analyze these pages from ${site_url || "boialo.com"} and suggest ranking keywords:

Pages: ${JSON.stringify(pages.slice(0, 20))}

Provide a JSON response with this exact structure:
{
  "page_recommendations": [{"page": "...", "current_score": 0-100, "target_keywords": ["..."], "improvements": ["..."], "priority": "high/medium/low"}],
  "site_wide_recommendations": ["..."],
  "quick_wins": [{"action": "...", "impact": "high/medium/low", "effort": "easy/medium/hard"}]
}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "seo_analysis_result",
              description: "Return SEO analysis results",
              parameters: {
                type: "object",
                properties: {
                  result: {
                    type: "object",
                    description: "The SEO analysis result object",
                  },
                },
                required: ["result"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "seo_analysis_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    
    let result;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        result = parsed.result || parsed;
      } else {
        // Fallback: try to parse content as JSON
        const content = aiData.choices?.[0]?.message?.content || "{}";
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      result = { error: "Failed to parse AI response", raw: aiData.choices?.[0]?.message?.content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("keyword-research error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
