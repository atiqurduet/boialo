import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ShoppingBag, ChevronRight, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { useCartContext } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

interface RecentlySoldProductsProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  useCarousel?: boolean;
  columns?: number;
}

export const RecentlySoldProducts = ({ limit = 10, title = "সম্প্রতি বিক্রিত", subtitle, useCarousel = true, columns = 5 }: RecentlySoldProductsProps) => {
  const { addToCart } = useCartContext();

  const { data: recentProducts = [], isLoading } = useQuery({
    queryKey: ['recently-sold-products', limit],
    queryFn: async () => {
      const { data: recentOrders } = await supabase
        .from('order_items')
        .select('product_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit * 3);

      if (!recentOrders || recentOrders.length === 0) return [];

      const seen = new Set<string>();
      const uniqueItems: { product_id: string; sold_at: string }[] = [];
      for (const item of recentOrders) {
        if (!seen.has(item.product_id)) {
          seen.add(item.product_id);
          uniqueItems.push({ product_id: item.product_id, sold_at: item.created_at });
          if (uniqueItems.length >= limit) break;
        }
      }

      const productIds = uniqueItems.map(i => i.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('id', productIds);

      const soldAtMap: Record<string, string> = {};
      uniqueItems.forEach(i => { soldAtMap[i.product_id] = i.sold_at; });

      return (products || [])
        .map(p => ({ ...p, sold_at: soldAtMap[p.id] }))
        .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime());
    },
    staleTime: 2 * 60 * 1000,
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

  if (recentProducts.length === 0) return null;

  const renderCard = (product: any) => (
    <div key={product.id} className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
        <Zap className="w-2.5 h-2.5" />
        {product.sold_at && formatDistanceToNow(new Date(product.sold_at), { addSuffix: true, locale: bn })}
      </div>
      {product.discount_percent > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">-{product.discount_percent}%</div>
      )}
      <Link to={`/product/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-muted">
          <img src={getProductImage(product)} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      </Link>
      <div className="p-3 space-y-1.5">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">{product.title_bn}</h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">৳{product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
          )}
        </div>
        <button onClick={() => { addToCart(product.id); toast.success("কার্টে যোগ হয়েছে"); }} className="w-full mt-1 h-8 text-xs border rounded-md flex items-center justify-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors">
          <ShoppingBag className="w-3 h-3" /> অর্ডার করুন
        </button>
      </div>
    </div>
  );

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border-0">
            <ShoppingBag className="w-3 h-3" /> লাইভ
          </Badge>
        </div>
        <Link to="/shop" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>{recentProducts.map(renderCard)}</ProductCarouselWrapper>
      ) : (
        <div className={cn("grid grid-cols-2 gap-4", {
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': columns === 5,
          'md:grid-cols-3 lg:grid-cols-4': columns === 4,
          'md:grid-cols-3': columns === 3,
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6': columns === 6,
        })}>{recentProducts.map(renderCard)}</div>
      )}
    </section>
  );
};
