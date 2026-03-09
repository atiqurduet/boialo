import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category?: string;
  publisher?: string;
  isPreorder?: boolean;
  releaseDate?: string;
}

interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact";
}

export const ProductCard = ({ product, variant = "default" }: ProductCardProps) => {
  const { addToCart } = useCartContext();
  const { isInWishlist, toggleWishlist } = useWishlistContext();
  const hasDiscount = product.discount && product.discount > 0;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product.id);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  if (variant === "compact") {
    return (
      <Link
        to={`/product/${product.slug}`}
        className="flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-muted/50 transition-colors group border border-border/30"
      >
        <img
          src={product.image}
          alt={product.title}
          className="w-16 h-20 object-cover rounded-lg"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h4>
          <Link 
            to={`/shop?author=${encodeURIComponent(product.author)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground mt-1 hover:text-primary transition-colors block"
          >
            {product.author}
          </Link>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="price-sale text-sm">৳{product.price}</span>
            {hasDiscount && (
              <span className="price-original text-xs">
                ৳{product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="product-card group relative">
      {/* Preorder Badge */}
      {product.isPreorder && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-accent text-accent-foreground px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm">
          প্রি-অর্ডার
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && !product.isPreorder && (
        <div className="discount-badge shadow-sm">
          <span className="text-sm font-bold">{product.discount}%</span>
          <br />
          <span className="text-[10px] font-medium">ছাড়</span>
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleToggleWishlist}
        className={cn(
          "absolute top-2.5 right-2.5 p-2 bg-card/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-card hover:scale-110 z-10",
          inWishlist && "opacity-100"
        )}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={cn(
            "w-4 h-4 transition-colors",
            inWishlist ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"
          )}
        />
      </button>

      {/* Product Image */}
      <Link to={`/product/${product.slug}`} className="block aspect-[3/4] overflow-hidden bg-muted/30">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          decoding="async"
        />
      </Link>

      {/* Product Info */}
      <div className="p-3.5 md:p-4 space-y-1.5">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
            {product.title}
          </h3>
        </Link>
        <Link 
          to={`/shop?author=${encodeURIComponent(product.author)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-primary transition-colors block truncate"
        >
          {product.author}
        </Link>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="price-sale text-base md:text-lg">৳{product.price}</span>
          {hasDiscount && (
            <span className="price-original text-xs">৳{product.originalPrice}</span>
          )}
        </div>
        <button 
          onClick={handleAddToCart} 
          className="w-full mt-2 h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm hover:shadow-md hover:from-primary/95 hover:to-primary active:scale-[0.97] transition-all duration-200"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          অর্ডার করুন
        </button>
      </div>
    </div>
  );
};