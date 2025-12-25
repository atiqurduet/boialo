import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sampleProducts } from "@/data/products";
import { toast } from "sonner";

export interface WishlistItem {
  id: string;
  productId: string;
  product: typeof sampleProducts[0];
}

export const useWishlist = () => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch wishlist items from database
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const items = data.map((item) => {
        const product = sampleProducts.find((p) => p.id === item.product_id);
        return {
          id: item.id,
          productId: item.product_id,
          product: product!,
        };
      }).filter((item) => item.product);

      setWishlistItems(items);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to add items to wishlist");
      return;
    }

    const exists = wishlistItems.some((item) => item.productId === productId);
    if (exists) {
      toast.info("Already in wishlist");
      return;
    }

    try {
      await supabase.from("wishlist_items").insert({
        user_id: user.id,
        product_id: productId,
      });

      await fetchWishlist();
      toast.success("Added to wishlist");
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      await supabase.from("wishlist_items").delete().eq("id", itemId);
      await fetchWishlist();
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const clearWishlist = async () => {
    if (!user) return;

    try {
      await supabase.from("wishlist_items").delete().eq("user_id", user.id);
      setWishlistItems([]);
    } catch (error) {
      console.error("Error clearing wishlist:", error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some((item) => item.productId === productId);
  };

  const toggleWishlist = async (productId: string) => {
    const item = wishlistItems.find((i) => i.productId === productId);
    if (item) {
      await removeFromWishlist(item.id);
    } else {
      await addToWishlist(productId);
    }
  };

  return {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    toggleWishlist,
    wishlistCount: wishlistItems.length,
    refetch: fetchWishlist,
  };
};
