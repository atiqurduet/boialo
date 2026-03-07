
-- Search analytics: track popular searches
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count integer DEFAULT 0,
  user_id uuid,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Index for trending queries
CREATE INDEX idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX idx_search_analytics_created_at ON public.search_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (tracking)
CREATE POLICY "Anyone can insert search analytics"
  ON public.search_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read search analytics"
  ON public.search_analytics FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
