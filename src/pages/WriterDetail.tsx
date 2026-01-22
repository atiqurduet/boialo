import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { ChevronRight, BookOpen, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Writer {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  bio_bn: string | null;
  bio_en: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

const WriterDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [writer, setWriter] = useState<Writer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWriterAndProducts = async () => {
      if (!slug) return;
      
      setLoading(true);
      try {
        // Fetch writer by slug
        const { data: writerData, error: writerError } = await supabase
          .from('writers')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (writerError) throw writerError;
        setWriter(writerData);

        // Fetch products by this writer
        const { data: productsData } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name_bn, slug),
            writer:writers(id, name_bn, slug),
            publisher_rel:publishers(id, name_bn, slug)
          `)
          .eq('writer_id', writerData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const convertedProducts: Product[] = (productsData || []).map((p: any) => {
          const images = p.images as string[] || [];
          return {
            id: p.id,
            slug: p.slug,
            title: p.title_bn || p.title_en,
            author: p.writer?.name_bn || p.author || 'অজানা লেখক',
            price: p.price,
            originalPrice: p.original_price,
            discount: p.discount_percent,
            image: images.length > 0 ? images[0] : '/placeholder.svg',
            category: p.category?.slug || p.category_id,
            publisher: p.publisher_rel?.name_bn || p.publisher,
            isPreorder: p.is_preorder,
            releaseDate: p.release_date,
          };
        });

        setProducts(convertedProducts);
      } catch (error) {
        console.error('Error fetching writer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWriterAndProducts();
  }, [slug]);

  // Update meta tags
  useEffect(() => {
    if (writer) {
      document.title = writer.meta_title || `${writer.name_bn} - বই সমূহ`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', writer.meta_description || writer.bio_bn || `${writer.name_bn} এর সকল বই`);
      }
    }
  }, [writer]);

  const getWriterImage = (writer: Writer) => {
    if (writer.image_url) return writer.image_url;
    const name = writer.name_bn.split(' ')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=fff&size=200`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <Skeleton className="w-40 h-40 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!writer) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">লেখক পাওয়া যায়নি</h2>
            <p className="text-muted-foreground mb-4">এই লেখকের তথ্য বর্তমানে উপলব্ধ নয়</p>
            <Link to="/authors" className="text-primary hover:underline">
              সকল লেখক দেখুন
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/authors" className="hover:text-primary">লেখকগণ</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{writer.name_bn}</span>
        </nav>

        {/* Writer Info */}
        <div className="bg-card rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-muted shrink-0">
              <img
                src={getWriterImage(writer)}
                alt={writer.name_bn}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{writer.name_bn}</h1>
              {writer.name_en && (
                <p className="text-muted-foreground mb-4">{writer.name_en}</p>
              )}
              {writer.bio_bn && (
                <p className="text-muted-foreground leading-relaxed">{writer.bio_bn}</p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-2 mt-4 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{products.length} টি বই</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">{writer.name_bn} এর বই সমূহ</h2>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">এই লেখকের কোনো বই এখনো যোগ করা হয়নি</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WriterDetail;
