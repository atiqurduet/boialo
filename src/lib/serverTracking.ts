// Server-Side Tracking - Professional Grade, Ad-Blocker Proof
// Features: Fingerprinting, Bot Detection, Engagement Scoring, Attribution, Web Vitals, Heatmap, Deduplication

const QUEUE: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 2500;
const MAX_BATCH = 25;

// ─── Fingerprinting ───────────────────────────────────────
const generateFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp_test', 2, 2);
  }
  const canvasHash = canvas.toDataURL().slice(-50);

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    navigator.maxTouchPoints || 0,
    canvasHash,
    !!window.indexedDB,
    !!window.sessionStorage,
    !!(navigator as any).webdriver,
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
};

let cachedFingerprint: string | null = null;
const getFingerprint = () => {
  if (!cachedFingerprint) {
    try { cachedFingerprint = generateFingerprint(); } catch { cachedFingerprint = 'fp_unknown'; }
  }
  return cachedFingerprint;
};

// ─── Session Management ───────────────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

// ─── UTM Persistence ──────────────────────────────────────
const persistUTM = () => {
  const p = new URLSearchParams(window.location.search);
  const source = p.get('utm_source');
  if (source) {
    const utm = {
      utm_source: source,
      utm_medium: p.get('utm_medium') || null,
      utm_campaign: p.get('utm_campaign') || null,
      timestamp: Date.now(),
    };
    // First touch
    if (!localStorage.getItem('first_touch_utm')) {
      localStorage.setItem('first_touch_utm', JSON.stringify(utm));
    }
    // Last touch always updates
    localStorage.setItem('last_touch_utm', JSON.stringify(utm));

    // Touchpoints trail (max 20)
    try {
      const trail = JSON.parse(localStorage.getItem('utm_trail') || '[]');
      trail.push(utm);
      if (trail.length > 20) trail.shift();
      localStorage.setItem('utm_trail', JSON.stringify(trail));
    } catch {}
  }
};

const getAttribution = () => {
  try {
    const first = JSON.parse(localStorage.getItem('first_touch_utm') || '{}');
    const last = JSON.parse(localStorage.getItem('last_touch_utm') || '{}');
    return {
      attribution_source: last.utm_source || first.utm_source || document.referrer || 'direct',
      attribution_medium: last.utm_medium || first.utm_medium || null,
      attribution_campaign: last.utm_campaign || first.utm_campaign || null,
      attribution_type: last.utm_source ? 'last_touch' : 'first_touch',
    };
  } catch { return { attribution_source: 'direct', attribution_medium: null, attribution_campaign: null, attribution_type: 'direct' }; }
};

// ─── Device Detection ─────────────────────────────────────
const getDeviceType = () => {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};

const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
};

const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Other';
};

const getConnectionType = () => {
  try {
    const conn = (navigator as any).connection;
    if (conn) return conn.effectiveType || conn.type || 'unknown';
  } catch {}
  return 'unknown';
};

// ─── Bot Detection ────────────────────────────────────────
const detectBot = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  const botPatterns = [
    'bot', 'crawl', 'spider', 'slurp', 'mediapartners',
    'headless', 'phantom', 'selenium', 'puppeteer', 'playwright',
    'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom',
  ];
  if (botPatterns.some(p => ua.includes(p))) return true;
  if ((navigator as any).webdriver) return true;
  if (!(window as any).chrome && ua.includes('chrome')) return true;
  if (navigator.languages && navigator.languages.length === 0) return true;
  return false;
};

// ─── Location from Timezone ───────────────────────────────
const getLocation = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    return { country: parts[0] || null, city: parts.length >= 2 ? parts[parts.length - 1].replace(/_/g, ' ') : null };
  } catch { return { country: null, city: null }; }
};

// ─── UTM from URL ─────────────────────────────────────────
const getUTM = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || null,
    utm_medium: p.get('utm_medium') || null,
    utm_campaign: p.get('utm_campaign') || null,
  };
};

// ─── Deduplication ────────────────────────────────────────
const generateDedupKey = (eventName: string, data?: Record<string, any>) => {
  const key = `${getSessionId()}_${eventName}_${window.location.pathname}_${Math.floor(Date.now() / 5000)}`;
  if (data?.content_id) return `${key}_${data.content_id}`;
  if (data?.transaction_id) return `${key}_${data.transaction_id}`;
  return key;
};

// ─── Flush Queue ──────────────────────────────────────────
const flush = async () => {
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, MAX_BATCH);

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server-track`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch (e) {
    console.debug('Server tracking flush failed:', e);
  }
};

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
};

// Flush on page unload
if (typeof window !== 'undefined') {
  persistUTM();
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

// ─── Core Track Function ──────────────────────────────────
export const serverTrack = (eventName: string, eventData?: Record<string, any>, userId?: string) => {
  if (typeof window === 'undefined') return;

  const loc = getLocation();
  const utm = getUTM();
  const attribution = getAttribution();
  const isBot = detectBot();

  QUEUE.push({
    event_name: eventName,
    event_data: eventData || {},
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || null,
    user_id: userId || null,
    session_id: getSessionId(),
    fingerprint_id: getFingerprint(),
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screen_resolution: `${screen.width}x${screen.height}`,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    language: navigator.language,
    connection_type: getConnectionType(),
    is_bot: isBot,
    dedup_key: generateDedupKey(eventName, eventData),
    ...loc,
    ...utm,
    ...attribution,
  });

  if (QUEUE.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
};

// ─── Scroll Depth Tracking ────────────────────────────────
let maxScrollDepth = 0;
let scrollTrackingActive = false;

export const startScrollTracking = () => {
  if (scrollTrackingActive) return;
  scrollTrackingActive = true;
  maxScrollDepth = 0;

  const handler = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
    ) - window.innerHeight;
    
    if (docHeight > 0) {
      const depth = Math.round((scrollTop / docHeight) * 100);
      if (depth > maxScrollDepth) maxScrollDepth = depth;
    }
  };

  window.addEventListener('scroll', handler, { passive: true });

  // Report on unload
  const reportScroll = () => {
    if (maxScrollDepth > 0) {
      serverTrack('ScrollDepth', {
        depth: maxScrollDepth,
        path: window.location.pathname,
        milestone: maxScrollDepth >= 90 ? 'complete' : maxScrollDepth >= 75 ? 'deep' : maxScrollDepth >= 50 ? 'mid' : maxScrollDepth >= 25 ? 'shallow' : 'bounce',
      });
    }
    window.removeEventListener('scroll', handler);
    scrollTrackingActive = false;
  };

  window.addEventListener('beforeunload', reportScroll, { once: true });
};

// ─── Engagement Scoring ───────────────────────────────────
let engagementData = {
  clicks: 0,
  keystrokes: 0,
  scrollEvents: 0,
  rageClicks: 0,
  deadClicks: 0,
  startTime: Date.now(),
  lastClickTime: 0,
  lastClickX: 0,
  lastClickY: 0,
  rapidClickCount: 0,
};

const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_INTERVAL = 800;
const RAGE_CLICK_RADIUS = 30;

export const startEngagementTracking = () => {
  // Click tracking with rage/dead click detection
  document.addEventListener('click', (e) => {
    engagementData.clicks++;
    const now = Date.now();
    const dx = Math.abs(e.clientX - engagementData.lastClickX);
    const dy = Math.abs(e.clientY - engagementData.lastClickY);

    // Rage click: multiple fast clicks in same area
    if (
      now - engagementData.lastClickTime < RAGE_CLICK_INTERVAL &&
      dx < RAGE_CLICK_RADIUS && dy < RAGE_CLICK_RADIUS
    ) {
      engagementData.rapidClickCount++;
      if (engagementData.rapidClickCount >= RAGE_CLICK_THRESHOLD) {
        engagementData.rageClicks++;
        serverTrack('RageClick', {
          x: e.clientX, y: e.clientY,
          element: (e.target as HTMLElement)?.tagName,
          path: window.location.pathname,
        });
        engagementData.rapidClickCount = 0;
      }
    } else {
      engagementData.rapidClickCount = 1;
    }

    // Dead click: click on non-interactive element
    const target = e.target as HTMLElement;
    const interactive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
    const isInteractive = interactive.includes(target.tagName) ||
      target.closest('a, button, [role="button"], [onclick]') ||
      target.getAttribute('role') === 'button';

    if (!isInteractive) {
      engagementData.deadClicks++;
    }

    engagementData.lastClickTime = now;
    engagementData.lastClickX = e.clientX;
    engagementData.lastClickY = e.clientY;
  }, { passive: true });

  // Keystroke tracking
  document.addEventListener('keydown', () => {
    engagementData.keystrokes++;
  }, { passive: true });

  // Scroll event counting
  let scrollDebounce: ReturnType<typeof setTimeout>;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      engagementData.scrollEvents++;
    }, 150);
  }, { passive: true });
};

export const getEngagementScore = (): number => {
  const timeOnPage = (Date.now() - engagementData.startTime) / 1000;
  let score = 0;

  // Time contribution (max 30 points)
  score += Math.min(30, timeOnPage / 10);
  // Click contribution (max 20 points)
  score += Math.min(20, engagementData.clicks * 2);
  // Scroll contribution (max 20 points)
  score += Math.min(20, maxScrollDepth / 5);
  // Keystroke contribution (max 15 points)
  score += Math.min(15, engagementData.keystrokes);
  // Penalty for rage clicks
  score -= engagementData.rageClicks * 5;
  // Penalty for dead clicks
  score -= engagementData.deadClicks * 2;

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
};

export const resetEngagement = () => {
  engagementData = {
    clicks: 0, keystrokes: 0, scrollEvents: 0,
    rageClicks: 0, deadClicks: 0,
    startTime: Date.now(),
    lastClickTime: 0, lastClickX: 0, lastClickY: 0,
    rapidClickCount: 0,
  };
  maxScrollDepth = 0;
};

// ─── Exit Intent Detection ────────────────────────────────
let exitIntentTracked = false;
export const startExitIntentTracking = (callback?: () => void) => {
  if (typeof window === 'undefined') return;

  document.addEventListener('mouseout', (e) => {
    if (exitIntentTracked) return;
    if (e.clientY <= 0 && e.relatedTarget === null) {
      exitIntentTracked = true;
      serverTrack('ExitIntent', {
        path: window.location.pathname,
        time_on_page: Math.round((Date.now() - engagementData.startTime) / 1000),
        scroll_depth: maxScrollDepth,
        engagement_score: getEngagementScore(),
      });
      callback?.();
    }
  });
};

// ─── Core Web Vitals ──────────────────────────────────────
export const trackCoreWebVitals = () => {
  if (typeof window === 'undefined') return;

  const vitals: Record<string, number> = {};

  // LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry) {
        vitals.lcp = Math.round(lastEntry.startTime);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  // FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries[0]) {
        vitals.fid = Math.round((entries[0] as any).processingStart - entries[0].startTime);
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {}

  // CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      vitals.cls = Math.round(clsValue * 1000) / 1000;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // FCP (First Contentful Paint)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries[0]) vitals.fcp = Math.round(entries[0].startTime);
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {}

  // TTFB
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      vitals.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
      vitals.page_load_time = Math.round(navEntry.loadEventEnd - navEntry.startTime);
    }
  } catch {}

  // Send after 10 seconds to capture all metrics
  setTimeout(() => {
    if (Object.keys(vitals).length > 0) {
      serverTrack('WebVitals', {
        ...vitals,
        path: window.location.pathname,
        connection: getConnectionType(),
      });
    }
  }, 10000);
};

// ─── Click Heatmap Data ───────────────────────────────────
export const startHeatmapTracking = () => {
  if (typeof window === 'undefined') return;
  
  const clicks: Array<{ x: number; y: number; el: string; t: number }> = [];

  document.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    clicks.push({
      x: Math.round((e.clientX / window.innerWidth) * 100),
      y: Math.round((e.clientY / window.innerHeight) * 100),
      el: el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
      t: Date.now(),
    });

    // Batch send every 20 clicks
    if (clicks.length >= 20) {
      serverTrack('HeatmapData', {
        path: window.location.pathname,
        clicks: clicks.splice(0, 20),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
    }
  }, { passive: true });

  // Flush remaining on unload
  window.addEventListener('beforeunload', () => {
    if (clicks.length > 0) {
      serverTrack('HeatmapData', {
        path: window.location.pathname,
        clicks: clicks.splice(0),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
    }
  });
};

// ─── Page Performance Tracking ────────────────────────────
export const trackPagePerformance = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!nav) return;

      serverTrack('PagePerformance', {
        path: window.location.pathname,
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        download: Math.round(nav.responseEnd - nav.responseStart),
        dom_interactive: Math.round(nav.domInteractive - nav.startTime),
        dom_complete: Math.round(nav.domComplete - nav.startTime),
        load_complete: Math.round(nav.loadEventEnd - nav.startTime),
        transfer_size: nav.transferSize,
        resources: performance.getEntriesByType('resource').length,
      });
    }, 1000);
  });
};

// ─── Engagement Report on Page Leave ──────────────────────
export const reportEngagement = (userId?: string) => {
  const score = getEngagementScore();
  const timeOnPage = Math.round((Date.now() - engagementData.startTime) / 1000);

  if (timeOnPage < 2) return; // Skip very short visits

  serverTrack('EngagementReport', {
    path: window.location.pathname,
    engagement_score: score,
    time_on_page: timeOnPage,
    scroll_depth: maxScrollDepth,
    clicks: engagementData.clicks,
    keystrokes: engagementData.keystrokes,
    rage_clicks: engagementData.rageClicks,
    dead_clicks: engagementData.deadClicks,
    scroll_events: engagementData.scrollEvents,
  }, userId);
};

// ─── Convenience Exports ──────────────────────────────────
export const serverTrackPageView = (userId?: string) =>
  serverTrack('PageView', { path: window.location.pathname, title: document.title }, userId);

export const serverTrackAddToCart = (product: { id: string; name: string; price: number; quantity?: number }, userId?: string) =>
  serverTrack('AddToCart', { content_id: product.id, content_name: product.name, value: product.price * (product.quantity || 1), currency: 'BDT', quantity: product.quantity || 1 }, userId);

export const serverTrackPurchase = (data: { transaction_id: string; value: number; items: any[] }, userId?: string) =>
  serverTrack('Purchase', { transaction_id: data.transaction_id, value: data.value, currency: 'BDT', num_items: data.items.length, items: data.items }, userId);

export const serverTrackViewContent = (product: { id: string; name: string; price: number; category?: string }, userId?: string) =>
  serverTrack('ViewContent', { content_id: product.id, content_name: product.name, value: product.price, currency: 'BDT', content_category: product.category }, userId);

export const serverTrackSearch = (query: string, userId?: string) =>
  serverTrack('Search', { search_term: query }, userId);

export const serverTrackInitiateCheckout = (value: number, numItems: number, userId?: string) =>
  serverTrack('InitiateCheckout', { value, currency: 'BDT', num_items: numItems }, userId);

export const serverTrackLead = (data?: Record<string, any>, userId?: string) =>
  serverTrack('Lead', data, userId);

export const serverTrackSignUp = (method: string, userId?: string) =>
  serverTrack('CompleteRegistration', { method }, userId);

export const serverTrackAddToWishlist = (product: { id: string; name: string; price: number }, userId?: string) =>
  serverTrack('AddToWishlist', { content_id: product.id, content_name: product.name, value: product.price, currency: 'BDT' }, userId);

export const serverTrackShare = (contentType: string, contentId: string, method: string, userId?: string) =>
  serverTrack('Share', { content_type: contentType, content_id: contentId, method }, userId);

export const serverTrackFormSubmit = (formName: string, userId?: string) =>
  serverTrack('FormSubmit', { form_name: formName }, userId);

export const serverTrackError = (errorType: string, errorMessage: string, userId?: string) =>
  serverTrack('Error', { error_type: errorType, error_message: errorMessage }, userId);

export const serverTrackTiming = (category: string, variable: string, value: number, userId?: string) =>
  serverTrack('Timing', { category, variable, value }, userId);
