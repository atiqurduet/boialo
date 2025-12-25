import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sampleProducts } from "@/data/products";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: typeof sampleProducts[0];
}

export const useCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch cart items from database
  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const items = data.map((item) => {
        const product = sampleProducts.find((p) => p.id === item.product_id);
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          product: product!,
        };
      }).filter((item) => item.product);

      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    try {
      const existingItem = cartItems.find((item) => item.productId === productId);

      if (existingItem) {
        await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + quantity })
          .eq("id", existingItem.id);
      } else {
        await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        });
      }

      await fetchCart();
      toast.success("Added to cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;

    if (newQuantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    try {
      await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);

      await fetchCart();
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await supabase.from("cart_items").delete().eq("id", itemId);
      await fetchCart();
      toast.success("Removed from cart");
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove from cart");
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      setCartItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    subtotal,
    refetch: fetchCart,
  };
};
