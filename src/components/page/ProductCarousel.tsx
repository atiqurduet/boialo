import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSectionCard } from './ProductSectionCard';

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

interface ProductCarouselProps {
  products: ProductCardData[];
  itemsPerView?: number;
  showCartButton?: boolean;
  showWishlistButton?: boolean;
  autoplay?: boolean;
  autoplaySpeed?: number;
}

export const ProductCarousel = ({
  products,
  itemsPerView = 4,
  showCartButton = true,
  showWishlistButton = true,
}: ProductCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / itemsPerView;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!products.length) return null;

  // Calculate item width based on items per view
  const itemWidth = `calc(${100 / itemsPerView}% - ${((itemsPerView - 1) * 16) / itemsPerView}px)`;
  const mobileItemWidth = 'calc(50% - 8px)';

  return (
    <div className="relative group/carousel">
      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity bg-background shadow-lg hidden md:flex"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 opacity-0 group-hover/carousel:opacity-100 transition-opacity bg-background shadow-lg hidden md:flex"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Products Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0"
            style={{ 
              width: mobileItemWidth,
              scrollSnapAlign: 'start'
            }}
          >
            <style>{`
              @media (min-width: 768px) {
                [data-product-carousel-item="${product.id}"] {
                  width: ${itemWidth} !important;
                }
              }
            `}</style>
            <div data-product-carousel-item={product.id} style={{ width: '100%' }}>
              <ProductSectionCard
                product={product}
                showCartButton={showCartButton}
                showWishlistButton={showWishlistButton}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Scroll indicators for mobile */}
      <div className="flex justify-center gap-1 mt-4 md:hidden">
        {Array.from({ length: Math.ceil(products.length / 2) }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-muted" />
        ))}
      </div>
    </div>
  );
};
