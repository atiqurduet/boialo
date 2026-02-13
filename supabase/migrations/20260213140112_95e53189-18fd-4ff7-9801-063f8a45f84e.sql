
-- 1. Add review images support
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- 2. Create loyalty_points table
CREATE TABLE public.loyalty_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  type text NOT NULL, -- 'earned', 'redeemed', 'expired', 'adjusted'
  source text NOT NULL, -- 'purchase', 'review', 'referral', 'signup', 'redemption', 'admin'
  reference_id text,
  description text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points" ON public.loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all points" ON public.loyalty_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Loyalty settings table
CREATE TABLE public.loyalty_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read loyalty settings" ON public.loyalty_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.loyalty_settings (setting_key, setting_value) VALUES
  ('points_per_taka', '{"value": 1}'::jsonb),
  ('min_redeem_points', '{"value": 100}'::jsonb),
  ('points_value_taka', '{"value": 0.5}'::jsonb),
  ('signup_bonus', '{"value": 50}'::jsonb),
  ('review_bonus', '{"value": 10}'::jsonb),
  ('is_enabled', '{"value": true}'::jsonb);

-- 3. Create gift_cards table
CREATE TABLE public.gift_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  purchased_by uuid,
  redeemed_by uuid,
  recipient_email text,
  recipient_name text,
  sender_name text,
  message text,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchased cards" ON public.gift_cards FOR SELECT USING (auth.uid() = purchased_by OR auth.uid() = redeemed_by);
CREATE POLICY "Anyone can read gift card by code" ON public.gift_cards FOR SELECT USING (true);
CREATE POLICY "Users can create gift cards" ON public.gift_cards FOR INSERT WITH CHECK (auth.uid() = purchased_by);
CREATE POLICY "Admins can manage all gift cards" ON public.gift_cards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Gift card transactions
CREATE TABLE public.gift_card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'purchase', 'redeem', 'refund'
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.gift_card_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create transactions" ON public.gift_card_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.gift_card_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- 4. Create notification preferences for WhatsApp/Push
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT false,
  order_updates boolean DEFAULT true,
  promotions boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all preferences" ON public.notification_preferences FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for loyalty points
CREATE INDEX idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_type ON public.loyalty_points(type);
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
