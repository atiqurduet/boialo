import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, TrendingUp, ChevronRight, ShoppingCart, Star, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TopSellingUniversalProductsProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

const RANK_COLORS = [
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-slate-400",
  "from-orange-500 to-amber-600",
];

export const TopSellingUniversalProducts = ({ limit = 10, title = "টপ বিক্রিত সাধারণ প্রোডাক্ট", subtitle }: TopSellingUniversalProductsProps) => {
  const { addToCart } = useCart();

  const { data: topProducts = [], isLoading } = useQuery({
    queryKey: ['top-selling-universal-products', limit],
    queryFn: async () => {
      // Get universal products - use featured as proxy for popularity
      // Since universal products might be referenced differently in order_items
      const { data: products } = await supabase
        .from('universal_products')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      return (products || []).map((p, i) => ({ ...p, rank: i + 1 }));
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

  const getProductLink = (product: any) => {
    return `/${product.product_type}/${product.slug}`;
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
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border-0">
            <Zap className="w-3 h-3" />
            জনপ্রিয়
          </Badge>
        </div>
        <Link to="/shop" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {topProducts.map((product: any) => {
          const hasDiscount = product.discount_percent && product.discount_percent > 0;

          return (
            <div
              key={product.id}
              className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Rank Badge */}
              {product.rank <= 3 && (
                <div className={`absolute top-2 left-2 z-10 w-8 h-8 bg-gradient-to-br ${RANK_COLORS[product.rank - 1]} rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                  {product.rank}
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

              {/* Product Type Badge */}
              <div className="absolute bottom-[calc(100%-2.5rem)] right-2 z-10">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {product.product_type}
                </Badge>
              </div>

              {/* Image */}
              <Link to={getProductLink(product)}>
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={getProductImage(product)}
                    alt={product.name_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <Link to={getProductLink(product)}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {product.name_bn}
                  </h3>
                </Link>

                {product.brand && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{product.brand}</p>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">৳{product.price}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
                  )}
                </div>

                {product.is_featured && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span>ফিচার্ড</span>
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
