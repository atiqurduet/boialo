import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock } from "lucide-react";

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

interface DynamicUniversalFlashSaleProps {
  products: UniversalProduct[];
  title?: string;
  endTime?: Date;
  viewAllLink?: string;
}

export const DynamicUniversalFlashSale = ({ 
  products, 
  title = "ফ্ল্যাশ সেল",
  endTime,
  viewAllLink = "/lifestyle"
}: DynamicUniversalFlashSaleProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

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
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="text-white">
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm opacity-80">সীমিত সময়ের জন্য</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            <div className="flex gap-1">
              <span className="bg-white/20 px-2 py-1 rounded font-mono text-lg">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-xl">:</span>
              <span className="bg-white/20 px-2 py-1 rounded font-mono text-lg">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-xl">:</span>
              <span className="bg-white/20 px-2 py-1 rounded font-mono text-lg">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/universal-product/${product.slug}`}
              className="bg-card rounded-lg overflow-hidden group hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square">
                <img
                  src={getProductImage(product)}
                  alt={product.name_bn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {product.discount_percent && product.discount_percent > 0 && (
                  <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
                    -{product.discount_percent}%
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name_bn}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
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

        <div className="mt-4 text-center">
          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1 text-white hover:underline text-sm font-medium"
          >
            সব অফার দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};