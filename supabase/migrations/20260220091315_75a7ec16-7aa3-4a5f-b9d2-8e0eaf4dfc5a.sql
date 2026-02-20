
-- 1. Add sort_order to product_types if not exists
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 2. Universal Product Attributes table (unlimited custom attributes per product)
CREATE TABLE IF NOT EXISTS public.universal_product_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.universal_products(id) ON DELETE CASCADE,
  attribute_name_bn text NOT NULL,
  attribute_name_en text,
  attribute_value_bn text NOT NULL,
  attribute_value_en text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.universal_product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product attributes"
ON public.universal_product_attributes FOR SELECT USING (true);

CREATE POLICY "Admins can manage product attributes"
ON public.universal_product_attributes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 3. Universal Product Variants table (image-based price variations)
CREATE TABLE IF NOT EXISTS public.universal_product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.universal_products(id) ON DELETE CASCADE,
  variant_name_bn text NOT NULL,
  variant_name_en text,
  variant_type text NOT NULL DEFAULT 'option',
  sku text,
  price numeric NOT NULL,
  original_price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  images jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.universal_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read universal product variants"
ON public.universal_product_variants FOR SELECT USING (true);

CREATE POLICY "Admins can manage universal product variants"
ON public.universal_product_variants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 4. Attribute Templates per product type (reusable attribute definitions)
CREATE TABLE IF NOT EXISTS public.product_type_attribute_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_key text NOT NULL,
  attribute_name_bn text NOT NULL,
  attribute_name_en text,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_type_attribute_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read attribute templates"
ON public.product_type_attribute_templates FOR SELECT USING (true);

CREATE POLICY "Admins can manage attribute templates"
ON public.product_type_attribute_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 5. Insert default product types if not already present
INSERT INTO public.product_types (type_key, name_bn, name_en, icon, sort_order, is_active)
VALUES 
  ('lifestyle', 'লাইফস্টাইল', 'Lifestyle', 'ShoppingBag', 1, true),
  ('stationery', 'স্টেশনারি', 'Stationery', 'PenTool', 2, true),
  ('food', 'খাদ্য', 'Food', 'Utensils', 3, true)
ON CONFLICT (type_key) DO NOTHING;
