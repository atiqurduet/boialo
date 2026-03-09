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

  // Initialize pixels + advanced tracking on mount (once)
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

    // Start advanced tracking systems
    startEngagementTracking();
    startHeatmapTracking();
    trackCoreWebVitals();
    trackPagePerformance();
    startExitIntentTracking();

    // Global error tracking
    window.addEventListener('error', (e) => {
      serverTrackError('js_error', `${e.message} at ${e.filename}:${e.lineno}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
      serverTrackError('unhandled_promise', String(e.reason));
    });
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
