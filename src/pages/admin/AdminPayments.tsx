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
  CreditCard, Settings, Save, Search, Download, Calendar, DollarSign,
  CheckCircle, Clock, XCircle, TrendingUp, Loader2, Filter, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface PaymentMethod {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
  sort_order: number;
  manual_number: string | null;
  manual_type: string | null;
  manual_instructions: string | null;
  payment_mode: string | null;
}

const paymentStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "পেইড", variant: "default" },
  pending: { label: "পেন্ডিং", variant: "secondary" },
  failed: { label: "ব্যর্থ", variant: "destructive" },
  refunded: { label: "রিফান্ড", variant: "outline" },
};

const orderStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "পেন্ডিং", variant: "secondary" },
  processing: { label: "প্রসেসিং", variant: "default" },
  shipped: { label: "শিপড", variant: "default" },
  delivered: { label: "ডেলিভারড", variant: "default" },
  cancelled: { label: "বাতিল", variant: "destructive" },
};

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("transactions");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as PaymentMethod[];
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-payment-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, payment_method, payment_status, total, subtotal, delivery_charge, transaction_id, full_name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      if (methodFilter !== "all" && order.payment_method !== methodFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (paymentStatusFilter !== "all" && order.payment_status !== paymentStatusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          order.order_number?.toLowerCase().includes(q) ||
          order.full_name?.toLowerCase().includes(q) ||
          order.phone?.toLowerCase().includes(q) ||
          order.transaction_id?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(order.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, methodFilter, statusFilter, paymentStatusFilter, searchQuery, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
    const paid = filteredOrders.filter((o) => o.payment_status === "paid");
    const pending = filteredOrders.filter((o) => o.payment_status === "pending");
    return {
      totalAmount: total,
      paidAmount: paid.reduce((s, o) => s + Number(o.total), 0),
      paidCount: paid.length,
      pendingCount: pending.length,
      totalCount: filteredOrders.length,
    };
  }, [filteredOrders]);

  const clearFilters = () => {
    setMethodFilter("all");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = methodFilter !== "all" || statusFilter !== "all" || paymentStatusFilter !== "all" || searchQuery || dateFrom || dateTo;

  // Settings mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentMethod> }) => {
      const { error } = await supabase.from("payment_methods").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      toast.success("পেমেন্ট মেথড আপডেট হয়েছে");
      setEditingMethod(null);
    },
    onError: (error) => toast.error("আপডেট ব্যর্থ: " + error.message),
  });

  const toggleActive = (method: PaymentMethod) => {
    updateMutation.mutate({ id: method.id, updates: { is_active: !method.is_active } });
  };

  const saveConfig = async () => {
    if (!editingMethod) return;
    try {
      const response = await supabase.functions.invoke("update-provider-config", {
        body: {
          action: "update",
          provider_table: "payment_methods",
          provider_id: editingMethod.id,
          provider_type: editingMethod.provider,
          config,
        },
      });
      if (response.error || !response.data?.success) {
        toast.error("আপডেট ব্যর্থ: " + (response.data?.error || response.error?.message));
        return;
      }
      toast.success("পেমেন্ট মেথড কনফিগার হয়েছে");
      setEditingMethod(null);
      setConfig({});
    } catch (err) {
      toast.error("কনফিগারেশন সেভ ব্যর্থ");
    }
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case "bkash": return ["app_key", "app_secret", "username", "password", "sandbox"];
      case "nagad": return ["merchant_id", "public_key", "private_key", "sandbox"];
      case "sslcommerz": return ["store_id", "store_password", "sandbox"];
      case "cod": return [];
      default: return [];
    }
  };

  const openConfigDialog = async (method: PaymentMethod) => {
    setEditingMethod(method);
    setConfig({});
    setConfigStatus({});
    try {
      const response = await supabase.functions.invoke("update-provider-config", {
        body: {
          action: "get_status",
          provider_table: "payment_methods",
          provider_id: method.id,
        },
      });
      if (response.data?.success) {
        setConfigStatus(response.data.config_status || {});
      }
    } catch (err) {
      // Ignore
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const exportCSV = () => {
    const headers = ["অর্ডার নং", "তারিখ", "কাস্টমার", "ফোন", "পেমেন্ট মেথড", "ট্রানজেকশন ID", "মোট", "পেমেন্ট স্ট্যাটাস", "অর্ডার স্ট্যাটাস"];
    const rows = filteredOrders.map((o) => [
      o.order_number, o.created_at, o.full_name, o.phone, o.payment_method, o.transaction_id || "", o.total, o.payment_status, o.status
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হয়েছে");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">পেমেন্ট ম্যানেজমেন্ট</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="transactions">ট্রানজেকশন হিস্টোরি</TabsTrigger>
            {paymentMethods?.map((m) => (
              <TabsTrigger key={m.id} value={`method-${m.provider}`}>
                {m.name_bn}
              </TabsTrigger>
            ))}
            <TabsTrigger value="settings">সেটিংস</TabsTrigger>
          </TabsList>

          {/* Transaction History Tab */}
          <TabsContent value="transactions">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <DollarSign className="h-4 w-4" /> মোট ট্রানজেকশন
                  </div>
                  <p className="text-2xl font-bold">৳{stats.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stats.totalCount}টি অর্ডার</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                    <CheckCircle className="h-4 w-4" /> পেইড
                  </div>
                  <p className="text-2xl font-bold text-green-600">৳{stats.paidAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stats.paidCount}টি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
                    <Clock className="h-4 w-4" /> পেন্ডিং
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}টি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <TrendingUp className="h-4 w-4" /> গড় অর্ডার
                  </div>
                  <p className="text-2xl font-bold">৳{stats.totalCount ? Math.round(stats.totalAmount / stats.totalCount).toLocaleString() : 0}</p>
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
                      placeholder="অর্ডার নং, নাম, ফোন বা ট্রানজেকশন ID দিয়ে খুঁজুন..."
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                      <SelectTrigger><SelectValue placeholder="পেমেন্ট মেথড" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল মেথড</SelectItem>
                        {paymentMethods?.map((m) => (
                          <SelectItem key={m.id} value={m.provider}>{m.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger><SelectValue placeholder="পেমেন্ট স্ট্যাটাস" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                        <SelectItem value="paid">পেইড</SelectItem>
                        <SelectItem value="pending">পেন্ডিং</SelectItem>
                        <SelectItem value="failed">ব্যর্থ</SelectItem>
                        <SelectItem value="refunded">রিফান্ড</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger><SelectValue placeholder="অর্ডার স্ট্যাটাস" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল</SelectItem>
                        <SelectItem value="pending">পেন্ডিং</SelectItem>
                        <SelectItem value="processing">প্রসেসিং</SelectItem>
                        <SelectItem value="shipped">শিপড</SelectItem>
                        <SelectItem value="delivered">ডেলিভারড</SelectItem>
                        <SelectItem value="cancelled">বাতিল</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="থেকে" />
                    <div className="flex gap-2">
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="পর্যন্ত" />
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
                    {methodFilter !== "all" && <Badge variant="secondary" className="text-xs">{methodFilter}</Badge>}
                    {paymentStatusFilter !== "all" && <Badge variant="secondary" className="text-xs">{paymentStatusFilter}</Badge>}
                    {statusFilter !== "all" && <Badge variant="secondary" className="text-xs">{statusFilter}</Badge>}
                    {dateFrom && <Badge variant="secondary" className="text-xs">{dateFrom} থেকে</Badge>}
                    {dateTo && <Badge variant="secondary" className="text-xs">{dateTo} পর্যন্ত</Badge>}
                    <Badge variant="outline" className="text-xs">{filteredOrders.length}টি ফলাফল</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <TransactionTable orders={filteredOrders} loading={ordersLoading} formatDate={formatDate} />
          </TabsContent>

          {/* Per-method tabs */}
          {paymentMethods?.map((m) => {
            const methodOrders = filteredOrders.filter((o) => o.payment_method === m.provider);
            return (
              <TabsContent key={m.id} value={`method-${m.provider}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{m.name_bn} মোট</p>
                      <p className="text-2xl font-bold">৳{methodOrders.reduce((s, o) => s + Number(o.total), 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{methodOrders.length}টি অর্ডার</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-green-600">পেইড</p>
                      <p className="text-2xl font-bold text-green-600">{methodOrders.filter((o) => o.payment_status === "paid").length}টি</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-yellow-600">পেন্ডিং</p>
                      <p className="text-2xl font-bold text-yellow-600">{methodOrders.filter((o) => o.payment_status === "pending").length}টি</p>
                    </CardContent>
                  </Card>
                </div>
                <TransactionTable orders={methodOrders} loading={ordersLoading} formatDate={formatDate} />
              </TabsContent>
            );
          })}

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid gap-4 md:grid-cols-2">
              {paymentMethods?.map((method) => (
                <Card key={method.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {method.name_en}
                    </CardTitle>
                    <Badge variant={method.is_active ? "default" : "secondary"}>
                      {method.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{method.name_bn}</p>
                    
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={method.is_active} onCheckedChange={() => toggleActive(method)} />
                        <span className="text-sm">{method.is_active ? "সক্রিয় (কার্ট পেজে দেখাবে)" : "নিষ্ক্রিয় (কার্ট পেজে দেখাবে না)"}</span>
                      </div>
                    </div>

                    {/* Manual Settings (for bkash, nagad) */}
                    {(method.provider === "bkash" || method.provider === "nagad") && (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                        <h4 className="text-sm font-semibold">ম্যানুয়াল সেটিং</h4>
                        <div className="space-y-2">
                          <Label className="text-xs">অ্যাকাউন্ট নম্বর</Label>
                          <Input
                            placeholder="01XXXXXXXXX"
                            defaultValue={method.manual_number || ''}
                            onBlur={(e) => {
                              updateMutation.mutate({ id: method.id, updates: { manual_number: e.target.value } as any });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">পেমেন্ট ধরণ</Label>
                          <Select defaultValue={method.manual_type || 'send_money'} onValueChange={(val) => {
                            updateMutation.mutate({ id: method.id, updates: { manual_type: val } as any });
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="send_money">Send Money</SelectItem>
                              <SelectItem value="payment">Payment</SelectItem>
                              <SelectItem value="merchant">Merchant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">নির্দেশনা</Label>
                          <Input
                            placeholder="যেমন: পেমেন্ট করে ট্রানজেকশন আইডি দিন"
                            defaultValue={method.manual_instructions || ''}
                            onBlur={(e) => {
                              updateMutation.mutate({ id: method.id, updates: { manual_instructions: e.target.value } as any });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">পেমেন্ট মোড</Label>
                          <Select defaultValue={method.payment_mode || 'manual'} onValueChange={(val) => {
                            updateMutation.mutate({ id: method.id, updates: { payment_mode: val } as any });
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">ম্যানুয়াল (নম্বর দেখানো হবে)</SelectItem>
                              <SelectItem value="api">API (অটোমেটিক পেমেন্ট)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* API Configuration */}
                    {method.provider !== "cod" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full" onClick={() => openConfigDialog(method)}>
                            <Settings className="h-4 w-4 mr-2" /> API কনফিগারেশন
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configure {method.name_en} API</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {getProviderConfig(method.provider).map((field) => (
                              <div key={field} className="space-y-2">
                                <Label htmlFor={field} className="capitalize">{field.replace(/_/g, " ")}</Label>
                                {field === "sandbox" ? (
                                  <div className="flex items-center gap-2">
                                    <Switch id={field} checked={config[field] === "true"} onCheckedChange={(checked) => setConfig({ ...config, [field]: checked.toString() })} />
                                    <span className="text-sm text-muted-foreground">{config[field] === "true" ? "Test Mode" : "Live Mode"}</span>
                                  </div>
                                ) : (
                                  <Input id={field} type={field.includes("secret") || field.includes("password") || field.includes("key") ? "password" : "text"} value={config[field] || ""} onChange={(e) => setConfig({ ...config, [field]: e.target.value })} placeholder={configStatus[field] ? "••••••• (configured)" : `Enter ${field.replace(/_/g, " ")}`} />
                                )}
                              </div>
                            ))}
                            <Button onClick={saveConfig} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Configuration</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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

interface TransactionTableProps {
  orders: any[];
  loading: boolean;
  formatDate: (d: string) => string;
}

const TransactionTable = ({ orders, loading, formatDate }: TransactionTableProps) => {
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
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>কোনো ট্রানজেকশন পাওয়া যায়নি</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>অর্ডার নং</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>মেথড</TableHead>
              <TableHead>ট্রানজেকশন ID</TableHead>
              <TableHead>মোট</TableHead>
              <TableHead>পেমেন্ট</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const ps = paymentStatusMap[order.payment_status] || { label: order.payment_status, variant: "outline" as const };
              const os = orderStatusMap[order.status] || { label: order.status, variant: "outline" as const };
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to="/admin/orders" className="font-mono text-sm text-primary hover:underline">
                      #{order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(order.created_at)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{order.full_name}</p>
                      <p className="text-xs text-muted-foreground">{order.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{order.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{order.transaction_id || "—"}</TableCell>
                  <TableCell className="font-semibold">৳{Number(order.total).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                  <TableCell><Badge variant={os.variant}>{os.label}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminPayments;
