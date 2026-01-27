import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CountdownTimer } from "./CountdownTimer";
import { Flame, ArrowRight, Gift, Tag, Sparkles, Zap, Star, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface Offer {
  id: string;
  name_bn: string;
  name_en: string | null;
  slug: string;
  description_bn: string | null;
  offer_type: string;
  discount_value: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  end_date: string | null;
  banner_image: string | null;
  is_featured: boolean;
}

export const FeaturedOfferBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const { data: featuredOffer, isLoading } = useQuery({
    queryKey: ['featured-offer-banner'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as Offer | null;
    },
  });

  if (isLoading) {
    return (
      <div className="my-8">
        <Skeleton className="h-[280px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!featuredOffer) {
    return null;
  }

  const getOfferValue = () => {
    switch (featuredOffer.offer_type) {
      case 'percentage': return `${featuredOffer.discount_value}% ছাড়`;
      case 'fixed_amount': return `৳${featuredOffer.discount_value} ছাড়`;
      case 'buy_x_get_y': return `${featuredOffer.buy_quantity}টা কিনলে ${featuredOffer.get_quantity}টা ফ্রি`;
      case 'free_shipping': return 'ফ্রি ডেলিভারি';
      default: return 'বিশেষ অফার';
    }
  };

  const getOfferIcon = () => {
    switch (featuredOffer.offer_type) {
      case 'percentage':
      case 'fixed_amount':
        return <Tag className="w-7 h-7" />;
      case 'buy_x_get_y':
        return <Gift className="w-7 h-7" />;
      case 'free_shipping':
        return <Sparkles className="w-7 h-7" />;
      default:
        return <Flame className="w-7 h-7" />;
    }
  };

  return (
    <div className="my-8 perspective-1000">
      <div 
        className={`
          relative overflow-hidden rounded-3xl
          bg-gradient-to-br from-primary via-primary/95 to-accent
          text-primary-foreground shadow-2xl
          transform transition-all duration-700 ease-out
          hover:shadow-primary/25 hover:shadow-3xl
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}
        style={featuredOffer.banner_image ? {
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%), url(${featuredOffer.banner_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
        onMouseMove={handleMouseMove}
      >
        {/* Animated gradient overlay that follows mouse */}
        <div 
          className="absolute inset-0 opacity-30 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.2) 0%, transparent 50%)`
          }}
        />

        {/* Floating particles/stars animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.5}s`
              }}
            >
              <Star className="w-3 h-3 text-white/20 fill-white/10" />
            </div>
          ))}
        </div>

        {/* Large decorative circles with blur */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-white/15 to-transparent rounded-full blur-2xl animate-pulse" 
          style={{ animationDuration: '4s' }} 
        />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-accent/30 to-transparent rounded-full blur-3xl animate-pulse" 
          style={{ animationDuration: '5s', animationDelay: '1s' }} 
        />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/10" />
        <div 
          className="absolute inset-0 rounded-3xl opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            animation: 'shimmer 3s infinite'
          }}
        />

        {/* Main content */}
        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* Left content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge with animated glow */}
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 shadow-lg">
                <div className="relative">
                  <Zap className="w-4 h-4 text-accent-foreground animate-pulse" />
                  <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-50 animate-pulse" />
                </div>
                <span className="text-sm font-semibold tracking-wide">সীমিত সময়ের অফার</span>
              </div>
              
              {/* Icon and value section */}
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-5">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent to-destructive rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity animate-pulse" 
                    style={{ animationDuration: '2s' }}
                  />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-accent to-destructive rounded-2xl flex items-center justify-center shadow-xl transform transition-transform hover:scale-110 hover:rotate-3">
                    {getOfferIcon()}
                  </div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent drop-shadow-lg">
                    {getOfferValue()}
                  </div>
                </div>
              </div>
              
              {/* Title with gradient */}
              <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">
                <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
                  {featuredOffer.name_bn}
                </span>
              </h3>
              
              {/* Description */}
              {featuredOffer.description_bn && (
                <p className="text-primary-foreground/85 text-lg mb-6 max-w-lg leading-relaxed">
                  {featuredOffer.description_bn}
                </p>
              )}

              {/* CTA Button with advanced styling */}
              <Link to={`/offers?offer=${featuredOffer.slug}`}>
                <Button 
                  size="lg"
                  className="group relative overflow-hidden bg-white text-primary hover:bg-white/95 font-bold px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <ShoppingBag className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="relative">এখনই কিনুন</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Right content - Premium Countdown */}
            {featuredOffer.end_date && (
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-primary-foreground/10 backdrop-blur-lg border border-primary-foreground/20 shadow-2xl">
                <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/90">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  <span>অফার শেষ হবে</span>
                </div>
                <PremiumCountdown endDate={featuredOffer.end_date} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

// Premium Countdown Component with glassmorphism
const PremiumCountdown = ({ endDate }: { endDate: string }) => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTime(calculateTime());
    const interval = setInterval(() => setTime(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="relative group">
      {/* Glow effect behind */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-foreground/20 to-primary-foreground/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex flex-col items-center bg-gradient-to-b from-primary-foreground/15 to-primary-foreground/5 backdrop-blur-md rounded-xl px-4 py-3 min-w-[70px] border border-primary-foreground/20 shadow-inner">
        <span className="text-3xl md:text-4xl font-bold text-primary-foreground tabular-nums tracking-tight">
          {String(value).padStart(2, '0')}
        </span>
        <span className="text-xs text-primary-foreground/70 font-medium mt-1">{label}</span>
      </div>
    </div>
  );

  const Separator = () => (
    <div className="flex flex-col items-center justify-center gap-2 px-1">
      <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-pulse" />
      <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>
  );

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {time.days > 0 && (
        <>
          <TimeBlock value={time.days} label="দিন" />
          <Separator />
        </>
      )}
      <TimeBlock value={time.hours} label="ঘণ্টা" />
      <Separator />
      <TimeBlock value={time.minutes} label="মিনিট" />
      <Separator />
      <TimeBlock value={time.seconds} label="সেকেন্ড" />
    </div>
  );
};