
-- Fix: Drop overly permissive public SELECT policies on order tracking tables
-- Public tracking is handled via get_order_tracking() RPC
DROP POLICY IF EXISTS "Anyone can view order history for tracking" ON public.order_status_history;
DROP POLICY IF EXISTS "Anyone can view courier bookings for tracking" ON public.courier_bookings;
