
-- Create storage bucket for social media images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload social media images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media');

-- Allow public read
CREATE POLICY "Public read social media images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete social media images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media');
