import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DynamicProductGrid } from "./DynamicProductGrid";

interface AIRecommendationsProps {
  limit?: number;
  columns?: number;
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}

export const AIRecommendations = ({
  limit = 10,
  columns = 5,
  title = "আপনার জন্য সাজেশন",
  subtitle = "আপনার পছন্দ অনুযায়ী বাছাই করা",
  viewAllLink = "/shop",
}: AIRecommendationsProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [user, limit]);

  const fetchRecommendations = async () => {
    try {
      const recentlyViewed = JSON.parse(localStorage.getItem("recently_viewed_products") || "[]");
      const viewedIds = recentlyViewed.map((item: any) => item.id).slice(0, 5);

      let categoryIds: string[] = [];
      let writerIds: string[] = [];

      if (user) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (orders && orders.length > 0) {
          const orderIds = orders.map(o => o.id);
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("product_id")
            .in("order_id", orderIds);

          if (orderItems) {
            const purchasedIds = orderItems.map(i => i.product_id);
            const { data: purchasedProducts } = await supabase
              .from("products")
              .select("category_id, writer_id")
              .in("id", purchasedIds);

            if (purchasedProducts) {
              categoryIds = [...new Set(purchasedProducts.map(p => p.category_id).filter(Boolean))] as string[];
              writerIds = [...new Set(purchasedProducts.map(p => p.writer_id).filter(Boolean))] as string[];
            }
          }
        }
      }

      if (viewedIds.length > 0) {
        const { data: viewedProducts } = await supabase
          .from("products")
          .select("category_id, writer_id")
          .in("id", viewedIds);

        if (viewedProducts) {
          categoryIds = [...new Set([...categoryIds, ...viewedProducts.map(p => p.category_id).filter(Boolean)])] as string[];
          writerIds = [...new Set([...writerIds, ...viewedProducts.map(p => p.writer_id).filter(Boolean)])] as string[];
        }
      }

      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(limit);

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }

      const excludeIds = [...viewedIds];
      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setProducts(data.map(p => ({
          id: p.id,
          title: p.title_bn || p.title_en,
          slug: p.slug,
          price: p.price,
          original_price: p.original_price,
          discount_percent: p.discount_percent,
          image: (p.images as any)?.[0] || null,
          is_featured: p.is_featured,
          is_preorder: p.is_preorder,
          category: '',
        })));
      } else {
        const { data: featured } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("is_featured", true)
          .limit(limit);

        if (featured) {
          setProducts(featured.map(p => ({
            id: p.id,
            title: p.title_bn || p.title_en,
            slug: p.slug,
            price: p.price,
            original_price: p.original_price,
            discount_percent: p.discount_percent,
            image: (p.images as any)?.[0] || null,
            is_featured: p.is_featured,
            is_preorder: p.is_preorder,
            category: '',
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || products.length === 0) return null;

  return (
    <div className="my-8">
      <DynamicProductGrid
        products={products}
        title={title}
        subtitle={subtitle}
        viewAllLink={viewAllLink}
        columns={columns}
      />
    </div>
  );
};
