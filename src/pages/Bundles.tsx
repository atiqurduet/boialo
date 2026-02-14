import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Loader2 } from "lucide-react";
import { useProductBundles } from "@/hooks/useProductBundles";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "sonner";

const Bundles = () => {
  const { data: bundles = [], isLoading } = useProductBundles();
  const { addToCart } = useCartContext();

  const handleAddBundle = async (bundle: any) => {
    for (const item of bundle.items) {
      await addToCart(item.product_id, item.quantity);
    }
    toast.success("বান্ডেল কার্টে যোগ হয়েছে");
  };

  const getProductImage = (product: any): string => {
    if (!product?.images) return '/placeholder.svg';
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-2">প্রোডাক্ট বান্ডেল</h1>
        <p className="text-muted-foreground mb-8">একসাথে কিনুন, বেশি সাশ্রয় করুন</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bundles.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-xl font-bold mb-4">কোনো বান্ডেল নেই</h2>
            <p className="text-muted-foreground">শীঘ্রই নতুন বান্ডেল আসছে</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
                {bundle.image_url && (
                  <img src={bundle.image_url} alt={bundle.name_bn} className="w-full h-48 object-cover" />
                )}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{bundle.name_bn}</h3>
                    {bundle.description_bn && (
                      <p className="text-sm text-muted-foreground mt-1">{bundle.description_bn}</p>
                    )}
                  </div>

                  {/* Bundle items */}
                  <div className="space-y-2">
                    {bundle.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={getProductImage(item.product)}
                          alt={item.product?.title_bn || ""}
                          className="w-10 h-14 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${item.product?.slug}`} className="text-sm font-medium hover:text-primary line-clamp-1">
                            {item.product?.title_bn}
                          </Link>
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        </div>
                        <span className="text-sm">৳{item.product?.price}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-3 pt-2 border-t border-border">
                    <span className="text-2xl font-bold text-primary">৳{bundle.bundle_price}</span>
                    <span className="text-muted-foreground line-through">৳{bundle.original_total}</span>
                    {bundle.discount_percent > 0 && (
                      <Badge variant="destructive">{bundle.discount_percent}% ছাড়</Badge>
                    )}
                  </div>

                  <Button className="w-full" onClick={() => handleAddBundle(bundle)}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    বান্ডেল কার্টে যোগ করুন
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Bundles;
