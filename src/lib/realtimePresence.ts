// Real-time Presence Tracking - Shows live users on site
import { supabase } from '@/integrations/supabase/client';

const PRESENCE_INTERVAL = 30_000; // Update every 30s
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let isTracking = false;

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

const getLocation = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    return { country: parts[0] || null, city: parts.length >= 2 ? parts[parts.length - 1].replace(/_/g, ' ') : null };
  } catch { return { country: null, city: null }; }
};

const updatePresence = async (pagePath: string, userId?: string | null, cartValue?: number) => {
  const sessionId = getSessionId();
  const loc = getLocation();

  try {
    const { data: existing } = await supabase
      .from('realtime_presence')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      await supabase.from('realtime_presence').update({
        page_path: pagePath,
        user_id: userId || null,
        last_seen_at: new Date().toISOString(),
        is_online: true,
        cart_value: cartValue || 0,
      }).eq('session_id', sessionId);
    } else {
      await supabase.from('realtime_presence').insert({
        session_id: sessionId,
        page_path: pagePath,
        user_id: userId || null,
        device_type: getDeviceType(),
        country: loc.country,
        city: loc.city,
        is_online: true,
        cart_value: cartValue || 0,
      });
    }
  } catch (e) {
    console.debug('Presence update failed:', e);
  }
};

const markOffline = async () => {
  const sessionId = getSessionId();
  try {
    await supabase.from('realtime_presence').update({
      is_online: false,
      last_seen_at: new Date().toISOString(),
    }).eq('session_id', sessionId);
  } catch {}
};

export const startPresenceTracking = (userId?: string | null) => {
  if (isTracking || typeof window === 'undefined') return;
  isTracking = true;

  // Initial presence
  updatePresence(window.location.pathname, userId);

  // Periodic updates
  presenceTimer = setInterval(() => {
    updatePresence(window.location.pathname, userId);
  }, PRESENCE_INTERVAL);

  // Mark offline on page close
  window.addEventListener('pagehide', markOffline);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      markOffline();
    } else {
      updatePresence(window.location.pathname, userId);
    }
  });
};

export const updatePresencePage = (pagePath: string, userId?: string | null, cartValue?: number) => {
  updatePresence(pagePath, userId, cartValue);
};

export const stopPresenceTracking = () => {
  if (presenceTimer) clearInterval(presenceTimer);
  markOffline();
  isTracking = false;
};

// Get live visitor count (for admin dashboard)
export const getLiveVisitorCount = async (): Promise<number> => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { count } = await supabase
      .from('realtime_presence')
      .select('id', { count: 'exact', head: true })
      .eq('is_online', true)
      .gte('last_seen_at', fiveMinAgo);
    return count || 0;
  } catch { return 0; }
};

// Get live visitors with details (for admin)
export const getLiveVisitors = async () => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data } = await supabase
      .from('realtime_presence')
      .select('*')
      .eq('is_online', true)
      .gte('last_seen_at', fiveMinAgo)
      .order('last_seen_at', { ascending: false });
    return data || [];
  } catch { return []; }
};
