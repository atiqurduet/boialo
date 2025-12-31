import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { sampleProducts, publishers } from "@/data/products";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Filter, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const author = searchParams.get("author");
  const writer = searchParams.get("writer"); // writer slug or ID from database
  const publisher = searchParams.get("publisher");
  const searchQuery = searchParams.get("search") || "";
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    publisher: true,
  });

  // Fetch categories from database
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

  // Fetch writers from database
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

  // Fetch publishers from database
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

  // Fetch products from database
  const { data: dbProducts = [] } = useQuery({
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
        .eq('is_preorder', false);
      return data || [];
    },
  });

  // Find matching writer info
  const getWriterInfo = () => {
    if (!writer) return null;
    return writers.find(w => w.slug === writer || w.id === writer);
  };

  // Find matching publisher info
  const getPublisherInfo = () => {
    if (!publisher) return null;
    return dbPublishers.find(p => p.slug === publisher || p.id === publisher);
  };

  // Find matching category info
  const getCategoryInfo = () => {
    if (!category) return null;
    return categories.find(c => c.slug === category || c.id === category);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Convert database products to Product interface
  const convertDbProduct = (dbProduct: any): Product => {
    const images = dbProduct.images as string[] || [];
    return {
      id: dbProduct.id,
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
    // Combine database products with sample products
    let allProducts: Product[] = [
      ...dbProducts.map(convertDbProduct),
      ...sampleProducts.filter((p) => !p.isPreorder)
    ];

    // Remove duplicates by ID
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex((p) => p.id === product.id)
    );

    let products = uniqueProducts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query)
      );
    }

    // Filter by category (slug or ID)
    if (category) {
      const categoryInfo = getCategoryInfo();
      
      // Get filtered database products by category
      const dbFiltered = dbProducts
        .filter(p => {
          if (categoryInfo) {
            return p.category?.slug === categoryInfo.slug || 
                   p.category?.id === categoryInfo.id ||
                   p.category_id === categoryInfo.id;
          }
          // Direct match for category slug
          return p.category?.slug === category || p.category_id === category;
        })
        .map(convertDbProduct);
      
      // Get filtered sample products by category
      const sampleFiltered = sampleProducts
        .filter(p => !p.isPreorder && p.category === category);
      
      products = [...dbFiltered, ...sampleFiltered];
    }

    // Filter by writer (from database - slug or ID)
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

    // Filter by author (from sample data - for backward compatibility)
    if (author) {
      products = products.filter((p) => p.author === author);
    }

    // Filter by publisher (slug, ID, or name)
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      if (publisherInfo) {
        // Filter from database products
        const dbFiltered = dbProducts
          .filter(p => 
            p.publisher_rel?.slug === publisherInfo.slug || 
            p.publisher_rel?.id === publisherInfo.id ||
            p.publisher_id === publisherInfo.id
          )
          .map(convertDbProduct);
        
        // Also check sample products by publisher name
        const sampleFiltered = sampleProducts
          .filter(p => p.publisher === publisherInfo.name_bn || p.publisher === publisherInfo.name_en);
        
        products = [...dbFiltered, ...sampleFiltered];
      } else {
        // Fallback to direct name match
        products = products.filter((p) => p.publisher === publisher);
      }
    }

    // Filter by price range
    products = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    return products;
  }, [searchQuery, category, author, writer, publisher, priceRange, dbProducts, categories, writers, dbPublishers]);

  const getCategoryTitle = () => {
    if (searchQuery) {
      return `"${searchQuery}" এর ফলাফল`;
    }
    
    // Writer filter
    if (writer) {
      const writerInfo = getWriterInfo();
      if (writerInfo) {
        return `লেখক: ${writerInfo.name_bn}`;
      }
      return `লেখক: ${writer}`;
    }
    
    // Author filter (backward compatibility)
    if (author) {
      return `লেখক: ${author}`;
    }
    
    // Publisher filter
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      if (publisherInfo) {
        return `প্রকাশনী: ${publisherInfo.name_bn}`;
      }
      return `প্রকাশনী: ${publisher}`;
    }
    
    // Category filter
    if (category) {
      const categoryInfo = getCategoryInfo();
      if (categoryInfo) {
        return categoryInfo.name_bn;
      }
      
      // Fallback category names
      switch (category) {
        case "academic":
          return "একাডেমিক বই";
        case "children":
          return "শিশু কিশোরদের বই";
        case "islamic":
          return "ইসলামি বই";
        case "history":
          return "ইতিহাস";
        case "biography":
          return "জীবনী";
        case "hadith":
          return "হাদীস";
        case "tafsir":
          return "তাফসীর";
        case "fiqh":
          return "ফিকহ";
        case "arabic":
          return "আরবি ভাষা";
        case "self-help":
          return "আত্মশুদ্ধি ও অনুপ্রেরণা";
        case "novel":
          return "উপন্যাস";
        case "literature":
          return "সাহিত্য";
        case "magazine":
          return "ম্যাগাজিন";
        default:
          return category;
      }
    }
    
    return "সকল বই";
  };

  // Generate SEO-friendly breadcrumb
  const getBreadcrumb = () => {
    if (writer) {
      const writerInfo = getWriterInfo();
      return (
        <>
          <Link to="/authors" className="hover:text-primary">লেখক</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{writerInfo?.name_bn || writer}</span>
        </>
      );
    }
    if (author) {
      return (
        <>
          <Link to="/authors" className="hover:text-primary">লেখক</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{author}</span>
        </>
      );
    }
    if (publisher) {
      const publisherInfo = getPublisherInfo();
      return (
        <>
          <Link to="/publishers" className="hover:text-primary">প্রকাশনী</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{publisherInfo?.name_bn || publisher}</span>
        </>
      );
    }
    if (category) {
      return (
        <>
          <span>বিষয়</span>
          <span className="mx-2">›</span>
          <span className="text-foreground">{getCategoryTitle()}</span>
        </>
      );
    }
    return <span className="text-foreground">সকল বই</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex flex-wrap items-center">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <span className="mx-2">›</span>
          {getBreadcrumb()}
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              ফিল্টার
            </Button>
            <Select defaultValue="new">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Released</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sidebar Filters */}
          <aside
            className={`${
              showFilters ? "fixed inset-0 z-50 bg-background p-4 overflow-y-auto" : "hidden"
            } lg:block lg:relative lg:w-64 lg:shrink-0`}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">ফিল্টার</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm space-y-6">
              {/* Price Range */}
              <div>
                <button
                  onClick={() => toggleSection("price")}
                  className="flex items-center justify-between w-full font-semibold mb-4"
                >
                  Price Range
                  {expandedSections.price ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.price && (
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={30000}
                      step={100}
                      className="mt-2"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Publishers */}
              <div>
                <button
                  onClick={() => toggleSection("publisher")}
                  className="flex items-center justify-between w-full font-semibold mb-4"
                >
                  প্রকাশক
                  {expandedSections.publisher ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.publisher && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dbPublishers.length > 0 ? (
                      dbPublishers.map((pub) => (
                        <Link
                          key={pub.id}
                          to={`/shop?publisher=${pub.slug}`}
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1"
                        >
                          <span>{pub.name_bn}</span>
                        </Link>
                      ))
                    ) : (
                      publishers.map((pub) => (
                        <label
                          key={pub.id}
                          className="filter-checkbox"
                        >
                          <Checkbox />
                          <span>
                            {pub.name} ({pub.count})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Apply Button */}
            <div className="lg:hidden mt-4">
              <Button
                className="w-full btn-primary"
                onClick={() => setShowFilters(false)}
              >
                ফিল্টার প্রয়োগ করুন
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{getCategoryTitle()}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {filteredProducts.length} Items Found
                </p>
              </div>
              <div className="hidden lg:block">
                <Select defaultValue="new">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Released</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">কোনো পণ্য পাওয়া যায়নি</h2>
                <p className="text-muted-foreground">
                  অন্য কোনো শব্দ দিয়ে অনুসন্ধান করুন
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="default" size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
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
