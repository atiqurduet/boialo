import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SEOHead } from "@/components/SEOHead";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import {
  BookOpen, ChevronRight, Star, ShoppingCart, Download,
  Tablet, Eye, FileText, Calendar, BookMarked, Languages,
  Share2, Heart, Clock
} from "lucide-react";

const EbookDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("description");

  const { data: ebook, isLoading } = useQuery({
    queryKey: ["ebook-detail", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select("*")
        .eq("slug", slug)
        .eq("product_type", "ebook")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: metadata } = useQuery({
    queryKey: ["ebook-metadata", ebook?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebook_metadata")
        .select("*")
        .eq("digital_product_id", ebook!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ebook?.id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["ebook-reviews", ebook?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_product_reviews")
        .select("*")
        .eq("digital_product_id", ebook!.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!ebook?.id,
  });

  const { data: hasPurchased } = useQuery({
    queryKey: ["ebook-purchased", ebook?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_purchases")
        .select("id")
        .eq("product_id", ebook!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!ebook?.id && !!user?.id,
  });

  const { data: relatedEbooks = [] } = useQuery({
    queryKey: ["related-ebooks", ebook?.category, ebook?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_products")
        .select("id, title_bn, slug, price, cover_image, is_free, avg_rating, discount_percent, original_price")
        .eq("is_active", true)
        .eq("product_type", "ebook")
        .eq("category", ebook!.category!)
        .neq("id", ebook!.id)
        .limit(6);
      return data || [];
    },
    enabled: !!ebook?.id && !!ebook?.category,
  });

  const handleAddToCart = () => {
    if (!ebook) return;
    if (ebook.is_free) {
      toast.info("এই ই-বুকটি ফ্রি! সরাসরি ডাউনলোড করুন।");
      return;
    }
    addToCart(ebook.id, 1);
    toast.success("কার্টে যোগ করা হয়েছে!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Skeleton className="aspect-[3/4] rounded-xl" />
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-20 text-center">
          <BookOpen className="w-20 h-20 mx-auto text-muted-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold mb-2">ই-বুক পাওয়া যায়নি</h1>
          <p className="text-muted-foreground mb-6">এই ই-বুকটি বর্তমানে উপলব্ধ নেই।</p>
          <Link to="/ebooks">
            <Button>সব ই-বুক দেখুন</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const hasDiscount = ebook.discount_percent && ebook.discount_percent > 0;
  const rating = ebook.avg_rating ?? 0;
  const galleryImages = Array.isArray(ebook.gallery_images) ? (ebook.gallery_images as string[]) : [];
  const allImages = [ebook.cover_image, ...galleryImages].filter(Boolean) as string[];
  const toc = metadata?.table_of_contents as any[] | null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ebook.title_bn} | ই-বুক | BoiAlo`}
        description={ebook.meta_description || ebook.description_bn?.slice(0, 160) || ""}
      />
      <AnnouncementBar />
      <Header />

      <main className="container py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-5 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/ebooks" className="hover:text-primary transition-colors">ই-বুক</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium line-clamp-1">{ebook.title_bn}</span>
        </nav>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
          {/* Left: Cover Image */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <img
                src={ebook.cover_image || "/placeholder.svg"}
                alt={ebook.title_bn}
                className="w-full h-full object-cover"
              />
              {hasDiscount && (
                <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded-full">
                  -{ebook.discount_percent}%
                </div>
              )}
              {ebook.is_free && (
                <div className="absolute top-3 left-3 bg-emerald-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  ফ্রি
                </div>
              )}
            </div>

            {/* Gallery thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-16 h-20 object-cover rounded-lg border cursor-pointer hover:ring-2 ring-primary transition-all"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-1">
                {ebook.title_bn}
              </h1>
              {ebook.title_en && (
                <p className="text-muted-foreground text-base">{ebook.title_en}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Tablet className="w-3 h-3" />
                {ebook.file_format?.toUpperCase() || "ই-বুক"}
              </Badge>
              {ebook.category && <Badge variant="outline">{ebook.category}</Badge>}
              {metadata?.language && (
                <Badge variant="outline" className="gap-1">
                  <Languages className="w-3 h-3" />
                  {metadata.language}
                </Badge>
              )}
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({ebook.review_count || 0} রিভিউ)</span>
              </div>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {metadata?.author && (
                <div className="flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4" />
                  <span>লেখক: <strong className="text-foreground">{metadata.author}</strong></span>
                </div>
              )}
              {metadata?.publisher && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>প্রকাশক: <strong className="text-foreground">{metadata.publisher}</strong></span>
                </div>
              )}
              {metadata?.page_count && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>{metadata.page_count} পৃষ্ঠা</span>
                </div>
              )}
              {metadata?.publish_year && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{metadata.publish_year}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-baseline gap-3">
                {ebook.is_free ? (
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">ফ্রি</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-primary">৳{ebook.price}</span>
                    {ebook.original_price && ebook.original_price > ebook.price && (
                      <span className="text-lg text-muted-foreground line-through">৳{ebook.original_price}</span>
                    )}
                    {hasDiscount && (
                      <Badge variant="destructive" className="text-xs">{ebook.discount_percent}% ছাড়</Badge>
                    )}
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                {(ebook.total_sales ?? 0) > 0 && <span>{ebook.total_sales} বার বিক্রি</span>}
                {(ebook.total_downloads ?? 0) > 0 && <span>{ebook.total_downloads} ডাউনলোড</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {hasPurchased || ebook.is_free ? (
                <Button size="lg" className="gap-2 flex-1 min-w-[200px]">
                  <Download className="w-5 h-5" />
                  {ebook.is_free ? "ফ্রি ডাউনলোড" : "ডাউনলোড করুন"}
                </Button>
              ) : (
                <Button size="lg" onClick={handleAddToCart} className="gap-2 flex-1 min-w-[200px]">
                  <ShoppingCart className="w-5 h-5" />
                  কার্টে যোগ করুন
                </Button>
              )}
              <Button variant="outline" size="lg" className="gap-2">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* File info */}
            {ebook.file_size_mb && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                ফাইল সাইজ: {ebook.file_size_mb} MB
                {ebook.file_format && ` • ${ebook.file_format.toUpperCase()}`}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="description" className="rounded-lg">বিবরণ</TabsTrigger>
            {toc && toc.length > 0 && (
              <TabsTrigger value="toc" className="rounded-lg">সূচিপত্র</TabsTrigger>
            )}
            {ebook.preview_url && (
              <TabsTrigger value="preview" className="rounded-lg gap-1">
                <Eye className="w-3.5 h-3.5" /> প্রিভিউ
              </TabsTrigger>
            )}
            <TabsTrigger value="reviews" className="rounded-lg">
              রিভিউ ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {ebook.description_bn ? (
                <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
                  {ebook.description_bn}
                </div>
              ) : (
                <p className="text-muted-foreground">কোনো বিবরণ যোগ করা হয়নি।</p>
              )}
            </div>
          </TabsContent>

          {toc && toc.length > 0 && (
            <TabsContent value="toc" className="mt-6">
              <div className="space-y-2">
                {toc.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium">{item.title || item.name || item}</span>
                    {item.page && <span className="ml-auto text-xs text-muted-foreground">পৃষ্ঠা {item.page}</span>}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {ebook.preview_url && (
            <TabsContent value="preview" className="mt-6">
              <SecurePdfViewer url={ebook.preview_url} title={ebook.title_bn} />
            </TabsContent>
          )}

          <TabsContent value="reviews" className="mt-6">
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">এখনো কোনো রিভিউ নেই</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("bn-BD")}
                      </span>
                    </div>
                    {review.review_text && <p className="text-sm text-foreground/80">{review.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Related Ebooks */}
        {relatedEbooks.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold mb-5">সম্পর্কিত ই-বুক</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedEbooks.map((item: any) => (
                <Link key={item.id} to={`/ebooks/${item.slug}`} className="group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border bg-muted/30 mb-2">
                    <img src={item.cover_image || "/placeholder.svg"} alt={item.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.title_bn}</h3>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {item.is_free ? "ফ্রি" : `৳${item.price}`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EbookDetail;
