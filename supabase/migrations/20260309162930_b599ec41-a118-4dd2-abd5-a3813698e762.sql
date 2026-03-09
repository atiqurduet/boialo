
ALTER TABLE public.payment_methods 
  ADD COLUMN IF NOT EXISTS manual_number TEXT,
  ADD COLUMN IF NOT EXISTS manual_type TEXT DEFAULT 'send_money',
  ADD COLUMN IF NOT EXISTS manual_instructions TEXT,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'manual';
