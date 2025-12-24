import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { CheckCircle, Package, Truck, Phone, Mail, Copy, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OrderConfirmation = () => {
  const orderNumber = "WL" + Math.random().toString(36).substr(2, 9).toUpperCase();
  const orderDate = new Date().toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const orderItems = [
    { title: "মুমিনের হারাবার কিছু নেই", quantity: 1, price: 250 },
    { title: "শুদ্ধ ভাষায় কথা বলার কলা-কৌশল", quantity: 2, price: 530 },
  ];

  const subtotal = 780;
  const deliveryCharge = 60;
  const total = 840;

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    toast.success("অর্ডার নম্বর কপি হয়েছে!");
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-600 mb-2">
              অর্ডার সফল হয়েছে!
            </h1>
            <p className="text-muted-foreground">
              আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই আমরা আপনার সাথে যোগাযোগ করব।
            </p>
          </div>

          {/* Order Number */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">অর্ডার নম্বর</p>
                <p className="text-xl font-bold text-primary">{orderNumber}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyOrderNumber}>
                <Copy className="w-4 h-4 mr-2" />
                কপি করুন
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              অর্ডার তারিখ: {orderDate}
            </p>
          </div>

          {/* Order Timeline */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold mb-4">অর্ডার স্ট্যাটাস</h2>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-8 right-8 h-1 bg-muted">
                <div className="h-full w-1/4 bg-primary rounded-full" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 text-center">অর্ডার গৃহীত</span>
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-xs mt-2 text-center text-muted-foreground">প্রসেসিং</span>
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-xs mt-2 text-center text-muted-foreground">শিপিং</span>
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <span className="text-xs mt-2 text-center text-muted-foreground">ডেলিভারি</span>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold mb-4">অর্ডার বিবরণ</h2>
            
            <div className="space-y-3 mb-4">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">পরিমাণ: {item.quantity}</p>
                  </div>
                  <p className="font-bold">৳{item.price}</p>
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
              <div className="flex items-center justify-between font-bold text-lg pt-2 border-t border-border">
                <span>সর্বমোট</span>
                <span className="text-primary">৳{total}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold mb-4">ডেলিভারি তথ্য</h2>
            <div className="space-y-2 text-sm">
              <p><strong>নাম:</strong> মোহাম্মদ আব্দুল্লাহ</p>
              <p><strong>মোবাইল:</strong> 01712345678</p>
              <p><strong>ঠিকানা:</strong> বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা-১২০৫</p>
              <p><strong>পেমেন্ট:</strong> ক্যাশ অন ডেলিভারি</p>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-6">
            <h2 className="font-bold mb-3">সাহায্য প্রয়োজন?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              অর্ডার সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন।
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="tel:09613000000"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="w-4 h-4" />
                09613-000000
              </a>
              <a
                href="mailto:support@wafilife.com"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="w-4 h-4" />
                support@wafilife.com
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/shop" className="flex-1">
              <Button variant="outline" className="w-full">
                কেনাকাটা চালিয়ে যান
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button className="w-full btn-primary">
                হোমপেজে যান
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
