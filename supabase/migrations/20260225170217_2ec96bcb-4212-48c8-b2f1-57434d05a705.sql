
CREATE TABLE public.visitor_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  language TEXT,
  search_query TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  duration_seconds INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_analytics_created_at ON public.visitor_analytics(created_at DESC);
CREATE INDEX idx_visitor_analytics_session_id ON public.visitor_analytics(session_id);
CREATE INDEX idx_visitor_analytics_page_path ON public.visitor_analytics(page_path);
CREATE INDEX idx_visitor_analytics_country ON public.visitor_analytics(country);
CREATE INDEX idx_visitor_analytics_search_query ON public.visitor_analytics(search_query) WHERE search_query IS NOT NULL;

ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (visitor tracking)
CREATE POLICY "Anyone can insert visitor analytics" ON public.visitor_analytics FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read visitor analytics" ON public.visitor_analytics FOR SELECT USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_analytics;
