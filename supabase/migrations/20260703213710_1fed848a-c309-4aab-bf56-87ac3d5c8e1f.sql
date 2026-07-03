
-- =====================================================================
-- 1) Restrict is_admin() — remove 'support' from admin privilege set
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','manager')
  )
$$;

-- Helper: strict admin (super_admin/admin/manager) — same as is_admin now
-- Helper: is_support role check
CREATE OR REPLACE FUNCTION public.is_support(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'support'
  )
$$;

-- =====================================================================
-- 2) payment_methods — drop public SELECT, expose safe RPC
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read active payment methods" ON public.payment_methods;

CREATE OR REPLACE FUNCTION public.get_public_payment_methods()
RETURNS TABLE (
  id uuid,
  name_bn text,
  name_en text,
  provider text,
  is_active boolean,
  sort_order integer,
  manual_number text,
  manual_type text,
  manual_instructions text,
  payment_mode text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, name_bn, name_en, provider, is_active, sort_order,
         manual_number, manual_type, manual_instructions, payment_mode
  FROM public.payment_methods
  WHERE is_active = true
  ORDER BY sort_order NULLS LAST, name_en;
$$;

REVOKE ALL ON FUNCTION public.get_public_payment_methods() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_methods() TO anon, authenticated;

-- =====================================================================
-- 3) courier_providers — drop public SELECT (admin-only ops remain)
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read active courier providers" ON public.courier_providers;

-- =====================================================================
-- 4) sms_providers — drop public/service SELECT (service_role bypasses RLS)
-- =====================================================================
DROP POLICY IF EXISTS "Service role can read SMS providers" ON public.sms_providers;

-- =====================================================================
-- 5) email_subscribers — drop public SELECT/UPDATE/INSERT; expose safe RPC
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can check their subscription status" ON public.email_subscribers;
DROP POLICY IF EXISTS "Users can manage their own subscription by email" ON public.email_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.email_subscribers;

CREATE OR REPLACE FUNCTION public.subscribe_email(p_email text, p_source text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_existing record;
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN json_build_object('status','invalid');
  END IF;

  SELECT id, status INTO v_existing
  FROM public.email_subscribers WHERE email = v_email;

  IF FOUND THEN
    IF v_existing.status = 'active' THEN
      RETURN json_build_object('status','already_active');
    END IF;
    UPDATE public.email_subscribers
      SET status = 'active', unsubscribed_at = NULL, updated_at = now()
      WHERE id = v_existing.id;
    RETURN json_build_object('status','resubscribed');
  END IF;

  INSERT INTO public.email_subscribers(email, source, status)
  VALUES (v_email, COALESCE(p_source,'newsletter_form'), 'active');
  RETURN json_build_object('status','subscribed');
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_email(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(text,text) TO anon, authenticated;

-- =====================================================================
-- 6) staff_invitations — drop public read policy and duplicate admin policy
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read invitation by token for signup" ON public.staff_invitations;
DROP POLICY IF EXISTS "Admins can manage staff invitations" ON public.staff_invitations;

-- =====================================================================
-- 7) phone_verifications — restrict SELECT to strict admins (exclude support)
-- =====================================================================
DROP POLICY IF EXISTS "Admins can view verifications" ON public.phone_verifications;
CREATE POLICY "Strict admins can view verifications"
  ON public.phone_verifications FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
  );

-- =====================================================================
-- 8) predictive_scores — remove public SELECT/UPDATE/INSERT; add RPC
-- =====================================================================
DROP POLICY IF EXISTS "anon_select_scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "anon_update_scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "anon_insert_scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "Allow anonymous inserts on predictive_scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "Allow anonymous upserts on predictive_scores" ON public.predictive_scores;

CREATE OR REPLACE FUNCTION public.upsert_predictive_score(
  p_session_id text,
  p_user_id uuid,
  p_purchase_probability numeric,
  p_churn_risk numeric,
  p_ltv_tier text,
  p_segment text,
  p_next_action text,
  p_recommended_action text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 THEN RETURN; END IF;
  INSERT INTO public.predictive_scores(
    session_id, user_id, purchase_probability, churn_risk,
    ltv_tier, segment, next_action, recommended_action, updated_at
  ) VALUES (
    p_session_id, p_user_id, p_purchase_probability, p_churn_risk,
    p_ltv_tier, p_segment, p_next_action, p_recommended_action, now()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    purchase_probability = EXCLUDED.purchase_probability,
    churn_risk = EXCLUDED.churn_risk,
    ltv_tier = EXCLUDED.ltv_tier,
    segment = EXCLUDED.segment,
    next_action = EXCLUDED.next_action,
    recommended_action = EXCLUDED.recommended_action,
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_predictive_score(text,uuid,numeric,numeric,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_predictive_score(text,uuid,numeric,numeric,text,text,text,text) TO anon, authenticated;

-- =====================================================================
-- 9) realtime_presence — remove public SELECT/UPDATE/DELETE/INSERT; add RPCs
-- =====================================================================
DROP POLICY IF EXISTS "anon_select_presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "anon_update_presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "anon_insert_presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "Anon update presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "Anon upsert presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "Anon delete own presence" ON public.realtime_presence;

CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_session_id text,
  p_page_path text,
  p_user_id uuid,
  p_device_type text,
  p_country text,
  p_city text,
  p_cart_value numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 THEN RETURN; END IF;
  INSERT INTO public.realtime_presence(
    session_id, page_path, user_id, device_type, country, city,
    is_online, cart_value, last_seen_at
  ) VALUES (
    p_session_id, p_page_path, p_user_id, p_device_type, p_country, p_city,
    true, COALESCE(p_cart_value,0), now()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    page_path = EXCLUDED.page_path,
    user_id = EXCLUDED.user_id,
    device_type = EXCLUDED.device_type,
    country = EXCLUDED.country,
    city = EXCLUDED.city,
    is_online = true,
    cart_value = EXCLUDED.cart_value,
    last_seen_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_presence(text,text,uuid,text,text,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_presence(text,text,uuid,text,text,text,numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_presence_offline(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 THEN RETURN; END IF;
  UPDATE public.realtime_presence
     SET is_online = false, last_seen_at = now()
   WHERE session_id = p_session_id;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_presence_offline(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_presence_offline(text) TO anon, authenticated;

-- =====================================================================
-- 10) Analytics tables — drop unrestricted anon UPDATE policies
-- =====================================================================
DROP POLICY IF EXISTS "Anon update own ab assignments" ON public.ab_test_assignments;
DROP POLICY IF EXISTS "Allow anon update attributions" ON public.user_attributions;
DROP POLICY IF EXISTS "Allow anon update engagement" ON public.engagement_scores;
DROP POLICY IF EXISTS "Anon update page analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "Anon update retention" ON public.retention_cohorts;

-- RPC for retention update (client uses this)
CREATE OR REPLACE FUNCTION public.upsert_retention_visit(
  p_cohort_id text,
  p_user_id uuid,
  p_visit_day integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_cohort_id IS NULL THEN RETURN; END IF;
  UPDATE public.retention_cohorts
     SET last_seen_at = now()
   WHERE cohort_id = p_cohort_id
     AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_retention_visit(text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_retention_visit(text,uuid,integer) TO anon, authenticated;

-- =====================================================================
-- 11) Storage: digital-files bucket — drop public SELECT policy
-- =====================================================================
DROP POLICY IF EXISTS "Public can read digital files" ON storage.objects;

-- =====================================================================
-- 12) Storage: prevent public listing of public buckets
--     Public CDN GET still works (public buckets bypass RLS for GET),
--     but SELECT via API (listing) is disabled.
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product previews" ON storage.objects;
DROP POLICY IF EXISTS "Public read social media images" ON storage.objects;

-- =====================================================================
-- 13) Lock down SECURITY DEFINER helper functions from public/authenticated
--     (revoke public execution on internal helpers)
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_support(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_least_loaded_staff(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_least_loaded_staff(app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.smart_auto_assign(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_task(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_risk_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_attribution_conversions(text, numeric) FROM PUBLIC, anon, authenticated;
