
-- Add publish_count to social_media_posts
ALTER TABLE public.social_media_posts ADD COLUMN IF NOT EXISTS publish_count integer NOT NULL DEFAULT 0;

-- Create publish history table
CREATE TABLE public.social_media_publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL DEFAULT now(),
  platforms text[] NOT NULL DEFAULT '{}',
  results jsonb DEFAULT '{}',
  trigger_type text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_publish_history ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage publish history"
ON public.social_media_publish_history
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_publish_history_post_id ON public.social_media_publish_history(post_id);
CREATE INDEX idx_publish_history_published_at ON public.social_media_publish_history(published_at DESC);
