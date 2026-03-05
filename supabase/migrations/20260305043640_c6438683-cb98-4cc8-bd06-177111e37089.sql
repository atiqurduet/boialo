
-- Staff messages / emergency notes table
CREATE TABLE public.staff_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- Sender (admin/super_admin) can see messages they sent
CREATE POLICY "Admins can insert staff messages"
ON public.staff_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
);

-- Recipients can read their own messages
CREATE POLICY "Users can read own messages"
ON public.staff_messages FOR SELECT TO authenticated
USING (recipient_id = auth.uid() OR sender_id = auth.uid() OR public.is_admin(auth.uid()));

-- Recipients can update (mark as read)
CREATE POLICY "Recipients can update own messages"
ON public.staff_messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Admins can delete
CREATE POLICY "Admins can delete messages"
ON public.staff_messages FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
