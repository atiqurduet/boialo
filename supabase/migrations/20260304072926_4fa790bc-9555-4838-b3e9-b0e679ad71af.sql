
-- Create roles_config table to define available roles dynamically
CREATE TABLE IF NOT EXISTS public.roles_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  label_bn text NOT NULL,
  label_en text NOT NULL DEFAULT '',
  description_bn text DEFAULT '',
  description_en text DEFAULT '',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin users to manage roles
CREATE POLICY "Admins can manage roles_config"
  ON public.roles_config
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Allow all authenticated to read roles
CREATE POLICY "Authenticated can read roles_config"
  ON public.roles_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default roles
INSERT INTO public.roles_config (role_key, label_bn, label_en, description_bn, description_en, is_system, sort_order)
VALUES
  ('admin', 'সুপার এডমিন', 'Super Admin', 'সম্পূর্ণ অ্যাক্সেস - সব কিছু ম্যানেজ করতে পারবে', 'Full access - can manage everything', true, 1),
  ('manager', 'ম্যানেজার', 'Manager', 'প্রোডাক্ট, অর্ডার, কাস্টমার ম্যানেজমেন্ট', 'Product, order, customer management', true, 2),
  ('support', 'সাপোর্ট', 'Support', 'শুধু অর্ডার দেখা ও কাস্টমার সাপোর্ট', 'Order viewing and customer support only', true, 3)
ON CONFLICT (role_key) DO NOTHING;
