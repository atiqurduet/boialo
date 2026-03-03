import { Link } from "react-router-dom";
import { ChevronRight, ArrowRight, ShoppingCart, Star, TrendingUp } from "lucide-react";
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

const RankBadge = ({ rank }: { rank: number }) => {
  const medals = ['🥇', '🥈', '🥉'];
  if (rank <= 3) {
    return (
      <div className="absolute -top-1 -left-1 w-7 h-7 flex items-center justify-center z-10">
        <span className="text-lg drop-shadow-md">{medals[rank - 1]}</span>
      </div>
    );
  }
  return (
    <div className="absolute -top-1 -left-1 w-5.5 h-5.5 bg-muted-foreground/80 rounded-full flex items-center justify-center z-10 shadow-sm">
      <span className="text-white text-[10px] font-bold">{rank}</span>
    </div>
  );
};

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

  let parentCategories = categories.filter(c => !c.parent_id);
  if (selectedCategoryIds && selectedCategoryIds.length > 0) {
    parentCategories = parentCategories.filter(c => selectedCategoryIds.includes(c.id));
  }

  const categoriesWithProducts = parentCategories.filter(cat => {
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
        const aScore = (a.discount_percent || 0) + (a.is_featured ? 20 : 0);
        const bScore = (b.discount_percent || 0) + (b.is_featured ? 20 : 0);
        return bScore - aScore;
      })
      .slice(0, productsPerCategory);
  };

  const getProductImage = (product: Product): string => {
    if (product.images) {
      if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
      if (typeof product.images === 'object' && product.images.cover) return product.images.cover;
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
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (categoriesWithProducts.length === 0) return null;

  const headerGradients = [
    'from-[hsl(4,82%,56%)] to-[hsl(350,80%,45%)]',
    'from-[hsl(160,60%,40%)] to-[hsl(140,50%,35%)]',
    'from-[hsl(220,70%,50%)] to-[hsl(240,60%,45%)]',
    'from-[hsl(270,60%,50%)] to-[hsl(290,55%,42%)]',
    'from-[hsl(30,80%,50%)] to-[hsl(15,75%,42%)]',
    'from-[hsl(174,60%,40%)] to-[hsl(185,55%,35%)]',
    'from-[hsl(340,70%,50%)] to-[hsl(320,60%,42%)]',
    'from-[hsl(200,70%,45%)] to-[hsl(210,65%,38%)]',
  ];

  return (
    <section className="mb-10">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-primary" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card shadow-lg border border-border/50 flex items-center justify-center hover:scale-110 hover:bg-primary hover:text-primary-foreground transition-all -translate-x-4"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card shadow-lg border border-border/50 flex items-center justify-center hover:scale-110 hover:bg-primary hover:text-primary-foreground transition-all translate-x-4"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categoriesWithProducts.map((cat, catIndex) => {
            const catProducts = getProductsForCategory(cat.id);
            const gradient = headerGradients[catIndex % headerGradients.length];

            return (
              <div
                key={cat.id}
                className="flex-shrink-0 w-[280px] md:w-[300px] bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden snap-start group"
              >
                {/* Header */}
                <div className={cn("bg-gradient-to-r px-4 py-3 flex items-center justify-between", gradient)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className="w-4 h-4 text-white/90 flex-shrink-0" />
                    <h3 className="text-white font-bold text-sm line-clamp-1">{cat.name_bn}</h3>
                  </div>
                  <span className="text-[10px] text-white/80 bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    টপ {catProducts.length}
                  </span>
                </div>

                {/* Products */}
                <div className="divide-y divide-border/30">
                  {catProducts.map((product, idx) => (
                    <Link
                      key={product.id}
                      to={`/books/${product.slug}`}
                      className="flex gap-3 p-3 hover:bg-muted/40 transition-colors group/item"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-[60px] h-[76px] rounded-md overflow-hidden border border-border/30 bg-muted/20 group-hover/item:border-primary/30 transition-colors">
                          <img
                            src={getProductImage(product)}
                            alt={product.title_bn}
                            className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                          />
                        </div>
                        <RankBadge rank={idx + 1} />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-tight group-hover/item:text-primary transition-colors">
                            {product.title_bn}
                          </h4>
                          {product.author && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{product.author}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-primary">৳{product.price}</span>
                            {product.original_price && product.original_price > product.price && (
                              <span className="text-[10px] text-muted-foreground line-through">৳{product.original_price}</span>
                            )}
                          </div>
                          {product.discount_percent && product.discount_percent > 0 && (
                            <span className="text-[10px] font-bold text-white bg-destructive/90 px-1.5 py-0.5 rounded">
                              -{product.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-3 py-2.5 border-t border-border/30">
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg py-2 transition-colors group/link"
                  >
                    সব দেখুন
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        )}
      </div>
    </section>
  );
};
