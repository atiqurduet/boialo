-- Drop existing policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can modify universal products" ON public.universal_products;

-- Create proper INSERT policy for admins
CREATE POLICY "Admins can insert universal products" 
ON public.universal_products 
FOR INSERT 
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create proper UPDATE policy for admins
CREATE POLICY "Admins can update universal products" 
ON public.universal_products 
FOR UPDATE 
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create proper DELETE policy for admins
CREATE POLICY "Admins can delete universal products" 
ON public.universal_products 
FOR DELETE 
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));