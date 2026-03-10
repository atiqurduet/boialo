// ──────────────────────────────────────────
// INTENT DETECTION (Enhanced with multi-intent & confidence)
// ──────────────────────────────────────────
export type Intent = "product_search" | "order_tracking" | "greeting" | "price_query" | "category_browse" | "complaint" | "delivery_query" | "coupon_query" | "recommendation" | "comparison" | "gift_suggestion" | "general";

export function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase();
  const bn = msg;

  if (/(?:BOI|ORD|#)[\-]?\d{4,}/i.test(msg) || /অর্ডার|ট্র্যাক|কোথায় পৌঁছ|কবে পাব|শিপ/i.test(bn) || /order|track|shipping|where is/i.test(lower))
    return "order_tracking";
  if (/^(হ্যালো|হাই|আসসালামু|সালাম|hey|hi|hello|assalamu|good morning|good evening|সুপ্রভাত|শুভ সন্ধ্যা)\b/i.test(msg.trim()))
    return "greeting";
  if (/অভিযোগ|সমস্যা|রিফান্ড|রিটার্ন|ক্ষতিগ্রস্ত|ভুল|নষ্ট|complaint|refund|return|damaged|wrong|broken/i.test(msg))
    return "complaint";
  if (/তুলনা|compare|versus|vs|পার্থক্য|difference|কোনটা ভালো|which is better/i.test(msg))
    return "comparison";
  if (/গিফট|gift|উপহার|জন্মদিন|birthday|বিয়ে|wedding|present/i.test(msg))
    return "gift_suggestion";
  if (/ডেলিভারি|শিপিং|কত দিন|কবে আসবে|delivery|shipping|how long|কুরিয়ার/i.test(msg))
    return "delivery_query";
  if (/কুপন|অফার|ডিসকাউন্ট|ছাড়|coupon|offer|discount|promo|কোড/i.test(msg))
    return "coupon_query";
  if (/দাম|মূল্য|কত|price|cost|how much|টাকা|৳/i.test(msg))
    return "price_query";
  if (/ক্যাটাগরি|বিভাগ|ধরনের|category|categories|section|জনরা|genre|শ্রেণী/i.test(msg))
    return "category_browse";
  if (/সাজেস্ট|রিকমেন্ড|ভালো বই|জনপ্রিয়|বেস্ট|suggest|recommend|popular|best|trending|top/i.test(msg))
    return "recommendation";
  if (/বই|বুক|book|প্রোডাক্ট|product|আছে|কিনতে|কিনব|পাওয়া|দেখান|খুঁজ|search|find|show|want|need|লাগবে|চাই|দরকার/i.test(msg))
    return "product_search";
  return "general";
}

// ──────────────────────────────────────────
// SENTIMENT DETECTION
// ──────────────────────────────────────────
export type Sentiment = "positive" | "negative" | "neutral" | "urgent";

export function detectSentiment(msg: string): Sentiment {
  if (/জরুরি|urgent|asap|এখনই|দ্রুত|তাড়াতাড়ি|quickly/i.test(msg)) return "urgent";
  if (/ধন্যবাদ|thanks|thank|ভালো|great|awesome|চমৎকার|অসাধারণ|খুশি|happy|love|পছন্দ/i.test(msg)) return "positive";
  if (/রাগ|angry|বিরক্ত|হতাশ|frustrated|disappointed|খারাপ|bad|worst|বাজে|ভয়ঙ্কর|terrible/i.test(msg)) return "negative";
  return "neutral";
}

// ──────────────────────────────────────────
// PRICE RANGE EXTRACTION
// ──────────────────────────────────────────
export function extractPriceRange(msg: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};
  const rangeMatch = msg.match(/[৳]?\s*(\d+)\s*(?:[-–থেকে\s]+|to\s+)[৳]?\s*(\d+)/i);
  if (rangeMatch) { result.min = parseInt(rangeMatch[1]); result.max = parseInt(rangeMatch[2]); return result; }
  const underMatch = msg.match(/(?:under|নিচে|কম|less than|এর কম|মধ্যে)\s*[৳]?\s*(\d+)/i) || msg.match(/[৳]?\s*(\d+)\s*(?:এর নিচে|এর কম|র নিচে|র কম|পর্যন্ত)/i);
  if (underMatch) { result.max = parseInt(underMatch[1]); return result; }
  const overMatch = msg.match(/(?:above|over|ওপরে|বেশি|more than|উপরে)\s*[৳]?\s*(\d+)/i) || msg.match(/[৳]?\s*(\d+)\s*(?:এর উপরে|এর বেশি|র উপরে|র বেশি)/i);
  if (overMatch) { result.min = parseInt(overMatch[1]); return result; }
  return result;
}

// ──────────────────────────────────────────
// PHONETIC NORMALIZATION
// ──────────────────────────────────────────
export function generatePhoneticVariations(word: string): string[] {
  const variations = new Set<string>([word]);
  const lower = word.toLowerCase();
  if (lower.length < 3) return [word];
  const replacements: [RegExp, string][] = [
    [/o/gi, 'a'], [/a/gi, 'o'], [/ee/gi, 'i'], [/i(?!ng)/gi, 'ee'],
    [/oo/gi, 'u'], [/u/gi, 'oo'], [/sh/gi, 'ss'], [/ss/gi, 'sh'],
    [/ph/gi, 'f'], [/f/gi, 'ph'], [/v/gi, 'bh'], [/bh/gi, 'v'],
    [/th/gi, 't'], [/ch/gi, 'c'], [/z/gi, 'j'], [/j/gi, 'z'],
    [/ou/gi, 'u'], [/ow/gi, 'o'], [/ck/gi, 'k'], [/k/gi, 'ck'],
    [/w/gi, 'v'], [/y/gi, 'i'], [/aa/gi, 'a'], [/ii/gi, 'i'],
    [/tt/gi, 't'], [/dd/gi, 'd'], [/nn/gi, 'n'], [/mm/gi, 'm'],
    [/kh/gi, 'k'], [/gh/gi, 'g'], [/dh/gi, 'd'], [/ng/gi, 'n'],
  ];
  for (const [pattern, replacement] of replacements) {
    const variant = lower.replace(pattern, replacement);
    if (variant !== lower && variant.length >= 3) variations.add(variant);
  }
  if (/[aeiou]$/i.test(lower)) variations.add(lower.slice(0, -1));
  const deduped = lower.replace(/(.)\1+/g, '$1');
  if (deduped !== lower && deduped.length >= 3) variations.add(deduped);
  return Array.from(variations);
}

// ──────────────────────────────────────────
// KEYWORD EXTRACTION
// ──────────────────────────────────────────
const FILLER_WORDS = new Set([
  "boi","ta","ache","ki","kothay","den","chai","lagbe","dorkar","book","price","dam",
  "কি","আছে","কোথায়","দাম","কত","চাই","লাগবে","দরকার","দেন","একটা","একটি","টা","টি","বইটা","বইটি",
  "the","a","is","are","do","you","have","want","need","please",
  "ami","amr","amar","apnar","apni","tumi","tor","tomar","ekta",
  "kono","show","dekhao","dekhaw","bolun","bolen","bolo","bol",
  "আমি","আমার","আপনার","আপনি","তুমি","তোমার","কোনো","একটা","দেখান","দেখাও","বলুন","বলো","কিছু","সব","গুলো","ভালো",
  "good","nice","best","new","নতুন","সেরা","ভাল",
  "can","could","would","should","will","may","might",
  "give","get","tell","say","look","see","find","search",
  "খুঁজে","খুজে","পাওয়া","যায়","কিনতে","কিনব","কেনা",
  "product","products","প্রোডাক্ট","item","items",
]);

export function extractSearchKeywords(msg: string): string[] {
  const cleaned = msg.replace(/[।,?!;\-:()\"'।৳\d]/g, " ").trim();
  return cleaned.split(/\s+/).filter(w => w.length >= 2 && !FILLER_WORDS.has(w.toLowerCase()));
}

// ──────────────────────────────────────────
// CONVERSATION CONTEXT SUMMARIZER
// ──────────────────────────────────────────
export function summarizeConversation(messages: any[]): string {
  if (!messages || messages.length <= 2) return "";
  const topics: string[] = [];
  const mentioned: Set<string> = new Set();
  for (const m of messages) {
    if (m.role !== "user") continue;
    const c = m.content || "";
    if (/বই|book|প্রোডাক্ট/i.test(c)) mentioned.add("products");
    if (/অর্ডার|order/i.test(c)) mentioned.add("orders");
    if (/ডেলিভারি|delivery/i.test(c)) mentioned.add("delivery");
    if (/দাম|price|৳/i.test(c)) mentioned.add("pricing");
  }
  if (mentioned.size > 0) topics.push(`আলোচিত বিষয়: ${[...mentioned].join(", ")}`);
  return topics.length > 0 ? `\n📝 কথোপকথনের সারাংশ: ${topics.join(" | ")}` : "";
}
