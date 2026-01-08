-- Create product_types enum
CREATE TYPE product_type AS ENUM ('lifestyle', 'stationery', 'food');

-- Create universal_categories table for new product types
CREATE TABLE public.universal_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  product_type product_type NOT NULL,
  parent_id UUID REFERENCES public.universal_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description_bn TEXT,
  description_en TEXT,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create universal_products table
CREATE TABLE public.universal_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_type product_type NOT NULL,
  
  -- Basic Info
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  
  -- Category
  category_id UUID REFERENCES public.universal_categories(id) ON DELETE SET NULL,
  
  -- Pricing
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  discount_percent INTEGER DEFAULT 0,
  
  -- Stock
  stock_quantity INTEGER DEFAULT 0,
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  
  -- Descriptions
  short_description_bn TEXT,
  short_description_en TEXT,
  long_description_bn TEXT,
  long_description_en TEXT,
  
  -- Optional/Dynamic Fields
  brand TEXT,
  manufacturer TEXT,
  weight TEXT,
  dimensions TEXT,
  ingredients TEXT,
  warranty TEXT,
  delivery_time TEXT,
  return_policy TEXT,
  
  -- SEO Fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  json_ld JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.universal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universal_categories
CREATE POLICY "Anyone can read universal categories" 
ON public.universal_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can modify universal categories" 
ON public.universal_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for universal_products
CREATE POLICY "Anyone can read universal products" 
ON public.universal_products 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can modify universal products" 
ON public.universal_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create indexes
CREATE INDEX idx_universal_products_type ON public.universal_products(product_type);
CREATE INDEX idx_universal_products_category ON public.universal_products(category_id);
CREATE INDEX idx_universal_products_slug ON public.universal_products(slug);
CREATE INDEX idx_universal_categories_type ON public.universal_categories(product_type);
CREATE INDEX idx_universal_categories_slug ON public.universal_categories(slug);

-- Update timestamp triggers
CREATE TRIGGER update_universal_categories_updated_at
BEFORE UPDATE ON public.universal_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_universal_products_updated_at
BEFORE UPDATE ON public.universal_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.universal_categories (name_bn, name_en, slug, product_type, sort_order) VALUES
('লাইফস্টাইল', 'Lifestyle', 'lifestyle', 'lifestyle', 1),
('স্টেশনারী', 'Stationery', 'stationery', 'stationery', 2),
('ফুড', 'Food', 'food', 'food', 3);