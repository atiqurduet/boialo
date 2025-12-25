import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

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

interface DynamicCategorySectionProps {
  categories: Category[];
  products?: ProductWithCategory[];
  title?: string;
}

export const DynamicCategorySection = ({ 
  categories, 
  products = [],
  title = "জনপ্রিয় ক্যাটাগরি",
}: DynamicCategorySectionProps) => {
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

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
  const parentCategories = categories.filter(c => !c.parent_id).slice(0, 8);
  
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
          to={selectedParent ? `/shop?category=${selectedParent.slug}` : "/shop"}
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      {displayCategories.length === 0 && selectedParent ? (
        <div className="text-center py-8 text-muted-foreground">
          এই ক্যাটাগরিতে কোনো সাব-ক্যাটাগরি নেই
          <Link 
            to={`/shop?category=${selectedParent.slug}`}
            className="block mt-2 text-primary hover:underline"
          >
            সব পণ্য দেখুন
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCategories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              onClick={(e) => handleCategoryClick(category, e)}
              className="category-card group"
            >
              <div className="relative w-20 h-24 md:w-24 md:h-32 rounded-lg overflow-hidden mb-2 shadow-md group-hover:shadow-lg transition-shadow bg-muted">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-3xl">📚</span>
                  </div>
                )}
                {categoryCounts[category.id] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 left-1 text-xs px-1.5 py-0.5 bg-primary text-primary-foreground"
                  >
                    {categoryCounts[category.id]}
                  </Badge>
                )}
                {!selectedParent && hasSubcategories(category.id) && (
                  <div className="absolute bottom-1 right-1 bg-primary/80 text-primary-foreground rounded-full p-1">
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
              <span className="text-sm text-center text-muted-foreground group-hover:text-primary transition-colors line-clamp-2">
                {category.name_bn}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
