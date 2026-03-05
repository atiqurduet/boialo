
-- Drop and recreate enhanced auto-assign function with round-robin support
CREATE OR REPLACE FUNCTION public.smart_auto_assign(_task_type text, _order_id uuid DEFAULT NULL)
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
    v_role := 'support';
  END IF;

  -- Get assignment strategy (default: least_loaded)
  SELECT COALESCE(
    (SELECT (setting_value->>'strategy')::text FROM public.site_settings WHERE setting_key = 'auto_assign_strategy'),
    'least_loaded'
  ) INTO v_strategy;

  IF v_strategy = 'round_robin' THEN
    -- Round-robin: pick the staff who was least recently assigned
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
    -- Least loaded: pick staff with fewest pending tasks (existing logic)
    SELECT ur.user_id INTO v_staff_id
    FROM public.user_roles ur
    LEFT JOIN public.order_tasks ot ON ur.user_id = ot.assigned_to AND ot.status = 'pending'
    WHERE ur.role = v_role
    GROUP BY ur.user_id
    ORDER BY COUNT(ot.id) ASC
    LIMIT 1;
  END IF;

  RETURN v_staff_id;
END;
$function$;

-- Add assignment_strategy column to task_auto_assign_rules
ALTER TABLE public.task_auto_assign_rules
  ADD COLUMN IF NOT EXISTS assignment_strategy text NOT NULL DEFAULT 'least_loaded',
  ADD COLUMN IF NOT EXISTS max_tasks_per_staff integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_create_on_order boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_priority text NOT NULL DEFAULT 'medium';

-- Trigger function: auto-create tasks when new order is placed
CREATE OR REPLACE FUNCTION public.auto_create_order_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule record;
  v_staff_id uuid;
BEGIN
  -- For each active rule that has auto_create_on_order enabled
  FOR v_rule IN
    SELECT * FROM public.task_auto_assign_rules
    WHERE is_active = true AND auto_create_on_order = true
  LOOP
    -- Find staff to assign using smart assignment
    v_staff_id := public.smart_auto_assign(v_rule.task_type, NEW.id);

    IF v_staff_id IS NOT NULL THEN
      INSERT INTO public.order_tasks (
        order_id, task_type, title, assigned_to, priority, status
      ) VALUES (
        NEW.id,
        v_rule.task_type,
        CASE v_rule.task_type
          WHEN 'order_processing' THEN 'অর্ডার প্রসেসিং - #' || NEW.order_number
          WHEN 'payment_collection' THEN 'পেমেন্ট কালেকশন - #' || NEW.order_number
          WHEN 'courier_booking' THEN 'কুরিয়ার বুকিং - #' || NEW.order_number
          WHEN 'delivery_followup' THEN 'ডেলিভারি ফলোআপ - #' || NEW.order_number
          ELSE v_rule.task_type || ' - #' || NEW.order_number
        END,
        v_staff_id,
        v_rule.default_priority,
        'pending'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_auto_create_order_tasks ON public.orders;
CREATE TRIGGER trg_auto_create_order_tasks
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_order_tasks();
