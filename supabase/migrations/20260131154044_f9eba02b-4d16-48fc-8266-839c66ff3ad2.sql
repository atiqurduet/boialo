-- Create notification_settings table for managing customer notification preferences
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL UNIQUE,
  event_name_bn text NOT NULL,
  event_name_en text NOT NULL,
  description text,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  email_template_id uuid,
  sms_template text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage notification settings"
ON public.notification_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Anyone can read notification settings"
ON public.notification_settings
FOR SELECT
USING (true);

-- Insert default notification events
INSERT INTO public.notification_settings (event_type, event_name_bn, event_name_en, description, email_enabled, sms_enabled, sort_order) VALUES
  ('order_placed', 'অর্ডার কনফার্মেশন', 'Order Confirmation', 'নতুন অর্ডার প্লেস করার পর কাস্টমারকে জানানো হয়', true, true, 1),
  ('order_processing', 'অর্ডার প্রসেসিং', 'Order Processing', 'অর্ডার প্রসেসিং শুরু হলে কাস্টমারকে জানানো হয়', true, false, 2),
  ('order_shipped', 'অর্ডার শিপড', 'Order Shipped', 'অর্ডার ডেলিভারির জন্য হস্তান্তর করা হলে কাস্টমারকে জানানো হয়', true, true, 3),
  ('order_delivered', 'অর্ডার ডেলিভারি', 'Order Delivered', 'অর্ডার ডেলিভারি হলে কাস্টমারকে জানানো হয়', true, true, 4),
  ('order_cancelled', 'অর্ডার বাতিল', 'Order Cancelled', 'অর্ডার বাতিল হলে কাস্টমারকে জানানো হয়', true, true, 5),
  ('payment_success', 'পেমেন্ট সফল', 'Payment Success', 'পেমেন্ট সফল হলে কাস্টমারকে জানানো হয়', true, false, 6),
  ('payment_failed', 'পেমেন্ট ব্যর্থ', 'Payment Failed', 'পেমেন্ট ব্যর্থ হলে কাস্টমারকে জানানো হয়', true, true, 7),
  ('refund_initiated', 'রিফান্ড শুরু', 'Refund Initiated', 'রিফান্ড প্রসেস শুরু হলে কাস্টমারকে জানানো হয়', true, false, 8),
  ('refund_completed', 'রিফান্ড সম্পন্ন', 'Refund Completed', 'রিফান্ড সম্পন্ন হলে কাস্টমারকে জানানো হয়', true, true, 9),
  ('abandoned_cart', 'অসম্পূর্ণ কার্ট রিমাইন্ডার', 'Abandoned Cart Reminder', 'কার্টে প্রোডাক্ট রেখে চলে গেলে রিমাইন্ডার পাঠানো হয়', true, false, 10),
  ('new_offer', 'নতুন অফার', 'New Offer', 'নতুন অফার বা প্রমোশন সম্পর্কে জানানো হয়', true, false, 11),
  ('preorder_available', 'প্রি-অর্ডার প্রোডাক্ট স্টকে', 'Pre-order Available', 'প্রি-অর্ডার প্রোডাক্ট স্টকে এলে কাস্টমারকে জানানো হয়', true, true, 12),
  ('otp_verification', 'OTP ভেরিফিকেশন', 'OTP Verification', 'ফোন নম্বর ভেরিফিকেশনের জন্য OTP পাঠানো হয়', false, true, 13),
  ('password_reset', 'পাসওয়ার্ড রিসেট', 'Password Reset', 'পাসওয়ার্ড রিসেট লিংক পাঠানো হয়', true, false, 14),
  ('welcome', 'ওয়েলকাম মেসেজ', 'Welcome Message', 'নতুন অ্যাকাউন্ট তৈরির পর ওয়েলকাম মেসেজ পাঠানো হয়', true, false, 15);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();