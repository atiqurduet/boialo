
-- Create SMS providers table
CREATE TABLE public.sms_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL, -- 'twilio', 'msg91', 'ssl_wireless', 'bulksmsbd'
  is_active boolean DEFAULT false,
  is_default boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage SMS providers" ON public.sms_providers
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can read SMS providers" ON public.sms_providers
FOR SELECT USING (true);

-- Update trigger
CREATE TRIGGER update_sms_providers_updated_at BEFORE UPDATE ON public.sms_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default providers
INSERT INTO public.sms_providers (name, provider, sort_order) VALUES
('Twilio', 'twilio', 1),
('MSG91', 'msg91', 2),
('SSL Wireless', 'ssl_wireless', 3),
('BulkSMSBD', 'bulksmsbd', 4);
