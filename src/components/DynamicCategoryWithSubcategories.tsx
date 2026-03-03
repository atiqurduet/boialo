import { Link } from "react-router-dom";
import { ChevronRight, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  let parentCategories = categories.filter(c => !c.parent_id);
  if (selectedCategoryIds && selectedCategoryIds.length > 0) {
    parentCategories = parentCategories.filter(c => selectedCategoryIds.includes(c.id));
  }
  parentCategories = parentCategories.slice(0, maxParentCategories);

  const getSubcategories = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId).slice(0, maxSubcategories);
  };

  const getSubcategoryCount = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId).length;
  };

  if (parentCategories.length === 0) return null;

  const gridColClass = columns === 3
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    : columns === 2
    ? "grid-cols-1 md:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  // Gradient colors for parent headers
  const headerGradients = [
    'from-[hsl(4,82%,56%)] to-[hsl(4,82%,45%)]',
    'from-[hsl(160,60%,40%)] to-[hsl(160,60%,30%)]',
    'from-[hsl(220,70%,50%)] to-[hsl(220,70%,40%)]',
    'from-[hsl(270,60%,50%)] to-[hsl(270,60%,40%)]',
    'from-[hsl(30,80%,50%)] to-[hsl(30,80%,40%)]',
    'from-[hsl(174,60%,40%)] to-[hsl(174,60%,30%)]',
    'from-[hsl(340,70%,50%)] to-[hsl(340,70%,40%)]',
    'from-[hsl(200,70%,45%)] to-[hsl(200,70%,35%)]',
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
          <Link 
            to="/categories" 
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            সব ক্যাটাগরি
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      <div className={cn("grid gap-4", gridColClass)}>
        {parentCategories.map((parent, index) => {
          const subs = getSubcategories(parent.id);
          const totalSubs = getSubcategoryCount(parent.id);
          const gradient = headerGradients[index % headerGradients.length];
          const isHovered = hoveredParent === parent.id;

          return (
            <div
              key={parent.id}
              className={cn(
                "bg-card rounded-xl border border-border/50 overflow-hidden transition-all duration-300",
                isHovered ? "shadow-lg border-primary/20 -translate-y-0.5" : "shadow-sm hover:shadow-md"
              )}
              onMouseEnter={() => setHoveredParent(parent.id)}
              onMouseLeave={() => setHoveredParent(null)}
            >
              {/* Gradient Header */}
              <div className={cn("bg-gradient-to-r px-4 py-3 flex items-center justify-between", gradient)}>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-white/90 flex-shrink-0" />
                  <h3 className="text-white font-bold text-sm line-clamp-1">{parent.name_bn}</h3>
                </div>
                {totalSubs > 0 && (
                  <span className="text-[10px] font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    {totalSubs}টি
                  </span>
                )}
              </div>

              {/* Subcategories */}
              <div className="p-3">
                {subs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {subs.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/categories/${sub.slug}`}
                        className="group flex flex-col items-center p-1.5 rounded-lg hover:bg-muted/60 transition-all duration-200"
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted/30 mb-1.5 border border-border/30 group-hover:border-primary/30 transition-colors relative">
                          <img
                            src={sub.image_url || '/placeholder.svg'}
                            alt={sub.name_bn}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <span className="text-[11px] text-center text-foreground line-clamp-2 leading-tight font-medium group-hover:text-primary transition-colors">
                          {sub.name_bn}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    সাব-ক্যাটাগরি নেই
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-3 pt-0">
                <Link
                  to={`/categories/${parent.slug}`}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg py-2 transition-colors group"
                >
                  সব দেখুন
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
