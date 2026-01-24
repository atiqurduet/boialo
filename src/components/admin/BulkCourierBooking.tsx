import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface CourierProvider {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
}

interface BookingResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  trackingCode?: string;
  error?: string;
}

interface BulkCourierBookingProps {
  orderIds: string[];
  onComplete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkCourierBooking = ({
  orderIds,
  onComplete,
  open,
  onOpenChange,
}: BulkCourierBookingProps) => {
  const queryClient = useQueryClient();
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BookingResult[]>([]);

  // Fetch available couriers
  const { data: couriers } = useQuery({
    queryKey: ["active-courier-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_providers")
        .select("*")
        .eq("is_active", true)
        .neq("provider", "manual")
        .order("sort_order");
      if (error) throw error;
      return data as CourierProvider[];
    },
  });

  // Fetch orders info
  const { data: orders } = useQuery({
    queryKey: ["bulk-booking-orders", orderIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, courier_provider, tracking_number")
        .in("id", orderIds);
      if (error) throw error;
      return data;
    },
    enabled: orderIds.length > 0,
  });

  const handleBulkBook = async () => {
    if (!selectedCourier) {
      toast.error("একটি কুরিয়ার সিলেক্ট করুন");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const bookingResults: BookingResult[] = [];
    const total = orderIds.length;

    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      const order = orders?.find((o) => o.id === orderId);

      // Skip if already booked
      if (order?.tracking_number) {
        bookingResults.push({
          orderId,
          orderNumber: order.order_number,
          success: false,
          error: "ইতোমধ্যে বুক করা হয়েছে",
        });
        setProgress(((i + 1) / total) * 100);
        continue;
      }

      try {
        const { data, error } = await supabase.functions.invoke("courier-booking", {
          body: { order_id: orderId, courier_provider: selectedCourier },
        });

        if (error || !data.success) {
          bookingResults.push({
            orderId,
            orderNumber: order?.order_number || orderId,
            success: false,
            error: data?.error || error?.message || "বুকিং ব্যর্থ",
          });
        } else {
          bookingResults.push({
            orderId,
            orderNumber: order?.order_number || orderId,
            success: true,
            trackingCode: data.tracking_code,
          });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "অজানা ত্রুটি";
        bookingResults.push({
          orderId,
          orderNumber: order?.order_number || orderId,
          success: false,
          error: errorMessage,
        });
      }

      setResults([...bookingResults]);
      setProgress(((i + 1) / total) * 100);

      // Small delay between API calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsProcessing(false);

    const successCount = bookingResults.filter((r) => r.success).length;
    const failCount = bookingResults.filter((r) => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount}টি অর্ডার সফলভাবে বুক হয়েছে`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    }
    if (failCount > 0) {
      toast.warning(`${failCount}টি অর্ডার বুক করা যায়নি`);
    }

    onComplete?.();
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            বাল্ক কুরিয়ার বুকিং
          </DialogTitle>
          <DialogDescription>
            {orderIds.length}টি অর্ডার একসাথে কুরিয়ারে বুক করুন
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isProcessing && results.length === 0 && (
            <>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger>
                  <SelectValue placeholder="কুরিয়ার সিলেক্ট করুন" />
                </SelectTrigger>
                <SelectContent>
                  {couriers?.map((courier) => (
                    <SelectItem key={courier.id} value={courier.provider}>
                      {courier.name_bn} ({courier.name_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  নিশ্চিত করুন যে কুরিয়ার API কনফিগার করা আছে
                </p>
                <p className="text-muted-foreground">
                  ইতোমধ্যে বুক করা অর্ডার স্কিপ করা হবে
                </p>
              </div>

              <Button
                onClick={handleBulkBook}
                disabled={!selectedCourier}
                className="w-full"
              >
                <Truck className="h-4 w-4 mr-2" />
                {orderIds.length}টি অর্ডার বুক করুন
              </Button>
            </>
          )}

          {(isProcessing || results.length > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>প্রগ্রেস</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              {results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      সফল: {successCount}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      ব্যর্থ: {failCount}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {results.map((result) => (
                      <div
                        key={result.orderId}
                        className={`text-sm p-2 rounded flex items-center justify-between ${
                          result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                        }`}
                      >
                        <span className="font-mono">#{result.orderNumber}</span>
                        <span>
                          {result.success
                            ? result.trackingCode
                            : result.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  প্রসেসিং হচ্ছে...
                </div>
              )}

              {!isProcessing && results.length > 0 && (
                <Button onClick={() => onOpenChange(false)} className="w-full">
                  বন্ধ করুন
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
