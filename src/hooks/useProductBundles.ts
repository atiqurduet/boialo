import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BundleItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title_bn: string;
    slug: string;
    price: number;
    images: any;
    author: string | null;
  };
}

export interface ProductBundle {
  id: string;
  name_bn: string;
  name_en: string | null;
  slug: string;
  description_bn: string | null;
  bundle_price: number;
  original_total: number;
  discount_percent: number;
  image_url: string | null;
  is_featured: boolean;
  items: BundleItem[];
}

export const useProductBundles = (featured = false) => {
  return useQuery({
    queryKey: ["product-bundles", featured],
    queryFn: async () => {
      let query = supabase
        .from("product_bundles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (featured) {
        query = query.eq("is_featured", true);
      }

      const { data: bundles, error } = await query;
      if (error) throw error;

      const result: ProductBundle[] = [];
      for (const bundle of bundles || []) {
        const { data: items } = await supabase
          .from("bundle_items")
          .select("id, product_id, quantity, sort_order")
          .eq("bundle_id", bundle.id)
          .order("sort_order");

        const bundleItems: BundleItem[] = [];
        for (const item of items || []) {
          const { data: product } = await supabase
            .from("products")
            .select("id, title_bn, slug, price, images, author")
            .eq("id", item.product_id)
            .maybeSingle();

          bundleItems.push({ ...item, product: product || undefined });
        }

        result.push({ ...bundle, items: bundleItems });
      }

      return result;
    },
  });
};

export const useBundleDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["bundle-detail", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data: bundle, error } = await supabase
        .from("product_bundles")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !bundle) return null;

      const { data: items } = await supabase
        .from("bundle_items")
        .select("id, product_id, quantity, sort_order")
        .eq("bundle_id", bundle.id)
        .order("sort_order");

      const bundleItems: BundleItem[] = [];
      for (const item of items || []) {
        const { data: product } = await supabase
          .from("products")
          .select("id, title_bn, slug, price, images, author")
          .eq("id", item.product_id)
          .maybeSingle();

        bundleItems.push({ ...item, product: product || undefined });
      }

      return { ...bundle, items: bundleItems } as ProductBundle;
    },
    enabled: !!slug,
  });
};
