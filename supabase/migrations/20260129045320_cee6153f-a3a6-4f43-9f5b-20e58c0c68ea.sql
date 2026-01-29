-- Create permissions table for system modules
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions
CREATE POLICY "Anyone can read permissions"
  ON public.permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for role_permissions
CREATE POLICY "Anyone can read role_permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default permissions for all modules
INSERT INTO public.permissions (module, action, name_bn, name_en, description, sort_order) VALUES
-- Dashboard
('dashboard', 'view', 'ড্যাশবোর্ড দেখা', 'View Dashboard', 'Access to admin dashboard', 1),

-- Orders
('orders', 'view', 'অর্ডার দেখা', 'View Orders', 'View order list and details', 10),
('orders', 'create', 'অর্ডার তৈরি', 'Create Orders', 'Create new orders', 11),
('orders', 'update', 'অর্ডার আপডেট', 'Update Orders', 'Update order status and details', 12),
('orders', 'delete', 'অর্ডার মুছা', 'Delete Orders', 'Delete orders', 13),

-- Products (Books)
('products', 'view', 'প্রোডাক্ট দেখা', 'View Products', 'View product list', 20),
('products', 'create', 'প্রোডাক্ট তৈরি', 'Create Products', 'Add new products', 21),
('products', 'update', 'প্রোডাক্ট আপডেট', 'Update Products', 'Edit products', 22),
('products', 'delete', 'প্রোডাক্ট মুছা', 'Delete Products', 'Delete products', 23),

-- Universal Products
('universal_products', 'view', 'ইউনিভার্সাল প্রোডাক্ট দেখা', 'View Universal Products', 'View universal products', 30),
('universal_products', 'create', 'ইউনিভার্সাল প্রোডাক্ট তৈরি', 'Create Universal Products', 'Add universal products', 31),
('universal_products', 'update', 'ইউনিভার্সাল প্রোডাক্ট আপডেট', 'Update Universal Products', 'Edit universal products', 32),
('universal_products', 'delete', 'ইউনিভার্সাল প্রোডাক্ট মুছা', 'Delete Universal Products', 'Delete universal products', 33),

-- Categories
('categories', 'view', 'ক্যাটাগরি দেখা', 'View Categories', 'View category list', 40),
('categories', 'create', 'ক্যাটাগরি তৈরি', 'Create Categories', 'Add new categories', 41),
('categories', 'update', 'ক্যাটাগরি আপডেট', 'Update Categories', 'Edit categories', 42),
('categories', 'delete', 'ক্যাটাগরি মুছা', 'Delete Categories', 'Delete categories', 43),

-- Writers
('writers', 'view', 'লেখক দেখা', 'View Writers', 'View writer list', 50),
('writers', 'create', 'লেখক তৈরি', 'Create Writers', 'Add new writers', 51),
('writers', 'update', 'লেখক আপডেট', 'Update Writers', 'Edit writers', 52),
('writers', 'delete', 'লেখক মুছা', 'Delete Writers', 'Delete writers', 53),

-- Publishers
('publishers', 'view', 'প্রকাশনী দেখা', 'View Publishers', 'View publisher list', 60),
('publishers', 'create', 'প্রকাশনী তৈরি', 'Create Publishers', 'Add new publishers', 61),
('publishers', 'update', 'প্রকাশনী আপডেট', 'Update Publishers', 'Edit publishers', 62),
('publishers', 'delete', 'প্রকাশনী মুছা', 'Delete Publishers', 'Delete publishers', 63),

-- Customers
('customers', 'view', 'কাস্টমার দেখা', 'View Customers', 'View customer list', 70),
('customers', 'update', 'কাস্টমার আপডেট', 'Update Customers', 'Edit customer info', 71),
('customers', 'delete', 'কাস্টমার মুছা', 'Delete Customers', 'Delete customers', 72),

-- Staff
('staff', 'view', 'স্টাফ দেখা', 'View Staff', 'View staff list', 80),
('staff', 'create', 'স্টাফ তৈরি', 'Create Staff', 'Invite new staff', 81),
('staff', 'update', 'স্টাফ আপডেট', 'Update Staff', 'Edit staff roles', 82),
('staff', 'delete', 'স্টাফ মুছা', 'Delete Staff', 'Remove staff', 83),

-- Roles & Permissions
('roles', 'view', 'রোল দেখা', 'View Roles', 'View role permissions', 90),
('roles', 'manage', 'রোল ম্যানেজ', 'Manage Roles', 'Assign permissions to roles', 91),

-- Coupons
('coupons', 'view', 'কুপন দেখা', 'View Coupons', 'View coupon list', 100),
('coupons', 'create', 'কুপন তৈরি', 'Create Coupons', 'Create new coupons', 101),
('coupons', 'update', 'কুপন আপডেট', 'Update Coupons', 'Edit coupons', 102),
('coupons', 'delete', 'কুপন মুছা', 'Delete Coupons', 'Delete coupons', 103),

-- Offers
('offers', 'view', 'অফার দেখা', 'View Offers', 'View offers', 110),
('offers', 'create', 'অফার তৈরি', 'Create Offers', 'Create new offers', 111),
('offers', 'update', 'অফার আপডেট', 'Update Offers', 'Edit offers', 112),
('offers', 'delete', 'অফার মুছা', 'Delete Offers', 'Delete offers', 113),

-- Banners
('banners', 'view', 'ব্যানার দেখা', 'View Banners', 'View banners', 120),
('banners', 'create', 'ব্যানার তৈরি', 'Create Banners', 'Add banners', 121),
('banners', 'update', 'ব্যানার আপডেট', 'Update Banners', 'Edit banners', 122),
('banners', 'delete', 'ব্যানার মুছা', 'Delete Banners', 'Delete banners', 123),

-- Homepage
('homepage', 'view', 'হোমপেজ দেখা', 'View Homepage', 'View homepage settings', 130),
('homepage', 'update', 'হোমপেজ আপডেট', 'Update Homepage', 'Edit homepage sections', 131),

-- Menu
('menu', 'view', 'মেনু দেখা', 'View Menu', 'View navigation menu', 140),
('menu', 'update', 'মেনু আপডেট', 'Update Menu', 'Edit navigation menu', 141),

-- Footer
('footer', 'view', 'ফুটার দেখা', 'View Footer', 'View footer settings', 150),
('footer', 'update', 'ফুটার আপডেট', 'Update Footer', 'Edit footer', 151),

-- Branding
('branding', 'view', 'ব্র্যান্ডিং দেখা', 'View Branding', 'View branding settings', 160),
('branding', 'update', 'ব্র্যান্ডিং আপডেট', 'Update Branding', 'Edit branding', 161),

-- Settings
('settings', 'view', 'সেটিংস দেখা', 'View Settings', 'View system settings', 170),
('settings', 'update', 'সেটিংস আপডেট', 'Update Settings', 'Edit system settings', 171),

-- Reports
('reports', 'view', 'রিপোর্ট দেখা', 'View Reports', 'Access reports', 180),

-- Chat
('chat', 'view', 'চ্যাট দেখা', 'View Chat', 'View customer chats', 190),
('chat', 'reply', 'চ্যাট রিপ্লাই', 'Reply Chat', 'Reply to customer chats', 191),

-- Couriers
('couriers', 'view', 'কুরিয়ার দেখা', 'View Couriers', 'View courier settings', 200),
('couriers', 'update', 'কুরিয়ার আপডেট', 'Update Couriers', 'Edit courier settings', 201),

-- Payments
('payments', 'view', 'পেমেন্ট দেখা', 'View Payments', 'View payment settings', 210),
('payments', 'update', 'পেমেন্ট আপডেট', 'Update Payments', 'Edit payment methods', 211),

-- Refunds
('refunds', 'view', 'রিফান্ড দেখা', 'View Refunds', 'View refund requests', 220),
('refunds', 'process', 'রিফান্ড প্রসেস', 'Process Refunds', 'Approve/reject refunds', 221),

-- Email Marketing
('email_marketing', 'view', 'ইমেইল মার্কেটিং দেখা', 'View Email Marketing', 'View email campaigns', 230),
('email_marketing', 'manage', 'ইমেইল মার্কেটিং ম্যানেজ', 'Manage Email Marketing', 'Create/send email campaigns', 231),

-- Tasks
('tasks', 'view', 'টাস্ক দেখা', 'View Tasks', 'View all tasks', 240),
('tasks', 'create', 'টাস্ক তৈরি', 'Create Tasks', 'Create new tasks', 241),
('tasks', 'update', 'টাস্ক আপডেট', 'Update Tasks', 'Update task status', 242),
('tasks', 'assign', 'টাস্ক অ্যাসাইন', 'Assign Tasks', 'Assign tasks to staff', 243);

-- Create function to check user permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
  )
  OR EXISTS (
    -- Admins have all permissions by default
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Give admin role all permissions by default
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;