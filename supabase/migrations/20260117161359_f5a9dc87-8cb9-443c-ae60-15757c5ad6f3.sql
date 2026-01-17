-- Create offers table for comprehensive offer management
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_bn TEXT,
  description_en TEXT,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
  discount_value NUMERIC DEFAULT 0,
  buy_quantity INTEGER DEFAULT 0,
  get_quantity INTEGER DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,
  usage_limit INTEGER,
  usage_per_customer INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all_products', 'specific_products', 'specific_categories')),
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  new_customers_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  banner_image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read active offers" 
ON public.offers 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage offers" 
ON public.offers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create offer_products junction table for specific product offers
CREATE TABLE public.offer_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('book', 'universal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(offer_id, product_id, product_type)
);

-- Enable RLS
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read offer products" 
ON public.offer_products 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage offer products" 
ON public.offer_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create offer_usage table to track usage per customer
CREATE TABLE public.offer_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discount_amount NUMERIC NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.offer_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own usage" 
ON public.offer_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create usage" 
ON public.offer_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage usage" 
ON public.offer_usage 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));