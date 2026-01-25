import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { initializePixels, trackPageView, setUserData } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const location = useLocation();
  const { user } = useAuth();

  // Initialize pixels on mount
  useEffect(() => {
    const loadPixelConfig = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['fb_pixel_id', 'ga_measurement_id', 'tiktok_pixel_id']);

        const config: { fbPixelId?: string; gaMeasurementId?: string; tiktokPixelId?: string } = {};
        
        data?.forEach(setting => {
          let value = setting.setting_value;
          // Handle JSON string values
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'string') {
                value = parsed;
              }
            } catch {
              // Keep as-is if not valid JSON
            }
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
  }, []);

  // Track page views on route change
  useEffect(() => {
    // Small delay to ensure title is updated
    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Set user data when logged in
  useEffect(() => {
    if (user?.email) {
      setUserData({
        email: user.email,
      });
    }
  }, [user]);

  return <>{children}</>;
};
