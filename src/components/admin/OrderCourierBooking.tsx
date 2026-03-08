import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Loader2, ExternalLink, Package, RefreshCw } from "lucide-react";
import { invokeCourierBooking } from "@/lib/courierBooking";

interface CourierProvider {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
}

interface CourierBooking {
  id: string;
  courier_provider: string;
  consignment_id: string | null;
  tracking_code: string | null;
  booking_status: string;
  created_at: string;
}

interface OrderCourierBookingProps {
  orderId: string;
  orderNumber: string;
  currentCourier: string | null;
  trackingNumber: string | null;
  onBookingComplete?: () => void;
}

const courierTrackingUrls: Record<string, string> = {
  pathao: "https://merchant.pathao.com/tracking/",
  steadfast: "https://steadfast.com.bd/tracking/",
  redx: "https://redx.com.bd/track/",
  ecourier: "https://ecourier.com.bd/tracking/",
  paperfly: "https://go.paperfly.com.bd/tracking/",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  booked: { label: "বুক করা হয়েছে", variant: "default" },
  pending: { label: "পেন্ডিং", variant: "secondary" },
  picked: { label: "পিকড", variant: "default" },
  in_transit: { label: "ট্রানজিটে", variant: "default" },
  delivered: { label: "ডেলিভারি সম্পন্ন", variant: "default" },
  cancelled: { label: "বাতিল", variant: "destructive" },
  returned: { label: "রিটার্ন", variant: "destructive" },
  on_hold: { label: "হোল্ড", variant: "outline" },
};

export const OrderCourierBooking = ({
  orderId,
  orderNumber,
  currentCourier,
  trackingNumber,
  onBookingComplete,
}: OrderCourierBookingProps) => {
  const queryClient = useQueryClient();
  const [selectedCourier, setSelectedCourier] = useState<string>(currentCourier || "");
  const [manualTracking, setManualTracking] = useState<string>("");

  // Realtime subscription + auto-polling for courier status updates
  useEffect(() => {
    let isActive = true;
    let pollInterval = 30000; // Start at 30s
    let timeoutId: ReturnType<typeof setTimeout>;

    // Realtime subscription
    const channel = supabase
      .channel(`courier-booking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courier_bookings',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["courier-booking", orderId] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          pollInterval = 30000; // Reset on realtime event
        }
      )
      .subscribe();

    // Auto-poll courier provider API for live status
    const pollStatus = async () => {
      if (!isActive) return;
      try {
        await supabase.functions.invoke("courier-status-sync", {
          body: { order_id: orderId },
        });
        queryClient.invalidateQueries({ queryKey: ["courier-booking", orderId] });
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      } catch (e) {
        // Silent fail, increase interval
        pollInterval = Math.min(pollInterval * 1.5, 120000);
      }
      if (isActive) {
        timeoutId = setTimeout(pollStatus, pollInterval);
      }
    };

    // Start polling after initial delay
    timeoutId = setTimeout(pollStatus, 5000);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  // Fetch available couriers
  const { data: couriers } = useQuery({
    queryKey: ["active-courier-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_providers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as CourierProvider[];
    },
  });

  // Fetch existing booking
  const { data: existingBooking } = useQuery({
    queryKey: ["courier-booking", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_bookings")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as CourierBooking | null;
    },
  });

  // Book courier mutation
  const bookCourierMutation = useMutation({
    mutationFn: async (courierProvider: string) => {
      if (courierProvider === "manual") {
        const { error } = await supabase
          .from("orders")
          .update({
            courier_provider: "manual",
            tracking_number: manualTracking || null,
            courier_status: manualTracking ? "booked" : "pending",
          })
          .eq("id", orderId);
        if (error) throw error;
        return { success: true, tracking_code: manualTracking };
      }
      return invokeCourierBooking(orderId, courierProvider);
    },
    onSuccess: (data) => {
      toast.success(`কুরিয়ার বুক করা হয়েছে! ট্র্যাকিং: ${data.tracking_code || "N/A"}`);
      queryClient.invalidateQueries({ queryKey: ["courier-booking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      onBookingComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`বুকিং ব্যর্থ: ${error.message}`);
    },
  });

  // Sync status mutation
  const syncStatusMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-status-sync", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.synced > 0) {
        toast.success("স্ট্যাটাস আপডেট হয়েছে");
      } else {
        toast.info("কোনো পরিবর্তন নেই");
      }
      queryClient.invalidateQueries({ queryKey: ["courier-booking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => {
      toast.error(`সিঙ্ক ব্যর্থ: ${error.message}`);
    },
  });

  const handleBookCourier = () => {
    if (!selectedCourier) {
      toast.error("একটি কুরিয়ার সিলেক্ট করুন");
      return;
    }
    bookCourierMutation.mutate(selectedCourier);
  };

  const getTrackingUrl = () => {
    if (!currentCourier || !trackingNumber) return null;
    const baseUrl = courierTrackingUrls[currentCourier];
    return baseUrl ? `${baseUrl}${trackingNumber}` : null;
  };

  const trackingUrl = getTrackingUrl();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5" />
        <Label className="text-base font-medium">কুরিয়ার বুকিং</Label>
      </div>

      {/* Current Status */}
      {existingBooking || trackingNumber ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusLabels[existingBooking?.booking_status || "pending"]?.variant || "secondary"}>
                {statusLabels[existingBooking?.booking_status || "pending"]?.label || existingBooking?.booking_status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {couriers?.find((c) => c.provider === (existingBooking?.courier_provider || currentCourier))?.name_bn || currentCourier}
              </span>
            </div>
            {existingBooking?.courier_provider && existingBooking.courier_provider !== "manual" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncStatusMutation.mutate()}
                disabled={syncStatusMutation.isPending}
              >
                {syncStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1 text-xs">সিঙ্ক</span>
              </Button>
            )}
          </div>
          
          {(existingBooking?.tracking_code || trackingNumber) && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm">
                {existingBooking?.tracking_code || trackingNumber}
              </span>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  ট্র্যাক করুন
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedCourier} onValueChange={setSelectedCourier}>
              <SelectTrigger className="flex-1">
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
          </div>

          {selectedCourier === "manual" && (
            <Input
              placeholder="ট্র্যাকিং নম্বর (ঐচ্ছিক)"
              value={manualTracking}
              onChange={(e) => setManualTracking(e.target.value)}
            />
          )}

          <Button
            onClick={handleBookCourier}
            disabled={!selectedCourier || bookCourierMutation.isPending}
            className="w-full"
          >
            {bookCourierMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Truck className="h-4 w-4 mr-2" />
            )}
            {selectedCourier === "manual" ? "ম্যানুয়াল ট্র্যাকিং সেভ করুন" : "কুরিয়ার বুক করুন"}
          </Button>
        </div>
      )}
    </div>
  );
};
