import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

interface ProductWithCategory {
  category_id: string | null;
}

interface CategorySettings {
  max_categories?: number;
  image_size?: 'small' | 'medium' | 'large';
  view_all_link?: string;
  show_product_count?: boolean;
  show_subcategory_indicator?: boolean;
  enable_scroll_arrows?: boolean;
  gradient_border?: boolean;
}

interface DynamicCategorySectionProps {
  categories: Category[];
  products?: ProductWithCategory[];
  title?: string;
  settings?: CategorySettings;
}

const imageSizeClasses = {
  small: 'w-20 h-20 md:w-24 md:h-24',
  medium: 'w-24 h-24 md:w-28 md:h-28',
  large: 'w-28 h-28 md:w-32 md:h-32',
};

export const DynamicCategorySection = ({ 
  categories, 
  products = [],
  title = "জনপ্রিয় ক্যাটাগরি",
  settings = {},
}: DynamicCategorySectionProps) => {
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Extract settings with defaults
  const maxCategories = settings.max_categories || 12;
  const imageSize = settings.image_size || 'medium';
  const viewAllLink = settings.view_all_link || '/categories';
  const showProductCount = settings.show_product_count !== false;
  const showSubcategoryIndicator = settings.show_subcategory_indicator !== false;
  const enableScrollArrows = settings.enable_scroll_arrows !== false;
  const gradientBorder = settings.gradient_border !== false;

  // Check scroll state
  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollability);
      }
      window.removeEventListener('resize', checkScrollability);
    };
  }, [categories, selectedParent]);

  // Calculate product counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => {
      counts[cat.id] = products.filter(p => p.category_id === cat.id).length;
    });
    categories.forEach(cat => {
      if (cat.parent_id && counts[cat.parent_id] !== undefined) {
        counts[cat.parent_id] += counts[cat.id];
      }
    });
    return counts;
  }, [categories, products]);

  const parentCategories = categories.filter(c => !c.parent_id).slice(0, maxCategories);
  const subcategories = selectedParent 
    ? categories.filter(c => c.parent_id === selectedParent.id)
    : [];

  if (parentCategories.length === 0) {
    return null;
  }

  const displayCategories = selectedParent ? subcategories : parentCategories;
  const hasSubcategories = (categoryId: string) => 
    categories.some(c => c.parent_id === categoryId);

  const handleCategoryClick = (category: Category, e: React.MouseEvent) => {
    if (!selectedParent && hasSubcategories(category.id)) {
      e.preventDefault();
      setSelectedParent(category);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 280;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl p-6 md:p-8 shadow-lg border border-border/50 mb-8 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {selectedParent ? (
            <button
              onClick={() => setSelectedParent(null)}
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>পিছনে</span>
            </button>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {selectedParent ? selectedParent.name_bn : title}
            </h2>
            {!selectedParent && (
              <p className="text-sm text-muted-foreground mt-0.5">আপনার পছন্দের ক্যাটাগরি বেছে নিন</p>
            )}
          </div>
        </div>
        <Link
          to={selectedParent ? `/categories/${selectedParent.slug}` : viewAllLink}
          className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-sm font-medium transition-all duration-300"
        >
          সব দেখুন 
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      
      {displayCategories.length === 0 && selectedParent ? (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">📂</span>
          </div>
          <p className="mb-3">এই ক্যাটাগরিতে কোনো সাব-ক্যাটাগরি নেই</p>
          <Link 
            to={`/categories/${selectedParent.slug}`}
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            সব পণ্য দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* Left Arrow */}
          {enableScrollArrows && canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/95 backdrop-blur-sm shadow-xl border-2 border-primary/20 hover:border-primary flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-primary/20 hover:shadow-2xl -translate-x-2 md:-translate-x-4"
              aria-label="Previous categories"
            >
              <ChevronLeft className="w-6 h-6 text-primary" />
            </button>
          )}

          {/* Categories Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-4 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayCategories.map((category, index) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                onClick={(e) => handleCategoryClick(category, e)}
                className="flex flex-col items-center gap-3 flex-shrink-0 group/item animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Circular Image Container */}
                <div className="relative">
                  {/* Outer Glow Ring */}
                  <div className={cn(
                    "absolute inset-0 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 blur-md",
                    "bg-gradient-to-br from-primary via-primary/50 to-secondary"
                  )} />
                  
                  {/* Main Image Container */}
                  <div className={cn(
                    imageSizeClasses[imageSize],
                    "relative rounded-full p-1 transition-all duration-500 group-hover/item:scale-105 group-hover/item:-translate-y-1",
                    gradientBorder 
                      ? "bg-gradient-to-br from-primary via-primary/70 to-secondary shadow-lg group-hover/item:shadow-xl group-hover/item:shadow-primary/30" 
                      : "bg-gradient-to-br from-border via-border/50 to-border/30 shadow-md group-hover/item:shadow-lg"
                  )}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-background ring-2 ring-background">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name_bn}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-secondary/10">
                          <span className="text-4xl group-hover/item:scale-110 transition-transform duration-300">📚</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Count Badge */}
                  {showProductCount && categoryCounts[category.id] > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 border-2 border-background"
                    >
                      {categoryCounts[category.id]}
                    </Badge>
                  )}
                  
                  {/* Subcategory Indicator */}
                  {showSubcategoryIndicator && !selectedParent && hasSubcategories(category.id) && (
                    <div className="absolute -bottom-0.5 right-1 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground rounded-full p-1.5 shadow-lg border-2 border-background">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                {/* Category Name */}
                <div className="text-center">
                  <span className={cn(
                    "block text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors duration-300 line-clamp-2",
                    imageSize === 'small' ? 'w-20 md:w-24' : imageSize === 'large' ? 'w-28 md:w-32' : 'w-24 md:w-28'
                  )}>
                    {category.name_bn}
                  </span>
                  {/* Hover Underline Effect */}
                  <div className="h-0.5 w-0 group-hover/item:w-full mx-auto mt-1 bg-gradient-to-r from-primary to-secondary transition-all duration-300 rounded-full" />
                </div>
              </Link>
            ))}
          </div>

          {/* Right Arrow */}
          {enableScrollArrows && canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-background/95 backdrop-blur-sm shadow-xl border-2 border-primary/20 hover:border-primary flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-primary/20 hover:shadow-2xl translate-x-2 md:translate-x-4"
              aria-label="Next categories"
            >
              <ChevronRight className="w-6 h-6 text-primary" />
            </button>
          )}

          {/* Scroll Gradient Overlays */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
          )}
        </div>
      )}
    </section>
  );
};
