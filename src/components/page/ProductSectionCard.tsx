import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  author?: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  isUniversal?: boolean;
}

interface ProductSectionCardProps {
  product: ProductCardData;
  showCartButton?: boolean;
  showWishlistButton?: boolean;
}

export const ProductSectionCard = ({ 
  product, 
  showCartButton = true,
  showWishlistButton = true 
}: ProductSectionCardProps) => {
  const { addToCart } = useCartContext();
  const { isInWishlist, toggleWishlist } = useWishlistContext();
  const inWishlist = isInWishlist(product.id);
  
  const productLink = product.isUniversal 
    ? `/universal-product/${product.slug}` 
    : `/product/${product.slug}`;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
    toast.success('কার্টে যোগ করা হয়েছে');
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  return (
    <div className="group relative product-card bg-card rounded-lg border overflow-hidden">
      {/* Discount Badge */}
      {product.discount && product.discount > 0 && (
        <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded z-10">
          -{product.discount}%
        </div>
      )}

      {/* Wishlist Button */}
      {showWishlistButton && (
        <button
          onClick={handleToggleWishlist}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-20 transition-all shadow-md",
            inWishlist 
              ? "bg-red-500 text-white" 
              : "bg-white/90 text-muted-foreground hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100"
          )}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
        </button>
      )}

      {/* Product Image */}
      <Link to={productLink} className="block">
        <div className="aspect-[3/4] overflow-hidden relative">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          
          {/* Cart Button - Shows on hover */}
          {showCartButton && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/85 text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0 transition-all duration-300 z-20 shadow-lg"
            >
              <ShoppingCart className="w-4 h-4" />
              অর্ডার করুন
            </button>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-3">
        <Link to={productLink}>
          <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        {(product.author || product.brand) && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {product.author || product.brand}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold">৳{product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-muted-foreground line-through text-xs">
              ৳{product.originalPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
