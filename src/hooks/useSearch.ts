import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackSearch } from '@/lib/analytics';

interface Product {
  id: string;
  title_bn: string;
  title_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  author: string | null;
  publisher: string | null;
  images: any;
}

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
}

interface SearchResults {
  products: Product[];
  categories: Category[];
  suggestions: string[];
  totalProducts: number;
}

export const useSearch = () => {
  const [results, setResults] = useState<SearchResults>({
    products: [],
    categories: [],
    suggestions: [],
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, limit = 10) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < 1) {
      setResults({ products: [], categories: [], suggestions: [], totalProducts: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        const { data, error: fnError } = await supabase.functions.invoke('search', {
          body: { query, limit, includeCategories: true },
        });

        if (fnError) throw fnError;

        // Track search event
        trackSearch({ search_term: query });

        setResults(data || { products: [], categories: [], suggestions: [], totalProducts: 0 });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
          setError(err.message);
          
          // Fallback to local search if edge function fails
          await fallbackSearch(query, limit);
        }
      } finally {
        setLoading(false);
      }
    }, 150); // 150ms debounce for responsive feel
  }, []);

  // Fallback local search when edge function is unavailable
  const fallbackSearch = async (query: string, limit: number) => {
    try {
      const normalizedQuery = query.toLowerCase();
      
      const { data: products } = await supabase
        .from('products')
        .select('id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images')
        .eq('is_active', true)
        .or(`title_bn.ilike.%${query}%,title_en.ilike.%${query}%,author.ilike.%${query}%,publisher.ilike.%${query}%`)
        .limit(limit);

      const { data: categories } = await supabase
        .from('categories')
        .select('id, name_bn, name_en, slug, image_url')
        .eq('is_active', true)
        .or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%`)
        .limit(5);

      setResults({
        products: products || [],
        categories: categories || [],
        suggestions: [],
        totalProducts: products?.length || 0,
      });
    } catch (err) {
      console.error('Fallback search error:', err);
    }
  };

  const clearResults = useCallback(() => {
    setResults({ products: [], categories: [], suggestions: [], totalProducts: 0 });
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
};
