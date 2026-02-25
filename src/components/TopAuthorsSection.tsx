import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Book, ChevronRight, Award, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TopAuthorsSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

export const TopAuthorsSection = ({ limit = 12, title = "জনপ্রিয় লেখকগণ", subtitle }: TopAuthorsSectionProps) => {
  const { data: topAuthors = [], isLoading } = useQuery({
    queryKey: ['top-authors', limit],
    queryFn: async () => {
      // Get product counts per writer from order_items for popularity
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id');

      // Get products with writer_id
      const { data: products } = await supabase
        .from('products')
        .select('id, writer_id')
        .eq('is_active', true);

      // Count books per writer
      const bookCounts: Record<string, number> = {};
      const soldCounts: Record<string, number> = {};

      (products || []).forEach(p => {
        if (p.writer_id) {
          bookCounts[p.writer_id] = (bookCounts[p.writer_id] || 0) + 1;
        }
      });

      // Count sales per writer
      const productWriterMap: Record<string, string> = {};
      (products || []).forEach(p => {
        if (p.writer_id) productWriterMap[p.id] = p.writer_id;
      });

      (orderItems || []).forEach(item => {
        const writerId = productWriterMap[item.product_id];
        if (writerId) {
          soldCounts[writerId] = (soldCounts[writerId] || 0) + 1;
        }
      });

      // Get writers sorted by sales then book count
      const writerIds = [...new Set([...Object.keys(soldCounts), ...Object.keys(bookCounts)])];
      const sortedWriterIds = writerIds
        .sort((a, b) => (soldCounts[b] || 0) - (soldCounts[a] || 0) || (bookCounts[b] || 0) - (bookCounts[a] || 0))
        .slice(0, limit);

      if (sortedWriterIds.length === 0) {
        const { data: writers } = await supabase
          .from('writers')
          .select('*')
          .eq('is_active', true)
          .order('name_bn')
          .limit(limit);
        return (writers || []).map((w, i) => ({
          ...w,
          book_count: bookCounts[w.id] || 0,
          sold_count: 0,
          rank: i + 1,
        }));
      }

      const { data: writers } = await supabase
        .from('writers')
        .select('*')
        .eq('is_active', true)
        .in('id', sortedWriterIds);

      return (writers || [])
        .sort((a, b) => (soldCounts[b.id] || 0) - (soldCounts[a.id] || 0))
        .map((w, i) => ({
          ...w,
          book_count: bookCounts[w.id] || 0,
          sold_count: soldCounts[w.id] || 0,
          rank: i + 1,
        }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const getAuthorImage = (author: any) => {
    if (author.image_url) return author.image_url;
    const name = author.name_bn?.split(' ')[0] || 'A';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=200&bold=true`;
  };

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

  if (topAuthors.length === 0) return null;

  return (
    <section className="my-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 border-0">
            <Award className="w-3 h-3" />
            টপ লেখক
          </Badge>
        </div>
        <Link to="/authors" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Scrollable Authors */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {topAuthors.map((author: any) => (
            <Link
              key={author.id}
              to={`/authors/${author.slug}`}
              className="group flex-shrink-0 w-[140px] md:w-[160px]"
            >
              <div className="relative bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4 text-center">
                {/* Crown for #1 */}
                {author.rank === 1 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                    <Crown className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow" />
                  </div>
                )}

                {/* Rank Badge */}
                {author.rank <= 3 && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-lg">
                      {author.rank === 1 ? '🥇' : author.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  </div>
                )}

                {/* Avatar */}
                <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shadow-lg">
                  <img
                    src={getAuthorImage(author)}
                    alt={author.name_bn}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                {/* Name */}
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2 leading-tight">
                  {author.name_bn}
                </h3>

                {/* Stats */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Book className="w-3 h-3" />
                  <span>{author.book_count} টি বই</span>
                </div>

                {author.sold_count > 0 && (
                  <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {author.sold_count} কপি বিক্রি
                  </div>
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
