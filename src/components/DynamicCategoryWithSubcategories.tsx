import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
}

interface DynamicCategoryWithSubcategoriesProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
  maxParentCategories?: number;
  maxSubcategories?: number;
  columns?: number;
  selectedCategoryIds?: string[];
}

export const DynamicCategoryWithSubcategories = ({
  categories,
  title = "ক্যাটাগরি অনুযায়ী বই",
  subtitle,
  maxParentCategories = 8,
  maxSubcategories = 6,
  columns = 4,
  selectedCategoryIds,
}: DynamicCategoryWithSubcategoriesProps) => {
  // Filter parent categories
  let parentCategories = categories.filter(c => !c.parent_id);

  // If specific category IDs are selected, use those
  if (selectedCategoryIds && selectedCategoryIds.length > 0) {
    parentCategories = parentCategories.filter(c => selectedCategoryIds.includes(c.id));
  }

  parentCategories = parentCategories.slice(0, maxParentCategories);

  // Group subcategories by parent
  const getSubcategories = (parentId: string) => {
    return categories
      .filter(c => c.parent_id === parentId)
      .slice(0, maxSubcategories);
  };

  if (parentCategories.length === 0) return null;

  const gridColClass = columns === 3
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    : columns === 2
    ? "grid-cols-1 md:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <section className="mb-10">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div className={cn("grid gap-5", gridColClass)}>
        {parentCategories.map((parent) => {
          const subs = getSubcategories(parent.id);
          return (
            <div
              key={parent.id}
              className="bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Category Header */}
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-lg font-bold text-foreground line-clamp-1">
                  {parent.name_bn}
                </h3>
              </div>

              {/* Subcategories Grid */}
              <div className="px-3 pb-2">
                {subs.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {subs.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/categories/${sub.slug}`}
                        className="group flex flex-col items-center p-2 rounded-lg hover:bg-muted/60 transition-colors"
                      >
                        <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted/30 mb-1.5 border border-border/40">
                          <img
                            src={sub.image_url || '/placeholder.svg'}
                            alt={sub.name_bn}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        <span className="text-xs text-center text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {sub.name_bn}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    সাব-ক্যাটাগরি নেই
                  </div>
                )}
              </div>

              {/* View All Link */}
              <div className="px-4 pb-3">
                <Link
                  to={`/categories/${parent.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  সব দেখুন <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
