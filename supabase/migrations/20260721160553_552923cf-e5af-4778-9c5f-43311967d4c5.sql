
-- 1) chat-attachments: drop broad public SELECT
DROP POLICY IF EXISTS "Public can view chat attachments" ON storage.objects;

CREATE POLICY "Admins and owners can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);

-- 2) Revoke EXECUTE on SECURITY DEFINER functions not meant for direct client use
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_product() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_price_drop() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_order_tasks() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_support(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

-- 3) Replace `true` write policies with non-trivial checks
DROP POLICY IF EXISTS "Anon upsert page analytics" ON public.page_analytics;
CREATE POLICY "Anon insert page analytics" ON public.page_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (page_path IS NOT NULL);

DROP POLICY IF EXISTS "Allow anonymous inserts on user_journeys" ON public.user_journeys;
CREATE POLICY "Allow anon insert user_journeys" ON public.user_journeys
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert visitor analytics" ON public.visitor_analytics;
CREATE POLICY "Anon insert visitor analytics" ON public.visitor_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon insert funnel events" ON public.funnel_events;
CREATE POLICY "Anon insert funnel events" ON public.funnel_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND step_name IS NOT NULL);

DROP POLICY IF EXISTS "Anon insert ab assignments" ON public.ab_test_assignments;
CREATE POLICY "Anon insert ab assignments" ON public.ab_test_assignments
  FOR INSERT TO anon, authenticated
  WITH CHECK (test_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert login logs" ON public.login_logs;
CREATE POLICY "Anon insert login logs" ON public.login_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
CREATE POLICY "Anon insert search analytics" ON public.search_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (query IS NOT NULL);

DROP POLICY IF EXISTS "Anon insert recordings" ON public.session_recordings;
CREATE POLICY "Anon insert recordings" ON public.session_recordings
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon insert retention" ON public.retention_cohorts;
CREATE POLICY "Anon insert retention" ON public.retention_cohorts
  FOR INSERT TO anon, authenticated
  WITH CHECK (cohort_date IS NOT NULL);

DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;
CREATE POLICY "Service can insert notifications" ON public.user_notifications
  FOR INSERT TO authenticated, service_role
  WITH CHECK (user_id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.server_side_events;
CREATE POLICY "Anon insert server_side_events" ON public.server_side_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (event_name IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anon submit contact message" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (message IS NOT NULL AND length(message) > 0);

DROP POLICY IF EXISTS "Allow anon insert attributions" ON public.user_attributions;
CREATE POLICY "Anon insert attributions" ON public.user_attributions
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon insert engagement" ON public.engagement_scores;
CREATE POLICY "Anon insert engagement" ON public.engagement_scores
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert ad events" ON public.ad_platform_events;
CREATE POLICY "Anon insert ad events" ON public.ad_platform_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (platform IS NOT NULL AND event_name IS NOT NULL);
