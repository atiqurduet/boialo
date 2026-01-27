import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers, BookOpen, ShoppingBag, Utensils, Pencil } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  product_type: string;
}

type CombinedCategory = (Category | UniversalCategory) & { type: 'book' | 'universal' };

const productTypeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  lifestyle: { label: 'লাইফস্টাইল', icon: <ShoppingBag className="w-4 h-4" /> },
  stationery: { label: 'স্টেশনারি', icon: <Pencil className="w-4 h-4" /> },
  food: { label: 'খাবার', icon: <Utensils className="w-4 h-4" /> },
};

const Categories = () => {
  const [bookCategories, setBookCategories] = useState<Category[]>([]);
  const [universalCategories, setUniversalCategories] = useState<UniversalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const fetchAllCategories = async () => {
    try {
      const [bookRes, universalRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('universal_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      ]);

      if (bookRes.error) throw bookRes.error;
      if (universalRes.error) throw universalRes.error;

      setBookCategories(bookRes.data || []);
      setUniversalCategories(universalRes.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [bookCategories, universalCategories, activeTab]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollability, 300);
    }
  };

  // Book categories helpers
  const parentBookCategories = bookCategories.filter(c => !c.parent_id);
  const getBookSubCategories = (parentId: string) => bookCategories.filter(c => c.parent_id === parentId);
  
  // Universal categories helpers
  const parentUniversalCategories = universalCategories.filter(c => !c.parent_id);
  const getUniversalSubCategories = (parentId: string) => universalCategories.filter(c => c.parent_id === parentId);

  // Get unique product types
  const productTypes = [...new Set(universalCategories.map(c => c.product_type))];

  // Get all parent categories combined
  const getAllParentCategories = (): CombinedCategory[] => {
    const bookCats: CombinedCategory[] = parentBookCategories.map(c => ({ ...c, type: 'book' as const }));
    const universalCats: CombinedCategory[] = parentUniversalCategories.map(c => ({ ...c, type: 'universal' as const }));
    return [...bookCats, ...universalCats];
  };

  // Get filtered categories based on active tab
  const getFilteredCategories = (): CombinedCategory[] => {
    if (activeTab === 'all') return getAllParentCategories();
    if (activeTab === 'books') return parentBookCategories.map(c => ({ ...c, type: 'book' as const }));
    return parentUniversalCategories
      .filter(c => c.product_type === activeTab)
      .map(c => ({ ...c, type: 'universal' as const }));
  };

  // Get category link based on type
  const getCategoryLink = (category: CombinedCategory): string => {
    if (category.type === 'book') {
      return `/categories/${category.slug}`;
    }
    return `/category/${(category as UniversalCategory & { type: 'universal' }).product_type}/${category.slug}`;
  };

  // Get subcategories for a category
  const getSubCategories = (category: CombinedCategory) => {
    if (category.type === 'book') {
      return getBookSubCategories(category.id);
    }
    return getUniversalSubCategories(category.id);
  };

  // Get icon for category type
  const getCategoryIcon = (category: CombinedCategory) => {
    if (category.type === 'book') {
      return <BookOpen className="w-6 h-6 text-muted-foreground" />;
    }
    const productType = (category as UniversalCategory & { type: 'universal' }).product_type;
    return productTypeConfig[productType]?.icon || <Layers className="w-6 h-6 text-muted-foreground" />;
  };

  const filteredCategories = getFilteredCategories();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">সকল ক্যাটাগরি</h1>
          <p className="text-muted-foreground">আমাদের সমস্ত পণ্য ক্যাটাগরি দেখুন</p>
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              সব
            </TabsTrigger>
            <TabsTrigger value="books" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              বই
            </TabsTrigger>
            {productTypes.map(type => (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                {productTypeConfig[type]?.icon}
                {productTypeConfig[type]?.label || type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Main Categories Carousel Section */}
        <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {activeTab === 'all' ? 'জনপ্রিয় ক্যাটাগরি' : 
               activeTab === 'books' ? 'বই ক্যাটাগরি' : 
               productTypeConfig[activeTab]?.label + ' ক্যাটাগরি'}
            </h2>
          </div>

          <div className="relative group">
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/95 hover:bg-background shadow-xl rounded-full p-3 transition-all duration-300 border-2 border-primary/20 hover:border-primary hover:scale-110 -translate-x-4"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6 text-primary" />
              </button>
            )}

            {/* Categories Scroll Container */}
            <div
              ref={scrollRef}
              onScroll={checkScrollability}
              className="flex gap-6 md:gap-8 overflow-x-auto scrollbar-hide scroll-smooth py-4 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredCategories.map((category) => {
                const subCategories = getSubCategories(category);
                return (
                  <Link
                    key={`${category.type}-${category.id}`}
                    to={getCategoryLink(category)}
                    className="flex-shrink-0 flex flex-col items-center gap-3 group/item transition-all duration-300 hover:-translate-y-2"
                  >
                    {/* Circular Image with Gradient Border */}
                    <div className="relative">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-br from-primary via-primary/60 to-secondary shadow-lg group-hover/item:shadow-xl group-hover/item:shadow-primary/30 transition-all duration-300">
                        <div className="w-full h-full rounded-full overflow-hidden bg-background">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name_bn}
                              className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                              {getCategoryIcon(category)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Subcategory Count Badge */}
                      {subCategories.length > 0 && (
                        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                          +{subCategories.length}
                        </span>
                      )}

                      {/* Type Badge */}
                      {activeTab === 'all' && (
                        <span className="absolute -top-1 -left-1 bg-secondary text-secondary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-md">
                          {category.type === 'book' ? '📚' : 
                           (category as UniversalCategory & { type: 'universal' }).product_type === 'lifestyle' ? '🛍️' :
                           (category as UniversalCategory & { type: 'universal' }).product_type === 'stationery' ? '✏️' : '🍽️'}
                        </span>
                      )}
                    </div>

                    {/* Category Name */}
                    <span className="text-sm md:text-base font-medium text-center text-muted-foreground group-hover/item:text-primary transition-colors duration-300 max-w-[100px] line-clamp-2">
                      {category.name_bn}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/95 hover:bg-background shadow-xl rounded-full p-3 transition-all duration-300 border-2 border-primary/20 hover:border-primary hover:scale-110 translate-x-4"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6 text-primary" />
              </button>
            )}
          </div>
        </section>

        {/* All Categories Grid Section */}
        <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">সকল ক্যাটাগরি তালিকা</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {filteredCategories.map((category) => {
              const subCategories = getSubCategories(category);
              return (
                <div key={`grid-${category.type}-${category.id}`} className="space-y-3">
                  {/* Parent Category */}
                  <Link
                    to={getCategoryLink(category)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all duration-300 group"
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-background">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name_bn}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            {getCategoryIcon(category)}
                          </div>
                        )}
                      </div>
                      {/* Type indicator */}
                      {activeTab === 'all' && (
                        <span className="absolute -top-1 -right-1 text-xs">
                          {category.type === 'book' ? '📚' : 
                           (category as UniversalCategory & { type: 'universal' }).product_type === 'lifestyle' ? '🛍️' :
                           (category as UniversalCategory & { type: 'universal' }).product_type === 'stationery' ? '✏️' : '🍽️'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-center text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {category.name_bn}
                    </span>
                  </Link>

                  {/* Subcategories */}
                  {subCategories.length > 0 && (
                    <div className="pl-2 space-y-1">
                      {subCategories.slice(0, 3).map((sub) => (
                        <Link
                          key={sub.id}
                          to={category.type === 'book' 
                            ? `/categories/${sub.slug}`
                            : `/category/${(category as UniversalCategory & { type: 'universal' }).product_type}/${sub.slug}`
                          }
                          className="block text-xs text-muted-foreground hover:text-primary transition-colors truncate"
                        >
                          • {sub.name_bn}
                        </Link>
                      ))}
                      {subCategories.length > 3 && (
                        <Link
                          to={getCategoryLink(category)}
                          className="block text-xs text-primary hover:underline"
                        >
                          +{subCategories.length - 3} আরও
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              এই ধরণের কোনো ক্যাটাগরি পাওয়া যায়নি
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
