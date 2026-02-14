
-- Fix 1: Remove permissive gift card public read policy and create secure RPC
DROP POLICY IF EXISTS "Anyone can read gift card by code" ON public.gift_cards;

CREATE OR REPLACE FUNCTION public.validate_gift_card(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card record;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN json_build_object('valid', false);
  END IF;
  
  SELECT id, balance, is_active, expires_at
  INTO v_card
  FROM gift_cards
  WHERE code = trim(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF FOUND THEN
    RETURN json_build_object(
      'valid', true,
      'balance', v_card.balance
    );
  ELSE
    RETURN json_build_object('valid', false);
  END IF;
END;
$$;

-- Fix 2: Remove permissive phone verification policies
DROP POLICY IF EXISTS "Users can view own verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anyone can create verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anyone can update verification" ON public.phone_verifications;

-- Add admin-only access for auditing
CREATE POLICY "Admins can view verifications" ON public.phone_verifications
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
