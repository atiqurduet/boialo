import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, BookOpen, ChevronRight, Search, Star, Clock, Shield, Grid3X3, List, Package, Monitor, Music, FileText, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const DigitalLibrary = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's digital purchases
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["digital-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("digital_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch digital products from digital_products table
  const { data: digitalProducts = [] } = useQuery({
    queryKey: ["digital-products-catalog", activeTab, search],
    queryFn: async () => {
      let q = supabase
        .from("digital_products")
        .select("*, ebook_metadata(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeTab === 'ebooks') q = q.eq('product_type', 'ebook');
      else if (activeTab === 'eproducts') q = q.neq('product_type', 'ebook');

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%`);

      const { data } = await q;
      return data || [];
    },
  });

  // Fetch product details for purchases (legacy)
  const { data: legacyProducts = [] } = useQuery({
    queryKey: ["legacy-digital-products", purchases.map((p: any) => p.product_id)],
    queryFn: async () => {
      if (purchases.length === 0) return [];
      const productIds = purchases.map((p: any) => p.product_id);
      const { data } = await supabase
        .from("products")
        .select("id, title_bn, title_en, images, is_digital, digital_file_url, digital_file_name")
        .in("id", productIds);
      return data || [];
    },
    enabled: purchases.length > 0,
  });

  const handleDownload = async (product: any, purchase: any) => {
    if (purchase.download_count >= purchase.max_downloads) {
      toast.error("ডাউনলোড সীমা শেষ হয়ে গেছে");
      return;
    }
    if (purchase.expires_at && new Date(purchase.expires_at) < new Date()) {
      toast.error("ডাউনলোড মেয়াদ শেষ হয়ে গেছে");
      return;
    }
    if (product.digital_file_url) {
      await supabase
        .from("digital_purchases")
        .update({ download_count: purchase.download_count + 1 })
        .eq("id", purchase.id);
      queryClient.invalidateQueries({ queryKey: ["digital-purchases"] });
      window.open(product.digital_file_url, "_blank");
      toast.success("ডাউনলোড শুরু হয়েছে");
    } else {
      toast.error("ফাইল পাওয়া যায়নি");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ebook': return BookOpen;
      case 'software': return Monitor;
      case 'audio': return Music;
      case 'video': return FileText;
      default: return Package;
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      ebook: 'ই-বুক', software: 'সফটওয়্যার', audio: 'অডিও', video: 'ভিডিও',
      template: 'টেমপ্লেট', course: 'কোর্স', graphics: 'গ্রাফিক্স'
    };
    return map[type] || type;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">লগইন করুন</h2>
          <p className="text-muted-foreground mb-4">আপনার ডিজিটাল লাইব্রেরি দেখতে লগইন করুন</p>
          <Link to="/signin"><Button>লগইন করুন</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">ডিজিটাল লাইব্রেরি</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 md:p-10 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-primary rounded-xl"><BookOpen className="w-6 h-6 text-primary-foreground" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">আমার ডিজিটাল লাইব্রেরি</h1>
              <p className="text-muted-foreground text-sm">আপনার সকল ডিজিটাল কন্টেন্ট এক জায়গায়</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-card/80 backdrop-blur rounded-lg px-4 py-2 border">
              <p className="text-2xl font-bold text-primary">{purchases.length}</p>
              <p className="text-xs text-muted-foreground">ক্রয়কৃত আইটেম</p>
            </div>
            <div className="bg-card/80 backdrop-blur rounded-lg px-4 py-2 border">
              <p className="text-2xl font-bold text-primary">{digitalProducts.filter(p => p.product_type === 'ebook').length}</p>
              <p className="text-xs text-muted-foreground">ই-বুক উপলব্ধ</p>
            </div>
            <div className="bg-card/80 backdrop-blur rounded-lg px-4 py-2 border">
              <p className="text-2xl font-bold text-primary">{digitalProducts.filter(p => p.product_type !== 'ebook').length}</p>
              <p className="text-xs text-muted-foreground">ই-প্রোডাক্ট</p>
            </div>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="ডিজিটাল কন্টেন্ট খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}><Grid3X3 className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all"><Package className="w-4 h-4 mr-1" /> সব</TabsTrigger>
            <TabsTrigger value="purchases"><Download className="w-4 h-4 mr-1" /> আমার ক্রয়</TabsTrigger>
            <TabsTrigger value="ebooks"><BookOpen className="w-4 h-4 mr-1" /> ই-বুক</TabsTrigger>
            <TabsTrigger value="eproducts"><Monitor className="w-4 h-4 mr-1" /> ই-প্রোডাক্ট</TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            {purchases.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">এখনো কোনো ডিজিটাল পণ্য কেনা হয়নি</p>
                <Link to="/shop" className="text-primary hover:underline mt-2 inline-block">শপে যান</Link>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {purchases.map((purchase: any) => {
                  const product = legacyProducts.find((p: any) => p.id === purchase.product_id);
                  if (!product) return null;
                  const images = (product.images as string[]) || [];
                  const isExpired = purchase.expires_at && new Date(purchase.expires_at) < new Date();
                  const limitReached = purchase.download_count >= purchase.max_downloads;
                  const downloadPercent = Math.round((purchase.download_count / purchase.max_downloads) * 100);

                  if (viewMode === 'list') {
                    return (
                      <div key={purchase.id} className="flex items-center gap-4 bg-card rounded-xl p-4 border hover:shadow-md transition">
                        <img src={images[0] || "/placeholder.svg"} alt="" className="w-14 h-20 object-cover rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{product.title_bn || product.title_en}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {purchase.download_count}/{purchase.max_downloads}</span>
                            {isExpired && <Badge variant="destructive" className="text-[10px]">মেয়াদ শেষ</Badge>}
                            {limitReached && !isExpired && <Badge variant="secondary" className="text-[10px]">সীমা পূর্ণ</Badge>}
                          </div>
                        </div>
                        <Button size="sm" disabled={isExpired || limitReached} onClick={() => handleDownload(product, purchase)}>
                          <Download className="w-4 h-4 mr-1" /> ডাউনলোড
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div key={purchase.id} className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition group">
                      <div className="flex gap-4 p-4">
                        <img src={images[0] || "/placeholder.svg"} alt="" className="w-20 h-28 object-cover rounded-lg" />
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-2">{product.title_bn || product.title_en}</h3>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Download className="w-3 h-3" /> ডাউনলোড: {purchase.download_count}/{purchase.max_downloads}
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${downloadPercent}%` }} />
                            </div>
                          </div>
                          {isExpired && <Badge variant="destructive" className="mt-2 text-[10px]">মেয়াদ শেষ</Badge>}
                          {limitReached && !isExpired && <Badge variant="secondary" className="mt-2 text-[10px]">সীমা পূর্ণ</Badge>}
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <Button className="w-full" size="sm" disabled={isExpired || limitReached} onClick={() => handleDownload(product, purchase)}>
                          <Download className="w-4 h-4 mr-2" /> ডাউনলোড করুন
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* All / Ebooks / Eproducts catalog */}
          {['all', 'ebooks', 'eproducts'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {digitalProducts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">কোনো ডিজিটাল কন্টেন্ট পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "space-y-3"}>
                  {digitalProducts.map((product: any) => {
                    const TypeIcon = getTypeIcon(product.product_type);
                    const meta = product.ebook_metadata?.[0];

                    if (viewMode === 'list') {
                      return (
                        <div key={product.id} className="flex items-center gap-4 bg-card rounded-xl p-4 border hover:shadow-md transition">
                          <img src={product.cover_image || '/placeholder.svg'} alt="" className="w-14 h-20 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{product.title_bn}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] gap-1"><TypeIcon className="w-3 h-3" />{getTypeLabel(product.product_type)}</Badge>
                              {meta?.author && <span className="text-xs text-muted-foreground">{meta.author}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            {product.is_free ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">ফ্রি</Badge>
                            ) : (
                              <span className="font-bold text-primary">৳{product.price}</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={product.id} className="group bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1 backdrop-blur-sm">
                              <TypeIcon className="w-2.5 h-2.5" /> {getTypeLabel(product.product_type)}
                            </Badge>
                          </div>
                          {product.discount_percent > 0 && (
                            <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                              -{product.discount_percent}%
                            </div>
                          )}
                          {product.is_featured && (
                            <div className="absolute bottom-2 left-2 z-10">
                              <Badge variant="secondary" className="text-[10px] gap-0.5"><Star className="w-2.5 h-2.5" /> ফিচার্ড</Badge>
                            </div>
                          )}
                          <div className="aspect-[3/4] overflow-hidden bg-muted">
                            <img src={product.cover_image || '/placeholder.svg'} alt={product.title_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{product.title_bn}</h3>
                          {meta?.author && <p className="text-xs text-muted-foreground line-clamp-1">{meta.author}</p>}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {product.is_free ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">ফ্রি</Badge>
                              ) : (
                                <>
                                  <span className="font-bold text-primary">৳{product.price}</span>
                                  {product.original_price > product.price && (
                                    <span className="text-xs text-muted-foreground line-through">৳{product.original_price}</span>
                                  )}
                                </>
                              )}
                            </div>
                            {meta?.format && <Badge variant="outline" className="text-[10px] uppercase">{meta.format}</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default DigitalLibrary;
