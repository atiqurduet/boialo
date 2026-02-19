-- Convert product_type from enum to text for unlimited types
-- Step 1: Alter universal_products
ALTER TABLE public.universal_products 
  ALTER COLUMN product_type TYPE text USING product_type::text;

-- Step 2: Alter universal_categories
ALTER TABLE public.universal_categories 
  ALTER COLUMN product_type TYPE text USING product_type::text;

-- Step 3: Drop the enum type
DROP TYPE IF EXISTS public.product_type;

-- Step 4: Create a product_types table for dynamic management
CREATE TABLE public.product_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_key text NOT NULL UNIQUE,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT 'Package',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read product types"
  ON public.product_types FOR SELECT USING (true);

CREATE POLICY "Admins can manage product types"
  ON public.product_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Seed existing types
INSERT INTO public.product_types (type_key, name_bn, name_en, icon, sort_order) VALUES
  ('lifestyle', 'লাইফস্টাইল', 'Lifestyle', 'Package', 1),
  ('stationery', 'স্টেশনারী', 'Stationery', 'Pencil', 2),
  ('food', 'ফুড', 'Food', 'Utensils', 3);
