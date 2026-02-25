
-- Social media connected accounts
CREATE TABLE public.social_media_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- facebook, instagram, twitter, telegram, tiktok, linkedin, whatsapp, youtube, pinterest
  account_name TEXT NOT NULL,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  page_id TEXT,
  channel_id TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  connected_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social accounts" ON public.social_media_accounts FOR ALL USING (public.is_admin(auth.uid()));

-- Social media posts
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  content_bn TEXT,
  media_urls TEXT[] DEFAULT '{}',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, publishing, published, failed
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  product_id UUID,
  post_type TEXT DEFAULT 'manual', -- manual, product_auto, scheduled
  hashtags TEXT[] DEFAULT '{}',
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social posts" ON public.social_media_posts FOR ALL USING (public.is_admin(auth.uid()));

-- Post results per platform
CREATE TABLE public.social_media_post_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_id UUID REFERENCES public.social_media_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  external_post_id TEXT,
  external_url TEXT,
  error_message TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_post_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage post results" ON public.social_media_post_results FOR ALL USING (public.is_admin(auth.uid()));

-- Social media settings
CREATE TABLE public.social_media_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social settings" ON public.social_media_settings FOR ALL USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_social_posts_status ON public.social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_post_results_post ON public.social_media_post_results(post_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_media_posts;
