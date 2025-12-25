import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Check, CreditCard, Smartphone, Truck, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "নাম অন্তত ২ অক্ষরের হতে হবে").max(100, "নাম ১০০ অক্ষরের বেশি হতে পারবে না"),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)"),
  email: z.string().trim().email("সঠিক ইমেইল দিন").optional().or(z.literal("")),
  address: z.string().trim().min(10, "সম্পূর্ণ ঠিকানা দিন (অন্তত ১০ অক্ষর)").max(500, "ঠিকানা ৫০০ অক্ষরের বেশি হতে পারবে না"),
  notes: z.string().trim().max(500, "নোট ৫০০ অক্ষরের বেশি হতে পারবে না").optional(),
  transactionId: z.string().trim().optional(),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart, loading: cartLoading } = useCartContext();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    transactionId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryArea, setDeliveryArea] = useState("inside");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("অর্ডার করতে প্রথমে লগইন করুন");
      navigate("/signin");
    }
  }, [user, authLoading, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      toast.error("আপনার কার্ট খালি");
      navigate("/cart");
    }
  }, [cartItems, cartLoading, navigate]);

  // Pre-fill form with profile data including shipping address
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email, address, city, postal_code, division, country")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        // Build full address from profile fields
        const addressParts = [
          profile.address,
          profile.city,
          profile.postal_code,
          profile.division,
          profile.country,
        ].filter(Boolean);
        
        const fullAddress = addressParts.join(", ");

        // Set delivery area based on division
        if (profile.division && profile.division !== "ঢাকা") {
          setDeliveryArea("outside");
        }

        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || "",
          phone: profile.phone || "",
          email: profile.email || user.email || "",
          address: fullAddress || "",
        }));
      }
    };

    fetchProfile();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WL-${timestamp}-${random}`;
  };

  const validateForm = () => {
    try {
      checkoutSchema.parse(formData);
      
      // Additional validation for mobile banking
      if ((paymentMethod === "bkash" || paymentMethod === "nagad") && !formData.transactionId?.trim()) {
        setErrors({ transactionId: "ট্রান্জেকশন আইডি দিন" });
        return false;
      }
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateForm() || !user) return;

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const deliveryCharge = deliveryArea === "inside" ? 60 : 120;
      const total = subtotal + deliveryCharge;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          subtotal: subtotal,
          delivery_charge: deliveryCharge,
          total: total,
          payment_method: paymentMethod,
          transaction_id: formData.transactionId || null,
          delivery_area: deliveryArea,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || null,
          address: formData.address.trim(),
          notes: formData.notes?.trim() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_title: item.product.title,
        product_image: item.product.image || null,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Clear cart
      await clearCart();

      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      navigate("/order-confirmation", { state: { orderNumber } });
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryCharge = deliveryArea === "inside" ? 60 : 120;
  const total = subtotal + deliveryCharge;

  const paymentMethods = [
    {
      id: "cod",
      name: "ক্যাশ অন ডেলিভারি",
      description: "পণ্য হাতে পেয়ে টাকা প্রদান করুন",
      icon: Truck,
    },
    {
      id: "bkash",
      name: "বিকাশ",
      description: "বিকাশ মোবাইল ব্যাংকিং",
      icon: Smartphone,
    },
    {
      id: "nagad",
      name: "নগদ",
      description: "নগদ মোবাইল ব্যাংকিং",
      icon: Smartphone,
    },
    {
      id: "card",
      name: "কার্ড পেমেন্ট",
      description: "ভিসা, মাস্টারকার্ড, আমেক্স",
      icon: CreditCard,
    },
  ];

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-6">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          শপিং ব্যাগে ফিরে যান
        </Link>

        <h1 className="text-2xl font-bold mb-6">চেকআউট</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">ডেলিভারি ঠিকানা</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">পূর্ণ নাম *</Label>
                  <Input
                    id="name"
                    placeholder="আপনার নাম লিখুন"
                    className={`mt-1 ${errors.fullName ? "border-destructive" : ""}`}
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                  />
                  {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">মোবাইল নম্বর *</Label>
                  <Input
                    id="phone"
                    placeholder="01XXXXXXXXX"
                    className={`mt-1 ${errors.phone ? "border-destructive" : ""}`}
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                  {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label htmlFor="email">ইমেইল</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label>ডেলিভারি এরিয়া *</Label>
                  <RadioGroup
                    value={deliveryArea}
                    onValueChange={setDeliveryArea}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inside" id="inside" />
                      <Label htmlFor="inside" className="font-normal cursor-pointer">
                        ঢাকার ভিতরে (৳60)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outside" id="outside" />
                      <Label htmlFor="outside" className="font-normal cursor-pointer">
                        ঢাকার বাইরে (৳120)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">সম্পূর্ণ ঠিকানা *</Label>
                  <Textarea
                    id="address"
                    placeholder="বাড়ি নং, রাস্তা, এলাকা, থানা, জেলা"
                    className={`mt-1 ${errors.address ? "border-destructive" : ""}`}
                    rows={3}
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                  {errors.address && <p className="text-destructive text-xs mt-1">{errors.address}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">অর্ডার নোট (ঐচ্ছিক)</Label>
                  <Textarea
                    id="notes"
                    placeholder="অতিরিক্ত নির্দেশনা থাকলে লিখুন..."
                    className="mt-1"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">পেমেন্ট পদ্ধতি</h2>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          paymentMethod === method.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <method.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{method.name}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                      {paymentMethod === method.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </label>
                  ))}
                </div>
              </RadioGroup>

              {paymentMethod === "bkash" && (
                <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
                  <p className="text-sm text-pink-800 dark:text-pink-200">
                    বিকাশ নম্বর: <strong>01XXX-XXXXXX</strong> (মার্চেন্ট)
                    <br />
                    Send Money করে ট্রান্জেকশন আইডি দিন
                  </p>
                  <Input
                    placeholder="Transaction ID"
                    className={`mt-3 ${errors.transactionId ? "border-destructive" : ""}`}
                    value={formData.transactionId}
                    onChange={(e) => handleInputChange("transactionId", e.target.value)}
                  />
                  {errors.transactionId && <p className="text-destructive text-xs mt-1">{errors.transactionId}</p>}
                </div>
              )}

              {paymentMethod === "nagad" && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    নগদ নম্বর: <strong>01XXX-XXXXXX</strong> (মার্চেন্ট)
                    <br />
                    Send Money করে ট্রান্জেকশন আইডি দিন
                  </p>
                  <Input
                    placeholder="Transaction ID"
                    className={`mt-3 ${errors.transactionId ? "border-destructive" : ""}`}
                    value={formData.transactionId}
                    onChange={(e) => handleInputChange("transactionId", e.target.value)}
                  />
                  {errors.transactionId && <p className="text-destructive text-xs mt-1">{errors.transactionId}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-lg mb-4">অর্ডার সারাংশ</h2>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-14 h-18 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        ৳{item.product.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      ৳{item.product.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                  <span>৳{deliveryCharge}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>সর্বমোট</span>
                    <span className="text-primary">৳{total}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    প্রসেসিং...
                  </>
                ) : (
                  "অর্ডার কনফার্ম করুন"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                অর্ডার করার মাধ্যমে আপনি আমাদের{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  শর্তাবলী
                </Link>{" "}
                এবং{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  গোপনীয়তা নীতি
                </Link>{" "}
                মেনে নিচ্ছেন
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;