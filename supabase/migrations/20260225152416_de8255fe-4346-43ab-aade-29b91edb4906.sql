
-- Add A/B testing, scheduling, and advanced condition fields to marketing_automations
ALTER TABLE public.marketing_automations 
  ADD COLUMN IF NOT EXISTS ab_test_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_variant_b_subject text,
  ADD COLUMN IF NOT EXISTS ab_variant_b_content text,
  ADD COLUMN IF NOT EXISTS ab_variant_b_sms text,
  ADD COLUMN IF NOT EXISTS ab_split_percent integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ab_winner text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ab_variant_a_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_variant_a_converted integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_variant_b_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_variant_b_converted integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS schedule_days text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_time_start time,
  ADD COLUMN IF NOT EXISTS schedule_time_end time,
  ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclude_segments text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS send_limit_per_day integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_unsubscribed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funnel_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create automation_ab_results table for detailed A/B test tracking
CREATE TABLE IF NOT EXISTS public.automation_ab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  variant text NOT NULL DEFAULT 'A',
  user_id uuid,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'sent',
  opened_at timestamptz,
  clicked_at timestamptz,
  converted_at timestamptz,
  revenue numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create automation_schedules for recurring schedules
CREATE TABLE IF NOT EXISTS public.automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  executed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  recipients_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for automation_ab_results
ALTER TABLE public.automation_ab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage AB results" ON public.automation_ab_results FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for automation_schedules
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage automation schedules" ON public.automation_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Enable realtime for schedules
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_schedules;
