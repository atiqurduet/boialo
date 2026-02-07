
-- Login/Security logs table
CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text NOT NULL DEFAULT 'login', -- login, logout, failed_login, password_reset
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login logs" ON public.login_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert login logs" ON public.login_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_login_logs_user ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_created ON public.login_logs(created_at DESC);
CREATE INDEX idx_login_logs_event ON public.login_logs(event_type);

-- Backup history table
CREATE TABLE public.backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL, -- settings, products, full
  file_name text,
  file_size bigint,
  status text DEFAULT 'completed',
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backup history" ON public.backup_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for admin audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.admin_audit_logs(table_name);
