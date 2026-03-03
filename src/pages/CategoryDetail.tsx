import { SEOHead } from "@/components/SEOHead";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard } from "@/components/ProductCard";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, ArrowLeft, BookOpen, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Product {
  id: string;
  title: string;
  slug: string;
  author: string;
  price: number;
  originalPrice: number;
  image: string;
  discount: number;
  isPreorder?: boolean;
}

const GRID_COL_CLASSES: Record<number, string> = {
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  7: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7",
};

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState(5);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const productsPerPage = 24;

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 30000]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [selectedWriters, setSelectedWriters] = useState<string[]>([]);
  const [showInStock, setShowInStock] = useState(false);
  const [showDiscounted, setShowDiscounted] = useState(false);

  // Subcategory scroll
  const subScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch category by slug
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-detail', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch parent category
  const { data: parentCategory } = useQuery({
    queryKey: ['parent-category', category?.parent_id],
    queryFn: async () => {
      if (!category?.parent_id) return null;
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('id', category.parent_id)
        .single();
      return data;
    },
    enabled: !!category?.parent_id,
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', category?.id],
    queryFn: async () => {
      if (!category?.id) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', category.id)
        .eq('is_active', true)
        .order('sort_order')
        .order('name_bn');
      return data || [];
    },
    enabled: !!category?.id,
  });

  // Fetch all categories for descendant counting
  const { data: allCategories = [] } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, parent_id')
        .eq('is_active', true);
      return data || [];
    },
  });

  const getAllDescendantIds = (categoryId: string): string[] => {
    const directChildren = allCategories.filter(c => c.parent_id === categoryId);
    const descendantIds = directChildren.map(c => c.id);
    directChildren.forEach(child => {
      descendantIds.push(...getAllDescendantIds(child.id));
    });
    return descendantIds;
  };

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', category?.id, allCategories],
    queryFn: async () => {
      if (!category?.id) return [];
      const categoryIds = [category.id, ...getAllDescendantIds(category.id)];
      const { data } = await supabase
        .from('products')
        .select(`id, title_bn, slug, price, original_price, images, is_preorder, discount_percent, stock_quantity, author, publisher, writer_id`)
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!category?.id && allCategories.length > 0,
  });

  // Fetch publishers for filter
  const { data: publishers = [] } = useQuery({
    queryKey: ['publishers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('publishers')
        .select('id, name_bn')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch writers for filter
  const { data: writers = [] } = useQuery({
    queryKey: ['writers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('writers')
        .select('id, name_bn')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Convert products
  const convertedProducts: Product[] = useMemo(() => {
    return products.map((p: any) => ({
      id: p.id,
      title: p.title_bn,
      slug: p.slug,
      author: p.author || 'অজানা লেখক',
      price: p.price,
      originalPrice: p.original_price || p.price,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '/placeholder.svg',
      discount: p.discount_percent || 0,
      isPreorder: p.is_preorder,
      _publisher: p.publisher,
      _writer_id: p.writer_id,
      _stock: p.stock_quantity,
    }));
  }, [products]);

  // Extract publishers & writers that appear in current products
  const productPublishers = useMemo(() => {
    const pubNames = [...new Set(products.map(p => (p as any).publisher).filter(Boolean))] as string[];
    // Count occurrences
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const pub = (p as any).publisher;
      if (pub) counts[pub] = (counts[pub] || 0) + 1;
    });
    return pubNames.sort((a, b) => (counts[b] || 0) - (counts[a] || 0)).map(name => ({
      name,
      count: counts[name] || 0,
    }));
  }, [products]);

  const productWriters = useMemo(() => {
    const writerIds = [...new Set(products.map(p => (p as any).writer_id).filter(Boolean))] as string[];
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const wid = (p as any).writer_id;
      if (wid) counts[wid] = (counts[wid] || 0) + 1;
    });
    return writerIds.map(id => {
      const w = writers.find((wr: any) => wr.id === id);
      return { id, name: w?.name_bn || id, count: counts[id] || 0 };
    }).sort((a, b) => b.count - a.count);
  }, [products, writers]);

  // Price range from products
  const productPriceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 30000 };
    const prices = products.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  // Init price range
  useEffect(() => {
    if (products.length > 0) {
      setPriceRange([productPriceRange.min, productPriceRange.max]);
    }
  }, [productPriceRange]);

  // Reset filters on category change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPublishers([]);
    setSelectedWriters([]);
    setShowInStock(false);
    setShowDiscounted(false);
  }, [slug]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return convertedProducts.filter((product: any) => {
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
      if (selectedPublishers.length > 0 && (!product._publisher || !selectedPublishers.includes(product._publisher))) return false;
      if (selectedWriters.length > 0 && (!product._writer_id || !selectedWriters.includes(product._writer_id))) return false;
      if (showInStock && (product._stock === null || product._stock <= 0)) return false;
      if (showDiscounted && product.discount <= 0) return false;
      return true;
    });
  }, [convertedProducts, priceRange, selectedPublishers, selectedWriters, showInStock, showDiscounted]);

  // Sort
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'price-low': return sorted.sort((a, b) => a.price - b.price);
      case 'price-high': return sorted.sort((a, b) => b.price - a.price);
      case 'discount': return sorted.sort((a, b) => b.discount - a.discount);
      case 'popular': return sorted.sort((a, b) => b.discount - a.discount);
      default: return sorted;
    }
  }, [filteredProducts, sortBy]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, priceRange, selectedPublishers, selectedWriters, showInStock, showDiscounted]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priceRange[0] > productPriceRange.min || priceRange[1] < productPriceRange.max) count++;
    if (selectedPublishers.length > 0) count++;
    if (selectedWriters.length > 0) count++;
    if (showInStock) count++;
    if (showDiscounted) count++;
    return count;
  }, [priceRange, productPriceRange, selectedPublishers, selectedWriters, showInStock, showDiscounted]);

  const clearAllFilters = () => {
    setPriceRange([productPriceRange.min, productPriceRange.max]);
    setSelectedPublishers([]);
    setSelectedWriters([]);
    setShowInStock(false);
    setShowDiscounted(false);
  };

  // Subcategory scroll helpers
  const checkSubScroll = useCallback(() => {
    const el = subScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
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
  }, [checkSubScroll, subcategories]);

  const scrollSub = (dir: 'left' | 'right') => {
    subScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Filter sidebar
  const FilterSidebar = () => (
    <div className="space-y-1">
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">{activeFilterCount} টি ফিল্টার</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            মুছুন
          </Button>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["price", "publishers", "writers", "availability"]} className="w-full">
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-semibold py-3">মূল্য পরিসীমা</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <Slider
                value={priceRange}
                onValueChange={(v) => setPriceRange(v as [number, number])}
                min={productPriceRange.min}
                max={productPriceRange.max}
                step={10}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 border rounded-md px-2 py-1 text-center text-sm bg-muted/30">
                  {priceRange[0]}
                </div>
                <span className="text-muted-foreground text-xs">—</span>
                <div className="flex-1 border rounded-md px-2 py-1 text-center text-sm bg-muted/30">
                  {priceRange[1]}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Publishers */}
        {productPublishers.length > 0 && (
          <AccordionItem value="publishers">
            <AccordionTrigger className="text-sm font-semibold py-3">প্রকাশক</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {productPublishers.slice(0, 20).map(({ name, count }) => (
                  <div key={name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pub-${name}`}
                      checked={selectedPublishers.includes(name)}
                      onCheckedChange={() =>
                        setSelectedPublishers(prev =>
                          prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
                        )
                      }
                    />
                    <label htmlFor={`pub-${name}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                      <span className="line-clamp-1">{name}</span>
                      <span className="text-muted-foreground text-xs ml-1">({count})</span>
                    </label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Writers / Subjects */}
        {productWriters.length > 0 && (
          <AccordionItem value="writers">
            <AccordionTrigger className="text-sm font-semibold py-3">বিষয় সমূহ</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {productWriters.slice(0, 20).map(({ id, name, count }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`wr-${id}`}
                      checked={selectedWriters.includes(id)}
                      onCheckedChange={() =>
                        setSelectedWriters(prev =>
                          prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                        )
                      }
                    />
                    <label htmlFor={`wr-${id}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                      <span className="line-clamp-1">{name}</span>
                      <span className="text-muted-foreground text-xs ml-1">({count})</span>
                    </label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Availability */}
        <AccordionItem value="availability">
          <AccordionTrigger className="text-sm font-semibold py-3">প্রাপ্যতা</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="in-stock" checked={showInStock} onCheckedChange={(c) => setShowInStock(c as boolean)} />
                <label htmlFor="in-stock" className="text-sm cursor-pointer">শুধু স্টকে আছে</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="discounted" checked={showDiscounted} onCheckedChange={(c) => setShowDiscounted(c as boolean)} />
                <label htmlFor="discounted" className="text-sm cursor-pointer">শুধু ডিসকাউন্ট বই</label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-10 w-full mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">ক্যাটাগরি পাওয়া যায়নি</h1>
          <p className="text-muted-foreground mb-6">এই ক্যাটাগরিটি বিদ্যমান নেই বা মুছে ফেলা হয়েছে</p>
          <Button onClick={() => navigate('/shop')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            শপে ফিরে যান
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const catName = category?.name_bn || category?.name_en || 'ক্যাটাগরি';
  const catDesc = category?.meta_description || `${catName} ক্যাটাগরির সকল বই। বইআলো তে সেরা দামে ${catName} বই কিনুন।`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={category?.meta_title || `${catName} - বই`}
        description={catDesc}
        keywords={`${catName}, ${catName} বই, বই কিনুন, বইআলো`}
        canonicalUrl={`https://boialo.com/categories/${slug}`}
        ogImage={category?.image_url || undefined}
        breadcrumbs={[
          { name: 'হোম', url: '/' },
          { name: 'বই', url: '/shop' },
          ...(parentCategory ? [{ name: parentCategory.name_bn, url: `/categories/${parentCategory.slug}` }] : []),
          { name: catName, url: `/categories/${slug}` },
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">বই</Link>
          {parentCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <Link to={`/categories/${parentCategory.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                {parentCategory.name_bn}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">{catName}</span>
        </nav>

        {/* Category Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{catName}</h1>

        {/* Subcategories - horizontal scrollable */}
        {subcategories.length > 0 && (
          <div className="relative mb-6">
            {canScrollLeft && (
              <button
                onClick={() => scrollSub('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-muted transition-colors -translate-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div
              ref={subScrollRef}
              className="flex gap-1 overflow-x-auto border-b border-border/50 pb-3"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {subcategories.map((sub: any) => (
                <Link
                  key={sub.id}
                  to={`/categories/${sub.slug}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-primary border-b-2 border-transparent hover:border-primary transition-all flex-shrink-0"
                >
                  <span>{sub.name_bn}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
            {canScrollRight && (
              <button
                onClick={() => scrollSub('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:bg-muted transition-colors translate-x-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Main content: Sidebar + Products */}
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-lg border border-border/50 p-4 shadow-sm">
              <FilterSidebar />
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Top bar: count, sort, columns, mobile filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                {/* Mobile filter */}
                <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                      ফিল্টার
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>ফিল্টার</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterSidebar />
                    </div>
                  </SheetContent>
                </Sheet>

                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{sortedProducts.length}</span> Items Found
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Column selector */}
                <div className="hidden md:flex items-center gap-1.5">
                  {[4, 5, 6, 7].map(col => (
                    <button
                      key={col}
                      onClick={() => setColumns(col)}
                      className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                        columns === col
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Released</SelectItem>
                      <SelectItem value="price-low">দাম: কম → বেশি</SelectItem>
                      <SelectItem value="price-high">দাম: বেশি → কম</SelectItem>
                      <SelectItem value="discount">সর্বোচ্চ ডিসকাউন্ট</SelectItem>
                      <SelectItem value="popular">জনপ্রিয়</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPublishers.map(pub => (
                  <Badge key={pub} variant="secondary" className="gap-1 pr-1">
                    {pub}
                    <button onClick={() => setSelectedPublishers(prev => prev.filter(p => p !== pub))} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedWriters.map(wid => {
                  const w = productWriters.find(pw => pw.id === wid);
                  return (
                    <Badge key={wid} variant="secondary" className="gap-1 pr-1">
                      {w?.name || wid}
                      <button onClick={() => setSelectedWriters(prev => prev.filter(p => p !== wid))} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {showDiscounted && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    ডিসকাউন্ট
                    <button onClick={() => setShowDiscounted(false)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs text-destructive">
                  সব মুছুন
                </Button>
              </div>
            )}

            {/* Products Grid */}
            {productsLoading ? (
              <div className={`grid ${GRID_COL_CLASSES[columns] || GRID_COL_CLASSES[5]} gap-4`}>
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-lg" />
                ))}
              </div>
            ) : paginatedProducts.length > 0 ? (
              <>
                <div className={`grid ${GRID_COL_CLASSES[columns] || GRID_COL_CLASSES[5]} gap-4`}>
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      পূর্ববর্তী
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      পরবর্তী
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">কোনো পণ্য পাওয়া যায়নি</h3>
                <p className="text-muted-foreground mb-4">এই ক্যাটাগরিতে এখনো কোনো পণ্য যোগ করা হয়নি</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={clearAllFilters}>ফিল্টার মুছুন</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryDetail;
