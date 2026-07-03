// Retention & Cohort Tracking
import { supabase } from '@/integrations/supabase/client';

const getFingerprint = () => {
  // Use the same fingerprint from serverTracking
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fp_test', 2, 2);
    }
    const canvasHash = canvas.toDataURL().slice(-50);
    const components = [
      navigator.userAgent, navigator.language, screen.colorDepth,
      `${screen.width}x${screen.height}`, new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0, canvasHash,
    ].join('|');
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      hash = ((hash << 5) - hash) + components.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch { return 'fp_unknown'; }
};

const getWeekStart = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
};

export const trackRetention = async (userId?: string | null) => {
  if (typeof window === 'undefined') return;

  const fingerprint = getFingerprint();
  const cohortDate = getWeekStart(new Date());

  try {
    await (supabase as any).rpc('track_retention_visit', {
      p_fingerprint: fingerprint,
      p_cohort_date: cohortDate,
      p_user_id: userId || null,
    });
  } catch (e) {
    console.debug('Retention tracking failed:', e);
  }
};

// Track conversion in retention cohort
export const trackRetentionConversion = async (revenue: number) => {
  const fingerprint = getFingerprint();
  const cohortDate = getWeekStart(new Date());
  try {
    await (supabase as any).rpc('track_retention_conversion', {
      p_fingerprint: fingerprint,
      p_cohort_date: cohortDate,
      p_revenue: revenue,
    });
  } catch {}
};

// Get retention data for admin
export const getRetentionData = async (weeks: number = 8) => {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60_000).toISOString().split('T')[0];

  try {
    const { data } = await supabase
      .from('retention_cohorts')
      .select('*')
      .gte('cohort_date', since)
      .order('cohort_date', { ascending: true });

    return data || [];
  } catch { return []; }
};
