import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Star, ChevronRight, ShoppingCart, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { useCartContext } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { subDays, format } from "date-fns";

interface WeeklyBestUniversalProductsProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  useCarousel?: boolean;
  columns?: number;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export const WeeklyBestUniversalProducts = ({ limit = 10, title = "সাপ্তাহিক সেরা প্রোডাক্ট", subtitle, useCarousel = true, columns = 5 }: WeeklyBestUniversalProductsProps) => {
  const { addToCart } = useCartContext();
  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const { data: weeklyBest = [], isLoading } = useQuery({
    queryKey: ['weekly-best-universal', limit, weekStart],
    queryFn: async () => {
      // Get all universal product IDs first
      const { data: uniProds } = await supabase
        .from('universal_products')
        .select('id')
        .eq('is_active', true);
      const uniIds = new Set((uniProds || []).map(p => p.id));

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, created_at')
        .gte('created_at', weekStart);

      const counts: Record<string, number> = {};
      (orderItems || []).filter(item => uniIds.has(item.product_id)).forEach(item => { counts[item.product_id] = (counts[item.product_id] || 0) + 1; });

      const sortedIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, limit).map(([id]) => id);

      if (sortedIds.length === 0) {
        const { data } = await supabase.from('universal_products').select('*').eq('is_active', true).eq('is_featured', true).order('created_at', { ascending: false }).limit(limit);
        return (data || []).map((p, i) => ({ ...p, weekly_sold: 0, rank: i + 1 }));
      }

      const { data: products } = await supabase.from('universal_products').select('*').eq('is_active', true).in('id', sortedIds);
      return (products || []).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).map((p, i) => ({ ...p, weekly_sold: counts[p.id] || 0, rank: i + 1 }));
    },
    staleTime: 10 * 60 * 1000,
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

  if (weeklyBest.length === 0) return null;

  const renderCard = (product: any) => (
    <div key={product.id} className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {product.rank <= 3 && (
        <div className="absolute top-2 left-2 z-10 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-sm shadow-lg">
          {RANK_MEDALS[product.rank - 1]}
        </div>
      )}
      {product.rank > 3 && (
        <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">#{product.rank}</div>
      )}
      {product.discount_percent > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">-{product.discount_percent}%</div>
      )}
      <Link to={`/product/universal/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-muted">
          <img src={getProductImage(product)} alt={product.name_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      </Link>
      <div className="p-3 space-y-1.5">
        <Link to={`/product/universal/${product.slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">{product.name_bn}</h3>
        </Link>
        {product.brand && <p className="text-xs text-muted-foreground line-clamp-1">{product.brand}</p>}
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">৳{product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
          )}
        </div>
        {product.weekly_sold > 0 && (
          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
            <Star className="w-3 h-3 fill-current" /> এই সপ্তাহে {product.weekly_sold} বার বিক্রি
          </div>
        )}
        <button onClick={() => { addToCart(product.id); toast.success("কার্টে যোগ হয়েছে"); }} className="w-full mt-1 h-8 text-xs border rounded-md flex items-center justify-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors">
          <ShoppingCart className="w-3 h-3" /> অর্ডার করুন
        </button>
      </div>
    </div>
  );

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border-0">
            <Calendar className="w-3 h-3" /> এই সপ্তাহ
          </Badge>
        </div>
        <Link to="/shop" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>{weeklyBest.map(renderCard)}</ProductCarouselWrapper>
      ) : (
        <div className={cn("grid grid-cols-2 gap-4", {
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': columns === 5,
          'md:grid-cols-3 lg:grid-cols-4': columns === 4,
        })}>{weeklyBest.map(renderCard)}</div>
      )}
    </section>
  );
};
