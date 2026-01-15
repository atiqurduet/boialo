-- Allow public read access to orders by order_number for tracking
CREATE POLICY "Anyone can view order by order_number for tracking"
ON public.orders
FOR SELECT
USING (true);

-- Allow public read access to order_items for tracking
CREATE POLICY "Anyone can view order items for tracking"
ON public.order_items
FOR SELECT
USING (true);