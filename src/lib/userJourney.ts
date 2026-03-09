// User Journey Mapping - Full path visualization & pattern detection
import { supabase } from '@/integrations/supabase/client';

interface JourneyStep {
  path: string;
  title: string;
  timestamp: number;
  duration: number; // Time spent on this page (ms)
  scrollDepth: number;
  interactions: number; // clicks on this page
  type: 'page' | 'action' | 'conversion';
  referrer?: string;
}

const JOURNEY_KEY = 'user_journey';
const MAX_STEPS = 50;

let currentStep: JourneyStep | null = null;
let interactionCount = 0;

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

// Get current journey from session
const getJourney = (): JourneyStep[] => {
  try {
    return JSON.parse(sessionStorage.getItem(JOURNEY_KEY) || '[]');
  } catch { return []; }
};

const saveJourney = (journey: JourneyStep[]) => {
  if (journey.length > MAX_STEPS) journey = journey.slice(-MAX_STEPS);
  sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
};

// Track page navigation
export const trackJourneyStep = (path: string, title: string) => {
  // Finalize previous step
  if (currentStep) {
    currentStep.duration = Date.now() - currentStep.timestamp;
    currentStep.interactions = interactionCount;
    const journey = getJourney();
    journey.push(currentStep);
    saveJourney(journey);
  }

  // Start new step
  currentStep = {
    path,
    title,
    timestamp: Date.now(),
    duration: 0,
    scrollDepth: 0,
    interactions: 0,
    type: 'page',
    referrer: currentStep?.path,
  };
  interactionCount = 0;
};

// Track user interactions on current page
export const trackJourneyInteraction = () => {
  interactionCount++;
};

// Track conversion points
export const trackJourneyConversion = (conversionType: string, value?: number) => {
  const journey = getJourney();
  journey.push({
    path: window.location.pathname,
    title: conversionType,
    timestamp: Date.now(),
    duration: 0,
    scrollDepth: 0,
    interactions: 0,
    type: 'conversion',
  });
  saveJourney(journey);

  // Save complete journey on conversion
  saveJourneyToServer(conversionType, value);
};

// Track custom actions (add to cart, search, etc.)
export const trackJourneyAction = (actionName: string) => {
  const journey = getJourney();
  journey.push({
    path: window.location.pathname,
    title: actionName,
    timestamp: Date.now(),
    duration: 0,
    scrollDepth: 0,
    interactions: 0,
    type: 'action',
  });
  saveJourney(journey);
};

// Update scroll depth for current step
export const updateJourneyScroll = (depth: number) => {
  if (currentStep && depth > currentStep.scrollDepth) {
    currentStep.scrollDepth = depth;
  }
};

// Save journey to server
const saveJourneyToServer = async (conversionType?: string, value?: number) => {
  // Finalize current step
  if (currentStep) {
    currentStep.duration = Date.now() - currentStep.timestamp;
    currentStep.interactions = interactionCount;
  }

  const journey = getJourney();
  if (journey.length === 0) return;

  const totalDuration = journey.reduce((sum, s) => sum + s.duration, 0);
  const pageSteps = journey.filter(s => s.type === 'page');
  const uniquePages = new Set(pageSteps.map(s => s.path)).size;
  const entryPage = journey[0]?.path || '/';
  const exitPage = journey[journey.length - 1]?.path || '/';

  // Detect common patterns
  const patterns: string[] = [];
  const pathSeq = pageSteps.map(s => s.path).join(' → ');
  if (pathSeq.includes('/product/') && pathSeq.includes('/cart')) patterns.push('product_to_cart');
  if (pathSeq.includes('/cart') && pathSeq.includes('/checkout')) patterns.push('cart_to_checkout');
  if (journey.some(s => s.type === 'conversion')) patterns.push('converted');
  if (pageSteps.length === 1) patterns.push('single_page');
  if (pageSteps.length > 10) patterns.push('deep_explorer');
  if (journey.filter(s => s.title === 'Search').length > 2) patterns.push('heavy_searcher');

  try {
    await (supabase as any).from('user_journeys').insert({
      session_id: getSessionId(),
      journey_data: journey,
      total_steps: journey.length,
      total_duration_ms: totalDuration,
      unique_pages: uniquePages,
      entry_page: entryPage,
      exit_page: exitPage,
      conversion_type: conversionType || null,
      conversion_value: value || null,
      patterns,
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    });
  } catch (e) {
    console.debug('Journey save failed:', e);
  }
};

// Flush journey on page unload
export const initJourneyTracking = () => {
  // Track clicks for interaction count
  document.addEventListener('click', () => trackJourneyInteraction(), { passive: true });

  // Save journey on page close
  window.addEventListener('pagehide', () => saveJourneyToServer());

  // Save periodically for long sessions
  setInterval(() => {
    const journey = getJourney();
    if (journey.length >= 10) {
      saveJourneyToServer();
    }
  }, 5 * 60_000);
};

// Admin: Get journey analytics
export const getJourneyAnalytics = async (days: number = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  try {
    const { data } = await (supabase as any)
      .from('user_journeys')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    return data || [];
  } catch { return []; }
};

// Get top entry/exit pages
export const getTopPages = async (type: 'entry' | 'exit', days: number = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  const column = type === 'entry' ? 'entry_page' : 'exit_page';
  try {
    const { data } = await supabase
      .from('user_journeys')
      .select(column)
      .gte('created_at', since);
    
    if (!data) return [];
    const counts = new Map<string, number>();
    data.forEach(row => {
      const page = (row as any)[column];
      counts.set(page, (counts.get(page) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  } catch { return []; }
};
