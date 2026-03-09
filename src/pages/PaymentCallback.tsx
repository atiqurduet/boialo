import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCartContext();
  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing");
  const [message, setMessage] = useState("পেমেন্ট যাচাই করা হচ্ছে...");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const callbackStatus = searchParams.get("status");
      const orderId = searchParams.get("order_id");
      const valId = searchParams.get("val_id");

      // Handle Nagad callback
      const pendingNagad = localStorage.getItem("pending_nagad_order");
      if (pendingNagad) {
        const nagadData = JSON.parse(pendingNagad);
        try {
          const paymentRefId = searchParams.get("payment_ref_id") || nagadData.paymentRefId;
          const { data, error } = await supabase.functions.invoke("nagad-payment", {
            body: { action: "verify", paymentRefId },
          });

          if (error) throw error;

          if (data.success) {
            await supabase.from("orders").update({
              transaction_id: data.transactionId,
              status: "confirmed",
            }).eq("id", nagadData.orderId);

            localStorage.removeItem("pending_nagad_order");
            await clearCart();
            setOrderNumber(nagadData.orderNumber);
            setStatus("success");
            setMessage("নগদ পেমেন্ট সফল হয়েছে!");
          } else {
            setStatus("failed");
            setMessage(data.error || "নগদ পেমেন্ট ব্যর্থ");
          }
        } catch (e: any) {
          setStatus("failed");
          setMessage(e.message || "পেমেন্ট যাচাই করতে সমস্যা");
        }
        return;
      }

      // Handle SSLCommerz callback
      const pendingSSL = localStorage.getItem("pending_ssl_order");
      if (pendingSSL) {
        const sslData = JSON.parse(pendingSSL);

        if (callbackStatus === "cancel") {
          setStatus("failed");
          setMessage("আপনি পেমেন্ট বাতিল করেছেন");
          localStorage.removeItem("pending_ssl_order");
          return;
        }

        if (callbackStatus === "failed") {
          setStatus("failed");
          setMessage("পেমেন্ট ব্যর্থ হয়েছে");
          localStorage.removeItem("pending_ssl_order");
          return;
        }

        try {
          if (valId) {
            const { data, error } = await supabase.functions.invoke("sslcommerz-payment", {
              body: { action: "validate", valId },
            });

            if (error) throw error;

            if (data.success) {
              await supabase.from("orders").update({
                transaction_id: data.bankTranId || data.transactionId,
                status: "confirmed",
              }).eq("id", sslData.orderId);

              localStorage.removeItem("pending_ssl_order");
              await clearCart();
              setOrderNumber(sslData.orderNumber);
              setStatus("success");
              setMessage(`পেমেন্ট সফল! ${data.cardType ? `(${data.cardType})` : ""}`);
            } else {
              setStatus("failed");
              setMessage("পেমেন্ট যাচাই ব্যর্থ");
            }
          } else if (callbackStatus === "success") {
            // IPN will handle the confirmation
            localStorage.removeItem("pending_ssl_order");
            await clearCart();
            setOrderNumber(sslData.orderNumber);
            setStatus("success");
            setMessage("পেমেন্ট সফল হয়েছে!");
          } else {
            setStatus("failed");
            setMessage("পেমেন্ট স্ট্যাটাস অজানা");
          }
        } catch (e: any) {
          setStatus("failed");
          setMessage(e.message || "পেমেন্ট যাচাই করতে সমস্যা");
        }
        localStorage.removeItem("pending_ssl_order");
        return;
      }

      // Generic fallback
      if (callbackStatus === "success") {
        setStatus("success");
        setMessage("পেমেন্ট সফল হয়েছে!");
      } else {
        setStatus("failed");
        setMessage("পেমেন্ট ব্যর্থ হয়েছে বা বাতিল করা হয়েছে");
      }
    };

    processCallback();
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center">
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
              <Button onClick={() => navigate("/")}>হোমপেজে যান</Button>
            )}
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-destructive mb-2">ব্যর্থ!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/cart")}>কার্টে ফিরে যান</Button>
              <Button onClick={() => navigate("/checkout")}>আবার চেষ্টা করুন</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
