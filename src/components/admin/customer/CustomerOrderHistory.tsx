import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Eye, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface CustomerOrderHistoryProps {
  customerId: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "পেন্ডিং", variant: "secondary" },
  processing: { label: "প্রসেসিং", variant: "default" },
  shipped: { label: "শিপ করা হয়েছে", variant: "default" },
  delivered: { label: "ডেলিভারি সম্পন্ন", variant: "default" },
  cancelled: { label: "বাতিল", variant: "destructive" },
};

export const CustomerOrderHistory = ({ customerId }: CustomerOrderHistoryProps) => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          payment_method,
          total,
          subtotal,
          delivery_charge,
          created_at,
          delivered_at,
          order_items (
            id,
            product_title,
            product_image,
            quantity,
            price
          )
        `)
        .eq("user_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusInfo = (status: string) => {
    return statusMap[status] || { label: status, variant: "outline" as const };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return <div className="text-center py-4">লোড হচ্ছে...</div>;
  }

  if (!orders?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>কোনো অর্ডার পাওয়া যায়নি</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          অর্ডার হিস্টোরি ({orders.length}টি)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>অর্ডার নং</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>আইটেম</TableHead>
              <TableHead>মোট</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>পেমেন্ট</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    #{order.order_number}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.order_items?.slice(0, 2).map((item: any) => (
                        <img
                          key={item.id}
                          src={item.product_image || "/placeholder.svg"}
                          alt={item.product_title}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ))}
                      {order.order_items && order.order_items.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{order.order_items.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ৳{Number(order.total).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                      {order.payment_status === "paid" ? "পেইড" : "পেন্ডিং"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to={`/order-confirmation`} state={{ orderNumber: order.order_number }}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
