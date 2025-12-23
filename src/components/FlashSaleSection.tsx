import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Flame, Clock } from "lucide-react";
import { ProductCard, Product } from "./ProductCard";

interface FlashSaleSectionProps {
  products: Product[];
}

const calculateTimeLeft = () => {
  // Set end date to December 31, 2025
  const endDate = new Date("2025-12-31T23:59:59");
  const now = new Date();
  const difference = endDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export const FlashSaleSection = ({ products }: FlashSaleSectionProps) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary text-primary-foreground w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-bold text-xl md:text-2xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <section className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-6 md:p-8 my-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-primary">ফ্ল্যাশ সেল ২০২৫</h2>
            <p className="text-sm text-muted-foreground">সর্বোচ্চ ৭০% পর্যন্ত ছাড়!</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">অফার শেষ হবে:</span>
          </div>
          <div className="flex items-center gap-2">
            <TimeBlock value={timeLeft.days} label="দিন" />
            <span className="text-2xl font-bold text-primary">:</span>
            <TimeBlock value={timeLeft.hours} label="ঘণ্টা" />
            <span className="text-2xl font-bold text-primary">:</span>
            <TimeBlock value={timeLeft.minutes} label="মিনিট" />
            <span className="text-2xl font-bold text-primary hidden sm:block">:</span>
            <div className="hidden sm:block">
              <TimeBlock value={timeLeft.seconds} label="সেকেন্ড" />
            </div>
          </div>
        </div>

        <Link
          to="/offers"
          className="text-primary font-medium hover:underline flex items-center gap-1"
        >
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.slice(0, 5).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};
