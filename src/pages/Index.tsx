import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { DynamicHeroSlider } from "@/components/DynamicHeroSlider";
import { DynamicCategorySection } from "@/components/DynamicCategorySection";
import { DynamicProductGrid } from "@/components/DynamicProductGrid";
import { DynamicFlashSale } from "@/components/DynamicFlashSale";
import { DynamicPromoBanner } from "@/components/DynamicPromoBanner";
import { TrustBadges } from "@/components/TrustBadges";
import { NewsletterSection } from "@/components/NewsletterSection";
import { Footer } from "@/components/Footer";
import { useHomepageData } from "@/hooks/useHomepageData";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { banners, categories, products, sections, loading } = useHomepageData();

  // Get section settings by type
  const getSection = (type: string) => sections.find(s => s.section_type === type);
  
  // Filter products by criteria
  const discountedProducts = products.filter(p => p.discount_percent && p.discount_percent >= 30);
  const featuredProducts = products.filter(p => p.is_featured);
  const newProducts = products.slice(0, 10);
  const recommendedProducts = products.slice(5, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main>
          {/* Hero Skeleton */}
          <Skeleton className="h-[350px] w-full" />
          <div className="container py-8 space-y-8">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[280px] rounded-xl" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const flashSaleSection = getSection('flash_sale');
  const categorySection = getSection('category_grid');
  const newReleasesSection = getSection('new_releases');
  const bestsellersSection = getSection('bestsellers');
  const promoSection = getSection('promo_banner');
  const recommendedSection = getSection('recommended');

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      
      <main>
        {/* Dynamic Hero Slider */}
        <DynamicHeroSlider banners={banners} />

        {/* Trust Badges */}
        <TrustBadges />

        <div className="container py-8">
          {/* Flash Sale Section */}
          {flashSaleSection && (
            <DynamicFlashSale 
              products={discountedProducts.length > 0 ? discountedProducts : products} 
              title={flashSaleSection.title_bn}
            />
          )}

          {/* Category Section */}
          {categorySection && categories.length > 0 && (
            <DynamicCategorySection 
              categories={categories}
              products={products}
              title={categorySection.title_bn}
            />
          )}

          {/* New Releases */}
          {newReleasesSection && products.length > 0 && (
            <DynamicProductGrid
              products={newProducts}
              title={newReleasesSection.title_bn}
              subtitle={newReleasesSection.subtitle_bn || undefined}
              viewAllLink="/shop?sort=new"
              columns={5}
            />
          )}

          {/* Bestsellers */}
          {bestsellersSection && products.length > 0 && (
            <div className="bg-card rounded-xl p-6 shadow-sm my-8">
              <DynamicProductGrid
                products={featuredProducts.length > 0 ? featuredProducts.slice(0, 5) : products.slice(0, 5)}
                title={bestsellersSection.title_bn}
                subtitle={bestsellersSection.subtitle_bn || undefined}
                viewAllLink="/shop?sort=bestseller"
                columns={5}
                showRanking
              />
            </div>
          )}

          {/* Promo Banner */}
          {promoSection && (
            <DynamicPromoBanner settings={promoSection.settings} />
          )}

          {/* Recommended Products */}
          {recommendedSection && products.length > 0 && (
            <DynamicProductGrid
              products={recommendedProducts}
              title={recommendedSection.title_bn}
              subtitle={recommendedSection.subtitle_bn || undefined}
              viewAllLink="/shop"
              columns={5}
            />
          )}
        </div>

        {/* Newsletter Section */}
        <NewsletterSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
