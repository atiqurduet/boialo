import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { CheckCircle, Package, Truck, Phone, Mail, Copy, Home, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { InvoiceModal } from "@/components/InvoiceModal";

interface OrderItem {
  id: string;
  product_title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  payment_method: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
}

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { downloadInvoice, downloading, invoiceHtml, printInvoice, saveAsPdf, downloadAsHtml, closeInvoice } = useInvoiceDownload();

  const orderNumberFromState = location.state?.orderNumber;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderNumberFromState) {
        setLoading(false);
        return;
      }

      try {
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("order_number", orderNumberFromState)
          .eq("user_id", user.id)
          .single();

        if (orderError) throw orderError;

        setOrder(orderData);

        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderData.id);

        if (itemsError) throw itemsError;

        setOrderItems(itemsData || []);
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrder();
    }
  }, [user, orderNumberFromState, authLoading]);

  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_number);
      toast.success("অর্ডার নম্বর কপি হয়েছে!");
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cod: "ক্যাশ অন ডেলিভারি",
      bkash: "বিকাশ",
      nagad: "নগদ",
      card: "কার্ড পেমেন্ট",
    };
    return methods[method] || method;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">অর্ডার পাওয়া যায়নি</h1>
            <p className="text-muted-foreground mb-6">
              দুঃখিত, এই অর্ডারটি খুঁজে পাওয়া যায়নি।
            </p>
            <Link to="/">
              <Button>হোমপেজে যান</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const orderDate = new Date(order.created_at).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              অর্ডার সফল হয়েছে!
            </h1>
            <p className="text-muted-foreground">
              আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই আমরা আপনার সাথে যোগাযোগ করব।
            </p>
          </div>

          {/* Order Number */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">অর্ডার নম্বর</p>
                <p className="text-xl font-bold text-primary">{order.order_number}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyOrderNumber}>
                  <Copy className="w-4 h-4 mr-2" />
                  কপি করুন
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadInvoice(order.id)}
                  disabled={downloading === order.id}
                >
                  {downloading === order.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  ইনভয়েস
                </Button>
              </div>
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
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.product_title}</p>
                    <p className="text-sm text-muted-foreground">পরিমাণ: {item.quantity}</p>
                  </div>
                  <p className="font-bold">৳{Number(item.price) * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span>৳{Number(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                <span>৳{Number(order.delivery_charge)}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-lg pt-2 border-t border-border">
                <span>সর্বমোট</span>
                <span className="text-primary">৳{Number(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold mb-4">ডেলিভারি তথ্য</h2>
            <div className="space-y-2 text-sm">
              <p><strong>নাম:</strong> {order.full_name}</p>
              <p><strong>মোবাইল:</strong> {order.phone}</p>
              <p><strong>ঠিকানা:</strong> {order.address}</p>
              <p><strong>পেমেন্ট:</strong> {getPaymentMethodLabel(order.payment_method)}</p>
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
                href="tel:01714005986"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="w-4 h-4" />
                01714005986
              </a>
              <a
                href="mailto:support@boialo.com"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="w-4 h-4" />
                support@boialo.com
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
              <Button className="w-full">
                হোমপেজে যান
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      <InvoiceModal
        isOpen={!!invoiceHtml}
        onClose={closeInvoice}
        invoiceHtml={invoiceHtml}
        onPrint={printInvoice}
        onSaveAsPdf={saveAsPdf}
        onDownloadHtml={downloadAsHtml}
      />
    </div>
  );
};

export default OrderConfirmation;