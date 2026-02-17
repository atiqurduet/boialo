
-- Add social login settings to site_settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, description)
VALUES 
  ('social_login_google_enabled', 'false'::jsonb, 'boolean', 'security', 'Google সোশ্যাল লগইন সক্রিয়'),
  ('social_login_apple_enabled', 'false'::jsonb, 'boolean', 'security', 'Apple সোশ্যাল লগইন সক্রিয়')
ON CONFLICT (setting_key) DO NOTHING;
