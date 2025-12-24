import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { sampleProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Check, CreditCard, Smartphone, Truck, MapPin, ChevronLeft } from "lucide-react";

interface CartItem {
  product: typeof sampleProducts[0];
  quantity: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [cartItems] = useState<CartItem[]>([
    { product: sampleProducts[0], quantity: 1 },
    { product: sampleProducts[1], quantity: 2 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryArea, setDeliveryArea] = useState("inside");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    // Simulate order processing
    setTimeout(() => {
      navigate("/order-confirmation");
    }, 1000);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
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
                  <Input id="name" placeholder="আপনার নাম লিখুন" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phone">মোবাইল নম্বর *</Label>
                  <Input id="phone" placeholder="01XXXXXXXXX" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">ইমেইল</Label>
                  <Input id="email" type="email" placeholder="email@example.com" className="mt-1" />
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
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">অর্ডার নোট (ঐচ্ছিক)</Label>
                  <Textarea
                    id="notes"
                    placeholder="অতিরিক্ত নির্দেশনা থাকলে লিখুন..."
                    className="mt-1"
                    rows={2}
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
                <div className="mt-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <p className="text-sm text-pink-800">
                    বিকাশ নম্বর: <strong>01XXX-XXXXXX</strong> (মার্চেন্ট)
                    <br />
                    Send Money করে ট্রান্জেকশন আইডি দিন
                  </p>
                  <Input placeholder="Transaction ID" className="mt-3" />
                </div>
              )}

              {paymentMethod === "nagad" && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    নগদ নম্বর: <strong>01XXX-XXXXXX</strong> (মার্চেন্ট)
                    <br />
                    Send Money করে ট্রান্জেকশন আইডি দিন
                  </p>
                  <Input placeholder="Transaction ID" className="mt-3" />
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-lg mb-4">অর্ডার সারাংশ</h2>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
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
                className="w-full btn-primary mt-6" 
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? "প্রসেসিং..." : "অর্ডার কনফার্ম করুন"}
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
