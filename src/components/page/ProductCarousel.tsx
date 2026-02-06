import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSectionCard } from './ProductSectionCard';
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  autoplay = false,
  autoplaySpeed = 5000,
}: ProductCarouselProps) => {
  const isMobile = useIsMobile();
  const slidesToShow = isMobile ? 2 : itemsPerView;
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
    loop: false,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || !emblaApi) return;
    const interval = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, autoplaySpeed);
    return () => clearInterval(interval);
  }, [autoplay, autoplaySpeed, emblaApi]);

  if (!products.length) return null;

  // Calculate slide width based on items per view
  const slideWidth = 100 / slidesToShow;
  const scrollSnaps = emblaApi?.scrollSnapList() || [];

  return (
    <div className="relative group/carousel">
      {/* Navigation Buttons */}
      {canScrollPrev && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-background shadow-lg hidden md:flex"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollNext && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-background shadow-lg hidden md:flex"
          onClick={scrollNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Products Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-0 shrink-0 px-2"
              style={{ flex: `0 0 ${slideWidth}%` }}
            >
              <ProductSectionCard
                product={product}
                showCartButton={showCartButton}
                showWishlistButton={showWishlistButton}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicators */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === selectedIndex 
                  ? 'bg-primary w-6' 
                  : 'bg-muted hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
