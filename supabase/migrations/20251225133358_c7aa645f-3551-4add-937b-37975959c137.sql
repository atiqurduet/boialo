-- Homepage sections for dynamic content management
CREATE TABLE public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL, -- 'featured_products', 'bestsellers', 'category_grid', 'promo_banner', 'newsletter'
  title_bn TEXT NOT NULL,
  title_en TEXT,
  subtitle_bn TEXT,
  subtitle_en TEXT,
  content JSONB DEFAULT '{}'::jsonb, -- Flexible content storage
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb, -- Section-specific settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sections
CREATE POLICY "Anyone can read active homepage sections"
ON public.homepage_sections
FOR SELECT
USING (is_active = true);

-- Admins can manage sections
CREATE POLICY "Admins can manage homepage sections"
ON public.homepage_sections
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Add updated_at trigger
CREATE TRIGGER update_homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default homepage sections
INSERT INTO public.homepage_sections (section_type, title_bn, title_en, subtitle_bn, sort_order, is_active, settings) VALUES
('flash_sale', 'ফ্ল্যাশ সেল', 'Flash Sale', 'সর্বোচ্চ ছাড়', 1, true, '{"min_discount": 40, "limit": 10}'::jsonb),
('category_grid', 'জনপ্রিয় ক্যাটাগরি', 'Popular Categories', 'সব ধরনের বই এক জায়গায়', 2, true, '{"columns": 4}'::jsonb),
('new_releases', 'নতুন প্রকাশিত বই', 'New Releases', 'সদ্য প্রকাশিত বইসমূহ', 3, true, '{"limit": 10}'::jsonb),
('bestsellers', 'বইমেলা বেস্টসেলার ২০২৫', 'Bestsellers 2025', 'সবচেয়ে জনপ্রিয় বইসমূহ', 4, true, '{"limit": 5}'::jsonb),
('promo_banner', 'প্রমোশনাল ব্যানার', 'Promo Banner', 'বিশেষ অফার', 5, true, '{"title": "প্রিমিয়াম বুকমার্ক ফ্রি!", "description": "৪৯৯+ টাকার অর্ডারে ক্যালিগ্রাফি বুকমার্ক ফ্রি!", "button_text": "এখনই কিনুন", "button_link": "/shop", "badge_text": "সীমিত সময়ের অফার"}'::jsonb),
('recommended', 'আপনার জন্য সুপারিশকৃত', 'Recommended For You', 'আপনার পছন্দ অনুযায়ী', 6, true, '{"limit": 5}'::jsonb);

-- Create index for performance
CREATE INDEX idx_homepage_sections_active_order ON public.homepage_sections(is_active, sort_order);