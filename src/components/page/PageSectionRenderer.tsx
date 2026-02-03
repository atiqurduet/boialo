import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TrustBadges } from '@/components/TrustBadges';
import { NewsletterSection } from '@/components/NewsletterSection';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';
import { CountdownTimer } from '@/components/CountdownTimer';

interface PageSection {
  id: string;
  section_type: string;
  title_bn: string | null;
  title_en: string | null;
  subtitle_bn: string | null;
  subtitle_en: string | null;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface PageSectionRendererProps {
  section: PageSection;
}

// Helper to convert DB product to display format
const formatProduct = (p: {
  id: string;
  slug: string;
  title_bn: string;
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  images?: Json | null;
  author?: string | null;
}) => ({
  id: p.id,
  slug: p.slug,
  title: p.title_bn,
  author: p.author || '',
  price: p.price,
  originalPrice: p.original_price || undefined,
  discount: p.discount_percent || undefined,
  image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : '/placeholder.svg',
});

// Helper to convert universal product to display format
const formatUniversalProduct = (p: {
  id: string;
  slug: string;
  name_bn: string;
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  images?: Json | null;
  brand?: string | null;
}) => ({
  id: p.id,
  slug: p.slug,
  title: p.name_bn,
  brand: p.brand || '',
  price: p.price,
  originalPrice: p.original_price || undefined,
  discount: p.discount_percent || undefined,
  image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : '/placeholder.svg',
});

export const PageSectionRenderer = ({ section }: PageSectionRendererProps) => {
  const { section_type, title_bn, subtitle_bn, content, settings } = section;

  // Get padding class
  const getPaddingClass = () => {
    switch (settings?.padding) {
      case 'none': return 'py-0';
      case 'small': return 'py-4';
      case 'large': return 'py-16';
      default: return 'py-8';
    }
  };

  // Get container class
  const getContainerClass = () => {
    switch (settings?.container) {
      case 'full': return 'w-full px-4';
      case 'narrow': return 'container max-w-4xl';
      default: return 'container';
    }
  };

  const bgStyle = settings?.background 
    ? { backgroundColor: settings.background as string }
    : {};

  switch (section_type) {
    case 'hero_banner':
      return <HeroBannerSection content={content} settings={settings} />;

    case 'text_content':
      return (
        <section className={`${getContainerClass()} ${getPaddingClass()}`} style={bgStyle}>
          {title_bn && <h2 className="text-2xl font-bold mb-4">{title_bn}</h2>}
          {subtitle_bn && <p className="text-muted-foreground mb-6">{subtitle_bn}</p>}
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: (content?.content_bn as string) || '' }}
          />
        </section>
      );

    case 'image_gallery':
      return <ImageGallerySection section={section} />;

    case 'product_grid':
      return <ProductGridSection section={section} />;

    case 'universal_product_grid':
      return <UniversalProductGridSection section={section} />;

    case 'category_grid':
      return <CategoryGridSection section={section} />;

    case 'video_embed':
      return <VideoEmbedSection content={content} settings={settings} title_bn={title_bn} />;

    case 'faq':
      return <FAQSection section={section} />;

    case 'cta_banner':
      return <CTABannerSection section={section} />;

    case 'testimonials':
      return <TestimonialsSection section={section} />;

    case 'feature_cards':
      return <FeatureCardsSection section={section} />;

    case 'newsletter':
      return <NewsletterSection />;

    case 'trust_badges':
      return <TrustBadges />;

    case 'html_embed':
      return (
        <section className={`${getContainerClass()} ${getPaddingClass()}`} style={bgStyle}>
          <div dangerouslySetInnerHTML={{ __html: (content?.html as string) || '' }} />
        </section>
      );

    case 'divider':
      return <hr className="container my-8 border-border" />;

    case 'spacer':
      const height = (settings?.height as number) || 40;
      return <div style={{ height: `${height}px` }} />;

    case 'flash_sale':
      return <FlashSaleSection section={section} />;

    default:
      return null;
  }
};

// Hero Banner Section
const HeroBannerSection = ({ 
  content, 
  settings 
}: { 
  content: Record<string, unknown>; 
  settings: Record<string, unknown>;
}) => {
  const bgImage = content?.background_image as string;
  const showOverlay = settings?.overlay !== false;
  
  return (
    <section 
      className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}
    >
      {showOverlay && <div className="absolute inset-0 bg-black/50" />}
      <div className="relative z-10 container text-center text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          {content?.heading_bn as string}
        </h1>
        {content?.subheading_bn && (
          <p className="text-xl md:text-2xl opacity-90 mb-8">
            {content.subheading_bn as string}
          </p>
        )}
        {content?.button_text && content?.button_link && (
          <Button asChild size="lg">
            <Link to={content.button_link as string}>
              {content.button_text as string}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
};

// Image Gallery Section
const ImageGallerySection = ({ section }: { section: PageSection }) => {
  const { content, settings, title_bn } = section;
  const images = (content?.images as string[]) || [];
  const columns = (settings?.columns as number) || 3;

  if (!images.length) return null;

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6">{title_bn}</h2>}
      <div className={`grid grid-cols-2 gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(columns, 2)}, 1fr)` }}>
        {images.map((img, i) => (
          <img 
            key={i} 
            src={img} 
            alt="" 
            className="w-full h-48 md:h-64 object-cover rounded-lg"
            loading="lazy"
          />
        ))}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(${columns}, 1fr) !important; }
        }
      `}</style>
    </section>
  );
};

// Product Grid Section
const ProductGridSection = ({ section }: { section: PageSection }) => {
  const { settings, title_bn, subtitle_bn } = section;
  const categoryId = settings?.category_id as string;
  const limit = (settings?.limit as number) || 8;
  const columns = (settings?.columns as number) || 4;
  const viewAllLink = settings?.view_all_link as string;

  const { data: products } = useQuery({
    queryKey: ['page-products', categoryId, limit],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, slug, title_bn, price, original_price, discount_percent, images, author')
        .eq('is_active', true)
        .limit(limit);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data } = await query;
      return data || [];
    },
  });

  if (!products?.length) return null;

  return (
    <section className="container py-8">
      {title_bn && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{title_bn}</h2>
            {subtitle_bn && <p className="text-muted-foreground">{subtitle_bn}</p>}
          </div>
          {viewAllLink && (
            <Button variant="outline" asChild>
              <Link to={viewAllLink}>সব দেখুন</Link>
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: `repeat(2, 1fr)` }}>
        {products.map((product) => {
          const formatted = formatProduct(product);
          return (
            <Link 
              key={product.id}
              to={`/product/${product.slug}`}
              className="bg-card rounded-lg p-4 border hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img 
                  src={formatted.image} 
                  alt={formatted.title}
                  className="w-full h-40 object-cover rounded mb-3"
                  loading="lazy"
                />
                {formatted.discount && formatted.discount > 0 && (
                  <span className="absolute top-2 right-2 bg-destructive text-white text-xs px-2 py-1 rounded">
                    -{formatted.discount}%
                  </span>
                )}
              </div>
              <h3 className="font-medium line-clamp-2 mb-1">{formatted.title}</h3>
              {formatted.author && (
                <p className="text-sm text-muted-foreground mb-1">{formatted.author}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">৳{formatted.price}</span>
                {formatted.originalPrice && formatted.originalPrice > formatted.price && (
                  <span className="text-sm text-muted-foreground line-through">৳{formatted.originalPrice}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(${columns}, 1fr) !important; }
        }
      `}</style>
    </section>
  );
};

// Universal Product Grid Section
const UniversalProductGridSection = ({ section }: { section: PageSection }) => {
  const { settings, title_bn, subtitle_bn } = section;
  const categoryId = settings?.category_id as string;
  const productType = settings?.product_type as string;
  const limit = (settings?.limit as number) || 8;
  const columns = (settings?.columns as number) || 4;

  const { data: products } = useQuery({
    queryKey: ['page-universal-products', categoryId, productType, limit],
    queryFn: async () => {
      let query = supabase
        .from('universal_products')
        .select('id, slug, name_bn, price, original_price, discount_percent, images, brand')
        .eq('is_active', true)
        .limit(limit);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (productType) {
        query = query.eq('product_type', productType as 'food' | 'lifestyle' | 'stationery');
      }

      const { data } = await query;
      return data || [];
    },
  });

  if (!products?.length) return null;

  return (
    <section className="container py-8">
      {title_bn && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title_bn}</h2>
          {subtitle_bn && <p className="text-muted-foreground">{subtitle_bn}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: `repeat(2, 1fr)` }}>
        {products.map((product) => {
          const formatted = formatUniversalProduct(product);
          return (
            <Link 
              key={product.id}
              to={`/universal-product/${product.slug}`}
              className="bg-card rounded-lg p-4 border hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img 
                  src={formatted.image} 
                  alt={formatted.title}
                  className="w-full h-40 object-cover rounded mb-3"
                  loading="lazy"
                />
                {formatted.discount && formatted.discount > 0 && (
                  <span className="absolute top-2 right-2 bg-destructive text-white text-xs px-2 py-1 rounded">
                    -{formatted.discount}%
                  </span>
                )}
              </div>
              <h3 className="font-medium line-clamp-2 mb-1">{formatted.title}</h3>
              {formatted.brand && (
                <p className="text-sm text-muted-foreground mb-1">{formatted.brand}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">৳{formatted.price}</span>
                {formatted.originalPrice && formatted.originalPrice > formatted.price && (
                  <span className="text-sm text-muted-foreground line-through">৳{formatted.originalPrice}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .grid { grid-template-columns: repeat(${columns}, 1fr) !important; }
        }
      `}</style>
    </section>
  );
};

// Category Grid Section
const CategoryGridSection = ({ section }: { section: PageSection }) => {
  const { settings, title_bn } = section;
  const showImage = settings?.show_image !== false;

  const { data: categories } = useQuery({
    queryKey: ['page-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  if (!categories?.length) return null;

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6">{title_bn}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/categories/${cat.slug}`}
            className="group text-center p-4 bg-card rounded-xl border hover:border-primary transition-colors"
          >
            {showImage && cat.image_url && (
              <img 
                src={cat.image_url} 
                alt={cat.name_bn} 
                className="w-16 h-16 mx-auto mb-2 object-contain"
                loading="lazy"
              />
            )}
            <p className="font-medium group-hover:text-primary">{cat.name_bn}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};

// Video Embed Section
const VideoEmbedSection = ({ 
  content, 
  settings, 
  title_bn 
}: { 
  content: Record<string, unknown>; 
  settings: Record<string, unknown>;
  title_bn: string | null;
}) => {
  const videoUrl = content?.video_url as string;
  if (!videoUrl) return null;

  // Convert YouTube URL to embed URL
  const getEmbedUrl = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      const autoplay = settings?.autoplay ? '?autoplay=1&mute=1' : '';
      return `https://www.youtube.com/embed/${youtubeMatch[1]}${autoplay}`;
    }
    return url;
  };

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6">{title_bn}</h2>}
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={getEmbedUrl(videoUrl)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = ({ section }: { section: PageSection }) => {
  const { content, title_bn } = section;
  const items = (content?.items as Array<{ question_bn: string; answer_bn: string }>) || [];

  if (!items.length) return null;

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6">{title_bn}</h2>}
      <div className="space-y-4 max-w-3xl mx-auto">
        {items.map((item, i) => (
          <details key={i} className="group border rounded-lg">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium">
              {item.question_bn}
              <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-4 pb-4 text-muted-foreground">
              {item.answer_bn}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

// CTA Banner Section
const CTABannerSection = ({ section }: { section: PageSection }) => {
  const { content, settings, title_bn } = section;
  const bgImage = content?.background_image as string;
  const bgColor = (settings?.bg_color as string) || 'hsl(var(--primary))';

  return (
    <section 
      className="py-12 bg-cover bg-center relative"
      style={{ 
        backgroundColor: bgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : undefined 
      }}
    >
      {bgImage && <div className="absolute inset-0 bg-black/50" />}
      <div className="container text-center text-white relative z-10">
        <h2 className="text-3xl font-bold mb-4">{(content?.heading as string) || title_bn}</h2>
        {content?.description && (
          <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">{content.description as string}</p>
        )}
        {content?.button_text && content?.button_link && (
          <Button asChild size="lg" variant="secondary">
            <Link to={content.button_link as string}>
              {content.button_text as string}
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection = ({ section }: { section: PageSection }) => {
  const { content, title_bn } = section;
  const items = (content?.items as Array<{ name: string; text: string; image?: string; role?: string }>) || [];

  if (!items.length) return null;

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6 text-center">{title_bn}</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-card p-6 rounded-xl border">
            <p className="text-muted-foreground mb-4 italic">"{item.text}"</p>
            <div className="flex items-center gap-3">
              {item.image && (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-12 h-12 rounded-full object-cover"
                  loading="lazy"
                />
              )}
              <div>
                <p className="font-medium">{item.name}</p>
                {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// Feature Cards Section
const FeatureCardsSection = ({ section }: { section: PageSection }) => {
  const { content, settings, title_bn } = section;
  const items = (content?.items as Array<{ icon?: string; title: string; description: string }>) || [];
  const columns = (settings?.columns as number) || 3;

  if (!items.length) return null;

  return (
    <section className="container py-8">
      {title_bn && <h2 className="text-2xl font-bold mb-6 text-center">{title_bn}</h2>}
      <div className={`grid md:grid-cols-${columns} gap-6`}>
        {items.map((item, i) => (
          <div key={i} className="text-center p-6 bg-card rounded-xl border">
            {item.icon && <div className="text-4xl mb-4">{item.icon}</div>}
            <h3 className="font-bold mb-2">{item.title}</h3>
            <p className="text-muted-foreground text-sm">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// Flash Sale Section
const FlashSaleSection = ({ section }: { section: PageSection }) => {
  const { settings, title_bn } = section;
  const minDiscount = (settings?.min_discount as number) || 20;
  const limit = (settings?.limit as number) || 8;
  const endDate = settings?.end_date as string;
  const showCountdown = settings?.show_countdown !== false;

  const { data: products } = useQuery({
    queryKey: ['flash-sale-products', minDiscount, limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, slug, title_bn, price, original_price, discount_percent, images, author')
        .eq('is_active', true)
        .gte('discount_percent', minDiscount)
        .limit(limit);
      return data || [];
    },
  });

  if (!products?.length) return null;

  return (
    <section className="container py-8">
      <div className="bg-gradient-to-r from-destructive to-primary rounded-xl p-6 text-white mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{title_bn || '⚡ ফ্ল্যাশ সেল'}</h2>
            <p className="opacity-90">সীমিত সময়ের জন্য বিশেষ ছাড়!</p>
          </div>
          {showCountdown && endDate && (
            <CountdownTimer endDate={endDate} variant="hero" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const formatted = formatProduct(product);
          return (
            <Link 
              key={product.id}
              to={`/product/${product.slug}`}
              className="bg-card rounded-lg p-4 border hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img 
                  src={formatted.image} 
                  alt={formatted.title}
                  className="w-full h-40 object-cover rounded mb-3"
                  loading="lazy"
                />
                {formatted.discount && (
                  <span className="absolute top-2 right-2 bg-destructive text-white text-xs px-2 py-1 rounded font-bold">
                    -{formatted.discount}%
                  </span>
                )}
              </div>
              <h3 className="font-medium line-clamp-2 mb-1">{formatted.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">৳{formatted.price}</span>
                {formatted.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">৳{formatted.originalPrice}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
