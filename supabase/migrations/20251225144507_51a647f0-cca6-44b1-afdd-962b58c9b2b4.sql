-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for product previews (read a bit PDFs/images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-previews', 'product-previews', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product-images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- RLS policies for product-previews bucket
CREATE POLICY "Anyone can view product previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-previews');

CREATE POLICY "Admins can upload product previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-previews' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can update product previews"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-previews' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can delete product previews"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-previews' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Add preview_url column to products table for "একটু পড়ুন" feature
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS preview_url text;