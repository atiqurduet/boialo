// Privacy & Consent Manager - GDPR/Cookie consent compatible tracking control

type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'personalization';

interface ConsentPreferences {
  necessary: boolean;   // Always true
  analytics: boolean;   // Performance tracking
  marketing: boolean;   // Ad pixels, remarketing
  personalization: boolean; // Recommendations, A/B tests
  timestamp: number;
  version: string;
}

const CONSENT_KEY = 'tracking_consent';
const CONSENT_VERSION = '1.0';

let consentCache: ConsentPreferences | null = null;
const consentListeners: Array<(prefs: ConsentPreferences) => void> = [];

// Default: only necessary
const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
  timestamp: 0,
  version: CONSENT_VERSION,
};

// Get current consent
export const getConsent = (): ConsentPreferences => {
  if (consentCache) return consentCache;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ConsentPreferences;
      if (parsed.version === CONSENT_VERSION) {
        consentCache = parsed;
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_CONSENT;
};

// Check if a specific category is consented
export const hasConsent = (category: ConsentCategory): boolean => {
  if (category === 'necessary') return true;
  return getConsent()[category] === true;
};

// Check if user has made any consent choice
export const hasConsentChoice = (): boolean => {
  return getConsent().timestamp > 0;
};

// Update consent preferences
export const setConsent = (prefs: Partial<ConsentPreferences>) => {
  const current = getConsent();
  const updated: ConsentPreferences = {
    ...current,
    ...prefs,
    necessary: true, // Always true
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
  
  localStorage.setItem(CONSENT_KEY, JSON.stringify(updated));
  consentCache = updated;

  // Notify listeners
  consentListeners.forEach(fn => fn(updated));
};

// Accept all
export const acceptAllConsent = () => {
  setConsent({
    analytics: true,
    marketing: true,
    personalization: true,
  });
};

// Reject all (keep only necessary)
export const rejectAllConsent = () => {
  setConsent({
    analytics: false,
    marketing: false,
    personalization: false,
  });
};

// Subscribe to consent changes
export const onConsentChange = (callback: (prefs: ConsentPreferences) => void) => {
  consentListeners.push(callback);
  return () => {
    const index = consentListeners.indexOf(callback);
    if (index > -1) consentListeners.splice(index, 1);
  };
};

// Wrapper: only execute tracking if consented
export const withConsent = <T>(category: ConsentCategory, fn: () => T): T | undefined => {
  if (hasConsent(category)) return fn();
  return undefined;
};

// Get consent summary for display
export const getConsentSummary = () => {
  const consent = getConsent();
  return {
    hasChosen: consent.timestamp > 0,
    chosenAt: consent.timestamp > 0 ? new Date(consent.timestamp).toISOString() : null,
    categories: {
      necessary: { enabled: true, label: 'প্রয়োজনীয়', description: 'সাইট চালানোর জন্য আবশ্যক' },
      analytics: { enabled: consent.analytics, label: 'বিশ্লেষণ', description: 'সাইটের পারফরম্যান্স ট্র্যাকিং' },
      marketing: { enabled: consent.marketing, label: 'মার্কেটিং', description: 'বিজ্ঞাপন ও রিমার্কেটিং' },
      personalization: { enabled: consent.personalization, label: 'পার্সোনালাইজেশন', description: 'ব্যক্তিগতকৃত অভিজ্ঞতা' },
    },
  };
};

// Delete all tracking data (GDPR right to erasure)
export const deleteTrackingData = () => {
  // Clear all tracking storage
  const trackingKeys = [
    'v_sid', 'first_touch_utm', 'last_touch_utm', 'utm_trail',
    'ab_assignments', 'user_journey', CONSENT_KEY,
  ];
  trackingKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Reset consent
  consentCache = null;
};
