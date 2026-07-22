import { supabase } from "@/integrations/supabase/client";

export interface ChatContextMessage {
  sender_type: string; // "customer" | "admin"
  message: string;
}

export interface SmartReplyResult {
  message: string;
  quickReplies?: string[];
}

const FALLBACK_QUICK_REPLIES: Record<string, string[]> = {
  default: ["🎁 অফার দেখুন", "🚚 ডেলিভারি চার্জ", "📚 বেস্ট সেলার", "📱 ই-বুক", "👤 লাইভ চ্যাট"],
  followup_no_ref: ["📦 অর্ডার ট্র্যাক", "🔍 বই খুঁজুন", "🎁 অফার দেখুন", "👤 লাইভ চ্যাট"],
  context_empty: ["🔍 বই খুঁজুন", "📚 বেস্ট সেলার", "📱 ই-বুক", "👤 লাইভ চ্যাট"],
  no_context: ["🎁 অফার দেখুন", "🚚 ডেলিভারি চার্জ", "📚 বেস্ট সেলার", "👤 লাইভ চ্যাট"],
  no_results: ["🔍 নতুন কীওয়ার্ড দিন", "📚 বেস্ট সেলার", "🎁 অফার দেখুন", "👤 লাইভ চ্যাট"],
};

// Trim to a display-friendly length (≤ ~22 chars) for chip text.
function trimChip(s: string, max = 22): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

// Deduplicate, drop empties, cap between 3 and 5 chips.
function finalizeQuickReplies(items: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (!raw) continue;
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 5) break;
  }
  return out.slice(0, 5);
}

/**
 * Build a context-aware quick-reply set for a fallback situation.
 * Prioritizes chips that reference the last product/order the user mentioned,
 * then fills with intent-driven defaults, always ending with "লাইভ চ্যাট".
 */
function buildDynamicQuickReplies(
  reason: "default" | "no_context" | "context_empty" | "followup_no_ref" | "no_results",
  opts: {
    productTerm?: string | null;
    orderNumber?: string | null;
    priceAsked?: boolean;
    stockAsked?: boolean;
    userMessage?: string;
  } = {}
): string[] {
  const { productTerm, orderNumber, priceAsked, stockAsked, userMessage = "" } = opts;
  const chips: (string | null)[] = [];
  const lower = userMessage.toLowerCase();

  // 1) Product-scoped chips (highest priority when a product is in context)
  if (productTerm) {
    const label = trimChip(productTerm, 16);
    if (!priceAsked) chips.push(`💰 "${label}" এর দাম`);
    if (!stockAsked) chips.push(`📦 "${label}" স্টকে?`);
    chips.push(`🔍 একই ধরনের আরও বই`);
  }

  // 2) Order-scoped chip
  if (orderNumber) {
    chips.push(`📦 অর্ডার #${orderNumber} ট্র্যাক`);
  }

  // 3) Intent-driven chips based on the current user message
  if (hasAny(lower, deliveryWords)) chips.push("🚚 ডেলিভারি চার্জ");
  if (hasAny(lower, paymentWords)) chips.push("💳 পেমেন্ট মাধ্যম");
  if (hasAny(lower, returnWords)) chips.push("↩️ রিটার্ন পলিসি");
  if (hasAny(lower, ebookWords)) chips.push("📱 ই-বুক দেখুন");

  // 4) Reason-specific defaults (help pool)
  const pool = FALLBACK_QUICK_REPLIES[reason] ?? FALLBACK_QUICK_REPLIES.default;
  // Skip generic "লাইভ চ্যাট" here; appended at the end.
  for (const c of pool) if (!c.includes("লাইভ")) chips.push(c);

  // 5) Always finish with a live-chat escape hatch
  chips.push("👤 লাইভ চ্যাট");

  const finalized = finalizeQuickReplies(chips);
  // Ensure a minimum of 3 chips by topping up from the default pool if needed.
  if (finalized.length < 3) {
    const topUp = finalizeQuickReplies([...finalized, ...FALLBACK_QUICK_REPLIES.default]);
    return topUp.slice(0, Math.max(3, topUp.length));
  }
  return finalized;
}

const statusMap: Record<string, string> = {
  pending: "⏳ পেন্ডিং",
  confirmed: "✅ কনফার্মড",
  processing: "🔄 প্রসেসিং",
  shipped: "🚚 শিপড",
  delivered: "📦 ডেলিভারড",
  cancelled: "❌ বাতিল",
};

const greetings = ["হ্যালো", "হাই", "hi", "hello", "salam", "সালাম", "আসসালাম"];
const thanksWords = ["ধন্যবাদ", "thanks", "thank you", "thnx"];
const byeWords = ["bye", "বিদায়", "আল্লাহ হাফেজ"];
const priceWords = ["দাম", "প্রাইস", "price", "কত", "মূল্য"];
const stockWords = ["স্টক", "stock", "আছে কি", "available"];
const paymentWords = ["পেমেন্ট", "payment", "বিকাশ", "নগদ", "bkash", "nagad", "cod", "ক্যাশ"];
const contactWords = ["যোগাযোগ", "contact", "ফোন", "phone", "নাম্বার", "email", "ইমেইল"];
const returnWords = ["রিটার্ন", "return", "রিফান্ড", "refund", "ফেরত"];
const offerWords = ["অফার", "offer", "ছাড়", "discount", "কুপন", "coupon", "promo"];
const deliveryWords = ["ডেলিভারি", "delivery", "চার্জ", "শিপিং", "shipping", "কুরিয়ার"];
const trackWords = ["ট্র্যাক", "track", "অর্ডার কোথায়", "অর্ডার স্ট্যাটাস"];
const ebookWords = ["ই-বুক", "ইবুক", "ebook", "digital", "ডিজিটাল", "pdf"];
const bookSuggestWords = ["সাজেস্ট", "recommend", "suggest", "বেস্ট সেলার", "জনপ্রিয়", "popular"];
const authorWords = ["লেখক", "রাইটার", "author", "writer", "এর বই", "লিখেছেন"];
const categoryWords = ["ক্যাটাগরি", "category", "বিভাগ", "genre", "ঘরানা"];
const cancelWords = ["বাতিল", "cancel", "ক্যান্সেল", "এডিট", "edit", "পরিবর্তন", "modify"];
const codWords = ["cod", "ক্যাশ অন ডেলিভারি", "ক্যাশ অন", "cash on delivery"];
const hoursWords = ["অফিস টাইম", "অফিস সময়", "কখন খোলা", "open hours", "working hours", "সময়সূচি"];
const accountWords = ["একাউন্ট", "অ্যাকাউন্ট", "account", "login", "লগইন", "পাসওয়ার্ড", "password", "signup", "রেজিস্টার"];

// Banglish → Bangla normalization for common tokens
const BANGLISH_MAP: Array<[RegExp, string]> = [
  [/\bboi\b/gi, "বই"],
  [/\bebook(s)?\b/gi, "ই-বুক"],
  [/\border\b/gi, "অর্ডার"],
  [/\bcancel\b/gi, "বাতিল"],
  [/\bdelivery\b/gi, "ডেলিভারি"],
  [/\bprice\b/gi, "দাম"],
  [/\bstock\b/gi, "স্টক"],
  [/\boffer(s)?\b/gi, "অফার"],
  [/\btk\b|\btaka\b|\btk\.\b/gi, "টাকা"],
];

function normalizeInput(s: string): string {
  let out = s;
  for (const [re, rep] of BANGLISH_MAP) out = out.replace(re, rep);
  return out.replace(/\s+/g, " ").trim();
}

// Bengali digits → ASCII
function toAsciiDigits(s: string): string {
  const bn = "০১২৩৪৫৬৭৮৯";
  return s.replace(/[০-৯]/g, (d) => String(bn.indexOf(d)));
}

// Parse a price constraint from the user message.
// Supports "500 টাকার নিচে", "under 500", "৩০০-৫০০ টাকা", "৫০০ এর মধ্যে".
function parsePriceRange(msg: string): { min?: number; max?: number } | null {
  const t = toAsciiDigits(msg.toLowerCase());
  const range = t.match(/(\d{2,6})\s*(?:-|to|থেকে)\s*(\d{2,6})/);
  if (range) {
    const a = +range[1], b = +range[2];
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const under = t.match(/(\d{2,6})\s*(?:টাকার\s*(?:নিচে|কম|ভেতরে|মধ্যে)|এর\s*(?:মধ্যে|নিচে|কম))/) ||
    t.match(/(?:under|below|less than|<=?)\s*(\d{2,6})/);
  if (under) return { max: +under[1] };
  const over = t.match(/(\d{2,6})\s*(?:টাকার\s*(?:উপরে|বেশি))/) ||
    t.match(/(?:over|above|more than|>=?)\s*(\d{2,6})/);
  if (over) return { min: +over[1] };
  return null;
}

const hasAny = (t: string, arr: string[]) => arr.some((w) => t.includes(w.toLowerCase()));

function extractOrderNumber(msg: string): string | null {
  const m = msg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || msg.match(/\b(\d{6,})\b/);
  return m ? m[0].replace("#", "") : null;
}

// Words we should NOT treat as product search terms when scanning history.
const STOP_TERMS = [
  ...priceWords, ...stockWords, ...greetings, ...thanksWords, ...byeWords,
  ...paymentWords, ...contactWords, ...returnWords, ...offerWords,
  ...deliveryWords, ...trackWords, ...ebookWords, ...bookSuggestWords,
  "খুঁজে", "খুঁজুন", "চাই", "লাগবে", "দিন", "দাও", "বই", "এটা", "ওটা",
  "এইটা", "ওইটা", "এইটার", "ওইটার", "এটার", "ওটার", "সেটা", "সেটার",
  "it", "this", "that", "কোথায়", "কেমন", "কি", "কী",
];

function cleanSearchTerm(raw: string): string {
  return raw
    .replace(/[।,?!।?\-]/g, " ")
    .replace(new RegExp(STOP_TERMS.join("|"), "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pull a likely product name / order number from recent chat history.
function deriveFromHistory(history: ChatContextMessage[]): {
  productTerm: string | null;
  orderNumber: string | null;
} {
  let productTerm: string | null = null;
  let orderNumber: string | null = null;
  // Walk newest -> oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (!m?.message) continue;
    if (!orderNumber) {
      const on = extractOrderNumber(m.message);
      if (on) orderNumber = on;
    }
    if (!productTerm) {
      // Prefer bot messages: they contain resolved product titles inside [Title](url)
      if (m.sender_type === "admin") {
        const linkMatch = m.message.match(/\[([^\]]{2,80})\]\((?:https?:[^)]+)?\/(?:product|products|ebooks)\/[^)]+\)/);
        if (linkMatch) productTerm = linkMatch[1].trim();
      }
      if (!productTerm && m.sender_type === "customer") {
        const cleaned = cleanSearchTerm(m.message);
        if (cleaned.length >= 2) productTerm = cleaned;
      }
    }
    if (productTerm && orderNumber) break;
  }
  return { productTerm, orderNumber };
}

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  if (!data) return null;
  try {
    const v = typeof data.setting_value === "string" ? JSON.parse(data.setting_value) : data.setting_value;
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(data.setting_value);
  }
}

async function searchProducts(term: string): Promise<string[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const [books, universal, ebooks] = await Promise.all([
    supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent")
      .eq("is_active", true).or(`title_bn.ilike.%${q}%,title_en.ilike.%${q}%`).limit(5),
    supabase.from("universal_products").select("name_bn, price, slug, stock_quantity, discount_percent")
      .eq("is_active", true).or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%`).limit(5),
    supabase.from("digital_products").select("title_bn, price, slug, is_free")
      .eq("is_active", true).or(`title_bn.ilike.%${q}%,title_en.ilike.%${q}%`).limit(3),
  ]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines: string[] = [];
  (books.data || []).forEach((p: any) => {
    const stock = p.stock_quantity > 0 ? "✅ স্টকে" : "❌ স্টক শেষ";
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    lines.push(`📚 [${p.title_bn}](${origin}/product/${p.slug}) — ৳${p.price}${disc} | ${stock}`);
  });
  (universal.data || []).forEach((p: any) => {
    const stock = p.stock_quantity > 0 ? "✅ স্টকে" : "❌ স্টক শেষ";
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    lines.push(`🛍️ [${p.name_bn}](${origin}/products/${p.slug}) — ৳${p.price}${disc} | ${stock}`);
  });
  (ebooks.data || []).forEach((p: any) => {
    lines.push(`📱 [${p.title_bn}](${origin}/ebooks/${p.slug}) — ${p.is_free ? "🎁 ফ্রি" : `৳${p.price}`}`);
  });
  return lines;
}

async function replyOrderTracking(msg: string): Promise<string | null> {
  const num = extractOrderNumber(msg);
  if (!num) return null;
  const { data } = await supabase.rpc("get_order_tracking", { p_order_number: num });
  if (!data || (data as any).error) {
    return `😔 অর্ডার **#${num}** খুঁজে পাইনি। সঠিক অর্ডার নম্বর দিন অথবা [Order Tracking](/track/${num}) পেজে চেক করুন।`;
  }
  const od: any = data;
  const status = statusMap[od.status] || od.status;
  return `📦 **অর্ডার #${od.order_number}**\n\n• স্ট্যাটাস: ${status}\n• কুরিয়ার: ${od.courier_provider || "শীঘ্রই আপডেট হবে"}\n• ট্র্যাকিং নম্বর: ${od.tracking_number || "শীঘ্রই"}\n\n[বিস্তারিত দেখুন](/track/${od.order_number})`;
}

async function replyDelivery(): Promise<string> {
  const { data } = await supabase.from("delivery_zones")
    .select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max")
    .eq("is_active", true).order("delivery_charge").limit(10);
  if (!data?.length) return "🚚 ঢাকার ভেতরে ৳৬০, ঢাকার বাইরে ৳১২০। ডেলিভারি সময় ২-৫ দিন।";
  const lines = data.map((d: any) =>
    `• ${d.zone_name_bn}: ৳${d.delivery_charge} (${d.estimated_days_min}-${d.estimated_days_max} দিন)`
  ).join("\n");
  return `🚚 **ডেলিভারি চার্জ ও সময়:**\n\n${lines}`;
}

async function replyOffers(): Promise<string> {
  const { data } = await supabase.from("coupons")
    .select("code, discount_type, discount_value, min_order_amount, description")
    .eq("is_active", true).limit(6);
  if (!data?.length) return "😔 বর্তমানে কোনো সক্রিয় কুপন নেই। শীঘ্রই নতুন অফার আসছে!";
  const lines = data.map((c: any) => {
    const disc = c.discount_type === "percentage" ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ছাড়`;
    const min = c.min_order_amount ? ` (মিন. ৳${c.min_order_amount})` : "";
    return `• কোড: **${c.code}** — ${disc}${min}`;
  }).join("\n");
  return `🎁 **সক্রিয় অফার/কুপন:**\n\n${lines}\n\nচেকআউটে কোড দিলে ছাড় পাবেন!`;
}

async function replyBestSellers(): Promise<string> {
  const { data } = await supabase.from("products")
    .select("title_bn, price, slug, discount_percent")
    .eq("is_active", true).order("sales_count", { ascending: false }).limit(6);
  if (!data?.length) return "📚 আপাতত কোনো প্রোডাক্ট পাওয়া যাচ্ছে না।";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines = data.map((p: any) => {
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    return `• [${p.title_bn}](${origin}/product/${p.slug}) — ৳${p.price}${disc}`;
  }).join("\n");
  return `🔥 **বেস্ট সেলার বই:**\n\n${lines}`;
}

async function replyAuthor(term: string): Promise<string | null> {
  const cleaned = term.replace(new RegExp(authorWords.join("|"), "gi"), " ").trim();
  const q = cleaned.length >= 2 ? cleaned : term;
  if (q.length < 2) return null;
  const { data: writers } = await supabase
    .from("writers").select("id, name_bn, slug")
    .eq("is_active", true).or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%`).limit(1);
  const writer = writers?.[0] as any;
  if (!writer) return null;
  const { data: books } = await supabase
    .from("products").select("title_bn, price, slug, discount_percent, stock_quantity")
    .eq("is_active", true).eq("writer_id", writer.id).order("sales_count", { ascending: false }).limit(8);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!books?.length) {
    return `✍️ **${writer.name_bn}** — লেখকের প্রোফাইল পেলাম, কিন্তু আপাতত কোনো বই পাওয়া যাচ্ছে না।`;
  }
  const lines = books.map((p: any) => {
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    const stock = p.stock_quantity > 0 ? "" : " ❌";
    return `• [${p.title_bn}](${origin}/product/${p.slug}) — ৳${p.price}${disc}${stock}`;
  }).join("\n");
  return `✍️ **${writer.name_bn}**-এর বইসমূহ:\n\n${lines}`;
}

async function replyCategory(term: string): Promise<string | null> {
  const cleaned = term.replace(new RegExp(categoryWords.join("|"), "gi"), " ").trim();
  const q = cleaned.length >= 2 ? cleaned : term;
  if (q.length < 2) return null;
  const { data: cats } = await supabase
    .from("categories").select("id, name_bn, slug")
    .eq("is_active", true).or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%`).limit(1);
  const cat = cats?.[0] as any;
  if (!cat) return null;
  const { data: books } = await supabase
    .from("products").select("title_bn, price, slug, discount_percent")
    .eq("is_active", true).eq("category_id", cat.id).order("sales_count", { ascending: false }).limit(8);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const header = `📂 **${cat.name_bn}** ক্যাটাগরির বই:`;
  if (!books?.length) return `${header}\n\nআপাতত এই ক্যাটাগরিতে কোনো বই নেই। [সব ক্যাটাগরি](${origin}/categories) দেখুন।`;
  const lines = books.map((p: any) => {
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    return `• [${p.title_bn}](${origin}/product/${p.slug}) — ৳${p.price}${disc}`;
  }).join("\n");
  return `${header}\n\n${lines}\n\n[পুরো ক্যাটাগরি দেখুন](${origin}/category/${cat.slug})`;
}

async function replyPriceRange(range: { min?: number; max?: number }): Promise<string> {
  let q = supabase.from("products")
    .select("title_bn, price, slug, discount_percent, stock_quantity")
    .eq("is_active", true).gt("stock_quantity", 0);
  if (typeof range.min === "number") q = q.gte("price", range.min);
  if (typeof range.max === "number") q = q.lte("price", range.max);
  const { data } = await q.order("sales_count", { ascending: false }).limit(8);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const label = range.min && range.max
    ? `৳${range.min}–৳${range.max}`
    : range.max ? `৳${range.max}-এর নিচে` : `৳${range.min}-এর উপরে`;
  if (!data?.length) return `😔 **${label}** দামের মধ্যে কোনো বই এখন পাওয়া যাচ্ছে না।`;
  const lines = data.map((p: any) => {
    const disc = p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : "";
    return `• [${p.title_bn}](${origin}/product/${p.slug}) — ৳${p.price}${disc}`;
  }).join("\n");
  return `💰 **${label}** দামের বই:\n\n${lines}`;
}

function replyCancelEdit(): string {
  return `✏️ **অর্ডার বাতিল / এডিট:**\n\n• **প্রসেসিং** স্ট্যাটাসের আগ পর্যন্ত বাতিল করা যাবে\n• "লাইভ চ্যাট" এ অর্ডার নম্বর দিয়ে জানান — আমাদের স্টাফ সাথে সাথে সাহায্য করবে\n• অথবা [My Orders](/orders) পেজ থেকে অ্যাকশন নিন`;
}

function replyCOD(): string {
  return `💵 **ক্যাশ অন ডেলিভারি (COD):**\n\n• সব প্রোডাক্টে COD available\n• কোনো অতিরিক্ত চার্জ নেই\n• ডেলিভারির সময় পণ্য চেক করে পেমেন্ট করবেন\n• চেকআউটে পেমেন্ট মাধ্যম হিসেবে "COD" বাছাই করুন`;
}

async function replyOfficeHours(): Promise<string> {
  const hours = await getSetting("office_hours");
  return `🕒 **অফিস সময়:** ${hours || "সকাল ১০টা - রাত ১০টা (শুক্রবার বন্ধ)"}\n\nএর বাইরে মেসেজ পাঠালেও পরদিন সকালেই উত্তর পাবেন ইনশাআল্লাহ।`;
}

function replyAccountHelp(): string {
  return `🔐 **একাউন্ট / লগইন সাহায্য:**\n\n• [সাইন ইন](/signin) পেজে যান\n• Google দিয়ে এক ক্লিকে লগইন করতে পারবেন\n• পাসওয়ার্ড ভুলে গেলে "Forgot password" ক্লিক করুন\n• সমস্যা হলে "লাইভ চ্যাট" এ জানান`;
}

async function replyEbooks(): Promise<string> {
  const { data } = await supabase.from("digital_products")
    .select("title_bn, price, slug, is_free")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(6);
  if (!data?.length) return "📱 আপাতত কোনো ই-বুক পাওয়া যাচ্ছে না।";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines = data.map((p: any) =>
    `• [${p.title_bn}](${origin}/ebooks/${p.slug}) — ${p.is_free ? "🎁 ফ্রি" : `৳${p.price}`}`
  ).join("\n");
  return `📱 **নতুন ই-বুক:**\n\n${lines}\n\n[সব ই-বুক দেখুন](/ebooks)`;
}

async function replyContact(): Promise<string> {
  const [phone, email] = await Promise.all([
    getSetting("contact_phone"),
    getSetting("contact_email"),
  ]);
  return `📞 **যোগাযোগ:**\n\n• ফোন: ${phone || "N/A"}\n• ইমেইল: ${email || "N/A"}\n• অফিস সময়: সকাল ১০টা - রাত ১০টা`;
}

function replyPayment(): string {
  return `💳 **পেমেন্ট মাধ্যম:**\n\n• 📱 বিকাশ (Personal/Merchant)\n• 📱 নগদ\n• 💳 SSLCommerz (কার্ড/ব্যাংক)\n• 💵 ক্যাশ অন ডেলিভারি (COD)\n\nচেকআউটে যেকোনো একটি বেছে নিতে পারবেন।`;
}

function replyReturn(): string {
  return `↩️ **রিটার্ন/রিফান্ড পলিসি:**\n\n• পণ্য পাওয়ার ৩ দিনের মধ্যে রিটার্ন\n• পণ্যে সমস্যা থাকলে ফুল রিফান্ড\n• ডিজিটাল পণ্য নন-রিফান্ডেবল\n\n[বিস্তারিত পলিসি](/refund-policy)`;
}

function replyGreeting(name?: string): string {
  return `আসসালামু আলাইকুম${name ? " " + name : ""}! 👋\n\nআপনাকে সাহায্য করতে পারি:\n\n🔍 বই/প্রোডাক্ট খুঁজতে — নাম লিখুন\n📦 অর্ডার ট্র্যাক — অর্ডার নম্বর দিন\n🎁 অফার — "অফার" লিখুন\n🚚 ডেলিভারি চার্জ — "ডেলিভারি" লিখুন`;
}

function replyFallback(reason?: "no_context" | "context_empty" | "followup_no_ref" | "default"): string {
  const intro =
    reason === "context_empty"
      ? `😅 আগের আলোচনায় কোনো নির্দিষ্ট প্রোডাক্ট পেলাম না।`
      : reason === "followup_no_ref"
      ? `🤔 আপনি কোন প্রোডাক্ট/অর্ডার সম্পর্কে জিজ্ঞেস করছেন সেটা বুঝতে পারিনি।`
      : reason === "no_context"
      ? `🤔 আপনার প্রশ্নটা একটু অস্পষ্ট মনে হলো।`
      : `হুম, আপনার প্রশ্নটা ঠিক বুঝতে পারিনি। 🤔`;
  return `${intro}\n\nএগুলো করতে পারেন:\n\n• 🔍 প্রোডাক্টের **নাম** লিখুন (যেমন: "হুমায়ূন আহমেদ")\n• 📦 **অর্ডার নম্বর** দিন (যেমন: BOI123456)\n• 🎁 "অফার" লিখে সক্রিয় কুপন দেখুন\n• 🚚 "ডেলিভারি" লিখে চার্জ জানুন\n• 👤 উপরের **"লাইভ"** বাটনে ক্লিক করে সরাসরি স্টাফের সাথে কথা বলুন`;
}

export async function generateSmartReply(
  userMessage: string,
  visitorName?: string,
  history: ChatContextMessage[] = []
): Promise<SmartReplyResult> {
  const normalized = normalizeInput(userMessage);
  const text = normalized.toLowerCase();
  if (!text) {
    return {
      message: replyFallback("default"),
      quickReplies: buildDynamicQuickReplies("default", { userMessage }),
    };
  }

  // Only use the last 5 messages of prior context.
  const recent = history.slice(-5);
  const ctx = deriveFromHistory(recent);

  // Order tracking (highest priority — has order number in current msg)
  const orderReply = await replyOrderTracking(userMessage);
  if (orderReply) return { message: orderReply };

  if (hasAny(text, trackWords)) {
    // Follow-up: user previously mentioned an order — resolve it now.
    if (ctx.orderNumber) {
      const followUp = await replyOrderTracking(ctx.orderNumber);
      if (followUp) return { message: followUp };
    }
    return {
      message: "📦 আপনার **অর্ডার নম্বর** লিখুন (যেমন: BOI123456 বা #123456) — সাথে সাথে স্ট্যাটাস জানিয়ে দিচ্ছি!",
    };
  }

  if (hasAny(text, greetings)) return { message: replyGreeting(visitorName) };
  if (hasAny(text, thanksWords)) return { message: "আপনাকেও ধন্যবাদ! 😊 আর কোনো সাহায্য লাগলে জানাবেন।" };
  if (hasAny(text, byeWords)) return { message: "আল্লাহ হাফেজ! 🙏 আবার আসবেন।" };

  // Price-range search: "৫০০ টাকার নিচে", "under 500", "৩০০-৫০০"
  const range = parsePriceRange(userMessage);
  if (range) return { message: await replyPriceRange(range) };

  if (hasAny(text, cancelWords)) return { message: replyCancelEdit() };
  if (hasAny(text, codWords)) return { message: replyCOD() };
  if (hasAny(text, hoursWords)) return { message: await replyOfficeHours() };
  if (hasAny(text, accountWords)) return { message: replyAccountHelp() };

  // Author lookup: "হুমায়ূন আহমেদ এর বই", "author humayun"
  if (hasAny(text, authorWords)) {
    const r = await replyAuthor(normalized);
    if (r) return { message: r };
  }
  // Category lookup: "উপন্যাস ক্যাটাগরি"
  if (hasAny(text, categoryWords)) {
    const r = await replyCategory(normalized);
    if (r) return { message: r };
  }

  if (hasAny(text, deliveryWords)) return { message: await replyDelivery() };
  if (hasAny(text, offerWords)) return { message: await replyOffers() };
  if (hasAny(text, paymentWords)) return { message: replyPayment() };
  if (hasAny(text, returnWords)) return { message: replyReturn() };
  if (hasAny(text, contactWords)) return { message: await replyContact() };
  if (hasAny(text, ebookWords)) return { message: await replyEbooks() };
  if (hasAny(text, bookSuggestWords)) return { message: await replyBestSellers() };

  // Try product search for anything else meaningful
  let cleanTerm = cleanSearchTerm(normalized);
  let usedContext = false;

  // Follow-up cues: "এটার দাম?", "স্টক আছে?", "কোথায়?" — resolve via history.
  const priceAsked = hasAny(text, priceWords);
  const stockAsked = hasAny(text, stockWords);
  const isFollowUpCue = priceAsked || stockAsked || /^(এটা|ওটা|এইটা|ওইটা|সেটা|it|this|that)/i.test(userMessage.trim());
  if ((cleanTerm.length < 2 || isFollowUpCue) && ctx.productTerm) {
    cleanTerm = ctx.productTerm;
    usedContext = true;
  }

  if (cleanTerm.length >= 2) {
    const results = await searchProducts(cleanTerm);
    if (results.length > 0) {
      const prefix = usedContext ? `(আগের আলোচনার সূত্রে) ` : "";
      const header = priceAsked
        ? `${prefix}💰 **"${cleanTerm}"** এর দাম:`
        : stockAsked
        ? `${prefix}📦 **"${cleanTerm}"** এর স্টক:`
        : `${prefix}🔍 **"${cleanTerm}"** এর সার্চ রেজাল্ট:`;
      return {
        message: `${header}\n\n${results.join("\n")}\n\nআরো তথ্য লাগলে লিংকে ক্লিক করুন।`,
      };
    }
    // No direct product match — try author or category as a smart fallback
    const authorTry = await replyAuthor(cleanTerm);
    if (authorTry) return { message: authorTry };
    const catTry = await replyCategory(cleanTerm);
    if (catTry) return { message: catTry };
    // Word-by-word retry: try the longest single token
    const tokens = cleanTerm.split(/\s+/).filter((w) => w.length >= 3).sort((a, b) => b.length - a.length);
    for (const tok of tokens.slice(0, 2)) {
      const partial = await searchProducts(tok);
      if (partial.length) {
        return {
          message: `🔍 হুবহু মিল পাইনি, তবে **"${tok}"** দিয়ে এগুলো পেলাম:\n\n${partial.join("\n")}`,
        };
      }
    }
    const note = usedContext
      ? `\n\n(আগের আলোচনার প্রোডাক্ট **"${cleanTerm}"** ধরে খুঁজেছিলাম, কিন্তু মিল পাইনি।)`
      : "";
    return {
      message: `😔 **"${cleanTerm}"** নামে কিছু খুঁজে পেলাম না।${note}\n\n• বানান চেক করুন\n• অন্য নাম দিয়ে চেষ্টা করুন\n• অথবা [পুরো ক্যাটালগ](/shop) দেখুন`,
      quickReplies: buildDynamicQuickReplies("no_results", {
        productTerm: ctx.productTerm,
        orderNumber: ctx.orderNumber,
        priceAsked,
        stockAsked,
        userMessage,
      }),
    };
  }

  // Follow-up cue ছিল কিন্তু context এ কোনো reference নেই
  if (isFollowUpCue) {
    return {
      message: replyFallback("followup_no_ref"),
      quickReplies: buildDynamicQuickReplies("followup_no_ref", {
        productTerm: ctx.productTerm,
        orderNumber: ctx.orderNumber,
        priceAsked,
        stockAsked,
        userMessage,
      }),
    };
  }
  // Context ছিল না বা derive করতে পারিনি
  if (recent.length > 0) {
    return {
      message: replyFallback("context_empty"),
      quickReplies: buildDynamicQuickReplies("context_empty", {
        productTerm: ctx.productTerm,
        orderNumber: ctx.orderNumber,
        userMessage,
      }),
    };
  }
  return {
    message: replyFallback("no_context"),
    quickReplies: buildDynamicQuickReplies("no_context", { userMessage }),
  };
}