import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  header_logo: string;
  footer_logo: string;
  favicon: string;
  site_name: string;
  footer_description: string;
  copyright_text: string;
  pre_header_text: string;
  pre_header_link: string;
  pre_header_enabled: boolean;
}

const defaultSettings: SiteSettings = {
  header_logo: '',
  footer_logo: '',
  favicon: '',
  site_name: 'বইআলো',
  footer_description: 'বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ। আমরা সেরা মানের পণ্য সরবরাহ করি।',
  copyright_text: '© 2025 বইআলো. সর্বস্বত্ব সংরক্ষিত।',
  pre_header_text: '🎉 সকল বইয়ে ১৫% ছাড়! কোড: BOOK15',
  pre_header_link: '/offers',
  pre_header_enabled: true,
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'header_logo',
            'footer_logo',
            'favicon',
            'site_name',
            'footer_description',
            'copyright_text',
            'pre_header_text',
            'pre_header_link',
            'pre_header_enabled'
          ]);

        if (error) throw error;

        if (data) {
          const newSettings = { ...defaultSettings };
          data.forEach(item => {
            const value = item.setting_value;
            const key = item.setting_key;
            if (key === 'pre_header_enabled') {
              newSettings.pre_header_enabled = value === true || value === 'true';
            } else if (key in newSettings) {
              (newSettings as Record<string, unknown>)[key] = typeof value === 'string' ? value : String(value || '');
            }
          });
          setSettings(newSettings);
          
          // Update favicon dynamically
          if (newSettings.favicon) {
            const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (existingFavicon) {
              existingFavicon.href = newSettings.favicon;
            } else {
              const link = document.createElement('link');
              link.rel = 'icon';
              link.href = newSettings.favicon;
              document.head.appendChild(link);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
