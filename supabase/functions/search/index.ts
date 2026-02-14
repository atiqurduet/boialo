import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fuzzy matching function using Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

// Calculate similarity score (0-1)
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

// Normalize Bangla text for better matching
function normalizeBangla(text: string): string {
  return text
    .replace(/[।,!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Check if query matches text with fuzzy tolerance
function fuzzyMatch(query: string, text: string, threshold = 0.6): { matches: boolean; score: number } {
  const normalizedQuery = normalizeBangla(query);
  const normalizedText = normalizeBangla(text);
  
  // Exact substring match
  if (normalizedText.includes(normalizedQuery)) {
    return { matches: true, score: 1 };
  }
  
  // Word-level fuzzy matching
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
  const textWords = normalizedText.split(' ').filter(w => w.length > 0);
  
  let totalScore = 0;
  let matchedWords = 0;
  
  for (const qWord of queryWords) {
    let bestMatch = 0;
    for (const tWord of textWords) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Input validation
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 200) : '';
    const limit = typeof body.limit === 'number' && body.limit >= 1 && body.limit <= 100 ? Math.floor(body.limit) : 10;
    const includeCategories = typeof body.includeCategories === 'boolean' ? body.includeCategories : true;
    
    if (!query || query.length < 1) {
      return new Response(JSON.stringify({ products: [], categories: [], suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Search query:", query.substring(0, 50));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images, is_active")
      .eq("is_active", true)
      .limit(100);

    if (productsError) {
      console.error("Products error:", productsError);
      throw productsError;
    }

    // Fuzzy search on products
    const searchResults = (products || [])
      .map(product => {
        const titleBnMatch = fuzzyMatch(query, product.title_bn || "");
        const titleEnMatch = fuzzyMatch(query, product.title_en || "");
        const authorMatch = fuzzyMatch(query, product.author || "");
        const publisherMatch = fuzzyMatch(query, product.publisher || "");
        
        const bestScore = Math.max(
          titleBnMatch.score * 1.2, // Boost title matches
          titleEnMatch.score * 1.2,
          authorMatch.score,
          publisherMatch.score
        );
        
        const matches = titleBnMatch.matches || titleEnMatch.matches || authorMatch.matches || publisherMatch.matches;
        
        return { ...product, score: bestScore, matches };
      })
      .filter(p => p.matches)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch categories if requested
    let categories: any[] = [];
    if (includeCategories) {
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("id, name_bn, name_en, slug, image_url")
        .eq("is_active", true);

      if (!catsError && cats) {
        categories = cats
          .map(cat => {
            const nameBnMatch = fuzzyMatch(query, cat.name_bn || "");
            const nameEnMatch = fuzzyMatch(query, cat.name_en || "");
            const bestScore = Math.max(nameBnMatch.score, nameEnMatch.score);
            const matches = nameBnMatch.matches || nameEnMatch.matches;
            return { ...cat, score: bestScore, matches };
          })
          .filter(c => c.matches)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    // Generate search suggestions based on results
    const suggestions: string[] = [];
    if (searchResults.length > 0) {
      const authors = [...new Set(searchResults.map(p => p.author).filter(Boolean))].slice(0, 3);
      const publishers = [...new Set(searchResults.map(p => p.publisher).filter(Boolean))].slice(0, 2);
      suggestions.push(...authors as string[], ...publishers as string[]);
    }

    console.log(`Found ${searchResults.length} products, ${categories.length} categories`);

    return new Response(JSON.stringify({
      products: searchResults.map(({ score, matches, ...p }) => p),
      categories: categories.map(({ score, matches, ...c }) => c),
      suggestions,
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
