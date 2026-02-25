import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, TrendingUp, Star, ChevronRight, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TopSellingProductsProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

const RANK_STYLES = [
  { bg: "bg-gradient-to-br from-yellow-400 to-amber-500", text: "text-white", label: "🥇", shadow: "shadow-amber-300/50" },
  { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-white", label: "🥈", shadow: "shadow-slate-300/50" },
  { bg: "bg-gradient-to-br from-amber-600 to-amber-700", text: "text-white", label: "🥉", shadow: "shadow-amber-600/50" },
];

export const TopSellingProducts = ({ limit = 10, title = "টপ বিক্রিত বই", subtitle }: TopSellingProductsProps) => {
  const { addToCart } = useCart();

  const { data: topProducts = [], isLoading } = useQuery({
    queryKey: ['top-selling-products', limit],
    queryFn: async () => {
      // Get top sold product IDs from order_items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id');

      const counts: Record<string, number> = {};
      (orderItems || []).forEach(item => {
        counts[item.product_id] = (counts[item.product_id] || 0) + 1;
      });

      const sortedIds = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      if (sortedIds.length === 0) {
        // Fallback to featured products
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(limit);
        return (data || []).map((p, i) => ({ ...p, sold_count: 0, rank: i + 1 }));
      }

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('id', sortedIds);

      // Sort by sold count and add rank
      return (products || [])
        .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
        .map((p, i) => ({ ...p, sold_count: counts[p.id] || 0, rank: i + 1 }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const getProductImage = (product: any) => {
    if (product.images) {
      if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
      if (typeof product.images === 'object' && product.images.main) return product.images.main;
    }
    return '/placeholder.svg';
  };

  if (isLoading) {
    return (
      <div className="my-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[300px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (topProducts.length === 0) return null;

  return (
    <section className="my-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/20">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 border-0">
            <TrendingUp className="w-3 h-3" />
            ট্রেন্ডিং
          </Badge>
        </div>
        <Link to="/shop?sort=bestseller" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {topProducts.map((product: any) => {
          const rankStyle = RANK_STYLES[product.rank - 1];
          const hasDiscount = product.discount_percent && product.discount_percent > 0;

          return (
            <div
              key={product.id}
              className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Rank Badge */}
              {product.rank <= 3 && rankStyle && (
                <div className={`absolute top-2 left-2 z-10 w-8 h-8 ${rankStyle.bg} rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${rankStyle.shadow}`}>
                  {rankStyle.label}
                </div>
              )}
              {product.rank > 3 && (
                <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                  #{product.rank}
                </div>
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{product.discount_percent}%
                </div>
              )}

              {/* Image */}
              <Link to={`/product/${product.slug}`}>
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={getProductImage(product)}
                    alt={product.title_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {product.title_bn}
                  </h3>
                </Link>

                {product.author && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{product.author}</p>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">৳{product.price}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
                  )}
                </div>

                {product.sold_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{product.sold_count} বার বিক্রি</span>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-1 h-8 text-xs"
                  onClick={() => addToCart(product.id, 1)}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  কার্টে যোগ করুন
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
