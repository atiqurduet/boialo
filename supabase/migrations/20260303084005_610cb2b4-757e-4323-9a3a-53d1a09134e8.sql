
-- Create popup_banners table
CREATE TABLE public.popup_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  button_text TEXT,
  button_link TEXT,
  badge_text TEXT,
  image_url TEXT,
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  overlay_color TEXT DEFAULT 'rgba(0,0,0,0.5)',
  
  -- Layout & Design
  popup_type TEXT NOT NULL DEFAULT 'modal' CHECK (popup_type IN ('modal', 'fullscreen', 'bottom_bar', 'slide_in', 'top_bar')),
  position TEXT DEFAULT 'center' CHECK (position IN ('center', 'top', 'bottom', 'left', 'right', 'top_left', 'top_right', 'bottom_left', 'bottom_right')),
  width INTEGER DEFAULT 500,
  height INTEGER,
  border_radius INTEGER DEFAULT 16,
  padding INTEGER DEFAULT 32,
  text_align TEXT DEFAULT 'center' CHECK (text_align IN ('left', 'center', 'right')),
  title_size TEXT DEFAULT 'lg' CHECK (title_size IN ('sm', 'md', 'lg', 'xl', '2xl')),
  
  -- Animation
  animation TEXT DEFAULT 'fade' CHECK (animation IN ('fade', 'slide_up', 'slide_down', 'slide_left', 'slide_right', 'zoom', 'bounce')),
  
  -- Display Rules
  trigger_type TEXT DEFAULT 'on_load' CHECK (trigger_type IN ('on_load', 'on_scroll', 'on_exit', 'after_delay', 'on_click')),
  trigger_delay INTEGER DEFAULT 0,
  trigger_scroll_percent INTEGER DEFAULT 50,
  show_frequency TEXT DEFAULT 'every_visit' CHECK (show_frequency IN ('once', 'once_per_session', 'every_visit', 'once_per_day', 'once_per_week')),
  show_close_button BOOLEAN DEFAULT true,
  close_on_overlay_click BOOLEAN DEFAULT true,
  auto_close_seconds INTEGER,
  
  -- Targeting
  show_on_pages TEXT[] DEFAULT '{}',
  exclude_pages TEXT[] DEFAULT '{}',
  show_to_logged_in BOOLEAN DEFAULT true,
  show_to_guests BOOLEAN DEFAULT true,
  device_target TEXT DEFAULT 'all' CHECK (device_target IN ('all', 'desktop', 'mobile', 'tablet')),
  
  -- Schedule
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popup_banners ENABLE ROW LEVEL SECURITY;

-- Public read for active popups
CREATE POLICY "Anyone can view active popup banners"
ON public.popup_banners FOR SELECT
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage popup banners"
ON public.popup_banners FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_popup_banners_updated_at
BEFORE UPDATE ON public.popup_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
