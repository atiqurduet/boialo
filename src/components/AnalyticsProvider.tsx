import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { initializePixels, trackPageView, setUserData } from '@/lib/analytics';
import { 
  serverTrackPageView, 
  startScrollTracking, 
  startEngagementTracking, 
  startExitIntentTracking, 
  startHeatmapTracking,
  trackCoreWebVitals, 
  trackPagePerformance,
  reportEngagement, 
  resetEngagement,
  serverTrackError,
} from '@/lib/serverTracking';
import { startSessionRecording } from '@/lib/sessionRecording';
import { startPresenceTracking, updatePresencePage } from '@/lib/realtimePresence';
import { autoTrackFunnel } from '@/lib/funnelTracking';
import { trackRetention } from '@/lib/retentionTracking';
import { autoAssignTests } from '@/lib/abTesting';
import { trackJourneyStep, initJourneyTracking } from '@/lib/userJourney';
import { savePredictiveScore } from '@/lib/predictiveScoring';
import { startNetworkMonitoring } from '@/lib/networkMonitoring';
import { initOfflineQueue } from '@/lib/offlineQueue';
import { hasConsent } from '@/lib/privacyConsent';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const initializedRef = useRef(false);
  const prevPathRef = useRef('');

  // Visitor tracking
  useVisitorTracking();

  // Initialize all tracking systems on mount (once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Load pixel config
    const loadPixelConfig = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['fb_pixel_id', 'ga_measurement_id', 'tiktok_pixel_id']);

        const config: { fbPixelId?: string; gaMeasurementId?: string; tiktokPixelId?: string } = {};
        
        data?.forEach(setting => {
          let value = setting.setting_value;
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'string') value = parsed;
            } catch {}
          }
          const strValue = typeof value === 'string' ? value : '';
          if (strValue && strValue !== '') {
            if (setting.setting_key === 'fb_pixel_id') config.fbPixelId = strValue;
            if (setting.setting_key === 'ga_measurement_id') config.gaMeasurementId = strValue;
            if (setting.setting_key === 'tiktok_pixel_id') config.tiktokPixelId = strValue;
          }
        });

        if (Object.keys(config).length > 0) {
          initializePixels(config);
        }
      } catch (error) {
        console.error('Failed to load pixel configuration:', error);
      }
    };

    loadPixelConfig();

    // Start all advanced tracking systems
    startEngagementTracking();
    startHeatmapTracking();
    trackCoreWebVitals();
    trackPagePerformance();
    startExitIntentTracking();
    startSessionRecording();
    startPresenceTracking(user?.id);
    
    // New: User Journey tracking
    initJourneyTracking();
    
    // New: Network/API monitoring
    if (hasConsent('analytics')) {
      startNetworkMonitoring();
    }
    
    // New: Offline event queue
    initOfflineQueue();
    
    // Retention tracking
    trackRetention(user?.id);

    // New: Predictive scoring (periodic)
    const predictiveTimer = setInterval(() => {
      savePredictiveScore(user?.id).catch(() => {});
    }, 3 * 60_000); // Every 3 minutes

    // Global error tracking
    window.addEventListener('error', (e) => {
      serverTrackError('js_error', `${e.message} at ${e.filename}:${e.lineno}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
      serverTrackError('unhandled_promise', String(e.reason));
    });

    return () => clearInterval(predictiveTimer);
  }, []);

  // Track page views on route change
  useEffect(() => {
    // Report engagement for previous page
    if (prevPathRef.current && prevPathRef.current !== location.pathname) {
      reportEngagement(user?.id);
      resetEngagement();
    }
    prevPathRef.current = location.pathname;

    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title);
      serverTrackPageView(user?.id);
      startScrollTracking();
      
      // Funnel tracking
      autoTrackFunnel('PageView');
      
      // Journey tracking
      trackJourneyStep(location.pathname, document.title);
      
      // Update presence with current page
      updatePresencePage(location.pathname, user?.id);
      
      // Auto-assign A/B tests
      autoAssignTests(location.pathname).catch(() => {});
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname, user?.id]);

  // Set user data when logged in
  useEffect(() => {
    if (user?.email) {
      setUserData({ email: user.email });
    }
  }, [user]);

  return <>{children}</>;
};
