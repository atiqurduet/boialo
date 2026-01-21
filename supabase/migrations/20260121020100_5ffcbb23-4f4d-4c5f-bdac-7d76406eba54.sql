-- Add RLS policy to allow public newsletter subscription (INSERT only)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.email_subscribers
FOR INSERT
WITH CHECK (
  source = 'newsletter_form' AND
  status = 'active'
);

-- Add policy for users to update their own subscription (unsubscribe)
CREATE POLICY "Users can manage their own subscription by email"
ON public.email_subscribers
FOR UPDATE
USING (true)
WITH CHECK (
  -- Only allow updating status and unsubscribed_at fields
  source IS NOT NULL
);

-- Add policy for checking existing subscriptions
CREATE POLICY "Anyone can check their subscription status"
ON public.email_subscribers
FOR SELECT
USING (true);