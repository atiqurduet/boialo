import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar, Eye, ChevronRight, Search, Clock, BookOpen, Star } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const POSTS_PER_PAGE = 9;

const estimateReadingTime = (html: string) => {
  const text = html?.replace(/<[^>]*>/g, "") || "";
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      return data || [];
    },
  });

  const categories = useMemo(() => [...new Set(posts.map((p: any) => p.category).filter(Boolean))], [posts]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedCategory) result = result.filter((p: any) => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.title_bn?.toLowerCase().includes(q) ||
          p.title_en?.toLowerCase().includes(q) ||
          p.excerpt_bn?.toLowerCase().includes(q) ||
          p.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, selectedCategory, searchQuery]);

  const featuredPost = useMemo(() => posts.find((p: any) => p.is_featured), [posts]);
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ব্লগ</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">ব্লগ ও আর্টিকেল</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            সর্বশেষ খবর, টিপস, এবং আকর্ষণীয় আর্টিকেল পড়ুন
          </p>
        </div>

        {/* Featured Post Hero */}
        {featuredPost && !searchQuery && !selectedCategory && currentPage === 1 && (
          <Link
            to={`/blog/${featuredPost.slug}`}
            className="block mb-10 group rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="grid md:grid-cols-2">
              {featuredPost.featured_image && (
                <div className="aspect-video md:aspect-auto overflow-hidden">
                  <img
                    src={featuredPost.featured_image}
                    alt={featuredPost.title_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <Badge className="w-fit mb-3" variant="default">
                  <Star className="w-3 h-3 mr-1" /> ফিচার্ড
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {featuredPost.title_bn}
                </h2>
                {featuredPost.excerpt_bn && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">{featuredPost.excerpt_bn}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {featuredPost.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(featuredPost.published_at), "d MMMM yyyy", { locale: bn })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {estimateReadingTime(featuredPost.content_bn || "")} মিনিট পড়া
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ব্লগ পোস্ট খুঁজুন..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={!selectedCategory ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
            >
              সকল ({posts.length})
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              >
                {cat} ({posts.filter((p: any) => p.category === cat).length})
              </Badge>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-card">
                <Skeleton className="aspect-video w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">কোনো পোস্ট পাওয়া যায়নি</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "অন্য কিছু দিয়ে খুঁজুন" : "এখনো কোনো ব্লগ পোস্ট প্রকাশিত হয়নি"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post: any) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  <div className="aspect-video overflow-hidden bg-muted relative">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title_bn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {post.category && (
                      <Badge className="absolute top-3 left-3" variant="secondary">
                        {post.category}
                      </Badge>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(post.published_at), "d MMM yyyy", { locale: bn })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {estimateReadingTime(post.content_bn || "")} মিনিট
                      </span>
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
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt_bn}</p>
                    )}
                    {post.tags?.length > 0 && (
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {post.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-border">
                      <span className="text-sm font-medium text-primary group-hover:underline">
                        আরো পড়ুন →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => p - 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((page, idx, arr) => (
                        <PaginationItem key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => p + 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
