import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SharedWishlist = () => {
  const { shareCode } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["shared-wishlist", shareCode],
    queryFn: async () => {
      if (!shareCode) return null;

      // Get shared wishlist
      const { data: shared, error } = await supabase
        .from("shared_wishlists")
        .select("*")
        .eq("share_code", shareCode)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !shared) return null;

      // Increment view count
      await supabase
        .from("shared_wishlists")
        .update({ view_count: (shared.view_count || 0) + 1 })
        .eq("id", shared.id);

      // Get user's wishlist items
      const { data: wishlistItems } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", shared.user_id);

      if (!wishlistItems?.length) return { title: shared.title, products: [] };

      const productIds = wishlistItems.map((i) => i.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("*, writer:writers(name_bn), publisher_rel:publishers(name_bn)")
        .in("id", productIds)
        .eq("is_active", true);

      const mappedProducts: Product[] = (products || []).map((p: any) => {
        const images = p.images as string[] || [];
        return {
          id: p.id,
          slug: p.slug,
          title: p.title_bn || p.title_en,
          author: p.writer?.name_bn || p.author || "অজানা লেখক",
          price: p.price,
          originalPrice: p.original_price,
          discount: p.discount_percent,
          image: images.length > 0 ? images[0] : "/placeholder.svg",
          category: p.category_id,
          publisher: p.publisher_rel?.name_bn || p.publisher,
        };
      });

      return { title: shared.title, products: mappedProducts };
    },
    enabled: !!shareCode,
  });

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <Heart className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-2xl font-bold mb-4">উইশলিস্ট পাওয়া যায়নি</h1>
            <p className="text-muted-foreground">এই শেয়ার লিংকটি অকার্যকর বা মুছে ফেলা হয়েছে</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1">{data.title}</h1>
              <p className="text-muted-foreground">{data.products.length} টি আইটেম</p>
            </div>
            {data.products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">এই উইশলিস্টে কোনো আইটেম নেই</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SharedWishlist;
