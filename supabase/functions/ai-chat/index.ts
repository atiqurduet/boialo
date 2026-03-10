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

    const { messages, mode, context } = await req.json();
    // mode: "customer" | "admin"

    let systemPrompt = "";

    if (mode === "customer") {
      // Fetch some product data for context
      const { data: products } = await supabase
        .from("products")
        .select("title_bn, price, slug, stock_quantity")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: categories } = await supabase
        .from("categories")
        .select("name_bn, slug")
        .eq("is_active", true)
        .limit(15);

      const { data: siteSettings } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["site_name", "contact_phone", "contact_email", "delivery_info"]);

      const settingsMap: Record<string, string> = {};
      (siteSettings || []).forEach((s: any) => {
        settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
      });

      const productList = (products || []).map((p: any) => `${p.title_bn} - ৳${p.price} (/${p.slug})`).join("\n");
      const categoryList = (categories || []).map((c: any) => c.name_bn).join(", ");

      systemPrompt = `তুমি "${settingsMap.site_name || "বইআলো"}" অনলাইন বুকশপের AI সহকারী। তুমি বাংলায় উত্তর দেবে।

তোমার কাজ:
- গ্রাহকদের বই/প্রোডাক্ট খুঁজতে সাহায্য করা
- অর্ডার সম্পর্কে তথ্য দেওয়া
- ডেলিভারি ও পেমেন্ট সম্পর্কে জানানো
- বই সাজেস্ট করা

যোগাযোগ: ফোন ${settingsMap.contact_phone || "N/A"}, ইমেইল ${settingsMap.contact_email || "N/A"}

সাম্প্রতিক প্রোডাক্ট:
${productList || "কোনো প্রোডাক্ট পাওয়া যায়নি"}

ক্যাটেগরি: ${categoryList || "N/A"}

গুরুত্বপূর্ণ নিয়ম:
- সংক্ষিপ্ত ও সহায়ক উত্তর দাও
- অর্ডার ট্র্যাকিং এর জন্য অর্ডার নম্বর জিজ্ঞেস করো
- রিফান্ড/জটিল সমস্যায় লাইভ সাপোর্টে যেতে বলো
- বই রিকমেন্ড করতে গ্রাহকের পছন্দ জিজ্ঞেস করো
- ইমোজি ব্যবহার করে ফ্রেন্ডলি থাকো`;
    } else if (mode === "admin") {
      // Admin AI assistant - fetch business data
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from("orders").select("total_amount, status, created_at", { count: "exact" }).gte("created_at", since30),
        supabase.from("products").select("title_bn, price, stock_quantity, sales_count", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact" }),
      ]);

      const totalOrders = ordersRes.count || 0;
      const revenue = (ordersRes.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const totalProducts = productsRes.count || 0;
      const lowStock = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) < 5).length;
      const totalCustomers = customersRes.count || 0;

      const topProducts = (productsRes.data || [])
        .sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 10)
        .map((p: any) => `${p.title_bn} - ৳${p.price} (বিক্রি: ${p.sales_count || 0}, স্টক: ${p.stock_quantity || 0})`)
        .join("\n");

      systemPrompt = `তুমি একজন AI বিজনেস অ্যাসিস্ট্যান্ট। এটি একটি বাংলাদেশি অনলাইন বুকশপ। বাংলায় উত্তর দাও।

📊 বিজনেস সামারি (গত ৩০ দিন):
- মোট অর্ডার: ${totalOrders}
- মোট রেভিনিউ: ৳${revenue.toLocaleString()}
- মোট প্রোডাক্ট: ${totalProducts}
- লো স্টক প্রোডাক্ট: ${lowStock}
- মোট কাস্টমার: ${totalCustomers}

🔝 টপ প্রোডাক্ট:
${topProducts || "N/A"}

${context ? `অতিরিক্ত প্রসঙ্গ: ${context}` : ""}

তোমার কাজ:
- বিজনেস ইনসাইট ও পরামর্শ দেওয়া
- মার্কেটিং স্ট্র্যাটেজি সাজেস্ট করা
- ইনভেন্টরি ম্যানেজমেন্ট পরামর্শ
- সেলস অ্যানালাইসিস ও ট্রেন্ড বোঝানো
- কাস্টমার রিটেনশন টিপস
- প্রোডাক্ট প্রাইসিং পরামর্শ
- প্রমোশন/ক্যাম্পেইন আইডিয়া

সংক্ষিপ্ত, অ্যাকশনেবল, ডেটা-ড্রিভেন উত্তর দাও। ইমোজি ও বুলেট পয়েন্ট ব্যবহার করো।`;
    } else {
      throw new Error("Invalid mode. Use 'customer' or 'admin'.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "রেট লিমিট অতিক্রম হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "ক্রেডিট শেষ, অনুগ্রহ করে ক্রেডিট যোগ করুন।" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
