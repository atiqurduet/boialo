
-- Trigger function to create notification when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_link TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_link := '/order-tracking/' || NEW.order_number;

  CASE NEW.status
    WHEN 'confirmed' THEN
      v_title := 'অর্ডার কনফার্ম হয়েছে';
      v_message := '#' || NEW.order_number || ' অর্ডার কনফার্ম করা হয়েছে।';
    WHEN 'processing' THEN
      v_title := 'অর্ডার প্রসেসিং চলছে';
      v_message := '#' || NEW.order_number || ' অর্ডার প্রসেস হচ্ছে।';
    WHEN 'shipped' THEN
      v_title := 'অর্ডার শিপ হয়েছে';
      v_message := '#' || NEW.order_number || ' শিপ করা হয়েছে। ট্র্যাকিং: ' || COALESCE(NEW.tracking_number, 'শীঘ্রই পাবেন');
    WHEN 'delivered' THEN
      v_title := 'অর্ডার ডেলিভারি সম্পন্ন';
      v_message := '#' || NEW.order_number || ' সফলভাবে ডেলিভারি হয়েছে।';
    WHEN 'cancelled' THEN
      v_title := 'অর্ডার বাতিল হয়েছে';
      v_message := '#' || NEW.order_number || ' অর্ডার বাতিল করা হয়েছে।';
    WHEN 'returned' THEN
      v_title := 'অর্ডার রিটার্ন হয়েছে';
      v_message := '#' || NEW.order_number || ' রিটার্ন সম্পন্ন।';
    ELSE
      v_title := 'অর্ডার আপডেট';
      v_message := '#' || NEW.order_number || ' স্ট্যাটাস: ' || NEW.status;
  END CASE;

  INSERT INTO public.user_notifications (user_id, title, message, type, link, metadata)
  VALUES (
    NEW.user_id,
    v_title,
    v_message,
    'order',
    v_link,
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Trigger for price drop notifications
CREATE OR REPLACE FUNCTION public.notify_price_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert RECORD;
  v_product_name TEXT;
BEGIN
  -- Only fire when price decreases
  IF NEW.price >= OLD.price THEN
    RETURN NEW;
  END IF;

  v_product_name := COALESCE(NEW.title_bn, NEW.title_en, 'প্রোডাক্ট');

  FOR v_alert IN
    SELECT user_id FROM public.price_drop_alerts
    WHERE product_id = NEW.id
  LOOP
    INSERT INTO public.user_notifications (user_id, title, message, type, link, metadata)
    VALUES (
      v_alert.user_id,
      'দাম কমেছে! 🎉',
      v_product_name || ' এর দাম ৳' || OLD.price || ' থেকে ৳' || NEW.price || ' হয়েছে!',
      'price_drop',
      '/product/' || NEW.slug,
      jsonb_build_object('product_id', NEW.id, 'old_price', OLD.price, 'new_price', NEW.price)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_price_drop ON public.products;
CREATE TRIGGER trg_notify_price_drop
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_price_drop();
