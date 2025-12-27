import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MenuItem {
  id: string;
  title_bn: string;
  title_en: string | null;
  url: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  parent_id: string | null;
}

interface NavigationData {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useNavigationMenu = (location: string = 'header'): NavigationData => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      // First get the navigation menu for the location
      const { data: menu, error: menuError } = await supabase
        .from('navigation_menus')
        .select('id')
        .eq('location', location)
        .limit(1)
        .single();

      if (menuError) throw menuError;
      if (!menu) {
        setMenuItems([]);
        return;
      }

      // Then get the menu items
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', menu.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      setMenuItems(items || []);
    } catch (err: any) {
      console.error('Error fetching menu items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [location]);

  return { menuItems, loading, error, refetch: fetchMenuItems };
};
