
-- Fix 1: Phone verifications - replace overly permissive policies with service-role-only access
DROP POLICY IF EXISTS "Users can view own verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anyone can create verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anyone can update verification" ON public.phone_verifications;

-- Only service role (edge functions) should access phone_verifications
CREATE POLICY "Service role full access to verifications"
  ON public.phone_verifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Fix 2: Chat attachments - restrict uploads to authenticated users with file type validation
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    auth.uid() IS NOT NULL
  );
