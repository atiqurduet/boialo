
-- Fix all remaining admin RLS policies to include super_admin via is_admin()

-- Tables confirmed to exist:
DROP POLICY IF EXISTS "Admins can view all preferences" ON notification_preferences;
CREATE POLICY "Admins can view all preferences" ON notification_preferences FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;
CREATE POLICY "Admins can manage notification settings" ON notification_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage offer products" ON offer_products;
CREATE POLICY "Admins can manage offer products" ON offer_products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage usage" ON offer_usage;
CREATE POLICY "Admins can manage usage" ON offer_usage FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage offers" ON offers;
CREATE POLICY "Admins can manage offers" ON offers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view order reviews" ON order_reviews;
DROP POLICY IF EXISTS "Admins can manage order reviews" ON order_reviews;
CREATE POLICY "Admins can view order reviews" ON order_reviews FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage order reviews" ON order_reviews FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order history" ON order_status_history;
CREATE POLICY "Admins can manage order history" ON order_status_history FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all tasks" ON order_tasks;
DROP POLICY IF EXISTS "Support can view assigned tasks" ON order_tasks;
DROP POLICY IF EXISTS "Support can update assigned tasks" ON order_tasks;
CREATE POLICY "Admins can manage all tasks" ON order_tasks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all page sections" ON page_sections;
CREATE POLICY "Admins can manage all page sections" ON page_sections FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to page usage" ON page_usage;
CREATE POLICY "Admins have full access to page usage" ON page_usage FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all pages" ON pages;
CREATE POLICY "Admins can manage all pages" ON pages FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;
CREATE POLICY "Admins can manage payment methods" ON payment_methods FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
CREATE POLICY "Admins can manage permissions" ON permissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view verifications" ON phone_verifications;
CREATE POLICY "Admins can view verifications" ON phone_verifications FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all price alerts" ON price_drop_alerts;
CREATE POLICY "Admins can read all price alerts" ON price_drop_alerts FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage bundles" ON product_bundles;
CREATE POLICY "Admins can manage bundles" ON product_bundles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all questions" ON product_questions;
CREATE POLICY "Admins can manage all questions" ON product_questions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage attribute templates" ON product_type_attribute_templates;
CREATE POLICY "Admins can manage attribute templates" ON product_type_attribute_templates FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage product types" ON product_types;
CREATE POLICY "Admins can manage product types" ON product_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage variants" ON product_variants;
CREATE POLICY "Admins can manage variants" ON product_variants FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify products" ON products;
CREATE POLICY "Admins can modify products" ON products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify publishers" ON publishers;
CREATE POLICY "Admins can modify publishers" ON publishers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON push_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON push_subscriptions FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all rewards" ON referral_rewards;
CREATE POLICY "Admins can manage all rewards" ON referral_rewards FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
CREATE POLICY "Admins can manage role permissions" ON role_permissions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage roles config" ON roles_config;
CREATE POLICY "Admins can manage roles config" ON roles_config FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify settings" ON site_settings;
CREATE POLICY "Admins can modify settings" ON site_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage SMS providers" ON sms_providers;
CREATE POLICY "Admins can manage SMS providers" ON sms_providers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invitations" ON staff_invitations;
CREATE POLICY "Admins can manage invitations" ON staff_invitations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage auto assign rules" ON task_auto_assign_rules;
CREATE POLICY "Admins can manage auto assign rules" ON task_auto_assign_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage universal categories" ON universal_categories;
CREATE POLICY "Admins can manage universal categories" ON universal_categories FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage product attributes" ON universal_product_attributes;
CREATE POLICY "Admins can manage product attributes" ON universal_product_attributes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage universal variants" ON universal_product_variants;
CREATE POLICY "Admins can manage universal variants" ON universal_product_variants FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage universal products" ON universal_products;
CREATE POLICY "Admins can manage universal products" ON universal_products FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
CREATE POLICY "Admins can manage user roles" ON user_roles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view analytics" ON visitor_analytics;
CREATE POLICY "Admins can view analytics" ON visitor_analytics FOR SELECT TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify writers" ON writers;
CREATE POLICY "Admins can modify writers" ON writers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Tables from the read query that weren't in previous batches
DROP POLICY IF EXISTS "Admins can manage referral codes" ON referral_codes;
CREATE POLICY "Admins can manage referral codes" ON referral_codes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage referral settings" ON referral_settings;
CREATE POLICY "Admins can manage referral settings" ON referral_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage refund policies" ON refund_policies;
CREATE POLICY "Admins can manage refund policies" ON refund_policies FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage refund requests" ON refund_requests;
CREATE POLICY "Admins can manage refund requests" ON refund_requests FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
