import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  ShoppingCart, 
  Heart, 
  Package, 
  CreditCard,
  User,
  MessageSquare
} from "lucide-react";

interface CustomerActivityTimelineProps {
  customerId: string;
}

interface ActivityItem {
  id: string;
  type: "order" | "cart" | "wishlist" | "review" | "profile" | "chat";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export const CustomerActivityTimeline = ({ customerId }: CustomerActivityTimelineProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["customer-activities", customerId],
    queryFn: async () => {
      const allActivities: ActivityItem[] = [];

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20);

      orders?.forEach((order) => {
        allActivities.push({
          id: `order-${order.id}`,
          type: "order",
          title: `অর্ডার #${order.order_number}`,
          description: `৳${Number(order.total).toLocaleString()} - ${order.status}`,
          timestamp: order.created_at,
        });
      });

      // Fetch cart activity
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("id, product_id, created_at")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10);

      cartItems?.forEach((item) => {
        allActivities.push({
          id: `cart-${item.id}`,
          type: "cart",
          title: "কার্টে যোগ করা হয়েছে",
          description: `প্রোডাক্ট ID: ${item.product_id.slice(0, 8)}...`,
          timestamp: item.created_at,
        });
      });

      // Fetch wishlist activity
      const { data: wishlistItems } = await supabase
        .from("wishlist_items")
        .select("id, product_id, created_at")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10);

      wishlistItems?.forEach((item) => {
        allActivities.push({
          id: `wishlist-${item.id}`,
          type: "wishlist",
          title: "উইশলিস্টে যোগ করা হয়েছে",
          description: `প্রোডাক্ট ID: ${item.product_id.slice(0, 8)}...`,
          timestamp: item.created_at,
        });
      });

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("id, rating, title, created_at")
        .eq("user_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10);

      reviews?.forEach((review) => {
        allActivities.push({
          id: `review-${review.id}`,
          type: "review",
          title: "রিভিউ দেওয়া হয়েছে",
          description: `${review.rating}⭐ - ${review.title || "কোনো শিরোনাম নেই"}`,
          timestamp: review.created_at,
        });
      });

      // Sort by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return allActivities.slice(0, 30);
    },
  });

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "order":
        return <Package className="h-4 w-4" />;
      case "cart":
        return <ShoppingCart className="h-4 w-4" />;
      case "wishlist":
        return <Heart className="h-4 w-4" />;
      case "review":
        return <MessageSquare className="h-4 w-4" />;
      case "profile":
        return <User className="h-4 w-4" />;
      case "chat":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "order":
        return "bg-blue-500";
      case "cart":
        return "bg-orange-500";
      case "wishlist":
        return "bg-pink-500";
      case "review":
        return "bg-purple-500";
      case "profile":
        return "bg-green-500";
      case "chat":
        return "bg-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
    if (diffDays < 7) return `${diffDays} দিন আগে`;
    return date.toLocaleDateString("bn-BD");
  };

  if (isLoading) {
    return <div className="text-center py-4">লোড হচ্ছে...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          অ্যাক্টিভিটি টাইমলাইন
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">কোনো অ্যাক্টিভিটি নেই</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {activities?.map((activity) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    <div className={`z-10 p-2 rounded-full text-white ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
