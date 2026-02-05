-- Add selected_product_ids and selected_category_ids to pages table for coupon pages
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS selected_product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_category_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS show_in_offers_page boolean DEFAULT true;