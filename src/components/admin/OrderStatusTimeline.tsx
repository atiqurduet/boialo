import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  Package, 
  Truck, 
  Home, 
  XCircle,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface StatusHistory {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface OrderStatusTimelineProps {
  orderId: string;
  currentStatus: string;
  createdAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "পেন্ডিং", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "কনফার্মড", icon: CheckCircle2, color: "bg-blue-500" },
  processing: { label: "প্রসেসিং", icon: Package, color: "bg-indigo-500" },
  courier_booked: { label: "কুরিয়ার বুক", icon: Truck, color: "bg-purple-500" },
  shipped: { label: "শিপড", icon: Truck, color: "bg-purple-600" },
  out_for_delivery: { label: "ডেলিভারিতে", icon: Truck, color: "bg-orange-500" },
  delivered: { label: "ডেলিভার্ড", icon: Home, color: "bg-green-500" },
  cancelled: { label: "বাতিল", icon: XCircle, color: "bg-red-500" },
  returned: { label: "রিটার্ন", icon: XCircle, color: "bg-red-400" },
};

export const OrderStatusTimeline = ({
  orderId,
  currentStatus,
  createdAt,
  shippedAt,
  deliveredAt,
}: OrderStatusTimelineProps) => {
  const { data: statusHistory } = useQuery({
    queryKey: ["order-status-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StatusHistory[];
    },
  });

  interface TimelineEvent {
    status: string;
    label: string;
    icon: typeof Clock;
    time: string;
    color: string;
    notes?: string | null;
  }

  // Build timeline from history + key dates
  const timelineEvents: TimelineEvent[] = [
    {
      status: "order_placed",
      label: "অর্ডার প্লেস",
      icon: Package,
      time: createdAt,
      color: "bg-blue-500",
    },
    ...(statusHistory?.map((h) => ({
      status: h.status,
      label: statusConfig[h.status]?.label || h.status,
      icon: statusConfig[h.status]?.icon || MessageSquare,
      time: h.created_at,
      color: statusConfig[h.status]?.color || "bg-gray-500",
      notes: h.notes,
    })) || []),
  ];

  // Add shipped/delivered if not in history
  if (shippedAt && !statusHistory?.some((h) => h.status === "shipped")) {
    timelineEvents.push({
      status: "shipped",
      label: "শিপড",
      icon: Truck,
      time: shippedAt,
      color: "bg-purple-600",
    });
  }
  if (deliveredAt && !statusHistory?.some((h) => h.status === "delivered")) {
    timelineEvents.push({
      status: "delivered",
      label: "ডেলিভার্ড",
      icon: Home,
      time: deliveredAt,
      color: "bg-green-500",
    });
  }

  // Sort by time
  timelineEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM, yyyy hh:mm a", { locale: bn });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">অর্ডার টাইমলাইন</h4>
        <Badge variant={currentStatus === "delivered" ? "default" : "secondary"}>
          {statusConfig[currentStatus]?.label || currentStatus}
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline events */}
        <div className="space-y-4">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={`${event.status}-${index}`} className="relative flex gap-4 pl-10">
                {/* Icon */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full ${event.color} flex items-center justify-center text-white z-10`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className="font-medium">{event.label}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(event.time)}</p>
                  {event.notes && (
                    <p className="text-sm mt-1 text-muted-foreground bg-muted/50 p-2 rounded">
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
