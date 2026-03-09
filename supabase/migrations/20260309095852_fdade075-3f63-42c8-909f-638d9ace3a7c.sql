
CREATE TABLE public.server_side_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  page_title TEXT,
  referrer TEXT,
  user_id UUID,
  session_id TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  language TEXT,
  country TEXT,
  city TEXT,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast querying
CREATE INDEX idx_sse_event_name ON public.server_side_events(event_name);
CREATE INDEX idx_sse_created_at ON public.server_side_events(created_at DESC);
CREATE INDEX idx_sse_session_id ON public.server_side_events(session_id);

-- RLS: allow inserts from anyone (anonymous tracking), select only for admins
ALTER TABLE public.server_side_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.server_side_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read all events" ON public.server_side_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
