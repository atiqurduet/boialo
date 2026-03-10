import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──────────────────────────────────────────
// INTENT DETECTION
// ──────────────────────────────────────────
type Intent = "product_search" | "order_tracking" | "greeting" | "price_query" | "category_browse" | "complaint" | "delivery_query" | "coupon_query" | "recommendation" | "general";

function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase();
  const bn = msg;

  // Order tracking
  if (/(?:BOI|ORD|#)[\-]?\d{4,}/i.test(msg) || /অর্ডার|ট্র্যাক|কোথায় পৌঁছ|কবে পাব|শিপ/i.test(bn) || /order|track|shipping|where is/i.test(lower))
    return "order_tracking";

  // Greeting
  if (/^(হ্যালো|হাই|আসসালামু|সালাম|hey|hi|hello|assalamu|good morning|good evening|সুপ্রভাত|শুভ সন্ধ্যা)\b/i.test(msg.trim()))
    return "greeting";

  // Complaint / refund
  if (/অভিযোগ|সমস্যা|রিফান্ড|রিটার্ন|ক্ষতিগ্রস্ত|ভুল|নষ্ট|complaint|refund|return|damaged|wrong|broken/i.test(msg))
    return "complaint";

  // Delivery query
  if (/ডেলিভারি|শিপিং|কত দিন|কবে আসবে|delivery|shipping|how long|কুরিয়ার/i.test(msg))
    return "delivery_query";

  // Coupon / offer
  if (/কুপন|অফার|ডিসকাউন্ট|ছাড়|coupon|offer|discount|promo|কোড/i.test(msg))
    return "coupon_query";

  // Price query
  if (/দাম|মূল্য|কত|price|cost|how much|টাকা|৳/i.test(msg))
    return "price_query";

  // Category browse
  if (/ক্যাটাগরি|বিভাগ|ধরনের|category|categories|section|জনরা|genre|শ্রেণী/i.test(msg))
    return "category_browse";

  // Recommendation
  if (/সাজেস্ট|রিকমেন্ড|ভালো বই|জনপ্রিয়|বেস্ট|suggest|recommend|popular|best|trending|top/i.test(msg))
    return "recommendation";

  // Product search (broad — any product-related query)
  if (/বই|বুক|book|প্রোডাক্ট|product|আছে|কিনতে|কিনব|পাওয়া|দেখান|খুঁজ|search|find|show|want|need|লাগবে|চাই|দরকার/i.test(msg))
    return "product_search";

  return "general";
}

// ──────────────────────────────────────────
// EXTRACT PRICE RANGE from user message
// ──────────────────────────────────────────
function extractPriceRange(msg: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};
  // "৳100-500", "100 থেকে 500", "100 to 500", "under 500", "500 এর নিচে"
  const rangeMatch = msg.match(/[৳]?\s*(\d+)\s*(?:[-–থেকে\s]+|to\s+)[৳]?\s*(\d+)/i);
  if (rangeMatch) {
    result.min = parseInt(rangeMatch[1]);
    result.max = parseInt(rangeMatch[2]);
    return result;
  }
  const underMatch = msg.match(/(?:under|নিচে|কম|less than|এর কম|মধ্যে)\s*[৳]?\s*(\d+)/i) || msg.match(/[৳]?\s*(\d+)\s*(?:এর নিচে|এর কম|র নিচে|র কম|পর্যন্ত)/i);
  if (underMatch) { result.max = parseInt(underMatch[1]); return result; }
  const overMatch = msg.match(/(?:above|over|ওপরে|বেশি|more than|উপরে)\s*[৳]?\s*(\d+)/i) || msg.match(/[৳]?\s*(\d+)\s*(?:এর উপরে|এর বেশি|র উপরে|র বেশি)/i);
  if (overMatch) { result.min = parseInt(overMatch[1]); return result; }
  return result;
}

// ──────────────────────────────────────────
// PHONETIC NORMALIZATION (expanded)
// ──────────────────────────────────────────
function generatePhoneticVariations(word: string): string[] {
  const variations = new Set<string>([word]);
  const lower = word.toLowerCase();
  if (lower.length < 3) return [word];

  const replacements: [RegExp, string][] = [
    [/o/gi, 'a'], [/a/gi, 'o'],
    [/ee/gi, 'i'], [/i(?!ng)/gi, 'ee'],
    [/oo/gi, 'u'], [/u/gi, 'oo'],
    [/sh/gi, 'ss'], [/ss/gi, 'sh'],
    [/ph/gi, 'f'], [/f/gi, 'ph'],
    [/v/gi, 'bh'], [/bh/gi, 'v'],
    [/th/gi, 't'], [/ch/gi, 'c'],
    [/z/gi, 'j'], [/j/gi, 'z'],
    [/ou/gi, 'u'], [/ow/gi, 'o'],
    [/ck/gi, 'k'], [/k/gi, 'ck'],
    [/w/gi, 'v'], [/y/gi, 'i'],
    [/aa/gi, 'a'], [/ii/gi, 'i'],
    [/tt/gi, 't'], [/dd/gi, 'd'],
    [/nn/gi, 'n'], [/mm/gi, 'm'],
    [/kh/gi, 'k'], [/gh/gi, 'g'],
    [/dh/gi, 'd'], [/ng/gi, 'n'],
  ];
  for (const [pattern, replacement] of replacements) {
    const variant = lower.replace(pattern, replacement);
    if (variant !== lower && variant.length >= 3) variations.add(variant);
  }
  // Also add version without trailing vowels (common in Banglish)
  if (/[aeiou]$/i.test(lower)) variations.add(lower.slice(0, -1));
  // Add version without double letters
  const deduped = lower.replace(/(.)\1+/g, '$1');
  if (deduped !== lower && deduped.length >= 3) variations.add(deduped);

  return Array.from(variations);
}

// ──────────────────────────────────────────
// BANGLA TEXT NORMALIZATION
// ──────────────────────────────────────────
function normalizeBangla(text: string): string {
  return text
    .replace(/[়]/g, '') // remove hasanta variations
    .replace(/\s+/g, ' ')
    .trim();
}

// ──────────────────────────────────────────
// SMART KEYWORD EXTRACTION
// ──────────────────────────────────────────
const FILLER_WORDS = new Set([
  "boi", "ta", "ache", "ki", "kothay", "den", "chai", "lagbe", "dorkar",
  "book", "price", "dam", "কি", "আছে", "কোথায়", "দাম", "কত", "চাই",
  "লাগবে", "দরকার", "দেন", "একটা", "একটি", "টা", "টি", "বইটা", "বইটি",
  "the", "a", "is", "are", "do", "you", "have", "want", "need", "please",
  "ami", "amr", "amar", "apnar", "apni", "tumi", "tor", "tomar", "ekta",
  "kono", "show", "dekhao", "dekhaw", "bolun", "bolen", "bolo", "bol",
  "আমি", "আমার", "আপনার", "আপনি", "তুমি", "তোমার", "কোনো", "একটা",
  "দেখান", "দেখাও", "বলুন", "বলো", "কিছু", "সব", "গুলো", "ভালো",
  "good", "nice", "best", "new", "নতুন", "সেরা", "ভাল",
  "can", "could", "would", "should", "will", "may", "might",
  "give", "get", "tell", "say", "look", "see", "find", "search",
  "খুঁজে", "খুজে", "পাওয়া", "যায়", "কিনতে", "কিনব", "কেনা",
  "product", "products", "প্রোডাক্ট", "item", "items",
]);

function extractSearchKeywords(msg: string): string[] {
  const cleaned = msg.replace(/[।,?!;\-:()\"'।৳\d]/g, " ").trim();
  return cleaned.split(/\s+/).filter(w => w.length >= 2 && !FILLER_WORDS.has(w.toLowerCase()));
}

// ──────────────────────────────────────────
// CUSTOMER PROMPT BUILDER
// ──────────────────────────────────────────
function buildCustomerPrompt(data: any) {
  const { settings, products, categories, coupons, delivery, bundles, searchResults, orderTracking, universalProducts, ebooks, intent, priceRange, categoryResults, publisherResults, writerResults } = data;
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
        const discount = p.discount_percent;
        const writer = p.writer_name ? ` | লেখক: ${p.writer_name}` : "";
        const publisher = p.publisher_name ? ` | প্রকাশনী: ${p.publisher_name}` : "";
        return `• ${name} - ৳${p.price}${discount ? ` (${discount}% ছাড়)` : ""}${stock}${writer}${publisher} | [${link}]`;
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
    if (orderTracking.history && Array.isArray(orderTracking.history)) {
      orderSection += `\n- ইতিহাস: ${orderTracking.history.map((h: any) => `${h.status}(${new Date(h.created_at).toLocaleDateString('bn-BD')})`).join(" → ")}`;
    }
  }

  let categorySection = "";
  if (categoryResults && categoryResults.length > 0) {
    categorySection = `\n\n📂 ক্যাটাগরি অনুযায়ী প্রোডাক্ট:\n` +
      categoryResults.map((p: any) =>
        `• ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | /product/${p.slug}`
      ).join("\n");
  }

  let publisherSection = "";
  if (publisherResults && publisherResults.length > 0) {
    publisherSection = `\n\n🏢 প্রকাশনী অনুযায়ী প্রোডাক্ট:\n` +
      publisherResults.map((p: any) =>
        `• ${p.title_bn} - ৳${p.price} | প্রকাশনী: ${p.publisher_name || "N/A"} | /product/${p.slug}`
      ).join("\n");
  }

  let writerSection = "";
  if (writerResults && writerResults.length > 0) {
    writerSection = `\n\n✍️ লেখক অনুযায়ী প্রোডাক্ট:\n` +
      writerResults.map((p: any) =>
        `• ${p.title_bn} - ৳${p.price} | লেখক: ${p.writer_name || "N/A"} | /product/${p.slug}`
      ).join("\n");
  }

  let priceHint = "";
  if (priceRange?.min || priceRange?.max) {
    priceHint = `\n💰 গ্রাহক ${priceRange.min ? `৳${priceRange.min}` : ""}${priceRange.min && priceRange.max ? " - " : ""}${priceRange.max ? `৳${priceRange.max}` : ""} রেঞ্জে প্রোডাক্ট চাইছেন।`;
  }

  const intentHint = `\n🎯 শনাক্ত ইন্টেন্ট: ${intent}`;

  return `তুমি "${siteName}" অনলাইন শপের AI সহকারী "বই বন্ধু"। সবসময় বাংলায় উত্তর দাও।

🏪 দোকান: ${siteName} | ফোন: ${settings.contact_phone || "N/A"} | ইমেইল: ${settings.contact_email || "N/A"}

📚 বেস্ট সেলার:\n${bestSellers || "তথ্য নেই"}
📂 ক্যাটাগরি: ${categoryList || "N/A"}
🎁 অফার:\n${activeCoupons || "বর্তমানে কোনো অফার নেই"}
🚚 ডেলিভারি:\n${deliveryInfo || "ঢাকায় ৳60, বাইরে ৳120"}
📦 বান্ডেল:\n${bundleInfo || "কোনো বান্ডেল নেই"}${searchSection}${categorySection}${publisherSection}${writerSection}${universalSection}${ebookSection}${orderSection}${priceHint}${intentHint}

⭐ নিয়ম:
1. ফ্রেন্ডলি, সংক্ষিপ্ত (২-৩ বাক্য) কিন্তু তথ্যপূর্ণ
2. প্রোডাক্ট রিকমেন্ড করলে নাম, মূল্য ও সঠিক লিংক দাও (মার্কডাউন লিংক [নাম](path) ফরম্যাটে)
3. অর্ডার ট্র্যাকিং এ অর্ডার নম্বর জিজ্ঞেস করো (BOI-XXXX)
4. রিফান্ড/জটিল সমস্যায় "👤 লাইভ চ্যাট" এ যোগাযোগ করতে বলো এবং ফোন নম্বর দাও
5. পেমেন্ট: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
6. ইমোজি ব্যবহার করো, প্রতিটি উত্তরে ফলো-আপ করো
7. 🔍 সার্চ রেজাল্ট থাকলে ঐগুলো অগ্রাধিকার দাও
8. প্রোডাক্টের দাম, স্টক, ছাড় সব সঠিকভাবে জানাও
9. ই-বুক এবং ইউনিভার্সাল প্রোডাক্ট সম্পর্কেও জানাও
10. গ্রাহক হতাশ হলে সমবেদনা দেখাও ও ফোন ${settings.contact_phone || "N/A"} দাও
11. কখনো "নমস্কার" বলবে না। অভিবাদনে "আসসালামু আলাইকুম" বা "হ্যালো" বা সরাসরি উত্তর দাও
12. প্রোডাক্ট না পেলে বলো "দুঃখিত, এই মুহূর্তে পাওয়া যাচ্ছে না" এবং কাছাকাছি বিকল্প সাজেস্ট করো
13. লেখকের নাম দিলে সেই লেখকের বই দেখাও
14. প্রকাশনীর নাম দিলে সেই প্রকাশনীর বই দেখাও
15. দামের রেঞ্জ বললে সেই রেঞ্জের মধ্যে প্রোডাক্ট দেখাও
16. ক্যাটাগরি জিজ্ঞেস করলে সকল ক্যাটাগরি দেখাও ও লিংক দাও
17. গ্রাহক complaint করলে প্রথমে সমবেদনা দেখাও, তারপর সমাধান দাও
18. গ্রাহক greeting দিলে উষ্ণভাবে সাড়া দাও ও কীভাবে সাহায্য করতে পারো জিজ্ঞেস করো`;
}

// ──────────────────────────────────────────
// ADMIN PROMPT BUILDER
// ──────────────────────────────────────────
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

// ──────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────
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
      const intent = detectIntent(lastUserMsg);
      const priceRange = extractPriceRange(lastUserMsg);
      console.log("Intent:", intent, "| Price range:", JSON.stringify(priceRange), "| Query:", lastUserMsg);

      const keywords = extractSearchKeywords(lastUserMsg);
      const wordPatterns = keywords.filter(w => w.length >= 3);
      const allVariations = wordPatterns.flatMap(w => generatePhoneticVariations(w));
      const uniqueVariations = [...new Set(allVariations)];
      // Also include original Bengali words for direct matching
      const banglaWords = keywords.filter(w => /[\u0980-\u09FF]/.test(w));
      const searchTerms = keywords.join(" ").trim();

      console.log("Keywords:", keywords, "| Variations:", uniqueVariations, "| Bangla:", banglaWords);

      // ── Base data (always fetch) ──
      const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes, bundlesRes] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, sales_count").eq("is_active", true).order("sales_count", { ascending: false }).limit(15),
        supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(20),
        supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email"]),
        supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
        supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(10),
        supabase.from("product_bundles").select("name_bn, bundle_price, original_price").eq("is_active", true).limit(5),
      ]);

      // ── Smart search based on intent ──
      let allBookResults: any[] = [];
      let allUniversalResults: any[] = [];
      let allEbookResults: any[] = [];
      let categoryResults: any[] = [];
      let publisherResults: any[] = [];
      let writerResults: any[] = [];

      const shouldSearch = ["product_search", "price_query", "recommendation", "general"].includes(intent) && (uniqueVariations.length > 0 || banglaWords.length > 0);

      if (shouldSearch) {
        // Build OR conditions from variations + bangla words
        const allSearchTerms = [...uniqueVariations, ...banglaWords];
        const bookOrConds = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");
        const univOrConds = allSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
        const ebookOrConds = allSearchTerms.flatMap(w => [`title_bn.ilike.%${w}%`, `title_en.ilike.%${w}%`]).join(",");

        let bookQuery = supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percent, writer_id, publisher_id").eq("is_active", true).or(bookOrConds);
        let univQuery = supabase.from("universal_products").select("name_bn, name_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).or(univOrConds);
        let ebookQuery = supabase.from("digital_products").select("title_bn, title_en, price, slug, is_free, discount_percent").eq("is_active", true).or(ebookOrConds);

        // Apply price filter
        if (priceRange.min) {
          bookQuery = bookQuery.gte("price", priceRange.min);
          univQuery = univQuery.gte("price", priceRange.min);
          ebookQuery = ebookQuery.gte("price", priceRange.min);
        }
        if (priceRange.max) {
          bookQuery = bookQuery.lte("price", priceRange.max);
          univQuery = univQuery.lte("price", priceRange.max);
          ebookQuery = ebookQuery.lte("price", priceRange.max);
        }

        const [bookRes, univRes, ebookRes] = await Promise.all([
          bookQuery.limit(12),
          univQuery.limit(10),
          ebookQuery.limit(10),
        ]);
        console.log("Search results - books:", bookRes.data?.length, "univ:", univRes.data?.length, "ebooks:", ebookRes.data?.length);
        allBookResults = bookRes.data || [];
        allUniversalResults = univRes.data || [];
        allEbookResults = ebookRes.data || [];

        // ── Enrich book results with writer & publisher names ──
        if (allBookResults.length > 0) {
          const writerIds = [...new Set(allBookResults.map(b => b.writer_id).filter(Boolean))];
          const publisherIds = [...new Set(allBookResults.map(b => b.publisher_id).filter(Boolean))];
          const [writersData, publishersData] = await Promise.all([
            writerIds.length > 0 ? supabase.from("writers").select("id, name_bn").in("id", writerIds) : { data: [] },
            publisherIds.length > 0 ? supabase.from("publishers").select("id, name_bn").in("id", publisherIds) : { data: [] },
          ]);
          const writerMap = new Map((writersData.data || []).map((w: any) => [w.id, w.name_bn]));
          const publisherMap = new Map((publishersData.data || []).map((p: any) => [p.id, p.name_bn]));
          allBookResults = allBookResults.map(b => ({
            ...b,
            writer_name: writerMap.get(b.writer_id) || null,
            publisher_name: publisherMap.get(b.publisher_id) || null,
          }));
        }
      } else if (searchTerms.length >= 2 && shouldSearch === false && intent !== "greeting" && intent !== "complaint") {
        // Fallback phrase search for short queries
        const [booksBn, booksEn] = await Promise.all([
          supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("title_bn", `%${searchTerms}%`).limit(10),
          supabase.from("products").select("title_bn, title_en, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("title_en", `%${searchTerms}%`).limit(10),
        ]);
        allBookResults = [...(booksBn.data || []), ...(booksEn.data || [])];
      }

      // ── Writer search (if no book results or intent suggests author lookup) ──
      if (searchTerms.length >= 2 && allBookResults.length === 0) {
        const writerSearchTerms = [...uniqueVariations, ...banglaWords];
        if (writerSearchTerms.length > 0) {
          const writerOrConds = writerSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: writerData } = await supabase.from("writers").select("id, name_bn").or(writerOrConds).limit(3);
          if (writerData && writerData.length > 0) {
            const writerIds = writerData.map((w: any) => w.id);
            let writerBookQuery = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, writer_id").eq("is_active", true).in("writer_id", writerIds);
            if (priceRange.min) writerBookQuery = writerBookQuery.gte("price", priceRange.min);
            if (priceRange.max) writerBookQuery = writerBookQuery.lte("price", priceRange.max);
            const { data: wb } = await writerBookQuery.limit(10);
            writerResults = (wb || []).map((b: any) => ({
              ...b,
              writer_name: writerData.find((w: any) => w.id === b.writer_id)?.name_bn || "",
            }));
          }
        }
      }

      // ── Publisher search ──
      if (searchTerms.length >= 2 && allBookResults.length === 0 && writerResults.length === 0) {
        const pubSearchTerms = [...uniqueVariations, ...banglaWords];
        if (pubSearchTerms.length > 0) {
          const pubOrConds = pubSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: pubData } = await supabase.from("publishers").select("id, name_bn").or(pubOrConds).limit(3);
          if (pubData && pubData.length > 0) {
            const pubIds = pubData.map((p: any) => p.id);
            let pubBookQuery = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent, publisher_id").eq("is_active", true).in("publisher_id", pubIds);
            if (priceRange.min) pubBookQuery = pubBookQuery.gte("price", priceRange.min);
            if (priceRange.max) pubBookQuery = pubBookQuery.lte("price", priceRange.max);
            const { data: pb } = await pubBookQuery.limit(10);
            publisherResults = (pb || []).map((b: any) => ({
              ...b,
              publisher_name: pubData.find((p: any) => p.id === b.publisher_id)?.name_bn || "",
            }));
          }
        }
      }

      // ── Category search ──
      if (intent === "category_browse" || (allBookResults.length === 0 && writerResults.length === 0 && publisherResults.length === 0 && searchTerms.length >= 2)) {
        const catSearchTerms = [...uniqueVariations, ...banglaWords];
        if (catSearchTerms.length > 0) {
          const catOrConds = catSearchTerms.flatMap(w => [`name_bn.ilike.%${w}%`, `name_en.ilike.%${w}%`]).join(",");
          const { data: catData } = await supabase.from("categories").select("id, name_bn").eq("is_active", true).or(catOrConds).limit(3);
          if (catData && catData.length > 0) {
            const catIds = catData.map((c: any) => c.id);
            let catBookQuery = supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).in("category_id", catIds);
            if (priceRange.min) catBookQuery = catBookQuery.gte("price", priceRange.min);
            if (priceRange.max) catBookQuery = catBookQuery.lte("price", priceRange.max);
            const { data: cb } = await catBookQuery.order("sales_count", { ascending: false }).limit(10);
            categoryResults = cb || [];
          }
        }
      }

      // ── Deduplicate ──
      const seen = new Set<string>();
      const dedup = (arr: any[]) => arr.filter(p => {
        const key = p.slug;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const searchResults = [
        ...dedup(allBookResults).map((p: any) => ({ ...p, _type: "book" })),
        ...dedup(allUniversalResults).map((p: any) => ({ ...p, title_bn: p.name_bn, _type: "universal" })),
        ...dedup(allEbookResults).map((p: any) => ({ ...p, _type: "ebook" })),
      ];
      console.log("Total results:", searchResults.length, "writer:", writerResults.length, "publisher:", publisherResults.length, "category:", categoryResults.length);

      const [universalRes, ebooksRes] = await Promise.all([
        supabase.from("universal_products").select("name_bn, price, slug, discount_percent").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("digital_products").select("title_bn, price, slug, is_free").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => {
        settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
      });

      // ── Order tracking ──
      let orderTracking = null;
      if (intent === "order_tracking") {
        const orderMatch = lastUserMsg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || lastUserMsg.match(/(\d{6,})/);
        if (orderMatch) {
          const orderNum = orderMatch[0].replace('#', '');
          const { data: od } = await supabase.rpc("get_order_tracking", { p_order_number: orderNum });
          if (od && !od.error) orderTracking = od;
        }
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
        intent,
        priceRange,
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
