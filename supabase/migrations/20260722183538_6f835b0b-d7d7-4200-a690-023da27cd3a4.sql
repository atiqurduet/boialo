
CREATE TABLE public.media_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  thumbnail_url text,
  filename text NOT NULL,
  original_filename text,
  folder text NOT NULL DEFAULT 'general',
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  storage_provider text NOT NULL DEFAULT 'cpanel',
  tags text[],
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_library_folder ON public.media_library(folder);
CREATE INDEX idx_media_library_created_at ON public.media_library(created_at DESC);
CREATE INDEX idx_media_library_filename ON public.media_library(filename);

GRANT SELECT ON public.media_library TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view media" ON public.media_library
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert media" ON public.media_library
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update media" ON public.media_library
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete media" ON public.media_library
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
