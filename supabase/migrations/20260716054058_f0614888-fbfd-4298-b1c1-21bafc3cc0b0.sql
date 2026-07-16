CREATE OR REPLACE FUNCTION public.get_my_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY
    CASE role::text
      WHEN 'super_admin' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'support' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_admin_role() TO service_role;