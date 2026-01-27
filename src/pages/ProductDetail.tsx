import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard, Product } from "@/components/ProductCard";
import { ProductReviews } from "@/components/ProductReviews";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { SocialShare } from "@/components/SocialShare";
import { ExpandableText } from "@/components/ExpandableText";
import { Button } from "@/components/ui/button";
import { Heart, ChevronRight, BookOpen, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useCartContext } from "@/contexts/CartContext";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { trackViewContent } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ProductDetail = () => {
  const { slug } = useParams();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preorderMessage, setPreorderMessage] = useState<string>("");
  const { isInWishlist, toggleWishlist } = useWishlistContext();
  const { addToCart } = useCartContext();

  // Fetch product from Supabase by slug
  const { data: dbProduct, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_bn, name_en, slug),
          writer:writers(id, name_bn, name_en, slug),
          publisher_rel:publishers(id, name_bn, name_en, slug)
        `)
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch related products
  const { data: relatedDbProducts = [] } = useQuery({
    queryKey: ['related-products', dbProduct?.category_id, dbProduct?.id],
    queryFn: async () => {
      if (!dbProduct?.category_id) return [];
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name_bn, slug),
          writer:writers(id, name_bn, slug),
          publisher_rel:publishers(id, name_bn, slug)
        `)
        .eq('is_active', true)
        .eq('category_id', dbProduct.category_id)
        .neq('id', dbProduct.id)
        .limit(4);
      return data || [];
    },
    enabled: !!dbProduct?.category_id,
  });

  // Track view content when product loads
  useEffect(() => {
    if (dbProduct) {
      const images = dbProduct.images as string[] || [];
      trackViewContent({
        id: dbProduct.id,
        name: dbProduct.title_bn || dbProduct.title_en,
        price: dbProduct.price,
        category: dbProduct.category?.name_bn,
        brand: dbProduct.publisher_rel?.name_bn,
      });
    }
  }, [dbProduct?.id]);

  // Fetch preorder message setting
  useEffect(() => {
    const fetchPreorderMessage = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'preorder_message')
        .maybeSingle();
      
      if (data?.setting_value) {
        setPreorderMessage(String(data.setting_value).replace(/^"|"$/g, ''));
      } else {
        setPreorderMessage('আমাদের জানিয়েছেন এই পণ্যটি {release_date} প্রকাশিত হতে পারে। প্রকাশিত হওয়ার সাথে সাথে পণ্যটি পেতে আগেই অর্ডার করে রাখুন।');
      }
    };
    fetchPreorderMessage();
  }, []);

  // Convert database product to Product interface
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-6">
          <Skeleton className="h-6 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!dbProduct) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-6">
          <div className="text-center py-16">
            <h2 className="text-xl font-bold mb-2">পণ্য পাওয়া যায়নি</h2>
            <p className="text-muted-foreground">এই পণ্যটি বর্তমানে উপলব্ধ নয়</p>
            <Link to="/shop" className="text-primary hover:underline mt-4 inline-block">
              সকল পণ্য দেখুন
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Parse images array
  const productImages: string[] = dbProduct?.images 
    ? (Array.isArray(dbProduct.images) ? dbProduct.images as string[] : [])
    : [];

  // Get category name
  const getCategoryName = () => {
    if (dbProduct?.category?.name_bn) return dbProduct.category.name_bn;
    return 'বিষয়';
  };

  // Get category slug for link
  const getCategorySlug = () => {
    if (dbProduct?.category?.slug) return dbProduct.category.slug;
    if (dbProduct?.category?.id) return dbProduct.category.id;
    return '';
  };

  // Get writer info
  const getWriterName = () => {
    if (dbProduct?.writer?.name_bn) return dbProduct.writer.name_bn;
    if (dbProduct?.author) return dbProduct.author;
    return 'অজানা লেখক';
  };

  const getWriterSlug = () => {
    if (dbProduct?.writer?.slug) return dbProduct.writer.slug;
    if (dbProduct?.writer?.id) return dbProduct.writer.id;
    return encodeURIComponent(getWriterName());
  };

  // Get publisher info
  const getPublisherName = () => {
    if (dbProduct?.publisher_rel?.name_bn) return dbProduct.publisher_rel.name_bn;
    if (dbProduct?.publisher) return dbProduct.publisher;
    return 'প্রকাশনী';
  };

  const getPublisherSlug = () => {
    if (dbProduct?.publisher_rel?.slug) return dbProduct.publisher_rel.slug;
    if (dbProduct?.publisher_rel?.id) return dbProduct.publisher_rel.id;
    return encodeURIComponent(getPublisherName());
  };

  // Format release date
  const getFormattedReleaseDate = () => {
    if (dbProduct?.release_date) {
      try {
        return format(new Date(dbProduct.release_date), 'd MMMM yyyy', { locale: bn });
      } catch {
        return dbProduct.release_date;
      }
    }
    return '';
  };

  // Get preorder message with date
  const getPreorderMessage = () => {
    const releaseDate = getFormattedReleaseDate();
    return preorderMessage.replace('{release_date}', releaseDate);
  };

  // Use database product
  const product = {
    id: dbProduct.id,
    title: dbProduct.title_bn || dbProduct.title_en,
    author: getWriterName(),
    price: dbProduct.price,
    originalPrice: dbProduct.original_price,
    discount: dbProduct.discount_percent,
    image: productImages.length > 0 ? productImages[0] : '/placeholder.svg',
    images: productImages,
    publisher: getPublisherName(),
    category: getCategorySlug(),
    categoryName: getCategoryName(),
    previewUrl: dbProduct.preview_url,
    description: dbProduct.description_bn || dbProduct.description_en || '',
    isPreorder: dbProduct.is_preorder,
    releaseDate: dbProduct.release_date,
    pages: dbProduct.stock_quantity,
  };

  const relatedProducts = relatedDbProducts.map(convertDbProduct);
  const hasDiscount = product.discount && product.discount > 0;
  const previewUrl = product.previewUrl;
  const inWishlist = isInWishlist(product.id);
  const productUrl = `/product/${dbProduct?.slug}`;

  const handleAddToCart = () => {
    addToCart(product.id);
  };

  const handlePreOrder = () => {
    addToCart(product.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-primary">হোম</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/shop" className="hover:text-primary">বিষয়</Link>
          <ChevronRight className="w-4 h-4" />
          <Link 
            to={`/shop?category=${getCategorySlug()}`} 
            className="hover:text-primary"
          >
            {getCategoryName()}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-card rounded-xl p-4 shadow-sm">
                <ProductImageGallery 
                  images={product.images.length > 0 ? product.images : [product.image]}
                  title={product.title}
                  discount={product.discount}
                  previewUrl={previewUrl}
                  onPreviewClick={() => setPreviewOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">লেখক : </span>
                  <Link 
                    to={`/authors/${getWriterSlug()}`} 
                    className="text-primary hover:underline"
                  >
                    {getWriterName()}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">প্রকাশনী : </span>
                  <Link 
                    to={`/publishers/${getPublisherSlug()}`} 
                    className="text-primary hover:underline"
                  >
                    {getPublisherName()}
                  </Link>
                </p>
                <p>
                  <span className="text-muted-foreground">বিষয় : </span>
                  <Link 
                    to={`/shop?category=${getCategorySlug()}`} 
                    className="text-primary hover:underline"
                  >
                    {getCategoryName()}
                  </Link>
                </p>
              </div>

              {/* Pre-order Notice */}
              {product.isPreorder && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
                  <p className="text-foreground">
                    {getPreorderMessage().split(getFormattedReleaseDate()).map((part, index, arr) => (
                      <span key={index}>
                        {part}
                        {index < arr.length - 1 && (
                          <strong>{getFormattedReleaseDate()}</strong>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {/* Description with Read More */}
              {product.description && (
                <div className="text-sm text-muted-foreground">
                  <ExpandableText 
                    text={product.description}
                    maxLength={150}
                  />
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">৳{product.price}</span>
                {hasDiscount && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      ৳{product.originalPrice}
                    </span>
                    <span className="text-primary font-medium">
                      ({product.discount}% ছাড়ে)
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {product.isPreorder ? (
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handlePreOrder}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    প্রি-অর্ডার করুন
                  </Button>
                ) : (
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    কার্টে যোগ করুন
                  </Button>
                )}
                <Button 
                  className="flex-1 bg-accent hover:bg-accent/90"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!previewUrl}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  একটু পড়ুন
                </Button>
              </div>

              {!previewUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  এই বইয়ের প্রিভিউ এখনো যোগ করা হয়নি
                </p>
              )}

              {/* Wishlist & Share */}
              <div className="flex items-center gap-4 text-sm">
                <button 
                  className={`flex items-center gap-2 transition-colors ${
                    inWishlist ? 'text-red-500' : 'text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => toggleWishlist(product.id)}
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                  {inWishlist ? 'উইশলিস্টে আছে' : 'Wishlist'}
                </button>
                <SocialShare 
                  url={productUrl}
                  title={product.title}
                  description={product.description}
                  image={product.image}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Related Products & Offers */}
          <div className="lg:col-span-1 space-y-6">
            {/* Offers */}
            <div className="bg-card rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-4">অফারে আরো যা পাচ্ছেন</h3>
              <div className="space-y-4">
                <div className="border-b border-border pb-4">
                  <p className="text-sm">
                    একটি বই কিনি, একটি প্রিমিয়াম নোট বুক, একটি প্রিমিয়াম বুকমার্ক ও নাশনিক
                    বুকমার্ক
                  </p>
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">সর্বনিম্ন কেনাকাটা:</span>{" "}
                    <span className="text-primary font-medium">১ টাকা</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    মেয়াদ শেষ: ৩১ ডিসেম্বর, ২০২৫
                  </p>
                </div>
                <div>
                  <p className="text-sm">৪৯৯+ টাকার অর্ডার করলে ক্যালিগ্রাফি বুকমার্ক ফ্রি!</p>
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">সর্বনিম্ন কেনাকাটা:</span>{" "}
                    <span className="text-primary font-medium">৫০০ টাকা</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    মেয়াদ শেষ: ৩১ ডিসেম্বর, ২০২৫
                  </p>
                </div>
              </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="bg-card rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">আরো দেখুন...</h3>
                  <Link to="/shop" className="text-primary text-sm hover:underline">
                    সবগুলো দেখুন
                  </Link>
                </div>
                <div className="space-y-3">
                  {relatedProducts.map((relatedProduct) => (
                    <ProductCard key={relatedProduct.id} product={relatedProduct} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ProductReviews productId={product.id} />
        </div>
      </main>

      <Footer />

      {/* Secure Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              একটু পড়ুন - {product.title}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            <SecurePdfViewer url={previewUrl} title={product.title} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
