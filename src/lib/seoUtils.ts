import { supabase } from '@/integrations/supabase/client';

// IndexNow - Instant indexing for Bing, Yandex, Seznam, Naver
export const submitToIndexNow = async (urls: string | string[]) => {
  try {
    const { data, error } = await supabase.functions.invoke('indexnow', {
      body: { urls, host: 'boialo.com' },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('IndexNow submission failed:', e);
    return null;
  }
};

// Google Indexing API
export const submitToGoogleIndexing = async (url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') => {
  try {
    const { data, error } = await supabase.functions.invoke('google-indexing', {
      body: { url, type },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Google Indexing submission failed:', e);
    return null;
  }
};

// Submit to both Google and Bing when content changes
export const notifySearchEngines = async (urls: string | string[]) => {
  const urlList = Array.isArray(urls) ? urls : [urls];
  const fullUrls = urlList.map(u => u.startsWith('http') ? u : `https://boialo.com${u}`);
  
  await Promise.allSettled([
    submitToIndexNow(fullUrls),
    ...fullUrls.map(u => submitToGoogleIndexing(u)),
  ]);
};

// Generate FAQ Schema for product pages
export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};

// Generate HowTo Schema
export const generateHowToSchema = (name: string, steps: { name: string; text: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  step: steps.map((step, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: step.name,
    text: step.text,
  })),
});

// Generate LocalBusiness Schema
export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'বইআলো',
  alternateName: 'Boialo',
  url: 'https://boialo.com',
  logo: 'https://boialo.com/favicon.ico',
  image: 'https://boialo.com/og-image.png',
  priceRange: '৳৳',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BD',
    addressLocality: 'Dhaka',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '23.8103',
    longitude: '90.4125',
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Bengali', 'English'],
  },
});

// Generate CollectionPage Schema for category pages
export const generateCollectionSchema = (name: string, description: string, url: string, items: { name: string; url: string; image?: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  description,
  url,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
      ...(item.image ? { image: item.image } : {}),
    })),
  },
});

// Generate SiteNavigationElement for better crawling
export const getSiteNavigationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SiteNavigationElement',
  name: 'Main Navigation',
  url: 'https://boialo.com',
  hasPart: [
    { '@type': 'SiteNavigationElement', name: 'বই', url: 'https://boialo.com/shop' },
    { '@type': 'SiteNavigationElement', name: 'ক্যাটাগরি', url: 'https://boialo.com/categories' },
    { '@type': 'SiteNavigationElement', name: 'লেখক', url: 'https://boialo.com/authors' },
    { '@type': 'SiteNavigationElement', name: 'প্রকাশনী', url: 'https://boialo.com/publishers' },
    { '@type': 'SiteNavigationElement', name: 'অফার', url: 'https://boialo.com/offers' },
    { '@type': 'SiteNavigationElement', name: 'ব্লগ', url: 'https://boialo.com/blog' },
  ],
});

// Ping search engines after sitemap update
export const pingSitemapToSearchEngines = async () => {
  const sitemapUrl = encodeURIComponent('https://boialo.com/sitemap.xml');
  
  await Promise.allSettled([
    // Google
    fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`),
    // Bing
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`),
    // Yandex
    fetch(`https://webmaster.yandex.com/ping?sitemap=${sitemapUrl}`),
  ]);
};

// Generate internal link suggestions based on content
export const generateInternalLinks = (content: string, existingLinks: { keyword: string; url: string }[]) => {
  const suggestions: { keyword: string; url: string; found: boolean }[] = [];
  
  for (const link of existingLinks) {
    const found = content.toLowerCase().includes(link.keyword.toLowerCase());
    suggestions.push({ ...link, found });
  }
  
  return suggestions;
};

// Check page SEO score
export const calculateSEOScore = (params: {
  title?: string;
  description?: string;
  h1Count?: number;
  imageAltCount?: number;
  totalImages?: number;
  wordCount?: number;
  hasCanonical?: boolean;
  hasStructuredData?: boolean;
  internalLinks?: number;
  loadTime?: number;
}) => {
  let score = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Title (0-15)
  if (params.title) {
    if (params.title.length >= 30 && params.title.length <= 60) score += 15;
    else if (params.title.length > 0) { score += 8; issues.push('Title should be 30-60 characters'); }
  } else { issues.push('Missing page title'); }

  // Description (0-15)
  if (params.description) {
    if (params.description.length >= 120 && params.description.length <= 160) score += 15;
    else if (params.description.length > 0) { score += 8; issues.push('Description should be 120-160 characters'); }
  } else { issues.push('Missing meta description'); }

  // H1 (0-10)
  if (params.h1Count === 1) score += 10;
  else if ((params.h1Count || 0) > 1) { score += 5; issues.push('Multiple H1 tags found'); }
  else { issues.push('Missing H1 tag'); }

  // Images (0-10)
  if (params.totalImages && params.totalImages > 0) {
    const altRatio = (params.imageAltCount || 0) / params.totalImages;
    score += Math.round(altRatio * 10);
    if (altRatio < 1) issues.push(`${params.totalImages - (params.imageAltCount || 0)} images missing alt text`);
  } else { score += 10; }

  // Content (0-15)
  if ((params.wordCount || 0) >= 300) score += 15;
  else if ((params.wordCount || 0) >= 100) { score += 8; suggestions.push('Add more content (300+ words recommended)'); }
  else { suggestions.push('Very low content - add at least 300 words'); }

  // Canonical (0-10)
  if (params.hasCanonical) score += 10;
  else issues.push('Missing canonical URL');

  // Structured Data (0-10)
  if (params.hasStructuredData) score += 10;
  else suggestions.push('Add structured data (JSON-LD)');

  // Internal Links (0-10)
  if ((params.internalLinks || 0) >= 3) score += 10;
  else if ((params.internalLinks || 0) >= 1) { score += 5; suggestions.push('Add more internal links'); }
  else { suggestions.push('No internal links found'); }

  // Load Time (0-5)
  if (params.loadTime && params.loadTime < 3) score += 5;
  else if (params.loadTime && params.loadTime < 5) { score += 3; suggestions.push('Improve page load time'); }

  return { score, maxScore: 100, issues, suggestions };
};
