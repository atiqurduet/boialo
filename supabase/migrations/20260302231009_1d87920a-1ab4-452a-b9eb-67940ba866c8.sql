
-- Store comments/replies fetched from social platforms
CREATE TABLE public.social_media_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_result_id uuid REFERENCES public.social_media_post_results(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_comment_id text,
  parent_comment_id uuid REFERENCES public.social_media_comments(id) ON DELETE CASCADE,
  author_name text,
  author_profile_url text,
  author_avatar_url text,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  is_reply boolean DEFAULT false,
  is_from_admin boolean DEFAULT false,
  external_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social comments"
ON public.social_media_comments
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_social_comments_post_id ON public.social_media_comments(post_id);
CREATE INDEX idx_social_comments_platform ON public.social_media_comments(platform);
CREATE INDEX idx_social_comments_parent ON public.social_media_comments(parent_comment_id);

-- Add last_synced_at to post_results for tracking sync
ALTER TABLE public.social_media_post_results ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
