import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FooterLink {
  id: string;
  title_bn: string;
  title_en: string | null;
  url: string;
  sort_order: number;
}

interface FooterSection {
  id: string;
  title_bn: string;
  title_en: string | null;
  section_type: string;
  sort_order: number;
  is_active: boolean;
  content: any;
  links?: FooterLink[];
}

interface FooterData {
  sections: FooterSection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFooterData = (): FooterData => {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFooterData = async () => {
    try {
      setLoading(true);
      // Fetch footer sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('footer_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch all footer links
      const { data: linksData, error: linksError } = await supabase
        .from('footer_links')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (linksError) throw linksError;

      // Group links by section
      const sectionsWithLinks = (sectionsData || []).map(section => ({
        ...section,
        links: (linksData || []).filter(link => link.section_id === section.id)
      }));

      setSections(sectionsWithLinks);
    } catch (err: any) {
      console.error('Error fetching footer data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooterData();
  }, []);

  return { sections, loading, error, refetch: fetchFooterData };
};
