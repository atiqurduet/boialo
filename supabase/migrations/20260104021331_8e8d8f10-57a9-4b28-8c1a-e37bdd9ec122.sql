-- Create abandoned_checkouts table to track incomplete checkouts
CREATE TABLE public.abandoned_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  delivery_area TEXT,
  subtotal NUMERIC DEFAULT 0,
  cart_items JSONB DEFAULT '[]'::jsonb,
  step TEXT DEFAULT 'cart',
  payment_method TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recovered BOOLEAN DEFAULT false,
  recovered_order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for abandoned_checkouts
CREATE POLICY "Admins can manage abandoned checkouts"
ON public.abandoned_checkouts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Users can view own abandoned checkouts"
ON public.abandoned_checkouts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create abandoned checkouts"
ON public.abandoned_checkouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own abandoned checkouts"
ON public.abandoned_checkouts
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_abandoned_checkouts_updated_at
BEFORE UPDATE ON public.abandoned_checkouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_abandoned_checkouts_user_id ON public.abandoned_checkouts(user_id);
CREATE INDEX idx_abandoned_checkouts_recovered ON public.abandoned_checkouts(recovered);
CREATE INDEX idx_abandoned_checkouts_last_activity ON public.abandoned_checkouts(last_activity_at DESC);