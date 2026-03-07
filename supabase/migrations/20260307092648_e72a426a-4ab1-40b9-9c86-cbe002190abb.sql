
-- Daily check-in records
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_count INTEGER NOT NULL DEFAULT 1,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX idx_daily_checkins_user ON public.daily_checkins(user_id, checkin_date DESC);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkins"
  ON public.daily_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own checkins"
  ON public.daily_checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Spin wheel prizes config
CREATE TABLE public.spin_wheel_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_bn TEXT NOT NULL,
  prize_type TEXT NOT NULL DEFAULT 'points',
  prize_value INTEGER NOT NULL DEFAULT 0,
  probability NUMERIC NOT NULL DEFAULT 10,
  color TEXT NOT NULL DEFAULT '#E74C3C',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.spin_wheel_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active prizes"
  ON public.spin_wheel_prizes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage prizes"
  ON public.spin_wheel_prizes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Spin wheel history
CREATE TABLE public.spin_wheel_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_id UUID REFERENCES public.spin_wheel_prizes(id),
  prize_label TEXT NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value INTEGER NOT NULL DEFAULT 0,
  spun_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spin_history_user ON public.spin_wheel_history(user_id, spun_at DESC);

ALTER TABLE public.spin_wheel_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own spins"
  ON public.spin_wheel_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own spins"
  ON public.spin_wheel_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Achievement badges
CREATE TABLE public.achievement_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  description_bn TEXT,
  icon TEXT NOT NULL DEFAULT '🏆',
  badge_type TEXT NOT NULL DEFAULT 'milestone',
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active badges"
  ON public.achievement_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage badges"
  ON public.achievement_badges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- User earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.achievement_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert default spin wheel prizes
INSERT INTO public.spin_wheel_prizes (label_bn, prize_type, prize_value, probability, color, sort_order) VALUES
  ('১০ পয়েন্ট', 'points', 10, 30, '#3498DB', 1),
  ('২০ পয়েন্ট', 'points', 20, 25, '#2ECC71', 2),
  ('৫০ পয়েন্ট', 'points', 50, 15, '#E67E22', 3),
  ('১০০ পয়েন্ট', 'points', 100, 8, '#9B59B6', 4),
  ('ফ্রি ডেলিভারি', 'free_delivery', 1, 10, '#E74C3C', 5),
  ('৫% ডিসকাউন্ট', 'discount', 5, 7, '#1ABC9C', 6),
  ('১০% ডিসকাউন্ট', 'discount', 10, 3, '#F39C12', 7),
  ('আবার চেষ্টা করুন', 'nothing', 0, 2, '#95A5A6', 8);

-- Insert default achievement badges
INSERT INTO public.achievement_badges (name_bn, description_bn, icon, condition_type, condition_value, points_reward, sort_order) VALUES
  ('প্রথম অর্ডার', 'প্রথম অর্ডার সম্পন্ন করুন', '🛒', 'orders_count', 1, 50, 1),
  ('নিয়মিত ক্রেতা', '৫টি অর্ডার সম্পন্ন করুন', '⭐', 'orders_count', 5, 100, 2),
  ('বই পোকা', '১০টি অর্ডার সম্পন্ন করুন', '📚', 'orders_count', 10, 200, 3),
  ('রিভিউ মাস্টার', '৫টি রিভিউ দিন', '✍️', 'reviews_count', 5, 75, 4),
  ('৭ দিন স্ট্রিক', 'টানা ৭ দিন চেক-ইন করুন', '🔥', 'checkin_streak', 7, 150, 5),
  ('৩০ দিন স্ট্রিক', 'টানা ৩০ দিন চেক-ইন করুন', '💎', 'checkin_streak', 30, 500, 6),
  ('রেফারেল চ্যাম্পিয়ন', '৩ জনকে রেফার করুন', '🤝', 'referrals_count', 3, 200, 7),
  ('উইশলিস্ট কিং', '১০টি প্রোডাক্ট উইশলিস্টে রাখুন', '❤️', 'wishlist_count', 10, 50, 8);
