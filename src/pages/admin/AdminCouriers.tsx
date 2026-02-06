import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Truck, Settings, Save, Search, Download, Package, Clock,
  CheckCircle, MapPin, Loader2, Filter, X, ExternalLink,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface CourierProvider {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
  config: Record<string, string>;
  api_endpoint: string | null;
  sort_order: number;
}

const bookingStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  booked: { label: "বুকড", variant: "default" },
  pending: { label: "পেন্ডিং", variant: "secondary" },
  picked_up: { label: "পিকআপ", variant: "default" },
  in_transit: { label: "ট্রানজিটে", variant: "default" },
  delivered: { label: "ডেলিভারড", variant: "default" },
  returned: { label: "রিটার্ন", variant: "destructive" },
  cancelled: { label: "বাতিল", variant: "destructive" },
};

const AdminCouriers = () => {
  const queryClient = useQueryClient();
  const [editingCourier, setEditingCourier] = useState<CourierProvider | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("bookings");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: couriers, isLoading: couriersLoading } = useQuery({
    queryKey: ["admin-courier-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_providers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as CourierProvider[];
    },
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-courier-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders for booking references
  const bookingOrderIds = useMemo(() => bookings?.map((b) => b.order_id) || [], [bookings]);
  const { data: bookingOrders } = useQuery({
    queryKey: ["admin-courier-booking-orders", bookingOrderIds],
    queryFn: async () => {
      if (!bookingOrderIds.length) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, full_name, phone, address, delivery_area, status, courier_provider, tracking_number")
        .in("id", bookingOrderIds);
      if (error) throw error;
      return data;
    },
    enabled: bookingOrderIds.length > 0,
  });

  // Also get orders with courier info for the "all shipments" view
  const { data: shippedOrders, isLoading: shippedLoading } = useQuery({
    queryKey: ["admin-courier-shipped-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, full_name, phone, address, delivery_area, status, courier_provider, tracking_number, courier_status, shipped_at, delivered_at, created_at")
        .not("courier_provider", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const orderMap = useMemo(() => {
    const map: Record<string, any> = {};
    bookingOrders?.forEach((o) => { map[o.id] = o; });
    return map;
  }, [bookingOrders]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (providerFilter !== "all" && b.courier_provider !== providerFilter) return false;
      if (statusFilter !== "all" && b.booking_status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const order = orderMap[b.order_id];
        const match =
          b.consignment_id?.toLowerCase().includes(q) ||
          b.tracking_code?.toLowerCase().includes(q) ||
          order?.order_number?.toLowerCase().includes(q) ||
          order?.full_name?.toLowerCase().includes(q) ||
          order?.phone?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && b.created_at && new Date(b.created_at) < new Date(dateFrom)) return false;
      if (dateTo && b.created_at && new Date(b.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [bookings, providerFilter, statusFilter, searchQuery, dateFrom, dateTo, orderMap]);

  const filteredShipped = useMemo(() => {
    if (!shippedOrders) return [];
    return shippedOrders.filter((o) => {
      if (providerFilter !== "all" && o.courier_provider !== providerFilter) return false;
      if (statusFilter !== "all" && o.courier_status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          o.order_number?.toLowerCase().includes(q) ||
          o.full_name?.toLowerCase().includes(q) ||
          o.phone?.toLowerCase().includes(q) ||
          o.tracking_number?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [shippedOrders, providerFilter, statusFilter, searchQuery, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const all = filteredShipped;
    return {
      total: all.length,
      shipped: all.filter((o) => o.status === "shipped").length,
      delivered: all.filter((o) => o.status === "delivered").length,
      inTransit: all.filter((o) => o.courier_status === "in_transit").length,
    };
  }, [filteredShipped]);

  const clearFilters = () => {
    setProviderFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = providerFilter !== "all" || statusFilter !== "all" || searchQuery || dateFrom || dateTo;

  // Settings mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CourierProvider> }) => {
      const { error } = await supabase.from("courier_providers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courier-providers"] });
      toast.success("কুরিয়ার প্রোভাইডার আপডেট হয়েছে");
      setEditingCourier(null);
    },
    onError: (error) => toast.error("আপডেট ব্যর্থ: " + error.message),
  });

  const toggleActive = (courier: CourierProvider) => {
    updateMutation.mutate({ id: courier.id, updates: { is_active: !courier.is_active } });
  };

  const saveConfig = () => {
    if (!editingCourier) return;
    updateMutation.mutate({ id: editingCourier.id, updates: { config } });
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case "pathao": return ["client_id", "client_secret", "username", "password", "sandbox"];
      case "steadfast": return ["api_key", "secret_key", "sandbox"];
      case "redx": return ["api_token", "sandbox"];
      case "manual": return [];
      default: return [];
    }
  };

  const openConfigDialog = (courier: CourierProvider) => {
    setEditingCourier(courier);
    setConfig((courier.config as Record<string, string>) || {});
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const exportCSV = () => {
    const headers = ["অর্ডার নং", "কুরিয়ার", "কনসাইনমেন্ট ID", "ট্র্যাকিং", "স্ট্যাটাস", "কাস্টমার", "ঠিকানা", "তারিখ"];
    const rows = filteredShipped.map((o) => [
      o.order_number, o.courier_provider, "", o.tracking_number || "", o.courier_status || o.status, o.full_name, o.address, o.created_at
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courier-bookings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হয়েছে");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">কুরিয়ার ম্যানেজমেন্ট</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="bookings">শিপমেন্ট হিস্টোরি</TabsTrigger>
            {couriers?.map((c) => (
              <TabsTrigger key={c.id} value={`courier-${c.provider}`}>
                {c.name_bn}
              </TabsTrigger>
            ))}
            <TabsTrigger value="api-bookings">API বুকিং</TabsTrigger>
            <TabsTrigger value="settings">সেটিংস</TabsTrigger>
          </TabsList>

          {/* Shipment History */}
          <TabsContent value="bookings">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Package className="h-4 w-4" /> মোট শিপমেন্ট
                  </div>
                  <p className="text-2xl font-bold">{stats.total}টি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                    <Truck className="h-4 w-4" /> শিপড
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.shipped}টি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                    <CheckCircle className="h-4 w-4" /> ডেলিভারড
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.delivered}টি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
                    <MapPin className="h-4 w-4" /> ট্রানজিটে
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inTransit}টি</p>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="অর্ডার নং, কাস্টমার, ফোন বা ট্র্যাকিং নম্বর দিয়ে খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> CSV
                  </Button>
                </div>
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                      <SelectTrigger><SelectValue placeholder="কুরিয়ার" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল কুরিয়ার</SelectItem>
                        {couriers?.map((c) => (
                          <SelectItem key={c.id} value={c.provider}>{c.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                        <SelectItem value="shipped">শিপড</SelectItem>
                        <SelectItem value="in_transit">ট্রানজিটে</SelectItem>
                        <SelectItem value="delivered">ডেলিভারড</SelectItem>
                        <SelectItem value="returned">রিটার্ন</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <div className="flex gap-2">
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      {hasActiveFilters && (
                        <Button variant="ghost" size="icon" onClick={clearFilters}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">ফিল্টার:</span>
                    {providerFilter !== "all" && <Badge variant="secondary" className="text-xs">{providerFilter}</Badge>}
                    {statusFilter !== "all" && <Badge variant="secondary" className="text-xs">{statusFilter}</Badge>}
                    {dateFrom && <Badge variant="secondary" className="text-xs">{dateFrom} থেকে</Badge>}
                    {dateTo && <Badge variant="secondary" className="text-xs">{dateTo} পর্যন্ত</Badge>}
                    <Badge variant="outline" className="text-xs">{filteredShipped.length}টি ফলাফল</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipped Orders Table */}
            <ShipmentTable orders={filteredShipped} loading={shippedLoading} formatDate={formatDate} />
          </TabsContent>

          {/* Per-courier tabs */}
          {couriers?.map((c) => {
            const courierOrders = filteredShipped.filter((o) => o.courier_provider === c.provider);
            return (
              <TabsContent key={c.id} value={`courier-${c.provider}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{c.name_bn} মোট</p>
                      <p className="text-2xl font-bold">{courierOrders.length}টি</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-green-600">ডেলিভারড</p>
                      <p className="text-2xl font-bold text-green-600">{courierOrders.filter((o) => o.status === "delivered").length}টি</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-600">শিপড</p>
                      <p className="text-2xl font-bold text-blue-600">{courierOrders.filter((o) => o.status === "shipped").length}টি</p>
                    </CardContent>
                  </Card>
                </div>
                <ShipmentTable orders={courierOrders} loading={shippedLoading} formatDate={formatDate} />
              </TabsContent>
            );
          })}

          {/* API Bookings Tab */}
          <TabsContent value="api-bookings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API বুকিং লগ ({filteredBookings.length}টি)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bookingsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !filteredBookings.length ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>কোনো API বুকিং পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>অর্ডার</TableHead>
                        <TableHead>কুরিয়ার</TableHead>
                        <TableHead>কনসাইনমেন্ট ID</TableHead>
                        <TableHead>ট্র্যাকিং</TableHead>
                        <TableHead>COD</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>তারিখ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((b) => {
                        const order = orderMap[b.order_id];
                        const bs = bookingStatusMap[b.booking_status || "pending"] || { label: b.booking_status, variant: "outline" as const };
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <div>
                                <p className="font-mono text-sm text-primary">#{order?.order_number || "—"}</p>
                                <p className="text-xs text-muted-foreground">{order?.full_name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{b.courier_provider}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{b.consignment_id || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{b.tracking_code || "—"}</TableCell>
                            <TableCell>৳{Number(b.cod_amount || 0).toLocaleString()}</TableCell>
                            <TableCell><Badge variant={bs.variant}>{bs.label}</Badge></TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(b.created_at)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-4 md:grid-cols-2">
              {couriers?.map((courier) => (
                <Card key={courier.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {courier.name_en}
                    </CardTitle>
                    <Badge variant={courier.is_active ? "default" : "secondary"}>
                      {courier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{courier.name_bn}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={courier.is_active} onCheckedChange={() => toggleActive(courier)} />
                        <span className="text-sm">{courier.is_active ? "Enabled" : "Disabled"}</span>
                      </div>
                      {courier.provider !== "manual" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openConfigDialog(courier)}>
                              <Settings className="h-4 w-4 mr-2" /> Configure
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Configure {courier.name_en}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {getProviderConfig(courier.provider).map((field) => (
                                <div key={field} className="space-y-2">
                                  <Label htmlFor={field} className="capitalize">{field.replace(/_/g, " ")}</Label>
                                  {field === "sandbox" ? (
                                    <div className="flex items-center gap-2">
                                      <Switch id={field} checked={config[field] === "true"} onCheckedChange={(checked) => setConfig({ ...config, [field]: checked.toString() })} />
                                      <span className="text-sm text-muted-foreground">{config[field] === "true" ? "Test Mode" : "Live Mode"}</span>
                                    </div>
                                  ) : (
                                    <Input id={field} type={field.includes("secret") || field.includes("password") || field.includes("token") || field.includes("key") ? "password" : "text"} value={config[field] || ""} onChange={(e) => setConfig({ ...config, [field]: e.target.value })} placeholder={`Enter ${field.replace(/_/g, " ")}`} />
                                  )}
                                </div>
                              ))}
                              <Button onClick={saveConfig} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Configuration</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

interface ShipmentTableProps {
  orders: any[];
  loading: boolean;
  formatDate: (d: string | null) => string;
}

const ShipmentTable = ({ orders, loading, formatDate }: ShipmentTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>কোনো শিপমেন্ট পাওয়া যায়নি</p>
        </CardContent>
      </Card>
    );
  }

  const courierStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    shipped: { label: "শিপড", variant: "default" },
    in_transit: { label: "ট্রানজিটে", variant: "default" },
    delivered: { label: "ডেলিভারড", variant: "default" },
    returned: { label: "রিটার্ন", variant: "destructive" },
    pending: { label: "পেন্ডিং", variant: "secondary" },
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>অর্ডার নং</TableHead>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>কুরিয়ার</TableHead>
              <TableHead>ট্র্যাকিং নং</TableHead>
              <TableHead>এলাকা</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>শিপড</TableHead>
              <TableHead>ডেলিভারড</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const cs = courierStatusMap[order.courier_status || order.status] || { label: order.courier_status || order.status, variant: "outline" as const };
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to="/admin/orders" className="font-mono text-sm text-primary hover:underline">
                      #{order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{order.full_name}</p>
                      <p className="text-xs text-muted-foreground">{order.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{order.courier_provider}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.tracking_number || "—"}</TableCell>
                  <TableCell className="text-sm">{order.delivery_area}</TableCell>
                  <TableCell><Badge variant={cs.variant}>{cs.label}</Badge></TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(order.shipped_at)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(order.delivered_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminCouriers;
