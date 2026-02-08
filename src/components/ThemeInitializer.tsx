import { useThemeSettings } from '@/hooks/useThemeSettings';

export const ThemeInitializer = () => {
  // This hook fetches theme settings and applies CSS custom properties
  useThemeSettings();
  return null;
};
