import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const categories = [...new Set(posts.map((p: any) => p.category))];

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ব্লগ</span>
        </nav>

        <h1 className="text-3xl font-bold mb-8">ব্লগ ও আর্টিকেল</h1>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <Badge
              variant={!selectedCategory ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              সকল
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>এখনো কোনো ব্লগ পোস্ট প্রকাশিত হয়নি</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                {post.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.title_bn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), "d MMM yyyy", { locale: bn })}
                      </span>
                    )}
                    {post.view_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.view_count}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title_bn}
                  </h2>
                  {post.excerpt_bn && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt_bn}</p>
                  )}
                  {post.tags?.length > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {post.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
