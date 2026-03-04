import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import {
  Package, ChevronRight, Search, Star, Eye, Monitor,
  ShoppingCart, SlidersHorizontal, Filter, Music, FileText, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, { label: string; icon: any; color: string }> = {
  software: { label: "সফটওয়্যার", icon: Monitor, color: "bg-violet-600/90" },
  audio: { label: "অডিও", icon: Music, color: "bg-orange-500/90" },
  video: { label: "ভিডিও", icon: FileText, color: "bg-rose-600/90" },
  template: { label: "টেমপ্লেট", icon: Cpu, color: "bg-teal-600/90" },
  course: { label: "কোর্স", icon: Package, color: "bg-cyan-600/90" },
  graphics: { label: "গ্রাফিক্স", icon: Package, color: "bg-pink-600/90" },
};

const Eproducts = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [category, setCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [columns, setColumns] = useState(5);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["eproducts-page", search, sortBy, category, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("digital_products")
        .select("id, title_bn, title_en, slug, price, original_price, discount_percent, cover_image, product_type, is_free, avg_rating, review_count, total_sales, total_downloads, file_format, category, description_bn")
        .eq("is_active", true)
        .neq("product_type", "ebook");

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%`);
      if (category !== "all") q = q.eq("category", category);
      if (typeFilter !== "all") q = q.eq("product_type", typeFilter);

      switch (sortBy) {
        case "price_low": q = q.order("price", { ascending: true }); break;
        case "price_high": q = q.order("price", { ascending: false }); break;
        case "popular": q = q.order("total_sales", { ascending: false, nullsFirst: false }); break;
        case "rating": q = q.order("avg_rating", { ascending: false, nullsFirst: false }); break;
        default: q = q.order("created_at", { ascending: false });
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["eproduct-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_products")
        .select("category")
        .eq("is_active", true)
        .neq("product_type", "ebook")
        .not("category", "is", null);
      return [...new Set((data || []).map((d: any) => d.category).filter(Boolean))] as string[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Unique product types
  const { data: productTypes = [] } = useQuery({
    queryKey: ["eproduct-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_products")
        .select("product_type")
        .eq("is_active", true)
        .neq("product_type", "ebook");
      return [...new Set((data || []).map((d: any) => d.product_type).filter(Boolean))] as string[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const gridCols: Record<number, string> = {
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    7: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7",
  };

  const getTypeInfo = (type: string) => typeLabels[type] || { label: type, icon: Package, color: "bg-primary/90" };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="ই-প্রোডাক্ট | BoiAlo" description="সফটওয়্যার, টেমপ্লেট, অডিও, ভিডিও এবং আরো অনেক ডিজিটাল পণ্য।" />
      <AnnouncementBar />
      <Header />

      <main className="container py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-5 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ই-প্রোডাক্ট</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 rounded-2xl p-6 md:p-10 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">ই-প্রোডাক্ট</h1>
                <p className="text-purple-100 text-sm md:text-base">সফটওয়্যার, টেমপ্লেট, অডিও ও ডিজিটাল টুলস</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-2xl font-bold text-white">{products.length}</p>
                <p className="text-xs text-purple-200">মোট প্রোডাক্ট</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-2xl font-bold text-white">{products.filter(e => e.is_free).length}</p>
                <p className="text-xs text-purple-200">ফ্রি আইটেম</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-2xl font-bold text-white">{productTypes.length}</p>
                <p className="text-xs text-purple-200">ধরন</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 items-start md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="ই-প্রোডাক্ট খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {productTypes.length > 1 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <Package className="w-3.5 h-3.5 mr-1" />
                  <SelectValue placeholder="ধরন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ধরন</SelectItem>
                  {productTypes.map((t) => (
                    <SelectItem key={t} value={t}>{getTypeInfo(t).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue placeholder="ক্যাটেগরি" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটেগরি</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">নতুন</SelectItem>
                <SelectItem value="popular">জনপ্রিয়</SelectItem>
                <SelectItem value="price_low">কম দাম</SelectItem>
                <SelectItem value="price_high">বেশি দাম</SelectItem>
                <SelectItem value="rating">সেরা রেটিং</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden md:flex gap-1 border rounded-lg p-1">
              {[4, 5, 6, 7].map((c) => (
                <Button key={c} variant={columns === c ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setColumns(c)}>
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{products.length}টি ই-প্রোডাক্ট পাওয়া গেছে</p>

        {/* Grid */}
        {isLoading ? (
          <div className={cn("grid gap-4", gridCols[columns])}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">কোনো ই-প্রোডাক্ট পাওয়া যায়নি</h3>
            <p className="text-muted-foreground text-sm">অন্য কিওয়ার্ড দিয়ে খুঁজুন</p>
          </div>
        ) : (
          <div className={cn("grid gap-4", gridCols[columns])}>
            {products.map((product: any) => {
              const hasDiscount = product.discount_percent && product.discount_percent > 0;
              const rating = product.avg_rating ?? 0;
              const typeInfo = getTypeInfo(product.product_type);
              const TypeIcon = typeInfo.icon;

              return (
                <div key={product.id} className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    <span className={cn("flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm", typeInfo.color)}>
                      <TypeIcon className="w-2.5 h-2.5" />
                      {typeInfo.label}
                    </span>
                    {product.is_free && (
                      <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">ফ্রি</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      -{product.discount_percent}%
                    </div>
                  )}

                  <Link to={`/eproducts/${product.slug}`}>
                    <div className="aspect-[3/4] overflow-hidden bg-gradient-to-b from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 relative">
                      <img src={product.cover_image || "/placeholder.svg"} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 dark:bg-black/70 text-foreground rounded-full p-2.5"><Eye className="w-5 h-5" /></span>
                      </div>
                    </div>
                  </Link>

                  <div className="p-3 space-y-1.5">
                    <Link to={`/eproducts/${product.slug}`}>
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">{product.title_bn}</h3>
                    </Link>

                    {rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-muted-foreground">{rating.toFixed(1)}{product.review_count ? ` (${product.review_count})` : ""}</span>
                      </div>
                    )}

                    {product.category && (
                      <span className="inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{product.category}</span>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      {product.is_free ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">ফ্রি</span>
                      ) : (
                        <>
                          <span className="font-bold text-primary">৳{product.price}</span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
                          )}
                        </>
                      )}
                    </div>

                    {(product.total_sales ?? 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground">{product.total_sales} বার বিক্রি</p>
                    )}

                    <Link to={`/eproducts/${product.slug}`} className="w-full mt-1 h-8 text-xs border rounded-md flex items-center justify-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors font-medium">
                      <ShoppingCart className="w-3 h-3" /> বিস্তারিত দেখুন
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Eproducts;
