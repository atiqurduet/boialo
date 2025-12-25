import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard } from "@/components/ProductCard";
import { ProductReviews } from "@/components/ProductReviews";
import { sampleProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Heart, Share2, ChevronRight, BookOpen, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getCategoryName = (category?: string) => {
  switch (category) {
    case "academic": return "একাডেমিক বই";
    case "children": return "শিশু কিশোরদের বই";
    case "islamic": return "ইসলামি বই";
    case "history": return "ইতিহাস";
    case "biography": return "জীবনী";
    case "hadith": return "হাদীস";
    case "tafsir": return "তাফসীর";
    case "fiqh": return "ফিকহ";
    case "arabic": return "আরবি ভাষা";
    case "self-help": return "আত্মশুদ্ধি ও অনুপ্রেরণা";
    case "novel": return "উপন্যাস";
    case "literature": return "সাহিত্য";
    case "magazine": return "ম্যাগাজিন";
    default: return "ইসলামি বই";
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch product from Supabase
  const { data: dbProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!id,
  });

  // Find product from sample data or use first sample product as fallback
  const sampleProduct = sampleProducts.find((p) => p.id === id) || sampleProducts[0];
  
  // Use database product if available, otherwise fallback to sample
  const product = dbProduct ? {
    id: dbProduct.id,
    title: dbProduct.title_bn || dbProduct.title_en,
    author: dbProduct.author || 'অজানা লেখক',
    price: dbProduct.price,
    originalPrice: dbProduct.original_price,
    discount: dbProduct.discount_percent,
    image: Array.isArray(dbProduct.images) && dbProduct.images.length > 0 
      ? (dbProduct.images[0] as string) 
      : '/placeholder.svg',
    publisher: dbProduct.publisher,
    category: dbProduct.category_id,
    previewUrl: dbProduct.preview_url,
  } : sampleProduct;

  const relatedProducts = sampleProducts.filter((p) => p.id !== product.id).slice(0, 4);
  const hasDiscount = product.discount && product.discount > 0;
  const previewUrl = (product as any).previewUrl;
  const isPdf = previewUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/shop" className="hover:text-primary">বিষয়</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">ইসলামি বই</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <div className="relative">
                  <p className="text-xs text-primary mb-2 cursor-pointer hover:underline">
                    ভিতরে কী আছে পড়তে বইয়ের ছবিতে ক্লিক করুন
                  </p>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {hasDiscount && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-bold">
                      {product.discount}% OFF
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">লেখক : </span>
                  <Link to={`/shop?author=${encodeURIComponent(product.author)}`} className="text-primary hover:underline">
                    {product.author}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">প্রকাশনী : </span>
                  <Link to={`/shop?publisher=${encodeURIComponent(product.publisher || 'মুন্দানদানী প্রকাশনী')}`} className="text-primary hover:underline">
                    {product.publisher || 'মুন্দানদানী প্রকাশনী'}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">বিষয় : </span>
                  <Link to={`/shop?category=${product.category || 'islamic'}`} className="text-primary hover:underline">
                    {getCategoryName(product.category as string)}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">পৃষ্ঠা : </span>
                  240, সংস্করণ : ডিসেম্বর 2025
                </p>
              </div>

              {/* Pre-order Notice */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
                <p className="text-foreground">
                  আমাদের জানিয়েছেন এই পণ্যটি <strong>30 December 2025</strong> প্রকাশিত হতে পারে। প্রকাশিত হওয়ার সাথে সাথে পণ্যটি পেতে আগেই অর্ডার করে রাখুন।
                </p>
              </div>

              {/* Description */}
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  মুমিনের হারাবার কিছু নেই আমরা এমন এক সময়ে বাস করছি, যেখানে কষ্ট মানেই পরাজয়,
                  হারানো মানেই শেষ, আর ব্যথা মানেই আল্লাহর অসন্তুষ্টি—এমন ভুল ধারণা আমাদের চারপাশে
                  ছড়িয়ে পড়েছে।{" "}
                  <Link to="#" className="text-primary hover:underline">
                    আরো পড়ুন
                  </Link>
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">৳{product.price}</span>
                {hasDiscount && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      ৳{product.originalPrice}
                    </span>
                    <span className="text-primary font-medium">
                      ({product.discount}% ছাড়ে)
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="btn-outline-primary flex-1">
                  প্রি-অর্ডার করুন
                </Button>
                <Button 
                  className="btn-primary flex-1 bg-accent hover:bg-accent/90"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!previewUrl}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  একটু পড়ুন
                </Button>
              </div>

              {!previewUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  এই বইয়ের প্রিভিউ এখনো যোগ করা হয়নি
                </p>
              )}

              {/* Wishlist & Share */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Heart className="w-5 h-5" />
                  Wishlist
                </button>
                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Share2 className="w-5 h-5" />
                  বন্ধুদের সাথে শেয়ার করুন
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Related Products & Offers */}
          <div className="lg:col-span-1 space-y-6">
            {/* Offers */}
            <div className="bg-card rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4">অফারে আরো যা পাচ্ছেন</h3>
              <div className="space-y-4">
                <div className="border-b border-border pb-4">
                  <p className="text-sm">
                    একটি বই কিনি, একটি প্রিমিয়াম নোট বুক, একটি প্রিমিয়াম বুকমার্ক ও নাশনিক
                    বুকমার্ক
                  </p>
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">সর্বনিম্ন কেনাকাটা:</span>{" "}
                    <span className="text-primary font-medium">১ টাকা</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    মেয়াদ শেষ: ৩১ ডিসেম্বর, ২০২৫
                  </p>
                </div>
                <div>
                  <p className="text-sm">৪৯৯+ টাকার অর্ডার করলে ক্যালিগ্রাফি বুকমার্ক ফ্রি!</p>
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">সর্বনিম্ন কেনাকাটা:</span>{" "}
                    <span className="text-primary font-medium">৫০০ টাকা</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    মেয়াদ শেষ: ৩১ ডিসেম্বর, ২০২৫
                  </p>
                </div>
              </div>
            </div>

            {/* Related Products */}
            <div className="bg-card rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">আরো দেখুন...</h3>
                <Link to="/shop" className="text-primary text-sm hover:underline">
                  সবগুলো দেখুন
                </Link>
              </div>
              <div className="space-y-3">
                {relatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} variant="compact" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ProductReviews productId={product.id} />
        </div>
      </main>

      <Footer />

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              একটু পড়ুন - {product.title}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewUrl && isPdf ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-8 h-8" />
                  <span>PDF Preview</span>
                </div>
                <iframe 
                  src={previewUrl} 
                  className="w-full h-[60vh] border rounded-lg"
                  title="Book Preview PDF"
                />
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  নতুন ট্যাবে খুলুন
                </a>
              </div>
            ) : previewUrl ? (
              <div className="flex justify-center">
                <img 
                  src={previewUrl} 
                  alt="Book Preview" 
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <p>এই বইয়ের প্রিভিউ এখনো যোগ করা হয়নি</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
