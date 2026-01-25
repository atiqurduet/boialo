import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  initializePixels, 
  trackPageView, 
  setUserData,
  trackViewContent,
  trackAddToCart,
  trackRemoveFromCart,
  trackAddToWishlist,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackPurchase,
  trackSearch,
  trackViewCategory,
  trackLead,
  trackCompleteRegistration,
  trackLogin,
  trackContact,
  trackSubscribe,
  trackViewProductList,
  trackSelectItem,
  trackShare,
  trackCustomEvent,
} from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

// Hook to initialize analytics and track page views
export const useAnalytics = () => {
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

        const config: Record<string, string> = {};
        data?.forEach(setting => {
          const value = setting.setting_value as string;
          if (value) {
            if (setting.setting_key === 'fb_pixel_id') config.fbPixelId = value;
            if (setting.setting_key === 'ga_measurement_id') config.gaMeasurementId = value;
            if (setting.setting_key === 'tiktok_pixel_id') config.tiktokPixelId = value;
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
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  // Set user data when logged in
  useEffect(() => {
    if (user?.email) {
      setUserData({
        email: user.email,
      });
    }
  }, [user]);
};

// Export all tracking functions for use in components
export {
  trackViewContent,
  trackAddToCart,
  trackRemoveFromCart,
  trackAddToWishlist,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackPurchase,
  trackSearch,
  trackViewCategory,
  trackLead,
  trackCompleteRegistration,
  trackLogin,
  trackContact,
  trackSubscribe,
  trackViewProductList,
  trackSelectItem,
  trackShare,
  trackCustomEvent,
  setUserData,
};
