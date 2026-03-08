
-- Fix product-images upload policy to use is_admin()
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND is_admin(auth.uid()));

-- Fix product-images update policy
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND is_admin(auth.uid()));

-- Fix product-images delete policy
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND is_admin(auth.uid()));

-- Fix product-previews upload policy
DROP POLICY IF EXISTS "Admins can upload product previews" ON storage.objects;
CREATE POLICY "Admins can upload product previews" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-previews' AND is_admin(auth.uid()));

-- Fix product-previews update policy
DROP POLICY IF EXISTS "Admins can update product previews" ON storage.objects;
CREATE POLICY "Admins can update product previews" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-previews' AND is_admin(auth.uid()));

-- Fix product-previews delete policy
DROP POLICY IF EXISTS "Admins can delete product previews" ON storage.objects;
CREATE POLICY "Admins can delete product previews" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-previews' AND is_admin(auth.uid()));

-- Fix social-media upload policy (was missing auth check)
DROP POLICY IF EXISTS "Authenticated users can upload social media images" ON storage.objects;
CREATE POLICY "Admins can upload social media images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'social-media' AND is_admin(auth.uid()));

-- Fix social-media update policy (was missing)
CREATE POLICY "Admins can update social media images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'social-media' AND is_admin(auth.uid()));

-- Fix social-media delete policy
DROP POLICY IF EXISTS "Authenticated users can delete social media images" ON storage.objects;
CREATE POLICY "Admins can delete social media images" ON storage.objects
  FOR DELETE USING (bucket_id = 'social-media' AND is_admin(auth.uid()));

-- Fix chat-attachments upload (keep for all authenticated users)
-- Already correct

-- Add missing avatar delete policy
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
