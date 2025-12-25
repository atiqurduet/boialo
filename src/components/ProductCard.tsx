import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category?: string;
  publisher?: string;
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
        to={`/product/${product.id}`}
        className="flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <img
          src={product.image}
          alt={product.title}
          className="w-16 h-20 object-cover rounded"
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
          <div className="flex items-center gap-2 mt-1">
            <span className="text-primary font-bold text-sm">৳{product.price}</span>
            {hasDiscount && (
              <span className="text-muted-foreground line-through text-xs">
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
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="discount-badge">
          {product.discount}%
          <br />
          <span className="text-[10px]">OFF</span>
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleToggleWishlist}
        className={cn(
          "absolute top-2 right-2 p-2 bg-card/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card z-10",
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
      <Link to={`/product/${product.id}`} className="block aspect-[3/4] overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1 text-sm md:text-base">
            {product.title}
          </h3>
        </Link>
        <Link 
          to={`/shop?author=${encodeURIComponent(product.author)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-muted-foreground mb-2 line-clamp-1 hover:text-primary transition-colors block"
        >
          {product.author}
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="price-sale text-lg">৳{product.price}</span>
          {hasDiscount && (
            <span className="price-original">৳{product.originalPrice}</span>
          )}
        </div>
        <Button onClick={handleAddToCart} className="w-full btn-primary text-sm" size="sm">
          অর্ডার করুন
        </Button>
      </div>
    </div>
  );
};
