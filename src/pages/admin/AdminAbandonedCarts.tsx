import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

interface AbandonedCheckout {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  delivery_area: string | null;
  subtotal: number;
  cart_items: any[];
  step: string;
  payment_method: string | null;
  last_activity_at: string;
  recovered: boolean;
  created_at: string;
}

interface CartItem {
  product_id: string;
  product_title: string;
  product_image: string | null;
  price: number;
  quantity: number;
}

const stepLabels: Record<string, { label: string; color: string }> = {
  cart: { label: "কার্টে", color: "bg-gray-100 text-gray-800" },
  checkout_started: { label: "চেকআউট শুরু", color: "bg-yellow-100 text-yellow-800" },
  address_filled: { label: "ঠিকানা দেওয়া হয়েছে", color: "bg-blue-100 text-blue-800" },
  payment_selected: { label: "পেমেন্ট সিলেক্ট", color: "bg-purple-100 text-purple-800" },
  otp_pending: { label: "OTP পেন্ডিং", color: "bg-orange-100 text-orange-800" },
};

const AdminAbandonedCarts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [stepFilter, setStepFilter] = useState("all");
  const [selectedCheckout, setSelectedCheckout] = useState<AbandonedCheckout | null>(null);

  // Fetch abandoned checkouts
  const { data: abandonedCheckouts = [], isLoading, refetch } = useQuery({
    queryKey: ["abandoned-checkouts", stepFilter],
    queryFn: async () => {
      let query = supabase
        .from("abandoned_checkouts")
        .select("*")
        .eq("recovered", false)
        .order("last_activity_at", { ascending: false });

      if (stepFilter !== "all") {
        query = query.eq("step", stepFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AbandonedCheckout[];
    },
  });

  // Fetch cart items for users who have items in cart but haven't started checkout
  const { data: activeCartUsers = [] } = useQuery({
    queryKey: ["active-cart-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          user_id,
          quantity,
          created_at,
          updated_at
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Group by user and get latest activity
      const userMap = new Map<string, { count: number; lastActivity: string }>();
      data?.forEach((item) => {
        const existing = userMap.get(item.user_id);
        if (!existing) {
          userMap.set(item.user_id, {
            count: item.quantity,
            lastActivity: item.updated_at,
          });
        } else {
          existing.count += item.quantity;
          if (new Date(item.updated_at) > new Date(existing.lastActivity)) {
            existing.lastActivity = item.updated_at;
          }
        }
      });

      return Array.from(userMap.entries()).map(([userId, data]) => ({
        userId,
        ...data,
      }));
    },
  });

  // Mark as recovered
  const markRecoveredMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("abandoned_checkouts")
        .update({ recovered: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিকভার্ড হিসেবে চিহ্নিত করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
      setSelectedCheckout(null);
    },
  });

  // Filter by search
  const filteredCheckouts = abandonedCheckouts.filter((checkout) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      checkout.full_name?.toLowerCase().includes(query) ||
      checkout.phone?.includes(query) ||
      checkout.email?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: abandonedCheckouts.length,
    checkoutStarted: abandonedCheckouts.filter((c) => c.step === "checkout_started").length,
    addressFilled: abandonedCheckouts.filter((c) => c.step === "address_filled").length,
    otpPending: abandonedCheckouts.filter((c) => c.step === "otp_pending").length,
    totalValue: abandonedCheckouts.reduce((sum, c) => sum + (c.subtotal || 0), 0),
    activeCartUsers: activeCartUsers.length,
  };

  const formatCartItems = (items: any[]): CartItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              অসম্পূর্ণ অর্ডার
            </h1>
            <p className="text-muted-foreground mt-1">
              চেকআউট সম্পূর্ণ না করা কাস্টমারদের তালিকা
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            রিফ্রেশ
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">মোট অসম্পূর্ণ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeCartUsers}</p>
                  <p className="text-xs text-muted-foreground">কার্টে আছে</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.checkoutStarted}</p>
                  <p className="text-xs text-muted-foreground">চেকআউট শুরু</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.addressFilled}</p>
                  <p className="text-xs text-muted-foreground">ঠিকানা দেওয়া</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.otpPending}</p>
                  <p className="text-xs text-muted-foreground">OTP পেন্ডিং</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">৳{stats.totalValue.toLocaleString("bn-BD")}</p>
                  <p className="text-xs text-muted-foreground">মোট মূল্য</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stepFilter} onValueChange={setStepFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="সব স্টেপ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব স্টেপ</SelectItem>
                  <SelectItem value="cart">কার্টে</SelectItem>
                  <SelectItem value="checkout_started">চেকআউট শুরু</SelectItem>
                  <SelectItem value="address_filled">ঠিকানা দেওয়া</SelectItem>
                  <SelectItem value="payment_selected">পেমেন্ট সিলেক্ট</SelectItem>
                  <SelectItem value="otp_pending">OTP পেন্ডিং</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>অসম্পূর্ণ চেকআউট তালিকা</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCheckouts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">কোন অসম্পূর্ণ চেকআউট নেই</h3>
                <p className="text-muted-foreground">সব কাস্টমার সফলভাবে অর্ডার করেছেন!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কাস্টমার</TableHead>
                    <TableHead>ফোন</TableHead>
                    <TableHead>স্টেপ</TableHead>
                    <TableHead>মূল্য</TableHead>
                    <TableHead>শেষ কার্যকলাপ</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckouts.map((checkout) => (
                    <TableRow key={checkout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {checkout.full_name || "নাম দেওয়া হয়নি"}
                          </p>
                          {checkout.email && (
                            <p className="text-sm text-muted-foreground">
                              {checkout.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {checkout.phone ? (
                          <a
                            href={`tel:${checkout.phone}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {checkout.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            stepLabels[checkout.step]?.color ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {stepLabels[checkout.step]?.label || checkout.step}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ৳{checkout.subtotal?.toLocaleString("bn-BD") || "0"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(checkout.last_activity_at), {
                            addSuffix: true,
                            locale: bn,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCheckout(checkout)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog
          open={!!selectedCheckout}
          onOpenChange={() => setSelectedCheckout(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>অসম্পূর্ণ চেকআউট বিস্তারিত</DialogTitle>
            </DialogHeader>
            {selectedCheckout && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">নাম</p>
                    <p className="font-medium">
                      {selectedCheckout.full_name || "দেওয়া হয়নি"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ফোন</p>
                    {selectedCheckout.phone ? (
                      <a
                        href={`tel:${selectedCheckout.phone}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        {selectedCheckout.phone}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">দেওয়া হয়নি</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ইমেইল</p>
                    {selectedCheckout.email ? (
                      <a
                        href={`mailto:${selectedCheckout.email}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-4 w-4" />
                        {selectedCheckout.email}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">দেওয়া হয়নি</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">স্টেপ</p>
                    <Badge
                      className={
                        stepLabels[selectedCheckout.step]?.color ||
                        "bg-gray-100 text-gray-800"
                      }
                    >
                      {stepLabels[selectedCheckout.step]?.label ||
                        selectedCheckout.step}
                    </Badge>
                  </div>
                </div>

                {/* Address */}
                {selectedCheckout.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ঠিকানা</p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      {selectedCheckout.address}
                      {selectedCheckout.delivery_area && (
                        <Badge variant="outline" className="ml-2">
                          {selectedCheckout.delivery_area === "inside"
                            ? "ঢাকার ভিতরে"
                            : "ঢাকার বাইরে"}
                        </Badge>
                      )}
                    </p>
                  </div>
                )}

                {/* Cart Items */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    কার্টের আইটেম
                  </p>
                  {formatCartItems(selectedCheckout.cart_items).length > 0 ? (
                    <div className="space-y-2">
                      {formatCartItems(selectedCheckout.cart_items).map(
                        (item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                          >
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.product_title}</p>
                              <p className="text-sm text-muted-foreground">
                                ৳{item.price} × {item.quantity}
                              </p>
                            </div>
                            <p className="font-medium">
                              ৳{item.price * item.quantity}
                            </p>
                          </div>
                        )
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">মোট</span>
                        <span className="font-bold text-lg">
                          ৳{selectedCheckout.subtotal?.toLocaleString("bn-BD")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      কার্ট আইটেম তথ্য নেই
                    </p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    শুরু:{" "}
                    {new Date(selectedCheckout.created_at).toLocaleString("bn-BD")}
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4" />
                    শেষ কার্যকলাপ:{" "}
                    {formatDistanceToNow(
                      new Date(selectedCheckout.last_activity_at),
                      { addSuffix: true, locale: bn }
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedCheckout.phone && (
                    <Button asChild variant="outline">
                      <a
                        href={`https://wa.me/88${selectedCheckout.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        WhatsApp করুন
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="default"
                    onClick={() => markRecoveredMutation.mutate(selectedCheckout.id)}
                    disabled={markRecoveredMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    রিকভার্ড হিসেবে চিহ্নিত করুন
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAbandonedCarts;