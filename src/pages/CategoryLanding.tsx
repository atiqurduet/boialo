import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Grid3X3, List, SlidersHorizontal } from "lucide-react";
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

type ProductType = 'lifestyle' | 'stationery' | 'food';

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  product_type: ProductType;
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
  product_type: ProductType;
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  lifestyle: 'লাইফস্টাইল',
  stationery: 'স্টেশনারী',
  food: 'ফুড',
};

const CategoryLanding = () => {
  const { type, slug } = useParams<{ type: string; slug?: string }>();
  const productType = type as ProductType;
  
  const [categories, setCategories] = useState<UniversalCategory[]>([]);
  const [products, setProducts] = useState<UniversalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const currentCategory = useMemo(() => {
    if (!slug) return null;
    return categories.find(c => c.slug === slug);
  }, [categories, slug]);

  const subcategories = useMemo(() => {
    if (!currentCategory) {
      return categories.filter(c => c.product_type === productType && !c.parent_id);
    }
    return categories.filter(c => c.parent_id === currentCategory.id);
  }, [categories, currentCategory, productType]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch categories
        const { data: catData } = await supabase
          .from('universal_categories')
          .select('*')
          .eq('product_type', productType)
          .eq('is_active', true)
          .order('sort_order');
        
        setCategories(catData || []);

        // Fetch products
        let query = supabase
          .from('universal_products')
          .select('*')
          .eq('product_type', productType)
          .eq('is_active', true);

        if (slug && catData) {
          const cat = catData.find(c => c.slug === slug);
          if (cat) {
            // Get all subcategory IDs
            const subCatIds = catData.filter(c => c.parent_id === cat.id).map(c => c.id);
            const allCatIds = [cat.id, ...subCatIds];
            query = query.in('category_id', allCatIds);
          }
        }

        const { data: prodData } = await query.order('created_at', { ascending: false });
        setProducts(prodData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productType) {
      fetchData();
    }
  }, [productType, slug]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, slug]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-high":
        return sorted.sort((a, b) => b.price - a.price);
      case "popular":
        return sorted.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
      case "newest":
      default:
        return sorted;
    }
  }, [products, sortBy]);

  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const pageTitle = currentCategory?.name_bn || PRODUCT_TYPE_LABELS[productType] || 'প্রোডাক্ট';
  const pageDescription = currentCategory?.description_bn || `${pageTitle} - সেরা কালেকশন`;

  // Set document title for SEO
  useEffect(() => {
    document.title = currentCategory?.meta_title || `${pageTitle} | আমাদের শপ`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', currentCategory?.meta_description || pageDescription);
    }
  }, [currentCategory, pageTitle, pageDescription]);

  const getProductImage = (product: UniversalProduct): string => {
    if (!product.images || product.images.length === 0) return '/placeholder.svg';
    return product.images[0];
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
            <Link to="/" className="text-muted-foreground hover:text-primary">হোম</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link to={`/category/${productType}`} className="text-muted-foreground hover:text-primary">
              {PRODUCT_TYPE_LABELS[productType]}
            </Link>
            {currentCategory && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{currentCategory.name_bn}</span>
              </>
            )}
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>

          {/* Subcategories */}
          {subcategories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">সাবক্যাটাগরি</h2>
              <div className="flex flex-wrap gap-3">
                {subcategories.map((subcat) => (
                  <Link
                    key={subcat.id}
                    to={`/category/${productType}/${subcat.slug}`}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    {subcat.name_bn}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Sort */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <p className="text-muted-foreground">
              {sortedProducts.length} টি প্রোডাক্ট পাওয়া গেছে
            </p>
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="সাজান" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">নতুন</SelectItem>
                  <SelectItem value="price-low">মূল্য: কম থেকে বেশি</SelectItem>
                  <SelectItem value="price-high">মূল্য: বেশি থেকে কম</SelectItem>
                  <SelectItem value="popular">জনপ্রিয়</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/universal-product/${product.slug}`}
                  className="group bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-square">
                    {product.discount_percent && product.discount_percent > 0 && (
                      <Badge className="absolute top-2 right-2 bg-destructive">
                        -{product.discount_percent}%
                      </Badge>
                    )}
                    {product.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-primary">
                        ফিচার্ড
                      </Badge>
                    )}
                    <img
                      src={getProductImage(product)}
                      alt={product.name_bn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name_bn}
                    </h3>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-primary font-bold">৳{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-muted-foreground line-through text-sm">
                          ৳{product.original_price}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/universal-product/${product.slug}`}
                  className="flex gap-4 bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow p-4"
                >
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img
                      src={getProductImage(product)}
                      alt={product.name_bn}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium text-lg hover:text-primary transition-colors">
                      {product.name_bn}
                    </h3>
                    <p className="text-sm text-muted-foreground">{product.name_en}</p>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground mt-1">ব্র্যান্ড: {product.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-primary font-bold text-lg">৳{product.price}</span>
                      {product.original_price && product.original_price > product.price && (
                        <span className="text-muted-foreground line-through">
                          ৳{product.original_price}
                        </span>
                      )}
                      {product.discount_percent && product.discount_percent > 0 && (
                        <Badge variant="destructive">-{product.discount_percent}%</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
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
                    return <span key={page}>...</span>;
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                পরবর্তী
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryLanding;
