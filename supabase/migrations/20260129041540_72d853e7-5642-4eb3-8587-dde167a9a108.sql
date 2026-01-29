-- Create refund_policies table for storing refund policy content
CREATE TABLE public.refund_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_bn text NOT NULL,
  title_en text,
  content_bn text NOT NULL,
  content_en text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create refund_requests table for customer refund requests
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  refund_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create staff_invitations table for inviting new staff members
CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'support',
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create task_auto_assign_rules table for auto-assignment configuration
CREATE TABLE public.task_auto_assign_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL UNIQUE,
  assigned_role app_role NOT NULL DEFAULT 'support',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default auto-assign rules
INSERT INTO public.task_auto_assign_rules (task_type, assigned_role) VALUES
  ('order_processing', 'support'),
  ('payment_collection', 'support'),
  ('courier_booking', 'support'),
  ('delivery_followup', 'support'),
  ('customer_support', 'support'),
  ('return_handling', 'manager'),
  ('refund_processing', 'manager');

-- Enable RLS on all tables
ALTER TABLE public.refund_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_auto_assign_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refund_policies
CREATE POLICY "Anyone can read active refund policies"
  ON public.refund_policies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage refund policies"
  ON public.refund_policies FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for refund_requests
CREATE POLICY "Users can create refund requests for their orders"
  ON public.refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own refund requests"
  ON public.refund_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all refund requests"
  ON public.refund_requests FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'support'));

-- RLS Policies for staff_invitations
CREATE POLICY "Admins can manage staff invitations"
  ON public.staff_invitations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read invitation by token for signup"
  ON public.staff_invitations FOR SELECT
  USING (true);

-- RLS Policies for task_auto_assign_rules
CREATE POLICY "Anyone can read auto-assign rules"
  ON public.task_auto_assign_rules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage auto-assign rules"
  ON public.task_auto_assign_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create function to get staff with least pending tasks for load balancing
CREATE OR REPLACE FUNCTION public.get_least_loaded_staff(_role app_role)
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

-- Create function to auto-assign task based on rules
CREATE OR REPLACE FUNCTION public.auto_assign_task(_task_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_staff_id uuid;
BEGIN
  -- Get the role for this task type
  SELECT assigned_role INTO v_role
  FROM public.task_auto_assign_rules
  WHERE task_type = _task_type AND is_active = true;
  
  IF v_role IS NULL THEN
    v_role := 'support'; -- Default to support
  END IF;
  
  -- Get least loaded staff with this role
  v_staff_id := public.get_least_loaded_staff(v_role);
  
  RETURN v_staff_id;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_refund_policies_updated_at
  BEFORE UPDATE ON public.refund_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_auto_assign_rules_updated_at
  BEFORE UPDATE ON public.task_auto_assign_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();