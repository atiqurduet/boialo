import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildCustomerPrompt(data: any) {
  const { settings, products, categories, coupons, delivery, bundles, searchResults, orderTracking, universalProducts, ebooks } = data;

  const siteName = settings.site_name || "বইআলো";

  const bestSellers = (products || []).slice(0, 10).map((p: any) =>
    `• ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | স্টক: ${p.stock_quantity || 0} | /product/${p.slug}`
  ).join("\n");

  const categoryList = (categories || []).map((c: any) => `${c.name_bn} (/category/${c.slug})`).join(", ");

  const activeCoupons = (coupons || []).map((c: any) =>
    `• কোড: ${c.code} - ${c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`} ছাড়${c.min_order_amount ? ` (সর্বনিম্ন ৳${c.min_order_amount})` : ""}`
  ).join("\n");

  const deliveryInfo = (delivery || []).map((d: any) =>
    `• ${d.zone_name_bn}: ৳${d.delivery_charge} (${d.estimated_days_min || 1}-${d.estimated_days_max || 3} দিন)`
  ).join("\n");

  const bundleInfo = (bundles || []).map((b: any) =>
    `• ${b.name_bn}: ৳${b.bundle_price} (আসল ৳${b.original_price})`
  ).join("\n");

  let searchSection = "";
  if (searchResults && searchResults.length > 0) {
    searchSection = `\n\n🔍 গ্রাহকের প্রশ্ন অনুযায়ী পাওয়া প্রোডাক্ট:\n` +
      searchResults.map((p: any) => {
        const type = p._type || "book";
        const link = type === "book" ? `/product/${p.slug}` : type === "universal" ? `/universal-product/${p.slug}` : `/ebook/${p.slug}`;
        const name = p.title_bn || p.name_bn || "প্রোডাক্ট";
        const stock = p.stock_quantity !== undefined ? ` | স্টক: ${p.stock_quantity}` : "";
        const discount = p.discount_percentage || p.discount_percent;
        return `• ${name} - ৳${p.price}${discount ? ` (${discount}% ছাড়)` : ""}${stock} | [${link}]`;
      }).join("\n");
  }

  let universalSection = "";
  if (universalProducts && universalProducts.length > 0) {
    universalSection = `\n\n🛍️ ইউনিভার্সাল প্রোডাক্ট:\n` +
      universalProducts.slice(0, 8).map((p: any) =>
        `• ${p.name_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | /universal-product/${p.slug}`
      ).join("\n");
  }

  let ebookSection = "";
  if (ebooks && ebooks.length > 0) {
    ebookSection = `\n\n📱 ই-বুক:\n` +
      ebooks.slice(0, 8).map((e: any) =>
        `• ${e.title_bn} - ${e.is_free ? "ফ্রি" : `৳${e.price}`} | /ebook/${e.slug}`
      ).join("\n");
  }

  let orderSection = "";
  if (orderTracking) {
    const statusMap: Record<string, string> = {
      pending: "⏳ পেন্ডিং", confirmed: "✅ কনফার্মড", processing: "🔄 প্রসেসিং",
      shipped: "🚚 শিপড", delivered: "📦 ডেলিভারড", cancelled: "❌ বাতিল", returned: "↩️ রিটার্ন"
    };
    orderSection = `\n\n📦 অর্ডার #${orderTracking.order_number} তথ্য:
- স্ট্যাটাস: ${statusMap[orderTracking.status] || orderTracking.status}
- কুরিয়ার: ${orderTracking.courier_provider || "নির্ধারিত হয়নি"}
- ট্র্যাকিং: ${orderTracking.tracking_number || "এখনো পাওয়া যায়নি"}
- তারিখ: ${orderTracking.created_at ? new Date(orderTracking.created_at).toLocaleDateString('bn-BD') : "N/A"}
- এলাকা: ${orderTracking.delivery_area || "N/A"}`;
  }

  return `তুমি "${siteName}" অনলাইন শপের AI সহকারী "বই বন্ধু"। সবসময় বাংলায় উত্তর দাও।

🏪 দোকান: ${siteName} | ফোন: ${settings.contact_phone || "N/A"} | ইমেইল: ${settings.contact_email || "N/A"}

📚 বেস্ট সেলার:\n${bestSellers || "তথ্য নেই"}
📂 ক্যাটাগরি: ${categoryList || "N/A"}
🎁 অফার:\n${activeCoupons || "বর্তমানে কোনো অফার নেই"}
🚚 ডেলিভারি:\n${deliveryInfo || "ঢাকায় ৳60, বাইরে ৳120"}
📦 বান্ডেল:\n${bundleInfo || "কোনো বান্ডেল নেই"}${searchSection}${universalSection}${ebookSection}${orderSection}

⭐ নিয়ম:
1. ফ্রেন্ডলি, সংক্ষিপ্ত (২-৩ বাক্য) কিন্তু তথ্যপূর্ণ
2. প্রোডাক্ট রিকমেন্ড করলে নাম, মূল্য ও সঠিক লিংক দাও (মার্কডাউন লিংক [নাম](path) ফরম্যাটে)
3. অর্ডার ট্র্যাকিং এ অর্ডার নম্বর জিজ্ঞেস করো (BOI-XXXX)
4. রিফান্ড/জটিল সমস্যায় "👤 লাইভ চ্যাট" বলো
5. পেমেন্ট: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
6. ইমোজি ব্যবহার করো, প্রতিটি উত্তরে ফলো-আপ করো
7. 🔍 সার্চ রেজাল্ট থাকলে ঐগুলো অগ্রাধিকার দাও
8. প্রোডাক্টের দাম, স্টক, ছাড় সব সঠিকভাবে জানাও
9. ই-বুক এবং ইউনিভার্সাল প্রোডাক্ট সম্পর্কেও জানাও
10. গ্রাহক হতাশ হলে সমবেদনা দেখাও`;
}

function buildAdminPrompt(data: any, context?: string) {
  const { revenue30, revenue7, totalOrders30, totalOrders7, totalOrders90, aov,
    statusBreakdown, paymentBreakdown, areaBreakdown, totalProducts,
    outOfStock, lowStock, totalCustomers, newCustomers30,
    abandonedCount, abandonedValue, topProducts, lowStockItems, avgRating, couponsCount } = data;

  return `তুমি প্রফেশনাল AI বিজনেস অ্যানালিস্ট। "বইআলো" বাংলাদেশি অনলাইন শপ। বাংলায় উত্তর দাও।

📊 ড্যাশবোর্ড:
💰 ৭দিন: ৳${revenue7.toLocaleString()} (${totalOrders7}টি) | ৩০দিন: ৳${revenue30.toLocaleString()} (${totalOrders30}টি) | ৯০দিন: ${totalOrders90}টি | AOV: ৳${aov}
📋 স্ট্যাটাস: ${Object.entries(statusBreakdown).map(([k, v]) => `${k}:${v}`).join(", ")}
💳 পেমেন্ট: ${Object.entries(paymentBreakdown).map(([k, v]) => `${k}:${v}`).join(", ")}
🗺️ এলাকা: ${Object.entries(areaBreakdown).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(", ")}
👥 কাস্টমার: ${totalCustomers} (নতুন: ${newCustomers30})
📦 প্রোডাক্ট: ${totalProducts} | আউট: ${outOfStock} | লো(<৫): ${lowStock}
🔝 টপ: ${topProducts}
⚠️ লো স্টক: ${lowStockItems || "নেই"}
🛒 অসম্পূর্ণ: ${abandonedCount}টি (৳${abandonedValue.toLocaleString()})
⭐ রেটিং: ${avgRating} | কুপন: ${couponsCount}
${context ? `\n📌 প্রসঙ্গ: ${context}` : ""}

নিয়ম: ডেটা-ড্রিভেন পরামর্শ, মেট্রিক্স ব্যবহার, সমস্যা+সমাধান, মার্কডাউন ফরম্যাট, বাংলাদেশ কনটেক্সট।`;
}

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
    let systemPrompt = "";

    if (mode === "customer") {
      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      console.log("Customer query:", lastUserMsg);

      // Dynamic product search based on user query
      // Remove filler words and punctuation for cleaner search
      const fillerWords = new Set(["boi", "ta", "ache", "ki", "kothay", "den", "chai", "lagbe", "dorkar", "book", "price", "dam", "কি", "আছে", "কোথায়", "দাম", "কত", "চাই", "লাগবে", "দরকার", "দেন", "একটা", "একটি", "টা", "টি", "বইটা", "বইটি", "the", "a", "is", "are", "do", "you", "have", "want", "need", "please"]);
      const rawTerms = lastUserMsg.replace(/[।,?!।?\-।:;()"'।]/g, " ").trim();
      const meaningfulWords = rawTerms.split(/\s+/).filter(w => w.length >= 2 && !fillerWords.has(w.toLowerCase()));
      const searchTerms = meaningfulWords.join(" ").trim();
      // Also create individual word search patterns
      const wordPatterns = meaningfulWords.filter(w => w.length >= 3);
      console.log("Search terms:", searchTerms, "| Word patterns:", wordPatterns);
      
      const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes, bundlesRes] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percentage, sales_count").eq("is_active", true).order("sales_count", { ascending: false }).limit(15),
        supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(20),
        supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email"]),
        supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
        supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(10),
        supabase.from("product_bundles").select("name_bn, bundle_price, original_price").eq("is_active", true).limit(5),
      ]);

      // Search using OR conditions for each meaningful word (most robust approach)
      let allBookResults: any[] = [];
      let allUniversalResults: any[] = [];
      let allEbookResults: any[] = [];

      if (wordPatterns.length > 0) {
        // Build OR conditions: each word matches against both bn and en titles
        const bookOrConds = wordPatterns.flatMap(w => [
          `title_bn.ilike.%${w}%`,
          `title_en.ilike.%${w}%`,
        ]).join(",");
        const univOrConds = wordPatterns.flatMap(w => [
          `name_bn.ilike.%${w}%`,
          `name_en.ilike.%${w}%`,
        ]).join(",");
        const ebookOrConds = wordPatterns.flatMap(w => [
          `title_bn.ilike.%${w}%`,
          `title_en.ilike.%${w}%`,
        ]).join(",");

        const [bookRes, univRes, ebookRes] = await Promise.all([
          supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percentage").eq("is_active", true).or(bookOrConds).limit(10),
          supabase.from("universal_products").select("name_bn, name_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).or(univOrConds).limit(10),
          supabase.from("digital_products").select("title_bn, title_en, price, slug, is_free, discount_percent").eq("is_active", true).or(ebookOrConds).limit(10),
        ]);
        console.log("Word search - books:", bookRes.data?.length, "err:", bookRes.error?.message, "univ:", univRes.data?.length, "ebooks:", ebookRes.data?.length);
        allBookResults = bookRes.data || [];
        allUniversalResults = univRes.data || [];
        allEbookResults = ebookRes.data || [];
      } else if (searchTerms.length >= 2) {
        // Fallback: full phrase search (for single-word queries)
        const [booksBn, booksEn, univBn, univEn, ebooksBn] = await Promise.all([
          supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percentage").eq("is_active", true).ilike("title_bn", `%${searchTerms}%`).limit(10),
          supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percentage").eq("is_active", true).ilike("title_en", `%${searchTerms}%`).limit(10),
          supabase.from("universal_products").select("name_bn, name_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("name_bn", `%${searchTerms}%`).limit(10),
          supabase.from("universal_products").select("name_bn, name_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("name_en", `%${searchTerms}%`).limit(10),
          supabase.from("digital_products").select("title_bn, title_en, price, slug, is_free, discount_percent").eq("is_active", true).ilike("title_bn", `%${searchTerms}%`).limit(10),
        ]);
        allBookResults = [...(booksBn.data || []), ...(booksEn.data || [])];
        allUniversalResults = [...(univBn.data || []), ...(univEn.data || [])];
        allEbookResults = ebooksBn.data || [];
      }

      // Strategy 3: Search by writer/author name if still no results
      let writerBooks: any[] = [];
      if (searchTerms.length >= 2 && allBookResults.length === 0) {
        const writerOrConds = wordPatterns.length > 0
          ? wordPatterns.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",")
          : `name_bn.ilike.%${searchTerms}%,name_en.ilike.%${searchTerms}%`;
        const { data: writerData } = await supabase.from("writers").select("id").or(writerOrConds).limit(3);
        if (writerData && writerData.length > 0) {
          const writerIds = writerData.map((w: any) => w.id);
          const { data: wb } = await supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percentage").eq("is_active", true).in("writer_id", writerIds).limit(10);
          writerBooks = wb || [];
        }
      }

      // Deduplicate results by slug
      const seen = new Set<string>();
      const dedup = (arr: any[]) => arr.filter(p => {
        const key = p.slug;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Combine search results
      const searchResults = [
        ...dedup(allBookResults).map((p: any) => ({ ...p, _type: "book" })),
        ...dedup(writerBooks).map((p: any) => ({ ...p, _type: "book" })),
        ...dedup(allUniversalResults).map((p: any) => ({ ...p, title_bn: p.name_bn, _type: "universal" })),
        ...dedup(allEbookResults).map((p: any) => ({ ...p, _type: "ebook" })),
      ];
      console.log("Search results found:", searchResults.length, searchResults.map((r: any) => r.title_bn || r.name_bn).join(", "));

      const [universalRes, ebooksRes] = await Promise.all([
        supabase.from("universal_products").select("name_bn, price, slug, discount_percent").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("digital_products").select("title_bn, price, slug, is_free").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => {
        settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
      });

      // Order tracking
      let orderTracking = null;
      const orderMatch = lastUserMsg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || lastUserMsg.match(/(\d{6,})/);
      if (orderMatch) {
        const orderNum = orderMatch[0].replace('#', '');
        const { data: od } = await supabase.rpc("get_order_tracking", { p_order_number: orderNum });
        if (od && !od.error) orderTracking = od;
      }

      systemPrompt = buildCustomerPrompt({
        settings: settingsMap,
        products: productsRes.data,
        categories: categoriesRes.data,
        coupons: offersRes.data,
        delivery: deliveryRes.data,
        bundles: bundlesRes.data,
        searchResults: searchResults.length > 0 ? searchResults : null,
        universalProducts: universalRes.data,
        ebooks: ebooksRes.data,
        orderTracking,
      });

    } else if (mode === "admin") {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

      const [orders30, orders7, orders90, productsRes, customersRes, abandonedRes, couponsRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("total_amount, status, payment_method, delivery_area", { count: "exact" }).gte("created_at", since30),
        supabase.from("orders").select("total_amount, status", { count: "exact" }).gte("created_at", since7),
        supabase.from("orders").select("total_amount", { count: "exact" }).gte("created_at", since90),
        supabase.from("products").select("title_bn, price, stock_quantity, sales_count, discount_percentage", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("abandoned_checkouts").select("subtotal", { count: "exact" }).gte("created_at", since30).eq("recovered", false),
        supabase.from("coupons").select("code", { count: "exact" }).eq("is_active", true),
        supabase.from("product_reviews").select("rating", { count: "exact" }).gte("created_at", since30),
      ]);

      const totalOrders30 = orders30.count || 0;
      const totalOrders7 = orders7.count || 0;
      const totalOrders90 = orders90.count || 0;
      const revenue30 = (orders30.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const revenue7 = (orders7.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const aov = totalOrders30 > 0 ? Math.round(revenue30 / totalOrders30) : 0;
      const totalProducts = productsRes.count || 0;
      const lowStockArr = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) < 5);
      const outOfStockArr = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) === 0);
      const totalCustomers = customersRes.count || 0;
      const newCustomers30 = (customersRes.data || []).filter((c: any) => c.created_at >= since30).length;
      const abandonedCount = abandonedRes.count || 0;
      const abandonedValue = (abandonedRes.data || []).reduce((s: number, a: any) => s + (a.subtotal || 0), 0);

      const statusBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1; });

      const paymentBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { paymentBreakdown[o.payment_method || "unknown"] = (paymentBreakdown[o.payment_method || "unknown"] || 0) + 1; });

      const areaBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { areaBreakdown[o.delivery_area || "অজানা"] = (areaBreakdown[o.delivery_area || "অজানা"] || 0) + 1; });

      const topProducts = (productsRes.data || []).sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 10)
        .map((p: any) => `${p.title_bn}(৳${p.price},${p.sales_count || 0}বিক্রি)`).join(", ");

      const lowStockItems = lowStockArr.slice(0, 8).map((p: any) => `${p.title_bn}(${p.stock_quantity || 0})`).join(", ");

      const avgRating = (reviewsRes.data || []).length > 0
        ? ((reviewsRes.data || []).reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewsRes.data!.length).toFixed(1) : "N/A";

      systemPrompt = buildAdminPrompt({
        revenue30, revenue7, totalOrders30, totalOrders7, totalOrders90, aov,
        statusBreakdown, paymentBreakdown, areaBreakdown,
        totalProducts, outOfStock: outOfStockArr.length, lowStock: lowStockArr.length,
        totalCustomers, newCustomers30, abandonedCount, abandonedValue,
        topProducts, lowStockItems, avgRating, couponsCount: couponsRes.count || 0,
      }, context);
    } else {
      throw new Error("Invalid mode");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "রেট লিমিট, কিছুক্ষণ পর চেষ্টা করুন" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "ক্রেডিট শেষ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
