
-- Digital Products table (for both ebooks and e-products)
CREATE TABLE IF NOT EXISTS public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_bn text NOT NULL,
  title_en text,
  slug text UNIQUE NOT NULL,
  description_bn text,
  description_en text,
  product_type text NOT NULL DEFAULT 'ebook', -- ebook, software, audio, video, template, course
  category text,
  subcategory text,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  discount_percent numeric DEFAULT 0,
  cover_image text,
  gallery_images jsonb DEFAULT '[]'::jsonb,
  file_url text,
  file_name text,
  file_size_mb numeric,
  file_format text, -- pdf, epub, mp3, zip, etc.
  preview_url text,
  preview_pages integer DEFAULT 10,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_free boolean DEFAULT false,
  total_sales integer DEFAULT 0,
  total_downloads integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  max_downloads integer DEFAULT 5,
  download_expiry_days integer,
  drm_enabled boolean DEFAULT false,
  watermark_enabled boolean DEFAULT false,
  tags text[],
  meta_title text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ebook-specific metadata
CREATE TABLE IF NOT EXISTS public.ebook_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  isbn text,
  language text DEFAULT 'bn',
  page_count integer,
  publisher text,
  publisher_id uuid,
  author text,
  author_id uuid,
  translator text,
  translator_id uuid,
  edition text,
  publish_year integer,
  format text DEFAULT 'pdf', -- pdf, epub, mobi
  has_audio boolean DEFAULT false,
  audio_url text,
  audio_duration_minutes integer,
  sample_chapter_url text,
  table_of_contents jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Licenses (for software, templates etc.)
CREATE TABLE IF NOT EXISTS public.product_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  license_key text NOT NULL,
  user_id uuid,
  order_id uuid,
  status text DEFAULT 'available', -- available, assigned, expired, revoked
  activated_at timestamptz,
  expires_at timestamptz,
  max_activations integer DEFAULT 1,
  activation_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Digital product versions (for software updates)
CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  version text NOT NULL,
  changelog_bn text,
  changelog_en text,
  file_url text,
  file_size_mb numeric,
  is_current boolean DEFAULT false,
  release_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Digital product reviews
CREATE TABLE IF NOT EXISTS public.digital_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  review_text text,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for active digital products
CREATE POLICY "Anyone can view active digital products" ON public.digital_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage digital products" ON public.digital_products FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Public read for ebook metadata
CREATE POLICY "Anyone can view ebook metadata" ON public.ebook_metadata FOR SELECT USING (true);
CREATE POLICY "Admins can manage ebook metadata" ON public.ebook_metadata FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- License policies
CREATE POLICY "Users can view own licenses" ON public.product_licenses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage licenses" ON public.product_licenses FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Version policies
CREATE POLICY "Anyone can view versions" ON public.digital_product_versions FOR SELECT USING (true);
CREATE POLICY "Admins can manage versions" ON public.digital_product_versions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Review policies
CREATE POLICY "Anyone can view approved reviews" ON public.digital_product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON public.digital_product_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage reviews" ON public.digital_product_reviews FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_digital_products_updated_at BEFORE UPDATE ON public.digital_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ebook_metadata_updated_at BEFORE UPDATE ON public.ebook_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
