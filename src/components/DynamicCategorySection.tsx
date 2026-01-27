import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  small: 'w-16 h-16 md:w-20 md:h-20',
  medium: 'w-20 h-20 md:w-24 md:h-24',
  large: 'w-24 h-24 md:w-28 md:h-28',
};

export const DynamicCategorySection = ({ 
  categories, 
  products = [],
  title = "জনপ্রিয় ক্যাটাগরি",
  settings = {},
}: DynamicCategorySectionProps) => {
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract settings with defaults
  const maxCategories = settings.max_categories || 12;
  const imageSize = settings.image_size || 'medium';
  const viewAllLink = settings.view_all_link || '/shop';
  const showProductCount = settings.show_product_count !== false;
  const showSubcategoryIndicator = settings.show_subcategory_indicator !== false;
  const enableScrollArrows = settings.enable_scroll_arrows !== false;
  const gradientBorder = settings.gradient_border || false;

  // Calculate product counts for each category (including subcategory products in parent count)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // First, count direct products for each category
    categories.forEach(cat => {
      counts[cat.id] = products.filter(p => p.category_id === cat.id).length;
    });
    
    // Then, add subcategory counts to parent categories
    categories.forEach(cat => {
      if (cat.parent_id && counts[cat.parent_id] !== undefined) {
        counts[cat.parent_id] += counts[cat.id];
      }
    });
    
    return counts;
  }, [categories, products]);

  // Get parent categories only
  const parentCategories = categories.filter(c => !c.parent_id).slice(0, maxCategories);
  
  // Get subcategories for selected parent
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
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="bg-card rounded-xl p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {selectedParent && (
            <button
              onClick={() => setSelectedParent(null)}
              className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              পিছনে
            </button>
          )}
          <h2 className="section-title mb-0">
            {selectedParent ? selectedParent.name_bn : title}
          </h2>
        </div>
        <Link
          to={selectedParent ? `/categories/${selectedParent.slug}` : viewAllLink}
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      {displayCategories.length === 0 && selectedParent ? (
        <div className="text-center py-8 text-muted-foreground">
          এই ক্যাটাগরিতে কোনো সাব-ক্যাটাগরি নেই
          <Link 
            to={`/categories/${selectedParent.slug}`}
            className="block mt-2 text-primary hover:underline"
          >
            সব পণ্য দেখুন
          </Link>
        </div>
      ) : (
        <div className="relative group">
          {/* Left Arrow */}
          {enableScrollArrows && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/95 shadow-lg border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary hover:text-primary-foreground -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Categories Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-2 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayCategories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                onClick={(e) => handleCategoryClick(category, e)}
                className="flex flex-col items-center gap-3 flex-shrink-0 group/item"
              >
                {/* Circular Image Container */}
                <div className="relative">
                  <div className={cn(
                    imageSizeClasses[imageSize],
                    "rounded-full overflow-hidden p-1 shadow-md group-hover/item:shadow-xl transition-all duration-300 group-hover/item:scale-105",
                    gradientBorder 
                      ? "bg-gradient-to-br from-primary via-primary/60 to-primary/20" 
                      : "bg-gradient-to-br from-primary/10 to-primary/5"
                  )}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-muted">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name_bn}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                          <span className="text-3xl">📚</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Count Badge */}
                  {showProductCount && categoryCounts[category.id] > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 bg-primary text-primary-foreground shadow-md"
                    >
                      {categoryCounts[category.id]}
                    </Badge>
                  )}
                  
                  {/* Subcategory Indicator */}
                  {showSubcategoryIndicator && !selectedParent && hasSubcategories(category.id) && (
                    <div className="absolute -bottom-1 right-0 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                {/* Category Name */}
                <span className={cn(
                  "text-sm text-center text-muted-foreground group-hover/item:text-primary transition-colors font-medium line-clamp-2",
                  imageSize === 'small' ? 'w-16 md:w-20' : imageSize === 'large' ? 'w-24 md:w-28' : 'w-20 md:w-24'
                )}>
                  {category.name_bn}
                </span>
              </Link>
            ))}
          </div>

          {/* Right Arrow */}
          {enableScrollArrows && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/95 shadow-lg border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary hover:text-primary-foreground -mr-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </section>
  );
};