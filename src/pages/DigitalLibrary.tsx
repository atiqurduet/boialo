import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, BookOpen, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const DigitalLibrary = () => {
  const { user } = useAuth();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["digital-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("digital_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch product details for each purchase
  const { data: products = [] } = useQuery({
    queryKey: ["digital-products", purchases.map((p: any) => p.product_id)],
    queryFn: async () => {
      if (purchases.length === 0) return [];
      const productIds = purchases.map((p: any) => p.product_id);
      const { data } = await supabase
        .from("products")
        .select("id, title_bn, title_en, images, is_digital, digital_file_url, digital_file_name")
        .in("id", productIds);
      return data || [];
    },
    enabled: purchases.length > 0,
  });

  const handleDownload = (product: any, purchase: any) => {
    if (purchase.download_count >= purchase.max_downloads) {
      toast.error("ডাউনলোড সীমা শেষ হয়ে গেছে");
      return;
    }

    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      toast.error("ডাউনলোড মেয়াদ শেষ হয়ে গেছে");
      return;
    }

    if (product.digital_file_url) {
      // Increment download count
      supabase
        .from("digital_purchases")
        .update({ download_count: purchase.download_count + 1 })
        .eq("id", purchase.id)
        .then();

      window.open(product.digital_file_url, "_blank");
    } else {
      toast.error("ফাইল পাওয়া যায়নি");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">লগইন করুন</h2>
          <p className="text-muted-foreground mb-4">আপনার ডিজিটাল লাইব্রেরি দেখতে লগইন করুন</p>
          <Link to="/signin">
            <Button>লগইন করুন</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ডিজিটাল লাইব্রেরি</span>
        </nav>

        <h1 className="text-2xl font-bold mb-6">আমার ডিজিটাল লাইব্রেরি</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>এখনো কোনো ডিজিটাল পণ্য কেনা হয়নি</p>
            <Link to="/shop" className="text-primary hover:underline mt-2 inline-block">
              শপে যান
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase: any) => {
              const product = products.find((p: any) => p.id === purchase.product_id);
              if (!product) return null;
              const images = (product.images as string[]) || [];
              const isExpired = purchase.expires_at && new Date(purchase.expires_at) < new Date();
              const limitReached = purchase.download_count >= purchase.max_downloads;

              return (
                <div key={purchase.id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={images[0] || "/placeholder.svg"}
                      alt={product.title_bn}
                      className="w-20 h-28 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-2">{product.title_bn || product.title_en}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        ডাউনলোড: {purchase.download_count}/{purchase.max_downloads}
                      </p>
                      {isExpired && <Badge variant="destructive" className="mt-1 text-[10px]">মেয়াদ শেষ</Badge>}
                      {limitReached && !isExpired && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">সীমা পূর্ণ</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    size="sm"
                    disabled={isExpired || limitReached}
                    onClick={() => handleDownload(product, purchase)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    ডাউনলোড করুন
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DigitalLibrary;
