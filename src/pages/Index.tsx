import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { HeroSlider } from "@/components/HeroSlider";
import { CategorySection } from "@/components/CategorySection";
import { ProductGrid } from "@/components/ProductGrid";
import { FlashSaleSection } from "@/components/FlashSaleSection";
import { TrustBadges } from "@/components/TrustBadges";
import { NewsletterSection } from "@/components/NewsletterSection";
import { Footer } from "@/components/Footer";
import {
  sampleProducts,
  academicCategories,
  childrenCategories,
  aliyaMadrasaCategories,
  qawmiMadrasaCategories,
} from "@/data/products";
import { Link } from "react-router-dom";

const Index = () => {
  // Filter out preorder products - they should only appear on Preorder page
  const regularProducts = sampleProducts.filter((p) => !p.isPreorder);
  const flashSaleProducts = regularProducts.filter((p) => p.discount && p.discount >= 40);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      
      <main>
        <HeroSlider />

        {/* Trust Badges */}
        <TrustBadges />

        <div className="container py-8">
          {/* Flash Sale Section */}
          <FlashSaleSection products={flashSaleProducts.length > 0 ? flashSaleProducts : regularProducts} />

          {/* Category Sections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <CategorySection
              title="একাডেমিক"
              categories={academicCategories}
              viewAllLink="/shop?category=academic"
            />
            <CategorySection
              title="শিশু কিশোরদের বই"
              categories={childrenCategories}
              viewAllLink="/shop?category=children"
            />
            <CategorySection
              title="আলিয়া মাদ্রাসা"
              categories={aliyaMadrasaCategories}
              viewAllLink="/shop?category=alia-madrasa"
            />
            <CategorySection
              title="কওমি মাদ্রাসা"
              categories={qawmiMadrasaCategories}
              viewAllLink="/shop?category=qawmi-madrasa"
            />
          </div>

          {/* New Releases */}
          <ProductGrid
            title="নতুন প্রকাশিত বই"
            products={regularProducts.slice(0, 10)}
            viewAllLink="/shop?sort=new"
            columns={5}
          />

          {/* Best Sellers */}
          <div className="bg-card rounded-xl p-6 shadow-sm my-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">বইমেলা বেস্টসেলার ২০২৫</h2>
                <p className="text-sm text-muted-foreground">সবচেয়ে জনপ্রিয় বইসমূহ</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {regularProducts.slice(0, 5).map((product, index) => (
                <Link key={product.id} to={`/product/${product.id}`} className="relative group">
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm z-10">
                    {index + 1}
                  </div>
                  <div className="product-card">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {product.author}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold text-sm">
                          ৳{product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="text-muted-foreground line-through text-xs">
                            ৳{product.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Featured Offers Banner */}
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 md:p-12 text-primary-foreground my-8">
            <div className="max-w-2xl">
              <span className="inline-block bg-primary-foreground/20 px-4 py-1 rounded-full text-sm mb-4">
                সীমিত সময়ের অফার
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                প্রিমিয়াম বুকমার্ক ফ্রি!
              </h2>
              <p className="text-lg opacity-90 mb-6">
                ৪৯৯+ টাকার অর্ডারে ক্যালিগ্রাফি বুকমার্ক ফ্রি! অফার শেষ হওয়ার আগেই অর্ডার করুন।
              </p>
              <Link
                to="/shop"
                className="inline-block bg-primary-foreground text-primary font-bold px-8 py-3 rounded-lg hover:bg-primary-foreground/90 transition-colors"
              >
                এখনই কিনুন
              </Link>
            </div>
          </div>

          {/* More Products */}
          <ProductGrid
            title="আপনার জন্য সুপারিশকৃত"
            products={regularProducts.slice(3, 8)}
            viewAllLink="/shop"
            columns={5}
          />
        </div>

        {/* Newsletter Section */}
        <NewsletterSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
