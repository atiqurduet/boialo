import { SEOHead } from "@/components/SEOHead";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { DynamicHeroSlider } from "@/components/DynamicHeroSlider";
import { DynamicCategorySection } from "@/components/DynamicCategorySection";
import { DynamicProductGrid } from "@/components/DynamicProductGrid";
import { DynamicFlashSale } from "@/components/DynamicFlashSale";
import { DynamicPromoBanner } from "@/components/DynamicPromoBanner";
import { DynamicUniversalProductGrid } from "@/components/DynamicUniversalProductGrid";
import { DynamicUniversalCategorySection } from "@/components/DynamicUniversalCategorySection";
import { DynamicUniversalFlashSale } from "@/components/DynamicUniversalFlashSale";
import { DynamicCategoryWithSubcategories } from "@/components/DynamicCategoryWithSubcategories";
import { DynamicCategoryTopProducts } from "@/components/DynamicCategoryTopProducts";
import { TrustBadges } from "@/components/TrustBadges";
import { NewsletterSection } from "@/components/NewsletterSection";
import { FeaturedOfferBanner } from "@/components/FeaturedOfferBanner";
import { Footer } from "@/components/Footer";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { AIRecommendations } from "@/components/AIRecommendations";
import { TopSellingProducts } from "@/components/TopSellingProducts";
import { TopAuthorsSection } from "@/components/TopAuthorsSection";
import { TopSellingUniversalProducts } from "@/components/TopSellingUniversalProducts";
import { RecentlySoldProducts } from "@/components/RecentlySoldProducts";
import { OfferProducts } from "@/components/OfferProducts";
import { EbookSection } from "@/components/EbookSection";
import { WeeklyBestBooks } from "@/components/WeeklyBestBooks";
import { WeeklyBestUniversalProducts } from "@/components/WeeklyBestUniversalProducts";
import { BundleShowcase } from "@/components/BundleShowcase";
import { BestSellingBrands } from "@/components/BestSellingBrands";
import { BestSellingPublishers } from "@/components/BestSellingPublishers";
import { useHomepageData } from "@/hooks/useHomepageData";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { 
    banners, 
    categories, 
    products, 
    universalCategories,
    universalProducts,
    writers,
    sections, 
    loading,
    getProductsByCategory,
    getProductsByWriter,
    getProductsByIds,
    getUniversalProductsByCategory,
    getUniversalProductsByType,
    getUniversalCategoriesByType
  } = useHomepageData();

  // Filter products by criteria
  const discountedProducts = products.filter(p => p.discount_percent && p.discount_percent >= 30);
  const featuredProducts = products.filter(p => p.is_featured);
  const preorderProducts = products.filter(p => p.is_preorder === true);
  const newProducts = products.slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main>
          {/* Hero skeleton */}
          <Skeleton className="h-[300px] md:h-[450px] w-full" />
          
          {/* Trust badges skeleton */}
          <div className="container py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          </div>

          {/* Content skeleton */}
          <div className="container py-4 space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render section based on type
  const renderSection = (section: typeof sections[0]) => {
    const settings = section.settings || {};
    const limit = settings.limit || 10;
    const sectionTitle = settings.hide_title ? '' : section.title_bn;
    const sectionSubtitle = settings.hide_title ? undefined : (section.subtitle_bn || undefined);
    const useCarousel = settings.use_carousel !== false; // default true

    switch (section.section_type) {
      case 'flash_sale':
        const flashProducts = discountedProducts.length > 0 
          ? discountedProducts.slice(0, limit) 
          : products.slice(0, limit);
        return (
          <DynamicFlashSale 
            key={section.id}
            products={flashProducts} 
            title={sectionTitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'category_grid':
        return (categories.length > 0 || universalCategories.length > 0) ? (
          <DynamicCategorySection 
            key={section.id}
            categories={categories}
            universalCategories={universalCategories}
            products={products}
            title={sectionTitle}
            settings={settings}
          />
        ) : null;

      case 'category_products':
        const categoryId = settings.category_id;
        if (!categoryId) return null;
        const categoryProducts = getProductsByCategory(categoryId).slice(0, limit);
        const category = categories.find(c => c.id === categoryId);
        if (categoryProducts.length === 0) return null;
        return (
          <DynamicProductGrid
            key={section.id}
            products={categoryProducts}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || `/shop?category=${category?.slug || ''}`}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        );

      case 'writer_products':
        const writerId = settings.writer_id;
        if (!writerId) return null;
        const writerProducts = getProductsByWriter(writerId).slice(0, limit);
        const writer = writers.find(w => w.id === writerId);
        if (writerProducts.length === 0) return null;
        return (
          <DynamicProductGrid
            key={section.id}
            products={writerProducts}
            title={sectionTitle}
            subtitle={sectionSubtitle || (writer ? writer.name_bn : undefined)}
            viewAllLink={settings.view_all_link || `/authors/${writer?.slug || ''}`}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        );

      case 'selected_products':
        const productIds: string[] = settings.product_ids || [];
        if (productIds.length === 0) return null;
        const selectedProducts = getProductsByIds(productIds);
        if (selectedProducts.length === 0) return null;
        return (
          <DynamicProductGrid
            key={section.id}
            products={selectedProducts}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        );

      case 'new_releases':
        return products.length > 0 ? (
          <DynamicProductGrid
            key={section.id}
            products={newProducts.slice(0, limit)}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || "/shop?sort=new"}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        ) : null;

      case 'bestsellers':
        const bestProducts = featuredProducts.length > 0 
          ? featuredProducts.slice(0, limit) 
          : products.slice(0, limit);
        return products.length > 0 ? (
          <div key={section.id} className="bg-card rounded-xl p-6 shadow-sm my-8">
            <DynamicProductGrid
              products={bestProducts}
              title={sectionTitle}
              subtitle={sectionSubtitle}
              viewAllLink={settings.view_all_link || "/shop?sort=bestseller"}
              columns={settings.columns || 5}
              showRanking={settings.show_ranking}
              useCarousel={useCarousel}
            />
          </div>
        ) : null;

      case 'promo_banner':
        return <DynamicPromoBanner key={section.id} settings={settings} />;

      case 'recommended':
      case 'featured_products':
        const recProducts = featuredProducts.length > 0 
          ? featuredProducts.slice(0, limit) 
          : products.slice(0, limit);
        return products.length > 0 ? (
          <DynamicProductGrid
            key={section.id}
            products={recProducts}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || "/shop"}
            columns={settings.columns || 5}
            showRanking={settings.show_ranking}
            useCarousel={useCarousel}
          />
        ) : null;

      case 'preorder_products':
        if (preorderProducts.length === 0) return null;
        return (
          <DynamicProductGrid
            key={section.id}
            products={preorderProducts.slice(0, limit)}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || "/shop?preorder=true"}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        );

      case 'trust_badges':
        return <TrustBadges key={section.id} />;

      case 'newsletter':
        return <NewsletterSection key={section.id} />;

      // Universal Products Section Types
      case 'universal_category_products':
        const universalCategoryId = settings.universal_category_id;
        const productType = settings.product_type;
        if (!universalCategoryId && !productType) return null;
        
        let uniProducts;
        if (universalCategoryId) {
          uniProducts = getUniversalProductsByCategory(universalCategoryId).slice(0, limit);
        } else {
          uniProducts = getUniversalProductsByType(productType).slice(0, limit);
        }
        
        if (uniProducts.length === 0) return null;
        
        const uniCategory = universalCategories.find(c => c.id === universalCategoryId);
        return (
          <DynamicUniversalProductGrid
            key={section.id}
            products={uniProducts}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || `/${productType}${uniCategory ? `?category=${uniCategory.slug}` : ''}`}
            columns={settings.columns || 5}
            useCarousel={useCarousel}
          />
        );

      case 'universal_category_grid':
        const gridProductType = settings.product_type;
        if (!gridProductType) return null;
        
        const typeCategories = getUniversalCategoriesByType(gridProductType);
        if (typeCategories.length === 0) return null;
        
        return (
          <DynamicUniversalCategorySection
            key={section.id}
            categories={typeCategories}
            title={sectionTitle}
            productType={gridProductType}
            maxCategories={settings.max_categories || 8}
          />
        );

      case 'universal_flash_sale':
        const flashProductType = settings.product_type;
        const minDiscount = settings.min_discount || 10;
        
        let flashUniProducts;
        if (flashProductType && flashProductType !== 'all') {
          flashUniProducts = universalProducts
            .filter(p => p.product_type === flashProductType && p.discount_percent && p.discount_percent >= minDiscount)
            .slice(0, limit);
        } else {
          flashUniProducts = universalProducts
            .filter(p => p.discount_percent && p.discount_percent >= minDiscount)
            .slice(0, limit);
        }
        
        if (flashUniProducts.length === 0) return null;
        
        return (
          <DynamicUniversalFlashSale
            key={section.id}
            products={flashUniProducts}
            title={sectionTitle}
            viewAllLink={settings.view_all_link || (flashProductType && flashProductType !== 'all' ? `/${flashProductType}` : '/lifestyle')}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'ai_recommendations':
        return (
          <AIRecommendations
            key={section.id}
            limit={settings.limit || 10}
            columns={settings.columns || 5}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            viewAllLink={settings.view_all_link || "/shop"}
            useCarousel={useCarousel}
          />
        );

      case 'top_selling_products':
        return (
          <TopSellingProducts
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'top_authors':
        return (
          <TopAuthorsSection
            key={section.id}
            limit={settings.limit || 12}
            title={sectionTitle}
            subtitle={sectionSubtitle}
          />
        );

      case 'top_selling_universal_products':
        return (
          <TopSellingUniversalProducts
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'category_subcategory_grid':
        return (
          <DynamicCategoryWithSubcategories
            key={section.id}
            categories={categories}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            maxParentCategories={settings.max_parent_categories || 8}
            maxSubcategories={settings.max_subcategories || 6}
            columns={settings.columns || 4}
            selectedCategoryIds={settings.category_ids}
          />
        );

      case 'category_top_products':
        return (
          <DynamicCategoryTopProducts
            key={section.id}
            categories={categories}
            products={products}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            maxCategories={settings.max_categories || 5}
            productsPerCategory={settings.products_per_category || 6}
            visibleProducts={settings.visible_products || 3}
            selectedCategoryIds={settings.category_ids}
          />
        );

      case 'recently_sold':
        return (
          <RecentlySoldProducts
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'offer_products':
        return (
          <OfferProducts
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
            minDiscount={settings.min_discount || 5}
          />
        );

      case 'ebooks':
        return (
          <EbookSection
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'weekly_best_books':
        return (
          <WeeklyBestBooks
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'weekly_best_universal':
        return (
          <WeeklyBestUniversalProducts
            key={section.id}
            limit={settings.limit || 10}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 5}
          />
        );

      case 'bundle_showcase':
        return (
          <BundleShowcase
            key={section.id}
            limit={settings.limit || 6}
            title={sectionTitle}
            subtitle={sectionSubtitle}
            useCarousel={useCarousel}
            columns={settings.columns || 3}
          />
        );

      case 'best_selling_brands':
        return (
          <BestSellingBrands
            key={section.id}
            limit={settings.limit || 12}
            title={sectionTitle}
            subtitle={sectionSubtitle}
          />
        );

      case 'best_selling_publishers':
        return (
          <BestSellingPublishers
            key={section.id}
            limit={settings.limit || 12}
            title={sectionTitle}
            subtitle={sectionSubtitle}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <SEOHead
        title="বইআলো - বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ"
        description="বইআলো - বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ। ইসলামি বই, একাডেমিক বই, উপন্যাস, শিশুদের বই সহ হাজার হাজার বই সেরা দামে কিনুন। ফ্রি ডেলিভারি ও ক্যাশ অন ডেলিভারি।"
        keywords="বই, অনলাইন বই, বাংলা বই, ইসলামি বই, বই কিনুন, বইআলো, boialo, online bookshop bangladesh, বই অর্ডার"
        canonicalUrl="https://boialo.com"
      />
      <AnnouncementBar />
      <Header />
      <main>
      {/* Dynamic Hero Slider */}
      <DynamicHeroSlider banners={banners} />

      {/* Trust Badges - always show at top */}
      <TrustBadges />

      <div className="container py-6 md:py-10 space-y-2">
        {/* Featured Offer Banner */}
        <FeaturedOfferBanner />

        {/* Render sections in order with lazy visibility */}
        {sections.map((section, index) => (
          <div key={section.id} className={index > 2 ? "content-lazy" : ""}>
            {renderSection(section)}
          </div>
        ))}

        {/* Recently Viewed Products */}
        <div className="content-lazy">
          <RecentlyViewed />
        </div>
      </div>

      {/* Newsletter Section - always show at bottom */}
      <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;