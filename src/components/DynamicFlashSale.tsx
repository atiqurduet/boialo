import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, ShoppingCart, Heart } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  slug: string;
  title_bn: string;
  title_en: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  images: any;
  author: string | null;
}

interface DynamicFlashSaleProps {
  products: Product[];
  title?: string;
  endTime?: Date;
  useCarousel?: boolean;
  columns?: number;
}

export const DynamicFlashSale = ({ 
  products, 
  title = "ফ্ল্যাশ সেল",
  endTime,
  useCarousel = true,
  columns = 5,
}: DynamicFlashSaleProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const { addToCart } = useCartContext();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const { toast } = useToast();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = endTime || new Date(new Date().setHours(23, 59, 59, 999));
      const diff = end.getTime() - new Date().getTime();
      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const getProductImage = (product: Product): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  const discountedProducts = products
    .filter(p => p.discount_percent && p.discount_percent > 0)
    .slice(0, 10);

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(productId, 1);
    toast({ title: "কার্টে যোগ হয়েছে", description: "প্রোডাক্টটি কার্টে যোগ করা হয়েছে" });
  };

  const handleToggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  if (discountedProducts.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-r from-destructive to-destructive/80 rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="text-primary-foreground">
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm opacity-80">সীমিত সময়ের জন্য</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground">
            <Clock className="w-5 h-5" />
            <div className="flex gap-1">
              <span className="bg-primary-foreground/20 px-2 py-1 rounded font-mono text-lg">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-xl">:</span>
              <span className="bg-primary-foreground/20 px-2 py-1 rounded font-mono text-lg">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-xl">:</span>
              <span className="bg-primary-foreground/20 px-2 py-1 rounded font-mono text-lg">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>
          {discountedProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="bg-card rounded-lg overflow-hidden group hover:shadow-lg transition-shadow relative block"
            >
              <button
                onClick={(e) => handleToggleWishlist(e, product.id)}
                className="absolute top-2 left-2 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors shadow-sm"
              >
                <Heart className={`w-4 h-4 transition-colors ${isInWishlist(product.id) ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
              </button>
              <div className="relative aspect-[3/4]">
                <img src={getProductImage(product)} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                {product.discount_percent && (
                  <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">-{product.discount_percent}%</div>
                )}
                <button onClick={(e) => handleAddToCart(e, product.id)} className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground py-2.5 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm font-medium">অর্ডার করুন</span>
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title_bn}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">৳{product.price}</span>
                  {product.original_price && <span className="text-muted-foreground line-through text-xs">৳{product.original_price}</span>}
                </div>
              </div>
            </Link>
          ))}
        </ProductCarouselWrapper>
        ) : (
        <div className={cn(
          "grid grid-cols-2 gap-4",
          {
            'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5': columns === 5,
            'md:grid-cols-3 lg:grid-cols-4': columns === 4,
            'md:grid-cols-3': columns === 3,
            'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6': columns === 6,
          }
        )}>
          {discountedProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="bg-card rounded-lg overflow-hidden group hover:shadow-lg transition-shadow relative block"
            >
              <button
                onClick={(e) => handleToggleWishlist(e, product.id)}
                className="absolute top-2 left-2 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors shadow-sm"
              >
                <Heart className={`w-4 h-4 transition-colors ${isInWishlist(product.id) ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
              </button>
              <div className="relative aspect-[3/4]">
                <img src={getProductImage(product)} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                {product.discount_percent && (
                  <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">-{product.discount_percent}%</div>
                )}
                <button onClick={(e) => handleAddToCart(e, product.id)} className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground py-2.5 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm font-medium">অর্ডার করুন</span>
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title_bn}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">৳{product.price}</span>
                  {product.original_price && <span className="text-muted-foreground line-through text-xs">৳{product.original_price}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/offers" className="inline-flex items-center gap-1 text-primary-foreground hover:underline text-sm font-medium">
            সব অফার দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
