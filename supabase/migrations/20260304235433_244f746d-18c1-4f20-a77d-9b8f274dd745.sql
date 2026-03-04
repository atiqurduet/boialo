
-- Fix: Update all admin RLS policies to use is_admin() which includes super_admin

-- profiles: Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- orders: Admins can manage orders
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
CREATE POLICY "Admins can manage orders" ON orders FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- cart_items: Admins can read all cart items
DROP POLICY IF EXISTS "Admins can read all cart items" ON cart_items;
CREATE POLICY "Admins can read all cart items" ON cart_items FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- wishlist_items: Admins can read all wishlist items
DROP POLICY IF EXISTS "Admins can read all wishlist items" ON wishlist_items;
CREATE POLICY "Admins can read all wishlist items" ON wishlist_items FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- customer_risk_profiles: Admins can view/manage
DROP POLICY IF EXISTS "Admins can view risk profiles" ON customer_risk_profiles;
DROP POLICY IF EXISTS "Admins can manage risk profiles" ON customer_risk_profiles;
CREATE POLICY "Admins can view risk profiles" ON customer_risk_profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage risk profiles" ON customer_risk_profiles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- address_book: Admins can view all addresses
DROP POLICY IF EXISTS "Admins can view all addresses" ON address_book;
CREATE POLICY "Admins can view all addresses" ON address_book FOR SELECT TO authenticated USING (is_admin(auth.uid()));
