// Conversion Funnel Tracking - Auto-tracks user progression through funnels
import { supabase } from '@/integrations/supabase/client';

// Default e-commerce funnel steps
const DEFAULT_FUNNEL_STEPS = [
  { name: 'PageView', index: 0 },
  { name: 'ViewContent', index: 1 },
  { name: 'AddToCart', index: 2 },
  { name: 'InitiateCheckout', index: 3 },
  { name: 'AddPaymentInfo', index: 4 },
  { name: 'Purchase', index: 5 },
];

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

// Track a funnel step
export const trackFunnelStep = async (
  stepName: string,
  funnelId?: string,
  metadata?: Record<string, any>
) => {
  const step = DEFAULT_FUNNEL_STEPS.find(s => s.name === stepName);
  if (!step && !funnelId) return; // Not a default funnel step and no custom funnel

  try {
    await supabase.from('funnel_events').insert({
      funnel_id: funnelId || null,
      session_id: getSessionId(),
      step_index: step?.index ?? 0,
      step_name: stepName,
      completed: true,
      metadata: metadata || {},
    });
  } catch (e) {
    console.debug('Funnel tracking failed:', e);
  }
};

// Get funnel analytics (admin)
export const getFunnelAnalytics = async (funnelId?: string, days: number = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  
  try {
    const { data } = await supabase
      .from('funnel_events')
      .select('step_name, step_index, session_id')
      .gte('created_at', since)
      .order('step_index', { ascending: true });

    if (!data) return [];

    // Group by step and count unique sessions
    const stepMap = new Map<string, Set<string>>();
    data.forEach(evt => {
      if (!stepMap.has(evt.step_name)) {
        stepMap.set(evt.step_name, new Set());
      }
      stepMap.get(evt.step_name)!.add(evt.session_id);
    });

    const steps = DEFAULT_FUNNEL_STEPS.map(step => ({
      name: step.name,
      index: step.index,
      count: stepMap.get(step.name)?.size || 0,
    }));

    // Calculate drop-off rates
    return steps.map((step, i) => ({
      ...step,
      dropOff: i > 0 && steps[i - 1].count > 0
        ? Math.round((1 - step.count / steps[i - 1].count) * 100)
        : 0,
      conversionRate: steps[0].count > 0
        ? Math.round((step.count / steps[0].count) * 100)
        : 0,
    }));
  } catch { return []; }
};

// Auto-integrate with serverTrack events
export const autoTrackFunnel = (eventName: string, metadata?: Record<string, any>) => {
  const funnelStep = DEFAULT_FUNNEL_STEPS.find(s => s.name === eventName);
  if (funnelStep) {
    trackFunnelStep(eventName, undefined, metadata);
  }
};
