import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useProductBundles } from "@/hooks/useProductBundles";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "sonner";

export const BundleSection = () => {
  const { data: bundles = [], isLoading } = useProductBundles(true);
  const { addToCart } = useCartContext();

  if (isLoading || bundles.length === 0) return null;

  const handleAddBundle = async (bundle: any) => {
    for (const item of bundle.items) {
      await addToCart(item.product_id, item.quantity);
    }
    toast.success("বান্ডেল কার্টে যোগ হয়েছে");
  };

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">বান্ডেল অফার</h2>
          <p className="text-sm text-muted-foreground">একসাথে কিনুন, বেশি বাঁচান</p>
        </div>
        <Link to="/bundles" className="text-primary text-sm hover:underline flex items-center gap-1">
          সব দেখুন <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bundles.slice(0, 3).map((bundle) => (
          <div key={bundle.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-bold mb-2">{bundle.name_bn}</h3>
            <p className="text-sm text-muted-foreground mb-3">{bundle.items.length} টি পণ্য</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-primary">৳{bundle.bundle_price}</span>
              <span className="text-muted-foreground line-through text-sm">৳{bundle.original_total}</span>
              {bundle.discount_percent > 0 && (
                <Badge variant="destructive" className="text-xs">{bundle.discount_percent}%</Badge>
              )}
            </div>
            <Button size="sm" className="w-full" onClick={() => handleAddBundle(bundle)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              কার্টে যোগ করুন
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};
