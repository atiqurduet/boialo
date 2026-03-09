
-- Conversion Funnels table
CREATE TABLE IF NOT EXISTS public.conversion_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversion_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage funnels" ON public.conversion_funnels FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Funnel events (tracks user progression through funnels)
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES public.conversion_funnels(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  fingerprint_id text,
  user_id uuid,
  step_index integer NOT NULL,
  step_name text NOT NULL,
  completed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert funnel events" ON public.funnel_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read funnel events" ON public.funnel_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_fe_funnel ON public.funnel_events (funnel_id, step_index);
CREATE INDEX idx_fe_session ON public.funnel_events (session_id);

-- A/B Test configurations
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  variants jsonb NOT NULL DEFAULT '[{"name":"control","weight":50},{"name":"variant_a","weight":50}]',
  target_metric text DEFAULT 'conversion',
  target_page text,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage ab tests" ON public.ab_tests FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public read active ab tests" ON public.ab_tests FOR SELECT TO anon USING (is_active = true);

-- A/B Test assignments (which variant user got)
CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  fingerprint_id text,
  user_id uuid,
  variant_name text NOT NULL,
  converted boolean DEFAULT false,
  conversion_value numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz,
  UNIQUE(test_id, session_id)
);
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert ab assignments" ON public.ab_test_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon update own ab assignments" ON public.ab_test_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read ab assignments" ON public.ab_test_assignments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Session recordings (mouse movement samples)
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  fingerprint_id text,
  user_id uuid,
  page_path text NOT NULL,
  duration_seconds integer DEFAULT 0,
  events_count integer DEFAULT 0,
  recording_data jsonb DEFAULT '[]',
  device_type text,
  browser text,
  os text,
  screen_resolution text,
  has_rage_clicks boolean DEFAULT false,
  has_dead_clicks boolean DEFAULT false,
  has_errors boolean DEFAULT false,
  engagement_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert recordings" ON public.session_recordings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read recordings" ON public.session_recordings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_sr_session ON public.session_recordings (session_id);
CREATE INDEX idx_sr_created ON public.session_recordings (created_at DESC);

-- Retention cohorts
CREATE TABLE IF NOT EXISTS public.retention_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_date date NOT NULL,
  cohort_type text DEFAULT 'weekly',
  fingerprint_id text,
  user_id uuid,
  first_visit_at timestamptz NOT NULL,
  last_visit_at timestamptz NOT NULL,
  visit_count integer DEFAULT 1,
  total_sessions integer DEFAULT 1,
  total_page_views integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  days_since_first_visit integer DEFAULT 0,
  is_retained boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.retention_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon insert retention" ON public.retention_cohorts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon update retention" ON public.retention_cohorts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read retention" ON public.retention_cohorts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_rc_cohort ON public.retention_cohorts (cohort_date, cohort_type);
CREATE INDEX idx_rc_fingerprint ON public.retention_cohorts (fingerprint_id);

-- Real-time presence tracking
CREATE TABLE IF NOT EXISTS public.realtime_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  fingerprint_id text,
  user_id uuid,
  page_path text,
  device_type text,
  country text,
  city text,
  last_seen_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT true,
  cart_value numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.realtime_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon upsert presence" ON public.realtime_presence FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon update presence" ON public.realtime_presence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read presence" ON public.realtime_presence FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anon delete own presence" ON public.realtime_presence FOR DELETE TO anon, authenticated USING (true);

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_presence;

-- Page-level analytics aggregation
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  avg_time_on_page numeric(8,2) DEFAULT 0,
  avg_scroll_depth numeric(5,2) DEFAULT 0,
  avg_engagement_score numeric(5,2) DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0,
  exit_rate numeric(5,2) DEFAULT 0,
  rage_clicks integer DEFAULT 0,
  dead_clicks integer DEFAULT 0,
  errors integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_path, date)
);
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon upsert page analytics" ON public.page_analytics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon update page analytics" ON public.page_analytics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read page analytics" ON public.page_analytics FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Increment attribution conversions function
CREATE OR REPLACE FUNCTION public.increment_attribution_conversions(p_session_id text, p_revenue numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_attributions
  SET total_conversions = total_conversions + 1,
      total_revenue = total_revenue + p_revenue,
      updated_at = now()
  WHERE session_id = p_session_id;
END;
$$;
