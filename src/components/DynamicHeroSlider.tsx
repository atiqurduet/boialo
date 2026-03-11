import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Banner {
  id: string;
  title: string;
  image_desktop: string;
  image_mobile: string | null;
  link_url: string | null;
}

interface DynamicHeroSliderProps {
  banners: Banner[];
}

const defaultSlides = [
  {
    id: "1",
    title: "ফ্ল্যাশ সেল ২০২৫",
    subtitle: "২০০+ বইতে সর্বোচ্চ",
    discount: "৭০% ছাড়!",
    bgColor: "from-primary via-primary/90 to-rose-700",
  },
  {
    id: "2",
    title: "নতুন প্রকাশিত বই",
    subtitle: "সেরা লেখকদের",
    discount: "বিশেষ ছাড়!",
    bgColor: "from-emerald-600 via-emerald-500 to-teal-600",
  },
  {
    id: "3",
    title: "ইসলামিক বই",
    subtitle: "বিশ্বস্ত প্রকাশনীর",
    discount: "৫০% পর্যন্ত ছাড়",
    bgColor: "from-indigo-700 via-indigo-600 to-purple-700",
  },
];

export const DynamicHeroSlider = ({ banners }: DynamicHeroSliderProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number>(0);
  const hasBanners = banners.length > 0;
  const slideCount = hasBanners ? banners.length : defaultSlides.length;

  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideCount);
    }, 5000);
  }, [slideCount]);

  useEffect(() => {
    startAutoplay();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startAutoplay]);

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    startAutoplay();
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToPrev = () => goToSlide((currentSlide - 1 + slideCount) % slideCount);
  const goToNext = () => goToSlide((currentSlide + 1) % slideCount);

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goToNext() : goToPrev();
    }
  };

  return (
    <section 
      className="relative overflow-hidden bg-muted"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[200px] sm:h-[300px] md:h-[380px] lg:h-[440px] xl:h-[480px]">
        {hasBanners ? (
          banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentSlide 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-[1.02] pointer-events-none"
              }`}
            >
              {banner.link_url ? (
                <Link to={banner.link_url} className="block h-full">
                  <picture>
                    {banner.image_mobile && (
                      <source media="(max-width: 640px)" srcSet={banner.image_mobile} />
                    )}
                    <img
                      src={banner.image_desktop}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </picture>
                </Link>
              ) : (
                <picture>
                  {banner.image_mobile && (
                    <source media="(max-width: 640px)" srcSet={banner.image_mobile} />
                  )}
                  <img
                    src={banner.image_desktop}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </picture>
              )}
            </div>
          ))
        ) : (
          defaultSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentSlide 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-[1.02] pointer-events-none"
              }`}
            >
              <div className={`h-full bg-gradient-to-br ${slide.bgColor} flex items-center`}>
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />
                </div>
                <div className="container relative z-10">
                  <div className="max-w-2xl text-white space-y-3 md:space-y-5 px-4 md:px-0">
                    <p className="text-base md:text-xl font-medium opacity-90 tracking-wide">
                      {slide.subtitle}
                    </p>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                      {slide.title}
                    </h2>
                    <p className="text-4xl md:text-6xl lg:text-7xl font-extrabold drop-shadow-lg">
                      {slide.discount}
                    </p>
                    <div className="pt-2">
                      <Link 
                        to="/shop" 
                        className="inline-flex items-center gap-2 bg-white text-foreground px-6 py-3 rounded-full font-semibold text-sm md:text-base hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        এখনই কিনুন
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Gradient overlay at bottom for dots visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Navigation */}
      {slideCount > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-foreground rounded-full p-2.5 md:p-3 transition-all shadow-lg hover:shadow-xl hover:scale-110 backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-foreground rounded-full p-2.5 md:p-3 transition-all shadow-lg hover:shadow-xl hover:scale-110 backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? "bg-white w-8 h-2.5 shadow-lg" 
                    : "bg-white/50 hover:bg-white/70 w-2.5 h-2.5"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
