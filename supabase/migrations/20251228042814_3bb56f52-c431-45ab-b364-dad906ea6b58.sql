-- Insert site settings for footer, header and pre-header
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, description)
VALUES 
  ('header_logo', '"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=50&fit=crop"', 'string', 'branding', 'হেডার লোগো URL'),
  ('footer_logo', '"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=50&fit=crop"', 'string', 'branding', 'ফুটার লোগো URL'),
  ('site_name', '"WafiLife"', 'string', 'branding', 'সাইটের নাম'),
  ('footer_description', '"বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ। আমরা সেরা মানের পণ্য সরবরাহ করি।"', 'string', 'branding', 'ফুটার বিবরণ'),
  ('copyright_text', '"© 2024 WafiLife. সর্বস্বত্ব সংরক্ষিত।"', 'string', 'branding', 'কপিরাইট টেক্সট'),
  ('pre_header_text', '"🎉 সকল বইয়ে ১৫% ছাড়! কোড: BOOK15"', 'string', 'branding', 'প্রি-হেডার ঘোষণা'),
  ('pre_header_link', '"/offers"', 'string', 'branding', 'প্রি-হেডার লিংক'),
  ('pre_header_enabled', 'true', 'boolean', 'branding', 'প্রি-হেডার দেখানো হবে কিনা')
ON CONFLICT (setting_key) DO NOTHING;