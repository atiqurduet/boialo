
-- Delivery Zones for custom pricing
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name_bn text NOT NULL,
  zone_name_en text,
  division text,
  districts jsonb DEFAULT '[]'::jsonb,
  delivery_charge numeric NOT NULL DEFAULT 0,
  estimated_days_min integer DEFAULT 1,
  estimated_days_max integer DEFAULT 3,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Anyone can read active delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

-- Referral Program
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  total_referrals integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own referral code" ON public.referral_codes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all referral codes" ON public.referral_codes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id),
  order_id uuid,
  referrer_reward numeric DEFAULT 0,
  referred_reward numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can manage all rewards" ON public.referral_rewards
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Referral Settings
CREATE TABLE public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral settings" ON public.referral_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read referral settings" ON public.referral_settings
  FOR SELECT USING (true);

-- Insert default referral settings
INSERT INTO public.referral_settings (setting_key, setting_value) VALUES
  ('is_enabled', 'true'::jsonb),
  ('referrer_reward_amount', '50'::jsonb),
  ('referred_reward_amount', '30'::jsonb),
  ('reward_type', '"discount"'::jsonb),
  ('min_order_amount', '200'::jsonb);

-- Product Q&A
CREATE TABLE public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  is_published boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published questions" ON public.product_questions
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can create questions" ON public.product_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own questions" ON public.product_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all questions" ON public.product_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Back in Stock Alerts
CREATE TABLE public.back_in_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  email text,
  phone text,
  is_notified boolean DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.back_in_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alerts" ON public.back_in_stock_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all alerts" ON public.back_in_stock_alerts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Price Drop Alerts
CREATE TABLE public.price_drop_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  target_price numeric,
  original_price numeric NOT NULL,
  is_notified boolean DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own price alerts" ON public.price_drop_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all price alerts" ON public.price_drop_alerts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_questions;
