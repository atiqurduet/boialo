
-- Add product and category targeting to coupons
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS applies_to text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS max_discount_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description_bn text DEFAULT NULL;
