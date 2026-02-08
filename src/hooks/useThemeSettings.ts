import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeConfig {
  // Core colors
  primary_h: string; primary_s: string; primary_l: string;
  accent_h: string; accent_s: string; accent_l: string;
  background_h: string; background_s: string; background_l: string;
  foreground_h: string; foreground_s: string; foreground_l: string;
  // Secondary colors
  secondary_h: string; secondary_s: string; secondary_l: string;
  destructive_h: string; destructive_s: string; destructive_l: string;
  muted_h: string; muted_s: string; muted_l: string;
  // Header/Footer
  header_bg_h: string; header_bg_s: string; header_bg_l: string;
  header_text_h: string; header_text_s: string; header_text_l: string;
  footer_bg_h: string; footer_bg_s: string; footer_bg_l: string;
  footer_text_h: string; footer_text_s: string; footer_text_l: string;
  // Button
  button_radius: string;
  button_size: string;
  // Typography
  font_family: string;
  heading_font: string;
  font_size_base: string;
  // Layout
  border_radius: string;
  card_shadow: string;
  card_border: string;
  // Section
  section_border_style: string;
  section_bg_style: string;
  section_spacing: string;
  // Other
  header_style: string;
  footer_style: string;
  product_grid_columns: string;
  dark_mode_enabled: string;
  maintenance_mode: string;
  maintenance_message: string;
  // Nav style
  nav_bg_h: string; nav_bg_s: string; nav_bg_l: string;
  nav_text_h: string; nav_text_s: string; nav_text_l: string;
  nav_active_style: string;
  // Links
  link_color_h: string; link_color_s: string; link_color_l: string;
  link_hover_style: string;
}

const defaults: ThemeConfig = {
  primary_h: '4', primary_s: '82', primary_l: '56',
  accent_h: '174', accent_s: '60', accent_l: '45',
  background_h: '0', background_s: '0', background_l: '97',
  foreground_h: '0', foreground_s: '0', foreground_l: '15',
  secondary_h: '0', secondary_s: '0', secondary_l: '96',
  destructive_h: '0', destructive_s: '84', destructive_l: '60',
  muted_h: '0', muted_s: '0', muted_l: '94',
  header_bg_h: '0', header_bg_s: '0', header_bg_l: '100',
  header_text_h: '0', header_text_s: '0', header_text_l: '15',
  footer_bg_h: '0', footer_bg_s: '0', footer_bg_l: '100',
  footer_text_h: '0', footer_text_s: '0', footer_text_l: '15',
  button_radius: '0.5',
  button_size: 'default',
  font_family: 'Hind Siliguri',
  heading_font: 'Hind Siliguri',
  font_size_base: '16',
  border_radius: '0.5',
  card_shadow: 'md',
  card_border: 'subtle',
  section_border_style: 'none',
  section_bg_style: 'transparent',
  section_spacing: 'normal',
  header_style: 'default',
  footer_style: 'default',
  product_grid_columns: '4',
  dark_mode_enabled: 'false',
  maintenance_mode: 'false',
  maintenance_message: 'সাইট রক্ষণাবেক্ষণ চলছে।',
  nav_bg_h: '0', nav_bg_s: '0', nav_bg_l: '100',
  nav_text_h: '0', nav_text_s: '0', nav_text_l: '45',
  nav_active_style: 'highlight',
  link_color_h: '4', link_color_s: '82', link_color_l: '56',
  link_hover_style: 'underline',
};

export function useThemeSettings() {
  const [config, setConfig] = useState<ThemeConfig>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndApply = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .like('setting_key', 'theme_%');

        const loaded = { ...defaults };
        if (data) {
          data.forEach(item => {
            const key = item.setting_key.replace('theme_', '') as keyof ThemeConfig;
            if (key in loaded) {
              loaded[key] = typeof item.setting_value === 'string'
                ? item.setting_value
                : String(item.setting_value || '');
            }
          });
        }
        setConfig(loaded);
        applyTheme(loaded);
      } catch (err) {
        console.error('Theme fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndApply();
  }, []);

  return { config, loading };
}

function applyTheme(t: ThemeConfig) {
  const root = document.documentElement;
  const set = (prop: string, val: string) => root.style.setProperty(prop, val);

  // Core colors
  set('--primary', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
  set('--accent', `${t.accent_h} ${t.accent_s}% ${t.accent_l}%`);
  set('--background', `${t.background_h} ${t.background_s}% ${t.background_l}%`);
  set('--foreground', `${t.foreground_h} ${t.foreground_s}% ${t.foreground_l}%`);
  set('--secondary', `${t.secondary_h} ${t.secondary_s}% ${t.secondary_l}%`);
  set('--destructive', `${t.destructive_h} ${t.destructive_s}% ${t.destructive_l}%`);
  set('--muted', `${t.muted_h} ${t.muted_s}% ${t.muted_l}%`);

  // Card matches background logic
  set('--card', `${t.background_h} ${t.background_s}% ${Math.min(Number(t.background_l) + 3, 100)}%`);
  set('--popover', `${t.background_h} ${t.background_s}% ${Math.min(Number(t.background_l) + 3, 100)}%`);

  // WafiLife custom tokens
  set('--wafilife-red', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
  set('--wafilife-dark-red', `${t.primary_h} ${t.primary_s}% ${Math.max(Number(t.primary_l) - 11, 0)}%`);

  // Ring matches primary
  set('--ring', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);

  // Border radius
  set('--radius', `${t.border_radius}rem`);

  // Font
  if (t.font_family) {
    root.style.fontFamily = `'${t.font_family}', sans-serif`;
  }

  // Font size
  if (t.font_size_base) {
    set('--font-size-base', `${t.font_size_base}px`);
  }

  // Header/Footer custom properties for components to consume
  set('--header-bg', `${t.header_bg_h} ${t.header_bg_s}% ${t.header_bg_l}%`);
  set('--header-text', `${t.header_text_h} ${t.header_text_s}% ${t.header_text_l}%`);
  set('--footer-bg', `${t.footer_bg_h} ${t.footer_bg_s}% ${t.footer_bg_l}%`);
  set('--footer-text', `${t.footer_text_h} ${t.footer_text_s}% ${t.footer_text_l}%`);
  set('--nav-bg', `${t.nav_bg_h} ${t.nav_bg_s}% ${t.nav_bg_l}%`);
  set('--nav-text', `${t.nav_text_h} ${t.nav_text_s}% ${t.nav_text_l}%`);
  set('--button-radius', `${t.button_radius}rem`);
}
