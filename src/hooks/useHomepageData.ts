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
  sections: HomepageSection[];
  loading: boolean;
  error: string | null;
}

export const useHomepageData = (): HomepageData => {
  const [data, setData] = useState<HomepageData>({
    banners: [],
    categories: [],
    products: [],
    sections: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [bannersRes, categoriesRes, productsRes, sectionsRes] = await Promise.all([
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
            .limit(50),
          supabase
            .from('homepage_sections')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

        if (bannersRes.error) throw bannersRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (productsRes.error) throw productsRes.error;
        if (sectionsRes.error) throw sectionsRes.error;

        setData({
          banners: bannersRes.data || [],
          categories: categoriesRes.data || [],
          products: productsRes.data || [],
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

  return data;
};
