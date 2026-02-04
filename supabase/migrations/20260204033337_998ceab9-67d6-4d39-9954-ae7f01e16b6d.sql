-- Add private page and coupon/offer tracking columns to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS max_usage INTEGER,
ADD COLUMN IF NOT EXISTS usage_per_user INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS linked_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'landing';

-- Create page usage tracking table
CREATE TABLE IF NOT EXISTS public.page_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10,2),
  UNIQUE(page_id, user_id)
);

-- Enable RLS on page_usage
ALTER TABLE public.page_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own page usage"
ON public.page_usage FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own page usage"
ON public.page_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to page usage"
ON public.page_usage FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_page_usage_page_id ON public.page_usage(page_id);
CREATE INDEX IF NOT EXISTS idx_page_usage_user_id ON public.page_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_is_private ON public.pages(is_private);
CREATE INDEX IF NOT EXISTS idx_pages_page_type ON public.pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_access_code ON public.pages(access_code);

COMMENT ON TABLE public.page_usage IS 'Tracks user access to private/coupon pages';