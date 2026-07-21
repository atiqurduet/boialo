import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiChatCompletion, hasAiProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RequestType = "competitor_analysis" | "trending_keywords" | "keyword_suggestions" | "site_ranking_analysis";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getMessageContentText = (message: any): string => {
  const content = message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (typeof chunk?.text === "string") return chunk.text;
        if (typeof chunk?.content === "string") return chunk.content;
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
};

const extractJsonObject = (text: string): Record<string, unknown> | null => {
  if (!text?.trim()) return null;

  const cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = codeBlockMatch?.[1] || cleaned;

  try {
    const parsed = JSON.parse(candidate);
    if (isPlainObject(parsed)) return (parsed.result as Record<string, unknown>) || parsed;
  } catch {
    // Continue to regex fallback
  }

  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (isPlainObject(parsed)) return (parsed.result as Record<string, unknown>) || parsed;
    } catch {
      return null;
    }
  }

  return null;
};

const hasUsableKeys = (type: RequestType, result: Record<string, unknown> | null): boolean => {
  if (!result) return false;

  const expectedKeyMap: Record<RequestType, string[]> = {
    competitor_analysis: ["competitor_keywords", "keyword_gaps", "content_ideas", "ranking_tips"],
    trending_keywords: ["daily_trends", "seasonal_keywords", "emerging_topics", "google_trends_equivalent"],
    keyword_suggestions: ["primary_keywords", "secondary_keywords", "long_tail_keywords", "lsi_keywords"],
    site_ranking_analysis: ["page_recommendations", "site_wide_recommendations", "quick_wins"],
  };

  return expectedKeyMap[type].some((key) => Array.isArray(result[key]));
};

const getTrendingFallback = (category: string) => ({
  daily_trends: [
    { keyword: "boi mela offer", keyword_bn: "বইমেলা অফার", trend: "rising", volume: "high", category: "books" },
    { keyword: "islamic boi", keyword_bn: "ইসলামিক বই", trend: "rising", volume: "high", category: "islamic" },
    { keyword: "hsc guide", keyword_bn: "এইচএসসি গাইড", trend: "stable", volume: "medium", category: "academic" },
    { keyword: "kids story book", keyword_bn: "বাচ্চাদের গল্পের বই", trend: "rising", volume: "medium", category: "books" },
    { keyword: "ramadan planner", keyword_bn: "রমাদান প্ল্যানার", trend: "rising", volume: "medium", category: "lifestyle" },
  ],
  seasonal_keywords: [
    { keyword: "eid gift book", keyword_bn: "ঈদের বই উপহার", season: "Eid", peak_months: "Mar-Apr" },
    { keyword: "boishakh diary", keyword_bn: "বৈশাখ ডায়েরি", season: "Pohela Boishakh", peak_months: "Apr" },
    { keyword: "exam preparation", keyword_bn: "পরীক্ষার প্রস্তুতি", season: "Exam", peak_months: "Oct-Feb" },
  ],
  emerging_topics: [
    { topic: "self help bangla", topic_bn: "সেলফ হেল্প বাংলা", relevance: "মানসিক উন্নয়ন সম্পর্কিত সার্চ বাড়ছে", keywords: ["self development", "habit", "productivity"] },
    { topic: "kids islamic learning", topic_bn: "শিশুদের ইসলামিক লার্নিং", relevance: "পরিবারভিত্তিক সার্চ ট্রেন্ড বাড়ছে", keywords: ["dua book", "kids quran", "islamic stories"] },
  ],
  google_trends_equivalent: [
    { keyword: "boi mela", keyword_bn: "বইমেলা", search_interest: 88, related_queries: ["boi mela discount", "new book list", "best seller boi"] },
    { keyword: "islamic boi", keyword_bn: "ইসলামিক বই", search_interest: 82, related_queries: ["tafsir bangla", "hadith book", "ramadan book"] },
    { keyword: "academic guide", keyword_bn: "একাডেমিক গাইড", search_interest: 74, related_queries: ["hsc guide 2026", "ssc test paper", "model test"] },
  ],
  source: "fallback",
  category,
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json();
    const requestType = type as RequestType;

    if (!(await hasAiProvider())) throw new Error("No AI provider key configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (requestType) {
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
Current date context: ${date || new Date().toISOString().split("T")[0]}

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

    const response = await aiChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      // @ts-ignore extra fields passed through
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
      // @ts-ignore
      tool_choice: { type: "function", function: { name: "seo_analysis_result" } },
    } as any);

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
    const message = aiData?.choices?.[0]?.message;

    let result: Record<string, unknown> | null = null;

    try {
      const toolCallArgs = message?.tool_calls?.[0]?.function?.arguments;
      if (typeof toolCallArgs === "string" && toolCallArgs.trim()) {
        const parsedTool = JSON.parse(toolCallArgs);
        if (isPlainObject(parsedTool)) {
          result = isPlainObject(parsedTool.result) ? parsedTool.result : parsedTool;
        }
      }
    } catch (parseErr) {
      console.error("Tool-call parse error:", parseErr);
    }

    if (!hasUsableKeys(requestType, result)) {
      const contentText = getMessageContentText(message);
      const parsedFromContent = extractJsonObject(contentText);
      if (parsedFromContent) result = parsedFromContent;
    }

    if (!hasUsableKeys(requestType, result)) {
      console.error("Empty/invalid AI payload", { requestType, aiDataPreview: aiData?.choices?.[0]?.message });

      if (requestType === "trending_keywords") {
        result = getTrendingFallback(data?.category || "all");
      } else {
        throw new Error("AI returned empty keyword data. Please try again.");
      }
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
