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
  const now = new Date().toISOString();

  try {
    // Check if cohort entry exists
    const { data: existing } = await supabase
      .from('retention_cohorts')
      .select('id, visit_count, total_page_views, first_visit_at')
      .eq('fingerprint_id', fingerprint)
      .eq('cohort_date', cohortDate)
      .eq('cohort_type', 'weekly')
      .maybeSingle();

    if (existing) {
      const daysSinceFirst = Math.floor(
        (Date.now() - new Date(existing.first_visit_at).getTime()) / (24 * 60 * 60_000)
      );

      await supabase.from('retention_cohorts').update({
        last_visit_at: now,
        visit_count: (existing.visit_count || 0) + 1,
        total_page_views: (existing.total_page_views || 0) + 1,
        days_since_first_visit: daysSinceFirst,
        user_id: userId || undefined,
        is_retained: true,
        updated_at: now,
      }).eq('id', existing.id);
    } else {
      await supabase.from('retention_cohorts').insert({
        cohort_date: cohortDate,
        cohort_type: 'weekly',
        fingerprint_id: fingerprint,
        user_id: userId || null,
        first_visit_at: now,
        last_visit_at: now,
        visit_count: 1,
        total_page_views: 1,
        total_sessions: 1,
        days_since_first_visit: 0,
        is_retained: true,
      });
    }
  } catch (e) {
    console.debug('Retention tracking failed:', e);
  }
};

// Track conversion in retention cohort
export const trackRetentionConversion = async (revenue: number) => {
  const fingerprint = getFingerprint();
  const cohortDate = getWeekStart(new Date());

  try {
    const { data } = await supabase
      .from('retention_cohorts')
      .select('id, total_conversions, total_revenue')
      .eq('fingerprint_id', fingerprint)
      .eq('cohort_date', cohortDate)
      .maybeSingle();

    if (data) {
      await supabase.from('retention_cohorts').update({
        total_conversions: (data.total_conversions || 0) + 1,
        total_revenue: (data.total_revenue || 0) + revenue,
        updated_at: new Date().toISOString(),
      }).eq('id', data.id);
    }
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
