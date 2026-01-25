import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, CreditCard, Truck, RefreshCw } from "lucide-react";

interface BulkStatusUpdateProps {
  orderIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ORDER_STATUSES = [
  { value: "pending", label: "পেন্ডিং" },
  { value: "processing", label: "প্রসেসিং" },
  { value: "shipped", label: "শিপড" },
  { value: "delivered", label: "ডেলিভার্ড" },
  { value: "cancelled", label: "বাতিল" },
  { value: "returned", label: "রিটার্ন" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "পেন্ডিং" },
  { value: "paid", label: "পেইড" },
  { value: "partial", label: "আংশিক" },
  { value: "cod_pending", label: "COD পেন্ডিং" },
  { value: "cod_collected", label: "COD কালেক্টেড" },
  { value: "refunded", label: "রিফান্ড" },
  { value: "failed", label: "ব্যর্থ" },
];

const COURIER_STATUSES = [
  { value: "not_booked", label: "বুক করা হয়নি" },
  { value: "booked", label: "বুক হয়েছে" },
  { value: "picked_up", label: "পিকআপ হয়েছে" },
  { value: "in_transit", label: "ট্রানজিটে" },
  { value: "out_for_delivery", label: "ডেলিভারির জন্য বের হয়েছে" },
  { value: "delivered", label: "ডেলিভার্ড" },
  { value: "failed", label: "ব্যর্থ" },
  { value: "returned", label: "রিটার্ন" },
];

export const BulkStatusUpdate = ({
  orderIds,
  open,
  onOpenChange,
  onComplete,
}: BulkStatusUpdateProps) => {
  const queryClient = useQueryClient();
  const [statusType, setStatusType] = useState<"order" | "payment" | "courier">("order");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const getStatusOptions = () => {
    switch (statusType) {
      case "order":
        return ORDER_STATUSES;
      case "payment":
        return PAYMENT_STATUSES;
      case "courier":
        return COURIER_STATUSES;
      default:
        return [];
    }
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStatus) {
        throw new Error("স্ট্যাটাস সিলেক্ট করুন");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const total = orderIds.length;
      let successCount = 0;
      let errorCount = 0;

      setProgress({ current: 0, total });

      for (let i = 0; i < orderIds.length; i++) {
        const orderId = orderIds[i];
        
        try {
          // Get current order data for history
          const { data: currentOrder } = await supabase
            .from("orders")
            .select("status, payment_status, courier_status, order_number")
            .eq("id", orderId)
            .single();

          // Build update object based on status type
          const updateData: Record<string, unknown> = {};
          let historyStatus = "";
          let previousStatus = "";

          switch (statusType) {
            case "order":
              updateData.status = selectedStatus;
              historyStatus = `order_status:${selectedStatus}`;
              previousStatus = currentOrder?.status || "";
              if (selectedStatus === "shipped") {
                updateData.shipped_at = new Date().toISOString();
              } else if (selectedStatus === "delivered") {
                updateData.delivered_at = new Date().toISOString();
              }
              break;
            case "payment":
              updateData.payment_status = selectedStatus;
              historyStatus = `payment_status:${selectedStatus}`;
              previousStatus = currentOrder?.payment_status || "";
              break;
            case "courier":
              updateData.courier_status = selectedStatus;
              historyStatus = `courier_status:${selectedStatus}`;
              previousStatus = currentOrder?.courier_status || "";
              break;
          }

          // Update the order
          const { error: updateError } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", orderId);

          if (updateError) throw updateError;

          // Record history
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            status: historyStatus,
            notes: statusNote || `বাল্ক আপডেট: ${orderIds.length}টি অর্ডার`,
            changed_by: user?.id || null,
            metadata: { 
              previous_status: previousStatus, 
              type: statusType,
              bulk_update: true,
              batch_size: orderIds.length
            },
          });

          // Send SMS for order status changes
          if (statusType === "order" && currentOrder) {
            try {
              await supabase.functions.invoke("order-sms-notify", {
                body: {
                  order_id: orderId,
                  new_status: selectedStatus,
                  order_number: currentOrder.order_number,
                },
              });
            } catch (e) {
              console.error("SMS notification failed:", e);
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to update order ${orderId}:`, error);
          errorCount++;
        }

        setProgress({ current: i + 1, total });
      }

      return { successCount, errorCount };
    },
    onSuccess: ({ successCount, errorCount }) => {
      if (errorCount === 0) {
        toast.success(`${successCount}টি অর্ডার সফলভাবে আপডেট হয়েছে`);
      } else {
        toast.warning(`${successCount}টি সফল, ${errorCount}টি ব্যর্থ`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedStatus("");
      setStatusNote("");
      setProgress({ current: 0, total: 0 });
      onComplete();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setProgress({ current: 0, total: 0 });
    },
  });

  const handleClose = () => {
    if (!bulkUpdateMutation.isPending) {
      setSelectedStatus("");
      setStatusNote("");
      setProgress({ current: 0, total: 0 });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            বাল্ক স্ট্যাটাস আপডেট
          </DialogTitle>
          <DialogDescription>
            {orderIds.length}টি অর্ডারের স্ট্যাটাস একসাথে আপডেট করুন
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Type Selection */}
          <div className="space-y-2">
            <Label>স্ট্যাটাস টাইপ</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={statusType === "order" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusType("order");
                  setSelectedStatus("");
                }}
                className="w-full"
              >
                <Package className="h-4 w-4 mr-1" />
                অর্ডার
              </Button>
              <Button
                type="button"
                variant={statusType === "payment" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusType("payment");
                  setSelectedStatus("");
                }}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                পেমেন্ট
              </Button>
              <Button
                type="button"
                variant={statusType === "courier" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusType("courier");
                  setSelectedStatus("");
                }}
                className="w-full"
              >
                <Truck className="h-4 w-4 mr-1" />
                কুরিয়ার
              </Button>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label>নতুন স্ট্যাটাস</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="স্ট্যাটাস সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Textarea
              placeholder="স্ট্যাটাস পরিবর্তনের কারণ..."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="h-20"
            />
          </div>

          {/* Progress */}
          {bulkUpdateMutation.isPending && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>প্রগ্রেস</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={bulkUpdateMutation.isPending}
          >
            বাতিল
          </Button>
          <Button
            onClick={() => bulkUpdateMutation.mutate()}
            disabled={!selectedStatus || bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                আপডেট হচ্ছে...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {orderIds.length}টি আপডেট করুন
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
