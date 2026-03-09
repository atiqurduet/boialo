import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action } = await req.json();

    // ── Gather audience data summary ──────────────────────
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

    const [orders30, orders90, abandoned, visitors, engagement] = await Promise.all([
      supabase.from("orders").select("total_amount, status, created_at", { count: "exact" }).gte("created_at", since30),
      supabase.from("orders").select("total_amount, status", { count: "exact" }).gte("created_at", since90),
      supabase.from("abandoned_checkouts").select("subtotal, step", { count: "exact" }).gte("created_at", since30).eq("recovered", false),
      supabase.from("visitor_analytics").select("device_type, browser", { count: "exact" }).gte("created_at", since30),
      supabase.from("engagement_scores").select("engagement_score, scroll_depth, time_on_page", { count: "exact" }).gte("created_at", since30),
    ]);

    const totalOrders30 = orders30.count || 0;
    const totalOrders90 = orders90.count || 0;
    const revenue30 = (orders30.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    const avgOrderValue = totalOrders30 > 0 ? Math.round(revenue30 / totalOrders30) : 0;
    const abandonedCount = abandoned.count || 0;
    const visitorCount = visitors.count || 0;
    const conversionRate = visitorCount > 0 ? ((totalOrders30 / visitorCount) * 100).toFixed(1) : "0";
    const avgEngagement = (engagement.data || []).length > 0
      ? Math.round((engagement.data || []).reduce((s: number, e: any) => s + (e.engagement_score || 0), 0) / engagement.data!.length)
      : 0;

    const dataSummary = `
E-commerce Analytics Summary (Bangladesh market, Bengali book store):
- Last 30 days: ${totalOrders30} orders, ৳${revenue30.toLocaleString()} revenue, AOV ৳${avgOrderValue}
- Last 90 days: ${totalOrders90} orders total
- Abandoned carts (30d): ${abandonedCount}
- Total visitors (30d): ${visitorCount}
- Conversion rate: ${conversionRate}%
- Average engagement score: ${avgEngagement}/100
- Device split: mostly mobile (Bangladesh market)
`;

    let prompt = "";

    if (action === "predict") {
      prompt = `${dataSummary}

Based on this data, provide audience targeting predictions in JSON format with this EXACT structure:
{
  "predictions": [
    {
      "audience": "audience name in Bengali",
      "platform": "Facebook|TikTok|Google",
      "confidence": 85,
      "expected_roas": 3.5,
      "recommendation": "specific recommendation in Bengali",
      "priority": "high|medium|low",
      "estimated_size": 5000,
      "best_ad_type": "ad type recommendation"
    }
  ],
  "overall_strategy": "overall strategy summary in Bengali",
  "budget_allocation": {
    "facebook": 50,
    "tiktok": 30,
    "google": 20
  }
}

Give 5-7 predictions. Focus on Bangladesh market. All text in Bengali.`;
    } else if (action === "optimize") {
      prompt = `${dataSummary}

Analyze this data and provide optimization suggestions for ad campaigns targeting. Return JSON:
{
  "optimizations": [
    {
      "area": "area name in Bengali",
      "current_issue": "issue description in Bengali",
      "suggestion": "optimization suggestion in Bengali",
      "expected_improvement": "+25% CTR",
      "effort": "low|medium|high",
      "priority": 1
    }
  ],
  "key_insights": ["insight 1 in Bengali", "insight 2"],
  "quick_wins": ["quick win 1 in Bengali", "quick win 2"]
}

Give 5-8 optimizations. All text in Bengali. Focus on Bangladesh market.`;
    } else {
      throw new Error("Invalid action. Use 'predict' or 'optimize'.");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert digital marketing analyst specializing in e-commerce audience targeting for Bangladesh market. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required, please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Audience AI error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
