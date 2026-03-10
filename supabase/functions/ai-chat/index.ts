import { createClient } from "npm:@supabase/supabase-js@2";
import { detectIntent, extractPriceRange, generatePhoneticVariations, extractSearchKeywords } from "./utils.ts";
import { buildCustomerPrompt, buildAdminPrompt } from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { messages, mode, context } = await req.json();
    let systemPrompt = "";

    if (mode === "customer") {
      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      const intent = detectIntent(lastUserMsg);
      const priceRange = extractPriceRange(lastUserMsg);
      const keywords = extractSearchKeywords(lastUserMsg);
      const wordPatterns = keywords.filter(w => w.length >= 3);
      const allVariations = wordPatterns.flatMap(w => generatePhoneticVariations(w));
      const uniqueVariations = [...new Set(allVariations)];
      const banglaWords = keywords.filter(w => /[\u0980-\u09FF]/.test(w));
      const searchTerms = keywords.join(" ").trim();

      console.log("Intent:", intent, "| Keywords:", keywords, "| Variations:", uniqueVariations.length);

      const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes, bundlesRes] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, sales_count").eq("is_active", true).order("sales_count", { ascending: false }).limit(15),
        supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(20),
        supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email"]),
        supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
        supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(10),
        supabase.from("product_bundles").select("name_bn, bundle_price, original_price").eq("is_active", true).limit(5),
      ]);

      let allBookResults: any[] = [];
      let allUniversalResults: any[] = [];
      let allEbookResults: any[] = [];
      let categoryResults: any[] = [];
      let publisherResults: any[] = [];
      let writerResults: any[] = [];

      const shouldSearch = ["product_search", "price_query", "recommendation", "general"].includes(intent) && (uniqueVariations.length > 0 || banglaWords.length > 0);

      if (shouldSearch) {
        const allSearchTerms = [...uniqueVariations, ...banglaWords];
        const bookOrConds = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");
        const univOrConds = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
        const ebookOrConds = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");

        let bq = supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percent, writer_id, publisher_id").eq("is_active", true).or(bookOrConds);
        let uq = supabase.from("universal_products").select("name_bn, name_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).or(univOrConds);
        let eq = supabase.from("digital_products").select("title_bn, title_en, price, slug, is_free, discount_percent").eq("is_active", true).or(ebookOrConds);

        if (priceRange.min) { bq = bq.gte("price", priceRange.min); uq = uq.gte("price", priceRange.min); eq = eq.gte("price", priceRange.min); }
        if (priceRange.max) { bq = bq.lte("price", priceRange.max); uq = uq.lte("price", priceRange.max); eq = eq.lte("price", priceRange.max); }

        const [bookRes, univRes, ebookRes] = await Promise.all([bq.limit(12), uq.limit(10), eq.limit(10)]);
        allBookResults = bookRes.data || [];
        allUniversalResults = univRes.data || [];
        allEbookResults = ebookRes.data || [];

        // Enrich with writer/publisher names
        if (allBookResults.length > 0) {
          const wIds = [...new Set(allBookResults.map(b => b.writer_id).filter(Boolean))];
          const pIds = [...new Set(allBookResults.map(b => b.publisher_id).filter(Boolean))];
          const [wd, pd] = await Promise.all([
            wIds.length > 0 ? supabase.from("writers").select("id, name_bn").in("id", wIds) : { data: [] },
            pIds.length > 0 ? supabase.from("publishers").select("id, name_bn").in("id", pIds) : { data: [] },
          ]);
          const wm = new Map((wd.data || []).map((w: any) => [w.id, w.name_bn]));
          const pm = new Map((pd.data || []).map((p: any) => [p.id, p.name_bn]));
          allBookResults = allBookResults.map(b => ({ ...b, writer_name: wm.get(b.writer_id), publisher_name: pm.get(b.publisher_id) }));
        }
      }

      // Writer search fallback
      if (searchTerms.length >= 2 && allBookResults.length === 0) {
        const terms = [...uniqueVariations, ...banglaWords];
        if (terms.length > 0) {
          const wOr = terms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: wd } = await supabase.from("writers").select("id, name_bn").or(wOr).limit(3);
          if (wd?.length) {
            let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, writer_id").eq("is_active", true).in("writer_id", wd.map((w: any) => w.id));
            if (priceRange.min) q = q.gte("price", priceRange.min);
            if (priceRange.max) q = q.lte("price", priceRange.max);
            const { data: wb } = await q.limit(10);
            writerResults = (wb || []).map((b: any) => ({ ...b, writer_name: wd.find((w: any) => w.id === b.writer_id)?.name_bn || "" }));
          }
        }
      }

      // Publisher search fallback
      if (searchTerms.length >= 2 && allBookResults.length === 0 && writerResults.length === 0) {
        const terms = [...uniqueVariations, ...banglaWords];
        if (terms.length > 0) {
          const pOr = terms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: pd } = await supabase.from("publishers").select("id, name_bn").or(pOr).limit(3);
          if (pd?.length) {
            let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, publisher_id").eq("is_active", true).in("publisher_id", pd.map((p: any) => p.id));
            if (priceRange.min) q = q.gte("price", priceRange.min);
            if (priceRange.max) q = q.lte("price", priceRange.max);
            const { data: pb } = await q.limit(10);
            publisherResults = (pb || []).map((b: any) => ({ ...b, publisher_name: pd.find((p: any) => p.id === b.publisher_id)?.name_bn || "" }));
          }
        }
      }

      // Category search
      if (intent === "category_browse" || (allBookResults.length === 0 && writerResults.length === 0 && publisherResults.length === 0 && searchTerms.length >= 2)) {
        const terms = [...uniqueVariations, ...banglaWords];
        if (terms.length > 0) {
          const cOr = terms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: cd } = await supabase.from("categories").select("id, name_bn").eq("is_active", true).or(cOr).limit(3);
          if (cd?.length) {
            let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).in("category_id", cd.map((c: any) => c.id));
            if (priceRange.min) q = q.gte("price", priceRange.min);
            if (priceRange.max) q = q.lte("price", priceRange.max);
            const { data: cb } = await q.order("sales_count", { ascending: false }).limit(10);
            categoryResults = cb || [];
          }
        }
      }

      // Deduplicate
      const seen = new Set<string>();
      const dedup = (arr: any[]) => arr.filter(p => { if (seen.has(p.slug)) return false; seen.add(p.slug); return true; });
      const searchResults = [
        ...dedup(allBookResults).map((p: any) => ({ ...p, _type: "book" })),
        ...dedup(allUniversalResults).map((p: any) => ({ ...p, title_bn: p.name_bn, _type: "universal" })),
        ...dedup(allEbookResults).map((p: any) => ({ ...p, _type: "ebook" })),
      ];

      const [universalRes, ebooksRes] = await Promise.all([
        supabase.from("universal_products").select("name_bn, price, slug, discount_percent").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("digital_products").select("title_bn, price, slug, is_free").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value); });

      let orderTracking = null;
      if (intent === "order_tracking") {
        const m = lastUserMsg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || lastUserMsg.match(/(\d{6,})/);
        if (m) { const { data: od } = await supabase.rpc("get_order_tracking", { p_order_number: m[0].replace('#', '') }); if (od && !od.error) orderTracking = od; }
      }

      systemPrompt = buildCustomerPrompt({
        settings: settingsMap, products: productsRes.data, categories: categoriesRes.data,
        coupons: offersRes.data, delivery: deliveryRes.data, bundles: bundlesRes.data,
        searchResults: searchResults.length > 0 ? searchResults : null,
        universalProducts: universalRes.data, ebooks: ebooksRes.data, orderTracking,
        intent, priceRange,
        categoryResults: categoryResults.length > 0 ? categoryResults : null,
        publisherResults: publisherResults.length > 0 ? publisherResults : null,
        writerResults: writerResults.length > 0 ? writerResults : null,
      });

    } else if (mode === "admin") {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

      const [orders30, orders7, orders90, productsRes, customersRes, abandonedRes, couponsRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("total_amount, status, payment_method, delivery_area", { count: "exact" }).gte("created_at", since30),
        supabase.from("orders").select("total_amount, status", { count: "exact" }).gte("created_at", since7),
        supabase.from("orders").select("total_amount", { count: "exact" }).gte("created_at", since90),
        supabase.from("products").select("title_bn, price, stock_quantity, sales_count, discount_percent", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("abandoned_checkouts").select("subtotal", { count: "exact" }).gte("created_at", since30).eq("recovered", false),
        supabase.from("coupons").select("code", { count: "exact" }).eq("is_active", true),
        supabase.from("product_reviews").select("rating", { count: "exact" }).gte("created_at", since30),
      ]);

      const t30 = orders30.count || 0, t7 = orders7.count || 0, t90 = orders90.count || 0;
      const r30 = (orders30.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const r7 = (orders7.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const aov = t30 > 0 ? Math.round(r30 / t30) : 0;
      const tp = productsRes.count || 0;
      const ls = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) < 5);
      const oos = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) === 0);
      const tc = customersRes.count || 0;
      const nc = (customersRes.data || []).filter((c: any) => c.created_at >= since30).length;
      const ac = abandonedRes.count || 0;
      const av = (abandonedRes.data || []).reduce((s: number, a: any) => s + (a.subtotal || 0), 0);

      const sb: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { sb[o.status] = (sb[o.status] || 0) + 1; });
      const pb: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { pb[o.payment_method || "unknown"] = (pb[o.payment_method || "unknown"] || 0) + 1; });
      const ab: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { ab[o.delivery_area || "অজানা"] = (ab[o.delivery_area || "অজানা"] || 0) + 1; });

      const topP = (productsRes.data || []).sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 10)
        .map((p: any) => `${p.title_bn}(৳${p.price},${p.sales_count || 0}বিক্রি)`).join(", ");
      const lsi = ls.slice(0, 8).map((p: any) => `${p.title_bn}(${p.stock_quantity || 0})`).join(", ");
      const ar = (reviewsRes.data || []).length > 0
        ? ((reviewsRes.data || []).reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewsRes.data!.length).toFixed(1) : "N/A";

      systemPrompt = buildAdminPrompt({
        revenue30: r30, revenue7: r7, totalOrders30: t30, totalOrders7: t7, totalOrders90: t90, aov,
        statusBreakdown: sb, paymentBreakdown: pb, areaBreakdown: ab,
        totalProducts: tp, outOfStock: oos.length, lowStock: ls.length,
        totalCustomers: tc, newCustomers30: nc, abandonedCount: ac, abandonedValue: av,
        topProducts: topP, lowStockItems: lsi, avgRating: ar, couponsCount: couponsRes.count || 0,
      }, context);
    } else {
      throw new Error("Invalid mode");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, ...messages], stream: true }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "রেট লিমিট" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "ক্রেডিট শেষ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
