-- Create order_status_history table for detailed tracking
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  notes text,
  changed_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage order history" 
ON public.order_status_history 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Users can view own order history" 
ON public.order_status_history 
FOR SELECT 
USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view order history for tracking" 
ON public.order_status_history 
FOR SELECT 
USING (true);

-- Create courier_bookings table for tracking courier API bookings
CREATE TABLE public.courier_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  courier_provider text NOT NULL,
  consignment_id text,
  tracking_code text,
  booking_status text DEFAULT 'pending',
  api_response jsonb DEFAULT '{}',
  pickup_scheduled_at timestamptz,
  estimated_delivery timestamptz,
  actual_weight numeric,
  cod_amount numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courier_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage courier bookings" 
ON public.courier_bookings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Anyone can view courier bookings for tracking" 
ON public.courier_bookings 
FOR SELECT 
USING (true);

-- Add delivery_notes column to orders if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_notes text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS actual_weight numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_bookings_order_id ON public.courier_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);