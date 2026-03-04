
-- Change role_permissions.role from app_role enum to text to support custom roles
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE text USING role::text;

-- Also update user_roles.role to text for consistency with custom roles
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- Update has_role function to work with text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
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
      AND role = _role
  )
$$;

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
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
      AND role IN ('admin', 'manager', 'support')
  )
$$;

-- Update has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Update get_least_loaded_staff to accept text
CREATE OR REPLACE FUNCTION public.get_least_loaded_staff(_role text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id
  FROM public.user_roles ur
  LEFT JOIN public.order_tasks ot ON ur.user_id = ot.assigned_to AND ot.status = 'pending'
  WHERE ur.role = _role
  GROUP BY ur.user_id
  ORDER BY COUNT(ot.id) ASC
  LIMIT 1
$$;

-- Update auto_assign_task to use text
CREATE OR REPLACE FUNCTION public.auto_assign_task(_task_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_staff_id uuid;
BEGIN
  SELECT assigned_role::text INTO v_role
  FROM public.task_auto_assign_rules
  WHERE task_type = _task_type AND is_active = true;
  
  IF v_role IS NULL THEN
    v_role := 'support';
  END IF;
  
  v_staff_id := public.get_least_loaded_staff(v_role);
  
  RETURN v_staff_id;
END;
$$;
