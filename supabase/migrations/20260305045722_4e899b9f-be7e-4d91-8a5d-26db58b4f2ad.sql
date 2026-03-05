
-- Recreate the trigger for auto-creating order tasks on new orders
CREATE OR REPLACE TRIGGER trg_auto_create_order_tasks
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_order_tasks();
