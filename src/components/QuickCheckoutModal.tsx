import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Truck,
  Smartphone,
  CreditCard,
  Loader2,
  Shield,
  Check,
  MapPin,
  Minus,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface QuickCheckoutProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  writer?: string;
}

interface QuickCheckoutModalProps {
  product: QuickCheckoutProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantId?: string | null;
  variantPrice?: number;
}

const quickSchema = z.object({
  fullName: z.string().trim().min(2, "নাম দিন"),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন"),
  address: z.string().trim().min(10, "সম্পূর্ণ ঠিকানা দিন"),
});

export function QuickCheckoutModal({
  product,
  open,
  onOpenChange,
  variantId,
  variantPrice,
}: QuickCheckoutModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({ fullName: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryArea, setDeliveryArea] = useState<"inside" | "outside">("inside");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Fetch payment methods + prefill profile
  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setTransactionId("");
    setErrors({});

    const fetchData = async () => {
      const [payRes] = await Promise.all([
        (supabase as any).rpc("get_public_payment_methods"),
      ]);
      if (payRes.data) setDbPaymentMethods(payRes.data);

      if (user && !profileLoaded) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, address, city, division")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          const parts = [profile.address, profile.city, profile.division].filter(Boolean);
          setFormData({
            fullName: profile.full_name || "",
            phone: profile.phone || "",
            address: parts.join(", ") || "",
          });
          setProfileLoaded(true);
        }
      }
    };
    fetchData();
  }, [open, user]);

  if (!product) return null;

  const unitPrice = variantPrice ?? product.price;
  const subtotal = unitPrice * quantity;
  const deliveryCharge = deliveryArea === "outside" ? 120 : 60;
  const total = subtotal + deliveryCharge;

  const paymentLogoMap: Record<string, string> = {
    bkash: "https://freelogopng.com/images/all_img/1656234841bkash-icon-png.png",
    nagad: "https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png",
  };
  const paymentColorMap: Record<string, string> = {
    cod: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20",
    bkash: "border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20",
    nagad: "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20",
    sslcommerz: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20",
  };
  const paymentIconMap: Record<string, any> = {
    cod: Truck,
    bkash: Smartphone,
    nagad: Smartphone,
    sslcommerz: CreditCard,
    card: CreditCard,
  };

  const paymentMethods = dbPaymentMethods.length > 0
    ? dbPaymentMethods.map((m: any) => ({
        id: m.provider,
        name: m.name_bn,
        manual_number: m.manual_number,
        manual_type: m.manual_type,
        payment_mode: m.payment_mode || "manual",
      }))
    : [{ id: "cod", name: "ক্যাশ অন ডেলিভারি", manual_number: null, manual_type: null, payment_mode: "manual" }];

  const selectedMethodObj = paymentMethods.find((m) => m.id === paymentMethod);
  const showTxnField =
    paymentMethod !== "cod" &&
    selectedMethodObj?.manual_number &&
    selectedMethodObj?.payment_mode !== "api";

  const generateOrderNumber = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return `ORD${code}`;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("অর্ডার করতে প্রথমে লগইন করুন");
      onOpenChange(false);
      navigate("/signin");
      return;
    }

    try {
      quickSchema.parse(formData);
      if (showTxnField && !transactionId.trim()) {
        setErrors({ transactionId: "ট্রান্জেকশন আইডি দিন" });
        return;
      }
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      const deliveryAreaLabel = deliveryArea === "outside" ? "ঢাকার বাইরে" : "ঢাকার ভিতরে";

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          payment_method: paymentMethod,
          transaction_id: transactionId || null,
          delivery_area: deliveryAreaLabel,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: product.id,
        product_title: product.title,
        product_image: product.image || null,
        price: unitPrice,
        quantity,
      });
      if (itemsError) throw itemsError;

      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      onOpenChange(false);
      navigate("/order-confirmation", { state: { orderNumber } });
    } catch (e) {
      console.error(e);
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            দ্রুত অর্ডার করুন
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 pt-3 space-y-5">
          {/* Product Summary */}
          <div className="flex gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.title}
              className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{product.title}</h3>
              {product.writer && (
                <p className="text-xs text-muted-foreground mt-0.5">{product.writer}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-primary font-bold">৳{unitPrice}</span>
                {product.originalPrice && product.originalPrice > unitPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    ৳{product.originalPrice}
                  </span>
                )}
                {product.discount && product.discount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    -{product.discount}%
                  </Badge>
                )}
              </div>
            </div>
            {/* Quantity */}
            <div className="flex flex-col items-center justify-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              ডেলিভারি তথ্য
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">নাম *</Label>
                <Input
                  className={cn("h-9 text-sm rounded-lg", errors.fullName && "border-destructive")}
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, fullName: e.target.value }));
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" }));
                  }}
                  placeholder="আপনার নাম"
                />
                {errors.fullName && <p className="text-destructive text-[10px]">{errors.fullName}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">মোবাইল *</Label>
                <Input
                  className={cn("h-9 text-sm rounded-lg", errors.phone && "border-destructive")}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, phone: e.target.value }));
                    if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                  }}
                  placeholder="01XXXXXXXXX"
                />
                {errors.phone && <p className="text-destructive text-[10px]">{errors.phone}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ঠিকানা *</Label>
              <Input
                className={cn("h-9 text-sm rounded-lg", errors.address && "border-destructive")}
                value={formData.address}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, address: e.target.value }));
                  if (errors.address) setErrors((p) => ({ ...p, address: "" }));
                }}
                placeholder="সম্পূর্ণ ঠিকানা"
              />
              {errors.address && <p className="text-destructive text-[10px]">{errors.address}</p>}
            </div>
          </div>

          {/* Delivery Area */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">ডেলিভারি এলাকা</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "inside" as const, label: "ঢাকার ভিতরে", price: "৳60" },
                { id: "outside" as const, label: "ঢাকার বাইরে", price: "৳120" },
              ].map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setDeliveryArea(zone.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all text-sm",
                    deliveryArea === zone.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {deliveryArea === zone.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-xs">{zone.label}</span>
                  <span className="text-primary font-bold text-xs">{zone.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">পেমেন্ট মেথড</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const Icon = paymentIconMap[method.id] || CreditCard;
                const isSelected = paymentMethod === method.id;
                const logo = paymentLogoMap[method.id];
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-primary shadow-sm scale-[1.02]"
                        : "border-border hover:border-primary/40",
                      paymentColorMap[method.id] || "bg-muted/30"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    {logo ? (
                      <img src={logo} alt={method.name} className="h-6 w-auto object-contain" />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Manual payment info */}
            {showTxnField && selectedMethodObj && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    {selectedMethodObj.manual_type || "Send Money"} করুন:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {selectedMethodObj.manual_number}
                    </span>
                  </span>
                </p>
                <Input
                  className={cn("h-9 text-sm rounded-lg font-mono", errors.transactionId && "border-destructive")}
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value);
                    if (errors.transactionId) setErrors((p) => ({ ...p, transactionId: "" }));
                  }}
                  placeholder="ট্রান্জেকশন আইডি"
                />
                {errors.transactionId && (
                  <p className="text-destructive text-[10px]">{errors.transactionId}</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>মূল্য ({quantity}টি)</span>
              <span>৳{subtotal}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ডেলিভারি চার্জ</span>
              <span>৳{deliveryCharge}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>সর্বমোট</span>
              <span className="text-primary">৳{total}</span>
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {isSubmitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন — ৳${total}`}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            আপনার তথ্য সম্পূর্ণ নিরাপদ
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
