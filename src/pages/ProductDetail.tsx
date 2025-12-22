import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { sampleProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Heart, Share2, ChevronRight } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);

  // Find product or use first sample product
  const product = sampleProducts.find((p) => p.id === id) || sampleProducts[0];
  const relatedProducts = sampleProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const hasDiscount = product.discount && product.discount > 0;

  return (
    <div className="min-h-screen bg-background">
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
                  <Link to="#" className="text-primary hover:underline">
                    {product.author}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">প্রকাশনী : </span>
                  <Link to="#" className="text-primary hover:underline">
                    মুন্দানদানী প্রকাশনী
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">বিষয় : </span>
                  <Link to="#" className="text-primary hover:underline">
                    আত্মশুদ্ধি ও অনুপ্রেরণা
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
                <Button className="btn-primary flex-1 bg-accent hover:bg-accent/90">
                  একটু পড়ে দেখুন
                </Button>
              </div>

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
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
