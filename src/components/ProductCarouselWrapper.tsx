import { useCallback, useEffect, useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';

interface ProductCarouselWrapperProps {
  children: ReactNode[];
  columns?: number;
  className?: string;
}

export const ProductCarouselWrapper = ({
  children,
  columns = 5,
  className,
}: ProductCarouselWrapperProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 2,
    containScroll: 'trimSnaps',
    loop: false,
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
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

  // Calculate slide width percentages for different columns
  const getSlideStyle = () => {
    // Mobile always 50%, then scale based on columns
    const desktopWidth = 100 / columns;
    return {
      flex: `0 0 50%`,
      // We'll use CSS media queries via className instead
    };
  };

  const slideClasses = cn(
    'min-w-0 shrink-0 pl-3 first:pl-0',
    {
      'basis-1/2 md:basis-1/3 lg:basis-1/2': columns === 2,
      'basis-1/2 md:basis-1/3': columns === 3,
      'basis-1/2 md:basis-1/3 lg:basis-1/4': columns === 4,
      'basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5': columns === 5,
      'basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-[16.666%]': columns === 6,
      'basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-[14.285%]': columns === 7,
      'basis-1/2 md:basis-1/4 lg:basis-[16.666%] xl:basis-[12.5%]': columns === 8,
    }
  );

  if (!children || children.length === 0) return null;

  return (
    <div className={cn("relative group/carousel", className)}>
      {/* Navigation Buttons */}
      {canScrollPrev && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 bg-background shadow-lg hidden md:flex h-9 w-9 rounded-full"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollNext && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 bg-background shadow-lg hidden md:flex h-9 w-9 rounded-full"
          onClick={scrollNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Carousel Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-3 first:ml-0">
          {children.map((child, index) => (
            <div key={index} className={slideClasses}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
