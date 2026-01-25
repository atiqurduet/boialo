import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Send, Loader2, ChevronDown, Check } from "lucide-react";

interface CourierProvider {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
}

interface QuickCourierSendProps {
  orderId: string;
  orderNumber: string;
  currentCourier: string | null;
  trackingNumber: string | null;
  onComplete?: () => void;
}

export const QuickCourierSend = ({
  orderId,
  orderNumber,
  currentCourier,
  trackingNumber,
  onComplete,
}: QuickCourierSendProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

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

  // Book courier mutation
  const bookCourierMutation = useMutation({
    mutationFn: async (courierProvider: string) => {
      const { data, error } = await supabase.functions.invoke("courier-booking", {
        body: { order_id: orderId, courier_provider: courierProvider },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${orderNumber} কুরিয়ার বুক হয়েছে! ট্র্যাকিং: ${data.tracking_code || "N/A"}`);
      queryClient.invalidateQueries({ queryKey: ["courier-booking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setIsOpen(false);
      onComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`${orderNumber} বুকিং ব্যর্থ: ${error.message}`);
    },
  });

  // If already booked, show success indicator
  if (currentCourier && trackingNumber) {
    return (
      <Button variant="ghost" size="icon" disabled title={`বুক করা হয়েছে: ${trackingNumber}`}>
        <Check className="h-4 w-4 text-primary" />
      </Button>
    );
  }

  // If no active couriers available
  if (!couriers || couriers.length === 0) {
    return (
      <Button variant="ghost" size="icon" disabled title="কোন অ্যাক্টিভ কুরিয়ার নেই">
        <Send className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // If only one courier, show direct send button
  if (couriers.length === 1) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => bookCourierMutation.mutate(couriers[0].provider)}
        disabled={bookCourierMutation.isPending}
        title={`${couriers[0].name_bn} দিয়ে পাঠান`}
      >
        {bookCourierMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Multiple couriers - show dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={bookCourierMutation.isPending}
          title="কুরিয়ার সিলেক্ট করুন"
        >
          {bookCourierMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg">
        {couriers.map((courier) => (
          <DropdownMenuItem
            key={courier.id}
            onClick={() => bookCourierMutation.mutate(courier.provider)}
            className="cursor-pointer"
          >
            <Send className="h-4 w-4 mr-2" />
            {courier.name_bn}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
