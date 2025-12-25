import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImageGalleryProps {
  images: string[];
  title: string;
  discount?: number;
}

export const ProductImageGallery = ({ images, title, discount }: ProductImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasDiscount = discount && discount > 0;
  
  // Fallback to placeholder if no images
  const displayImages = images.length > 0 ? images : ['/placeholder.svg'];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative group">
        <p className="text-xs text-primary mb-2 cursor-pointer hover:underline">
          ভিতরে কী আছে পড়তে বইয়ের ছবিতে ক্লিক করুন
        </p>
        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative">
          <img
            src={displayImages[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          
          {/* Navigation Arrows */}
          {displayImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
          
          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-bold">
              {discount}% OFF
            </div>
          )}
          
          {/* Image Counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
              {currentIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-16 h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={image}
                alt={`${title} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot Indicators (for mobile) */}
      {displayImages.length > 1 && displayImages.length <= 6 && (
        <div className="flex justify-center gap-2 md:hidden">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary w-4'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
