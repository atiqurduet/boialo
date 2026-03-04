import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  Clock,
  Tag,
  BookOpen,
  Package,
  Star,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

const SORT_OPTIONS = [
  { value: "new", label: "নতুন প্রকাশিত", icon: Clock, description: "সর্বশেষ যোগ করা" },
  { value: "bestseller", label: "বেস্টসেলার", icon: TrendingUp, description: "সবচেয়ে বেশি বিক্রিত" },
  { value: "popular", label: "জনপ্রিয়", icon: Sparkles, description: "সবচেয়ে জনপ্রিয়" },
  { value: "price-low", label: "মূল্য: কম → বেশি", icon: ArrowUpDown, description: "সস্তা আগে" },
  { value: "price-high", label: "মূল্য: বেশি → কম", icon: ArrowUpDown, description: "দামি আগে" },
  { value: "discount", label: "সর্বোচ্চ ছাড়", icon: Tag, description: "বেশি ডিসকাউন্ট আগে" },
];

const GRID_COL_CLASSES: Record<number, string> = {
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  7: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7",
};

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  const [columns, setColumns] = useState(5);
  const productsPerPage = 24;
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

  // Subcategory scroll
  const subScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollSubLeft, setCanScrollSubLeft] = useState(false);
  const [canScrollSubRight, setCanScrollSubRight] = useState(false);

  const sortBy = sortFromUrl;

  const handleSortChange = useCallback((value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", value);
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams, { replace: true });
    setCurrentPage(page);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("page", "1");
      setSearchParams(newParams, { replace: true });
    }
  }, [category, writer, publisher, brand, preorder, searchQuery, priceRange]);

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
        .select('id, name_bn, name_en, slug, parent_id')
        .eq('is_active', true)
        .order('sort_order');
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

  const { data: productRatings = [] } = useQuery({
    queryKey: ['product-ratings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('product_id, rating');
      if (!data) return [];
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

  // Subcategory scroll logic
  const checkSubScroll = useCallback(() => {
    const el = subScrollRef.current;
    if (!el) return;
    setCanScrollSubLeft(el.scrollLeft > 5);
    setCanScrollSubRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    checkSubScroll();
    const el = subScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkSubScroll);
      window.addEventListener('resize', checkSubScroll);
    }
    return () => {
      el?.removeEventListener('scroll', checkSubScroll);
      window.removeEventListener('resize', checkSubScroll);
    };
  }, [checkSubScroll, categories]);

  const scrollSub = (dir: 'left' | 'right') => {
    subScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

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

  // Get parent categories for subcategory carousel
  const parentCategories = useMemo(() => {
    return categories.filter(c => !c.parent_id);
  }, [categories]);

  // If a category is selected, get its subcategories
  const selectedCategoryInfo = getCategoryInfo();
  const subcategories = useMemo(() => {
    if (!selectedCategoryInfo) return [];
    // If selected is a parent, show its children
    const children = categories.filter(c => c.parent_id === selectedCategoryInfo.id);
    if (children.length > 0) return children;
    // If selected is a child, show siblings
    if (selectedCategoryInfo.parent_id) {
      return categories.filter(c => c.parent_id === selectedCategoryInfo.parent_id);
    }
    return [];
  }, [selectedCategoryInfo, categories]);

  const filteredProducts = useMemo(() => {
    let products: Product[] = dbProducts.map(convertDbProduct);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query)
      );
    }

    if (category) {
      const categoryInfo = getCategoryInfo();
      products = dbProducts
        .filter(p => {
          if (categoryInfo) {
            // Include products from this category and its subcategories
            const subCatIds = categories.filter(c => c.parent_id === categoryInfo.id).map(c => c.id);
            const allIds = [categoryInfo.id, ...subCatIds];
            return allIds.includes(p.category_id);
          }
          return p.category?.slug === category || p.category_id === category;
        })
        .map(convertDbProduct);
    }

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

    if (brand) {
      const brandInfo = getBrandInfo();
      if (brandInfo) {
        products = dbProducts
          .filter(p => p.brand_id === brandInfo.id)
          .map(convertDbProduct);
      }
    }

    if (preorder === "true") {
      products = products.filter(p => p.isPreorder === true);
    } else if (preorder === "false") {
      products = products.filter(p => p.isPreorder !== true);
    }

    products = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    if (ratingFilter) {
      const ratingMapLookup = new Map(productRatings.map(r => [r.product_id, r.avg]));
      products = products.filter(p => {
        const avg = ratingMapLookup.get(p.id);
        return avg !== undefined && avg >= ratingFilter;
      });
    }

    switch (sortBy) {
      case "price-low":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        products.sort((a, b) => b.price - a.price);
        break;
      case "popular":
      case "bestseller":
        products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case "discount":
        products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case "new":
      default:
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

  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];

  // Categories to show in the subcategory carousel
  const carouselCategories = useMemo(() => {
    if (category && subcategories.length > 0) return subcategories;
    return parentCategories;
  }, [category, subcategories, parentCategories]);

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "space-y-5",
      isMobile ? "" : "bg-card rounded-xl p-4 shadow-sm border border-border/50"
    )}>
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-2">
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
          <div className="flex flex-wrap gap-1.5">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                সার্চ: {searchQuery}
                <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => { const p = new URLSearchParams(searchParams); p.delete("search"); setSearchParams(p); }}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {getCategoryInfo()?.name_bn || category}
                <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => { const p = new URLSearchParams(searchParams); p.delete("category"); setSearchParams(p); }}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {writer && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {getWriterInfo()?.name_bn || writer}
                <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => { const p = new URLSearchParams(searchParams); p.delete("writer"); setSearchParams(p); }}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {publisher && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {getPublisherInfo()?.name_bn || publisher}
                <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => { const p = new URLSearchParams(searchParams); p.delete("publisher"); setSearchParams(p); }}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {preorder && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                {preorder === "true" ? "প্রি-অর্ডার" : "স্টকে আছে"}
                <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => handlePreorderFilter(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <button onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            বিষয়
          </span>
          {expandedSections.category ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.category && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {categories.length > 0 ? (
              categories.filter(c => !c.parent_id).slice(0, 12).map((cat) => (
                <Link key={cat.id} to={`/shop?category=${cat.slug}&sort=${sortBy}`}
                  className={cn("flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg transition-all",
                    category === cat.slug ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}>
                  <span>{cat.name_bn}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-2">কোনো বিষয় নেই</p>
            )}
            {categories.filter(c => !c.parent_id).length > 12 && (
              <Link to="/categories" className="text-xs text-primary hover:underline block pt-1 px-2.5">সব বিষয় দেখুন →</Link>
            )}
          </div>
        )}
      </div>

      {/* Pre-order Filter */}
      <div>
        <button onClick={() => toggleSection("preorder")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            স্টক স্ট্যাটাস
          </span>
          {expandedSections.preorder ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.preorder && (
          <div className="space-y-0.5">
            {[
              { value: null, label: "সকল পণ্য", icon: "📦" },
              { value: "true", label: "প্রি-অর্ডার", icon: "🔥" },
              { value: "false", label: "স্টকে আছে", icon: "✅" },
            ].map((option) => (
              <button key={option.label} onClick={() => handlePreorderFilter(option.value)}
                className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2",
                  (option.value === null && !preorder) || preorder === option.value
                    ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            মূল্য পরিসীমা
          </span>
          {expandedSections.price ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.price && (
          <div className="space-y-3">
            <div className="px-1">
              <Slider value={priceRange} onValueChange={setPriceRange} max={30000} step={100} className="mt-2" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground mb-0.5 block">সর্বনিম্ন</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">৳</span>
                  <input type="number" value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
              <span className="text-muted-foreground mt-4 text-xs">—</span>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground mb-0.5 block">সর্বোচ্চ</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">৳</span>
                  <input type="number" value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "০-২০০", range: [0, 200] },
                { label: "২০০-৫০০", range: [200, 500] },
                { label: "৫০০-১০০০", range: [500, 1000] },
                { label: "১০০০+", range: [1000, 30000] },
              ].map((preset) => (
                <button key={preset.label} onClick={() => setPriceRange(preset.range as [number, number])}
                  className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-all",
                    priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1]
                      ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary hover:text-primary"
                  )}>
                  ৳{preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Publishers */}
      <div>
        <button onClick={() => toggleSection("publisher")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span>প্রকাশনী</span>
          {expandedSections.publisher ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.publisher && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {dbPublishers.length > 0 ? (
              dbPublishers.slice(0, 15).map((pub) => (
                <Link key={pub.id} to={`/shop?publisher=${pub.slug}&sort=${sortBy}`}
                  className={cn("flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg transition-all",
                    publisher === pub.slug ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}>
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
        <button onClick={() => toggleSection("writer")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span>লেখক</span>
          {expandedSections.writer ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.writer && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {writers.length > 0 ? (
              writers.slice(0, 15).map((w) => (
                <Link key={w.id} to={`/shop?writer=${w.slug}&sort=${sortBy}`}
                  className={cn("flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg transition-all",
                    writer === w.slug ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}>
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
        <button onClick={() => toggleSection("brand")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span>ব্র্যান্ড</span>
          {expandedSections.brand ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.brand && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
            {brands.length > 0 ? (
              brands.map((b) => (
                <Link key={b.id} to={`/shop?brand=${b.slug}&sort=${sortBy}`}
                  className={cn("flex items-center gap-2 text-sm py-1.5 px-2.5 rounded-lg transition-all",
                    brand === b.slug ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}>
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
        <button onClick={() => toggleSection("rating")}
          className="flex items-center justify-between w-full font-semibold mb-2 group text-sm">
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            রেটিং
          </span>
          {expandedSections.rating ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expandedSections.rating && (
          <div className="space-y-0.5">
            {[
              { value: null, label: "সকল রেটিং", stars: 0 },
              { value: 4, label: "৪★ ও তার বেশি", stars: 4 },
              { value: 3, label: "৩★ ও তার বেশি", stars: 3 },
              { value: 2, label: "২★ ও তার বেশি", stars: 2 },
              { value: 1, label: "১★ ও তার বেশি", stars: 1 },
            ].map((option) => (
              <button key={option.label} onClick={() => setRatingFilter(option.value)}
                className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2",
                  ratingFilter === option.value ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                {option.stars > 0 && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: option.stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
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
          ...(category ? [{ name: getCategoryInfo()?.name_bn || category, url: `/shop?category=${category}` }] : []),
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6 lg:gap-8">
          {/* Left Sidebar: Filters Only */}
          <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0">
            <div className="sticky top-4">
              <FilterSidebar />
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <nav className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5 flex-wrap">
              <Link to="/" className="hover:text-primary transition-colors">হোম</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              {category ? (
                <>
                  <Link to="/shop" className="hover:text-primary transition-colors">শপ</Link>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-foreground font-medium">{getCategoryInfo()?.name_bn || category}</span>
                </>
              ) : writer ? (
                <>
                  <Link to="/shop" className="hover:text-primary transition-colors">শপ</Link>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-foreground font-medium">{getWriterInfo()?.name_bn || writer}</span>
                </>
              ) : publisher ? (
                <>
                  <Link to="/shop" className="hover:text-primary transition-colors">শপ</Link>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-foreground font-medium">{getPublisherInfo()?.name_bn || publisher}</span>
                </>
              ) : (
                <span className="text-foreground font-medium">শপ</span>
              )}
            </nav>

            {/* Title & Product Count */}
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{getCategoryTitle()}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredProducts.length} টি পণ্য পাওয়া গেছে
              </p>
            </div>

            {/* Subcategory Carousel */}
            {carouselCategories.length > 0 && (
              <div className="relative mb-5">
                {canScrollSubLeft && (
                  <button onClick={() => scrollSub('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -translate-x-3">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div ref={subScrollRef}
                  className="flex gap-2 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* "All" pill */}
                  <Link to={category ? `/shop?sort=${sortBy}` : `/shop?sort=${sortBy}`}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                      !category ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
                    )}>
                    সকল
                  </Link>
                  {carouselCategories.map((cat) => (
                    <Link key={cat.id} to={`/shop?category=${cat.slug}&sort=${sortBy}`}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                        category === cat.slug ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
                      )}>
                      {cat.name_bn}
                    </Link>
                  ))}
                </div>
                {canScrollSubRight && (
                  <button onClick={() => scrollSub('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all translate-x-3">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Action Bar: Sort + Grid Toggle */}
            <div className="flex items-center justify-between gap-3 mb-4">
              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <SlidersHorizontal className="w-4 h-4" />
                      ফিল্টার
                      {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
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

              {/* Sort + Grid Controls */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[160px] h-9 text-sm bg-card">
                    <div className="flex items-center gap-1.5">
                      <currentSortOption.icon className="w-3.5 h-3.5 text-primary" />
                      <SelectValue placeholder="সাজান" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Column Selector */}
                <div className="hidden lg:flex items-center gap-1 p-1 bg-muted rounded-lg">
                  {[4, 5, 6, 7].map((col) => (
                    <button key={col} onClick={() => setColumns(col)}
                      className={cn("px-2 py-1 rounded text-xs font-medium transition-all",
                        columns === col ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className={cn("grid gap-3 md:gap-4", GRID_COL_CLASSES[columns])}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length > 0 ? (
              <div className={cn("grid gap-3 md:gap-4", GRID_COL_CLASSES[columns])}>
                {paginatedProducts.map((product, index) => (
                  <div key={product.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-xl border border-border/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-bold mb-2">কোনো পণ্য পাওয়া যায়নি</h2>
                <p className="text-muted-foreground mb-4 text-sm max-w-md mx-auto">
                  আপনার ফিল্টার অনুযায়ী কোনো পণ্য পাওয়া যায়নি। অন্য ফিল্টার ব্যবহার করে দেখুন।
                </p>
                <Button onClick={clearAllFilters} variant="outline" size="sm" className="gap-2">
                  <X className="w-4 h-4" />
                  সব ফিল্টার মুছুন
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  <Button variant="outline" size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1} className="gap-1 rounded-full">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">আগের</span>
                  </Button>
                  
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <Button key={index} variant={currentPage === page ? "default" : "outline"} size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn("min-w-[36px] rounded-full", currentPage === page && "shadow-md")}>
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="px-1.5 text-muted-foreground">...</span>
                    )
                  ))}
                  
                  <Button variant="outline" size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages} className="gap-1 rounded-full">
                    <span className="hidden sm:inline">পরের</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-3">
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
