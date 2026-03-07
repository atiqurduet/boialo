import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function normalizeBangla(text: string): string {
  return text.replace(/[।,!?]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Bangla-to-English phonetic transliteration map
const phoneticMap: Record<string, string[]> = {
  // Common brand misspellings and phonetic variants
  'sassung': ['samsung'], 'samsung': ['স্যামসাং', 'samsung'],
  'nokea': ['nokia'], 'nokia': ['নোকিয়া', 'nokia'],
  'appel': ['apple'], 'apple': ['অ্যাপল', 'apple'],
  'xaomi': ['xiaomi'], 'shaomi': ['xiaomi'], 'xiaomi': ['শাওমি', 'xiaomi'],
  'adedas': ['adidas'], 'adidas': ['অ্যাডিডাস', 'adidas'],
  'niki': ['nike'], 'nike': ['নাইকি', 'nike'],
  'sony': ['সনি', 'sony'], 'soni': ['sony'],
  'hp': ['এইচপি', 'hp'], 'dell': ['ডেল', 'dell'],
  'lenovo': ['লেনোভো', 'lenovo'], 'lenoba': ['lenovo'],
  'huawei': ['হুয়াওয়ে', 'huawei'], 'huaoy': ['huawei'],
  // Bangla phonetic → English
  'স্যামসাং': ['samsung'], 'নোকিয়া': ['nokia'], 'অ্যাপল': ['apple'],
  'শাওমি': ['xiaomi'], 'সনি': ['sony'], 'নাইকি': ['nike'],
};

// Bangla phonetic typing patterns (Banglish → English)
const banglishPatterns: [RegExp, string][] = [
  [/sh/g, 's'], [/ch/g, 'c'], [/ph/g, 'f'],
  [/th/g, 't'], [/dh/g, 'd'], [/kh/g, 'k'],
  [/gh/g, 'g'], [/ng/g, 'n'], [/aa/g, 'a'],
  [/ee/g, 'i'], [/oo/g, 'u'], [/ou/g, 'o'],
];

function normalizePhonetic(query: string): string[] {
  const q = query.toLowerCase().trim();
  const variants = new Set<string>([q]);
  
  // Check direct phonetic map
  if (phoneticMap[q]) {
    phoneticMap[q].forEach(v => variants.add(v.toLowerCase()));
  }
  
  // Apply banglish → simplified patterns
  let simplified = q;
  for (const [pattern, replacement] of banglishPatterns) {
    simplified = simplified.replace(pattern, replacement);
  }
  if (simplified !== q) variants.add(simplified);
  
  // Check phonetic map for simplified version
  if (phoneticMap[simplified]) {
    phoneticMap[simplified].forEach(v => variants.add(v.toLowerCase()));
  }
  
  // Also check partial matches in phonetic map keys
  for (const [key, values] of Object.entries(phoneticMap)) {
    const keySim = similarity(q, key);
    if (keySim >= 0.7) {
      values.forEach(v => variants.add(v.toLowerCase()));
    }
  }
  
  return Array.from(variants);
}

function fuzzyMatch(query: string, text: string, threshold = 0.45): { matches: boolean; score: number } {
  const nq = normalizeBangla(query);
  const nt = normalizeBangla(text);

  // Exact substring match - highest score
  if (nt.includes(nq)) return { matches: true, score: 1 };

  // Prefix match on any word
  const textWords = nt.split(' ').filter(w => w.length > 0);
  for (const tw of textWords) {
    if (tw.startsWith(nq)) return { matches: true, score: 0.95 };
  }

  // Word-level fuzzy matching
  const queryWords = nq.split(' ').filter(w => w.length > 0);
  let totalScore = 0;
  let matchedWords = 0;

  for (const qWord of queryWords) {
    let bestMatch = 0;
    for (const tWord of textWords) {
      if (tWord.startsWith(qWord) || qWord.startsWith(tWord)) {
        const prefixScore = Math.min(qWord.length, tWord.length) / Math.max(qWord.length, tWord.length);
        bestMatch = Math.max(bestMatch, 0.7 + prefixScore * 0.3);
      }
      const score = similarity(qWord, tWord);
      if (score > bestMatch) bestMatch = score;
    }
    if (bestMatch >= threshold) {
      matchedWords++;
      totalScore += bestMatch;
    }
  }

  const overallScore = queryWords.length > 0 ? totalScore / queryWords.length : 0;
  return { matches: matchedWords > 0 && overallScore >= threshold, score: overallScore };
}

// Multi-variant fuzzy match: tries all phonetic variants
function multiVariantMatch(query: string, text: string, threshold = 0.45): { matches: boolean; score: number } {
  const variants = normalizePhonetic(query);
  let bestResult = { matches: false, score: 0 };
  
  for (const variant of variants) {
    const result = fuzzyMatch(variant, text, threshold);
    if (result.score > bestResult.score) {
      bestResult = result;
    }
  }
  return bestResult;
}

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= 30;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 200) : '';
    const limit = typeof body.limit === 'number' && body.limit >= 1 && body.limit <= 100 ? Math.floor(body.limit) : 10;
    const includeCategories = body.includeCategories !== false;

    if (!query || query.length < 1) {
      return new Response(JSON.stringify({ products: [], categories: [], suggestions: [], totalProducts: 0, autocomplete: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products and universal products in parallel
    const [productsRes, universalRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images, is_active")
        .eq("is_active", true)
        .limit(200),
      supabase
        .from("universal_products")
        .select("id, name_bn, name_en, slug, price, original_price, discount_percent, brand, images, is_active, product_type")
        .eq("is_active", true)
        .limit(200),
    ]);

    if (productsRes.error) throw productsRes.error;

    // Search books with multi-variant matching
    const bookResults = (productsRes.data || [])
      .map(product => {
        const titleBnMatch = multiVariantMatch(query, product.title_bn || "");
        const titleEnMatch = multiVariantMatch(query, product.title_en || "");
        const authorMatch = multiVariantMatch(query, product.author || "");
        const publisherMatch = multiVariantMatch(query, product.publisher || "");

        const bestScore = Math.max(
          titleBnMatch.score * 1.3,
          titleEnMatch.score * 1.2,
          authorMatch.score * 1.1,
          publisherMatch.score
        );

        const matches = titleBnMatch.matches || titleEnMatch.matches || authorMatch.matches || publisherMatch.matches;
        return { ...product, score: bestScore, matches, source: 'book' as const };
      })
      .filter(p => p.matches);

    // Search universal products with multi-variant matching
    const universalResults = (universalRes.data || [])
      .map(product => {
        const nameBnMatch = multiVariantMatch(query, product.name_bn || "");
        const nameEnMatch = multiVariantMatch(query, product.name_en || "");
        const brandMatch = multiVariantMatch(query, product.brand || "");

        const bestScore = Math.max(
          nameBnMatch.score * 1.3,
          nameEnMatch.score * 1.2,
          brandMatch.score * 1.1
        );

        const matches = nameBnMatch.matches || nameEnMatch.matches || brandMatch.matches;
        
        // Normalize to common product shape
        return {
          id: product.id,
          title_bn: product.name_bn,
          title_en: product.name_en,
          slug: product.slug,
          price: product.price,
          original_price: product.original_price,
          discount_percent: product.discount_percent,
          author: product.brand_name,
          publisher: product.product_type,
          images: product.images,
          score: bestScore,
          matches,
          source: 'universal' as const,
          product_type: product.product_type,
        };
      })
      .filter(p => p.matches);

    // Merge and sort all results
    const allResults = [...bookResults, ...universalResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Categories
    let categories: any[] = [];
    if (includeCategories) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name_bn, name_en, slug, image_url")
        .eq("is_active", true);

      if (cats) {
        categories = cats
          .map(cat => {
            const nameBnMatch = multiVariantMatch(query, cat.name_bn || "");
            const nameEnMatch = multiVariantMatch(query, cat.name_en || "");
            return { ...cat, score: Math.max(nameBnMatch.score, nameEnMatch.score), matches: nameBnMatch.matches || nameEnMatch.matches };
          })
          .filter(c => c.matches)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    // Generate autocomplete suggestions from top results
    const autocomplete: string[] = [];
    if (allResults.length > 0) {
      const titles = allResults.slice(0, 3).map(p => p.title_bn).filter(Boolean);
      autocomplete.push(...titles);
    }

    // Suggestions (authors + publishers + brands)
    const suggestions: string[] = [];
    if (allResults.length > 0) {
      const authors = [...new Set(allResults.map(p => p.author).filter(Boolean))].slice(0, 3);
      const publishers = [...new Set(allResults.filter(p => p.source === 'book').map(p => p.publisher).filter(Boolean))].slice(0, 2);
      suggestions.push(...authors as string[], ...publishers as string[]);
    }

    return new Response(JSON.stringify({
      products: allResults.map(({ score, matches, source, ...p }) => ({ ...p, source })),
      categories: categories.map(({ score, matches, ...c }) => c),
      suggestions,
      autocomplete,
      totalProducts: allResults.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
