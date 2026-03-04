import { Link } from "react-router-dom";
import { useProductBundles } from "@/hooks/useProductBundles";
import { useCartContext } from "@/contexts/CartContext";
import { Package, ShoppingCart, ChevronRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCarouselWrapper } from "./ProductCarouselWrapper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BundleShowcaseProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  useCarousel?: boolean;
  columns?: number;
}

export const BundleShowcase = ({ limit = 6, title = "বান্ডেল অফার", subtitle = "একসাথে কিনুন, বেশি বাঁচান", useCarousel = true, columns = 3 }: BundleShowcaseProps) => {
  const { data: bundles = [], isLoading } = useProductBundles(true);
  const { addToCart } = useCartContext();

  const handleAddBundle = async (bundle: any) => {
    for (const item of bundle.items) {
      await addToCart(item.product_id, item.quantity);
    }
    toast.success("বান্ডেল কার্টে যোগ হয়েছে");
  };

  if (isLoading) {
    return (
      <div className="my-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[200px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (bundles.length === 0) return null;

  const displayBundles = bundles.slice(0, limit);

  const getImage = (bundle: any) => {
    if (bundle.image_url) return bundle.image_url;
    if (bundle.items?.[0]?.product?.images) {
      const imgs = bundle.items[0].product.images;
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
    }
    return '/placeholder.svg';
  };

  const renderCard = (bundle: any) => (
    <div key={bundle.id} className="group bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-40 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden">
        {bundle.image_url ? (
          <img src={bundle.image_url} alt={bundle.name_bn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex -space-x-4">
            {bundle.items?.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="w-20 h-28 rounded-lg border-2 border-card shadow-md overflow-hidden rotate-[-5deg] first:rotate-[5deg]" style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
                <img src={getImage({ items: [item] })} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {bundle.discount_percent > 0 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            {bundle.discount_percent}% ছাড়
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
          <Package className="w-3 h-3" /> {bundle.items?.length || 0} টি পণ্য
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{bundle.name_bn}</h3>
        {bundle.description_bn && <p className="text-xs text-muted-foreground line-clamp-2">{bundle.description_bn}</p>}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">৳{bundle.bundle_price}</span>
          <span className="text-muted-foreground line-through text-sm">৳{bundle.original_total}</span>
          {bundle.discount_percent > 0 && (
            <Badge variant="secondary" className="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400 text-[10px]">
              সাশ্রয় ৳{bundle.original_total - bundle.bundle_price}
            </Badge>
          )}
        </div>
        <Button size="sm" className="w-full" onClick={() => handleAddBundle(bundle)}>
          <ShoppingCart className="w-4 h-4 mr-2" /> কার্টে যোগ করুন
        </Button>
      </div>
    </div>
  );

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 border-0">
            <Sparkles className="w-3 h-3" /> স্পেশাল
          </Badge>
        </div>
        <Link to="/bundles" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          সব দেখুন <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {useCarousel ? (
        <ProductCarouselWrapper columns={columns}>{displayBundles.map(renderCard)}</ProductCarouselWrapper>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4", {
          'md:grid-cols-2 lg:grid-cols-3': columns === 3,
          'md:grid-cols-2': columns === 2,
          'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4': columns === 4,
        })}>{displayBundles.map(renderCard)}</div>
      )}
    </section>
  );
};
