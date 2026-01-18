import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CountdownTimer } from "./CountdownTimer";
import { Flame, ArrowRight, Gift, Tag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Skeleton className="h-[200px] w-full rounded-2xl" />
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
        return <Tag className="w-8 h-8" />;
      case 'buy_x_get_y':
        return <Gift className="w-8 h-8" />;
      case 'free_shipping':
        return <Sparkles className="w-8 h-8" />;
      default:
        return <Flame className="w-8 h-8" />;
    }
  };

  return (
    <div className="my-8">
      <div 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground"
        style={featuredOffer.banner_image ? {
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${featuredOffer.banner_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left content */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                  {getOfferIcon()}
                </div>
                <div>
                  <div className="text-sm font-medium opacity-90">সীমিত সময়ের অফার</div>
                  <div className="text-3xl md:text-4xl font-bold">{getOfferValue()}</div>
                </div>
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                {featuredOffer.name_bn}
              </h3>
              
              {featuredOffer.description_bn && (
                <p className="text-primary-foreground/80 mb-4 max-w-lg line-clamp-2">
                  {featuredOffer.description_bn}
                </p>
              )}

              <Link to={`/offers?offer=${featuredOffer.slug}`}>
                <Button 
                  variant="secondary" 
                  size="lg"
                  className="group bg-white text-primary hover:bg-white/90"
                >
                  অফার দেখুন
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Right content - Countdown */}
            {featuredOffer.end_date && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm font-medium opacity-90">সময় বাকি আছে</div>
                <CountdownTimer 
                  endDate={featuredOffer.end_date} 
                  variant="hero"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
