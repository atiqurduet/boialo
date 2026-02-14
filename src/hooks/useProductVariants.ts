import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  variant_type: string;
  sku: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  sort_order: number;
}

export const useProductVariants = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return (data || []).map((v: any) => ({
        ...v,
        images: Array.isArray(v.images) ? v.images : [],
      })) as ProductVariant[];
    },
    enabled: !!productId,
  });
};
