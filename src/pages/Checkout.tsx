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
import { CreditCard, Smartphone, Truck, MapPin, ChevronLeft, Loader2, Shield, Phone, Ticket, Zap, Star, Package, Lock, Check } from "lucide-react";
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

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart, loading: cartLoading } = useCartContext();
  const { user, loading: authLoading } = useAuth();

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
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSettings, setOtpSettings] = useState({
    otp_enabled: false, otp_only_for_cod: false, otp_required_for_cod: false, otp_required_for_new_customers: false,
  });

  // Fetch all config data
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

  // Dynamic pricing
  useEffect(() => {
    if (pricingRules.length === 0 || cartItems.length === 0) {
      setDynamicDiscount(0); setDynamicDiscountLabel(""); return;
    }
    let bestDiscount = 0, bestLabel = "";
    for (const rule of pricingRules) {
      const now = new Date();
      if (rule.starts_at && new Date(rule.starts_at) > now) continue;
      if (rule.ends_at && new Date(rule.ends_at) < now) continue;
      const config = rule.condition_config || {};
      let applies = false;
      switch (rule.rule_type) {
        case 'min_order': if (subtotal >= (config.min_amount || 0)) applies = true; break;
        case 'bulk_discount': { const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0); if (totalQty >= (config.min_quantity || 0)) applies = true; break; }
        case 'first_order': case 'time_based': applies = true; break;
      }
      if (applies) {
        const discount = rule.discount_type === 'percentage' ? Math.round(subtotal * rule.discount_value / 100) : rule.discount_value;
        if (discount > bestDiscount) { bestDiscount = discount; bestLabel = rule.name_bn; }
      }
    }
    setDynamicDiscount(bestDiscount); setDynamicDiscountLabel(bestLabel);
  }, [pricingRules, subtotal, cartItems]);

  // Analytics
  useEffect(() => {
    if (cartItems.length > 0 && !cartLoading) {
      trackInitiateCheckout(cartItems.map(item => ({ id: item.product.id, name: item.product.title, price: item.product.price, category: item.product.category, quantity: item.quantity })), subtotal);
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

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  useEffect(() => { if (!authLoading && !user) { toast.error("অর্ডার করতে প্রথমে লগইন করুন"); navigate("/signin"); } }, [user, authLoading]);
  useEffect(() => { if (!cartLoading && cartItems.length === 0) { toast.error("আপনার কার্ট খালি"); navigate("/cart"); } }, [cartItems, cartLoading]);

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

  useEffect(() => { if (deliveryZones.length > 0 && !selectedZoneId) setSelectedZoneId(deliveryZones[0].id); }, [deliveryZones]);

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

  const validateForm = () => {
    try {
      checkoutSchema.pick({ fullName: true, phone: true, email: true, address: true }).parse(formData);
      if (!selectedZoneId && deliveryZones.length > 0) { toast.error("ডেলিভারি এরিয়া নির্বাচন করুন"); return false; }
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
        error.errors.forEach(err => { if (err.path[0]) newErrors[err.path[0] as string] = err.message; });
        setErrors(newErrors);
        // Scroll to first error
        const firstErrorKey = error.errors[0]?.path[0] as string;
        if (firstErrorKey) {
          document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }
  };

  // OTP
  const sendOtp = async () => {
    if (!/^01[3-9]\d{8}$/.test(formData.phone)) { toast.error("সঠিক মোবাইল নম্বর দিন"); return; }
    setOtpSending(true); setOtpError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: "+88" + formData.phone, action: "send" } });
      if (error) throw error;
      if (data?.success) { setCountdown(60); toast.success("OTP পাঠানো হয়েছে"); if (data.debug_otp) toast.info(`টেস্ট OTP: ${data.debug_otp}`, { duration: 10000 }); }
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
      const { data, error } = await supabase.functions.invoke("bkash-payment", { body: { action: "create", orderId: orderNumber, amount: totalAmount, callbackUrl: `${window.location.origin}/bkash/callback` } });
      if (error) throw error;
      if (data.success && data.bkashURL) {
        localStorage.setItem("pending_bkash_order", JSON.stringify({ orderId, orderNumber, paymentID: data.paymentID }));
        window.location.href = data.bkashURL;
      } else throw new Error(data.error || "বিকাশ পেমেন্ট শুরু করতে সমস্যা");
    } catch (e: any) { toast.error(e.message); setIsSubmitting(false); }
  };

  const initNagadPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("nagad-payment", { body: { action: "create", orderId, amount: totalAmount, callbackUrl: `${window.location.origin}/nagad/callback` } });
      if (error) throw error;
      if (data.success && data.nagadURL) {
        localStorage.setItem("pending_nagad_order", JSON.stringify({ orderId, orderNumber, paymentRefId: data.paymentRefId }));
        window.location.href = data.nagadURL;
      } else throw new Error(data.error || "নগদ পেমেন্ট শুরু করতে সমস্যা");
    } catch (e: any) { toast.error(e.message); setIsSubmitting(false); }
  };

  const initSSLCommerzPayment = async (orderId: string, orderNumber: string, totalAmount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("sslcommerz-payment", { body: { action: "create", orderId, amount: totalAmount, customerName: formData.fullName, customerEmail: formData.email, customerPhone: formData.phone, customerAddress: formData.address, callbackUrl: `${window.location.origin}/payment/callback` } });
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
      serverTrackPurchase({ transaction_id: orderNumber, value: orderTotal, items: cartItems.map(i => ({ id: i.product.id, name: i.product.title, price: i.product.price })) }, user?.id);
      trackAddShippingInfo(selectedZone?.zone_name_bn || 'default', orderTotal);
      trackAddPaymentInfo(paymentMethod, orderTotal);
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
    if (!validateForm() || !user) return;
    if (isOtpRequired() && !phoneVerified) {
      setShowOtpDialog(true); setOtpValue(""); setOtpError("");
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
    description: m.provider === 'cod' ? 'পণ্য হাতে পেয়ে টাকা দিন' : m.manual_number ? `${m.manual_type || 'Send Money'}` : m.name_bn,
    icon: iconMap[m.provider] || CreditCard,
    manual_number: m.manual_number, manual_type: m.manual_type,
    manual_instructions: m.manual_instructions, payment_mode: m.payment_mode || 'manual',
  }));

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const additionalFields = dynamicFields.filter(f => f.field_group === 'additional');

  return (
    <div className="min-h-screen bg-muted/30">
      <AnnouncementBar />
      <Header />

      <main className="container max-w-4xl py-4 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> কার্টে ফিরুন
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span>নিরাপদ চেকআউট</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* ===== Section 1: Delivery Info ===== */}
            <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</div>
                  ডেলিভারি তথ্য
                </h2>
              </div>
              <div className="p-5">
                <AddressBookSelector onSelect={(addr) => {
                  setFormData(prev => ({ ...prev, fullName: addr.fullName, phone: addr.phone, address: addr.address }));
                }} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  <div id="field-fullName" className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">পূর্ণ নাম *</Label>
                    <Input
                      className={cn("h-10 rounded-lg bg-muted/30 border-border/50", errors.fullName && "border-destructive")}
                      value={formData.fullName}
                      onChange={e => handleInputChange("fullName", e.target.value)}
                      placeholder="আপনার নাম"
                    />
                    {errors.fullName && <p className="text-destructive text-[11px]">{errors.fullName}</p>}
                  </div>
                  <div id="field-phone" className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">মোবাইল *</Label>
                    <Input
                      className={cn("h-10 rounded-lg bg-muted/30 border-border/50", errors.phone && "border-destructive")}
                      value={formData.phone}
                      onChange={e => handleInputChange("phone", e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                    {errors.phone && <p className="text-destructive text-[11px]">{errors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">ইমেইল (ঐচ্ছিক)</Label>
                    <Input
                      type="email"
                      className="h-10 rounded-lg bg-muted/30 border-border/50"
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">ডেলিভারি এরিয়া *</Label>
                    {deliveryZones.length > 0 ? (
                      <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                        <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-border/50"><SelectValue placeholder="এরিয়া নির্বাচন" /></SelectTrigger>
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
                      <RadioGroup value={selectedZoneId || "inside"} onValueChange={setSelectedZoneId} className="flex gap-2">
                        <label className={cn("flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm", (selectedZoneId || "inside") === "inside" ? "border-primary bg-primary/5" : "border-border/50")}>
                          <RadioGroupItem value="inside" /> ঢাকার ভিতরে (৳60)
                        </label>
                        <label className={cn("flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm", selectedZoneId === "outside" ? "border-primary bg-primary/5" : "border-border/50")}>
                          <RadioGroupItem value="outside" /> ঢাকার বাইরে (৳120)
                        </label>
                      </RadioGroup>
                    )}
                  </div>
                  <div id="field-address" className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">সম্পূর্ণ ঠিকানা *</Label>
                    <Textarea
                      className={cn("rounded-lg bg-muted/30 border-border/50 resize-none", errors.address && "border-destructive")}
                      rows={2}
                      value={formData.address}
                      onChange={e => handleInputChange("address", e.target.value)}
                      placeholder="বাড়ি নং, রাস্তা, এলাকা, থানা, জেলা"
                    />
                    {errors.address && <p className="text-destructive text-[11px]">{errors.address}</p>}
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">অর্ডার নোট (ঐচ্ছিক)</Label>
                    <Input
                      className="h-10 rounded-lg bg-muted/30 border-border/50"
                      value={formData.notes}
                      onChange={e => handleInputChange("notes", e.target.value)}
                      placeholder="বিশেষ কোনো নির্দেশনা..."
                    />
                  </div>
                </div>

                {/* Dynamic Additional Fields inline */}
                {additionalFields.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                    {additionalFields.map(field => (
                      <div key={field.id}>
                        {field.field_type === 'checkbox' && (
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <Checkbox checked={!!dynamicFieldValues[field.field_name]} onCheckedChange={checked => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: checked }))} />
                            <span className="text-sm">{field.field_label_bn}</span>
                          </label>
                        )}
                        {field.field_type === 'textarea' && dynamicFieldValues['gift_wrap'] && field.field_name === 'gift_message' && (
                          <div className="space-y-1 pl-7">
                            <Label className="text-xs text-muted-foreground">{field.field_label_bn}</Label>
                            <Textarea className="rounded-lg bg-muted/30 border-border/50 resize-none" rows={2} placeholder={field.placeholder || ''} value={dynamicFieldValues[field.field_name] || ''} onChange={e => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))} />
                          </div>
                        )}
                        {field.field_type === 'select' && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{field.field_label_bn}</Label>
                            <Select value={dynamicFieldValues[field.field_name] || 'none'} onValueChange={val => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: val === 'none' ? '' : val }))}>
                              <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-border/50"><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">নির্বাচন করুন</SelectItem>
                                <SelectItem value="morning">সকাল (৯-১২)</SelectItem>
                                <SelectItem value="afternoon">দুপুর (১২-৫)</SelectItem>
                                <SelectItem value="evening">সন্ধ্যা (৫-৯)</SelectItem>
                                <SelectItem value="anytime">যেকোনো সময়</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {field.field_type === 'text' && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{field.field_label_bn} {field.is_required && '*'}</Label>
                            <Input className="h-10 rounded-lg bg-muted/30 border-border/50" placeholder={field.placeholder || ''} value={dynamicFieldValues[field.field_name] || ''} onChange={e => setDynamicFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ===== Section 2: Payment ===== */}
            <section className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</div>
                  পেমেন্ট পদ্ধতি
                </h2>
              </div>
              <div className="p-5">
                <RadioGroup value={paymentMethod} onValueChange={(val) => { setPaymentMethod(val); setFormData(prev => ({ ...prev, transactionId: "" })); setErrors(prev => ({ ...prev, transactionId: "" })); }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {paymentMethods.map(method => {
                      const Icon = method.icon;
                      return (
                        <label
                          key={method.id}
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                            paymentMethod === method.id
                              ? "border-primary bg-primary/5"
                              : "border-border/50 hover:border-border"
                          )}
                        >
                          <RadioGroupItem value={method.id} className="shrink-0" />
                          <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{method.name}</p>
                            <p className="text-[11px] text-muted-foreground">{method.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>

                {/* Payment Details */}
                {paymentMethod !== "cod" && (() => {
                  const sel = paymentMethods.find(m => m.id === paymentMethod);
                  if (!sel) return null;
                  if (sel.payment_mode === "api") {
                    return (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary shrink-0" />
                        <span>অর্ডার কনফার্ম করলে <strong>{sel.name}</strong> পেমেন্ট পেজে যাবেন</span>
                      </div>
                    );
                  }
                  if (sel.manual_number) {
                    return (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-muted-foreground font-medium">{sel.name} নম্বর</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sel.manual_type || 'Send Money'}</span>
                          </div>
                          <p className="text-base font-bold font-mono tracking-wider">{sel.manual_number}</p>
                          {sel.manual_instructions && <p className="text-[11px] text-muted-foreground mt-1">{sel.manual_instructions}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">ট্রান্জেকশন আইডি *</Label>
                          <Input
                            placeholder="Transaction ID লিখুন"
                            className={cn("h-10 rounded-lg bg-muted/30 border-border/50", errors.transactionId && "border-destructive")}
                            value={formData.transactionId}
                            onChange={e => handleInputChange("transactionId", e.target.value)}
                          />
                          {errors.transactionId && <p className="text-destructive text-[11px]">{errors.transactionId}</p>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </section>

            {/* ===== Place Order Button (Mobile) ===== */}
            <div className="lg:hidden">
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />প্রসেসিং...</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" />৳{total} — অর্ডার কনফার্ম করুন</>
                )}
              </Button>
              {isOtpRequired() && (
                <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> OTP যাচাই হবে
                </p>
              )}
            </div>
          </div>

          {/* Right: Sticky Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden sticky top-20">
              {/* Items */}
              <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  অর্ডার সারাংশ
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalItems}টি</span>
                </h2>
              </div>

              <div className="px-4 py-3 max-h-48 overflow-y-auto border-b border-border/30">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3 items-center py-1.5">
                    <div className="relative shrink-0">
                      <img src={item.product.image} alt="" className="w-11 h-14 object-cover rounded-lg border border-border/30" />
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center min-w-[18px]">
                        {item.quantity}
                      </span>
                    </div>
                    <p className="text-xs font-medium line-clamp-2 flex-1 leading-snug">{item.product.title}</p>
                    <p className="text-xs font-bold shrink-0">৳{item.product.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="px-5 py-3 border-b border-border/30">
                <CouponInput
                  subtotal={subtotal}
                  onCouponApplied={setAppliedCoupon}
                  appliedCoupon={appliedCoupon}
                  cartProductIds={cartItems.map(item => item.productId)}
                  cartCategoryIds={cartItems.map(item => item.product.category || '').filter(Boolean)}
                />
              </div>

              {/* Price */}
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span>৳{subtotal}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {appliedCoupon?.code}</span>
                    <span>-৳{couponDiscount}</span>
                  </div>
                )}
                {dynamicDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {dynamicDiscountLabel || 'ছাড়'}</span>
                    <span>-৳{dynamicDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> ডেলিভারি</span>
                  <span>৳{deliveryCharge}</span>
                </div>
                {selectedZone?.estimated_days_min && (
                  <p className="text-[11px] text-muted-foreground text-right">{selectedZone.estimated_days_min}-{selectedZone.estimated_days_max} দিনে ডেলিভারি</p>
                )}
                <div className="border-t border-border/50 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">সর্বমোট</span>
                    <span className="font-bold text-xl text-primary">৳{total}</span>
                  </div>
                </div>
              </div>

              {/* Place Order (Desktop) */}
              <div className="px-5 pb-4 hidden lg:block">
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />প্রসেসিং...</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" />অর্ডার কনফার্ম করুন</>
                  )}
                </Button>
                {isOtpRequired() && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> মোবাইলে OTP যাচাই হবে
                  </p>
                )}
              </div>

              {/* Trust */}
              <div className="px-5 py-3 border-t border-border/30 bg-muted/20">
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                  {[{ icon: Shield, text: 'নিরাপদ' }, { icon: Truck, text: 'দ্রুত ডেলিভারি' }, { icon: Star, text: 'গ্যারান্টি' }].map((b, i) => (
                    <div key={i} className="flex items-center gap-1"><b.icon className="w-3 h-3 text-primary" /><span>{b.text}</span></div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  অর্ডার করে আপনি <Link to="/terms" className="text-primary hover:underline">শর্তাবলী</Link> মেনে নিচ্ছেন
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              ফোন নম্বর যাচাই
            </DialogTitle>
            <DialogDescription className="text-xs">{formData.phone} নম্বরে ৬ সংখ্যার OTP পাঠানো হয়েছে</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center space-y-3">
              <InputOTP maxLength={6} value={otpValue} onChange={v => { setOtpValue(v); setOtpError(""); }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {otpError && <p className="text-destructive text-xs">{otpError}</p>}
            </div>
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-muted-foreground">পুনরায় OTP: <span className="font-bold text-foreground">{countdown}s</span></p>
              ) : (
                <Button variant="ghost" size="sm" onClick={sendOtp} disabled={otpSending} className="text-xs">
                  {otpSending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />পাঠানো হচ্ছে...</> : "পুনরায় OTP পাঠান"}
                </Button>
              )}
            </div>
            <Button className="w-full h-11 rounded-xl font-semibold" onClick={verifyOtp} disabled={otpValue.length !== 6 || otpVerifying}>
              {otpVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />যাচাই হচ্ছে...</> : <><Check className="w-4 h-4 mr-2" />যাচাই করে অর্ডার করুন</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Checkout;
