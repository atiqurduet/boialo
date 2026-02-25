
-- Marketing automation workflows table
CREATE TABLE public.marketing_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  description_bn TEXT,
  trigger_type TEXT NOT NULL, -- abandoned_cart, post_purchase, birthday, re_engagement, welcome, price_drop, back_in_stock, review_request
  trigger_config JSONB DEFAULT '{}'::jsonb, -- delay_hours, conditions, filters
  action_type TEXT NOT NULL, -- email, sms, both
  email_template_id UUID REFERENCES public.email_templates(id),
  sms_template TEXT,
  email_subject TEXT,
  email_content TEXT,
  target_segment TEXT DEFAULT 'all', -- all, new, returning, vip, inactive
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  max_sends_per_user INTEGER DEFAULT 1,
  cooldown_hours INTEGER DEFAULT 24,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation execution log
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  user_id UUID,
  channel TEXT NOT NULL, -- email, sms
  recipient TEXT NOT NULL, -- email or phone
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, opened, clicked, converted
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automations" ON public.marketing_automations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can manage automation logs" ON public.automation_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Enable realtime for automation logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_logs;
