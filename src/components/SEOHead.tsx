import { useEffect } from 'react';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  ogImageAlt?: string;
  noindex?: boolean;
  // Product-specific
  product?: {
    price: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    brand?: string;
    category?: string;
    sku?: string;
    image?: string;
    ratingValue?: number;
    reviewCount?: number;
    isbn?: string;
    author?: string;
    publisher?: string;
  };
  // Article-specific
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  // Breadcrumbs
  breadcrumbs?: BreadcrumbItem[];
  // Organization override
  organizationName?: string;
}

const BASE_URL = 'https://boialo.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'বইআলো';

export const SEOHead = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  noindex = false,
  product,
  article,
  breadcrumbs,
}: SEOHeadProps) => {
  useEffect(() => {
    // Set document title
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Helper to set meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // Basic meta
    setMeta('name', 'description', description.substring(0, 160));
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Canonical
    const canonical = canonicalUrl || window.location.href.split('?')[0];
    setLink('canonical', canonical);

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description.substring(0, 200));
    setMeta('property', 'og:type', ogType === 'product' ? 'product' : ogType);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', ogImage || DEFAULT_IMAGE);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    if (ogImageAlt) setMeta('property', 'og:image:alt', ogImageAlt);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'bn_BD');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description.substring(0, 200));
    setMeta('name', 'twitter:image', ogImage || DEFAULT_IMAGE);

    // Product OG tags
    if (product) {
      setMeta('property', 'product:price:amount', String(product.price));
      setMeta('property', 'product:price:currency', product.currency || 'BDT');
      if (product.availability === 'InStock') setMeta('property', 'product:availability', 'in stock');
      if (product.brand) setMeta('property', 'product:brand', product.brand);
      if (product.category) setMeta('property', 'product:category', product.category);
    }

    // Article OG tags
    if (article) {
      if (article.publishedTime) setMeta('property', 'article:published_time', article.publishedTime);
      if (article.modifiedTime) setMeta('property', 'article:modified_time', article.modifiedTime);
      if (article.author) setMeta('property', 'article:author', article.author);
      if (article.section) setMeta('property', 'article:section', article.section);
      article.tags?.forEach((tag, i) => {
        setMeta('property', `article:tag:${i}`, tag);
      });
    }

    // JSON-LD Structured Data
    const removeJsonLd = () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    };
    removeJsonLd();

    const addJsonLd = (data: object) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    };

    // Organization schema (always)
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
      logo: `${BASE_URL}/favicon.ico`,
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Bengali', 'English'],
      },
    });

    // WebSite schema with SearchAction
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: BASE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/shop?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    });

    // Breadcrumb schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
        })),
      });
    }

    // Product schema
    if (product) {
      const productSchema: any = {
        '@context': 'https://schema.org',
        '@type': product.isbn ? 'Book' : 'Product',
        name: title,
        description: description,
        image: product.image || ogImage,
        url: canonical,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'BDT',
          availability: `https://schema.org/${product.availability || 'InStock'}`,
          url: canonical,
          seller: { '@type': 'Organization', name: SITE_NAME },
        },
      };
      if (product.brand) productSchema.brand = { '@type': 'Brand', name: product.brand };
      if (product.sku) productSchema.sku = product.sku;
      if (product.isbn) {
        productSchema.isbn = product.isbn;
        if (product.author) productSchema.author = { '@type': 'Person', name: product.author };
        if (product.publisher) productSchema.publisher = { '@type': 'Organization', name: product.publisher };
      }
      if (product.ratingValue && product.reviewCount) {
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: product.ratingValue,
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        };
      }
      addJsonLd(productSchema);
    }

    // Article schema
    if (article) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: description,
        image: ogImage || DEFAULT_IMAGE,
        url: canonical,
        datePublished: article.publishedTime,
        dateModified: article.modifiedTime || article.publishedTime,
        author: { '@type': 'Person', name: article.author || SITE_NAME },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.ico` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      });
    }

    return () => {
      removeJsonLd();
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, ogImageAlt, noindex, product, article, breadcrumbs]);

  return null;
};
