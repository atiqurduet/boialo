
-- Create payment_methods table to store configured payment providers
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn text NOT NULL,
  name_en text NOT NULL,
  provider text NOT NULL, -- 'bkash', 'nagad', 'sslcommerz', 'cod'
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courier_providers table
CREATE TABLE public.courier_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn text NOT NULL,
  name_en text NOT NULL,
  provider text NOT NULL, -- 'pathao', 'steadfast', 'redx', 'manual'
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  api_endpoint text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_risk_profiles for fraud detection
CREATE TABLE public.customer_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_verified boolean DEFAULT false,
  phone_verified_at timestamptz,
  total_orders integer DEFAULT 0,
  successful_orders integer DEFAULT 0,
  cancelled_orders integer DEFAULT 0,
  returned_orders integer DEFAULT 0,
  fraud_flags jsonb DEFAULT '[]',
  risk_score integer DEFAULT 0, -- 0-100, higher = riskier
  is_blacklisted boolean DEFAULT false,
  blacklist_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create phone_verifications for OTP
CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create order_reviews for manual review
CREATE TABLE public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reason text,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create address_book for verified addresses
CREATE TABLE public.address_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text, -- 'home', 'office', etc.
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  area text,
  city text,
  division text,
  postal_code text,
  is_verified boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add courier tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS courier_provider text,
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS courier_status text,
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS requires_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_book ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods (public read, admin write)
CREATE POLICY "Anyone can read active payment methods" ON public.payment_methods
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for courier_providers (public read, admin write)
CREATE POLICY "Anyone can read active courier providers" ON public.courier_providers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage courier providers" ON public.courier_providers
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for customer_risk_profiles (admin only)
CREATE POLICY "Admins can view risk profiles" ON public.customer_risk_profiles
FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'support'));

CREATE POLICY "Admins can manage risk profiles" ON public.customer_risk_profiles
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for phone_verifications
CREATE POLICY "Users can view own verifications" ON public.phone_verifications
FOR SELECT USING (true);

CREATE POLICY "Anyone can create verification" ON public.phone_verifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update verification" ON public.phone_verifications
FOR UPDATE USING (true);

-- RLS Policies for order_reviews (admin only)
CREATE POLICY "Admins can view order reviews" ON public.order_reviews
FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'support'));

CREATE POLICY "Admins can manage order reviews" ON public.order_reviews
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for address_book
CREATE POLICY "Users can view own addresses" ON public.address_book
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own addresses" ON public.address_book
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses" ON public.address_book
FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

-- Update triggers
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courier_providers_updated_at BEFORE UPDATE ON public.courier_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_risk_profiles_updated_at BEFORE UPDATE ON public.customer_risk_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_address_book_updated_at BEFORE UPDATE ON public.address_book
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_methods (name_bn, name_en, provider, sort_order) VALUES
('বিকাশ', 'bKash', 'bkash', 1),
('নগদ', 'Nagad', 'nagad', 2),
('এসএসএল কমার্জ', 'SSLCommerz', 'sslcommerz', 3),
('ক্যাশ অন ডেলিভারি', 'Cash on Delivery', 'cod', 4);

-- Insert default courier providers
INSERT INTO public.courier_providers (name_bn, name_en, provider, sort_order) VALUES
('পাঠাও', 'Pathao', 'pathao', 1),
('স্টেডফাস্ট', 'Steadfast', 'steadfast', 2),
('রেডএক্স', 'RedX', 'redx', 3),
('ম্যানুয়াল ট্র্যাকিং', 'Manual Tracking', 'manual', 4);

-- Function to calculate risk score
CREATE OR REPLACE FUNCTION public.calculate_risk_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_orders integer;
  v_cancelled integer;
  v_returned integer;
  v_successful integer;
  v_phone_verified boolean;
  v_score integer := 0;
BEGIN
  SELECT total_orders, cancelled_orders, returned_orders, successful_orders, phone_verified
  INTO v_total_orders, v_cancelled, v_returned, v_successful, v_phone_verified
  FROM customer_risk_profiles
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 50; -- Default medium risk for new users
  END IF;
  
  -- Start with base score
  v_score := 50;
  
  -- Reduce score for verified phone
  IF v_phone_verified THEN
    v_score := v_score - 20;
  END IF;
  
  -- Adjust based on order history
  IF v_total_orders > 0 THEN
    -- Reduce score for successful orders
    v_score := v_score - (v_successful * 5);
    -- Increase score for cancelled orders
    v_score := v_score + (v_cancelled * 10);
    -- Increase score for returned orders
    v_score := v_score + (v_returned * 15);
  END IF;
  
  -- Clamp between 0 and 100
  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;
  
  RETURN v_score;
END;
$$;
