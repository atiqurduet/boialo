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
import { Truck, Loader2, ExternalLink, Package } from "lucide-react";
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
  paperfly: "https://go.paperfly.com.bd/tracking/",
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
        // For manual, just update the order directly
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
          <div className="flex items-center gap-2">
            <Badge variant={existingBooking?.booking_status === "booked" ? "default" : "secondary"}>
              {existingBooking?.booking_status === "booked" ? "বুক করা হয়েছে" : "পেন্ডিং"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {couriers?.find((c) => c.provider === (existingBooking?.courier_provider || currentCourier))?.name_bn || currentCourier}
            </span>
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
