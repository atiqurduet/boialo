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
  const { 
    banners, 
    categories, 
    products, 
    writers,
    sections, 
    loading,
    getProductsByCategory,
    getProductsByWriter,
    getProductsByIds
  } = useHomepageData();

  // Filter products by criteria
  const discountedProducts = products.filter(p => p.discount_percent && p.discount_percent >= 30);
  const featuredProducts = products.filter(p => p.is_featured);
  const newProducts = products.slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main>
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

  // Render section based on type
  const renderSection = (section: typeof sections[0]) => {
    const settings = section.settings || {};
    const limit = settings.limit || 10;

    switch (section.section_type) {
      case 'flash_sale':
        const flashProducts = discountedProducts.length > 0 
          ? discountedProducts.slice(0, limit) 
          : products.slice(0, limit);
        return (
          <DynamicFlashSale 
            key={section.id}
            products={flashProducts} 
            title={section.title_bn}
          />
        );

      case 'category_grid':
        return categories.length > 0 ? (
          <DynamicCategorySection 
            key={section.id}
            categories={categories}
            products={products}
            title={section.title_bn}
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
            title={section.title_bn}
            subtitle={section.subtitle_bn || undefined}
            viewAllLink={settings.view_all_link || `/shop?category=${category?.slug || ''}`}
            columns={settings.columns || 5}
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
            title={section.title_bn}
            subtitle={section.subtitle_bn || (writer ? writer.name_bn : undefined)}
            viewAllLink={settings.view_all_link || `/authors/${writer?.slug || ''}`}
            columns={settings.columns || 5}
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
            title={section.title_bn}
            subtitle={section.subtitle_bn || undefined}
            viewAllLink={settings.view_all_link}
            columns={settings.columns || 5}
          />
        );

      case 'new_releases':
        return products.length > 0 ? (
          <DynamicProductGrid
            key={section.id}
            products={newProducts.slice(0, limit)}
            title={section.title_bn}
            subtitle={section.subtitle_bn || undefined}
            viewAllLink={settings.view_all_link || "/shop?sort=new"}
            columns={settings.columns || 5}
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
              title={section.title_bn}
              subtitle={section.subtitle_bn || undefined}
              viewAllLink={settings.view_all_link || "/shop?sort=bestseller"}
              columns={settings.columns || 5}
              showRanking={settings.show_ranking}
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
            title={section.title_bn}
            subtitle={section.subtitle_bn || undefined}
            viewAllLink={settings.view_all_link || "/shop"}
            columns={settings.columns || 5}
            showRanking={settings.show_ranking}
          />
        ) : null;

      case 'trust_badges':
        return <TrustBadges key={section.id} />;

      case 'newsletter':
        return <NewsletterSection key={section.id} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      
      <main>
        {/* Dynamic Hero Slider */}
        <DynamicHeroSlider banners={banners} />

        {/* Trust Badges - always show at top */}
        <TrustBadges />

        <div className="container py-8">
          {/* Render sections in order */}
          {sections.map(section => renderSection(section))}
        </div>

        {/* Newsletter Section - always show at bottom */}
        <NewsletterSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;