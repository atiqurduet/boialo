-- Add payment_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add assigned_to column for task assignment
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create order_tasks table for detailed task assignment
CREATE TABLE IF NOT EXISTS public.order_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  task_type text NOT NULL, -- 'order_processing', 'payment_collection', 'courier_booking', 'delivery_followup', 'customer_support'
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority text NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on order_tasks
ALTER TABLE public.order_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_tasks

-- Admin/Manager can manage all tasks
CREATE POLICY "Admins can manage all tasks"
ON public.order_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Support can view tasks assigned to them
CREATE POLICY "Support can view assigned tasks"
ON public.order_tasks FOR SELECT
USING (
  has_role(auth.uid(), 'support'::app_role) AND 
  assigned_to = auth.uid()
);

-- Support can update tasks assigned to them
CREATE POLICY "Support can update assigned tasks"
ON public.order_tasks FOR UPDATE
USING (
  has_role(auth.uid(), 'support'::app_role) AND 
  assigned_to = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'support'::app_role) AND 
  assigned_to = auth.uid()
);

-- Update RLS for orders to allow admin/manager/support to update
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders"
ON public.orders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_order_tasks_updated_at
  BEFORE UPDATE ON public.order_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_order_tasks_assigned_to ON public.order_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_tasks_order_id ON public.order_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tasks_status ON public.order_tasks(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);