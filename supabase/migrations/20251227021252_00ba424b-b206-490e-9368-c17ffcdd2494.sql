-- Create navigation_menus table for dynamic menubar
CREATE TABLE public.navigation_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT 'header',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table for menu links
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.navigation_menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  open_in_new_tab BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create footer_sections table for dynamic footer
CREATE TABLE public.footer_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  section_type TEXT NOT NULL DEFAULT 'links',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create footer_links table
CREATE TABLE public.footer_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.footer_sections(id) ON DELETE CASCADE,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for navigation_menus
CREATE POLICY "Anyone can read navigation menus"
  ON public.navigation_menus FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage navigation menus"
  ON public.navigation_menus FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for menu_items
CREATE POLICY "Anyone can read menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for footer_sections
CREATE POLICY "Anyone can read footer sections"
  ON public.footer_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage footer sections"
  ON public.footer_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for footer_links
CREATE POLICY "Anyone can read footer links"
  ON public.footer_links FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage footer links"
  ON public.footer_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default header menu
INSERT INTO public.navigation_menus (name, slug, location) VALUES ('Main Navigation', 'main-nav', 'header');

-- Insert default menu items
WITH menu AS (SELECT id FROM navigation_menus WHERE slug = 'main-nav')
INSERT INTO public.menu_items (menu_id, title_bn, title_en, url, sort_order) VALUES
  ((SELECT id FROM menu), 'হোম', 'Home', '/', 1),
  ((SELECT id FROM menu), 'জেনারেল বই', 'General Books', '/shop', 2),
  ((SELECT id FROM menu), 'একাডেমিক', 'Academic', '/shop?category=academic', 3),
  ((SELECT id FROM menu), 'আরবি বই', 'Arabic Books', '/shop?category=arabic', 4),
  ((SELECT id FROM menu), 'লেখক', 'Authors', '/authors', 5),
  ((SELECT id FROM menu), 'প্রকাশক', 'Publishers', '/publishers', 6),
  ((SELECT id FROM menu), 'আজকের অফার', 'Today Offers', '/offers', 7),
  ((SELECT id FROM menu), 'প্রি-অর্ডার', 'Pre-order', '/preorder', 8);

-- Insert default footer sections
INSERT INTO public.footer_sections (title_bn, title_en, section_type, sort_order, content) VALUES
  ('দ্রুত লিংক', 'Quick Links', 'links', 1, '{}'),
  ('বিভাগসমূহ', 'Categories', 'links', 2, '{}'),
  ('যোগাযোগ', 'Contact', 'contact', 3, '{"address": "৬০/এ, পুরানা পল্টন, ঢাকা-১০০০, বাংলাদেশ", "phone": "+৮৮০ ১৭০০-০০০০০০", "email": "info@wafilife.com"}'),
  ('সোশ্যাল মিডিয়া', 'Social Media', 'social', 4, '{"facebook": "#", "youtube": "#", "instagram": "#"}');

-- Insert default footer links for Quick Links section
WITH section AS (SELECT id FROM footer_sections WHERE title_en = 'Quick Links')
INSERT INTO public.footer_links (section_id, title_bn, title_en, url, sort_order) VALUES
  ((SELECT id FROM section), 'আমাদের সম্পর্কে', 'About Us', '/about', 1),
  ((SELECT id FROM section), 'যোগাযোগ করুন', 'Contact', '/contact', 2),
  ((SELECT id FROM section), 'সাধারণ জিজ্ঞাসা', 'FAQ', '/faq', 3),
  ((SELECT id FROM section), 'শর্তাবলী', 'Terms', '/terms', 4),
  ((SELECT id FROM section), 'গোপনীয়তা নীতি', 'Privacy', '/privacy', 5);

-- Insert default footer links for Categories section
WITH section AS (SELECT id FROM footer_sections WHERE title_en = 'Categories')
INSERT INTO public.footer_links (section_id, title_bn, title_en, url, sort_order) VALUES
  ((SELECT id FROM section), 'ইসলামি বই', 'Islamic Books', '/shop?category=islamic', 1),
  ((SELECT id FROM section), 'একাডেমিক বই', 'Academic Books', '/shop?category=academic', 2),
  ((SELECT id FROM section), 'শিশু কিশোরদের বই', 'Children Books', '/shop?category=children', 3),
  ((SELECT id FROM section), 'লাইফস্টাইল', 'Lifestyle', '/shop?category=lifestyle', 4),
  ((SELECT id FROM section), 'স্টেশনারি', 'Stationery', '/shop?category=stationery', 5);

-- Update triggers
CREATE TRIGGER update_navigation_menus_updated_at BEFORE UPDATE ON public.navigation_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_footer_sections_updated_at BEFORE UPDATE ON public.footer_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_footer_links_updated_at BEFORE UPDATE ON public.footer_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();