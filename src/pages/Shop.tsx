import { useState, useMemo, useEffect, useCallback } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  X, 
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  Clock,
  Tag,
  BookOpen,
  Package,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeroBanner } from "@/components/PageHeroBanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Sort options configuration
const SORT_OPTIONS = [
  { value: "new", label: "নতুন প্রকাশিত", icon: Clock, description: "সর্বশেষ যোগ করা" },
  { value: "bestseller", label: "বেস্টসেলার", icon: TrendingUp, description: "সবচেয়ে বেশি বিক্রিত" },
  { value: "popular", label: "জনপ্রিয়", icon: Sparkles, description: "সবচেয়ে জনপ্রিয়" },
  { value: "price-low", label: "মূল্য: কম → বেশি", icon: ArrowUpDown, description: "সস্তা আগে" },
  { value: "price-high", label: "মূল্য: বেশি → কম", icon: ArrowUpDown, description: "দামি আগে" },
  { value: "discount", label: "সর্বোচ্চ ছাড়", icon: Tag, description: "বেশি ডিসকাউন্ট আগে" },
];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read all filters from URL
  const category = searchParams.get("category");
  const writer = searchParams.get("writer");
  const publisher = searchParams.get("publisher");
  const brand = searchParams.get("brand");
  const preorder = searchParams.get("preorder");
  const searchQuery = searchParams.get("search") || "";
  const sortFromUrl = searchParams.get("sort") || "new";
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const productsPerPage = 12;
  const [showFilters, setShowFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    publisher: true,
    preorder: true,
    writer: false,
    brand: false,
    category: true,
    rating: false,
  });

  // Sync sortBy with URL
  const sortBy = sortFromUrl;

  // Update URL when sort changes
  const handleSortChange = useCallback((value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", value);
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams]);

  // Update URL when page changes
  const handlePageChange = useCallback((page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams, { replace: true });
    setCurrentPage(page);
  }, [searchParams, setSearchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("page", "1");
      setSearchParams(newParams, { replace: true });
    }
  }, [category, writer, publisher, brand, preorder, searchQuery, priceRange]);

  // Sync page from URL
  useEffect(() => {
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [pageFromUrl]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_bn, name_en, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  const { data: writers = [] } = useQuery({
    queryKey: ['writers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('writers')
        .select('id, name_bn, name_en, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  const { data: dbPublishers = [] } = useQuery({
    queryKey: ['publishers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('publishers')
        .select('id, name_bn, name_en, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name_bn, name_en, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ['products-shop'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_bn, name_en, slug),
          writer:writers(id, name_bn, name_en, slug),
          publisher_rel:publishers(id, name_bn, name_en, slug)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch average ratings for all products
  const { data: productRatings = [] } = useQuery({
    queryKey: ['product-ratings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('product_id, rating');
      if (!data) return [];
      // Calculate average rating per product
      const ratingMap: Record<string, { total: number; count: number }> = {};
      data.forEach(r => {
        if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { total: 0, count: 0 };
        ratingMap[r.product_id].total += r.rating;
        ratingMap[r.product_id].count += 1;
      });
      return Object.entries(ratingMap).map(([pid, v]) => ({
        product_id: pid,
        avg: v.total / v.count,
        count: v.count,
      }));
    },
  });

  const getWriterInfo = () => {
    if (!writer) return null;
    return writers.find(w => w.slug === writer || w.id === writer);
  };

  const getPublisherInfo = () => {
    if (!publisher) return null;
    return dbPublishers.find(p => p.slug === publisher || p.id === publisher);
  };

  const getCategoryInfo = () => {
    if (!category) return null;
    return categories.find(c => c.slug === category || c.id === category);
  };

  const getBrandInfo = () => {
    if (!brand) return null;
    return brands.find(b => b.slug === brand || b.id === brand);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const convertDbProduct = (dbProduct: any): Product => {
    const images = dbProduct.images as string[] || [];
    return {
      id: dbProduct.id,
      slug: dbProduct.slug,
      title: dbProduct.title_bn || dbProduct.title_en,
      author: dbProduct.writer?.name_bn || dbProduct.author || 'অজানা লেখক',
      price: dbProduct.price,
      originalPrice: dbProduct.original_price,
      discount: dbProduct.discount_percent,
      image: images.length > 0 ? images[0] : '/placeholder.svg',
      category: dbProduct.category?.slug || dbProduct.category_id,
      publisher: dbProduct.publisher_rel?.name_bn || dbProduct.publisher,
      isPreorder: dbProduct.is_preorder,
      releaseDate: dbProduct.release_date,
    };
  };

  const filteredProducts = useMemo(() => {
    let products: Product[] = dbProducts.map(convertDbProduct);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (category) {
      const categoryInfo = getCategoryInfo();
      products = dbProducts
        .filter(p => {
          if (categoryInfo) {
            return p.category?.slug === categoryInfo.slug || 
                   p.category?.id === categoryInfo.id ||
                   p.category_id === categoryInfo.id;
          }
          return p.category?.slug === category || p.category_id === category;
        })
        .map(convertDbProduct);
    }

    // Filter by writer
    if (writer) {
      const writerInfo = getWriterInfo();
      products = dbProducts
        .filter(p => {
          if (writerInfo) {
            return p.writer?.slug === writerInfo.slug || 
                   p.writer?.id === writerInfo.id ||
                   p.writer_id === writerInfo.id;
          }
          return false;
        })
        .map(convertDbProduct);
    }

    // Filter by publisher
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      if (publisherInfo) {
        products = dbProducts
          .filter(p => 
            p.publisher_rel?.slug === publisherInfo.slug || 
            p.publisher_rel?.id === publisherInfo.id ||
            p.publisher_id === publisherInfo.id
          )
          .map(convertDbProduct);
      }
    }

    // Filter by brand
    if (brand) {
      const brandInfo = getBrandInfo();
      if (brandInfo) {
        products = dbProducts
          .filter(p => p.brand_id === brandInfo.id)
          .map(convertDbProduct);
      }
    }

    // Filter by pre-order status
    if (preorder === "true") {
      products = products.filter(p => p.isPreorder === true);
    } else if (preorder === "false") {
      products = products.filter(p => p.isPreorder !== true);
    }

    // Filter by price range
    products = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Filter by rating
    if (ratingFilter) {
      const ratingMapLookup = new Map(productRatings.map(r => [r.product_id, r.avg]));
      products = products.filter(p => {
        const avg = ratingMapLookup.get(p.id);
        return avg !== undefined && avg >= ratingFilter;
      });
    }

    // Sort products based on URL sort parameter
    switch (sortBy) {
      case "price-low":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        products.sort((a, b) => b.price - a.price);
        break;
      case "popular":
      case "bestseller":
        // Sort by discount as popularity indicator
        products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case "discount":
        products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case "new":
      default:
        // Already sorted by created_at from database
        break;
    }

    return products;
  }, [searchQuery, category, writer, publisher, brand, preorder, priceRange, sortBy, dbProducts, categories, writers, dbPublishers, brands, ratingFilter, productRatings]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, currentPage, productsPerPage]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const getCategoryTitle = () => {
    if (searchQuery) return `"${searchQuery}" এর ফলাফল`;
    if (preorder === "true") return "প্রি-অর্ডার বই";
    if (writer) {
      const writerInfo = getWriterInfo();
      return writerInfo ? `লেখক: ${writerInfo.name_bn}` : `লেখক: ${writer}`;
    }
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      return publisherInfo ? `প্রকাশনী: ${publisherInfo.name_bn}` : `প্রকাশনী: ${publisher}`;
    }
    if (brand) {
      const brandInfo = getBrandInfo();
      return brandInfo ? `ব্র্যান্ড: ${brandInfo.name_bn}` : `ব্র্যান্ড: ${brand}`;
    }
    if (category) {
      const categoryInfo = getCategoryInfo();
      return categoryInfo ? categoryInfo.name_bn : category;
    }
    return "সকল বই";
  };

  const handlePreorderFilter = (value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("preorder", value);
    } else {
      newParams.delete("preorder");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({ sort: sortBy });
    setPriceRange([0, 30000]);
    setRatingFilter(null);
  };

  const hasActiveFilters = category || writer || publisher || brand || preorder || searchQuery || priceRange[0] > 0 || priceRange[1] < 30000 || ratingFilter;

  const getBreadcrumb = () => {
    if (writer) {
      const writerInfo = getWriterInfo();
      return (
        <>
          <Link to="/authors" className="hover:text-primary transition-colors">লেখক</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium">{writerInfo?.name_bn || writer}</span>
        </>
      );
    }
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      return (
        <>
          <Link to="/publishers" className="hover:text-primary transition-colors">প্রকাশনী</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium">{publisherInfo?.name_bn || publisher}</span>
        </>
      );
    }
    if (brand) {
      const brandInfo = getBrandInfo();
      return (
        <>
          <span>ব্র্যান্ড</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium">{brandInfo?.name_bn || brand}</span>
        </>
      );
    }
    if (category) {
      return (
        <>
          <Link to="/categories" className="hover:text-primary transition-colors">বিষয়</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium">{getCategoryTitle()}</span>
        </>
      );
    }
    return <span className="text-foreground font-medium">সকল বই</span>;
  };

  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "space-y-6",
      isMobile ? "" : "bg-card rounded-2xl p-5 shadow-sm border border-border/50"
    )}>
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">সক্রিয় ফিল্টার</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              সব মুছুন
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 pr-1">
                সার্চ: {searchQuery}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("search");
                    setSearchParams(newParams);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {getCategoryInfo()?.name_bn || category}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("category");
                    setSearchParams(newParams);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {writer && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {getWriterInfo()?.name_bn || writer}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("writer");
                    setSearchParams(newParams);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {publisher && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {getPublisherInfo()?.name_bn || publisher}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("publisher");
                    setSearchParams(newParams);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {preorder && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {preorder === "true" ? "প্রি-অর্ডার" : "স্টকে আছে"}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => handlePreorderFilter(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            বিষয়
          </span>
          {expandedSections.category ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.category && (
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
            {categories.length > 0 ? (
              categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}&sort=${sortBy}`}
                  className={cn(
                    "flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-all",
                    category === cat.slug 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{cat.name_bn}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">কোনো বিষয় নেই</p>
            )}
            {categories.length > 10 && (
              <Link
                to="/categories"
                className="text-xs text-primary hover:underline block pt-2"
              >
                সব বিষয় দেখুন →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Pre-order Filter */}
      <div>
        <button
          onClick={() => toggleSection("preorder")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            স্টক স্ট্যাটাস
          </span>
          {expandedSections.preorder ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.preorder && (
          <div className="space-y-1">
            {[
              { value: null, label: "সকল পণ্য", icon: "📦" },
              { value: "true", label: "প্রি-অর্ডার", icon: "🔥" },
              { value: "false", label: "স্টকে আছে", icon: "✅" },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => handlePreorderFilter(option.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                  (option.value === null && !preorder) || preorder === option.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            মূল্য পরিসীমা
          </span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.price && (
          <div className="space-y-4">
            <div className="px-1">
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={30000}
                step={100}
                className="mt-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">সর্বনিম্ন</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <span className="text-muted-foreground mt-5">—</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">সর্বোচ্চ</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
            {/* Quick price filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "০-২০০", range: [0, 200] },
                { label: "২০০-৫০০", range: [200, 500] },
                { label: "৫০০-১০০০", range: [500, 1000] },
                { label: "১০০০+", range: [1000, 30000] },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setPriceRange(preset.range as [number, number])}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1]
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:border-primary hover:text-primary"
                  )}
                >
                  ৳{preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Publishers */}
      <div>
        <button
          onClick={() => toggleSection("publisher")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span>প্রকাশনী</span>
          {expandedSections.publisher ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.publisher && (
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
            {dbPublishers.length > 0 ? (
              dbPublishers.slice(0, 15).map((pub) => (
                <Link
                  key={pub.id}
                  to={`/shop?publisher=${pub.slug}&sort=${sortBy}`}
                  className={cn(
                    "flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-all",
                    publisher === pub.slug 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{pub.name_bn}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">কোনো প্রকাশক নেই</p>
            )}
          </div>
        )}
      </div>

      {/* Writers */}
      <div>
        <button
          onClick={() => toggleSection("writer")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span>লেখক</span>
          {expandedSections.writer ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.writer && (
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
            {writers.length > 0 ? (
              writers.slice(0, 15).map((w) => (
                <Link
                  key={w.id}
                  to={`/shop?writer=${w.slug}&sort=${sortBy}`}
                  className={cn(
                    "flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-all",
                    writer === w.slug 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{w.name_bn}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">কোনো লেখক নেই</p>
            )}
          </div>
        )}
      </div>

      {/* Brands */}
      <div>
        <button
          onClick={() => toggleSection("brand")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span>ব্র্যান্ড</span>
          {expandedSections.brand ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.brand && (
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
            {brands.length > 0 ? (
              brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/shop?brand=${b.slug}&sort=${sortBy}`}
                  className={cn(
                    "flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-all",
                    brand === b.slug 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{b.name_bn}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">কোনো ব্র্যান্ড নেই</p>
            )}
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div>
        <button
          onClick={() => toggleSection("rating")}
          className="flex items-center justify-between w-full font-semibold mb-3 group"
        >
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            রেটিং
          </span>
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
        {expandedSections.rating && (
          <div className="space-y-1">
            {[
              { value: null, label: "সকল রেটিং", stars: 0 },
              { value: 4, label: "৪★ ও তার বেশি", stars: 4 },
              { value: 3, label: "৩★ ও তার বেশি", stars: 3 },
              { value: 2, label: "২★ ও তার বেশি", stars: 2 },
              { value: 1, label: "১★ ও তার বেশি", stars: 1 },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => setRatingFilter(option.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2",
                  ratingFilter === option.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {option.stars > 0 && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: option.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </span>
                )}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const shopTitle = searchQuery ? `"${searchQuery}" অনুসন্ধান` : 'সকল বই ও পণ্য';
  const shopDesc = searchQuery 
    ? `"${searchQuery}" এর জন্য সার্চ রেজাল্ট। বইআলো - বাংলাদেশের সবচেয়ে বড় অনলাইন বই শপ।`
    : 'বইআলো তে সকল বই ও পণ্য ব্রাউজ করুন। ইসলামি বই, একাডেমিক বই, উপন্যাস সহ হাজারো বই সেরা দামে।';

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <SEOHead
        title={shopTitle}
        description={shopDesc}
        keywords="বই কিনুন, অনলাইন বই, বাংলা বই, ইসলামি বই, একাডেমিক বই, বইআলো শপ"
        canonicalUrl="https://boialo.com/shop"
        breadcrumbs={[
          { name: 'হোম', url: '/' },
          { name: 'শপ', url: '/shop' },
        ]}
      />
      <AnnouncementBar />
      <Header />

      <PageHeroBanner
        title={getCategoryTitle()}
        subtitle={`${filteredProducts.length} টি পণ্য পাওয়া গেছে`}
        breadcrumbs={[
          { label: "হোম", href: "/" },
          { label: "শপ", href: "/shop" },
          ...(category ? [{ label: getCategoryInfo()?.name_bn || category }] : []),
          ...(writer ? [{ label: getWriterInfo()?.name_bn || writer }] : []),
          ...(publisher ? [{ label: getPublisherInfo()?.name_bn || publisher }] : []),
        ]}
        productCount={filteredProducts.length}
        icon={<BookOpen className="w-6 h-6 md:w-7 md:h-7 text-primary" />}
      />

      <main className="container py-6">

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Filter & Sort Bar */}
          <div className="lg:hidden space-y-4">
            {/* Sort Pills - Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {SORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all border",
                      sortBy === option.value
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card hover:bg-muted border-border"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Button */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  ফিল্টার
                  {hasActiveFilters && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                      !
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    ফিল্টার
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterSidebar isMobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:w-72 lg:shrink-0">
            <div className="sticky top-4">
              <FilterSidebar />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Header with Title, Count, Sort, and Grid Toggle */}
            <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{getCategoryTitle()}</h1>
                  <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {filteredProducts.length}
                    </span>
                    টি পণ্য পাওয়া গেছে
                  </p>
                </div>
                
                <div className="hidden lg:flex items-center gap-3">
                  {/* Grid Toggle */}
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <button
                      onClick={() => setGridCols(3)}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        gridCols === 3 ? "bg-background shadow-sm" : "hover:bg-background/50"
                      )}
                      title="3 কলাম"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setGridCols(4)}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        gridCols === 4 ? "bg-background shadow-sm" : "hover:bg-background/50"
                      )}
                      title="4 কলাম"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[200px] bg-background">
                      <div className="flex items-center gap-2">
                        <currentSortOption.icon className="w-4 h-4 text-primary" />
                        <SelectValue placeholder="সাজান" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-muted-foreground">{option.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Desktop Quick Sort Pills */}
              <div className="hidden lg:flex gap-2 mt-4 pt-4 border-t border-border/50 overflow-x-auto">
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all",
                        sortBy === option.value
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products */}
            {isLoading ? (
              <div className={cn(
                "grid gap-4 md:gap-6",
                gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length > 0 ? (
              <div className={cn(
                "grid gap-4 md:gap-6",
                gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {paginatedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">কোনো পণ্য পাওয়া যায়নি</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  আপনার ফিল্টার অনুযায়ী কোনো পণ্য পাওয়া যায়নি। অন্য ফিল্টার ব্যবহার করে দেখুন।
                </p>
                <Button onClick={clearAllFilters} variant="outline" className="gap-2">
                  <X className="w-4 h-4" />
                  সব ফিল্টার মুছুন
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10">
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="gap-1 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">আগের</span>
                  </Button>
                  
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <Button
                        key={index}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          "min-w-[40px] rounded-full",
                          currentPage === page && "shadow-md"
                        )}
                      >
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="px-2 text-muted-foreground">...</span>
                    )
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-1 rounded-full"
                  >
                    <span className="hidden sm:inline">পরের</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Results info */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  মোট <span className="font-medium text-foreground">{filteredProducts.length}</span> টি পণ্যের মধ্যে{' '}
                  <span className="font-medium text-foreground">{(currentPage - 1) * productsPerPage + 1}</span> -{' '}
                  <span className="font-medium text-foreground">{Math.min(currentPage * productsPerPage, filteredProducts.length)}</span> দেখাচ্ছে
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
