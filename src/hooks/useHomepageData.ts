import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string;
  image_desktop: string;
  image_mobile: string | null;
  link_url: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

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
  is_featured: boolean;
  is_preorder: boolean;
  category_id: string | null;
  writer_id: string | null;
}

interface Writer {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
}

interface HomepageSection {
  id: string;
  section_type: string;
  title_bn: string;
  title_en: string | null;
  subtitle_bn: string | null;
  sort_order: number;
  is_active: boolean;
  settings: any;
}

interface HomepageData {
  banners: Banner[];
  categories: Category[];
  products: Product[];
  writers: Writer[];
  sections: HomepageSection[];
  loading: boolean;
  error: string | null;
  getProductsByCategory: (categoryId: string) => Product[];
  getProductsByWriter: (writerId: string) => Product[];
  getProductsByIds: (ids: string[]) => Product[];
}

export const useHomepageData = (): HomepageData => {
  const [data, setData] = useState<Omit<HomepageData, 'getProductsByCategory' | 'getProductsByWriter' | 'getProductsByIds'>>({
    banners: [],
    categories: [],
    products: [],
    writers: [],
    sections: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [bannersRes, categoriesRes, productsRes, sectionsRes, writersRes] = await Promise.all([
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('homepage_sections')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('writers')
            .select('id, name_bn, name_en, slug')
            .eq('is_active', true)
            .order('name_bn'),
        ]);

        if (bannersRes.error) throw bannersRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (productsRes.error) throw productsRes.error;
        if (sectionsRes.error) throw sectionsRes.error;
        if (writersRes.error) throw writersRes.error;

        setData({
          banners: bannersRes.data || [],
          categories: categoriesRes.data || [],
          products: productsRes.data || [],
          writers: writersRes.data || [],
          sections: sectionsRes.data || [],
          loading: false,
          error: null,
        });
      } catch (err: any) {
        console.error('Error fetching homepage data:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    };

    fetchData();
  }, []);

  // Helper functions to filter products
  const getProductsByCategory = (categoryId: string): Product[] => {
    return data.products.filter(p => p.category_id === categoryId);
  };

  const getProductsByWriter = (writerId: string): Product[] => {
    return data.products.filter(p => p.writer_id === writerId);
  };

  const getProductsByIds = (ids: string[]): Product[] => {
    return data.products.filter(p => ids.includes(p.id));
  };

  return {
    ...data,
    getProductsByCategory,
    getProductsByWriter,
    getProductsByIds,
  };
};
