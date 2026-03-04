
-- Create digital-files storage bucket for ebooks, PDFs, audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('digital-files', 'digital-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for digital-files bucket
CREATE POLICY "Admins can upload digital files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'digital-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update digital files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'digital-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete digital files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'digital-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Public can read digital files" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'digital-files');

-- Add gallery_images to digital_products if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'digital_products' AND column_name = 'gallery_images') THEN
    ALTER TABLE public.digital_products ADD COLUMN gallery_images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
