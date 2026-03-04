import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ChevronRight, TrendingUp, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface BestSellingBrandsProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

export const BestSellingBrands = ({ limit = 12, title = "জনপ্রিয় ব্র্যান্ড", subtitle }: BestSellingBrandsProps) => {
  const { data: topBrands = [], isLoading } = useQuery({
    queryKey: ['best-selling-brands', limit],
    queryFn: async () => {
      // Get product sales by brand (from products table which has brand_id)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id');

      const { data: productsWithBrand } = await supabase
        .from('products')
        .select('id, brand_id')
        .eq('is_active', true)
        .not('brand_id', 'is', null);

      const brandSales: Record<string, number> = {};
      const productBrandMap: Record<string, string> = {};
      (productsWithBrand || []).forEach((p: any) => {
        if (p.brand_id) productBrandMap[p.id] = p.brand_id;
      });

      (orderItems || []).forEach(item => {
        const brandId = productBrandMap[item.product_id];
        if (brandId) brandSales[brandId] = (brandSales[brandId] || 0) + 1;
      });

      const sortedBrandIds = Object.entries(brandSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      let brands;
      if (sortedBrandIds.length > 0) {
        const { data } = await supabase.from('brands').select('*').eq('is_active', true).in('id', sortedBrandIds);
        brands = (data || []).sort((a, b) => (brandSales[b.id] || 0) - (brandSales[a.id] || 0))
          .map((b, i) => ({ ...b, sold_count: brandSales[b.id] || 0, rank: i + 1 }));
      } else {
        const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('name_bn').limit(limit);
        brands = (data || []).map((b, i) => ({ ...b, sold_count: 0, rank: i + 1 }));
      }

      return brands;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="my-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="w-36 h-44 rounded-xl flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  if (topBrands.length === 0) return null;

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400 border-0">
            <TrendingUp className="w-3 h-3" /> টপ ব্র্যান্ড
          </Badge>
        </div>
        <Link to="/shop" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {topBrands.map((brand: any) => (
            <Link key={brand.id} to={`/shop?brand=${brand.slug}`} className="group flex-shrink-0 w-[140px] md:w-[160px]">
              <div className="relative bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4 text-center">
                {brand.rank === 1 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                    <Crown className="w-6 h-6 text-cyan-500 fill-cyan-400 drop-shadow" />
                  </div>
                )}
                {brand.rank <= 3 && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-lg">{brand.rank === 1 ? '🥇' : brand.rank === 2 ? '🥈' : '🥉'}</span>
                  </div>
                )}
                <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-muted flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name_bn} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1 leading-tight">{brand.name_bn}</h3>
                {brand.sold_count > 0 && (
                  <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">{brand.sold_count} টি বিক্রি</div>
                )}
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};
