-- Add invoice-related settings to site_settings
INSERT INTO site_settings (setting_key, setting_value, category, setting_type, description)
VALUES 
  ('invoice_company_name', '"বইআলো"', 'invoice', 'string', 'Invoice company name'),
  ('invoice_company_tagline', '"আপনার বিশ্বস্ত অনলাইন বই স্টোর"', 'invoice', 'string', 'Invoice company tagline'),
  ('invoice_company_address', '"ঢাকা, বাংলাদেশ"', 'invoice', 'string', 'Invoice company address'),
  ('invoice_company_phone', '"+880 1XXX-XXXXXX"', 'invoice', 'string', 'Invoice company phone'),
  ('invoice_company_email', '"support@boialo.com"', 'invoice', 'string', 'Invoice company email'),
  ('invoice_footer_text', '"ধন্যবাদ আপনার অর্ডারের জন্য!"', 'invoice', 'string', 'Invoice footer text')
ON CONFLICT (setting_key) DO NOTHING;