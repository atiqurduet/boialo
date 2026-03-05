
-- Active sessions table to track who is currently logged in
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  logged_out_at timestamptz
);

CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_is_active ON public.active_sessions(is_active);

-- Per-user auto logout timeout settings (in minutes)
CREATE TABLE public.auto_logout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  timeout_minutes integer NOT NULL DEFAULT 30,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_logout_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own sessions, admins can see all
CREATE POLICY "Users can view own sessions" ON public.active_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own sessions" ON public.active_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON public.active_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- RLS for auto_logout_settings: admins only
CREATE POLICY "Admins can manage logout settings" ON public.auto_logout_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can read own settings" ON public.auto_logout_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
