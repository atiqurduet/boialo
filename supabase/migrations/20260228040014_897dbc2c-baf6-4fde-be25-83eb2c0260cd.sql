
-- Saved hashtag groups for reuse across posts and automation
CREATE TABLE public.saved_hashtag_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content templates for different post types
CREATE TABLE public.social_post_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'general', -- general, new_product, offer, category, custom
  content_bn TEXT,
  content_en TEXT,
  hashtag_group_id UUID REFERENCES public.saved_hashtag_groups(id) ON DELETE SET NULL,
  platforms TEXT[] DEFAULT '{}',
  include_image BOOLEAN DEFAULT true,
  include_price BOOLEAN DEFAULT true,
  include_link BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation rules for different triggers
CREATE TABLE public.social_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- new_product, product_update, new_offer, price_drop, back_in_stock, flash_sale
  is_active BOOLEAN DEFAULT true,
  platforms TEXT[] DEFAULT '{}',
  template_id UUID REFERENCES public.social_post_templates(id) ON DELETE SET NULL,
  hashtag_group_id UUID REFERENCES public.saved_hashtag_groups(id) ON DELETE SET NULL,
  delay_minutes INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}', -- e.g. product_type filter, min_price, category filter
  send_email BOOLEAN DEFAULT false,
  send_sms BOOLEAN DEFAULT false,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation execution log
CREATE TABLE public.social_automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.social_automation_rules(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  post_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, skipped
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies (admin only)
ALTER TABLE public.saved_hashtag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access saved_hashtag_groups" ON public.saved_hashtag_groups
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin access social_post_templates" ON public.social_post_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin access social_automation_rules" ON public.social_automation_rules
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin access social_automation_log" ON public.social_automation_log
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default hashtag groups
INSERT INTO public.saved_hashtag_groups (name, hashtags, is_default) VALUES
  ('বই প্রচার', ARRAY['নতুন_বই', 'বইআলো', 'বাংলা_বই', 'পড়ুন', 'বই_কিনুন'], true),
  ('অফার', ARRAY['অফার', 'ডিসকাউন্ট', 'সেল', 'বিশেষ_মূল্য', 'সীমিত_অফার'], false),
  ('সাধারণ', ARRAY['boialo', 'bookstore', 'onlineshopping', 'bangladesh'], false);
