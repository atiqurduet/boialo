
-- User Journeys table
CREATE TABLE public.user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid NULL,
  journey_data jsonb DEFAULT '[]'::jsonb,
  total_steps integer DEFAULT 0,
  total_duration_ms integer DEFAULT 0,
  unique_pages integer DEFAULT 0,
  entry_page text,
  exit_page text,
  conversion_type text,
  conversion_value numeric DEFAULT 0,
  patterns text[] DEFAULT '{}',
  device_type text DEFAULT 'desktop',
  created_at timestamptz DEFAULT now()
);

-- Predictive Scores table
CREATE TABLE public.predictive_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid NULL,
  purchase_probability integer DEFAULT 0,
  churn_risk integer DEFAULT 0,
  ltv_tier text DEFAULT 'low',
  segment text DEFAULT 'casual_visitor',
  next_action text,
  recommended_action text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_scores ENABLE ROW LEVEL SECURITY;

-- Public insert policies (anonymous tracking)
CREATE POLICY "Allow anonymous inserts on user_journeys" ON public.user_journeys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous inserts on predictive_scores" ON public.predictive_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous upserts on predictive_scores" ON public.predictive_scores FOR UPDATE USING (true);

-- Admin read policies
CREATE POLICY "Admin read user_journeys" ON public.user_journeys FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin read predictive_scores" ON public.predictive_scores FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_user_journeys_session ON public.user_journeys(session_id);
CREATE INDEX idx_user_journeys_created ON public.user_journeys(created_at);
CREATE INDEX idx_predictive_scores_segment ON public.predictive_scores(segment);
CREATE INDEX idx_predictive_scores_updated ON public.predictive_scores(updated_at);
