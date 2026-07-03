import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { Clock, BookOpen, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { toast } from "sonner";
import { trackSubscribe } from "@/lib/analytics";

const Preorder = () => {
  const [subEmail, setSubEmail] = useState("");
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail || !subEmail.includes('@')) {
      toast.error("সঠিক ইমেইল ঠিকানা দিন");
      return;
    }
    setSubLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('subscribe_email', {
        p_email: subEmail.trim().toLowerCase(),
        p_source: 'preorder_page',
      });
      if (error) throw error;
      const status = (data as any)?.status;
      if (status === 'already_active') {
        toast.info("আপনি ইতিমধ্যে সাবস্ক্রাইব করেছেন");
      } else if (status === 'resubscribed') {
        toast.success("আবার সাবস্ক্রাইব করা হয়েছে!");
      } else if (status === 'subscribed') {
        trackSubscribe('preorder');
        toast.success("সফলভাবে সাবস্ক্রাইব করা হয়েছে!");
      } else {
        toast.error("সঠিক ইমেইল ঠিকানা দিন");
      }
      setSubEmail("");
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error("সাবস্ক্রাইব করতে সমস্যা হয়েছে");
    } finally {
      setSubLoading(false);
    }
  };
  // Fetch preorder products from database
  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ['preorder-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_bn, slug),
          writer:writers(id, name_bn, slug),
          publisher_rel:publishers(id, name_bn, slug)
        `)
        .eq('is_active', true)
        .eq('is_preorder', true)
        .order('release_date', { ascending: true });
      return data || [];
    },
  });

  // Convert database products to Product interface
  const convertDbProduct = (dbProduct: any): Product => {
    const images = dbProduct.images as string[] || [];
    let releaseDate = '';
    if (dbProduct.release_date) {
      try {
        releaseDate = format(new Date(dbProduct.release_date), 'd MMMM yyyy', { locale: bn });
      } catch {
        releaseDate = dbProduct.release_date;
      }
    }
    
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
      releaseDate: releaseDate,
    };
  };

  const preorderProducts = dbProducts.map(convertDbProduct);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-accent/80 rounded-2xl p-8 mb-8 text-accent-foreground">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent-foreground/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">প্রি-অর্ডার</h1>
              <p className="opacity-90">আগাম অর্ডার করুন, প্রথমে পান!</p>
            </div>
          </div>
          <p className="max-w-2xl opacity-90">
            নতুন প্রকাশিত হতে যাওয়া বইগুলো আগেই অর্ডার করে রাখুন। প্রকাশের সাথে সাথে আপনার কাছে পৌঁছে যাবে।
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: BookOpen,
              title: "বই নির্বাচন করুন",
              desc: "প্রি-অর্ডার তালিকা থেকে পছন্দের বই বেছে নিন",
            },
            {
              icon: Clock,
              title: "অর্ডার করুন",
              desc: "এখনই অর্ডার করুন এবং প্রথম পেতে নাম লেখান",
            },
            {
              icon: Bell,
              title: "প্রথমে পান",
              desc: "বই প্রকাশের সাথে সাথে আপনার ঠিকানায়",
            },
          ].map((step, index) => (
            <div key={index} className="bg-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Products */}
        <h2 className="text-2xl font-bold mb-6">প্রি-অর্ডার বই</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[320px] rounded-xl" />
            ))}
          </div>
        ) : preorderProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {preorderProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                {product.releaseDate && (
                  <div className="bg-muted/50 rounded-b-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1 -mt-1">
                    <Clock className="w-3 h-3" />
                    প্রকাশ: {product.releaseDate}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">বর্তমানে কোনো প্রি-অর্ডার বই নেই</p>
          </div>
        )}

        {/* Notify CTA */}
        <div className="mt-12 bg-muted/30 rounded-xl p-8 text-center">
          <Bell className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">নতুন প্রি-অর্ডারের আপডেট পান</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            নতুন কোনো বই প্রি-অর্ডারে এলে সবার আগে জানতে সাবস্ক্রাইব করুন
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="আপনার ইমেইল"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              disabled={subLoading}
            />
            <Button type="submit" disabled={subLoading}>
              {subLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'সাবস্ক্রাইব'}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Preorder;
