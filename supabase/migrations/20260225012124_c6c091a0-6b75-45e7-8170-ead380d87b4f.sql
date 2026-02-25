-- Allow admins to read all cart items for customer monitoring
CREATE POLICY "Admins can read all cart items"
  ON public.cart_items
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'support'::app_role)
  );

-- Allow admins to read all wishlist items for customer monitoring
CREATE POLICY "Admins can read all wishlist items"
  ON public.wishlist_items
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'support'::app_role)
  );
