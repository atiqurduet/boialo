import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sampleProducts } from "@/data/products";
import { toast } from "sonner";

const GUEST_WISHLIST_KEY = 'guest_wishlist';

export interface WishlistItem {
  id: string;
  productId: string;
  product: typeof sampleProducts[0];
}

// Helper functions for localStorage
const getGuestWishlist = (): string[] => {
  try {
    const wishlist = localStorage.getItem(GUEST_WISHLIST_KEY);
    return wishlist ? JSON.parse(wishlist) : [];
  } catch {
    return [];
  }
};

const setGuestWishlist = (productIds: string[]) => {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(productIds));
};

const clearGuestWishlistStorage = () => {
  localStorage.removeItem(GUEST_WISHLIST_KEY);
};

export const useWishlist = () => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Merge guest wishlist to user wishlist on login
  const mergeGuestWishlist = useCallback(async (userId: string) => {
    const guestWishlist = getGuestWishlist();
    if (guestWishlist.length === 0) return;

    try {
      for (const productId of guestWishlist) {
        // Check if product already in user wishlist
        const { data: existing } = await supabase
          .from("wishlist_items")
          .select("id")
          .eq("user_id", userId)
          .eq("product_id", productId)
          .maybeSingle();

        if (!existing) {
          // Insert new item
          await supabase.from("wishlist_items").insert({
            user_id: userId,
            product_id: productId,
          });
        }
      }
      clearGuestWishlistStorage();
    } catch (error) {
      console.error("Error merging guest wishlist:", error);
    }
  }, []);

  // Fetch wishlist items from database or localStorage
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      // Guest user - load from localStorage
      const guestWishlist = getGuestWishlist();
      const items = guestWishlist
        .map((productId) => {
          const product = sampleProducts.find((p) => p.id === productId);
          return product ? {
            id: `guest-${productId}`,
            productId,
            product,
          } : null;
        })
        .filter((item): item is WishlistItem => item !== null);

      setWishlistItems(items);
      setLoading(false);
      return;
    }

    try {
      // Merge guest wishlist first
      await mergeGuestWishlist(user.id);

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
  }, [user, mergeGuestWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = async (productId: string) => {
    const exists = wishlistItems.some((item) => item.productId === productId);
    if (exists) {
      toast.info("ইতিমধ্যে উইশলিস্টে আছে");
      return;
    }

    if (!user) {
      // Guest wishlist - use localStorage
      const guestWishlist = getGuestWishlist();
      guestWishlist.push(productId);
      setGuestWishlist(guestWishlist);
      await fetchWishlist();
      toast.success("উইশলিস্টে যোগ হয়েছে");
      return;
    }

    try {
      await supabase.from("wishlist_items").insert({
        user_id: user.id,
        product_id: productId,
      });

      await fetchWishlist();
      toast.success("উইশলিস্টে যোগ হয়েছে");
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("উইশলিস্টে যোগ করা যায়নি");
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    const item = wishlistItems.find((i) => i.id === itemId);

    if (!user && item) {
      // Guest wishlist
      const guestWishlist = getGuestWishlist().filter((id) => id !== item.productId);
      setGuestWishlist(guestWishlist);
      await fetchWishlist();
      toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
      return;
    }

    try {
      await supabase.from("wishlist_items").delete().eq("id", itemId);
      await fetchWishlist();
      toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("উইশলিস্ট থেকে সরানো যায়নি");
    }
  };

  const clearWishlist = async () => {
    if (!user) {
      clearGuestWishlistStorage();
      setWishlistItems([]);
      return;
    }

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
