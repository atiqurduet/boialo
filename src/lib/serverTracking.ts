// Server-Side Tracking - bypasses ad blockers by sending events through Edge Function
import { supabase } from '@/integrations/supabase/client';

const QUEUE: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 3000; // batch every 3s
const MAX_BATCH = 20;

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

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

const getUTM = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || null,
    utm_medium: p.get('utm_medium') || null,
    utm_campaign: p.get('utm_campaign') || null,
  };
};

const getLocation = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    return { country: parts[0] || null, city: parts.length >= 2 ? parts[parts.length - 1].replace(/_/g, ' ') : null };
  } catch { return { country: null, city: null }; }
};

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
    // Silently fail - don't break user experience
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
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

export const serverTrack = (eventName: string, eventData?: Record<string, any>, userId?: string) => {
  if (typeof window === 'undefined') return;

  const loc = getLocation();
  const utm = getUTM();

  QUEUE.push({
    event_name: eventName,
    event_data: eventData || {},
    page_path: window.location.pathname,
    page_title: document.title,
    referrer: document.referrer || null,
    user_id: userId || null,
    session_id: getSessionId(),
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screen_resolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    ...loc,
    ...utm,
  });

  if (QUEUE.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
};

// Convenience exports
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
