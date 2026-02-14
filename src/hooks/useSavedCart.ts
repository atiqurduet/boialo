import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SavedCartItem {
  id: string;
  productId: string;
  product: {
    id: string;
    slug: string;
    title: string;
    author: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    image: string;
  };
}

export const useSavedCart = () => {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedCartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedItems = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_cart_items")
        .select("id, product_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const items: SavedCartItem[] = [];
      for (const item of data || []) {
        const { data: product } = await supabase
          .from("products")
          .select("id, slug, title_bn, title_en, price, original_price, discount_percent, images, author, writer:writers(name_bn)")
          .eq("id", item.product_id)
          .maybeSingle();

        if (product) {
          const images = product.images as string[] || [];
          items.push({
            id: item.id,
            productId: item.product_id,
            product: {
              id: product.id,
              slug: product.slug,
              title: product.title_bn || product.title_en,
              author: product.writer?.name_bn || product.author || 'অজানা লেখক',
              price: product.price,
              originalPrice: product.original_price || undefined,
              discount: product.discount_percent || undefined,
              image: images.length > 0 ? images[0] : '/placeholder.svg',
            },
          });
        }
      }
      setSavedItems(items);
    } catch (error) {
      console.error("Error fetching saved items:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const saveForLater = async (productId: string) => {
    if (!user) {
      toast.error("সেভ করতে লগইন করুন");
      return;
    }
    try {
      const { data: existing } = await supabase
        .from("saved_cart_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        toast.info("ইতিমধ্যে সেভ করা আছে");
        return;
      }

      const { error } = await supabase.from("saved_cart_items").insert({
        user_id: user.id,
        product_id: productId,
      });
      if (error) throw error;
      toast.success("পরে কেনার জন্য সেভ হয়েছে");
      await fetchSavedItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("সেভ করা যায়নি");
    }
  };

  const removeSavedItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("saved_cart_items").delete().eq("id", itemId);
      if (error) throw error;
      await fetchSavedItems();
      toast.success("সেভ লিস্ট থেকে সরানো হয়েছে");
    } catch (error) {
      console.error("Error removing saved item:", error);
    }
  };

  return {
    savedItems,
    loading,
    saveForLater,
    removeSavedItem,
    refetch: fetchSavedItems,
    savedCount: savedItems.length,
  };
};
