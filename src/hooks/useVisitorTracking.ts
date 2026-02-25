import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
};

const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
};

const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
  };
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const pageEntryTime = useRef(Date.now());
  const lastPath = useRef('');
  const pageCount = useRef(0);

  useEffect(() => {
    // Send duration for previous page
    const now = Date.now();
    if (lastPath.current && lastPath.current !== location.pathname) {
      const duration = Math.round((now - pageEntryTime.current) / 1000);
      // Update previous record with duration (fire and forget)
      supabase
        .from('visitor_analytics')
        .update({ duration_seconds: duration, is_bounce: pageCount.current <= 1 })
        .eq('session_id', getSessionId())
        .eq('page_path', lastPath.current)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(() => {});
    }

    pageEntryTime.current = now;
    pageCount.current++;
    lastPath.current = location.pathname;

    // Skip admin pages
    if (location.pathname.startsWith('/admin')) return;

    const utm = getUTMParams();
    const record = {
      session_id: getSessionId(),
      user_id: user?.id || null,
      page_path: location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_resolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      country: null as string | null,
      city: null as string | null,
      ...utm,
    };

    // Try to get country from timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const parts = tz.split('/');
        if (parts.length >= 2) {
          record.country = parts[0];
          record.city = parts[parts.length - 1].replace(/_/g, ' ');
        }
      }
    } catch {}

    supabase.from('visitor_analytics').insert(record).then(() => {});
  }, [location.pathname, user?.id]);
};

// Track search queries separately
export const trackSearchQuery = (query: string) => {
  if (!query || query.length < 2) return;
  
  supabase.from('visitor_analytics').insert({
    session_id: getSessionId(),
    page_path: '/search',
    page_title: `Search: ${query}`,
    search_query: query,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screen_resolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
  }).then(() => {});
};
