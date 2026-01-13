import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  product_type: string;
}

interface DynamicUniversalCategorySectionProps {
  categories: UniversalCategory[];
  title: string;
  productType: string;
  maxCategories?: number;
}

export const DynamicUniversalCategorySection = ({
  categories,
  title,
  productType,
  maxCategories = 8,
}: DynamicUniversalCategorySectionProps) => {
  const displayCategories = categories.slice(0, maxCategories);

  if (displayCategories.length === 0) {
    return null;
  }

  const getProductTypeEmoji = (type: string) => {
    switch (type) {
      case 'lifestyle': return '🛍️';
      case 'stationery': return '✏️';
      case 'food': return '🍔';
      default: return '📦';
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">{getProductTypeEmoji(productType)}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground capitalize">{productType} Categories</p>
          </div>
        </div>
        <Link
          to={`/${productType}`}
          className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayCategories.map((category) => (
          <Link
            key={category.id}
            to={`/${productType}?category=${category.slug}`}
            className="group relative overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={category.image_url || '/placeholder.svg'}
                alt={category.name_bn}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-semibold text-white text-lg line-clamp-1">
                {category.name_bn}
              </h3>
              <p className="text-white/80 text-sm">{category.name_en}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};