import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ChevronLeft, SlidersHorizontal, X, Package, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  product_type: string;
  parent_id: string | null;
  description_bn: string | null;
  description_en: string | null;
  meta_title: string | null;
  meta_description: string | null;
  image_url: string | null;
}

interface UniversalProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  images: any;
  brand: string | null;
  is_featured: boolean;
  category_id: string | null;
  product_type: string;
  stock_quantity: number | null;
}

const GRID_COL_CLASSES: Record<number, string> = {
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  7: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  lifestyle: 'লাইফস্টাইল',
  stationery: 'স্টেশনারী',
  food: 'ফুড',
};

const CategoryLanding = () => {
  const { productType: urlProductType, categorySlug } = useParams<{ productType: string; categorySlug?: string }>();
  const productType = urlProductType || '';
  const { getLabel: getTypeLabel } = useProductTypes();
  const { addToCart } = useCartContext();
  const { isInWishlist, toggleWishlist } = useWishlistContext();

  const [categories, setCategories] = useState<UniversalCategory[]>([]);
  const [products, setProducts] = useState<UniversalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("new");
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState(5);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const productsPerPage = 24;

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [showInStock, setShowInStock] = useState(false);
  const [showDiscounted, setShowDiscounted] = useState(false);

  // Subcategory scroll
  const subScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const currentCategory = useMemo(() => {
    if (!categorySlug) return null;
    return categories.find(c => c.slug === categorySlug);
  }, [categories, categorySlug]);

  const parentCategory = useMemo(() => {
    if (!currentCategory?.parent_id) return null;
    return categories.find(c => c.id === currentCategory.parent_id);
  }, [categories, currentCategory]);

  const subcategories = useMemo(() => {
    if (!currentCategory) {
      return categories.filter(c => c.product_type === productType && !c.parent_id);
    }
    return categories.filter(c => c.parent_id === currentCategory.id);
  }, [categories, currentCategory, productType]);

  // Extract unique brands from products
  const availableBrands = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    products.forEach(p => {
      if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });
    return Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  // Get price range from products
  const productPriceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 50000 };
    const prices = products.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: catData } = await supabase
          .from('universal_categories')
          .select('*')
          .eq('product_type', productType)
          .eq('is_active', true)
          .order('sort_order');
        
        setCategories(catData || []);

        let query = supabase
          .from('universal_products')
          .select('*')
          .eq('product_type', productType)
          .eq('is_active', true);

        if (categorySlug && catData) {
          const cat = catData.find(c => c.slug === categorySlug);
          if (cat) {
            const subCatIds = catData.filter(c => c.parent_id === cat.id).map(c => c.id);
            const allCatIds = [cat.id, ...subCatIds];
            query = query.in('category_id', allCatIds);
          }
        }

        const { data: prodData } = await query.order('created_at', { ascending: false });
        setProducts(prodData || []);
        
        if (prodData && prodData.length > 0) {
          const prices = prodData.map(p => p.price);
          setPriceRange([Math.min(...prices), Math.max(...prices)]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productType) {
      fetchData();
    }
  }, [productType, categorySlug]);

  // Reset filters on category change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBrands([]);
    setSelectedSubcategories([]);
    setShowInStock(false);
    setShowDiscounted(false);
  }, [categorySlug, productType]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, priceRange, selectedBrands, selectedSubcategories, showInStock, showDiscounted]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
      if (selectedBrands.length > 0 && (!product.brand || !selectedBrands.includes(product.brand))) return false;
      if (selectedSubcategories.length > 0 && (!product.category_id || !selectedSubcategories.includes(product.category_id))) return false;
      if (showInStock && (product.stock_quantity === null || product.stock_quantity <= 0)) return false;
      if (showDiscounted && (!product.discount_percent || product.discount_percent <= 0)) return false;
      return true;
    });
  }, [products, priceRange, selectedBrands, selectedSubcategories, showInStock, showDiscounted]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case "price-low": return sorted.sort((a, b) => a.price - b.price);
      case "price-high": return sorted.sort((a, b) => b.price - a.price);
      case "discount": return sorted.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
      case "popular": return sorted.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
      default: return sorted;
    }
  }, [filteredProducts, sortBy]);

  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priceRange[0] > productPriceRange.min || priceRange[1] < productPriceRange.max) count++;
    if (selectedBrands.length > 0) count++;
    if (selectedSubcategories.length > 0) count++;
    if (showInStock) count++;
    if (showDiscounted) count++;
    return count;
  }, [priceRange, productPriceRange, selectedBrands, selectedSubcategories, showInStock, showDiscounted]);

  const clearAllFilters = () => {
    setPriceRange([productPriceRange.min, productPriceRange.max]);
    setSelectedBrands([]);
    setSelectedSubcategories([]);
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

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(productId);
    toast.success("কার্টে যোগ করা হয়েছে");
  };

  const handleToggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productId);
  };

  const getProductImage = (product: UniversalProduct): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  const pageTitle = currentCategory?.name_bn || getTypeLabel(productType) || PRODUCT_TYPE_LABELS[productType] || 'প্রোডাক্ট';
  const catDesc = currentCategory?.meta_description || `${pageTitle} - সেরা কালেকশন`;

  useEffect(() => {
    document.title = currentCategory?.meta_title || `${pageTitle} | বইআলো`;
  }, [currentCategory, pageTitle]);

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

      <Accordion type="multiple" defaultValue={["price", "brands", "categories", "availability"]} className="w-full">
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
                  ৳{priceRange[0]}
                </div>
                <span className="text-muted-foreground text-xs">—</span>
                <div className="flex-1 border rounded-md px-2 py-1 text-center text-sm bg-muted/30">
                  ৳{priceRange[1]}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brands */}
        {availableBrands.length > 0 && (
          <AccordionItem value="brands">
            <AccordionTrigger className="text-sm font-semibold py-3">ব্র্যান্ড</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {availableBrands.slice(0, 20).map(({ name, count }) => (
                  <div key={name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${name}`}
                      checked={selectedBrands.includes(name)}
                      onCheckedChange={() =>
                        setSelectedBrands(prev =>
                          prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
                        )
                      }
                    />
                    <label htmlFor={`brand-${name}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                      <span className="line-clamp-1">{name}</span>
                      <span className="text-muted-foreground text-xs ml-1">({count})</span>
                    </label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <AccordionItem value="categories">
            <AccordionTrigger className="text-sm font-semibold py-3">সাবক্যাটাগরি</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {subcategories.map((subcat) => (
                  <div key={subcat.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${subcat.id}`}
                      checked={selectedSubcategories.includes(subcat.id)}
                      onCheckedChange={() =>
                        setSelectedSubcategories(prev =>
                          prev.includes(subcat.id) ? prev.filter(c => c !== subcat.id) : [...prev, subcat.id]
                        )
                      }
                    />
                    <label htmlFor={`cat-${subcat.id}`} className="text-sm cursor-pointer flex-1">
                      {subcat.name_bn}
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
                <Checkbox id="in-stock-u" checked={showInStock} onCheckedChange={(c) => setShowInStock(c as boolean)} />
                <label htmlFor="in-stock-u" className="text-sm cursor-pointer">শুধু স্টকে আছে</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="discounted-u" checked={showDiscounted} onCheckedChange={(c) => setShowDiscounted(c as boolean)} />
                <label htmlFor="discounted-u" className="text-sm cursor-pointer">শুধু ডিসকাউন্ট প্রোডাক্ট</label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={currentCategory?.meta_title || `${pageTitle} | বইআলো`}
        description={catDesc}
        keywords={`${pageTitle}, প্রোডাক্ট, বইআলো`}
        canonicalUrl={`https://boialo.com/category/${productType}${categorySlug ? '/' + categorySlug : ''}`}
        breadcrumbs={[
          { name: 'হোম', url: '/' },
          { name: getTypeLabel(productType) || PRODUCT_TYPE_LABELS[productType] || productType, url: `/category/${productType}` },
          ...(currentCategory ? [{ name: currentCategory.name_bn, url: `/category/${productType}/${categorySlug}` }] : []),
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">হোম</Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <Link to={`/category/${productType}`} className="text-muted-foreground hover:text-primary transition-colors">
            {getTypeLabel(productType) || PRODUCT_TYPE_LABELS[productType] || productType}
          </Link>
          {parentCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <Link to={`/category/${productType}/${parentCategory.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                {parentCategory.name_bn}
              </Link>
            </>
          )}
          {currentCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-foreground font-medium">{currentCategory.name_bn}</span>
            </>
          )}
        </nav>

        {/* Category Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{pageTitle}</h1>

        {/* Subcategories - horizontal scrollable carousel */}
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
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/category/${productType}/${sub.slug}`}
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
            {/* Top bar */}
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
                  <span className="font-semibold text-foreground">{sortedProducts.length}</span> টি প্রোডাক্ট
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
                  <span className="text-sm text-muted-foreground hidden sm:inline">সর্ট:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">নতুন</SelectItem>
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
                {selectedBrands.map(brand => (
                  <Badge key={brand} variant="secondary" className="gap-1 pr-1">
                    {brand}
                    <button onClick={() => setSelectedBrands(prev => prev.filter(b => b !== brand))} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedSubcategories.map(catId => {
                  const sc = subcategories.find(s => s.id === catId);
                  return (
                    <Badge key={catId} variant="secondary" className="gap-1 pr-1">
                      {sc?.name_bn || catId}
                      <button onClick={() => setSelectedSubcategories(prev => prev.filter(c => c !== catId))} className="ml-1 hover:text-destructive">
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
                {showInStock && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    স্টকে আছে
                    <button onClick={() => setShowInStock(false)} className="ml-1 hover:text-destructive">
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
            {paginatedProducts.length > 0 ? (
              <>
                <div className={`grid ${GRID_COL_CLASSES[columns] || GRID_COL_CLASSES[5]} gap-4`}>
                  {paginatedProducts.map((product) => {
                    const inWishlist = isInWishlist(product.id);
                    return (
                      <div key={product.id} className="relative group product-card">
                        <button
                          onClick={(e) => handleToggleWishlist(e, product.id)}
                          className={cn(
                            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-20 transition-all shadow-md",
                            inWishlist ? "bg-red-500 text-white" : "bg-white/90 text-muted-foreground hover:bg-white hover:text-red-500"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
                        </button>

                        {product.discount_percent && product.discount_percent > 0 && (
                          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded z-10">
                            -{product.discount_percent}%
                          </div>
                        )}

                        <Link to={`/universal-product/${product.slug}`}>
                          <div className="aspect-square overflow-hidden rounded-t-lg relative">
                            <img
                              src={getProductImage(product)}
                              alt={product.name_bn}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                            />
                            <button
                              onClick={(e) => handleAddToCart(e, product.id)}
                              className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground py-2.5 text-sm font-medium flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              অর্ডার করুন
                            </button>
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                              {product.name_bn}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                              {product.brand || product.name_en}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-bold">৳{product.price}</span>
                              {product.original_price && product.original_price > product.price && (
                                <span className="text-muted-foreground line-through text-xs">৳{product.original_price}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
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
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
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
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">কোনো প্রোডাক্ট পাওয়া যায়নি</h3>
                <p className="text-muted-foreground mb-4">এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট যোগ করা হয়নি</p>
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

export default CategoryLanding;
