import { useState, useEffect } from "react";
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

// Fallback slides when no banners exist
const defaultSlides = [
  {
    id: "1",
    title: "ফ্ল্যাশ সেল ২০২৫",
    subtitle: "২০০+ বইতে সর্বোচ্চ",
    discount: "৭০% ছাড়!",
    bgColor: "from-primary to-primary/80",
  },
  {
    id: "2",
    title: "নতুন প্রকাশিত বই",
    subtitle: "সেরা লেখকদের",
    discount: "বিশেষ ছাড়!",
    bgColor: "from-accent to-accent/80",
  },
];

export const DynamicHeroSlider = ({ banners }: DynamicHeroSliderProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const hasBanners = banners.length > 0;
  const slideCount = hasBanners ? banners.length : defaultSlides.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideCount]);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const goToPrev = () => setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
  const goToNext = () => setCurrentSlide((prev) => (prev + 1) % slideCount);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px]">
        {hasBanners ? (
          // Dynamic banners from database
          banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {banner.link_url ? (
                <Link to={banner.link_url} className="block h-full">
                  <img
                    src={banner.image_desktop}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </Link>
              ) : (
                <img
                  src={banner.image_desktop}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))
        ) : (
          // Fallback gradient slides
          defaultSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className={`h-full bg-gradient-to-r ${slide.bgColor} flex items-center justify-center`}>
                <div className="container text-center text-primary-foreground space-y-4 animate-fade-in">
                  <p className="text-lg md:text-2xl font-medium opacity-90">{slide.subtitle}</p>
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">{slide.title}</h2>
                  <p className="text-4xl md:text-6xl lg:text-7xl font-bold">{slide.discount}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation */}
      {slideCount > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card text-foreground rounded-full p-2 md:p-3 transition-all shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card text-foreground rounded-full p-2 md:p-3 transition-all shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                  index === currentSlide ? "bg-card w-6 md:w-8" : "bg-card/50 hover:bg-card/70"
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
