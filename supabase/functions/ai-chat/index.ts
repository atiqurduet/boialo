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

    let systemPrompt = "";

    if (mode === "customer") {
      // Fetch rich product data for context
      const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes, bundlesRes] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percentage, sales_count").eq("is_active", true).order("sales_count", { ascending: false }).limit(30),
        supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(20),
        supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email", "delivery_info", "return_policy", "opening_hours"]),
        supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount, description_bn").eq("is_active", true).limit(5),
        supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(10),
        supabase.from("product_bundles").select("name_bn, bundle_price, original_price").eq("is_active", true).limit(5),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => {
        settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
      });

      const bestSellers = (productsRes.data || []).slice(0, 10).map((p: any) => 
        `• ${p.title_bn} - ৳${p.price}${p.discount_percentage ? ` (${p.discount_percentage}% ছাড়)` : ""} [/product/${p.slug}]`
      ).join("\n");

      const newArrivals = (productsRes.data || []).slice(10, 20).map((p: any) => 
        `• ${p.title_bn} - ৳${p.price} [/product/${p.slug}]`
      ).join("\n");

      const categoryList = (categoriesRes.data || []).map((c: any) => c.name_bn).join(", ");

      const activeCoupons = (offersRes.data || []).map((c: any) => 
        `• কোড: ${c.code} - ${c.discount_type === 'percentage' ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ছাড়`}${c.min_order_amount ? ` (সর্বনিম্ন ৳${c.min_order_amount})` : ""}${c.description_bn ? ` - ${c.description_bn}` : ""}`
      ).join("\n");

      const deliveryInfo = (deliveryRes.data || []).map((d: any) => 
        `• ${d.zone_name_bn}: ৳${d.delivery_charge} (${d.estimated_days_min || 1}-${d.estimated_days_max || 3} দিন)`
      ).join("\n");

      const bundleInfo = (bundlesRes.data || []).map((b: any) => 
        `• ${b.name_bn}: ৳${b.bundle_price} (আসল মূল্য ৳${b.original_price})`
      ).join("\n");

      // Check if user is asking about order tracking
      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      let orderTrackingInfo = "";
      
      const orderNumberMatch = lastUserMsg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || lastUserMsg.match(/(\d{6,})/);
      if (orderNumberMatch) {
        const orderNum = orderNumberMatch[0].replace('#', '');
        const { data: orderData } = await supabase.rpc("get_order_tracking", { p_order_number: orderNum });
        if (orderData && !orderData.error) {
          const statusMap: Record<string, string> = {
            pending: "⏳ পেন্ডিং",
            confirmed: "✅ কনফার্মড",
            processing: "🔄 প্রসেসিং",
            shipped: "🚚 শিপড",
            delivered: "📦 ডেলিভারড",
            cancelled: "❌ বাতিল",
            returned: "↩️ রিটার্ন"
          };
          orderTrackingInfo = `\n\n📦 অর্ডার #${orderData.order_number} তথ্য:
- স্ট্যাটাস: ${statusMap[orderData.status] || orderData.status}
- কুরিয়ার: ${orderData.courier_provider || "নির্ধারিত হয়নি"}
- ট্র্যাকিং: ${orderData.tracking_number || "এখনো পাওয়া যায়নি"}
- অর্ডারের তারিখ: ${orderData.created_at ? new Date(orderData.created_at).toLocaleDateString('bn-BD') : "N/A"}
- ডেলিভারি এলাকা: ${orderData.delivery_area || "N/A"}`;
        }
      }

      systemPrompt = `তুমি "${settingsMap.site_name || "বইআলো"}" অনলাইন বুকশপের AI সহকারী "বই বন্ধু"। তুমি সবসময় বাংলায় উত্তর দেবে।

🏪 দোকানের তথ্য:
- নাম: ${settingsMap.site_name || "বইআলো"}
- ফোন: ${settingsMap.contact_phone || "N/A"}
- ইমেইল: ${settingsMap.contact_email || "N/A"}

📚 বেস্ট সেলার:
${bestSellers || "তথ্য নেই"}

🆕 নতুন বই:
${newArrivals || "তথ্য নেই"}

📂 ক্যাটাগরি: ${categoryList || "N/A"}

🎁 সক্রিয় অফার/কুপন:
${activeCoupons || "বর্তমানে কোনো অফার নেই"}

🚚 ডেলিভারি চার্জ:
${deliveryInfo || "ঢাকার ভিতরে ৳60, বাইরে ৳120"}

📦 বান্ডেল অফার:
${bundleInfo || "কোনো বান্ডেল নেই"}
${orderTrackingInfo}

⭐ তোমার চরিত্র ও নিয়ম:
1. তুমি ফ্রেন্ডলি, সাহায্যকারী ও প্রফেশনাল
2. সংক্ষিপ্ত (২-৩ বাক্য) কিন্তু তথ্যপূর্ণ উত্তর দাও
3. বই রিকমেন্ড করার সময় নাম, মূল্য ও লিংক দাও
4. অর্ডার ট্র্যাকিং এর জন্য অর্ডার নম্বর জিজ্ঞেস করো (BOI-XXXX ফরম্যাট)
5. রিফান্ড/জটিল সমস্যায় "👤 লাইভ চ্যাট" বাটনে ক্লিক করতে বলো
6. পেমেন্ট মেথড: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
7. সক্রিয় অফার/কুপন থাকলে গ্রাহককে জানাও
8. ইমোজি ব্যবহার করে বার্তা আকর্ষণীয় রাখো
9. প্রতিটি উত্তরের শেষে একটি ফলো-আপ প্রশ্ন করো
10. গ্রাহক হতাশ মনে হলে সমবেদনা দেখাও ও দ্রুত সমাধান দাও`;

    } else if (mode === "admin") {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

      const [orders30, orders7, orders90, productsRes, customersRes, abandonedRes, couponsRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("total_amount, status, created_at, payment_method, delivery_area", { count: "exact" }).gte("created_at", since30),
        supabase.from("orders").select("total_amount, status", { count: "exact" }).gte("created_at", since7),
        supabase.from("orders").select("total_amount", { count: "exact" }).gte("created_at", since90),
        supabase.from("products").select("title_bn, price, stock_quantity, sales_count, discount_percentage, created_at", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("abandoned_checkouts").select("subtotal, step", { count: "exact" }).gte("created_at", since30).eq("recovered", false),
        supabase.from("coupons").select("code, used_count, discount_type, discount_value", { count: "exact" }).eq("is_active", true),
        supabase.from("product_reviews").select("rating", { count: "exact" }).gte("created_at", since30),
      ]);

      const totalOrders30 = orders30.count || 0;
      const totalOrders7 = orders7.count || 0;
      const totalOrders90 = orders90.count || 0;
      const revenue30 = (orders30.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const revenue7 = (orders7.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const aov = totalOrders30 > 0 ? Math.round(revenue30 / totalOrders30) : 0;
      const totalProducts = productsRes.count || 0;
      const lowStock = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) < 5);
      const outOfStock = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) === 0);
      const totalCustomers = customersRes.count || 0;
      const newCustomers30 = (customersRes.data || []).filter((c: any) => c.created_at >= since30).length;
      const abandonedCount = abandonedRes.count || 0;
      const abandonedValue = (abandonedRes.data || []).reduce((s: number, a: any) => s + (a.subtotal || 0), 0);

      // Order status breakdown
      const statusBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => {
        statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      });

      // Payment method breakdown
      const paymentBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => {
        const method = o.payment_method || "unknown";
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + 1;
      });

      // Top products
      const topProducts = (productsRes.data || [])
        .sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 15)
        .map((p: any) => `• ${p.title_bn} - ৳${p.price} (বিক্রি: ${p.sales_count || 0}, স্টক: ${p.stock_quantity || 0}${p.discount_percentage ? `, ${p.discount_percentage}% ছাড়` : ""})`)
        .join("\n");

      // Low stock items
      const lowStockItems = lowStock.slice(0, 10)
        .map((p: any) => `• ${p.title_bn} (স্টক: ${p.stock_quantity || 0})`)
        .join("\n");

      // Average rating
      const avgRating = (reviewsRes.data || []).length > 0
        ? ((reviewsRes.data || []).reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewsRes.data!.length).toFixed(1)
        : "N/A";

      // Delivery area breakdown
      const areaBreakdown: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => {
        const area = o.delivery_area || "অজানা";
        areaBreakdown[area] = (areaBreakdown[area] || 0) + 1;
      });

      systemPrompt = `তুমি একজন প্রফেশনাল AI বিজনেস অ্যানালিস্ট ও স্ট্র্যাটেজিস্ট। এটি "${settingsMap?.site_name || "বইআলো"}" নামের একটি বাংলাদেশি অনলাইন বুকশপ। সবসময় বাংলায় উত্তর দাও।

📊 ===== বিজনেস ড্যাশবোর্ড =====

💰 রেভিনিউ:
- গত ৭ দিন: ৳${revenue7.toLocaleString()} (${totalOrders7} অর্ডার)
- গত ৩০ দিন: ৳${revenue30.toLocaleString()} (${totalOrders30} অর্ডার)
- গত ৯০ দিন: ${totalOrders90} অর্ডার
- গড় অর্ডার ভ্যালু (AOV): ৳${aov}

📋 অর্ডার স্ট্যাটাস (৩০ দিন):
${Object.entries(statusBreakdown).map(([k, v]) => `• ${k}: ${v}`).join("\n")}

💳 পেমেন্ট মেথড:
${Object.entries(paymentBreakdown).map(([k, v]) => `• ${k}: ${v}`).join("\n")}

🗺️ ডেলিভারি এলাকা:
${Object.entries(areaBreakdown).slice(0, 5).map(([k, v]) => `• ${k}: ${v}`).join("\n")}

👥 কাস্টমার:
- মোট: ${totalCustomers}
- নতুন (৩০ দিন): ${newCustomers30}

📦 ইনভেন্টরি:
- মোট প্রোডাক্ট: ${totalProducts}
- আউট অফ স্টক: ${outOfStock.length}
- লো স্টক (<৫): ${lowStock.length}

🔝 টপ ১৫ প্রোডাক্ট:
${topProducts || "N/A"}

⚠️ লো স্টক আইটেম:
${lowStockItems || "কোনো লো স্টক নেই"}

🛒 অসম্পূর্ণ অর্ডার:
- সংখ্যা: ${abandonedCount}
- সম্ভাব্য রেভিনিউ লস: ৳${abandonedValue.toLocaleString()}

⭐ গড় রেটিং (৩০ দিন): ${avgRating}

🎟️ সক্রিয় কুপন: ${couponsRes.count || 0}

${context ? `\n📌 অতিরিক্ত প্রসঙ্গ: ${context}` : ""}

⭐ তোমার কাজ ও নিয়ম:
1. ডেটা-ড্রিভেন, অ্যাকশনেবল পরামর্শ দাও
2. প্রতিটি সাজেশনে নির্দিষ্ট সংখ্যা/মেট্রিক্স ব্যবহার করো
3. সমস্যা চিহ্নিত করে সমাধান দাও (যেমন: লো স্টক, হাই অ্যাবান্ডনমেন্ট)
4. মার্কেটিং ক্যাম্পেইন প্ল্যান দিতে পারো (টাইমলাইন, বাজেট, চ্যানেল)
5. কম্পিটিটর অ্যানালাইসিস ও মার্কেট ট্রেন্ড শেয়ার করো
6. ইমোজি, বুলেট পয়েন্ট, হেডিং ব্যবহার করে সুন্দরভাবে ফরম্যাট করো
7. ROI হিসাব ও KPI ট্র্যাকিং সাজেস্ট করো
8. বাংলাদেশ মার্কেটের প্রেক্ষাপটে পরামর্শ দাও
9. প্রশ্নের উত্তর ছাড়াও প্রাসঙ্গিক ইনসাইট শেয়ার করো
10. টেবিল/চার্ট ডেটা মার্কডাউন ফরম্যাটে দাও`;
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
