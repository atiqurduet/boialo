import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ShoppingCart, Heart, Share2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { toast } from "sonner";

type ProductType = 'lifestyle' | 'stationery' | 'food';

interface UniversalProduct {
  id: string;
  product_type: ProductType;
  name_bn: string;
  name_en: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  stock_quantity: number;
  images: any;
  video_url: string | null;
  short_description_bn: string | null;
  short_description_en: string | null;
  long_description_bn: string | null;
  long_description_en: string | null;
  brand: string | null;
  manufacturer: string | null;
  weight: string | null;
  dimensions: string | null;
  ingredients: string | null;
  warranty: string | null;
  delivery_time: string | null;
  return_policy: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  is_active: boolean;
  is_featured: boolean;
}

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  product_type: ProductType;
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  lifestyle: 'লাইফস্টাইল',
  stationery: 'স্টেশনারী',
  food: 'ফুড',
};

const UniversalProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<UniversalProduct | null>(null);
  const [category, setCategory] = useState<UniversalCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart } = useCartContext();
  const { toggleWishlist, isInWishlist } = useWishlistContext();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('universal_products')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setProduct(data);

        // Fetch category if exists
        if (data?.category_id) {
          const { data: catData } = await supabase
            .from('universal_categories')
            .select('*')
            .eq('id', data.category_id)
            .single();
          setCategory(catData);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Set SEO meta tags
  useEffect(() => {
    if (product) {
      document.title = product.meta_title || `${product.name_bn} | আমাদের শপ`;
      
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', product.meta_description || product.short_description_bn || '');
      }

      // Update OG tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', product.og_title || product.name_bn);
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', product.og_description || product.short_description_bn || '');
      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && product.images?.[0]) ogImage.setAttribute('content', product.og_image || product.images[0]);
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    await addToCart(product.id, quantity);
    toast.success('কার্টে যোগ করা হয়েছে');
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    
    toggleWishlist(product.id);
    if (isInWishlist(product.id)) {
      toast.success('উইশলিস্ট থেকে সরানো হয়েছে');
    } else {
      toast.success('উইশলিস্টে যোগ করা হয়েছে');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name_bn,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('লিংক কপি করা হয়েছে');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">প্রোডাক্ট পাওয়া যায়নি</h1>
          <Link to="/" className="text-primary hover:underline">হোমে ফিরে যান</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : ['/placeholder.svg'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
            <Link to="/" className="text-muted-foreground hover:text-primary">হোম</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link to={`/category/${product.product_type}`} className="text-muted-foreground hover:text-primary">
              {PRODUCT_TYPE_LABELS[product.product_type]}
            </Link>
            {category && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Link to={`/category/${product.product_type}/${category.slug}`} className="text-muted-foreground hover:text-primary">
                  {category.name_bn}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{product.name_bn}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={images[selectedImage]}
                  alt={product.name_bn}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                        selectedImage === i ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name_bn} - ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                {product.is_featured && (
                  <Badge className="mb-2">ফিচার্ড</Badge>
                )}
                <h1 className="text-2xl md:text-3xl font-bold">{product.name_bn}</h1>
                <p className="text-muted-foreground">{product.name_en}</p>
              </div>

              {product.brand && (
                <p className="text-muted-foreground">ব্র্যান্ড: <span className="font-medium">{product.brand}</span></p>
              )}

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">৳{product.price}</span>
                {product.original_price && product.original_price > product.price && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">৳{product.original_price}</span>
                    <Badge variant="destructive">-{product.discount_percent}%</Badge>
                  </>
                )}
              </div>

              {product.short_description_bn && (
                <p className="text-muted-foreground">{product.short_description_bn}</p>
              )}

              {/* Stock Status */}
              <div>
                {product.stock_quantity > 0 ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">স্টকে আছে ({product.stock_quantity} টি)</Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">স্টক শেষ</Badge>
                )}
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  className="flex-1 sm:flex-none"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  কার্টে যোগ করুন
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleWishlist}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                {product.sku && (
                  <div>
                    <span className="text-sm text-muted-foreground">SKU:</span>
                    <p className="font-medium">{product.sku}</p>
                  </div>
                )}
                {product.weight && (
                  <div>
                    <span className="text-sm text-muted-foreground">ওজন:</span>
                    <p className="font-medium">{product.weight}</p>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <span className="text-sm text-muted-foreground">মাপ:</span>
                    <p className="font-medium">{product.dimensions}</p>
                  </div>
                )}
                {product.warranty && (
                  <div>
                    <span className="text-sm text-muted-foreground">ওয়ারেন্টি:</span>
                    <p className="font-medium">{product.warranty}</p>
                  </div>
                )}
                {product.delivery_time && (
                  <div>
                    <span className="text-sm text-muted-foreground">ডেলিভারি সময়:</span>
                    <p className="font-medium">{product.delivery_time}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs for Description, Ingredients, Return Policy */}
          <div className="mt-12">
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">বিস্তারিত</TabsTrigger>
                {product.product_type === 'food' && product.ingredients && (
                  <TabsTrigger value="ingredients">উপকরণ</TabsTrigger>
                )}
                {product.return_policy && (
                  <TabsTrigger value="return">রিটার্ন পলিসি</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="description" className="mt-4 prose prose-sm max-w-none">
                {product.long_description_bn ? (
                  <div dangerouslySetInnerHTML={{ __html: product.long_description_bn.replace(/\n/g, '<br>') }} />
                ) : (
                  <p className="text-muted-foreground">কোনো বিস্তারিত বিবরণ নেই</p>
                )}
              </TabsContent>
              {product.product_type === 'food' && product.ingredients && (
                <TabsContent value="ingredients" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <p>{product.ingredients}</p>
                  </div>
                </TabsContent>
              )}
              {product.return_policy && (
                <TabsContent value="return" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <p>{product.return_policy}</p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Video if available */}
          {product.video_url && (
            <div className="mt-12">
              <h2 className="text-xl font-bold mb-4">প্রোডাক্ট ভিডিও</h2>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={product.video_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title="Product Video"
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UniversalProductDetail;
