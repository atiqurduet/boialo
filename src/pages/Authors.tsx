import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Link } from "react-router-dom";
import { Search, Book } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Authors = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch writers from database
  const { data: writers = [], isLoading } = useQuery({
    queryKey: ['writers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('writers')
        .select('id, name_bn, name_en, slug, image_url')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch product counts per writer
  const { data: writerCounts = {} } = useQuery({
    queryKey: ['writer-product-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('writer_id')
        .eq('is_active', true);
      
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => {
        if (p.writer_id) {
          counts[p.writer_id] = (counts[p.writer_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const filteredAuthors = writers.filter((author) =>
    author.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (author.name_en && author.name_en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getAuthorImage = (author: typeof writers[0]) => {
    if (author.image_url) return author.image_url;
    const name = author.name_bn.split(' ')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=fff&size=128`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">লেখকগণ</h1>
          <p className="text-muted-foreground">আমাদের সংগ্রহে থাকা সকল লেখকদের তালিকা</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="লেখকের নাম দিয়ে খুঁজুন..."
              className="search-input pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Authors Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 text-center">
                <Skeleton className="w-20 h-20 mx-auto mb-3 rounded-full" />
                <Skeleton className="h-4 w-24 mx-auto mb-2" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {filteredAuthors.map((author) => (
              <Link
                key={author.id}
                to={`/authors/${author.slug}`}
                className="bg-card rounded-xl p-4 text-center hover:shadow-lg transition-all group"
              >
                <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-muted">
                  <img
                    src={getAuthorImage(author)}
                    alt={author.name_bn}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
                <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {author.name_bn}
                </h3>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Book className="w-3 h-3" />
                  <span>{writerCounts[author.id] || 0} টি বই</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && filteredAuthors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">কোনো লেখক পাওয়া যায়নি</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Authors;
