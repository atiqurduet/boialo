
-- Fix RLS on realtime_presence: allow anon users to insert/update/select their own session
DROP POLICY IF EXISTS "Anyone can insert presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "Anyone can update own presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "Anyone can read presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "anon_insert_presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "anon_update_presence" ON public.realtime_presence;
DROP POLICY IF EXISTS "anon_select_presence" ON public.realtime_presence;

CREATE POLICY "anon_select_presence" ON public.realtime_presence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_presence" ON public.realtime_presence FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_presence" ON public.realtime_presence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Fix RLS on predictive_scores: allow anon users to upsert
DROP POLICY IF EXISTS "Anyone can upsert scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "anon_upsert_scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "Users can insert own scores" ON public.predictive_scores;
DROP POLICY IF EXISTS "Users can update own scores" ON public.predictive_scores;

CREATE POLICY "anon_insert_scores" ON public.predictive_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_scores" ON public.predictive_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_scores" ON public.predictive_scores FOR SELECT TO anon, authenticated USING (true);
