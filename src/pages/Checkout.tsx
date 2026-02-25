import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { CouponInput } from "@/components/CouponInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Check, CreditCard, Smartphone, Truck, MapPin, ChevronLeft, Loader2, Shield, Phone, Ticket } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AddressBookSelector } from "@/components/AddressBookSelector";
import { toast } from "sonner";
import { z } from "zod";
import { trackInitiateCheckout, trackAddPaymentInfo, trackAddShippingInfo, trackPurchase } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

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
  const [abandonedCheckoutId, setAbandonedCheckoutId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);

  // OTP Verification States
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // OTP Settings
  const [otpSettings, setOtpSettings] = useState({
    otp_enabled: false,
    otp_only_for_cod: false,
    otp_required_for_cod: false,
    otp_required_for_new_customers: false,
  });

  // Fetch OTP settings
  useEffect(() => {
    const fetchOtpSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .eq("category", "security")
          .in("setting_key", ["otp_enabled", "otp_only_for_cod", "otp_required_for_cod", "otp_required_for_new_customers"]);
        
        if (error) {
          console.error("Error fetching OTP settings:", error);
          return;
        }
        
        console.log("Raw OTP settings from DB:", data);
        
        if (data) {
          const settings: Record<string, boolean> = {};
          data.forEach(item => {
            // Handle various formats: boolean true, string "true", or JSON boolean
            const val = item.setting_value;
            settings[item.setting_key] = val === true || val === "true" || String(val) === "true";
            console.log(`OTP Setting ${item.setting_key}:`, val, "->", settings[item.setting_key]);
          });
          
          console.log("Parsed OTP settings:", settings);
          
          setOtpSettings(prev => ({
            ...prev,
            ...settings,
          }));
        }
      } catch (error) {
        console.error("Error fetching OTP settings:", error);
      }
    };
    
    fetchOtpSettings();
  }, []);

  // Track initiate checkout on load
  useEffect(() => {
    if (cartItems.length > 0 && !cartLoading) {
      trackInitiateCheckout(
        cartItems.map(item => ({
          id: item.product.id,
          name: item.product.title,
          price: item.product.price,
          category: item.product.category,
          quantity: item.quantity,
        })),
        subtotal
      );
    }
  }, [cartLoading]);

  // Track abandoned checkout - create/update on checkout page load
  useEffect(() => {
    const trackAbandonedCheckout = async () => {
      if (!user || cartItems.length === 0) return;

      const cartData = cartItems.map(item => ({
        product_id: item.productId,
        product_title: item.product.title,
        product_image: item.product.image || null,
        price: item.product.price,
        quantity: item.quantity,
      }));

      try {
        // Check if there's already an abandoned checkout for this user
        const { data: existing } = await supabase
          .from("abandoned_checkouts")
          .select("id")
          .eq("user_id", user.id)
          .eq("recovered", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from("abandoned_checkouts")
            .update({
              cart_items: cartData,
              subtotal: subtotal,
              step: "checkout_started",
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          setAbandonedCheckoutId(existing.id);
        } else {
          // Create new
          const { data: newCheckout } = await supabase
            .from("abandoned_checkouts")
            .insert({
              user_id: user.id,
              cart_items: cartData,
              subtotal: subtotal,
              step: "checkout_started",
            })
            .select("id")
            .single();
          if (newCheckout) {
            setAbandonedCheckoutId(newCheckout.id);
          }
        }
      } catch (error) {
        console.error("Error tracking abandoned checkout:", error);
      }
    };

    trackAbandonedCheckout();
  }, [user, cartItems.length > 0]); // Only run once when user and cart are available

  // Update abandoned checkout step when form data changes
  const updateAbandonedStep = async (step: string, additionalData?: Record<string, any>) => {
    if (!abandonedCheckoutId) return;
    
    try {
      await supabase
        .from("abandoned_checkouts")
        .update({
          step,
          last_activity_at: new Date().toISOString(),
          ...additionalData,
        })
        .eq("id", abandonedCheckoutId);
    } catch (error) {
      console.error("Error updating abandoned checkout:", error);
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    // Reset phone verification if phone changes
    if (field === "phone") {
      setPhoneVerified(false);
    }
    
    // Update abandoned checkout with form data
    if (field === "address" && value.length > 10) {
      updateAbandonedStep("address_filled", {
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        address: value,
        delivery_area: deliveryArea,
      });
    }
  };

  const generateOrderNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ORD${code}`;
  };

  const validateForm = () => {
    try {
      checkoutSchema.parse(formData);
      
      // Validate transaction ID for manual payment methods (not COD, not API bkash)
      const selectedMethod = paymentMethods.find((m: any) => m.id === paymentMethod);
      if (paymentMethod !== "cod" && selectedMethod?.manual_number && selectedMethod?.payment_mode !== "api" && !formData.transactionId?.trim()) {
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

  // Send OTP
  const sendOtp = async () => {
    if (!formData.phone || !/^01[3-9]\d{8}$/.test(formData.phone)) {
      toast.error("সঠিক মোবাইল নম্বর দিন");
      return;
    }

    setOtpSending(true);
    setOtpError("");

    try {
      const fullPhone = "+88" + formData.phone;
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone, action: "send" },
      });

      if (error) throw error;

      if (data?.success) {
        setOtpSent(true);
        setCountdown(60); // 60 seconds countdown
        toast.success("OTP পাঠানো হয়েছে");
        
        // For testing - show debug OTP if no SMS provider configured
        if (data.debug_otp) {
          toast.info(`টেস্ট OTP: ${data.debug_otp}`, { duration: 10000 });
        }
      } else {
        throw new Error(data?.error || "OTP পাঠাতে সমস্যা হয়েছে");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      toast.error("OTP পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError("৬ সংখ্যার OTP দিন");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");

    try {
      const fullPhone = "+88" + formData.phone;
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone, action: "verify", otp: otpValue },
      });

      if (error) throw error;

      if (data?.verified) {
        setPhoneVerified(true);
        setShowOtpDialog(false);
        toast.success("ফোন নম্বর যাচাই সফল!");
        // Proceed with order
        await placeOrder();
      } else {
        setOtpError(data?.error || "ভুল OTP। আবার চেষ্টা করুন।");
      }
    } catch (error) {
      console.error("OTP verify error:", error);
      setOtpError("OTP যাচাই করতে সমস্যা হয়েছে");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Initialize bKash payment
  const initBkashPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const callbackUrl = `${window.location.origin}/bkash/callback`;
      
      const { data, error } = await supabase.functions.invoke("bkash-payment", {
        body: {
          action: "create",
          orderId: orderNumber,
          amount: totalAmount,
          callbackUrl,
        },
      });

      if (error) throw error;

      if (data.success && data.bkashURL) {
        // Store pending order info
        localStorage.setItem("pending_bkash_order", JSON.stringify({
          orderId,
          orderNumber,
          paymentID: data.paymentID,
        }));

        // Redirect to bKash payment page
        window.location.href = data.bkashURL;
      } else {
        throw new Error(data.error || "বিকাশ পেমেন্ট শুরু করতে সমস্যা হয়েছে");
      }
    } catch (error: any) {
      console.error("bKash init error:", error);
      toast.error(error.message || "বিকাশ পেমেন্ট শুরু করতে সমস্যা হয়েছে");
      setIsSubmitting(false);
    }
  };

  // Place order after OTP verification
  const placeOrder = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const orderNumber = generateOrderNumber();
      const deliveryCharge = deliveryArea === "inside" ? 60 : 120;
      const couponDiscount = appliedCoupon?.discount_amount || 0;
      const total = subtotal - couponDiscount + deliveryCharge;

      // Create order with phone_verified flag
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: paymentMethod === "bkash" ? "payment_pending" : "pending",
          subtotal: subtotal,
          delivery_charge: deliveryCharge,
          total: total,
          payment_method: paymentMethod,
          transaction_id: paymentMethod === "bkash" ? null : (formData.transactionId || null),
          delivery_area: deliveryArea,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email?.trim() || null,
          address: formData.address.trim(),
          notes: formData.notes?.trim() || null,
          phone_verified: phoneVerified || !isOtpRequired(),
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

      // Mark abandoned checkout as recovered
      if (abandonedCheckoutId) {
        await supabase
          .from("abandoned_checkouts")
          .update({ 
            recovered: true, 
            recovered_order_id: order.id 
          })
          .eq("id", abandonedCheckoutId);
      }

      // If bKash payment, redirect to bKash
      if (paymentMethod === "bkash") {
        await initBkashPayment(order.id, orderNumber, total);
        return; // Don't clear cart yet - will be done after successful payment
      }

      // Clear cart for other payment methods
      await clearCart();

      // Track purchase event
      trackPurchase({
        transaction_id: orderNumber,
        value: total,
        currency: 'BDT',
        shipping: deliveryCharge,
        coupon: appliedCoupon?.code,
        items: cartItems.map(item => ({
          id: item.product.id,
          name: item.product.title,
          price: item.product.price,
          category: item.product.category,
          quantity: item.quantity,
        })),
      });

      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      navigate("/order-confirmation", { state: { orderNumber } });
    } catch (error: unknown) {
      console.error("Order error:", error);
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      if (paymentMethod !== "bkash") {
        setIsSubmitting(false);
      }
    }
  };

  // Determine if OTP is required based on settings and payment method
  const isOtpRequired = () => {
    console.log("OTP Settings:", otpSettings);
    console.log("Payment Method:", paymentMethod);
    
    // Special case: If "OTP only for COD" is enabled, require OTP only for COD orders
    // This works independently of otp_enabled flag
    if (otpSettings.otp_only_for_cod === true) {
      const required = paymentMethod === "cod";
      console.log("OTP only for COD enabled, required:", required);
      return required;
    }
    
    // If OTP is not globally enabled, skip
    if (!otpSettings.otp_enabled) {
      console.log("OTP globally disabled");
      return false;
    }
    
    // If "OTP required for COD" is enabled and payment is COD
    if (otpSettings.otp_required_for_cod && paymentMethod === "cod") {
      console.log("OTP required for COD");
      return true;
    }
    
    // Default: OTP enabled means required for all payment methods
    console.log("OTP enabled for all");
    return true;
  };

  // Handle order button click - show OTP dialog if required
  const handlePlaceOrder = async () => {
    if (!validateForm() || !user) return;

    // Update abandoned checkout step
    updateAbandonedStep("otp_pending", {
      full_name: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      delivery_area: deliveryArea,
      payment_method: paymentMethod,
    });

    // Check if OTP is required
    if (isOtpRequired() && !phoneVerified) {
      // Open OTP dialog
      setShowOtpDialog(true);
      setOtpValue("");
      setOtpError("");
      setOtpSent(false);
      
      // Auto-send OTP
      await sendOtp();
    } else {
      // Skip OTP and place order directly
      await placeOrder();
    }
  };

  const deliveryCharge = deliveryArea === "inside" ? 60 : 120;
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const total = subtotal - couponDiscount + deliveryCharge;

  // Fetch active payment methods from database
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setDbPaymentMethods(data);
    };
    fetchPaymentMethods();
  }, []);

  const iconMap: Record<string, any> = {
    cod: Truck,
    bkash: Smartphone,
    nagad: Smartphone,
    sslcommerz: CreditCard,
    card: CreditCard,
  };

  const paymentMethods = dbPaymentMethods.map((m: any) => ({
    id: m.provider,
    name: m.name_bn,
    description: m.provider === 'cod' ? 'পণ্য হাতে পেয়ে টাকা প্রদান করুন' : 
      (m as any).manual_number ? `${m.name_bn} মোবাইল ব্যাংকিং` : `${m.name_bn}`,
    icon: iconMap[m.provider] || CreditCard,
    manual_number: (m as any).manual_number,
    manual_type: (m as any).manual_type,
    manual_instructions: (m as any).manual_instructions,
    payment_mode: (m as any).payment_mode || 'manual',
  }));

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

              <AddressBookSelector onSelect={(addr) => {
                setFormData(prev => ({
                  ...prev,
                  fullName: addr.fullName,
                  phone: addr.phone,
                  address: addr.address,
                }));
                if (addr.division && addr.division !== "ঢাকা") {
                  setDeliveryArea("outside");
                } else if (addr.division === "ঢাকা") {
                  setDeliveryArea("inside");
                }
              }} />

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
                  <Label htmlFor="phone">
                    মোবাইল নম্বর * 
                    {isOtpRequired() && <span className="text-muted-foreground text-xs ml-1">(OTP যাচাই হবে)</span>}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="phone"
                      placeholder="01XXXXXXXXX"
                      className={`pr-10 ${errors.phone ? "border-destructive" : ""}`}
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                    {phoneVerified && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
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

              {/* Dynamic payment method details */}
              {paymentMethod !== "cod" && (() => {
                const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
                if (!selectedMethod) return null;
                
                // API mode for bkash
                if (paymentMethod === "bkash" && selectedMethod.payment_mode === "api") {
                  return (
                    <div className="mt-4 p-4 bg-accent/50 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <p className="font-medium text-foreground">বিকাশ পেমেন্ট</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        অর্ডার সম্পন্ন করতে আপনাকে বিকাশ পেমেন্ট পেজে নিয়ে যাওয়া হবে।
                      </p>
                    </div>
                  );
                }

                // Manual mode - show account number and transaction ID input
                if (selectedMethod.manual_number) {
                  return (
                    <div className="mt-4 p-4 bg-accent/50 rounded-lg border border-border">
                      <p className="text-sm text-foreground">
                        {selectedMethod.name} নম্বর: <strong>{selectedMethod.manual_number}</strong> ({selectedMethod.manual_type || 'Send Money'})
                      </p>
                      {selectedMethod.manual_instructions && (
                        <p className="text-xs text-muted-foreground mt-1">{selectedMethod.manual_instructions}</p>
                      )}
                      <Input
                        placeholder="Transaction ID"
                        className={`mt-3 ${errors.transactionId ? "border-destructive" : ""}`}
                        value={formData.transactionId}
                        onChange={(e) => handleInputChange("transactionId", e.target.value)}
                      />
                      {errors.transactionId && <p className="text-destructive text-xs mt-1">{errors.transactionId}</p>}
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* OTP Verification Info - Only show for COD when OTP is required */}
            {isOtpRequired() && (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">নিরাপত্তা যাচাই</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      অর্ডার কনফার্ম করতে আপনার মোবাইল নম্বরে OTP পাঠানো হবে
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                {/* Coupon Input */}
                <div className="pb-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">কুপন কোড</span>
                  </div>
                  <CouponInput 
                    subtotal={subtotal}
                    onCouponApplied={setAppliedCoupon}
                    appliedCoupon={appliedCoupon}
                    cartProductIds={cartItems.map(item => item.productId)}
                    cartCategoryIds={cartItems.map(item => item.product.category || '').filter(Boolean)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span>৳{subtotal}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>কুপন ছাড় ({appliedCoupon?.code})</span>
                    <span>-৳{couponDiscount}</span>
                  </div>
                )}
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
                  <>
                    {isOtpRequired() ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        OTP যাচাই করে অর্ডার করুন
                      </>
                    ) : (
                      <>
                        {paymentMethod === "bkash" && <Smartphone className="w-4 h-4 mr-2" />}
                        {paymentMethod === "nagad" && <Smartphone className="w-4 h-4 mr-2" />}
                        {paymentMethod === "card" && <CreditCard className="w-4 h-4 mr-2" />}
                        {paymentMethods.find(m => m.id === paymentMethod)?.name} দিয়ে পেমেন্ট করুন
                      </>
                    )}
                  </>
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

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              ফোন নম্বর যাচাই
            </DialogTitle>
            <DialogDescription>
              {formData.phone} নম্বরে একটি ৬ সংখ্যার OTP পাঠানো হয়েছে
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* OTP Input */}
            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => {
                  setOtpValue(value);
                  setOtpError("");
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {otpError && (
                <p className="text-destructive text-sm">{otpError}</p>
              )}
            </div>

            {/* Resend OTP */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  পুনরায় OTP পাঠাতে অপেক্ষা করুন: <span className="font-bold">{countdown}s</span>
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendOtp}
                  disabled={otpSending}
                >
                  {otpSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      পাঠানো হচ্ছে...
                    </>
                  ) : (
                    "পুনরায় OTP পাঠান"
                  )}
                </Button>
              )}
            </div>

            {/* Verify Button */}
            <Button
              className="w-full"
              onClick={verifyOtp}
              disabled={otpValue.length !== 6 || otpVerifying}
            >
              {otpVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  যাচাই হচ্ছে...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  যাচাই করে অর্ডার সম্পন্ন করুন
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Checkout;
