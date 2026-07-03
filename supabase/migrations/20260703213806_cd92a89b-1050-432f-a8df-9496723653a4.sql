
CREATE OR REPLACE FUNCTION public.track_retention_visit(
  p_fingerprint text,
  p_cohort_date date,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing record;
  v_days_since integer;
BEGIN
  IF p_fingerprint IS NULL OR length(p_fingerprint) = 0 THEN RETURN; END IF;

  SELECT id, visit_count, total_page_views, first_visit_at
    INTO v_existing
  FROM public.retention_cohorts
  WHERE fingerprint_id = p_fingerprint
    AND cohort_date = p_cohort_date
    AND cohort_type = 'weekly'
  LIMIT 1;

  IF FOUND THEN
    v_days_since := GREATEST(0, (CURRENT_DATE - v_existing.first_visit_at::date));
    UPDATE public.retention_cohorts
       SET last_visit_at = now(),
           visit_count = COALESCE(visit_count,0) + 1,
           total_page_views = COALESCE(total_page_views,0) + 1,
           days_since_first_visit = v_days_since,
           user_id = COALESCE(p_user_id, user_id),
           is_retained = true,
           updated_at = now()
     WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.retention_cohorts(
      cohort_date, cohort_type, fingerprint_id, user_id,
      first_visit_at, last_visit_at, visit_count, total_page_views,
      total_sessions, days_since_first_visit, is_retained
    ) VALUES (
      p_cohort_date, 'weekly', p_fingerprint, p_user_id,
      now(), now(), 1, 1, 1, 0, true
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.track_retention_visit(text,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_retention_visit(text,date,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_retention_conversion(
  p_fingerprint text,
  p_cohort_date date,
  p_revenue numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_fingerprint IS NULL THEN RETURN; END IF;
  UPDATE public.retention_cohorts
     SET total_conversions = COALESCE(total_conversions,0) + 1,
         total_revenue = COALESCE(total_revenue,0) + COALESCE(p_revenue,0),
         updated_at = now()
   WHERE fingerprint_id = p_fingerprint
     AND cohort_date = p_cohort_date;
END;
$$;
REVOKE ALL ON FUNCTION public.track_retention_conversion(text,date,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_retention_conversion(text,date,numeric) TO anon, authenticated;
