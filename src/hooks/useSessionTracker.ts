import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 60_000; // 1 minute
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

let cachedIp: string | null = null;
const getIp = async () => {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    cachedIp = data.ip;
    return cachedIp;
  } catch { return null; }
};

export const useSessionTracker = (userId: string | null, signOut: () => Promise<void>) => {
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<number>(30); // default 30 min
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Record activity
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Start session
  const startSession = useCallback(async (uid: string) => {
    const ip = await getIp();
    const token = crypto.randomUUID();

    // Mark old sessions inactive
    await supabase
      .from('active_sessions')
      .update({ is_active: false, logged_out_at: new Date().toISOString() })
      .eq('user_id', uid)
      .eq('is_active', true);

    const { data } = await supabase
      .from('active_sessions')
      .insert({
        user_id: uid,
        session_token: token,
        ip_address: ip,
        user_agent: navigator.userAgent,
        is_active: true,
      })
      .select('id')
      .single();

    if (data) sessionIdRef.current = data.id;

    // Fetch user timeout setting
    const { data: setting } = await supabase
      .from('auto_logout_settings')
      .select('timeout_minutes, is_enabled')
      .eq('user_id', uid)
      .maybeSingle();

    if (setting?.is_enabled) {
      timeoutRef.current = setting.timeout_minutes;
    }
  }, []);

  // End session
  const endSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await supabase
        .from('active_sessions')
        .update({ is_active: false, logged_out_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

  // Heartbeat & inactivity check
  useEffect(() => {
    if (!userId) return;

    startSession(userId);

    // Listen for user activity
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, recordActivity, { passive: true }));

    // Heartbeat: update last_activity_at + check timeout
    checkIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      const inactiveMinutes = (now - lastActivityRef.current) / 60_000;

      if (inactiveMinutes >= timeoutRef.current) {
        // Auto logout
        await endSession();
        await signOut();
        return;
      }

      // Update heartbeat
      if (sessionIdRef.current) {
        await supabase
          .from('active_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, recordActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      // Don't await here - fire and forget
      endSession();
    };
  }, [userId, startSession, endSession, recordActivity, signOut]);

  return { endSession };
};
