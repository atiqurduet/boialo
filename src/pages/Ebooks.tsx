import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { SEOHead } from "@/components/SEOHead";
import {
  BookOpen, ChevronRight, Search, Star, Tablet, Eye,
  ShoppingCart, SlidersHorizontal, Filter, X, Tag,
  Download, TrendingUp, Sparkles, Grid3X3, LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

const EbookCard = ({ product, columns }: { product: any; columns: number }) => {
  const hasDiscount = product.discount_percent && product.discount_percent > 0;
  const rating = product.avg_rating ?? 0;
  const isCompact = columns >= 6;

  return (
    <div className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {product.file_format && (
          <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0 h-5 backdrop-blur-sm gap-0.5">
            <Tablet className="w-2.5 h-2.5" />
            {product.file_format.toUpperCase()}
          </Badge>
        )}
        {product.is_free && (
          <Badge className="bg-emerald-600/90 text-white text-[10px] px-1.5 py-0 h-5 backdrop-blur-sm">ফ্রি</Badge>
        )}
      </div>
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          -{product.discount_percent}%
        </div>
      )}

      <Link to={`/ebooks/${product.slug}`}>
        <div className="aspect-[3/4] overflow-hidden bg-muted/30 relative">
          <img
            src={product.cover_image || "/placeholder.svg"}
            alt={product.title_bn}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-background/90 text-foreground rounded-full p-2.5 shadow-lg">
              <Eye className="w-5 h-5" />
            </span>
          </div>
        </div>
      </Link>

      <div className={cn("p-3 space-y-1.5", isCompact && "p-2 space-y-1")}>
        <Link to={`/ebooks/${product.slug}`}>
          <h3 className={cn(
            "font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight",
            isCompact ? "text-xs" : "text-sm"
          )}>
            {product.title_bn}
          </h3>
        </Link>

        {!isCompact && product.title_en && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{product.title_en}</p>
        )}

        {rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {rating.toFixed(1)}
              {!isCompact && product.review_count ? ` (${product.review_count})` : ""}
            </span>
          </div>
        )}

        {!isCompact && product.category && (
          <button className="inline-block text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors">
            {product.category}
          </button>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          {product.is_free ? (
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">ফ্রি</span>
          ) : (
            <>
              <span className={cn("font-bold text-primary", isCompact ? "text-sm" : "text-base")}>৳{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-[11px] text-muted-foreground line-through">৳{product.original_price}</span>
              )}
            </>
          )}
        </div>

        {!isCompact && (product.total_sales ?? 0) > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" /> {product.total_sales} বার বিক্রি
          </p>
        )}

        <Link
          to={`/ebooks/${product.slug}`}
          className={cn(
            "w-full mt-1 text-xs border rounded-lg flex items-center justify-center gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors font-medium",
            isCompact ? "h-7" : "h-8"
          )}
        >
          <Eye className="w-3 h-3" /> বিস্তারিত
        </Link>
      </div>
    </div>
  );
};

const Ebooks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [columns, setColumns] = useState(5);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showDiscountOnly, setShowDiscountOnly] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all ebooks
  const { data: allEbooks = [], isLoading } = useQuery({
    queryKey: ["ebooks-page-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select("id, title_bn, title_en, slug, price, original_price, discount_percent, cover_image, product_type, is_free, avg_rating, review_count, total_sales, total_downloads, file_format, category, description_bn, tags, created_at")
        .eq("is_active", true)
        .eq("product_type", "ebook")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 3 * 60 * 1000,
  });

  // Get unique categories with counts
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    allEbooks.forEach((e: any) => {
      if (e.category) catMap.set(e.category, (catMap.get(e.category) || 0) + 1);
    });
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [allEbooks]);

  // Get unique formats
  const formats = useMemo(() => {
    const fmtSet = new Set<string>();
    allEbooks.forEach((e: any) => { if (e.file_format) fmtSet.add(e.file_format); });
    return Array.from(fmtSet);
  }, [allEbooks]);

  // Get price range
  const maxPrice = useMemo(() => {
    return Math.max(...allEbooks.filter((e: any) => !e.is_free).map((e: any) => e.price || 0), 1000);
  }, [allEbooks]);

  // Client-side filtering & sorting
  const filteredEbooks = useMemo(() => {
    let result = [...allEbooks];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.title_bn?.toLowerCase().includes(q) ||
        e.title_en?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        (e.tags && e.tags.some((t: string) => t.toLowerCase().includes(q)))
      );
    }

    // Category
    if (selectedCategory !== "all") {
      result = result.filter((e: any) => e.category === selectedCategory);
    }

    // Free only
    if (showFreeOnly) result = result.filter((e: any) => e.is_free);

    // Discount only
    if (showDiscountOnly) result = result.filter((e: any) => e.discount_percent && e.discount_percent > 0);

    // Price range
    if (!showFreeOnly) {
      result = result.filter((e: any) => e.is_free || (e.price >= priceRange[0] && e.price <= priceRange[1]));
    }

    // Format
    if (selectedFormats.length > 0) {
      result = result.filter((e: any) => e.file_format && selectedFormats.includes(e.file_format));
    }

    // Rating
    if (minRating > 0) {
      result = result.filter((e: any) => (e.avg_rating ?? 0) >= minRating);
    }

    // Sort
    switch (sortBy) {
      case "price_low": result.sort((a: any, b: any) => (a.price || 0) - (b.price || 0)); break;
      case "price_high": result.sort((a: any, b: any) => (b.price || 0) - (a.price || 0)); break;
      case "popular": result.sort((a: any, b: any) => (b.total_sales || 0) - (a.total_sales || 0)); break;
      case "rating": result.sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0)); break;
      case "discount": result.sort((a: any, b: any) => (b.discount_percent || 0) - (a.discount_percent || 0)); break;
      case "downloads": result.sort((a: any, b: any) => (b.total_downloads || 0) - (a.total_downloads || 0)); break;
      default: break; // newest - already sorted
    }

    return result;
  }, [allEbooks, search, selectedCategory, sortBy, showFreeOnly, showDiscountOnly, priceRange, selectedFormats, minRating]);

  const activeFilterCount = [
    selectedCategory !== "all",
    showFreeOnly,
    showDiscountOnly,
    selectedFormats.length > 0,
    minRating > 0,
    priceRange[0] > 0 || priceRange[1] < maxPrice,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setShowFreeOnly(false);
    setShowDiscountOnly(false);
    setSelectedFormats([]);
    setMinRating(0);
    setPriceRange([0, maxPrice]);
    setSearch("");
  };

  const toggleFormat = (fmt: string) => {
    setSelectedFormats(prev => prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]);
  };

  const gridCols: Record<number, string> = {
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    7: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7",
  };

  const freeCount = allEbooks.filter((e: any) => e.is_free).length;
  const discountCount = allEbooks.filter((e: any) => e.discount_percent && e.discount_percent > 0).length;

  // Sidebar filter component
  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-primary" /> ক্যাটেগরি
        </h3>
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex justify-between items-center",
              selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <span>সব ক্যাটেগরি</span>
            <Badge variant="secondary" className="text-[10px] h-5">{allEbooks.length}</Badge>
          </button>
          {categoryData.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex justify-between items-center",
                selectedCategory === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <span className="truncate">{cat}</span>
              <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{count}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold mb-3">মূল্য পরিসীমা</h3>
        <Slider
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          min={0}
          max={maxPrice}
          step={10}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>৳{priceRange[0]}</span>
          <span>৳{priceRange[1]}</span>
        </div>
      </div>

      {/* Quick filters */}
      <div>
        <h3 className="text-sm font-semibold mb-3">দ্রুত ফিল্টার</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showFreeOnly} onCheckedChange={(c) => setShowFreeOnly(!!c)} />
            <span>শুধু ফ্রি</span>
            <Badge variant="outline" className="text-[10px] h-5 ml-auto">{freeCount}</Badge>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showDiscountOnly} onCheckedChange={(c) => setShowDiscountOnly(!!c)} />
            <span>ছাড়ের ই-বুক</span>
            <Badge variant="outline" className="text-[10px] h-5 ml-auto">{discountCount}</Badge>
          </label>
        </div>
      </div>

      {/* Formats */}
      {formats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">ফরম্যাট</h3>
          <div className="flex flex-wrap gap-2">
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => toggleFormat(fmt)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
                  selectedFormats.includes(fmt)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      <div>
        <h3 className="text-sm font-semibold mb-3">ন্যূনতম রেটিং</h3>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r === minRating ? 0 : r)}
              className={cn(
                "flex items-center gap-0.5 text-xs px-2 py-1 rounded-md border transition-colors",
                minRating === r && r > 0 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              )}
            >
              {r > 0 && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
              {r === 0 ? "সব" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearAllFilters} className="w-full gap-1.5">
          <X className="w-3.5 h-3.5" /> সব ফিল্টার মুছুন
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="ই-বুক সংগ্রহ | BoiAlo" description="BoiAlo-তে সেরা ই-বুক সংগ্রহ। PDF, EPUB ফরম্যাটে ডিজিটাল বই পড়ুন যেকোনো ডিভাইসে।" />
      <AnnouncementBar />
      <Header />

      <main className="container py-5 md:py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ই-বুক</span>
        </nav>

        {/* Quick category chips - horizontal scroll */}
        {categoryData.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "shrink-0 text-sm px-4 py-1.5 rounded-full border font-medium transition-colors",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/50 hover:text-primary"
              )}
            >
              সব ({allEbooks.length})
            </button>
            {categoryData.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "shrink-0 text-sm px-4 py-1.5 rounded-full border font-medium transition-colors",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50 hover:text-primary"
                )}
              >
                {cat} ({count})
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-[240px] shrink-0">
            <div className="sticky top-24 bg-card border rounded-xl p-4">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-1.5">
                <Filter className="w-4 h-4" /> ফিল্টার
                {activeFilterCount > 0 && (
                  <Badge className="text-[10px] h-5">{activeFilterCount}</Badge>
                )}
              </h2>
              <FilterSidebar />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar: Search + Sort + Grid toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-10"
                  placeholder="ই-বুক খুঁজুন (নাম, ক্যাটেগরি, ট্যাগ)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {/* Mobile filter toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden gap-1.5"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-3.5 h-3.5" />
                  ফিল্টার
                  {activeFilterCount > 0 && <Badge className="text-[10px] h-4 px-1">{activeFilterCount}</Badge>}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[145px] h-9">
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">নতুন</SelectItem>
                    <SelectItem value="popular">জনপ্রিয়</SelectItem>
                    <SelectItem value="price_low">কম দাম</SelectItem>
                    <SelectItem value="price_high">বেশি দাম</SelectItem>
                    <SelectItem value="rating">সেরা রেটিং</SelectItem>
                    <SelectItem value="discount">সর্বোচ্চ ছাড়</SelectItem>
                    <SelectItem value="downloads">সর্বাধিক ডাউনলোড</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden md:flex gap-0.5 border rounded-lg p-0.5">
                  {[4, 5, 6, 7].map((c) => (
                    <Button
                      key={c}
                      variant={columns === c ? "default" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setColumns(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile filter panel */}
            {showFilters && (
              <div className="lg:hidden mb-5 bg-card border rounded-xl p-4">
                <FilterSidebar />
              </div>
            )}

            {/* Active filters bar */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <span className="text-xs text-muted-foreground">সক্রিয় ফিল্টার:</span>
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setSelectedCategory("all")}>
                    {selectedCategory} <X className="w-3 h-3" />
                  </Badge>
                )}
                {showFreeOnly && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setShowFreeOnly(false)}>
                    ফ্রি <X className="w-3 h-3" />
                  </Badge>
                )}
                {showDiscountOnly && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setShowDiscountOnly(false)}>
                    ছাড় <X className="w-3 h-3" />
                  </Badge>
                )}
                {selectedFormats.map(f => (
                  <Badge key={f} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => toggleFormat(f)}>
                    {f.toUpperCase()} <X className="w-3 h-3" />
                  </Badge>
                ))}
                {minRating > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setMinRating(0)}>
                    {minRating}+ ★ <X className="w-3 h-3" />
                  </Badge>
                )}
                <button onClick={clearAllFilters} className="text-xs text-destructive hover:underline ml-1">সব মুছুন</button>
              </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredEbooks.length}</span>টি ই-বুক পাওয়া গেছে
              </p>
            </div>

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
            ) : filteredEbooks.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-xl border">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">কোনো ই-বুক পাওয়া যায়নি</h3>
                <p className="text-muted-foreground text-sm mb-4">অন্য কিওয়ার্ড বা ফিল্টার দিয়ে খুঁজুন</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={clearAllFilters} className="gap-1.5">
                    <X className="w-4 h-4" /> ফিল্টার মুছুন
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn("grid gap-4", gridCols[columns])}>
                {filteredEbooks.map((product: any) => (
                  <EbookCard key={product.id} product={product} columns={columns} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Ebooks;
