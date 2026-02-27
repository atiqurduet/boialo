
-- Auto-posting settings table
CREATE TABLE public.auto_post_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_post_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage auto_post_settings"
  ON public.auto_post_settings FOR ALL
  USING (public.is_admin(auth.uid()));

-- Insert default settings
INSERT INTO public.auto_post_settings (setting_key, setting_value, is_active) VALUES
  ('social_media_auto_post', '{"enabled": true, "platforms": ["facebook", "telegram"], "include_price": true, "include_image": true, "template_bn": "🆕 নতুন পণ্য এসেছে!\n\n📖 {{product_name}}\n✍️ {{author}}\n💰 মূল্য: ৳{{price}}\n\n🛒 এখনই অর্ডার করুন:\n{{link}}", "template_en": "🆕 New Arrival!\n\n📖 {{product_name}}\n✍️ {{author}}\n💰 Price: ৳{{price}}\n\n🛒 Order now:\n{{link}}", "hashtags": ["নতুন_বই", "বইআলো", "বই"]}', true),
  ('email_new_product', '{"enabled": true, "template_subject": "🆕 নতুন পণ্য: {{product_name}}", "delay_minutes": 5}', true);

-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-notify on new product
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_name text;
  v_product_slug text;
  v_product_type text;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Only trigger on new active products
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Determine product details based on table
  IF TG_TABLE_NAME = 'products' THEN
    v_product_name := NEW.title_bn;
    v_product_slug := NEW.slug;
    v_product_type := 'book';
  ELSIF TG_TABLE_NAME = 'universal_products' THEN
    v_product_name := NEW.name_bn;
    v_product_slug := NEW.slug;
    v_product_type := 'universal';
  END IF;

  -- Call edge function via pg_net
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-product-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'product_id', NEW.id,
      'product_type', v_product_type,
      'product_name', v_product_name,
      'product_slug', v_product_slug
    )
  );

  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER trg_auto_notify_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();

CREATE TRIGGER trg_auto_notify_new_universal_product
  AFTER INSERT ON public.universal_products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();
