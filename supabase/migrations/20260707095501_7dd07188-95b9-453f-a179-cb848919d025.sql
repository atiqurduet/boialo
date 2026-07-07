
-- 1) Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.auto_create_order_tasks() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_product() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_price_drop() FROM anon, authenticated, PUBLIC;

-- 2) chat-attachments: drop broad public listing SELECT policy
DROP POLICY IF EXISTS "Public can view chat attachments" ON storage.objects;
CREATE POLICY "Admins can view chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments' AND public.is_admin(auth.uid()));

-- 3) push_subscriptions: enforce ownership
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON public.push_subscriptions;
DELETE FROM public.push_subscriptions WHERE user_id IS NULL;
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id SET NOT NULL;

CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4) Replace WITH CHECK (true) INSERT policies with ownership-scoped checks
DROP POLICY IF EXISTS "Anon insert ab assignments" ON public.ab_test_assignments;
CREATE POLICY "Insert ab assignments" ON public.ab_test_assignments FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert ad events" ON public.ad_platform_events;
CREATE POLICY "Insert ad events" ON public.ad_platform_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Allow anon insert engagement" ON public.engagement_scores;
CREATE POLICY "Insert engagement scores" ON public.engagement_scores FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anon insert funnel events" ON public.funnel_events;
CREATE POLICY "Insert funnel events" ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert login logs" ON public.login_logs;
CREATE POLICY "Insert own login logs" ON public.login_logs FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anon upsert page analytics" ON public.page_analytics;
CREATE POLICY "Insert page analytics" ON public.page_analytics FOR INSERT TO anon, authenticated
  WITH CHECK (page_path IS NOT NULL AND char_length(page_path) BETWEEN 1 AND 2048);

DROP POLICY IF EXISTS "Anon insert retention" ON public.retention_cohorts;
CREATE POLICY "Insert retention" ON public.retention_cohorts FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
CREATE POLICY "Insert search analytics" ON public.search_analytics FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.server_side_events;
CREATE POLICY "Insert server side events" ON public.server_side_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anon insert recordings" ON public.session_recordings;
CREATE POLICY "Insert session recordings" ON public.session_recordings FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Allow anon insert attributions" ON public.user_attributions;
CREATE POLICY "Insert user attributions" ON public.user_attributions FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Allow anonymous inserts on user_journeys" ON public.user_journeys;
CREATE POLICY "Insert user journeys" ON public.user_journeys FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert visitor analytics" ON public.visitor_analytics;
CREATE POLICY "Insert visitor analytics" ON public.visitor_analytics FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;
CREATE POLICY "Service can insert notifications" ON public.user_notifications FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact message" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(coalesce(message, '')) BETWEEN 1 AND 5000);
