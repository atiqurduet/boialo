import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GUEST_CART_KEY = 'guest_cart';

interface GuestCartItem {
  productId: string;
  quantity: number;
}

interface ProductData {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category?: string;
  publisher?: string;
  isPreorder?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: ProductData;
}

// Helper functions for localStorage
const getGuestCart = (): GuestCartItem[] => {
  try {
    const cart = localStorage.getItem(GUEST_CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
};

const setGuestCart = (items: GuestCartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

// Fetch product from database
const fetchProduct = async (productId: string): Promise<ProductData | null> => {
  const { data } = await supabase
    .from('products')
    .select(`
      *,
      writer:writers(name_bn),
      publisher_rel:publishers(name_bn)
    `)
    .eq('id', productId)
    .maybeSingle();
  
  if (!data) return null;
  
  const images = data.images as string[] || [];
  return {
    id: data.id,
    slug: data.slug,
    title: data.title_bn || data.title_en,
    author: data.writer?.name_bn || data.author || 'অজানা লেখক',
    price: data.price,
    originalPrice: data.original_price || undefined,
    discount: data.discount_percent || undefined,
    image: images.length > 0 ? images[0] : '/placeholder.svg',
    category: data.category_id,
    publisher: data.publisher_rel?.name_bn || data.publisher,
    isPreorder: data.is_preorder,
  };
};

export const useCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Merge guest cart to user cart on login
  const mergeGuestCart = useCallback(async (userId: string) => {
    const guestCart = getGuestCart();
    if (guestCart.length === 0) return;

    try {
      for (const item of guestCart) {
        // Check if product already in user cart
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", userId)
          .eq("product_id", item.productId)
          .maybeSingle();

        if (existing) {
          // Update quantity
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          // Insert new item
          await supabase.from("cart_items").insert({
            user_id: userId,
            product_id: item.productId,
            quantity: item.quantity,
          });
        }
      }
      clearGuestCart();
    } catch (error) {
      console.error("Error merging guest cart:", error);
    }
  }, []);

  // Fetch cart items from database or localStorage
  const fetchCart = useCallback(async () => {
    if (!user) {
      // Guest user - load from localStorage
      const guestCart = getGuestCart();
      const items: CartItem[] = [];
      
      for (const item of guestCart) {
        const product = await fetchProduct(item.productId);
        if (product) {
          items.push({
            id: `guest-${item.productId}`,
            productId: item.productId,
            quantity: item.quantity,
            product,
          });
        }
      }

      setCartItems(items);
      setLoading(false);
      return;
    }

    try {
      // Merge guest cart first
      await mergeGuestCart(user.id);

      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const items: CartItem[] = [];
      for (const item of data) {
        const product = await fetchProduct(item.product_id);
        if (product) {
          items.push({
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            product,
          });
        }
      }

      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  }, [user, mergeGuestCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      // Guest cart - use localStorage
      const guestCart = getGuestCart();
      const existingIndex = guestCart.findIndex((item) => item.productId === productId);

      if (existingIndex >= 0) {
        guestCart[existingIndex].quantity += quantity;
      } else {
        guestCart.push({ productId, quantity });
      }

      setGuestCart(guestCart);
      await fetchCart();
      toast.success("কার্টে যোগ হয়েছে");
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
      toast.success("কার্টে যোগ হয়েছে");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("কার্টে যোগ করা যায়নি");
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

    if (!user) {
      // Guest cart
      const guestCart = getGuestCart();
      const index = guestCart.findIndex((i) => i.productId === item.productId);
      if (index >= 0) {
        guestCart[index].quantity = newQuantity;
        setGuestCart(guestCart);
        await fetchCart();
      }
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
      toast.error("পরিমাণ আপডেট করা যায়নি");
    }
  };

  const removeFromCart = async (itemId: string) => {
    const item = cartItems.find((i) => i.id === itemId);
    
    if (!user && item) {
      // Guest cart
      const guestCart = getGuestCart().filter((i) => i.productId !== item.productId);
      setGuestCart(guestCart);
      await fetchCart();
      toast.success("কার্ট থেকে সরানো হয়েছে");
      return;
    }

    try {
      await supabase.from("cart_items").delete().eq("id", itemId);
      await fetchCart();
      toast.success("কার্ট থেকে সরানো হয়েছে");
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("কার্ট থেকে সরানো যায়নি");
    }
  };

  const clearCart = async () => {
    if (!user) {
      clearGuestCart();
      setCartItems([]);
      return;
    }

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
