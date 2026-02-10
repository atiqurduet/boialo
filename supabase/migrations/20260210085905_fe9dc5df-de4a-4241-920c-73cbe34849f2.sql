
-- Blog/Article tables
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  excerpt_bn TEXT,
  excerpt_en TEXT,
  content_bn TEXT,
  content_en TEXT,
  featured_image TEXT,
  author_id UUID,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add digital product columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_file_url TEXT,
  ADD COLUMN IF NOT EXISTS digital_file_name TEXT;

-- Add digital product columns to universal_products table
ALTER TABLE public.universal_products
  ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_file_url TEXT,
  ADD COLUMN IF NOT EXISTS digital_file_name TEXT;

-- Digital product purchases tracking
CREATE TABLE public.digital_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'book',
  order_id UUID,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digital purchases" ON public.digital_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage digital purchases" ON public.digital_purchases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can insert digital purchases" ON public.digital_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
