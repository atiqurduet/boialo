// Predictive User Scoring - Purchase probability, churn risk, lifetime value prediction
import { supabase } from '@/integrations/supabase/client';

interface UserSignals {
  sessionCount: number;
  totalPageViews: number;
  avgTimeOnSite: number;
  productViewCount: number;
  cartAddCount: number;
  wishlistCount: number;
  searchCount: number;
  lastVisitDaysAgo: number;
  daysSinceFirstVisit: number;
  previousPurchases: number;
  totalRevenue: number;
  avgOrderValue: number;
  returnVisitRate: number;
  engagementScore: number;
}

interface PredictiveScore {
  purchaseProbability: number;    // 0-100: likelihood of purchase this session
  churnRisk: number;              // 0-100: likelihood of not returning
  lifetimeValueTier: 'low' | 'medium' | 'high' | 'vip';
  nextActionPrediction: string;   // Most likely next action
  recommendedAction: string;      // What the store should do
  segment: string;                // User segment classification
}

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

// Collect signals from current session
const collectSignals = (): Partial<UserSignals> => {
  try {
    const journey = JSON.parse(sessionStorage.getItem('user_journey') || '[]');
    const pageViews = journey.filter((s: any) => s.type === 'page').length;
    const productViews = journey.filter((s: any) => s.path?.includes('/product/')).length;
    const cartAdds = journey.filter((s: any) => s.title === 'AddToCart').length;
    const searches = journey.filter((s: any) => s.title === 'Search').length;

    return {
      totalPageViews: pageViews,
      productViewCount: productViews,
      cartAddCount: cartAdds,
      searchCount: searches,
      engagementScore: parseFloat(sessionStorage.getItem('engagement_score') || '50'),
    };
  } catch {
    return { totalPageViews: 1, engagementScore: 50 };
  }
};

// Calculate purchase probability using weighted scoring
const calculatePurchaseProbability = (signals: Partial<UserSignals>): number => {
  let score = 0;
  const weights = {
    cartAdds: 25,        // Strongest signal
    productViews: 15,    // Intent signal
    searches: 10,        // Discovery signal
    pageViews: 5,        // Engagement signal
    engagement: 10,      // Quality signal
    returnVisit: 15,     // Familiarity signal
    previousPurchase: 20, // Historical signal
  };

  // Cart additions (strongest predictor)
  if ((signals.cartAddCount || 0) > 0) score += weights.cartAdds;
  if ((signals.cartAddCount || 0) > 2) score += 10;

  // Product views
  const pvCount = signals.productViewCount || 0;
  score += Math.min(weights.productViews, pvCount * 3);

  // Search activity
  if ((signals.searchCount || 0) > 0) score += weights.searches;

  // Page depth
  const pages = signals.totalPageViews || 0;
  score += Math.min(weights.pageViews, pages * 1);

  // Engagement quality
  const eng = signals.engagementScore || 0;
  score += Math.round((eng / 100) * weights.engagement);

  // Return visitor bonus
  if ((signals.sessionCount || 0) > 1) score += weights.returnVisit;

  // Previous purchase history
  if ((signals.previousPurchases || 0) > 0) score += weights.previousPurchase;

  return Math.min(100, Math.max(0, Math.round(score)));
};

// Calculate churn risk
const calculateChurnRisk = (signals: Partial<UserSignals>): number => {
  let risk = 50; // Start neutral

  // Recent activity reduces risk
  const daysSinceLast = signals.lastVisitDaysAgo || 0;
  if (daysSinceLast > 30) risk += 30;
  else if (daysSinceLast > 14) risk += 20;
  else if (daysSinceLast > 7) risk += 10;
  else risk -= 15;

  // Engagement reduces risk
  const eng = signals.engagementScore || 50;
  risk -= Math.round((eng - 50) / 2);

  // Multiple sessions reduce risk
  const sessions = signals.sessionCount || 1;
  risk -= Math.min(20, sessions * 3);

  // Purchase history reduces risk significantly
  const purchases = signals.previousPurchases || 0;
  risk -= Math.min(25, purchases * 8);

  return Math.min(100, Math.max(0, Math.round(risk)));
};

// Classify user segment
const classifySegment = (signals: Partial<UserSignals>, purchaseProb: number, churnRisk: number): string => {
  if ((signals.previousPurchases || 0) > 5 && (signals.totalRevenue || 0) > 5000) return 'vip_customer';
  if ((signals.previousPurchases || 0) > 0 && churnRisk > 60) return 'at_risk_customer';
  if ((signals.previousPurchases || 0) > 0 && churnRisk < 30) return 'loyal_customer';
  if (purchaseProb > 70) return 'hot_prospect';
  if (purchaseProb > 40) return 'warm_prospect';
  if ((signals.productViewCount || 0) > 3) return 'active_browser';
  if ((signals.searchCount || 0) > 2) return 'researcher';
  return 'casual_visitor';
};

// Predict next action
const predictNextAction = (signals: Partial<UserSignals>): string => {
  if ((signals.cartAddCount || 0) > 0) return 'likely_checkout';
  if ((signals.productViewCount || 0) > 3) return 'likely_add_to_cart';
  if ((signals.searchCount || 0) > 0) return 'likely_view_product';
  if ((signals.totalPageViews || 0) > 5) return 'likely_search';
  return 'likely_browse';
};

// Get recommended action for the store
const getRecommendedAction = (segment: string, churnRisk: number): string => {
  switch (segment) {
    case 'vip_customer': return 'show_exclusive_offer';
    case 'at_risk_customer': return 'send_winback_coupon';
    case 'loyal_customer': return 'show_loyalty_reward';
    case 'hot_prospect': return 'show_urgency_cta';
    case 'warm_prospect': return 'show_social_proof';
    case 'active_browser': return 'show_recommendation';
    case 'researcher': return 'show_comparison_tool';
    default: return churnRisk > 50 ? 'show_popup_offer' : 'show_trending';
  }
};

// Determine LTV tier
const getLTVTier = (signals: Partial<UserSignals>): 'low' | 'medium' | 'high' | 'vip' => {
  const revenue = signals.totalRevenue || 0;
  const purchases = signals.previousPurchases || 0;
  if (revenue > 10000 || purchases > 10) return 'vip';
  if (revenue > 3000 || purchases > 5) return 'high';
  if (revenue > 500 || purchases > 1) return 'medium';
  return 'low';
};

// Main scoring function
export const calculatePredictiveScore = (additionalSignals?: Partial<UserSignals>): PredictiveScore => {
  const sessionSignals = collectSignals();
  const signals = { ...sessionSignals, ...additionalSignals };

  const purchaseProbability = calculatePurchaseProbability(signals);
  const churnRisk = calculateChurnRisk(signals);
  const segment = classifySegment(signals, purchaseProbability, churnRisk);
  const nextAction = predictNextAction(signals);
  const recommendedAction = getRecommendedAction(segment, churnRisk);
  const lifetimeValueTier = getLTVTier(signals);

  return {
    purchaseProbability,
    churnRisk,
    lifetimeValueTier,
    nextActionPrediction: nextAction,
    recommendedAction,
    segment,
  };
};

// Save score to server periodically
export const savePredictiveScore = async (userId?: string) => {
  const score = calculatePredictiveScore();

  try {
    await supabase.from('predictive_scores').upsert({
      session_id: getSessionId(),
      user_id: userId || null,
      purchase_probability: score.purchaseProbability,
      churn_risk: score.churnRisk,
      ltv_tier: score.lifetimeValueTier,
      segment: score.segment,
      next_action: score.nextActionPrediction,
      recommended_action: score.recommendedAction,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });
  } catch (e) {
    console.debug('Predictive score save failed:', e);
  }
};

// Admin: Get scoring dashboard data
export const getPredictiveAnalytics = async () => {
  try {
    const { data } = await supabase
      .from('predictive_scores')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())
      .order('purchase_probability', { ascending: false })
      .limit(200);
    return data || [];
  } catch { return []; }
};

// Get segment distribution
export const getSegmentDistribution = async (days: number = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  try {
    const { data } = await supabase
      .from('predictive_scores')
      .select('segment')
      .gte('updated_at', since);

    if (!data) return [];
    const counts = new Map<string, number>();
    data.forEach(row => counts.set(row.segment, (counts.get(row.segment) || 0) + 1));
    return Array.from(counts.entries())
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);
  } catch { return []; }
};
