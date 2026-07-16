-- Restore Data API grants needed for admin authentication and permissions lookup
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.permissions TO anon, authenticated;
GRANT ALL ON public.permissions TO service_role;

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

-- Restore execute permission for safe role-check helper functions used by RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

-- Keep these helpers unavailable to anonymous visitors
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_support(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM anon;