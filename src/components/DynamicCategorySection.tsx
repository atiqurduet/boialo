import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

interface DynamicCategorySectionProps {
  categories: Category[];
  title?: string;
  columns?: number;
}

export const DynamicCategorySection = ({ 
  categories, 
  title = "জনপ্রিয় ক্যাটাগরি",
  columns = 4 
}: DynamicCategorySectionProps) => {
  // Get parent categories only
  const parentCategories = categories.filter(c => !c.parent_id).slice(0, 8);

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <section className="bg-card rounded-xl p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title mb-0">{title}</h2>
        <Link
          to="/shop"
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
        {parentCategories.map((category) => (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug}`}
            className="category-card group"
          >
            <div className="w-20 h-24 md:w-24 md:h-32 rounded-lg overflow-hidden mb-2 shadow-md group-hover:shadow-lg transition-shadow bg-muted">
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
            </div>
            <span className="text-sm text-center text-muted-foreground group-hover:text-primary transition-colors line-clamp-2">
              {category.name_bn}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
