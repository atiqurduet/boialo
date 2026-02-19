import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductTypeInfo {
  id: string;
  type_key: string;
  name_bn: string;
  name_en: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export const useProductTypes = () => {
  const [productTypes, setProductTypes] = useState<ProductTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('product_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setProductTypes(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getLabel = (typeKey: string) => {
    return productTypes.find(t => t.type_key === typeKey)?.name_bn || typeKey;
  };

  return { productTypes, loading, getLabel };
};
