import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, X, Check, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

interface CouponInputProps {
  subtotal: number;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
  appliedCoupon: AppliedCoupon | null;
}

export const CouponInput = ({ subtotal, onCouponApplied, appliedCoupon }: CouponInputProps) => {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Fetch available coupons for display
  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['available-coupons', subtotal],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .lte('min_order_amount', subtotal)
        .order('discount_value', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("কুপন কোড লিখুন");
      return;
    }

    setIsApplying(true);
    
    try {
      const now = new Date().toISOString();
      
      // Find coupon
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        toast.error("অবৈধ কুপন কোড");
        return;
      }

      // Check min order amount
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        toast.error(`এই কুপনের জন্য কমপক্ষে ৳${coupon.min_order_amount} অর্ডার করতে হবে`);
        return;
      }

      // Check usage limit
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error("এই কুপন সীমা অতিক্রম করেছে");
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
      } else {
        discountAmount = coupon.discount_value;
      }

      // Ensure discount doesn't exceed subtotal
      discountAmount = Math.min(discountAmount, subtotal);

      const appliedCoupon: AppliedCoupon = {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount,
      };

      onCouponApplied(appliedCoupon);
      toast.success(`কুপন প্রয়োগ হয়েছে! ৳${discountAmount} ছাড় পেয়েছেন`);
      setCouponCode("");
    } catch (error) {
      console.error("Coupon error:", error);
      toast.error("কুপন প্রয়োগ করতে সমস্যা হয়েছে");
    } finally {
      setIsApplying(false);
    }
  };

  const removeCoupon = () => {
    onCouponApplied(null);
    toast.success("কুপন সরানো হয়েছে");
  };

  const quickApplyCoupon = (code: string) => {
    setCouponCode(code);
    // Auto apply after setting
    setTimeout(() => {
      const input = document.getElementById('coupon-input') as HTMLInputElement;
      if (input) {
        input.value = code;
        applyCoupon();
      }
    }, 100);
  };

  return (
    <div className="space-y-3">
      {appliedCoupon ? (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">
                {appliedCoupon.code}
              </span>
              <span className="text-sm text-green-600 dark:text-green-400 ml-2">
                (৳{appliedCoupon.discount_amount} ছাড়)
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeCoupon}
            className="text-green-700 hover:text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="coupon-input"
                placeholder="কুপন কোড লিখুন"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              />
            </div>
            <Button
              onClick={applyCoupon}
              disabled={isApplying || !couponCode.trim()}
              variant="outline"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "প্রয়োগ"
              )}
            </Button>
          </div>

          {/* Quick apply available coupons */}
          {availableCoupons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                প্রযোজ্য কুপন
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCoupons.map((coupon: any) => (
                  <button
                    key={coupon.id}
                    onClick={() => quickApplyCoupon(coupon.code)}
                    className="text-xs px-2 py-1 bg-muted hover:bg-primary/10 rounded-md border border-dashed border-primary/50 text-primary font-mono transition-colors"
                  >
                    {coupon.code} ({coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : `৳${coupon.discount_value}`})
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
