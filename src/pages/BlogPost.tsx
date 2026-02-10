import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SocialShare } from "@/components/SocialShare";
import { Calendar, Eye, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const BlogPost = () => {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  // Increment view count
  useEffect(() => {
    if (post?.id) {
      supabase
        .from("blog_posts")
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq("id", post.id)
        .then();
    }
  }, [post?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-16 text-center">
          <h2 className="text-xl font-bold mb-2">পোস্ট পাওয়া যায়নি</h2>
          <Link to="/blog" className="text-primary hover:underline">ব্লগে ফিরুন</Link>
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
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/blog" className="hover:text-primary">ব্লগ</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium line-clamp-1">{post.title_bn}</span>
        </nav>

        <article className="max-w-3xl mx-auto">
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title_bn}
              className="w-full rounded-xl mb-6 aspect-video object-cover"
            />
          )}

          <h1 className="text-3xl font-bold mb-4">{post.title_bn}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at), "d MMMM yyyy", { locale: bn })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.view_count || 0} বার পড়া হয়েছে
            </span>
          </div>

          {post.tags?.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <div
            className="prose prose-lg max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: post.content_bn || "" }}
          />

          <div className="mt-8 pt-6 border-t border-border">
            <SocialShare
              url={`/blog/${post.slug}`}
              title={post.title_bn}
              description={post.excerpt_bn || ""}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
