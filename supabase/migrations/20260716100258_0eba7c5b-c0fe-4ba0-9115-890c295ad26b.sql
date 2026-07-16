
CREATE TABLE public.app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO authenticated;
GRANT ALL ON public.app_secrets TO service_role;

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage app secrets"
ON public.app_secrets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER app_secrets_updated_at
BEFORE UPDATE ON public.app_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper for edge functions (service role) to fetch a secret value by name
CREATE OR REPLACE FUNCTION public.get_app_secret(p_name text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_secrets
  WHERE name = p_name AND is_active = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_app_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_secret(text) TO service_role;
