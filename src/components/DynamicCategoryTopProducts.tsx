import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface Product {
  id: string;
  title_bn: string;
  title_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  author: string | null;
  publisher: string | null;
  images: any;
  is_featured: boolean;
  is_preorder: boolean;
  category_id: string | null;
  writer_id: string | null;
}

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

interface DynamicCategoryTopProductsProps {
  categories: Category[];
  products: Product[];
  title?: string;
  subtitle?: string;
  maxCategories?: number;
  productsPerCategory?: number;
  selectedCategoryIds?: string[];
}

export const DynamicCategoryTopProducts = ({
  categories,
  products,
  title = "ক্যাটাগরি অনুযায়ী টপ বই",
  subtitle,
  maxCategories = 5,
  productsPerCategory = 4,
  selectedCategoryIds,
}: DynamicCategoryTopProductsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get parent categories
  let parentCategories = categories.filter(c => !c.parent_id);
  if (selectedCategoryIds && selectedCategoryIds.length > 0) {
    parentCategories = parentCategories.filter(c => selectedCategoryIds.includes(c.id));
  }

  // Only show categories that have products
  const categoriesWithProducts = parentCategories.filter(cat => {
    // Get all subcategory IDs for this parent
    const subCatIds = categories.filter(c => c.parent_id === cat.id).map(c => c.id);
    const allCatIds = [cat.id, ...subCatIds];
    return products.some(p => p.category_id && allCatIds.includes(p.category_id));
  }).slice(0, maxCategories);

  const getProductsForCategory = (categoryId: string): Product[] => {
    const subCatIds = categories.filter(c => c.parent_id === categoryId).map(c => c.id);
    const allCatIds = [categoryId, ...subCatIds];
    return products
      .filter(p => p.category_id && allCatIds.includes(p.category_id))
      .sort((a, b) => {
        // Sort by discount, then featured
        const aScore = (a.discount_percent || 0) + (a.is_featured ? 20 : 0);
        const bScore = (b.discount_percent || 0) + (b.is_featured ? 20 : 0);
        return bScore - aScore;
      })
      .slice(0, productsPerCategory);
  };

  const getProductImage = (product: Product): string => {
    if (product.images) {
      if (Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0];
      }
      if (typeof product.images === 'object' && product.images.cover) {
        return product.images.cover;
      }
    }
    return '/placeholder.svg';
  };

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categoriesWithProducts]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  if (categoriesWithProducts.length === 0) return null;

  // Colors for category headers - cycling through
  const headerColors = [
    'bg-rose-600',
    'bg-emerald-600', 
    'bg-blue-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-teal-600',
    'bg-indigo-600',
    'bg-pink-600',
  ];

  return (
    <section className="mb-10">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="relative">
        {/* Scroll Arrows */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/95 shadow-lg border border-border flex items-center justify-center hover:scale-110 transition-transform -translate-x-3"
          >
            <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/95 shadow-lg border border-border flex items-center justify-center hover:scale-110 transition-transform translate-x-3"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categoriesWithProducts.map((cat, catIndex) => {
            const catProducts = getProductsForCategory(cat.id);
            const colorClass = headerColors[catIndex % headerColors.length];

            return (
              <div
                key={cat.id}
                className="flex-shrink-0 w-[280px] md:w-[300px] bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden"
              >
                {/* Category Header */}
                <div className={cn("px-4 py-3 flex items-center gap-2", colorClass)}>
                  <span className="text-white text-lg">☪</span>
                  <h3 className="text-white font-bold text-sm line-clamp-1">{cat.name_bn}</h3>
                </div>

                {/* Products List */}
                <div className="divide-y divide-border/40">
                  {catProducts.map((product, idx) => (
                    <Link
                      key={product.id}
                      to={`/books/${product.slug}`}
                      className="flex gap-3 p-3 hover:bg-muted/40 transition-colors group"
                    >
                      {/* Ranking Badge + Image */}
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-20 rounded-md overflow-hidden border border-border/40 bg-muted/20">
                          <img
                            src={getProductImage(product)}
                            alt={product.title_bn}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        {/* Rank badge */}
                        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">{idx + 1}</span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {product.title_bn}
                        </h4>
                        {product.author && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {product.author}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-bold text-primary">৳{product.price}</span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              ৳{product.original_price}
                            </span>
                          )}
                          {product.discount_percent && product.discount_percent > 0 && (
                            <span className="text-xs font-medium text-destructive">
                              ({product.discount_percent}% ছাড়)
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* View All */}
                <div className="px-4 py-2.5 border-t border-border/40">
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    সব দেখুন <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gradient Overlays */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        )}
      </div>
    </section>
  );
};
