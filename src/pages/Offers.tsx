import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, Product } from "@/components/ProductCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Flame, Tag, Ticket, Filter, ChevronDown, Copy, Gift, ArrowUpDown, Percent } from "lucide-react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Offer {
  id: string;
  name_bn: string;
  name_en: string | null;
  slug: string;
  description_bn: string | null;
  offer_type: string;
  discount_value: number;
  buy_quantity: number;
  get_quantity: number;
  min_order_amount: number;
  end_date: string | null;
  is_featured: boolean;
  banner_image: string | null;
  applies_to: string;
  category_ids: string[];
  product_ids: string[];
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  end_date: string | null;
  is_active: boolean;
}

const Offers = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [showCoupons, setShowCoupons] = useState(true);
  const [discountRange, setDiscountRange] = useState<string>("all");
  const [sortByDiscount, setSortByDiscount] = useState<string>("highest");
  const { toast } = useToast();

  // Set selected offer from URL
  useEffect(() => {
    const offerSlug = searchParams.get('offer');
    if (offerSlug) {
      setSelectedOffer(offerSlug);
    }
  }, [searchParams]);

  // Fetch active offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['active-offers'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      return (data || []) as Offer[];
    },
  });

  // Fetch active coupons
  const { data: coupons = [] } = useQuery({
    queryKey: ['active-coupons'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('discount_value', { ascending: false });
      return (data || []) as Coupon[];
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['offer-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_bn, slug')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  // Fetch products with discounts from database
  const { data: dbProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['offer-products', selectedCategory, selectedOffer],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_bn, slug),
          writer:writers(id, name_bn, slug),
          publisher_rel:publishers(id, name_bn, slug)
        `)
        .eq('is_active', true)
        .gt('discount_percent', 0)
        .order('discount_percent', { ascending: false });

      // Filter by category
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Filter by selected offer
      if (selectedOffer) {
        const offer = offers.find(o => o.slug === selectedOffer);
        if (offer) {
          if (offer.applies_to === 'specific_products' && offer.product_ids?.length) {
            query = query.in('id', offer.product_ids);
          } else if (offer.applies_to === 'specific_categories' && offer.category_ids?.length) {
            query = query.in('category_id', offer.category_ids);
          }
        }
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !offersLoading,
  });

  // Convert database products to Product interface
  const convertDbProduct = (dbProduct: any): Product => {
    const images = dbProduct.images as string[] || [];
    return {
      id: dbProduct.id,
      slug: dbProduct.slug,
      title: dbProduct.title_bn || dbProduct.title_en,
      author: dbProduct.writer?.name_bn || dbProduct.author || 'অজানা লেখক',
      price: dbProduct.price,
      originalPrice: dbProduct.original_price,
      discount: dbProduct.discount_percent,
      image: images.length > 0 ? images[0] : '/placeholder.svg',
      category: dbProduct.category?.slug || dbProduct.category_id,
      publisher: dbProduct.publisher_rel?.name_bn || dbProduct.publisher,
      isPreorder: dbProduct.is_preorder,
      releaseDate: dbProduct.release_date,
    };
  };

  // Apply discount range filter and sorting
  const offerProducts = useMemo(() => {
    let products = dbProducts.map(convertDbProduct);
    
    // Filter by discount range
    if (discountRange !== 'all') {
      const [min, max] = discountRange.split('-').map(Number);
      products = products.filter(p => {
        const d = p.discount || 0;
        return max ? (d >= min && d < max) : (d >= min);
      });
    }

    // Sort
    if (sortByDiscount === 'highest') {
      products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else if (sortByDiscount === 'lowest') {
      products.sort((a, b) => (a.discount || 0) - (b.discount || 0));
    } else if (sortByDiscount === 'price-low') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortByDiscount === 'price-high') {
      products.sort((a, b) => b.price - a.price);
    }

    return products;
  }, [dbProducts, discountRange, sortByDiscount]);

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'কপি হয়েছে!', description: `কুপন কোড "${code}" কপি হয়েছে` });
  };

  const getOfferValue = (offer: Offer) => {
    switch (offer.offer_type) {
      case 'percentage': return `${offer.discount_value}% ছাড়`;
      case 'fixed_amount': return `৳${offer.discount_value} ছাড়`;
      case 'buy_x_get_y': return `${offer.buy_quantity}টা কিনলে ${offer.get_quantity}টা ফ্রি`;
      case 'free_shipping': return 'ফ্রি ডেলিভারি';
      default: return '';
    }
  };

  const isLoading = offersLoading || productsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 mb-8 text-primary-foreground">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">আজকের অফার</h1>
              <p className="opacity-90">সর্বোচ্চ ৭০% পর্যন্ত ছাড়!</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>{offers.length} টি অফার</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span>{offerProducts.length} টি পণ্য</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              <span>{coupons.length} টি কুপন কোড</span>
            </div>
          </div>
        </div>

        {/* Active Coupons Section */}
        {coupons.length > 0 && (
          <Collapsible open={showCoupons} onOpenChange={setShowCoupons} className="mb-8">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between mb-4">
                <span className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  কুপন কোড ({coupons.length})
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showCoupons ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {coupons.map((coupon) => (
                  <Card key={coupon.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {coupon.discount_type === 'percentage' 
                              ? `${coupon.discount_value}% ছাড়` 
                              : `৳${coupon.discount_value} ছাড়`}
                          </div>
                          {coupon.min_order_amount > 0 && (
                            <div className="text-sm text-muted-foreground">
                              ৳{coupon.min_order_amount}+ অর্ডারে
                            </div>
                          )}
                          {coupon.end_date && (
                            <div className="mt-2">
                              <CountdownTimer 
                                endDate={coupon.end_date} 
                                variant="badge" 
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <code className="bg-muted px-3 py-1 rounded font-mono text-sm font-bold">
                            {coupon.code}
                          </code>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => copyCouponCode(coupon.code)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            কপি
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Featured Offers */}
        {offers.filter(o => o.is_featured).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              বিশেষ অফার
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.filter(o => o.is_featured).map((offer) => (
                <Card 
                  key={offer.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedOffer === offer.slug ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedOffer(selectedOffer === offer.slug ? null : offer.slug)}
                >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-primary">
                          {getOfferValue(offer)}
                        </Badge>
                        {offer.end_date && (
                          <CountdownTimer 
                            endDate={offer.end_date} 
                            variant="compact" 
                          />
                        )}
                      </div>
                    <h3 className="font-bold">{offer.name_bn}</h3>
                    {offer.description_bn && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {offer.description_bn}
                      </p>
                    )}
                    {offer.min_order_amount > 0 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        ৳{offer.min_order_amount}+ অর্ডারে প্রযোজ্য
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Filters Row */}
         <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="ক্যাটাগরি" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={discountRange} onValueChange={setDiscountRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="ছাড়ের পরিমাণ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ছাড়</SelectItem>
                <SelectItem value="50-0">৫০%+ ছাড়</SelectItem>
                <SelectItem value="40-50">৪০-৫০% ছাড়</SelectItem>
                <SelectItem value="20-40">২০-৪০% ছাড়</SelectItem>
                <SelectItem value="10-20">১০-২০% ছাড়</SelectItem>
                <SelectItem value="1-10">১০% এর নিচে</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortByDiscount} onValueChange={setSortByDiscount}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="সর্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highest">সর্বোচ্চ ছাড় আগে</SelectItem>
                <SelectItem value="lowest">সর্বনিম্ন ছাড় আগে</SelectItem>
                <SelectItem value="price-low">মূল্য: কম → বেশি</SelectItem>
                <SelectItem value="price-high">মূল্য: বেশি → কম</SelectItem>
              </SelectContent>
            </Select>

            {selectedOffer && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer"
                onClick={() => setSelectedOffer(null)}
              >
                {offers.find(o => o.slug === selectedOffer)?.name_bn} ✕
              </Badge>
            )}
          </div>
        </div>

        {/* Offer Discount Range Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "৫০%+", range: "50-0", count: dbProducts.filter(p => (p.discount_percent || 0) >= 50).length },
            { label: "৪০-৫০%", range: "40-50", count: dbProducts.filter(p => { const d = p.discount_percent || 0; return d >= 40 && d < 50; }).length },
            { label: "২০-৪০%", range: "20-40", count: dbProducts.filter(p => { const d = p.discount_percent || 0; return d >= 20 && d < 40; }).length },
            { label: "১০-২০%", range: "10-20", count: dbProducts.filter(p => { const d = p.discount_percent || 0; return d >= 10 && d < 20; }).length },
            { label: "<১০%", range: "1-10", count: dbProducts.filter(p => { const d = p.discount_percent || 0; return d >= 1 && d < 10; }).length },
          ].map((item) => (
            <button
              key={item.range}
              onClick={() => setDiscountRange(discountRange === item.range ? 'all' : item.range)}
              className={cn(
                "bg-card rounded-xl p-4 text-center hover:shadow-lg transition-all cursor-pointer border",
                discountRange === item.range ? "ring-2 ring-primary border-primary" : "border-border"
              )}
            >
              <div className="text-2xl font-bold text-primary mb-1">{item.count}</div>
              <p className="font-medium text-sm">{item.label} ছাড়</p>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {offerProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!isLoading && offerProducts.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedOffer || selectedCategory !== 'all' 
                ? 'এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি' 
                : 'বর্তমানে কোনো অফার নেই'}
            </p>
            {(selectedOffer || selectedCategory !== 'all') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSelectedOffer(null);
                  setSelectedCategory('all');
                }}
              >
                সব অফার দেখুন
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Offers;