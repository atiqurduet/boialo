import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Publisher {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  product_count?: number;
}

const Publishers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishers = async () => {
      try {
        // Fetch publishers
        const { data: publishersData, error: publishersError } = await supabase
          .from("publishers")
          .select("*")
          .eq("is_active", true)
          .order("name_bn");

        if (publishersError) throw publishersError;

        // Fetch product counts for each publisher
        const { data: productCounts, error: countError } = await supabase
          .from("products")
          .select("publisher_id")
          .eq("is_active", true);

        if (countError) throw countError;

        // Count products per publisher
        const countMap: Record<string, number> = {};
        productCounts?.forEach((p) => {
          if (p.publisher_id) {
            countMap[p.publisher_id] = (countMap[p.publisher_id] || 0) + 1;
          }
        });

        // Merge counts with publishers
        const publishersWithCounts = (publishersData || []).map((pub) => ({
          ...pub,
          product_count: countMap[pub.id] || 0,
        }));

        setPublishers(publishersWithCounts);
      } catch (error) {
        console.error("Error fetching publishers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishers();
  }, []);

  const filteredPublishers = publishers.filter((publisher) =>
    publisher.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    publisher.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPublisherImage = (publisher: Publisher) => {
    if (publisher.logo_url) return publisher.logo_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(publisher.name_bn)}&background=14b8a6&color=fff&size=128`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">প্রকাশকগণ</h1>
          <p className="text-muted-foreground">বিশ্বস্ত প্রকাশনী থেকে সংগৃহীত বই</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="প্রকাশকের নাম দিয়ে খুঁজুন..."
              className="search-input pr-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-muted" />
                <div className="h-4 bg-muted rounded mx-auto w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded mx-auto w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Publishers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {filteredPublishers.map((publisher) => (
                <Link
                  key={publisher.id}
                  to={`/publishers/${publisher.slug}`}
                  className="bg-card rounded-xl p-4 text-center hover:shadow-lg transition-all group"
                >
                  <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-accent/10">
                    <img
                      src={getPublisherImage(publisher)}
                      alt={publisher.name_bn}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {publisher.name_bn}
                  </h3>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3" />
                    <span>{publisher.product_count} টি বই</span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredPublishers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">কোনো প্রকাশক পাওয়া যায়নি</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Publishers;
