import { useState, useEffect, useCallback } from "react";

const RECENTLY_VIEWED_KEY = "recently_viewed_products";
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  viewedAt: number;
}

export const useRecentlyViewed = () => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const addItem = useCallback((product: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== product.id);
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
    setItems([]);
  }, []);

  return { items, addItem, clearAll };
};
