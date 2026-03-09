
CREATE TABLE public.ad_platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  credential_key TEXT NOT NULL,
  credential_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, credential_key)
);

ALTER TABLE public.ad_platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad credentials" ON public.ad_platform_credentials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.ad_platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  user_id TEXT,
  status TEXT DEFAULT 'pending',
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ad events" ON public.ad_platform_events
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can insert ad events" ON public.ad_platform_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE TABLE public.audience_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  audience_type TEXT NOT NULL,
  audience_name TEXT,
  total_users INTEGER DEFAULT 0,
  synced_users INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  external_audience_id TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.audience_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audience sync jobs" ON public.audience_sync_jobs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
