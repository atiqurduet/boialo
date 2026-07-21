import { createClient } from "npm:@supabase/supabase-js@2";
import { detectIntent, detectSentiment, extractPriceRange, generatePhoneticVariations, extractSearchKeywords, summarizeConversation } from "./utils.ts";
import { buildCustomerPrompt, buildAdminPrompt } from "./prompts.ts";
import { aiChatCompletion, hasAiProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await hasAiProvider())) throw new Error("No AI provider key configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { messages, mode, context } = await req.json();

    // Derive userId from JWT if present; never trust a client-supplied userId.
    const authHeader = req.headers.get("Authorization");
    let userId: string | undefined;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) userId = userData.user.id;
    }

    // Admin mode requires authenticated admin role.
    if (mode === "admin") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRows } = await supabase
        .from("user_roles").select("role").eq("user_id", userId);
      const roles = (roleRows || []).map((r: any) => r.role);
      const isAdmin = roles.some((r: string) => ["super_admin", "admin", "manager"].includes(r));
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    let systemPrompt = "";

    if (mode === "customer") {
      // Fetch chatbot settings
      const { data: chatbotSettingsRaw } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "chatbot_enabled", "chatbot_greeting", "chatbot_custom_instructions",
          "chatbot_faq", "chatbot_name", "chatbot_tone",
          "chatbot_restricted_topics", "chatbot_fallback_message"
        ]);
      
      const cs: Record<string, any> = {};
      (chatbotSettingsRaw || []).forEach((s: any) => {
        try { cs[s.setting_key] = typeof s.setting_value === "string" ? JSON.parse(s.setting_value) : s.setting_value; } catch { cs[s.setting_key] = s.setting_value; }
      });

      // Check if chatbot is disabled
      if (cs.chatbot_enabled === false || cs.chatbot_enabled === "false") {
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: cs.chatbot_fallback_message || "চ্যাটবট বর্তমানে বন্ধ আছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।" } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      }

      const lastUserMsg = messages?.[messages.length - 1]?.content || "";
      const intent = detectIntent(lastUserMsg);
      const sentiment = detectSentiment(lastUserMsg);
      const priceRange = extractPriceRange(lastUserMsg);
      const convSummary = summarizeConversation(messages);
      console.log("Intent:", intent, "| Sentiment:", sentiment, "| Query:", lastUserMsg.slice(0, 60));

      const needsSearch = ["product_search", "price_query", "recommendation", "general", "category_browse", "comparison", "gift_suggestion"].includes(intent);

      const keywords = needsSearch ? extractSearchKeywords(lastUserMsg) : [];
      const wordPatterns = keywords.filter(w => w.length >= 3);
      const uniqueVariations = [...new Set(wordPatterns.flatMap(w => generatePhoneticVariations(w)))];
      const banglaWords = keywords.filter(w => /[\u0980-\u09FF]/.test(w));
      const searchTerms = keywords.join(" ").trim();
      const allSearchTerms = [...uniqueVariations, ...banglaWords];

      // ── PHASE 1: Fetch base data + search + user context ALL in parallel ──
      const basePromises: Promise<any>[] = [
        supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, sales_count").eq("is_active", true).order("sales_count", { ascending: false }).limit(10),
        supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(15),
        supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email"]),
        supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
        supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(8),
        supabase.from("product_bundles").select("name_bn, bundle_price, original_price").eq("is_active", true).limit(5),
      ];

      // Search queries
      if (needsSearch && allSearchTerms.length > 0) {
        const bookOr = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");
        const univOr = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
        const ebookOr = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");
        const writerOr = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
        const pubOr = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
        const catOr = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");

        let bq = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, writer_id, publisher_id").eq("is_active", true).or(bookOr);
        let uq = supabase.from("universal_products").select("name_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).or(univOr);
        let eq = supabase.from("digital_products").select("title_bn, price, slug, is_free, discount_percent").eq("is_active", true).or(ebookOr);
        if (priceRange.min) { bq = bq.gte("price", priceRange.min); uq = uq.gte("price", priceRange.min); eq = eq.gte("price", priceRange.min); }
        if (priceRange.max) { bq = bq.lte("price", priceRange.max); uq = uq.lte("price", priceRange.max); eq = eq.lte("price", priceRange.max); }

        basePromises.push(
          bq.limit(10),  // [6]
          uq.limit(8),   // [7]
          eq.limit(8),   // [8]
          supabase.from("writers").select("id, name_bn").or(writerOr).limit(3),  // [9]
          supabase.from("publishers").select("id, name_bn").or(pubOr).limit(3),  // [10]
          intent === "category_browse"
            ? supabase.from("categories").select("id, name_bn").eq("is_active", true).or(catOr).limit(3)
            : Promise.resolve({ data: [] }),  // [11]
        );
      }

      // User context queries (parallel with everything else)
      const userPromises: Promise<any>[] = [];
      if (userId) {
        userPromises.push(
          supabase.from("profiles").select("full_name, phone").eq("id", userId).single(),
          supabase.from("orders").select("order_number, status, total_amount").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
          supabase.from("loyalty_points").select("points").eq("user_id", userId).single(),
          supabase.from("wishlist_items").select("product_id, products(title_bn)").eq("user_id", userId).limit(5),
          supabase.from("cart_items").select("quantity, product_id, products(title_bn)").eq("user_id", userId).limit(5),
        );
      }

      // Order tracking
      let orderTrackingPromise: Promise<any> = Promise.resolve(null);
      if (intent === "order_tracking") {
        const m = lastUserMsg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || lastUserMsg.match(/(\d{6,})/);
        if (m) orderTrackingPromise = supabase.rpc("get_order_tracking", { p_order_number: m[0].replace('#', '') });
      }

      // Execute ALL in one parallel batch
      const [results, otResult, ...userResults] = await Promise.all([
        Promise.all(basePromises),
        orderTrackingPromise,
        ...userPromises,
      ]);

      const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes, bundlesRes] = results;
      let allBookResults = results[6]?.data || [];
      const allUniversalResults = results[7]?.data || [];
      const allEbookResults = results[8]?.data || [];
      const writerLookup = results[9]?.data || [];
      const publisherLookup = results[10]?.data || [];
      const categoryLookup = results[11]?.data || [];

      // Build user context
      let userContext: any = null;
      if (userId && userResults.length > 0) {
        userContext = {
          profile: userResults[0]?.data || null,
          recentOrders: userResults[1]?.data || [],
          loyaltyPoints: userResults[2]?.data?.points || 0,
          wishlistItems: (userResults[3]?.data || []).map((w: any) => ({ title_bn: w.products?.title_bn })),
          cartItems: (userResults[4]?.data || []).map((c: any) => ({ title_bn: c.products?.title_bn, quantity: c.quantity })),
        };
      }

      let writerResults: any[] = [];
      let publisherResults: any[] = [];
      let categoryResults: any[] = [];
      const orderTracking = otResult?.data && !otResult.data?.error ? otResult.data : null;

      // ── PHASE 2: Enrich & fallback ──
      const phase2: Promise<any>[] = [];
      if (allBookResults.length > 0) {
        const wIds = [...new Set(allBookResults.map((b: any) => b.writer_id).filter(Boolean))];
        const pIds = [...new Set(allBookResults.map((b: any) => b.publisher_id).filter(Boolean))];
        if (wIds.length) phase2.push(supabase.from("writers").select("id, name_bn").in("id", wIds));
        if (pIds.length) phase2.push(supabase.from("publishers").select("id, name_bn").in("id", pIds));
      }
      if (allBookResults.length === 0 && needsSearch) {
        if (writerLookup.length > 0) {
          let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, writer_id").eq("is_active", true).in("writer_id", writerLookup.map((w: any) => w.id));
          if (priceRange.min) q = q.gte("price", priceRange.min);
          if (priceRange.max) q = q.lte("price", priceRange.max);
          phase2.push(q.limit(8));
        }
        if (publisherLookup.length > 0) {
          let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, publisher_id").eq("is_active", true).in("publisher_id", publisherLookup.map((p: any) => p.id));
          if (priceRange.min) q = q.gte("price", priceRange.min);
          if (priceRange.max) q = q.lte("price", priceRange.max);
          phase2.push(q.limit(8));
        }
        if (categoryLookup.length > 0) {
          let q = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).in("category_id", categoryLookup.map((c: any) => c.id));
          if (priceRange.min) q = q.gte("price", priceRange.min);
          if (priceRange.max) q = q.lte("price", priceRange.max);
          phase2.push(q.order("sales_count", { ascending: false }).limit(8));
        }
      }

      if (phase2.length > 0) {
        const p2 = await Promise.all(phase2);
        let idx = 0;
        if (allBookResults.length > 0) {
          const wIds = [...new Set(allBookResults.map((b: any) => b.writer_id).filter(Boolean))];
          const pIds = [...new Set(allBookResults.map((b: any) => b.publisher_id).filter(Boolean))];
          const wm = new Map(wIds.length ? (p2[idx++]?.data || []).map((w: any) => [w.id, w.name_bn]) : []);
          const pm = new Map(pIds.length ? (p2[idx++]?.data || []).map((p: any) => [p.id, p.name_bn]) : []);
          allBookResults = allBookResults.map((b: any) => ({ ...b, writer_name: wm.get(b.writer_id), publisher_name: pm.get(b.publisher_id) }));
        } else {
          if (writerLookup.length > 0) writerResults = (p2[idx++]?.data || []).map((b: any) => ({ ...b, writer_name: writerLookup.find((w: any) => w.id === b.writer_id)?.name_bn || "" }));
          if (publisherLookup.length > 0) publisherResults = (p2[idx++]?.data || []).map((b: any) => ({ ...b, publisher_name: publisherLookup.find((p: any) => p.id === b.publisher_id)?.name_bn || "" }));
          if (categoryLookup.length > 0) categoryResults = p2[idx++]?.data || [];
        }
      }

      const seen = new Set<string>();
      const dedup = (arr: any[]) => arr.filter(p => { if (seen.has(p.slug)) return false; seen.add(p.slug); return true; });
      const searchResults = [
        ...dedup(allBookResults).map((p: any) => ({ ...p, _type: "book" })),
        ...dedup(allUniversalResults).map((p: any) => ({ ...p, title_bn: p.name_bn, _type: "universal" })),
        ...dedup(allEbookResults).map((p: any) => ({ ...p, _type: "ebook" })),
      ];

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value); });

      systemPrompt = buildCustomerPrompt({
        settings: settingsMap, products: productsRes.data, categories: categoriesRes.data,
        coupons: offersRes.data, delivery: deliveryRes.data, bundles: bundlesRes.data,
        searchResults: searchResults.length > 0 ? searchResults : null,
        orderTracking, intent, priceRange, userContext,
        categoryResults: categoryResults.length > 0 ? categoryResults : null,
        publisherResults: publisherResults.length > 0 ? publisherResults : null,
        writerResults: writerResults.length > 0 ? writerResults : null,
        chatbotSettings: cs,
      });

      // Add conversation summary & sentiment hint
      if (convSummary) systemPrompt += convSummary;
      if (sentiment === "negative" || sentiment === "urgent") {
        systemPrompt += `\n⚡ গ্রাহকের মেজাজ: ${sentiment === "negative" ? "বিরক্ত/হতাশ — বিশেষ যত্ন নাও, সমবেদনা দেখাও" : "জরুরি — দ্রুত ও সরাসরি উত্তর দাও"}`;
      }

    } else if (mode === "admin") {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

      const [orders30, orders7, orders90, productsRes, customersRes, abandonedRes, couponsRes, reviewsRes, returnedOrders, repeatCustomers] = await Promise.all([
        supabase.from("orders").select("total_amount, status, payment_method, delivery_area", { count: "exact" }).gte("created_at", since30),
        supabase.from("orders").select("total_amount, status", { count: "exact" }).gte("created_at", since7),
        supabase.from("orders").select("total_amount", { count: "exact" }).gte("created_at", since90),
        supabase.from("products").select("title_bn, price, stock_quantity, sales_count, discount_percent", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("abandoned_checkouts").select("subtotal", { count: "exact" }).gte("created_at", since30).eq("recovered", false),
        supabase.from("coupons").select("code", { count: "exact" }).eq("is_active", true),
        supabase.from("product_reviews").select("rating", { count: "exact" }).gte("created_at", since30),
        supabase.from("orders").select("id", { count: "exact" }).eq("status", "returned").gte("created_at", since30),
        supabase.from("orders").select("user_id").gte("created_at", since90),
      ]);

      const t30 = orders30.count || 0, t7 = orders7.count || 0, t90 = orders90.count || 0;
      const r30 = (orders30.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const r7 = (orders7.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const aov = t30 > 0 ? Math.round(r30 / t30) : 0;
      const ls = (productsRes.data || []).filter((p: any) => (p.stock_quantity || 0) < 5);
      const oos = ls.filter((p: any) => (p.stock_quantity || 0) === 0);
      const nc = (customersRes.data || []).filter((c: any) => c.created_at >= since30).length;
      const av = (abandonedRes.data || []).reduce((s: number, a: any) => s + (a.subtotal || 0), 0);

      // Return rate
      const returnRate = t30 > 0 ? ((returnedOrders.count || 0) / t30 * 100).toFixed(1) : undefined;

      // Repeat customer rate
      const userOrderCounts = new Map<string, number>();
      (repeatCustomers.data || []).forEach((o: any) => { userOrderCounts.set(o.user_id, (userOrderCounts.get(o.user_id) || 0) + 1); });
      const totalBuyers = userOrderCounts.size;
      const repeatBuyers = [...userOrderCounts.values()].filter(c => c > 1).length;
      const repeatCustomerRate = totalBuyers > 0 ? ((repeatBuyers / totalBuyers) * 100).toFixed(1) : undefined;

      const sb: Record<string, number> = {}, pb: Record<string, number> = {}, ab: Record<string, number> = {};
      (orders30.data || []).forEach((o: any) => { sb[o.status] = (sb[o.status] || 0) + 1; pb[o.payment_method || "unknown"] = (pb[o.payment_method || "unknown"] || 0) + 1; ab[o.delivery_area || "অজানা"] = (ab[o.delivery_area || "অজানা"] || 0) + 1; });

      const topP = (productsRes.data || []).sort((a: any, b: any) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 10)
        .map((p: any) => `${p.title_bn}(৳${p.price},${p.sales_count || 0}বিক্রি)`).join(", ");

      systemPrompt = buildAdminPrompt({
        revenue30: r30, revenue7: r7, totalOrders30: t30, totalOrders7: t7, totalOrders90: t90, aov,
        statusBreakdown: sb, paymentBreakdown: pb, areaBreakdown: ab,
        totalProducts: productsRes.count || 0, outOfStock: oos.length, lowStock: ls.length,
        totalCustomers: customersRes.count || 0, newCustomers30: nc, abandonedCount: abandonedRes.count || 0, abandonedValue: av,
        topProducts: topP, lowStockItems: ls.slice(0, 8).map((p: any) => `${p.title_bn}(${p.stock_quantity || 0})`).join(", "),
        avgRating: (reviewsRes.data || []).length > 0 ? ((reviewsRes.data || []).reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewsRes.data!.length).toFixed(1) : "N/A",
        couponsCount: couponsRes.count || 0,
        returnRate: returnRate ? parseFloat(returnRate) : undefined,
        repeatCustomerRate: repeatCustomerRate ? parseFloat(repeatCustomerRate) : undefined,
      }, context);
    } else {
      throw new Error("Invalid mode");
    }

    const response = await aiChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "রেট লিমিট" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "ক্রেডিট শেষ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${s}`);
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
