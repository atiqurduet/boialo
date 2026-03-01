
-- Add advanced fields to social_automation_rules
ALTER TABLE public.social_automation_rules
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_days text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_time_start text DEFAULT null,
  ADD COLUMN IF NOT EXISTS schedule_time_end text DEFAULT null,
  ADD COLUMN IF NOT EXISTS max_executions_per_day integer DEFAULT null,
  ADD COLUMN IF NOT EXISTS last_executed_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS success_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fail_count integer DEFAULT 0;

-- Add fields to social_post_templates
ALTER TABLE public.social_post_templates
  ADD COLUMN IF NOT EXISTS description text DEFAULT null,
  ADD COLUMN IF NOT EXISTS variables text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Add fields to social_automation_log
ALTER TABLE public.social_automation_log
  ADD COLUMN IF NOT EXISTS rule_id uuid DEFAULT null,
  ADD COLUMN IF NOT EXISTS template_id uuid DEFAULT null,
  ADD COLUMN IF NOT EXISTS platforms_posted text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS execution_time_ms integer DEFAULT null,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
