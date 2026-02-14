
-- ============================================================
-- FIX 1: Chat Conversations & Messages - Remove public access
-- ============================================================

-- Drop overly permissive chat_conversations policies
DROP POLICY IF EXISTS "Public can view conversations by visitor_id" ON chat_conversations;
DROP POLICY IF EXISTS "Public can update conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Public can create conversations" ON chat_conversations;

-- Drop overly permissive chat_messages policies  
DROP POLICY IF EXISTS "Public can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Public can create messages" ON chat_messages;

-- Create RPC: Get visitor's conversations
CREATE OR REPLACE FUNCTION public.get_visitor_conversations(p_visitor_id text)
RETURNS SETOF chat_conversations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM chat_conversations
  WHERE visitor_id = p_visitor_id
  ORDER BY created_at DESC;
$$;

-- Create RPC: Get messages for a visitor's conversation
CREATE OR REPLACE FUNCTION public.get_visitor_chat_messages(p_conversation_id uuid, p_visitor_id text)
RETURNS SETOF chat_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.* FROM chat_messages m
  INNER JOIN chat_conversations c ON m.conversation_id = c.id
  WHERE m.conversation_id = p_conversation_id
    AND c.visitor_id = p_visitor_id
  ORDER BY m.created_at ASC;
$$;

-- Create RPC: Insert chat message for visitor
CREATE OR REPLACE FUNCTION public.insert_visitor_chat_message(
  p_conversation_id uuid,
  p_visitor_id text,
  p_sender_type text,
  p_sender_name text,
  p_message text,
  p_attachment_url text DEFAULT NULL,
  p_attachment_type text DEFAULT NULL,
  p_attachment_name text DEFAULT NULL
)
RETURNS chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result chat_messages;
BEGIN
  -- Verify visitor owns the conversation
  IF NOT EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = p_conversation_id AND visitor_id = p_visitor_id
  ) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;

  INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message, attachment_url, attachment_type, attachment_name)
  VALUES (p_conversation_id, p_sender_type, p_sender_name, p_message, p_attachment_url, p_attachment_type, p_attachment_name)
  RETURNING * INTO v_result;

  -- Update last_message_at
  UPDATE chat_conversations SET last_message_at = now() WHERE id = p_conversation_id;

  RETURN v_result;
END;
$$;

-- Create RPC: Create conversation for visitor
CREATE OR REPLACE FUNCTION public.create_visitor_conversation(
  p_visitor_id text,
  p_visitor_name text,
  p_visitor_phone text,
  p_user_id uuid DEFAULT NULL
)
RETURNS chat_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result chat_conversations;
BEGIN
  INSERT INTO chat_conversations (visitor_id, visitor_name, visitor_phone, user_id, status)
  VALUES (p_visitor_id, p_visitor_name, p_visitor_phone, p_user_id, 'open')
  RETURNING * INTO v_result;

  -- Insert welcome message
  INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message)
  VALUES (v_result.id, 'system', 'System', 'Conversation started');

  RETURN v_result;
END;
$$;

-- Create RPC: Update conversation last_message_at for visitor
CREATE OR REPLACE FUNCTION public.update_visitor_conversation_timestamp(p_conversation_id uuid, p_visitor_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_conversations SET last_message_at = now()
  WHERE id = p_conversation_id AND visitor_id = p_visitor_id;
END;
$$;

-- ============================================================
-- FIX 2: Orders - Remove public-read-all, create safe RPC
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view order by order_number for tracking" ON orders;
DROP POLICY IF EXISTS "Anyone can view order items for tracking" ON order_items;

-- Create RPC: Public order tracking (returns limited info, no PII)
CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_number text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_history json;
BEGIN
  SELECT id, order_number, status, courier_provider, tracking_number, courier_status,
         created_at, shipped_at, delivered_at, delivery_area
  INTO v_order
  FROM orders
  WHERE order_number = p_order_number;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Order not found');
  END IF;

  -- Get status history
  SELECT json_agg(row_to_json(h) ORDER BY h.created_at ASC)
  INTO v_history
  FROM (
    SELECT status, notes, created_at
    FROM order_status_history
    WHERE order_id = v_order.id
  ) h;

  RETURN json_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'courier_provider', v_order.courier_provider,
    'tracking_number', v_order.tracking_number,
    'courier_status', v_order.courier_status,
    'created_at', v_order.created_at,
    'shipped_at', v_order.shipped_at,
    'delivered_at', v_order.delivered_at,
    'delivery_area', v_order.delivery_area,
    'history', COALESCE(v_history, '[]'::json)
  );
END;
$$;
