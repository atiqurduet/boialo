import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SEOHead } from "@/components/SEOHead";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { SocialShare } from "@/components/SocialShare";
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
  Share2, Heart, Shield, CheckCircle, Clock, Users,
  Headphones, Hash, Layers, Award
} from "lucide-react";
import { cn } from "@/lib/utils";

const EbookDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("description");
  const [selectedImage, setSelectedImage] = useState(0);

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
        .select("id, title_bn, slug, price, cover_image, is_free, avg_rating, discount_percent, original_price, file_format, total_sales")
        .eq("is_active", true)
        .eq("product_type", "ebook")
        .eq("category", ebook!.category!)
        .neq("id", ebook!.id)
        .limit(8);
      return data || [];
    },
    enabled: !!ebook?.id && !!ebook?.category,
  });

  const handleAddToCart = () => {
    if (!ebook) return;
    if (ebook.is_free) {
      handleDownload();
      return;
    }
    addToCart(ebook.id, 1);
    toast.success("কার্টে যোগ করা হয়েছে!");
  };

  const handleDownload = async () => {
    if (!ebook) return;

    if (ebook.is_free) {
      if (!user) {
        toast.error("ডাউনলোড করতে লগইন করুন");
        return;
      }
      if (!hasPurchased) {
        await supabase.from("digital_purchases").insert({
          user_id: user.id,
          product_id: ebook.id,
          product_type: "ebook",
          max_downloads: ebook.max_downloads || 5,
        });
      }
    }

    if (ebook.file_url) {
      if (user && hasPurchased) {
        const { data: purchase } = await supabase
          .from("digital_purchases")
          .select("id, download_count, max_downloads, expires_at")
          .eq("product_id", ebook.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (purchase) {
          if (purchase.max_downloads && purchase.download_count >= purchase.max_downloads) {
            toast.error("ডাউনলোড সীমা শেষ হয়ে গেছে");
            return;
          }
          if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
            toast.error("ডাউনলোড মেয়াদ শেষ হয়ে গেছে");
            return;
          }
          await supabase
            .from("digital_purchases")
            .update({ download_count: (purchase.download_count || 0) + 1 })
            .eq("id", purchase.id);
        }
      }
      // Use fetch to download without exposing URL
      try {
        const response = await fetch(ebook.file_url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = ebook.file_name || `${ebook.slug}.${ebook.file_format || "pdf"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("ডাউনলোড শুরু হয়েছে");
      } catch {
        toast.error("ডাউনলোড করতে সমস্যা হয়েছে");
      }
    } else {
      toast.error("ফাইল পাওয়া যায়নি");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="aspect-[3/4] rounded-xl" />
            </div>
            <div className="md:col-span-3 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
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
          <BookOpen className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">ই-বুক পাওয়া যায়নি</h1>
          <p className="text-muted-foreground mb-6">এই ই-বুকটি বর্তমানে উপলব্ধ নেই।</p>
          <Link to="/ebooks"><Button>সব ই-বুক দেখুন</Button></Link>
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
  const savingsAmount = ebook.original_price && ebook.original_price > ebook.price
    ? ebook.original_price - ebook.price : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ebook.title_bn} | ই-বুক | BoiAlo`}
        description={ebook.meta_description || ebook.description_bn?.slice(0, 160) || ""}
      />
      <AnnouncementBar />
      <Header />

      <main className="container py-5 md:py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-5 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/ebooks" className="hover:text-primary transition-colors">ই-বুক</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {ebook.category && (
            <>
              <Link to={`/ebooks?category=${ebook.category}`} className="hover:text-primary transition-colors">
                {ebook.category}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          <span className="text-foreground font-medium line-clamp-1">{ebook.title_bn}</span>
        </nav>

        {/* Main Content - 2 column layout */}
        <div className="grid md:grid-cols-5 gap-6 lg:gap-10">
          {/* Left: Cover Image Gallery */}
          <div className="md:col-span-2 space-y-3">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border bg-muted/20 shadow-sm">
              <img
                src={allImages[selectedImage] || "/placeholder.svg"}
                alt={ebook.title_bn}
                className="w-full h-full object-cover"
              />
              {hasDiscount && (
                <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded-full shadow-md">
                  -{ebook.discount_percent}%
                </div>
              )}
              {ebook.is_free && (
                <Badge className="absolute top-3 left-3 bg-emerald-600 text-white text-sm px-3 py-1 shadow-md">ফ্রি</Badge>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "w-16 h-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all",
                      selectedImage === i ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span>নিরাপদ পেমেন্ট</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs">
                <Download className="w-4 h-4 text-primary shrink-0" />
                <span>তাৎক্ষণিক ডাউনলোড</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs">
                <Tablet className="w-4 h-4 text-primary shrink-0" />
                <span>সব ডিভাইসে পড়ুন</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span>আজীবন অ্যাক্সেস</span>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="md:col-span-3 space-y-5">
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-1">
                {ebook.title_bn}
              </h1>
              {ebook.title_en && (
                <p className="text-muted-foreground text-base">{ebook.title_en}</p>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Tablet className="w-3 h-3" />
                {ebook.file_format?.toUpperCase() || "ই-বুক"}
              </Badge>
              {ebook.category && (
                <Link to={`/ebooks?category=${ebook.category}`}>
                  <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">{ebook.category}</Badge>
                </Link>
              )}
              {metadata?.language && (
                <Badge variant="outline" className="gap-1">
                  <Languages className="w-3 h-3" /> {metadata.language}
                </Badge>
              )}
              {metadata?.edition && (
                <Badge variant="outline" className="gap-1">
                  <Layers className="w-3 h-3" /> {metadata.edition}
                </Badge>
              )}
              {metadata?.has_audio && (
                <Badge variant="outline" className="gap-1">
                  <Headphones className="w-3 h-3" /> অডিওবুক
                </Badge>
              )}
            </div>

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-5 h-5", i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                  ))}
                </div>
                <span className="text-base font-semibold">{rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({ebook.review_count || 0} রিভিউ)</span>
              </div>
            )}

            {/* Author/Publisher metadata */}
            <div className="bg-muted/30 rounded-xl p-4 border space-y-2.5">
              {metadata?.author && (
                <div className="flex items-center gap-2 text-sm">
                  <BookMarked className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">লেখক:</span>
                  <strong className="text-foreground">{metadata.author}</strong>
                </div>
              )}
              {metadata?.translator && (
                <div className="flex items-center gap-2 text-sm">
                  <Languages className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">অনুবাদক:</span>
                  <strong className="text-foreground">{metadata.translator}</strong>
                </div>
              )}
              {metadata?.publisher && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">প্রকাশক:</span>
                  <strong className="text-foreground">{metadata.publisher}</strong>
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground pt-1">
                {metadata?.page_count && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> {metadata.page_count} পৃষ্ঠা
                  </span>
                )}
                {metadata?.publish_year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {metadata.publish_year}
                  </span>
                )}
                {metadata?.isbn && (
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> ISBN: {metadata.isbn}
                  </span>
                )}
                {ebook.file_size_mb && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {ebook.file_size_mb} MB
                  </span>
                )}
              </div>
            </div>

            {/* Price card */}
            <div className="bg-card rounded-xl p-5 border shadow-sm">
              <div className="flex items-baseline gap-3 mb-1">
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
              {savingsAmount > 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                  আপনি সাশ্রয় করছেন ৳{savingsAmount}
                </p>
              )}

              {/* Stats */}
              <div className="flex gap-5 text-xs text-muted-foreground mb-4">
                {(ebook.total_sales ?? 0) > 0 && (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ebook.total_sales} বিক্রি</span>
                )}
                {(ebook.total_downloads ?? 0) > 0 && (
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {ebook.total_downloads} ডাউনলোড</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {hasPurchased || ebook.is_free ? (
                  <Button size="lg" onClick={handleDownload} className="gap-2 flex-1">
                    <Download className="w-5 h-5" />
                    {ebook.is_free ? "ফ্রি ডাউনলোড" : "ডাউনলোড করুন"}
                  </Button>
                ) : (
                  <Button size="lg" onClick={handleAddToCart} className="gap-2 flex-1">
                    <ShoppingCart className="w-5 h-5" />
                    কার্টে যোগ করুন
                  </Button>
                )}
                <Button variant="outline" size="lg" className="px-3">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            {ebook.tags && ebook.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ebook.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
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
            {metadata?.has_audio && metadata?.audio_url && (
              <TabsTrigger value="audio" className="rounded-lg gap-1">
                <Headphones className="w-3.5 h-3.5" /> অডিও
              </TabsTrigger>
            )}
            <TabsTrigger value="reviews" className="rounded-lg">
              রিভিউ ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="bg-card rounded-xl border p-6">
              {ebook.description_bn ? (
                <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed text-sm md:text-base">
                  {ebook.description_bn}
                </div>
              ) : (
                <p className="text-muted-foreground">কোনো বিবরণ যোগ করা হয়নি।</p>
              )}
            </div>
          </TabsContent>

          {toc && toc.length > 0 && (
            <TabsContent value="toc" className="mt-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> সূচিপত্র
                </h3>
                <div className="space-y-1.5">
                  {toc.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium flex-1">{item.title || item.name || item}</span>
                      {item.page && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">পৃ. {item.page}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {ebook.preview_url && (
            <TabsContent value="preview" className="mt-6">
              <div className="bg-card rounded-xl border p-6">
                <SecurePdfViewer url={ebook.preview_url} title={ebook.title_bn} />
              </div>
            </TabsContent>
          )}

          {metadata?.has_audio && metadata?.audio_url && (
            <TabsContent value="audio" className="mt-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-primary" /> অডিওবুক
                </h3>
                {metadata.audio_duration_minutes && (
                  <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> সময়কাল: {Math.floor(metadata.audio_duration_minutes / 60)}ঘ {metadata.audio_duration_minutes % 60}মি
                  </p>
                )}
                <audio controls className="w-full" controlsList="nodownload">
                  <source src={metadata.audio_url} />
                </audio>
              </div>
            </TabsContent>
          )}

          <TabsContent value="reviews" className="mt-6">
            <div className="bg-card rounded-xl border p-6">
              {reviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground">এখনো কোনো রিভিউ নেই</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rating summary */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl mb-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary">{rating.toFixed(1)}</p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5", i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{reviews.length} রিভিউ</p>
                    </div>
                  </div>

                  {reviews.map((review: any) => (
                    <div key={review.id} className="p-4 rounded-xl border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                          ))}
                        </div>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 h-5">
                            <CheckCircle className="w-2.5 h-2.5" /> যাচাইকৃত
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(review.created_at).toLocaleDateString("bn-BD")}
                        </span>
                      </div>
                      {review.review_text && <p className="text-sm text-foreground/80">{review.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Related Ebooks */}
        {relatedEbooks.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">সম্পর্কিত ই-বুক</h2>
              {ebook.category && (
                <Link to={`/ebooks?category=${ebook.category}`} className="text-sm text-primary hover:underline">
                  সব দেখুন →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {relatedEbooks.map((item: any) => {
                const itemDiscount = item.discount_percent && item.discount_percent > 0;
                return (
                  <Link key={item.id} to={`/ebooks/${item.slug}`} className="group bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5">
                    <div className="aspect-[3/4] overflow-hidden bg-muted/30 relative">
                      <img src={item.cover_image || "/placeholder.svg"} alt={item.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      {itemDiscount && (
                        <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          -{item.discount_percent}%
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors mb-1">{item.title_bn}</h3>
                      {(item.avg_rating ?? 0) > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-[11px] text-muted-foreground">{(item.avg_rating ?? 0).toFixed(1)}</span>
                        </div>
                      )}
                      <p className="font-bold text-primary">
                        {item.is_free ? "ফ্রি" : `৳${item.price}`}
                        {item.original_price && item.original_price > item.price && (
                          <span className="text-xs text-muted-foreground line-through ml-1.5">৳{item.original_price}</span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EbookDetail;
