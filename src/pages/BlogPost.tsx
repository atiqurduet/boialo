import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SocialShare } from "@/components/SocialShare";
import { Calendar, Eye, ChevronRight, Clock, BookOpen, ArrowLeft, List } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const estimateReadingTime = (html: string) => {
  const text = html?.replace(/<[^>]*>/g, "") || "";
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const extractHeadings = (html: string) => {
  const regex = /<h([2-3])[^>]*(?:id="([^"]*)")?[^>]*>(.*?)<\/h[2-3]>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[3].replace(/<[^>]*>/g, "");
    const id = match[2] || text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "");
    headings.push({ level: parseInt(match[1]), text, id });
  }
  return headings;
};

const addIdsToHeadings = (html: string) => {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h([2-3])>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "");
    const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0980-\u09FF-]/g, "");
    if (attrs.includes("id=")) return match;
    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`;
  });
};

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

  // Related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", post?.category, post?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_bn, slug, featured_image, published_at, content_bn, category, view_count")
        .eq("status", "published")
        .eq("category", post!.category!)
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!post?.id && !!post?.category,
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

  const headings = useMemo(() => extractHeadings(post?.content_bn || ""), [post?.content_bn]);
  const processedContent = useMemo(() => addIdsToHeadings(post?.content_bn || ""), [post?.content_bn]);
  const readingTime = useMemo(() => estimateReadingTime(post?.content_bn || ""), [post?.content_bn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8 max-w-4xl mx-auto">
          <Skeleton className="h-5 w-48 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-5 w-64 mb-6" />
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
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
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-bold mb-2">পোস্ট পাওয়া যায়নি</h2>
          <p className="text-muted-foreground mb-4">এই পোস্টটি মুছে ফেলা হয়েছে বা পাওয়া যায়নি</p>
          <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> ব্লগে ফিরুন
          </Link>
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
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/blog" className="hover:text-primary">ব্লগ</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium line-clamp-1">{post.title_bn}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 max-w-5xl mx-auto">
          {/* Main Article */}
          <article>
            {/* Category & Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {post.category && <Badge variant="secondary">{post.category}</Badge>}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {readingTime} মিনিট পড়া
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title_bn}</h1>

            {post.excerpt_bn && (
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{post.excerpt_bn}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
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

            {/* Featured Image */}
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title_bn}
                className="w-full rounded-xl mb-8 aspect-video object-cover shadow-md"
              />
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {post.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-img:rounded-lg prose-blockquote:border-primary"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Share */}
            <div className="mt-10 pt-6 border-t border-border">
              <SocialShare
                url={`/blog/${post.slug}`}
                title={post.title_bn}
                description={post.excerpt_bn || ""}
              />
            </div>

            {/* Back to blog */}
            <div className="mt-6">
              <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" /> সকল পোস্ট দেখুন
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Table of Contents */}
            {headings.length > 0 && (
              <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <List className="w-4 h-4" /> সূচিপত্র
                </h3>
                <nav className="space-y-1">
                  {headings.map((h, i) => (
                    <a
                      key={i}
                      href={`#${h.id}`}
                      className={`block text-sm text-muted-foreground hover:text-primary transition-colors py-1 ${
                        h.level === 3 ? "pl-4" : ""
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
                <h3 className="font-bold text-sm mb-4">সম্পর্কিত পোস্ট</h3>
                <div className="space-y-4">
                  {relatedPosts.map((rp: any) => (
                    <Link
                      key={rp.id}
                      to={`/blog/${rp.slug}`}
                      className="flex gap-3 group"
                    >
                      {rp.featured_image ? (
                        <img
                          src={rp.featured_image}
                          alt={rp.title_bn}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {rp.title_bn}
                        </h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadingTime(rp.content_bn || "")} মিনিট
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share Card */}
            <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
              <h3 className="font-bold text-sm mb-3">শেয়ার করুন</h3>
              <SocialShare
                url={`/blog/${post.slug}`}
                title={post.title_bn}
                description={post.excerpt_bn || ""}
              />
            </div>
          </aside>
        </div>

        {/* Related Posts Grid (Bottom) */}
        {relatedPosts.length > 0 && (
          <div className="max-w-5xl mx-auto mt-16">
            <h2 className="text-2xl font-bold mb-6">আরো পড়ুন</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp: any) => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.slug}`}
                  className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    {rp.featured_image ? (
                      <img
                        src={rp.featured_image}
                        alt={rp.title_bn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {rp.title_bn}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {estimateReadingTime(rp.content_bn || "")} মিনিট
                      </span>
                      {rp.view_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {rp.view_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
