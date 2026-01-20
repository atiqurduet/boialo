import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BkashCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCartContext();
  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing");
  const [message, setMessage] = useState("পেমেন্ট যাচাই করা হচ্ছে...");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const paymentID = searchParams.get("paymentID");
      const statusParam = searchParams.get("status");

      if (!paymentID) {
        setStatus("failed");
        setMessage("পেমেন্ট তথ্য পাওয়া যায়নি");
        return;
      }

      // Check if user cancelled
      if (statusParam === "cancel") {
        setStatus("failed");
        setMessage("আপনি পেমেন্ট বাতিল করেছেন");
        return;
      }

      if (statusParam === "failure") {
        setStatus("failed");
        setMessage("পেমেন্ট ব্যর্থ হয়েছে");
        return;
      }

      try {
        // Execute the payment
        const { data, error } = await supabase.functions.invoke("bkash-payment", {
          body: { action: "execute", paymentID },
        });

        if (error) throw error;

        if (data.success) {
          // Get pending order from localStorage
          const pendingOrder = localStorage.getItem("pending_bkash_order");
          if (pendingOrder) {
            const orderData = JSON.parse(pendingOrder);
            
            // Update order with transaction ID
            const { data: order, error: orderError } = await supabase
              .from("orders")
              .update({
                transaction_id: data.trxID,
                status: "confirmed",
              })
              .eq("id", orderData.orderId)
              .select("order_number")
              .single();

            if (orderError) throw orderError;

            // Clear pending order
            localStorage.removeItem("pending_bkash_order");

            // Clear cart
            await clearCart();

            setOrderNumber(order.order_number);
            setStatus("success");
            setMessage("পেমেন্ট সফল হয়েছে!");
          } else {
            // No pending order found, but payment was successful
            setStatus("success");
            setMessage(`পেমেন্ট সফল! Transaction ID: ${data.trxID}`);
          }
        } else {
          setStatus("failed");
          setMessage(data.error || "পেমেন্ট ব্যর্থ হয়েছে");
        }
      } catch (error: any) {
        console.error("bKash callback error:", error);
        setStatus("failed");
        setMessage(error.message || "পেমেন্ট প্রক্রিয়াকরণে সমস্যা হয়েছে");
      }
    };

    processCallback();
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">প্রক্রিয়াকরণ হচ্ছে</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-primary mb-2">সফল!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            {orderNumber ? (
              <Button onClick={() => navigate("/order-confirmation", { state: { orderNumber } })}>
                অর্ডার দেখুন
              </Button>
            ) : (
              <Button onClick={() => navigate("/")}>
                হোমপেজে যান
              </Button>
            )}
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-destructive mb-2">ব্যর্থ!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/cart")}>
                কার্টে ফিরে যান
              </Button>
              <Button onClick={() => navigate("/checkout")}>
                আবার চেষ্টা করুন
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BkashCallback;
