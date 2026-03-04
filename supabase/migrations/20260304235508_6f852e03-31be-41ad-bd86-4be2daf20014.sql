
-- Fix ALL remaining admin RLS policies to use is_admin() which includes super_admin

-- abandoned_checkouts
DROP POLICY IF EXISTS "Admins can manage abandoned checkouts" ON abandoned_checkouts;
CREATE POLICY "Admins can manage abandoned checkouts" ON abandoned_checkouts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- admin_audit_logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can read audit logs" ON admin_audit_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- automation_ab_results
DROP POLICY IF EXISTS "Admins can manage AB results" ON automation_ab_results;
CREATE POLICY "Admins can manage AB results" ON automation_ab_results FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- automation_logs
DROP POLICY IF EXISTS "Admins can manage automation logs" ON automation_logs;
CREATE POLICY "Admins can manage automation logs" ON automation_logs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- automation_schedules
DROP POLICY IF EXISTS "Admins can manage automation schedules" ON automation_schedules;
CREATE POLICY "Admins can manage automation schedules" ON automation_schedules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- back_in_stock_alerts
DROP POLICY IF EXISTS "Admins can read all alerts" ON back_in_stock_alerts;
CREATE POLICY "Admins can read all alerts" ON back_in_stock_alerts FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- backup_history
DROP POLICY IF EXISTS "Admins can manage backup history" ON backup_history;
CREATE POLICY "Admins can manage backup history" ON backup_history FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- banners
DROP POLICY IF EXISTS "Admins can modify banners" ON banners;
CREATE POLICY "Admins can modify banners" ON banners FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- blog_posts
DROP POLICY IF EXISTS "Admins can manage blog posts" ON blog_posts;
CREATE POLICY "Admins can manage blog posts" ON blog_posts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- brands
DROP POLICY IF EXISTS "Admins can modify brands" ON brands;
CREATE POLICY "Admins can modify brands" ON brands FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- bundle_items
DROP POLICY IF EXISTS "Admins can manage bundle items" ON bundle_items;
CREATE POLICY "Admins can manage bundle items" ON bundle_items FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- categories
DROP POLICY IF EXISTS "Admins can modify categories" ON categories;
CREATE POLICY "Admins can modify categories" ON categories FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- chat_conversations
DROP POLICY IF EXISTS "Admins can manage all conversations" ON chat_conversations;
CREATE POLICY "Admins can manage all conversations" ON chat_conversations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- chat_messages
DROP POLICY IF EXISTS "Admins can manage all messages" ON chat_messages;
CREATE POLICY "Admins can manage all messages" ON chat_messages FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- coupons
DROP POLICY IF EXISTS "Admins can modify coupons" ON coupons;
CREATE POLICY "Admins can modify coupons" ON coupons FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- courier_bookings
DROP POLICY IF EXISTS "Admins can manage courier bookings" ON courier_bookings;
CREATE POLICY "Admins can manage courier bookings" ON courier_bookings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- courier_providers
DROP POLICY IF EXISTS "Admins can manage courier providers" ON courier_providers;
CREATE POLICY "Admins can manage courier providers" ON courier_providers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- delivery_zones
DROP POLICY IF EXISTS "Admins can manage delivery zones" ON delivery_zones;
CREATE POLICY "Admins can manage delivery zones" ON delivery_zones FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- digital_purchases
DROP POLICY IF EXISTS "Admins can manage digital purchases" ON digital_purchases;
CREATE POLICY "Admins can manage digital purchases" ON digital_purchases FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- footer_links
DROP POLICY IF EXISTS "Admins can manage footer links" ON footer_links;
CREATE POLICY "Admins can manage footer links" ON footer_links FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- footer_sections
DROP POLICY IF EXISTS "Admins can manage footer sections" ON footer_sections;
CREATE POLICY "Admins can manage footer sections" ON footer_sections FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- gift_card_transactions
DROP POLICY IF EXISTS "Admins can manage transactions" ON gift_card_transactions;
CREATE POLICY "Admins can manage transactions" ON gift_card_transactions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- gift_cards
DROP POLICY IF EXISTS "Admins can manage all gift cards" ON gift_cards;
CREATE POLICY "Admins can manage all gift cards" ON gift_cards FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- homepage_sections
DROP POLICY IF EXISTS "Admins can manage homepage sections" ON homepage_sections;
CREATE POLICY "Admins can manage homepage sections" ON homepage_sections FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- login_logs
DROP POLICY IF EXISTS "Admins can view login logs" ON login_logs;
CREATE POLICY "Admins can view login logs" ON login_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- loyalty_points
DROP POLICY IF EXISTS "Admins can manage all points" ON loyalty_points;
CREATE POLICY "Admins can manage all points" ON loyalty_points FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- loyalty_settings
DROP POLICY IF EXISTS "Admins can manage loyalty settings" ON loyalty_settings;
CREATE POLICY "Admins can manage loyalty settings" ON loyalty_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- marketing_automations
DROP POLICY IF EXISTS "Admins can manage automations" ON marketing_automations;
CREATE POLICY "Admins can manage automations" ON marketing_automations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- menu_items
DROP POLICY IF EXISTS "Admins can manage menu items" ON menu_items;
CREATE POLICY "Admins can manage menu items" ON menu_items FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- navigation_menus
DROP POLICY IF EXISTS "Admins can manage navigation menus" ON navigation_menus;
CREATE POLICY "Admins can manage navigation menus" ON navigation_menus FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
