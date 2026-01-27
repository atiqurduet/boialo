-- Add OTP settings to site_settings
INSERT INTO public.site_settings (setting_key, setting_value, category, setting_type, description)
VALUES 
  ('otp_enabled', 'true', 'security', 'boolean', 'Enable/disable OTP verification for orders'),
  ('otp_required_for_cod', 'true', 'security', 'boolean', 'Require OTP verification for Cash on Delivery orders'),
  ('otp_required_for_new_customers', 'true', 'security', 'boolean', 'Require OTP for new customers only')
ON CONFLICT (setting_key) DO NOTHING;

-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'customer',
  sender_id UUID,
  sender_name TEXT,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_chat_conversations_visitor ON public.chat_conversations(visitor_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Admins can manage all conversations"
ON public.chat_conversations
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'support'));

CREATE POLICY "Users can view own conversations"
ON public.chat_conversations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Anyone can create conversations"
ON public.chat_conversations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Visitors can update own conversations"
ON public.chat_conversations
FOR UPDATE
USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Admins can manage all messages"
ON public.chat_messages
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'support'));

CREATE POLICY "Anyone can view messages in their conversation"
ON public.chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add trigger for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();