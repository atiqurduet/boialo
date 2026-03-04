import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronRight, Tablet, Star, ShoppingCart, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { cn } from "@/lib/utils";

interface EbookSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  useCarousel?: boolean;
  columns?: number;
}

interface DigitalProduct {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  cover_image: string | null;
  product_type: string;
  is_free: boolean | null;
  avg_rating: number | null;
  review_count: number | null;
  total_sales: number | null;
  total_downloads: number | null;
  file_format: string | null;
  category: string | null;
}

export const EbookSection = ({
  limit = 10,
  title = "ই-বুক",
  subtitle = "ডিজিটাল বই পড়ুন যেকোনো ডিভাইসে",
  useCarousel = true,
  columns = 5,
}: EbookSectionProps) => {
  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ["ebook-section", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select(
          "id, title_bn, title_en, slug, price, original_price, discount_percent, cover_image, product_type, is_free, avg_rating, review_count, total_sales, total_downloads, file_format, category"
        )
        .eq("is_active", true)
        .eq("product_type", "ebook")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as DigitalProduct[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="my-10">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (ebooks.length === 0) return null;

  const renderCard = (product: DigitalProduct) => {
    const hasDiscount =
      product.discount_percent && product.discount_percent > 0;
    const rating = product.avg_rating ?? 0;

    return (
      <div
        key={product.id}
        className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <span className="flex items-center gap-1 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Tablet className="w-2.5 h-2.5" />
            {product.file_format?.toUpperCase() || "ই-বুক"}
          </span>
          {product.is_free && (
            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              ফ্রি
            </span>
          )}
        </div>

        {hasDiscount && (
          <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            -{product.discount_percent}%
          </div>
        )}

        {/* Image */}
        <Link to={`/digital-library`}>
          <div className="aspect-[3/4] overflow-hidden bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 relative">
            <img
              src={product.cover_image || "/placeholder.svg"}
              alt={product.title_bn}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-white/90 dark:bg-black/70 text-foreground rounded-full p-2">
                <Eye className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-3 space-y-1.5">
          <Link to={`/digital-library`}>
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {product.title_bn}
            </h3>
          </Link>

          {/* Rating */}
          {rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground">
                {rating.toFixed(1)}
                {product.review_count ? ` (${product.review_count})` : ""}
              </span>
            </div>
          )}

          {/* Category tag */}
          {product.category && (
            <span className="inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {product.category}
            </span>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 pt-0.5">
            {product.is_free ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ফ্রি
              </span>
            ) : (
              <>
                <span className="font-bold text-primary">
                  ৳{product.price}
                </span>
                {product.original_price &&
                  product.original_price > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      ৳{product.original_price}
                    </span>
                  )}
              </>
            )}
          </div>

          {/* Stats */}
          {(product.total_sales ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {product.total_sales} বার বিক্রি হয়েছে
            </p>
          )}

          {/* CTA */}
          <Link
            to={`/digital-library`}
            className="w-full mt-1 h-8 text-xs border rounded-md flex items-center justify-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
          >
            <ShoppingCart className="w-3 h-3" /> বিস্তারিত দেখুন
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="my-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && (
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Badge
            variant="secondary"
            className="hidden md:flex items-center gap-1 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border-0"
          >
            <Tablet className="w-3 h-3" /> ডিজিটাল
          </Badge>
        </div>
        <Link
          to="/digital-library"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid / Carousel */}
      {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>
          {ebooks.map(renderCard)}
        </ProductCarouselWrapper>
      ) : (
        <div
          className={cn("grid grid-cols-2 gap-4", {
            "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5": columns === 5,
            "md:grid-cols-3 lg:grid-cols-4": columns === 4,
          })}
        >
          {ebooks.map(renderCard)}
        </div>
      )}
    </section>
  );
};
