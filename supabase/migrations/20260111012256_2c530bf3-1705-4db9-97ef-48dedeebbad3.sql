-- Fix universal_categories RLS policies for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can modify universal categories" ON public.universal_categories;

-- Create proper INSERT policy for admins
CREATE POLICY "Admins can insert universal categories" 
ON public.universal_categories 
FOR INSERT 
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create proper UPDATE policy for admins
CREATE POLICY "Admins can update universal categories" 
ON public.universal_categories 
FOR UPDATE 
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create proper DELETE policy for admins
CREATE POLICY "Admins can delete universal categories" 
ON public.universal_categories 
FOR DELETE 
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));