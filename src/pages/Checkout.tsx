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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, CreditCard, Smartphone, Truck, MapPin, ChevronLeft, Loader2, Shield, Phone, Ticket, ChevronRight, Gift, Clock, Zap, Star } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AddressBookSelector } from "@/components/AddressBookSelector";
import { toast } from "sonner";
import { z } from "zod";
import { trackInitiateCheckout, trackAddPaymentInfo, trackAddShippingInfo, trackPurchase } from "@/lib/analytics";
import { serverTrackInitiateCheckout, serverTrackPurchase } from "@/lib/serverTracking";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "নাম অন্তত ২ অক্ষরের হতে হবে").max(100),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)"),
  email: z.string().trim().email("সঠিক ইমেইল দিন").optional().or(z.literal("")),
  address: z.string().trim().min(10, "সম্পূর্ণ ঠিকানা দিন (অন্তত ১০ অক্ষর)").max(500),
  notes: z.string().trim().max(500).optional(),
  transactionId: z.string().trim().optional(),
});

const STEPS = [
  { id: 'shipping', label: 'ডেলিভারি', icon: MapPin },
  { id: 'payment', label: 'পেমেন্ট', icon: CreditCard },
  { id: 'review', label: 'রিভিউ', icon: Check },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart, loading: cartLoading } = useCartContext();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "", phone: "", email: "", address: "", notes: "", transactionId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abandonedCheckoutId, setAbandonedCheckoutId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, any>>({});
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [dynamicDiscount, setDynamicDiscount] = useState(0);
  const [dynamicDiscountLabel, setDynamicDiscountLabel] = useState("");

  // OTP States
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSettings, setOtpSettings] = useState({
    otp_enabled: false, otp_only_for_cod: false, otp_required_for_cod: false, otp_required_for_new_customers: false,
  });

  // Fetch all config data in parallel
  useEffect(() => {
    const fetchAll = async () => {
      const [otpRes, payRes, zoneRes, fieldsRes, rulesRes] = await Promise.all([
        supabase.from("site_settings").select("setting_key, setting_value").eq("category", "security").in("setting_key", ["otp_enabled", "otp_only_for_cod", "otp_required_for_cod", "otp_required_for_new_customers"]),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("delivery_zones").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("checkout_form_fields").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("dynamic_pricing_rules").select("*").eq("is_active", true).order("priority", { ascending: false }),
      ]);

      if (otpRes.data) {
        const settings: Record<string, boolean> = {};
        otpRes.data.forEach(item => {
          settings[item.setting_key] = item.setting_value === true || item.setting_value === "true" || String(item.setting_value) === "true";
        });
        setOtpSettings(prev => ({ ...prev, ...settings }));
      }
      if (payRes.data) setDbPaymentMethods(payRes.data);
      if (zoneRes.data) setDeliveryZones(zoneRes.data);
      if (fieldsRes.data) setDynamicFields(fieldsRes.data);
      if (rulesRes.data) setPricingRules(rulesRes.data);
    };
    fetchAll();
  }, []);

  // Apply dynamic pricing rules
  useEffect(() => {
    if (pricingRules.length === 0 || cartItems.length === 0) {
      setDynamicDiscount(0);
      setDynamicDiscountLabel("");
      return;
    }

    let bestDiscount = 0;
    let bestLabel = "";

    for (const rule of pricingRules) {
      const now = new Date();
      if (rule.starts_at && new Date(rule.starts_at) > now) continue;
      if (rule.ends_at && new Date(rule.ends_at) < now) continue;

      const config = rule.condition_config || {};
      let applies = false;

      switch (rule.rule_type) {
        case 'min_order':
          if (subtotal >= (config.min_amount || 0)) applies = true;
          break;
        case 'bulk_discount':
          const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);
          if (totalQty >= (config.min_quantity || 0)) applies = true;
          break;
        case 'first_order':
          applies = true; // Will be validated server-side
          break;
        case 'time_based':
          applies = true; // Already checked starts_at/ends_at
          break;
      }

      if (applies) {
        let discount = 0;
        if (rule.discount_type === 'percentage') {
          discount = Math.round(subtotal * rule.discount_value / 100);
        } else {
          discount = rule.discount_value;
        }
        if (discount > bestDiscount) {
          bestDiscount = discount;
          bestLabel = rule.name_bn;
        }
      }
    }

    setDynamicDiscount(bestDiscount);
    setDynamicDiscountLabel(bestLabel);
  }, [pricingRules, subtotal, cartItems]);

  // Track initiate checkout
  useEffect(() => {
    if (cartItems.length > 0 && !cartLoading) {
      trackInitiateCheckout(
        cartItems.map(item => ({ id: item.product.id, name: item.product.title, price: item.product.price, category: item.product.category, quantity: item.quantity })),
        subtotal
      );
      serverTrackInitiateCheckout(subtotal, cartItems.length, user?.id);
    }
  }, [cartLoading]);

  // Track abandoned checkout
  useEffect(() => {
    const trackAbandoned = async () => {
      if (!user || cartItems.length === 0) return;
      const cartData = cartItems.map(item => ({ product_id: item.productId, product_title: item.product.title, product_image: item.product.image || null, price: item.product.price, quantity: item.quantity }));
      try {
        const { data: existing } = await supabase.from("abandoned_checkouts").select("id").eq("user_id", user.id).eq("recovered", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existing) {
          await supabase.from("abandoned_checkouts").update({ cart_items: cartData, subtotal, step: "checkout_started", last_activity_at: new Date().toISOString() }).eq("id", existing.id);
          setAbandonedCheckoutId(existing.id);
        } else {
          const { data: newC } = await supabase.from("abandoned_checkouts").insert({ user_id: user.id, cart_items: cartData, subtotal, step: "checkout_started" }).select("id").single();
          if (newC) setAbandonedCheckoutId(newC.id);
        }
      } catch (e) { console.error(e); }
    };
    trackAbandoned();
  }, [user, cartItems.length > 0]);

  const updateAbandonedStep = async (step: string, data?: Record<string, any>) => {
    if (!abandonedCheckoutId) return;
    await supabase.from("abandoned_checkouts").update({ step, last_activity_at: new Date().toISOString(), ...data }).eq("id", abandonedCheckoutId);
  };

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  useEffect(() => {
    if (!authLoading && !user) { toast.error("অর্ডার করতে প্রথমে লগইন করুন"); navigate("/signin"); }
  }, [user, authLoading]);

  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) { toast.error("আপনার কার্ট খালি"); navigate("/cart"); }
  }, [cartItems, cartLoading]);

  // Pre-fill profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, email, address, city, postal_code, division, country").eq("id", user.id).maybeSingle();
      if (profile) {
        const parts = [profile.address, profile.city, profile.postal_code, profile.division, profile.country].filter(Boolean);
        setFormData(prev => ({ ...prev, fullName: profile.full_name || "", phone: profile.phone || "", email: profile.email || user.email || "", address: parts.join(", ") || "" }));
      }
    };
    fetchProfile();
  }, [user]);

  // Auto-select delivery zone
  useEffect(() => {
    if (deliveryZones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    if (field === "phone") setPhoneVerified(false);
  };

  const generateOrderNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return `ORD${code}`;
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      try {
        checkoutSchema.pick({ fullName: true, phone: true, email: true, address: true }).parse(formData);
        if (!selectedZoneId && deliveryZones.length > 0) { toast.error("ডেলিভারি এরিয়া নির্বাচন করুন"); return false; }
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const newErrors: Record<string, string> = {};
          error.errors.forEach(err => { if (err.path[0]) newErrors[err.path[0] as string] = err.message; });
          setErrors(newErrors);
        }
        return false;
      }
    }
    if (step === 1) {
      const selectedMethod = paymentMethods.find((m: any) => m.id === paymentMethod);
      if (paymentMethod !== "cod" && selectedMethod?.manual_number && selectedMethod?.payment_mode !== "api" && !formData.transactionId?.trim()) {
        setErrors({ transactionId: "ট্রান্জেকশন আইডি দিন" });
        return false;
      }
      trackAddPaymentInfo(paymentMethod, total);
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 0) {
        updateAbandonedStep("address_filled", { full_name: formData.fullName, phone: formData.phone, email: formData.email, address: formData.address, delivery_area: selectedZone?.zone_name_bn });
        trackAddShippingInfo(selectedZone?.zone_name_bn || 'default', total);
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // OTP
  const sendOtp = async () => {
    if (!/^01[3-9]\d{8}$/.test(formData.phone)) { toast.error("সঠিক মোবাইল নম্বর দিন"); return; }
    setOtpSending(true); setOtpError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: "+88" + formData.phone, action: "send" } });
      if (error) throw error;
      if (data?.success) { setOtpSent(true); setCountdown(60); toast.success("OTP পাঠানো হয়েছে"); if (data.debug_otp) toast.info(`টেস্ট OTP: ${data.debug_otp}`, { duration: 10000 }); }
      else throw new Error(data?.error || "OTP পাঠাতে সমস্যা");
    } catch { toast.error("OTP পাঠাতে সমস্যা হয়েছে"); } finally { setOtpSending(false); }
  };

  const verifyOtp = async () => {
    if (otpValue.length !== 6) { setOtpError("৬ সংখ্যার OTP দিন"); return; }
    setOtpVerifying(true); setOtpError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: "+88" + formData.phone, action: "verify", otp: otpValue } });
      if (error) throw error;
      if (data?.verified) { setPhoneVerified(true); setShowOtpDialog(false); toast.success("ফোন নম্বর যাচাই সফল!"); await placeOrder(); }
      else setOtpError(data?.error || "ভুল OTP");
    } catch { setOtpError("OTP যাচাই করতে সমস্যা"); } finally { setOtpVerifying(false); }
  };

  const initBkashPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("bkash-payment", {
        body: { action: "create", orderId: orderNumber, amount: totalAmount, callbackUrl: `${window.location.origin}/bkash/callback` },
      });
      if (error) throw error;
      if (data.success && data.bkashURL) {
        localStorage.setItem("pending_bkash_order", JSON.stringify({ orderId, orderNumber, paymentID: data.paymentID }));
        window.location.href = data.bkashURL;
      } else throw new Error(data.error || "বিকাশ পেমেন্ট শুরু করতে সমস্যা");
    } catch (e: any) { toast.error(e.message); setIsSubmitting(false); }
  };

  const initNagadPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("nagad-payment", {
        body: { action: "create", orderId, amount: totalAmount, callbackUrl: `${window.location.origin}/nagad/callback` },
      });
      if (error) throw error;
      if (data.success && data.nagadURL) {
        localStorage.setItem("pending_nagad_order", JSON.stringify({ orderId, orderNumber, paymentRefId: data.paymentRefId }));
        window.location.href = data.nagadURL;
      } else throw new Error(data.error || "নগদ পেমেন্ট শুরু করতে সমস্যা");
    } catch (e: any) { toast.error(e.message); setIsSubmitting(false); }
  };

  const initSSLCommerzPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("sslcommerz-payment", {
        body: {
          action: "create", orderId, amount: totalAmount,
          customerName: formData.fullName, customerEmail: formData.email, customerPhone: formData.phone, customerAddress: formData.address,
          callbackUrl: `${window.location.origin}/payment/callback`,
        },
      });
      if (error) throw error;
      if (data.success && data.gatewayUrl) {
        localStorage.setItem("pending_ssl_order", JSON.stringify({ orderId, orderNumber, sessionKey: data.sessionKey }));
        window.location.href = data.gatewayUrl;
      } else throw new Error(data.error || "SSLCommerz পেমেন্ট শুরু করতে সমস্যা");
    } catch (e: any) { toast.error(e.message); setIsSubmitting(false); }
  };

  const placeOrder = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      const orderTotal = total;
      const apiPaymentMethods = ["bkash", "nagad", "sslcommerz"];
      const isApiPayment = apiPaymentMethods.includes(paymentMethod) && paymentMethods.find((m: any) => m.id === paymentMethod)?.payment_mode === "api";
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id, order_number: orderNumber, status: isApiPayment ? "payment_pending" : "pending",
        subtotal, delivery_charge: deliveryCharge, total: orderTotal, payment_method: paymentMethod,
        transaction_id: isApiPayment ? null : (formData.transactionId || null),
        delivery_area: selectedZone?.zone_name_bn || "default",
        full_name: formData.fullName.trim(), phone: formData.phone.trim(), email: formData.email?.trim() || null,
        address: formData.address.trim(), notes: formData.notes?.trim() || null,
        phone_verified: phoneVerified || !isOtpRequired(),
      }).select().single();
      if (orderError) throw orderError;

      const orderItemsData = cartItems.map(item => ({
        order_id: order.id, product_id: item.productId, product_title: item.product.title,
        product_image: item.product.image || null, price: item.product.price, quantity: item.quantity,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) throw itemsError;

      if (abandonedCheckoutId) {
        await supabase.from("abandoned_checkouts").update({ recovered: true, recovered_order_id: order.id }).eq("id", abandonedCheckoutId);
      }

      const selectedMethodObj = paymentMethods.find((m: any) => m.id === paymentMethod);
      const isApiMode = selectedMethodObj?.payment_mode === "api";

      if (paymentMethod === "bkash" && isApiMode) { await initBkashPayment(order.id, orderNumber, orderTotal); return; }
      if (paymentMethod === "nagad" && isApiMode) { await initNagadPayment(order.id, orderNumber, orderTotal); return; }
      if (paymentMethod === "sslcommerz" && isApiMode) { await initSSLCommerzPayment(order.id, orderNumber, orderTotal); return; }

      await clearCart();
      trackPurchase({
        transaction_id: orderNumber, value: orderTotal, currency: 'BDT', shipping: deliveryCharge, coupon: appliedCoupon?.code,
        items: cartItems.map(item => ({ id: item.product.id, name: item.product.title, price: item.product.price, category: item.product.category, quantity: item.quantity })),
      });
      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      navigate("/order-confirmation", { state: { orderNumber } });
    } catch (e) { console.error(e); toast.error("অর্ডার করতে সমস্যা হয়েছে"); } finally {
      const apiMethods = ["bkash", "nagad", "sslcommerz"];
      if (!apiMethods.includes(paymentMethod)) setIsSubmitting(false);
    }
  };

  const isOtpRequired = () => {
    if (otpSettings.otp_only_for_cod === true) return paymentMethod === "cod";
    if (!otpSettings.otp_enabled) return false;
    if (otpSettings.otp_required_for_cod && paymentMethod === "cod") return true;
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateStep(2) || !user) return;
    updateAbandonedStep("otp_pending", { payment_method: paymentMethod });
    if (isOtpRequired() && !phoneVerified) {
      setShowOtpDialog(true); setOtpValue(""); setOtpError(""); setOtpSent(false);
      await sendOtp();
    } else { await placeOrder(); }
  };

  const selectedZone = deliveryZones.find(z => z.id === selectedZoneId);
  const deliveryCharge = selectedZone?.delivery_charge || (deliveryZones[0]?.delivery_charge || 60);
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const total = Math.max(0, subtotal - couponDiscount - dynamicDiscount + deliveryCharge);

  const iconMap: Record<string, any> = { cod: Truck, bkash: Smartphone, nagad: Smartphone, sslcommerz: CreditCard, card: CreditCard };
  const paymentMethods = dbPaymentMethods.map((m: any) => ({
    id: m.provider, name: m.name_bn,
    description: m.provider === 'cod' ? 'পণ্য হাতে পেয়ে টাকা প্রদান করুন' : (m as any).manual_number ? `${m.name_bn} মোবাইল ব্যাংকিং` : m.name_bn,
    icon: iconMap[m.provider] || CreditCard,
    manual_number: (m as any).manual_number, manual_type: (m as any).manual_type,
    manual_instructions: (m as any).manual_instructions, payment_mode: (m as any).payment_mode || 'manual',
  }));

  if (authLoading || cartLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="container py-6">
        <Link to="/cart" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> শপিং ব্যাগে ফিরে যান
        </Link>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  i === currentStep ? "bg-primary text-primary-foreground shadow-md" :
                  i < currentStep ? "bg-primary/20 text-primary cursor-pointer" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {i < currentStep ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("w-8 md:w-16 h-0.5 mx-1", i < currentStep ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* STEP 1: Shipping */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">ডেলিভারি ঠিকানা</h2>
                  </div>
                  <AddressBookSelector onSelect={(addr) => {
                    setFormData(prev => ({ ...prev, fullName: addr.fullName, phone: addr.phone, address: addr.address }));
                  }} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>পূর্ণ নাম *</Label>
                      <Input className={`mt-1 ${errors.fullName ? "border-destructive" : ""}`} value={formData.fullName} onChange={e => handleInputChange("fullName", e.target.value)} placeholder="আপনার নাম" />
                      {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
                    </div>
                    <div>
                      <Label>মোবাইল নম্বর * {isOtpRequired() && <span className="text-xs text-muted-foreground">(OTP যাচাই হবে)</span>}</Label>
                      <Input className={`mt-1 ${errors.phone ? "border-destructive" : ""}`} value={formData.phone} onChange={e => handleInputChange("phone", e.target.value)} placeholder="01XXXXXXXXX" />
                      {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <Label>ইমেইল</Label>
                      <Input type="email" className={`mt-1 ${errors.email ? "border-destructive" : ""}`} value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder="email@example.com" />
                    </div>
                    <div>
                      <Label>ডেলিভারি এরিয়া *</Label>
                      {deliveryZones.length > 0 ? (
                        <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="এরিয়া নির্বাচন করুন" /></SelectTrigger>
                          <SelectContent>
                            {deliveryZones.map(zone => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.zone_name_bn} — ৳{zone.delivery_charge}
                                {zone.estimated_days_min && ` (${zone.estimated_days_min}-${zone.estimated_days_max} দিন)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <RadioGroup value={selectedZoneId || "inside"} onValueChange={setSelectedZoneId} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="inside" id="inside" /><Label htmlFor="inside" className="font-normal cursor-pointer">ঢাকার ভিতরে (৳60)</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="outside" id="outside" /><Label htmlFor="outside" className="font-normal cursor-pointer">ঢাকার বাইরে (৳120)</Label></div>
                        </RadioGroup>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label>সম্পূর্ণ ঠিকানা *</Label>
                      <Textarea className={`mt-1 ${errors.address ? "border-destructive" : ""}`} rows={3} value={formData.address} onChange={e => handleInputChange("address", e.target.value)} placeholder="বাড়ি নং, রাস্তা, এলাকা, থানা, জেলা" />
                      {errors.address && <p className="text-destructive text-xs mt-1">{errors.address}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Label>অর্ডার নোট (ঐচ্ছিক)</Label>
                      <Textarea className="mt-1" rows={2} value={formData.notes} onChange={e => handleInputChange("notes", e.target.value)} placeholder="অতিরিক্ত নির্দেশনা..." />
                    </div>
                  </div>
                </div>

                {/* Dynamic Additional Fields */}
                {dynamicFields.filter(f => f.field_group === 'additional').length > 0 && (
                  <div className="bg-card rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="w-5 h-5 text-primary" />
                      <h2 className="font-bold text-lg">অতিরিক্ত অপশন</h2>
                    </div>
                    <div className="space-y-4">
                      {dynamicFields.filter(f => f.field_group === 'additional').map(field => (
                        <div key={field.id}>
                          {field.field_type === 'checkbox' && (
                            <label className="flex items-center gap-3 cursor-pointer">
                              <Checkbox checked={!!dynamicFieldValues[field.field_name]} onCheckedChange={checked => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: checked }))} />
                              <span className="text-sm">{field.field_label_bn}</span>
                            </label>
                          )}
                          {field.field_type === 'textarea' && dynamicFieldValues['gift_wrap'] && field.field_name === 'gift_message' && (
                            <div>
                              <Label>{field.field_label_bn}</Label>
                              <Textarea className="mt-1" rows={2} placeholder={field.placeholder || ''} value={dynamicFieldValues[field.field_name] || ''} onChange={e => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))} />
                            </div>
                          )}
                          {field.field_type === 'select' && (
                            <div>
                              <Label>{field.field_label_bn}</Label>
                              <Select value={dynamicFieldValues[field.field_name] || ''} onValueChange={val => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: val }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="morning">সকাল (৯-১২)</SelectItem>
                                  <SelectItem value="afternoon">দুপুর (১২-৫)</SelectItem>
                                  <SelectItem value="evening">সন্ধ্যা (৫-৯)</SelectItem>
                                  <SelectItem value="anytime">যেকোনো সময়</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {field.field_type === 'text' && (
                            <div>
                              <Label>{field.field_label_bn} {field.is_required && '*'}</Label>
                              <Input className="mt-1" placeholder={field.placeholder || ''} value={dynamicFieldValues[field.field_name] || ''} onChange={e => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={nextStep} className="px-8"><span>পেমেন্টে যান</span><ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* STEP 2: Payment */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">পেমেন্ট পদ্ধতি</h2>
                  </div>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {paymentMethods.map(method => (
                        <label key={method.id} className={cn("relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all", paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                          <RadioGroupItem value={method.id} className="sr-only" />
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", paymentMethod === method.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            <method.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{method.name}</p>
                            <p className="text-xs text-muted-foreground">{method.description}</p>
                          </div>
                          {paymentMethod === method.id && <Check className="w-5 h-5 text-primary" />}
                        </label>
                      ))}
                    </div>
                  </RadioGroup>

                  {paymentMethod !== "cod" && (() => {
                    const sel = paymentMethods.find(m => m.id === paymentMethod);
                    if (!sel) return null;
                    if (paymentMethod === "bkash" && sel.payment_mode === "api") {
                      return <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-border"><p className="text-sm">অর্ডার সম্পন্ন করতে বিকাশ পেমেন্ট পেজে নিয়ে যাওয়া হবে।</p></div>;
                    }
                    if (sel.manual_number) {
                      return (
                        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-border">
                          <p className="text-sm">{sel.name} নম্বর: <strong>{sel.manual_number}</strong> ({sel.manual_type || 'Send Money'})</p>
                          {sel.manual_instructions && <p className="text-xs text-muted-foreground mt-1">{sel.manual_instructions}</p>}
                          <Input placeholder="Transaction ID" className={`mt-3 ${errors.transactionId ? "border-destructive" : ""}`} value={formData.transactionId} onChange={e => handleInputChange("transactionId", e.target.value)} />
                          {errors.transactionId && <p className="text-destructive text-xs mt-1">{errors.transactionId}</p>}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {isOtpRequired() && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">নিরাপত্তা যাচাই</p>
                        <p className="text-sm text-green-600 dark:text-green-400">মোবাইল নম্বরে OTP পাঠানো হবে</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" /> পিছনে</Button>
                  <Button onClick={nextStep}><span>রিভিউ করুন</span><ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl p-6 shadow-sm">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Check className="w-5 h-5 text-primary" /> অর্ডার রিভিউ</h2>
                  
                  {/* Shipping Summary */}
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> ডেলিভারি তথ্য</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(0)}>পরিবর্তন</Button>
                    </div>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><strong className="text-foreground">{formData.fullName}</strong></p>
                      <p>{formData.phone} {formData.email && `• ${formData.email}`}</p>
                      <p>{formData.address}</p>
                      <p className="text-primary font-medium">{selectedZone?.zone_name_bn || 'ঢাকা'} — ৳{deliveryCharge}
                        {selectedZone?.estimated_days_min && ` (${selectedZone.estimated_days_min}-${selectedZone.estimated_days_max} দিন)`}
                      </p>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> পেমেন্ট</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>পরিবর্তন</Button>
                    </div>
                    <p className="text-sm">{paymentMethods.find(m => m.id === paymentMethod)?.name || paymentMethod}</p>
                    {formData.transactionId && <p className="text-xs text-muted-foreground">TxnID: {formData.transactionId}</p>}
                  </div>

                  {/* Items */}
                  <div className="mb-4">
                    <h3 className="font-medium text-sm mb-2">পণ্যসমূহ ({cartItems.length}টি)</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex gap-3 p-2 bg-muted/30 rounded-lg">
                          <img src={item.product.image} alt="" className="w-12 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{item.product.title}</p>
                            <p className="text-xs text-muted-foreground">৳{item.product.price} × {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-primary">৳{item.product.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic field values */}
                  {Object.entries(dynamicFieldValues).some(([, v]) => v) && (
                    <div className="p-4 bg-muted/50 rounded-lg mb-4">
                      <h3 className="font-medium text-sm mb-2 flex items-center gap-2"><Gift className="w-4 h-4" /> অতিরিক্ত</h3>
                      {dynamicFieldValues.gift_wrap && <p className="text-sm">🎁 গিফট র‍্যাপ</p>}
                      {dynamicFieldValues.gift_message && <p className="text-xs text-muted-foreground">মেসেজ: {dynamicFieldValues.gift_message}</p>}
                      {dynamicFieldValues.preferred_delivery_time && <p className="text-sm">⏰ সময়: {dynamicFieldValues.preferred_delivery_time}</p>}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" /> পিছনে</Button>
                  <Button onClick={handlePlaceOrder} disabled={isSubmitting} className="px-8">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />প্রসেসিং...</> :
                      isOtpRequired() ? <><Shield className="w-4 h-4 mr-2" />OTP যাচাই করে অর্ডার</> :
                      <><Check className="w-4 h-4 mr-2" />অর্ডার কনফার্ম করুন</>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-lg mb-4">অর্ডার সারাংশ</h2>
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <img src={item.product.image} alt="" className="w-12 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.product.title}</p>
                      <p className="text-xs text-muted-foreground">৳{item.product.price} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">৳{item.product.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="pb-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-2"><Ticket className="w-4 h-4 text-primary" /><span className="font-medium text-sm">কুপন কোড</span></div>
                  <CouponInput subtotal={subtotal} onCouponApplied={setAppliedCoupon} appliedCoupon={appliedCoupon}
                    cartProductIds={cartItems.map(item => item.productId)} cartCategoryIds={cartItems.map(item => item.product.category || '').filter(Boolean)} />
                </div>

                <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span>৳{subtotal}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>কুপন ছাড় ({appliedCoupon?.code})</span><span>-৳{couponDiscount}</span></div>}
                {dynamicDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {dynamicDiscountLabel || 'স্পেশাল ছাড়'}</span>
                    <span>-৳{dynamicDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">ডেলিভারি</span><span>৳{deliveryCharge}</span></div>
                {selectedZone?.estimated_days_min && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> আনুমানিক সময়</span>
                    <span>{selectedZone.estimated_days_min}-{selectedZone.estimated_days_max} দিন</span>
                  </div>
                )}
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-bold text-lg"><span>সর্বমোট</span><span className="text-primary">৳{total}</span></div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Shield, text: 'নিরাপদ' },
                  { icon: Truck, text: 'দ্রুত ডেলিভারি' },
                  { icon: Star, text: 'গ্যারান্টি' },
                ].map((badge, i) => (
                  <div key={i} className="p-2 bg-muted/50 rounded-lg">
                    <badge.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] text-muted-foreground">{badge.text}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                অর্ডার করার মাধ্যমে আপনি আমাদের <Link to="/terms" className="text-primary hover:underline">শর্তাবলী</Link> এবং <Link to="/privacy" className="text-primary hover:underline">গোপনীয়তা নীতি</Link> মেনে নিচ্ছেন
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> ফোন নম্বর যাচাই</DialogTitle>
            <DialogDescription>{formData.phone} নম্বরে ৬ সংখ্যার OTP পাঠানো হয়েছে</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center space-y-4">
              <InputOTP maxLength={6} value={otpValue} onChange={v => { setOtpValue(v); setOtpError(""); }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {otpError && <p className="text-destructive text-sm">{otpError}</p>}
            </div>
            <div className="text-center">
              {countdown > 0 ? <p className="text-sm text-muted-foreground">পুনরায় OTP: <span className="font-bold">{countdown}s</span></p> :
                <Button variant="ghost" size="sm" onClick={sendOtp} disabled={otpSending}>{otpSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />পাঠানো হচ্ছে...</> : "পুনরায় OTP পাঠান"}</Button>}
            </div>
            <Button className="w-full" onClick={verifyOtp} disabled={otpValue.length !== 6 || otpVerifying}>
              {otpVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />যাচাই হচ্ছে...</> : <><Check className="w-4 h-4 mr-2" />যাচাই করে অর্ডার সম্পন্ন করুন</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Checkout;
