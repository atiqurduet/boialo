
-- Add advanced columns to server_side_events
ALTER TABLE public.server_side_events 
ADD COLUMN IF NOT EXISTS fingerprint_id text,
ADD COLUMN IF NOT EXISTS scroll_depth integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_on_page integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_x integer,
ADD COLUMN IF NOT EXISTS click_y integer,
ADD COLUMN IF NOT EXISTS click_element text,
ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dedup_key text,
ADD COLUMN IF NOT EXISTS attribution_source text,
ADD COLUMN IF NOT EXISTS attribution_medium text,
ADD COLUMN IF NOT EXISTS attribution_campaign text,
ADD COLUMN IF NOT EXISTS attribution_type text DEFAULT 'last_touch',
ADD COLUMN IF NOT EXISTS core_web_vitals jsonb,
ADD COLUMN IF NOT EXISTS viewport_width integer,
ADD COLUMN IF NOT EXISTS viewport_height integer,
ADD COLUMN IF NOT EXISTS connection_type text,
ADD COLUMN IF NOT EXISTS page_load_time integer,
ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rage_click boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dead_click boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exit_intent boolean DEFAULT false;

-- Add unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_side_events_dedup ON public.server_side_events (dedup_key) WHERE dedup_key IS NOT NULL;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_sse_fingerprint ON public.server_side_events (fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_sse_session_event ON public.server_side_events (session_id, event_name);
CREATE INDEX IF NOT EXISTS idx_sse_created_at ON public.server_side_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sse_engagement ON public.server_side_events (engagement_score DESC) WHERE engagement_score > 0;
CREATE INDEX IF NOT EXISTS idx_sse_bot ON public.server_side_events (is_bot) WHERE is_bot = true;

-- Create attribution tracking table
CREATE TABLE IF NOT EXISTS public.user_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  fingerprint_id text,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_at timestamptz DEFAULT now(),
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_at timestamptz DEFAULT now(),
  touchpoints jsonb DEFAULT '[]'::jsonb,
  total_visits integer DEFAULT 1,
  total_conversions integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert attributions" ON public.user_attributions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update attributions" ON public.user_attributions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read attributions" ON public.user_attributions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ua_session ON public.user_attributions (session_id);
CREATE INDEX IF NOT EXISTS idx_ua_fingerprint ON public.user_attributions (fingerprint_id);

-- Create engagement scores table for aggregation
CREATE TABLE IF NOT EXISTS public.engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  fingerprint_id text,
  user_id uuid,
  page_path text NOT NULL,
  scroll_depth integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  click_count integer DEFAULT 0,
  rage_clicks integer DEFAULT 0,
  dead_clicks integer DEFAULT 0,
  interaction_count integer DEFAULT 0,
  engagement_score numeric(5,2) DEFAULT 0,
  core_web_vitals jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert engagement" ON public.engagement_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update engagement" ON public.engagement_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin read engagement" ON public.engagement_scores FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_es_session ON public.engagement_scores (session_id);
CREATE INDEX IF NOT EXISTS idx_es_page ON public.engagement_scores (page_path);
