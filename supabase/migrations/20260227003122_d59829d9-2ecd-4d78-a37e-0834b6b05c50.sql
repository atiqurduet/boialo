
-- Fix trigger function to use net.http_post correctly
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

  PERFORM net.http_post(
    url := 'https://nyzvjuzrkhdbuqlcxhzn.supabase.co/functions/v1/auto-product-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55enZqdXpya2hkYnVxbGN4aHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzU2ODIsImV4cCI6MjA4MjIxMTY4Mn0.TvKgRIDapujr-eAhEdMBVqVQ2o9AydFELCu3El7NCas'
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
