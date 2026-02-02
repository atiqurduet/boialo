import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSectionRenderer } from '@/components/page/PageSectionRenderer';

interface PageData {
  id: string;
  title_bn: string;
  title_en: string | null;
  slug: string;
  description_bn: string | null;
  description_en: string | null;
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  status: string;
}

interface PageSection {
  id: string;
  section_type: string;
  title_bn: string | null;
  title_en: string | null;
  subtitle_bn: string | null;
  subtitle_en: string | null;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

const DynamicPage = () => {
  const { slug } = useParams();

  const { data: page, isLoading: pageLoading, error: pageError } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data as PageData;
    },
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['page-sections', page?.id],
    queryFn: async () => {
      if (!page?.id) return [];
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', page.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PageSection[];
    },
    enabled: !!page?.id,
  });

  // Set document title and meta
  if (page) {
    document.title = page.meta_title || page.title_bn;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && page.meta_description) {
      metaDesc.setAttribute('content', page.meta_description);
    }
  }

  if (pageLoading || sectionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <Skeleton className="h-12 w-1/2 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">পেজ খুঁজে পাওয়া যায়নি</h1>
          <p className="text-muted-foreground">
            আপনি যে পেজটি খুঁজছেন সেটি বিদ্যমান নেই বা সরানো হয়েছে।
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      
      <main>
        {/* Page Header if no hero section */}
        {!sections?.some(s => s.section_type === 'hero_banner') && (
          <div className="container py-8">
            <h1 className="text-3xl md:text-4xl font-bold">{page.title_bn}</h1>
            {page.description_bn && (
              <p className="text-muted-foreground mt-2">{page.description_bn}</p>
            )}
          </div>
        )}

        {/* Render all sections */}
        {sections?.map((section) => (
          <PageSectionRenderer key={section.id} section={section} />
        ))}
      </main>

      <Footer />
    </div>
  );
};

export default DynamicPage;
