
-- Get all policies using app_role cast and recreate them with text
-- We need to update the has_role function to accept text (already done), 
-- but the policies are calling it with ::app_role cast which may cause issues

-- The simplest fix: recreate has_role to also accept app_role type (overloaded)
-- Actually the enum still exists, so the cast works. The issue was specifically on user_roles table.
-- Let me verify by checking if the original has_role with app_role signature still exists

-- Create an overloaded version that accepts app_role enum too (backward compat)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::text
  )
$$;
