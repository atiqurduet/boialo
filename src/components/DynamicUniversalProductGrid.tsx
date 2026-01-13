import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface UniversalProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  brand: string | null;
  images: any;
  product_type: string;
}

interface DynamicUniversalProductGridProps {
  products: UniversalProduct[];
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  columns?: number;
  showRanking?: boolean;
}

export const DynamicUniversalProductGrid = ({
  products,
  title,
  subtitle,
  viewAllLink,
  columns = 5,
  showRanking = false,
}: DynamicUniversalProductGridProps) => {
  const getProductImage = (product: UniversalProduct): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {showRanking && (
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            সব দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${columns} gap-4`}>
        {products.map((product, index) => (
          <Link
            key={product.id}
            to={`/universal-product/${product.slug}`}
            className="relative group product-card"
          >
            {showRanking && (
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm z-10">
                {index + 1}
              </div>
            )}
            {product.discount_percent && product.discount_percent > 0 && (
              <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded z-10">
                -{product.discount_percent}%
              </div>
            )}
            <div className="aspect-square overflow-hidden rounded-t-lg">
              <img
                src={getProductImage(product)}
                alt={product.name_bn}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {product.name_bn}
              </h3>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                {product.brand || product.name_en}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">৳{product.price}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-muted-foreground line-through text-xs">
                    ৳{product.original_price}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};