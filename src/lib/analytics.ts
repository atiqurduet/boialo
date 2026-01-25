// Comprehensive Analytics & Pixel Tracking System
// Supports: Facebook/Meta Pixel, Google Analytics GA4, TikTok Pixel

// Get pixel IDs from site settings or environment
let FB_PIXEL_ID: string | null = null;
let GA_MEASUREMENT_ID: string | null = null;
let TIKTOK_PIXEL_ID: string | null = null;

// Type definitions
interface ProductData {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  quantity?: number;
  variant?: string;
}

interface PurchaseData {
  transaction_id: string;
  value: number;
  currency: string;
  items: ProductData[];
  shipping?: number;
  tax?: number;
  coupon?: string;
}

interface LeadData {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
}

interface SearchData {
  search_term: string;
  content_category?: string;
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}

// Initialize pixel IDs
export const initializePixels = (config: {
  fbPixelId?: string;
  gaMeasurementId?: string;
  tiktokPixelId?: string;
}) => {
  FB_PIXEL_ID = config.fbPixelId || null;
  GA_MEASUREMENT_ID = config.gaMeasurementId || null;
  TIKTOK_PIXEL_ID = config.tiktokPixelId || null;

  // Initialize Facebook Pixel
  if (FB_PIXEL_ID && typeof window !== 'undefined') {
    initFacebookPixel(FB_PIXEL_ID);
  }

  // Initialize Google Analytics
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    initGoogleAnalytics(GA_MEASUREMENT_ID);
  }

  // Initialize TikTok Pixel
  if (TIKTOK_PIXEL_ID && typeof window !== 'undefined') {
    initTikTokPixel(TIKTOK_PIXEL_ID);
  }
};

// ==================== FACEBOOK PIXEL ====================
const initFacebookPixel = (pixelId: string) => {
  if ((window as any).fbq) return;

  const fbq = function(...args: any[]) {
    (fbq as any).callMethod 
      ? (fbq as any).callMethod.apply(fbq, args) 
      : (fbq as any).queue.push(args);
  };
  
  (fbq as any).push = fbq;
  (fbq as any).loaded = true;
  (fbq as any).version = '2.0';
  (fbq as any).queue = [];
  (window as any).fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  fbq('init', pixelId);
  fbq('track', 'PageView');

  // Create noscript fallback
  const noscript = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
  noscript.appendChild(img);
  document.body.appendChild(noscript);
};

const fbTrack = (event: string, params?: object) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params);
  }
};

const fbTrackCustom = (event: string, params?: object) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', event, params);
  }
};

// ==================== GOOGLE ANALYTICS GA4 ====================
const initGoogleAnalytics = (measurementId: string) => {
  if ((window as any).gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(arguments);
  }
  (window as any).gtag = gtag;
  
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
  });
};

const gaTrack = (event: string, params?: object) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, params);
  }
};

// ==================== TIKTOK PIXEL ====================
const initTikTokPixel = (pixelId: string) => {
  if ((window as any).ttq) return;

  const w = window as any;
  w.TiktokAnalyticsObject = 'ttq';
  
  const ttq: any = w.ttq = w.ttq || [];
  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
  ttq.setAndDefer = function(t: any, e: string) {
    t[e] = function() {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  
  for (let i = 0; i < ttq.methods.length; i++) {
    ttq.setAndDefer(ttq, ttq.methods[i]);
  }
  
  ttq.instance = function(t: string) {
    const e = ttq._i[t] || [];
    for (let n = 0; n < ttq.methods.length; n++) {
      ttq.setAndDefer(e, ttq.methods[n]);
    }
    return e;
  };
  
  ttq.load = function(e: string, n?: any) {
    const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    ttq._i = ttq._i || {};
    ttq._i[e] = [];
    ttq._i[e]._u = i;
    ttq._t = ttq._t || {};
    ttq._t[e] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[e] = n || {};
    
    const o = document.createElement('script');
    o.type = 'text/javascript';
    o.async = true;
    o.src = i + '?sdkid=' + e + '&lib=' + 'ttq';
    const a = document.getElementsByTagName('script')[0];
    a.parentNode?.insertBefore(o, a);
  };
  
  ttq.load(pixelId);
  ttq.page();
};

const ttTrack = (event: string, params?: object) => {
  if (typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.track(event, params);
  }
};

// ==================== UNIFIED TRACKING EVENTS ====================

// Page View
export const trackPageView = (pagePath?: string, pageTitle?: string) => {
  // Facebook
  fbTrack('PageView');
  
  // Google Analytics
  gaTrack('page_view', {
    page_path: pagePath || window.location.pathname,
    page_title: pageTitle || document.title,
  });
  
  // TikTok
  if ((window as any).ttq) {
    (window as any).ttq.page();
  }
};

// View Content / Product
export const trackViewContent = (product: ProductData) => {
  // Facebook
  fbTrack('ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    content_category: product.category,
    value: product.price,
    currency: 'BDT',
  });

  // Google Analytics
  gaTrack('view_item', {
    currency: 'BDT',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      item_brand: product.brand,
      price: product.price,
      quantity: 1,
    }],
  });

  // TikTok
  ttTrack('ViewContent', {
    content_id: product.id,
    content_name: product.name,
    content_type: 'product',
    content_category: product.category,
    value: product.price,
    currency: 'BDT',
  });
};

// Add to Cart
export const trackAddToCart = (product: ProductData) => {
  const quantity = product.quantity || 1;
  const value = product.price * quantity;

  // Facebook
  fbTrack('AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: value,
    currency: 'BDT',
    num_items: quantity,
  });

  // Google Analytics
  gaTrack('add_to_cart', {
    currency: 'BDT',
    value: value,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      item_brand: product.brand,
      price: product.price,
      quantity: quantity,
    }],
  });

  // TikTok
  ttTrack('AddToCart', {
    content_id: product.id,
    content_name: product.name,
    content_type: 'product',
    value: value,
    currency: 'BDT',
    quantity: quantity,
  });
};

// Remove from Cart
export const trackRemoveFromCart = (product: ProductData) => {
  // Google Analytics
  gaTrack('remove_from_cart', {
    currency: 'BDT',
    value: product.price * (product.quantity || 1),
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      quantity: product.quantity || 1,
    }],
  });

  // Facebook Custom
  fbTrackCustom('RemoveFromCart', {
    content_ids: [product.id],
    content_name: product.name,
    value: product.price * (product.quantity || 1),
    currency: 'BDT',
  });
};

// Add to Wishlist
export const trackAddToWishlist = (product: ProductData) => {
  // Facebook
  fbTrack('AddToWishlist', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price,
    currency: 'BDT',
  });

  // Google Analytics
  gaTrack('add_to_wishlist', {
    currency: 'BDT',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    }],
  });

  // TikTok
  ttTrack('AddToWishlist', {
    content_id: product.id,
    content_name: product.name,
    value: product.price,
    currency: 'BDT',
  });
};

// Initiate Checkout
export const trackInitiateCheckout = (items: ProductData[], totalValue: number) => {
  const numItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Facebook
  fbTrack('InitiateCheckout', {
    content_ids: items.map(item => item.id),
    content_type: 'product',
    value: totalValue,
    currency: 'BDT',
    num_items: numItems,
  });

  // Google Analytics
  gaTrack('begin_checkout', {
    currency: 'BDT',
    value: totalValue,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price,
      quantity: item.quantity || 1,
    })),
  });

  // TikTok
  ttTrack('InitiateCheckout', {
    content_ids: items.map(item => item.id),
    value: totalValue,
    currency: 'BDT',
    quantity: numItems,
  });
};

// Add Payment Info
export const trackAddPaymentInfo = (paymentMethod: string, totalValue: number) => {
  // Facebook
  fbTrack('AddPaymentInfo', {
    value: totalValue,
    currency: 'BDT',
    content_category: paymentMethod,
  });

  // Google Analytics
  gaTrack('add_payment_info', {
    currency: 'BDT',
    value: totalValue,
    payment_type: paymentMethod,
  });

  // TikTok
  ttTrack('AddPaymentInfo', {
    value: totalValue,
    currency: 'BDT',
    payment_method: paymentMethod,
  });
};

// Add Shipping Info
export const trackAddShippingInfo = (shippingMethod: string, totalValue: number) => {
  // Google Analytics
  gaTrack('add_shipping_info', {
    currency: 'BDT',
    value: totalValue,
    shipping_tier: shippingMethod,
  });

  // Facebook Custom
  fbTrackCustom('AddShippingInfo', {
    value: totalValue,
    currency: 'BDT',
    shipping_method: shippingMethod,
  });
};

// Purchase / Order Complete
export const trackPurchase = (purchaseData: PurchaseData) => {
  const numItems = purchaseData.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Facebook
  fbTrack('Purchase', {
    content_ids: purchaseData.items.map(item => item.id),
    content_type: 'product',
    value: purchaseData.value,
    currency: purchaseData.currency,
    num_items: numItems,
    order_id: purchaseData.transaction_id,
  });

  // Google Analytics
  gaTrack('purchase', {
    transaction_id: purchaseData.transaction_id,
    value: purchaseData.value,
    currency: purchaseData.currency,
    shipping: purchaseData.shipping || 0,
    tax: purchaseData.tax || 0,
    coupon: purchaseData.coupon,
    items: purchaseData.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      item_brand: item.brand,
      price: item.price,
      quantity: item.quantity || 1,
    })),
  });

  // TikTok
  ttTrack('CompletePayment', {
    content_ids: purchaseData.items.map(item => item.id),
    content_type: 'product',
    value: purchaseData.value,
    currency: purchaseData.currency,
    quantity: numItems,
  });
};

// Search
export const trackSearch = (searchData: SearchData) => {
  // Facebook
  fbTrack('Search', {
    search_string: searchData.search_term,
    content_category: searchData.content_category,
  });

  // Google Analytics
  gaTrack('search', {
    search_term: searchData.search_term,
  });

  // TikTok
  ttTrack('Search', {
    query: searchData.search_term,
  });
};

// View Category
export const trackViewCategory = (categoryName: string, categoryId?: string) => {
  // Facebook Custom
  fbTrackCustom('ViewCategory', {
    content_category: categoryName,
    content_ids: categoryId ? [categoryId] : undefined,
  });

  // Google Analytics
  gaTrack('view_item_list', {
    item_list_id: categoryId,
    item_list_name: categoryName,
  });

  // TikTok
  ttTrack('Browse', {
    content_category: categoryName,
  });
};

// Lead / Contact Form
export const trackLead = (leadData?: LeadData) => {
  // Facebook
  fbTrack('Lead', leadData);

  // Google Analytics
  gaTrack('generate_lead', {
    value: leadData?.value,
    currency: leadData?.currency || 'BDT',
  });

  // TikTok
  ttTrack('SubmitForm', leadData);
};

// Complete Registration
export const trackCompleteRegistration = (method?: string) => {
  // Facebook
  fbTrack('CompleteRegistration', {
    content_name: method || 'email',
    status: 'success',
  });

  // Google Analytics
  gaTrack('sign_up', {
    method: method || 'email',
  });

  // TikTok
  ttTrack('CompleteRegistration', {
    registration_method: method || 'email',
  });
};

// Login
export const trackLogin = (method?: string) => {
  // Google Analytics
  gaTrack('login', {
    method: method || 'email',
  });

  // Facebook Custom
  fbTrackCustom('Login', {
    method: method || 'email',
  });
};

// Contact
export const trackContact = (contactMethod?: string) => {
  // Facebook
  fbTrack('Contact');

  // Google Analytics
  gaTrack('contact', {
    method: contactMethod,
  });

  // TikTok Custom
  ttTrack('Contact', {
    method: contactMethod,
  });
};

// Subscribe (Newsletter)
export const trackSubscribe = (subscriptionType?: string) => {
  // Facebook
  fbTrack('Subscribe', {
    value: 0,
    currency: 'BDT',
    predicted_ltv: 0,
  });

  // Google Analytics Custom
  gaTrack('subscribe', {
    subscription_type: subscriptionType || 'newsletter',
  });

  // TikTok
  ttTrack('Subscribe', {
    type: subscriptionType || 'newsletter',
  });
};

// View Product List (Category/Collection)
export const trackViewProductList = (listName: string, products: ProductData[]) => {
  // Google Analytics
  gaTrack('view_item_list', {
    item_list_name: listName,
    items: products.map((product, index) => ({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      item_brand: product.brand,
      price: product.price,
      index: index,
    })),
  });

  // Facebook Custom
  fbTrackCustom('ViewProductList', {
    content_category: listName,
    content_ids: products.map(p => p.id),
    num_items: products.length,
  });
};

// Select Item (Product Click from List)
export const trackSelectItem = (product: ProductData, listName?: string) => {
  // Google Analytics
  gaTrack('select_item', {
    item_list_name: listName,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    }],
  });
};

// Share
export const trackShare = (method: string, contentType: string, itemId: string) => {
  // Google Analytics
  gaTrack('share', {
    method: method,
    content_type: contentType,
    item_id: itemId,
  });

  // Facebook Custom
  fbTrackCustom('Share', {
    method: method,
    content_type: contentType,
    content_id: itemId,
  });
};

// Set User Data for Advanced Matching
export const setUserData = (userData: UserData) => {
  // Facebook Advanced Matching
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('init', FB_PIXEL_ID, {
      em: userData.email,
      ph: userData.phone,
      fn: userData.firstName,
      ln: userData.lastName,
      ct: userData.city,
      country: userData.country,
    });
  }

  // Google Analytics User Properties
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('set', 'user_properties', {
      user_email: userData.email,
      user_phone: userData.phone,
    });
  }

  // TikTok Identify
  if (typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.identify({
      email: userData.email,
      phone_number: userData.phone,
    });
  }
};

// Custom Event (for any other tracking needs)
export const trackCustomEvent = (eventName: string, params?: object) => {
  fbTrackCustom(eventName, params);
  gaTrack(eventName, params);
  ttTrack(eventName, params);
};

export default {
  initializePixels,
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackRemoveFromCart,
  trackAddToWishlist,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackPurchase,
  trackSearch,
  trackViewCategory,
  trackLead,
  trackCompleteRegistration,
  trackLogin,
  trackContact,
  trackSubscribe,
  trackViewProductList,
  trackSelectItem,
  trackShare,
  setUserData,
  trackCustomEvent,
};
