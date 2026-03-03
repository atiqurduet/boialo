import { Link } from "react-router-dom";
import { ChevronRight, ShoppingCart, Heart } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  title_bn: string;
  title_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  author: string | null;
  images: any;
}

interface DynamicProductGridProps {
  products: Product[];
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  columns?: number;
  showRanking?: boolean;
}

export const DynamicProductGrid = ({
  products,
  title,
  subtitle,
  viewAllLink,
  columns = 5,
  showRanking = false,
}: DynamicProductGridProps) => {
  const { addToCart } = useCartContext();
  const { isInWishlist, toggleWishlist } = useWishlistContext();

  const getProductImage = (product: Product): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(productId);
    toast.success("কার্টে যোগ করা হয়েছে");
  };

  const handleToggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productId);
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

      <div className={cn(
        "grid grid-cols-2 gap-4",
        {
          'md:grid-cols-2 lg:grid-cols-2': columns === 2,
          'md:grid-cols-3 lg:grid-cols-3': columns === 3,
          'md:grid-cols-3 lg:grid-cols-4': columns === 4,
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': columns === 5,
          'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6': columns === 6,
          'md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7': columns === 7,
          'md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8': columns === 8,
        }
      )}>
        {products.map((product, index) => {
          const inWishlist = isInWishlist(product.id);
          return (
            <div key={product.id} className="relative group product-card">
              {showRanking && (
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm z-10">
                  {index + 1}
                </div>
              )}
              
              {/* Wishlist Button - Top Right */}
              <button
                onClick={(e) => handleToggleWishlist(e, product.id)}
                className={cn(
                  "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-20 transition-all shadow-md",
                  inWishlist 
                    ? "bg-red-500 text-white" 
                    : "bg-white/90 text-muted-foreground hover:bg-white hover:text-red-500"
                )}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
              </button>

              {product.discount_percent && product.discount_percent > 0 && (
                <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded z-10">
                  -{product.discount_percent}%
                </div>
              )}
              
              <Link to={`/product/${product.slug}`}>
                <div className="aspect-[3/4] overflow-hidden rounded-t-lg relative">
                  <img
                    src={getProductImage(product)}
                    alt={product.title_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {/* Cart Button - Bottom, shows on hover */}
                  <button
                    onClick={(e) => handleAddToCart(e, product.id)}
                    className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground py-2.5 text-sm font-medium flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    অর্ডার করুন
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {product.title_bn}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    {product.author || product.title_en}
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
            </div>
          );
        })}
      </div>
    </section>
  );
};
