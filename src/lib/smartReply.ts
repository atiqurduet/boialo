import { supabase } from "@/integrations/supabase/client";

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

const hasAny = (t: string, arr: string[]) => arr.some((w) => t.includes(w.toLowerCase()));

function extractOrderNumber(msg: string): string | null {
  const m = msg.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || msg.match(/\b(\d{6,})\b/);
  return m ? m[0].replace("#", "") : null;
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

function replyFallback(): string {
  return `হুম, আপনার প্রশ্নটা ঠিক বুঝতে পারিনি। 🤔\n\nএগুলো করতে পারেন:\n\n• 🔍 প্রোডাক্টের নাম লিখুন\n• 📦 অর্ডার নম্বর দিয়ে ট্র্যাক করুন\n• 🎁 "অফার" লিখে সক্রিয় কুপন দেখুন\n• 🚚 "ডেলিভারি" লিখে চার্জ জানুন\n• 👤 উপরের **"লাইভ"** বাটনে ক্লিক করে সরাসরি স্টাফের সাথে কথা বলুন`;
}

export async function generateSmartReply(userMessage: string, visitorName?: string): Promise<string> {
  const text = userMessage.toLowerCase().trim();
  if (!text) return replyFallback();

  // Order tracking (highest priority — has order number)
  const orderReply = await replyOrderTracking(userMessage);
  if (orderReply) return orderReply;

  if (hasAny(text, trackWords)) {
    return "📦 আপনার **অর্ডার নম্বর** লিখুন (যেমন: BOI123456 বা #123456) — সাথে সাথে স্ট্যাটাস জানিয়ে দিচ্ছি!";
  }

  if (hasAny(text, greetings)) return replyGreeting(visitorName);
  if (hasAny(text, thanksWords)) return "আপনাকেও ধন্যবাদ! 😊 আর কোনো সাহায্য লাগলে জানাবেন।";
  if (hasAny(text, byeWords)) return "আল্লাহ হাফেজ! 🙏 আবার আসবেন।";

  if (hasAny(text, deliveryWords)) return await replyDelivery();
  if (hasAny(text, offerWords)) return await replyOffers();
  if (hasAny(text, paymentWords)) return replyPayment();
  if (hasAny(text, returnWords)) return replyReturn();
  if (hasAny(text, contactWords)) return await replyContact();
  if (hasAny(text, ebookWords)) return await replyEbooks();
  if (hasAny(text, bookSuggestWords)) return await replyBestSellers();

  // Try product search for anything else meaningful
  const cleanTerm = userMessage
    .replace(/[।,?!।?\-]/g, " ")
    .replace(new RegExp([...priceWords, ...stockWords, "খুঁজে", "খুঁজুন", "চাই", "লাগবে", "দিন", "দাও", "বই"].join("|"), "gi"), " ")
    .trim();

  if (cleanTerm.length >= 2) {
    const results = await searchProducts(cleanTerm);
    if (results.length > 0) {
      const priceAsked = hasAny(text, priceWords);
      const stockAsked = hasAny(text, stockWords);
      const header = priceAsked
        ? `💰 **"${cleanTerm}"** এর দাম:`
        : stockAsked
        ? `📦 **"${cleanTerm}"** এর স্টক:`
        : `🔍 **"${cleanTerm}"** এর সার্চ রেজাল্ট:`;
      return `${header}\n\n${results.join("\n")}\n\nআরো তথ্য লাগলে লিংকে ক্লিক করুন।`;
    }
    return `😔 **"${cleanTerm}"** নামে কিছু খুঁজে পেলাম না।\n\n• বানান চেক করুন\n• অন্য নাম দিয়ে চেষ্টা করুন\n• অথবা [পুরো ক্যাটালগ](/shop) দেখুন`;
  }

  return replyFallback();
}