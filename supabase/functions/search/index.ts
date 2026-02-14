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

function fuzzyMatch(query: string, text: string, threshold = 0.5): { matches: boolean; score: number } {
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
      // Prefix match on words
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

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images, is_active")
      .eq("is_active", true)
      .limit(200);

    if (productsError) throw productsError;

    // Fuzzy search with improved scoring
    const searchResults = (products || [])
      .map(product => {
        const titleBnMatch = fuzzyMatch(query, product.title_bn || "");
        const titleEnMatch = fuzzyMatch(query, product.title_en || "");
        const authorMatch = fuzzyMatch(query, product.author || "");
        const publisherMatch = fuzzyMatch(query, product.publisher || "");

        const bestScore = Math.max(
          titleBnMatch.score * 1.3,
          titleEnMatch.score * 1.2,
          authorMatch.score * 1.1,
          publisherMatch.score
        );

        const matches = titleBnMatch.matches || titleEnMatch.matches || authorMatch.matches || publisherMatch.matches;
        return { ...product, score: bestScore, matches };
      })
      .filter(p => p.matches)
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
            const nameBnMatch = fuzzyMatch(query, cat.name_bn || "");
            const nameEnMatch = fuzzyMatch(query, cat.name_en || "");
            return { ...cat, score: Math.max(nameBnMatch.score, nameEnMatch.score), matches: nameBnMatch.matches || nameEnMatch.matches };
          })
          .filter(c => c.matches)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    // Generate autocomplete suggestions from top results
    const autocomplete: string[] = [];
    if (searchResults.length > 0) {
      // Add top matching titles
      const titles = searchResults.slice(0, 3).map(p => p.title_bn).filter(Boolean);
      autocomplete.push(...titles);
    }

    // Suggestions (authors + publishers)
    const suggestions: string[] = [];
    if (searchResults.length > 0) {
      const authors = [...new Set(searchResults.map(p => p.author).filter(Boolean))].slice(0, 3);
      const publishers = [...new Set(searchResults.map(p => p.publisher).filter(Boolean))].slice(0, 2);
      suggestions.push(...authors as string[], ...publishers as string[]);
    }

    return new Response(JSON.stringify({
      products: searchResults.map(({ score, matches, ...p }) => p),
      categories: categories.map(({ score, matches, ...c }) => c),
      suggestions,
      autocomplete,
      totalProducts: searchResults.length,
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
