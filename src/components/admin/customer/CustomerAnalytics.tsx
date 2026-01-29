import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  ShoppingCart, 
  Calendar, 
  DollarSign,
  Package,
  Heart,
  BarChart3
} from "lucide-react";

interface CustomerAnalyticsProps {
  customerId: string;
}

export const CustomerAnalytics = ({ customerId }: CustomerAnalyticsProps) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["customer-analytics", customerId],
    queryFn: async () => {
      // Get all orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total, created_at, status")
        .eq("user_id", customerId);

      if (ordersError) throw ordersError;

      // Get cart items count
      const { count: cartCount } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", customerId);

      // Get wishlist items count
      const { count: wishlistCount } = await supabase
        .from("wishlist_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", customerId);

      const successfulOrders = orders?.filter(o => o.status === "delivered") || [];
      const totalSpent = successfulOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgOrderValue = successfulOrders.length > 0 ? totalSpent / successfulOrders.length : 0;

      // Calculate first and last order dates
      const orderDates = orders?.map(o => new Date(o.created_at).getTime()) || [];
      const firstOrderDate = orderDates.length > 0 ? new Date(Math.min(...orderDates)) : null;
      const lastOrderDate = orderDates.length > 0 ? new Date(Math.max(...orderDates)) : null;

      // Calculate order frequency (orders per month)
      let orderFrequency = 0;
      if (firstOrderDate && lastOrderDate && orders?.length) {
        const monthsDiff = Math.max(1, (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        orderFrequency = orders.length / monthsDiff;
      }

      return {
        totalOrders: orders?.length || 0,
        successfulOrders: successfulOrders.length,
        totalSpent,
        avgOrderValue,
        cartItems: cartCount || 0,
        wishlistItems: wishlistCount || 0,
        firstOrderDate,
        lastOrderDate,
        orderFrequency,
      };
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">লোড হচ্ছে...</div>;
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">৳{analytics?.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">মোট খরচ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">৳{Math.round(analytics?.avgOrderValue || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">গড় অর্ডার মূল্য</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.successfulOrders}/{analytics?.totalOrders}</p>
              <p className="text-xs text-muted-foreground">সফল অর্ডার</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.orderFrequency.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">অর্ডার/মাস</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500 rounded-lg">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.wishlistItems}</p>
              <p className="text-xs text-muted-foreground">উইশলিস্ট আইটেম</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics?.cartItems}</p>
              <p className="text-xs text-muted-foreground">কার্ট আইটেম</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">{formatDate(analytics?.firstOrderDate || null)}</p>
              <p className="text-xs text-muted-foreground">প্রথম অর্ডার</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">{formatDate(analytics?.lastOrderDate || null)}</p>
              <p className="text-xs text-muted-foreground">শেষ অর্ডার</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
