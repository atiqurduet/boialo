-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'support');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'support',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'manager', 'support')
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create site_settings table for dynamic content management
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB,
    setting_type TEXT NOT NULL DEFAULT 'string',
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (for frontend)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins and managers can modify site settings
CREATE POLICY "Admins can modify site settings"
ON public.site_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create categories table for dynamic categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active categories
CREATE POLICY "Anyone can read categories"
ON public.categories
FOR SELECT
USING (true);

-- Only admins/managers can modify categories
CREATE POLICY "Admins can modify categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create products table for dynamic products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description_bn TEXT,
    description_en TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    discount_percent INTEGER DEFAULT 0,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author TEXT,
    publisher TEXT,
    isbn TEXT,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_preorder BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    release_date DATE,
    images JSONB DEFAULT '[]'::jsonb,
    meta_title TEXT,
    meta_description TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can read active products
CREATE POLICY "Anyone can read products"
ON public.products
FOR SELECT
USING (true);

-- Only admins/managers can modify products
CREATE POLICY "Admins can modify products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create banners table for homepage sliders
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_desktop TEXT NOT NULL,
    image_mobile TEXT,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Anyone can read active banners
CREATE POLICY "Anyone can read banners"
ON public.banners
FOR SELECT
USING (true);

-- Only admins/managers can modify banners
CREATE POLICY "Admins can modify banners"
ON public.banners
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create coupons table for marketing
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (for validation)
CREATE POLICY "Anyone can read coupons"
ON public.coupons
FOR SELECT
USING (true);

-- Only admins/managers can modify coupons
CREATE POLICY "Admins can modify coupons"
ON public.coupons
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create admin_audit_logs for tracking admin actions
CREATE TABLE public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_is_preorder ON public.products(is_preorder);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_banners_active ON public.banners(is_active);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON public.banners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, description) VALUES
('site_name', '"বইঘর"', 'string', 'general', 'Website name'),
('site_name_en', '"Boighor"', 'string', 'general', 'Website name in English'),
('site_logo', '"/placeholder.svg"', 'string', 'general', 'Site logo URL'),
('site_favicon', '"/favicon.ico"', 'string', 'general', 'Favicon URL'),
('contact_email', '"info@boighor.com"', 'string', 'contact', 'Contact email'),
('contact_phone', '"+880-1234-567890"', 'string', 'contact', 'Contact phone'),
('contact_address', '"Dhaka, Bangladesh"', 'string', 'contact', 'Office address'),
('social_facebook', '"https://facebook.com"', 'string', 'social', 'Facebook page URL'),
('social_youtube', '"https://youtube.com"', 'string', 'social', 'YouTube channel URL'),
('meta_title', '"বইঘর - আপনার বইয়ের ঠিকানা"', 'string', 'seo', 'Default meta title'),
('meta_description', '"বাংলাদেশের সেরা অনলাইন বুকশপ"', 'string', 'seo', 'Default meta description'),
('free_shipping_threshold', '500', 'number', 'shipping', 'Minimum order for free shipping'),
('default_delivery_charge', '60', 'number', 'shipping', 'Default delivery charge');