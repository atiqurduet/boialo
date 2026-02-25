
-- Dynamic pricing rules
CREATE TABLE public.dynamic_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'bulk_discount', -- bulk_discount, time_based, customer_tier, first_order, min_order
  condition_config JSONB NOT NULL DEFAULT '{}',
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active pricing rules" ON public.dynamic_pricing_rules FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing rules" ON public.dynamic_pricing_rules FOR ALL USING (public.is_admin(auth.uid()));

-- Checkout form fields config (dynamic)
CREATE TABLE public.checkout_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL,
  field_label_bn TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, textarea, select, checkbox, radio
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  options JSONB DEFAULT '[]',
  placeholder TEXT,
  sort_order INTEGER DEFAULT 0,
  field_group TEXT DEFAULT 'shipping', -- shipping, payment, additional
  validation_regex TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read checkout fields" ON public.checkout_form_fields FOR SELECT USING (true);
CREATE POLICY "Admins manage checkout fields" ON public.checkout_form_fields FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default additional fields
INSERT INTO public.checkout_form_fields (field_name, field_label_bn, field_type, is_required, is_active, sort_order, field_group, placeholder) VALUES
  ('gift_wrap', 'গিফট র‍্যাপ করবেন?', 'checkbox', false, true, 1, 'additional', ''),
  ('gift_message', 'গিফট মেসেজ', 'textarea', false, true, 2, 'additional', 'প্রিয়জনকে মেসেজ লিখুন...'),
  ('preferred_delivery_time', 'ডেলিভারির পছন্দের সময়', 'select', false, true, 3, 'additional', '');
