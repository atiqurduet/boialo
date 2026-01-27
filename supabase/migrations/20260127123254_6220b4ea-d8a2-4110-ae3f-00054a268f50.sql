-- Drop existing restrictive policies for chat tables
DROP POLICY IF EXISTS "Anyone can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can create messages" ON chat_messages;
DROP POLICY IF EXISTS "Visitors can update own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can view messages in their conversation" ON chat_messages;
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;

-- Create PERMISSIVE policies for anonymous chat access
CREATE POLICY "Public can create conversations"
ON chat_conversations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view conversations by visitor_id"
ON chat_conversations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can update conversations"
ON chat_conversations FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Public can create messages"
ON chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view all messages"
ON chat_messages FOR SELECT
TO anon, authenticated
USING (true);