import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Download, ChevronRight, Tablet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { useCartContext } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EbookSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  useCarousel?: boolean;
  columns?: number;
}

export const EbookSection = ({ limit = 10, title = "ই-বুক", subtitle = "ডিজিটাল বই পড়ুন যেকোনো ডিভাইসে", useCarousel = true, columns = 5 }: EbookSectionProps) => {
  const { addToCart } = useCartContext();

  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ['ebook-products', limit],
    queryFn: async () => {
      // Fetch products that have digital files or are marked as ebook
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .or('product_format.eq.ebook,product_format.eq.pdf,is_digital.eq.true')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Fallback: if no ebook-specific field, try products with "ebook" or "pdf" in title
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .or('title_bn.ilike.%ebook%,title_bn.ilike.%ই-বুক%,title_en.ilike.%ebook%,title_en.ilike.%pdf%')
          .order('created_at', { ascending: false })
          .limit(limit);
        return fallback || [];
      }
      return data;
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

  if (ebooks.length === 0) return null;

  const renderCard = (product: any) => (
    <div key={product.id} className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-blue-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
        <Tablet className="w-2.5 h-2.5" /> ই-বুক
      </div>
      {product.discount_percent > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">-{product.discount_percent}%</div>
      )}
      <Link to={`/product/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <img src={getProductImage(product)} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      </Link>
      <div className="p-3 space-y-1.5">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">{product.title_bn}</h3>
        </Link>
        {product.author && <p className="text-xs text-muted-foreground line-clamp-1">{product.author}</p>}
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">৳{product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
          )}
        </div>
        <button onClick={() => { addToCart(product.id); toast.success("কার্টে যোগ হয়েছে"); }} className="w-full mt-1 h-8 text-xs border rounded-md flex items-center justify-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors">
          <Download className="w-3 h-3" /> অর্ডার করুন
        </button>
      </div>
    </div>
  );

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border-0">
            <Tablet className="w-3 h-3" /> ডিজিটাল
          </Badge>
        </div>
        <Link to="/digital-library" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>{ebooks.map(renderCard)}</ProductCarouselWrapper>
      ) : (
        <div className={cn("grid grid-cols-2 gap-4", {
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': columns === 5,
          'md:grid-cols-3 lg:grid-cols-4': columns === 4,
        })}>{ebooks.map(renderCard)}</div>
      )}
    </section>
  );
};
