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
  source?: 'book' | 'universal' | 'digital';
  product_type?: string;
  is_free?: boolean;
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
  autocomplete: string[];
  totalProducts: number;
}

export const useSearch = () => {
  const [results, setResults] = useState<SearchResults>({
    products: [],
    categories: [],
    suggestions: [],
    autocomplete: [],
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, limit = 10) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < 1) {
      setResults({ products: [], categories: [], suggestions: [], autocomplete: [], totalProducts: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        const { data, error: fnError } = await supabase.functions.invoke('search', {
          body: { query, limit, includeCategories: true },
        });

        if (fnError) throw fnError;

        trackSearch({ search_term: query });

        setResults(data || { products: [], categories: [], suggestions: [], autocomplete: [], totalProducts: 0 });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
          setError(err.message);
          await fallbackSearch(query, limit);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
  }, []);

  const fallbackSearch = async (query: string, limit: number) => {
    try {
      const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      
      const [productsRes, universalRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, title_bn, title_en, slug, price, original_price, discount_percent, author, publisher, images')
          .eq('is_active', true)
          .or(`title_bn.ilike.%${sanitizedQuery}%,title_en.ilike.%${sanitizedQuery}%,author.ilike.%${sanitizedQuery}%,publisher.ilike.%${sanitizedQuery}%`)
          .limit(limit),
        supabase
          .from('universal_products')
          .select('id, name_bn, name_en, slug, price, original_price, discount_percent, brand, images, product_type')
          .eq('is_active', true)
          .or(`name_bn.ilike.%${sanitizedQuery}%,name_en.ilike.%${sanitizedQuery}%,brand.ilike.%${sanitizedQuery}%`)
          .limit(limit),
        supabase
          .from('categories')
          .select('id, name_bn, name_en, slug, image_url')
          .eq('is_active', true)
          .or(`name_bn.ilike.%${sanitizedQuery}%,name_en.ilike.%${sanitizedQuery}%`)
          .limit(5),
      ]);

      const normalizedUniversal = (universalRes.data || []).map((p: any) => ({
        id: p.id,
        title_bn: p.name_bn,
        title_en: p.name_en,
        slug: p.slug,
        price: p.price,
        original_price: p.original_price,
        discount_percent: p.discount_percent,
        author: p.brand,
        publisher: p.product_type,
        images: p.images,
        source: 'universal' as const,
        product_type: p.product_type,
      }));

      const bookProducts = (productsRes.data || []).map(p => ({ ...p, source: 'book' as const }));
      const allProducts = [...bookProducts, ...normalizedUniversal].slice(0, limit);

      setResults({
        products: allProducts,
        categories: categoriesRes.data || [],
        suggestions: [],
        autocomplete: [],
        totalProducts: allProducts.length,
      });
    } catch (err) {
      console.error('Fallback search error:', err);
    }
  };

  const clearResults = useCallback(() => {
    setResults({ products: [], categories: [], suggestions: [], autocomplete: [], totalProducts: 0 });
    setError(null);
  }, []);

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
