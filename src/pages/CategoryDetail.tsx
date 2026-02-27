import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard } from "@/components/ProductCard";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronRight, ArrowLeft, Grid3X3, List, BookOpen } from "lucide-react";
import { PageHeroBanner } from "@/components/PageHeroBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

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

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

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

  // Fetch parent category if exists
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
        .order('name_bn');
      return data || [];
    },
    enabled: !!category?.id,
  });

  // Fetch all categories for subcategory product counting
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

  // Get all descendant category IDs (for including subcategory products)
  const getAllDescendantIds = (categoryId: string): string[] => {
    const directChildren = allCategories.filter(c => c.parent_id === categoryId);
    const descendantIds = directChildren.map(c => c.id);
    directChildren.forEach(child => {
      descendantIds.push(...getAllDescendantIds(child.id));
    });
    return descendantIds;
  };

  // Fetch products for this category and all subcategories
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', category?.id, allCategories],
    queryFn: async () => {
      if (!category?.id) return [];
      
      // Include this category and all descendants
      const categoryIds = [category.id, ...getAllDescendantIds(category.id)];
      
      const { data } = await supabase
        .from('products')
        .select(`
          id, title_bn, slug, price, original_price, images,
          is_preorder, discount_percent, stock_quantity, author
        `)
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      return data || [];
    },
    enabled: !!category?.id && allCategories.length > 0,
  });

  // Convert to Product format
  const convertedProducts: Product[] = useMemo(() => {
    return products.map((p: any) => ({
      id: p.id,
      title: p.title_bn,
      slug: p.slug,
      author: p.author || 'অজানা লেখক',
      price: p.original_price && p.discount_percent ? Math.round(p.price) : p.price,
      originalPrice: p.original_price || p.price,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '/placeholder.svg',
      discount: p.discount_percent || 0,
      isPreorder: p.is_preorder,
    }));
  }, [products]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...convertedProducts];
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'discount':
        return sorted.sort((a, b) => b.discount - a.discount);
      default:
        return sorted;
    }
  }, [convertedProducts, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
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

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <PageHeroBanner
        title={category.name_bn}
        subtitle={category.name_en || undefined}
        breadcrumbs={[
          { label: "হোম", href: "/" },
          { label: "শপ", href: "/shop" },
          ...(parentCategory ? [{ label: parentCategory.name_bn, href: `/categories/${parentCategory.slug}` }] : []),
          { label: category.name_bn },
        ]}
        productCount={sortedProducts.length}
        image={category.image_url}
        icon={<BookOpen className="w-6 h-6 md:w-7 md:h-7 text-primary" />}
      >
        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub: any) => (
              <Link
                key={sub.id}
                to={`/categories/${sub.slug}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground rounded-full transition-all border border-border/50 shadow-sm"
              >
                {sub.image_url && (
                  <img src={sub.image_url} alt={sub.name_bn} className="w-5 h-5 rounded-full object-cover" />
                )}
                <span>{sub.name_bn}</span>
              </Link>
            ))}
          </div>
        )}
      </PageHeroBanner>

      <main className="container py-8">
        {/* Filters & Sorting */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-card"
          >
            <option value="new">নতুন আগে</option>
            <option value="price-low">দাম: কম থেকে বেশি</option>
            <option value="price-high">দাম: বেশি থেকে কম</option>
            <option value="discount">ডিসকাউন্ট অনুযায়ী</option>
          </select>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : paginatedProducts.length > 0 ? (
          <>
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "flex flex-col gap-4"
            }>
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  পূর্ববর্তী
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
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
            <Button variant="outline" onClick={() => navigate('/shop')}>
              সব পণ্য দেখুন
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CategoryDetail;
