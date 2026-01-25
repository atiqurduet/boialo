import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, CreditCard, Truck } from "lucide-react";

interface OrderStatusPanelProps {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  currentPaymentStatus: string | null;
  currentCourierStatus: string | null;
  paymentMethod: string;
  onStatusChange?: () => void;
}

const ORDER_STATUSES = [
  { value: "pending", label: "পেন্ডিং", color: "bg-yellow-100 text-yellow-800" },
  { value: "processing", label: "প্রসেসিং", color: "bg-blue-100 text-blue-800" },
  { value: "shipped", label: "শিপড", color: "bg-purple-100 text-purple-800" },
  { value: "delivered", label: "ডেলিভার্ড", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "বাতিল", color: "bg-red-100 text-red-800" },
  { value: "returned", label: "রিটার্ন", color: "bg-orange-100 text-orange-800" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "পেন্ডিং", color: "bg-yellow-100 text-yellow-800" },
  { value: "paid", label: "পেইড", color: "bg-green-100 text-green-800" },
  { value: "partial", label: "আংশিক", color: "bg-blue-100 text-blue-800" },
  { value: "cod_pending", label: "COD পেন্ডিং", color: "bg-orange-100 text-orange-800" },
  { value: "cod_collected", label: "COD কালেক্টেড", color: "bg-green-100 text-green-800" },
  { value: "refunded", label: "রিফান্ড", color: "bg-gray-100 text-gray-800" },
  { value: "failed", label: "ব্যর্থ", color: "bg-red-100 text-red-800" },
];

const COURIER_STATUSES = [
  { value: "not_booked", label: "বুক করা হয়নি", color: "bg-gray-100 text-gray-800" },
  { value: "booked", label: "বুক হয়েছে", color: "bg-blue-100 text-blue-800" },
  { value: "picked_up", label: "পিকআপ হয়েছে", color: "bg-indigo-100 text-indigo-800" },
  { value: "in_transit", label: "ট্রানজিটে", color: "bg-purple-100 text-purple-800" },
  { value: "out_for_delivery", label: "ডেলিভারির জন্য বের হয়েছে", color: "bg-cyan-100 text-cyan-800" },
  { value: "delivered", label: "ডেলিভার্ড", color: "bg-green-100 text-green-800" },
  { value: "failed", label: "ব্যর্থ", color: "bg-red-100 text-red-800" },
  { value: "returned", label: "রিটার্ন", color: "bg-orange-100 text-orange-800" },
];

export const OrderStatusPanel = ({
  orderId,
  orderNumber,
  currentStatus,
  currentPaymentStatus,
  currentCourierStatus,
  paymentMethod,
  onStatusChange,
}: OrderStatusPanelProps) => {
  const queryClient = useQueryClient();
  const [statusNote, setStatusNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(currentPaymentStatus || "pending");
  const [selectedCourierStatus, setSelectedCourierStatus] = useState(currentCourierStatus || "not_booked");

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      status,
      paymentStatus,
      courierStatus,
      notes,
    }: {
      status?: string;
      paymentStatus?: string;
      courierStatus?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      const historyEntries: Array<{ status: string; notes: string | null; metadata: { previous_status: string | null; type: string } }> = [];

      if (status && status !== currentStatus) {
        updateData.status = status;
        if (status === "shipped") updateData.shipped_at = new Date().toISOString();
        if (status === "delivered") updateData.delivered_at = new Date().toISOString();
        historyEntries.push({
          status: `order_status:${status}`,
          notes: notes || null,
          metadata: { previous_status: currentStatus, type: "order_status" },
        });
      }

      if (paymentStatus && paymentStatus !== currentPaymentStatus) {
        updateData.payment_status = paymentStatus;
        historyEntries.push({
          status: `payment_status:${paymentStatus}`,
          notes: notes || null,
          metadata: { previous_status: currentPaymentStatus, type: "payment_status" },
        });
      }

      if (courierStatus && courierStatus !== currentCourierStatus) {
        updateData.courier_status = courierStatus;
        historyEntries.push({
          status: `courier_status:${courierStatus}`,
          notes: notes || null,
          metadata: { previous_status: currentCourierStatus, type: "courier_status" },
        });
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("কোন পরিবর্তন নেই");
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Record history
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const entry of historyEntries) {
        await supabase.from("order_status_history").insert([{
          order_id: orderId,
          status: entry.status,
          notes: entry.notes,
          changed_by: user?.id || null,
          metadata: entry.metadata,
        }]);
      }

      // Send SMS for order status changes
      if (status && status !== currentStatus) {
        try {
          await supabase.functions.invoke("order-sms-notify", {
            body: {
              order_id: orderId,
              new_status: status,
              order_number: orderNumber,
            },
          });
        } catch (e) {
          console.error("SMS notification failed:", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
      setStatusNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-status-history", orderId] });
      onStatusChange?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateAll = () => {
    updateStatusMutation.mutate({
      status: selectedStatus !== currentStatus ? selectedStatus : undefined,
      paymentStatus: selectedPaymentStatus !== currentPaymentStatus ? selectedPaymentStatus : undefined,
      courierStatus: selectedCourierStatus !== currentCourierStatus ? selectedCourierStatus : undefined,
      notes: statusNote || undefined,
    });
  };

  const getStatusBadge = (statuses: typeof ORDER_STATUSES, value: string) => {
    const status = statuses.find((s) => s.value === value);
    return status ? (
      <Badge className={status.color}>{status.label}</Badge>
    ) : (
      <Badge variant="outline">{value}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Status Display */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-1">অর্ডার স্ট্যাটাস</p>
          {getStatusBadge(ORDER_STATUSES, currentStatus)}
        </div>
        <div className="text-center">
          <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-1">পেমেন্ট স্ট্যাটাস</p>
          {getStatusBadge(PAYMENT_STATUSES, currentPaymentStatus || "pending")}
        </div>
        <div className="text-center">
          <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-1">কুরিয়ার স্ট্যাটাস</p>
          {getStatusBadge(COURIER_STATUSES, currentCourierStatus || "not_booked")}
        </div>
      </div>

      {/* Status Update Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Order Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              অর্ডার স্ট্যাটাস
            </Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              পেমেন্ট স্ট্যাটাস
            </Label>
            <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              পেমেন্ট মেথড: {paymentMethod}
            </p>
          </div>

          {/* Courier Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              কুরিয়ার স্ট্যাটাস
            </Label>
            <Select value={selectedCourierStatus} onValueChange={setSelectedCourierStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURIER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>নোট (ঐচ্ছিক)</Label>
          <Textarea
            placeholder="স্ট্যাটাস পরিবর্তনের কারণ বা বিস্তারিত লিখুন..."
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="h-20"
          />
        </div>

        {/* Update Button */}
        <Button
          onClick={handleUpdateAll}
          disabled={updateStatusMutation.isPending}
          className="w-full"
        >
          {updateStatusMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              আপডেট হচ্ছে...
            </>
          ) : (
            "সব স্ট্যাটাস আপডেট করুন"
          )}
        </Button>
      </div>
    </div>
  );
};
