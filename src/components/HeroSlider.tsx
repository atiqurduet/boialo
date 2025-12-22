import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: 1,
    title: "ফ্ল্যাশ সেল ২০২৫",
    subtitle: "২০০+ বইতে সর্বোচ্চ",
    discount: "৭০% ছাড়!",
    date: "১৮-৩১ ডিসেম্বর",
    bgColor: "from-primary to-primary/80",
    textColor: "text-primary-foreground",
  },
  {
    id: 2,
    title: "নতুন প্রকাশিত বই",
    subtitle: "সেরা লেখকদের",
    discount: "বিশেষ ছাড়!",
    date: "সীমিত সময়ের জন্য",
    bgColor: "from-accent to-accent/80",
    textColor: "text-accent-foreground",
  },
  {
    id: 3,
    title: "ইসলামিক বই",
    subtitle: "বিশ্বস্ত প্রকাশনীর",
    discount: "৫০% পর্যন্ত ছাড়",
    date: "এখনই অর্ডার করুন",
    bgColor: "from-wafilife-dark to-foreground/90",
    textColor: "text-primary-foreground",
  },
];

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[250px] sm:h-[350px] md:h-[400px] lg:h-[450px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className={`h-full bg-gradient-to-r ${slide.bgColor} flex items-center justify-center`}
            >
              <div className="container text-center">
                <div className={`${slide.textColor} space-y-2 md:space-y-4 animate-fade-in`}>
                  <p className="text-lg md:text-2xl font-medium opacity-90">
                    {slide.subtitle}
                  </p>
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold">
                    {slide.title}
                  </h2>
                  <p className="text-4xl md:text-6xl lg:text-7xl font-bold">
                    {slide.discount}
                  </p>
                  <p className="text-sm md:text-lg opacity-80">{slide.date}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
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

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-card w-6 md:w-8"
                : "bg-card/50 hover:bg-card/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
