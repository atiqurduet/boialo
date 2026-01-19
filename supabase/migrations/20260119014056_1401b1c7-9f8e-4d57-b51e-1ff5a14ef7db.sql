-- Email subscribers table
CREATE TABLE public.email_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('promotional', 'abandoned_cart', 'order_update', 'newsletter', 'offer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('abandoned_cart', 'order_confirmation', 'order_shipped', 'new_offer', 'welcome', 'custom')),
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email send logs
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  subscriber_id UUID REFERENCES public.email_subscribers(id),
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email provider settings
CREATE TABLE public.email_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('mailchimp', 'resend', 'sendgrid', 'ses')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

-- Admin policies for email_subscribers
CREATE POLICY "Admins can manage email subscribers" ON public.email_subscribers
  FOR ALL USING (public.is_admin(auth.uid()));

-- Admin policies for email_campaigns
CREATE POLICY "Admins can manage email campaigns" ON public.email_campaigns
  FOR ALL USING (public.is_admin(auth.uid()));

-- Admin policies for email_templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (public.is_admin(auth.uid()));

-- Admin policies for email_logs
CREATE POLICY "Admins can view email logs" ON public.email_logs
  FOR ALL USING (public.is_admin(auth.uid()));

-- Admin policies for email_providers
CREATE POLICY "Admins can manage email providers" ON public.email_providers
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, html_content, template_type, variables) VALUES
('Abandoned Cart Reminder', 'আপনার কার্টে পণ্য রয়ে গেছে!', '<h1>হ্যালো {{name}},</h1><p>আপনার কার্টে {{item_count}}টি পণ্য রয়ে গেছে। এখনই অর্ডার সম্পূর্ণ করুন!</p><p>মোট: ৳{{total}}</p><a href="{{cart_url}}">কার্ট দেখুন</a>', 'abandoned_cart', '["name", "item_count", "total", "cart_url"]'),
('New Offer Alert', '🎉 নতুন অফার! {{offer_name}}', '<h1>বিশেষ অফার!</h1><p>{{offer_description}}</p><p>ছাড়: {{discount}}%</p><p>মেয়াদ: {{end_date}} পর্যন্ত</p><a href="{{offer_url}}">এখনই কিনুন</a>', 'new_offer', '["offer_name", "offer_description", "discount", "end_date", "offer_url"]'),
('Welcome Email', 'বইআলোতে স্বাগতম!', '<h1>স্বাগতম {{name}}!</h1><p>বইআলো পরিবারে আপনাকে স্বাগত জানাই।</p><p>আমাদের সাথে থাকার জন্য ধন্যবাদ!</p>', 'welcome', '["name"]'),
('Order Confirmation', 'অর্ডার নিশ্চিত হয়েছে - #{{order_number}}', '<h1>ধন্যবাদ {{name}}!</h1><p>আপনার অর্ডার #{{order_number}} সফলভাবে গ্রহণ করা হয়েছে।</p><p>মোট: ৳{{total}}</p>', 'order_confirmation', '["name", "order_number", "total"]'),
('Order Shipped', 'আপনার অর্ডার পাঠানো হয়েছে!', '<h1>সুখবর {{name}}!</h1><p>আপনার অর্ডার #{{order_number}} পাঠানো হয়েছে।</p><p>ট্র্যাকিং নম্বর: {{tracking_number}}</p>', 'order_shipped', '["name", "order_number", "tracking_number"]');

-- Insert default email providers
INSERT INTO public.email_providers (name, provider, is_active, is_default, sort_order) VALUES
('Mailchimp', 'mailchimp', false, false, 1),
('Resend', 'resend', false, false, 2),
('SendGrid', 'sendgrid', false, false, 3),
('Amazon SES', 'ses', false, false, 4);

-- Triggers for updated_at
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON public.email_subscribers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_providers_updated_at BEFORE UPDATE ON public.email_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();