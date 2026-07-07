-- Restore EXECUTE on RLS helper functions (SECURITY DEFINER guards used inside policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_support(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, anon;