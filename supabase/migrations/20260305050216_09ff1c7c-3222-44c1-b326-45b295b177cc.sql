
CREATE OR REPLACE FUNCTION public.smart_auto_assign(_task_type text, _order_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_staff_id uuid;
  v_strategy text;
BEGIN
  -- Get assignment rule
  SELECT assigned_role::text INTO v_role
  FROM public.task_auto_assign_rules
  WHERE task_type = _task_type AND is_active = true;

  IF v_role IS NULL THEN
    v_role := 'manager';
  END IF;

  -- Get assignment strategy
  SELECT COALESCE(
    (SELECT (setting_value->>'strategy')::text FROM public.site_settings WHERE setting_key = 'auto_assign_strategy'),
    'least_loaded'
  ) INTO v_strategy;

  IF v_strategy = 'round_robin' THEN
    SELECT ur.user_id INTO v_staff_id
    FROM public.user_roles ur
    LEFT JOIN (
      SELECT assigned_to, MAX(created_at) as last_assigned
      FROM public.order_tasks
      GROUP BY assigned_to
    ) lt ON ur.user_id = lt.assigned_to
    WHERE ur.role = v_role
    ORDER BY lt.last_assigned ASC NULLS FIRST
    LIMIT 1;
  ELSE
    SELECT ur.user_id INTO v_staff_id
    FROM public.user_roles ur
    LEFT JOIN public.order_tasks ot ON ur.user_id = ot.assigned_to AND ot.status = 'pending'
    WHERE ur.role = v_role
    GROUP BY ur.user_id
    ORDER BY COUNT(ot.id) ASC
    LIMIT 1;
  END IF;

  -- Fallback: if no staff found with the specified role, try any admin/manager/support
  IF v_staff_id IS NULL THEN
    SELECT ur.user_id INTO v_staff_id
    FROM public.user_roles ur
    WHERE ur.role IN ('manager', 'admin', 'super_admin', 'support')
    LIMIT 1;
  END IF;

  RETURN v_staff_id;
END;
$function$;
