-- Make notify_new_product trigger self-hosting friendly.
-- Reads SUPABASE_URL and ANON_KEY from app_secrets when available; falls back to current values.

CREATE OR REPLACE FUNCTION public.notify_new_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_name text;
  v_product_slug text;
  v_product_type text;
  v_base_url text;
  v_anon_key text;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'products' THEN
    v_product_name := NEW.title_bn;
    v_product_slug := NEW.slug;
    v_product_type := 'book';
  ELSIF TG_TABLE_NAME = 'universal_products' THEN
    v_product_name := NEW.name_bn;
    v_product_slug := NEW.slug;
    v_product_type := 'universal';
  END IF;

  -- Read URL/key from app_secrets so this trigger works on any Supabase project
  -- after migration. Set these in Admin -> Environment Variables:
  --   SUPABASE_FUNCTIONS_URL = https://<your-ref>.supabase.co/functions/v1
  --   SUPABASE_ANON_KEY      = <your anon/publishable key>
  SELECT value INTO v_base_url FROM public.app_secrets
    WHERE name = 'SUPABASE_FUNCTIONS_URL' AND is_active = true LIMIT 1;
  SELECT value INTO v_anon_key FROM public.app_secrets
    WHERE name = 'SUPABASE_ANON_KEY' AND is_active = true LIMIT 1;

  -- Fallback to current project (works on this deployment out of the box)
  IF v_base_url IS NULL THEN
    v_base_url := 'https://nyzvjuzrkhdbuqlcxhzn.supabase.co/functions/v1';
  END IF;
  IF v_anon_key IS NULL THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55enZqdXpya2hkYnVxbGN4aHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzU2ODIsImV4cCI6MjA4MjIxMTY4Mn0.TvKgRIDapujr-eAhEdMBVqVQ2o9AydFELCu3El7NCas';
  END IF;

  PERFORM net.http_post(
    url := v_base_url || '/auto-product-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
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
$function$;