import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Library, ChevronRight, TrendingUp, Crown, Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface BestSellingPublishersProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

export const BestSellingPublishers = ({ limit = 12, title = "জনপ্রিয় প্রকাশনী", subtitle }: BestSellingPublishersProps) => {
  const { data: topPublishers = [], isLoading } = useQuery({
    queryKey: ['best-selling-publishers', limit],
    queryFn: async () => {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id');

      const { data: products } = await supabase
        .from('products')
        .select('id, publisher_id')
        .eq('is_active', true);

      const pubSales: Record<string, number> = {};
      const bookCounts: Record<string, number> = {};
      const productPubMap: Record<string, string> = {};

      (products || []).forEach(p => {
        if (p.publisher_id) {
          productPubMap[p.id] = p.publisher_id;
          bookCounts[p.publisher_id] = (bookCounts[p.publisher_id] || 0) + 1;
        }
      });

      (orderItems || []).forEach(item => {
        const pubId = productPubMap[item.product_id];
        if (pubId) pubSales[pubId] = (pubSales[pubId] || 0) + 1;
      });

      const sortedPubIds = Object.entries(pubSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      let publishers;
      if (sortedPubIds.length > 0) {
        const { data } = await supabase.from('publishers').select('*').eq('is_active', true).in('id', sortedPubIds);
        publishers = (data || []).sort((a, b) => (pubSales[b.id] || 0) - (pubSales[a.id] || 0))
          .map((p, i) => ({ ...p, sold_count: pubSales[p.id] || 0, book_count: bookCounts[p.id] || 0, rank: i + 1 }));
      } else {
        const { data } = await supabase.from('publishers').select('*').eq('is_active', true).order('name_bn').limit(limit);
        publishers = (data || []).map((p, i) => ({
          ...p,
          sold_count: 0,
          book_count: bookCounts[p.id] || 0,
          rank: i + 1,
        }));
      }

      return publishers;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="my-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="w-36 h-48 rounded-xl flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  if (topPublishers.length === 0) return null;

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 border-0">
            <TrendingUp className="w-3 h-3" /> টপ প্রকাশনী
          </Badge>
        </div>
        <Link to="/publishers" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {topPublishers.map((pub: any) => (
            <Link key={pub.id} to={`/publishers/${pub.slug}`} className="group flex-shrink-0 w-[140px] md:w-[160px]">
              <div className="relative bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4 text-center">
                {pub.rank === 1 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                    <Crown className="w-6 h-6 text-teal-500 fill-teal-400 drop-shadow" />
                  </div>
                )}
                {pub.rank <= 3 && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-lg">{pub.rank === 1 ? '🥇' : pub.rank === 2 ? '🥈' : '🥉'}</span>
                  </div>
                )}
                <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shadow-lg bg-muted flex items-center justify-center">
                  {pub.logo_url ? (
                    <img src={pub.logo_url} alt={pub.name_bn} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <Library className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2 leading-tight">{pub.name_bn}</h3>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Book className="w-3 h-3" /> {pub.book_count} টি বই
                </div>
                {pub.sold_count > 0 && (
                  <div className="mt-1 text-[10px] text-teal-600 dark:text-teal-400 font-medium">{pub.sold_count} কপি বিক্রি</div>
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
