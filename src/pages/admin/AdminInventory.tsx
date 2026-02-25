import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Package, AlertTriangle, Search, Bell, TrendingDown, ArrowUpDown, Download,
} from "lucide-react";

const AdminInventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"stock_asc" | "stock_desc" | "name">("stock_asc");

  // Fetch all products with stock info
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-inventory", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, title_bn, price, stock_quantity, images, is_active")
        .order("stock_quantity", { ascending: true });

      if (searchTerm) {
        query = query.ilike("title_bn", `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch universal products stock
  const { data: universalProducts = [] } = useQuery({
    queryKey: ["admin-inventory-universal", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("universal_products")
        .select("id, name_bn, name_en, price, stock_quantity, sku, is_active, product_type")
        .order("stock_quantity", { ascending: true });

      if (searchTerm) {
        query = query.or(`name_bn.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch back-in-stock alerts
  const { data: stockAlerts = [] } = useQuery({
    queryKey: ["admin-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("back_in_stock_alerts")
        .select("*")
        .eq("is_notified", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch price drop alerts
  const { data: priceAlerts = [] } = useQuery({
    queryKey: ["admin-price-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_drop_alerts")
        .select("*")
        .eq("is_notified", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const outOfStock = products.filter(p => (p.stock_quantity || 0) <= 0);
  const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5);
  const uniOutOfStock = universalProducts.filter(p => (p.stock_quantity || 0) <= 0);
  const uniLowStock = universalProducts.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5);

  const getStockBadge = (qty: number | null) => {
    const q = qty || 0;
    if (q <= 0) return <Badge variant="destructive">স্টক আউট</Badge>;
    if (q <= 5) return <Badge className="bg-yellow-500">লো স্টক ({q})</Badge>;
    return <Badge className="bg-green-500">{q}</Badge>;
  };

  const exportCSV = () => {
    const rows = products.map(p => [(p as any).title_bn, (p as any).stock_quantity || 0, (p as any).price].join(','));
    const csv = ['নাম,স্টক,মূল্য', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-report.csv';
    link.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              ইনভেন্টরি ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground">স্টক ও ইনভেন্টরি ট্র্যাকিং</p>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            এক্সপোর্ট
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{products.length + universalProducts.length}</p>
                  <p className="text-xs text-muted-foreground">মোট প্রোডাক্ট</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{outOfStock.length + uniOutOfStock.length}</p>
                  <p className="text-xs text-muted-foreground">স্টক আউট</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lowStock.length + uniLowStock.length}</p>
                  <p className="text-xs text-muted-foreground">লো স্টক</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stockAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">স্টক অ্যালার্ট</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{priceAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">প্রাইস অ্যালার্ট</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="প্রোডাক্ট খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="books">
          <TabsList>
            <TabsTrigger value="books">বই ({products.length})</TabsTrigger>
            <TabsTrigger value="universal">সাধারণ প্রোডাক্ট ({universalProducts.length})</TabsTrigger>
            <TabsTrigger value="alerts">অ্যালার্ট ({stockAlerts.length + priceAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead className="text-center">স্টক</TableHead>
                      <TableHead className="text-right">মূল্য</TableHead>
                      <TableHead className="text-center">স্ট্যাটাস</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                    ) : products.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">কোন প্রোডাক্ট নেই</TableCell></TableRow>
                    ) : (
                      products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium max-w-[300px] truncate">{p.title_bn}</TableCell>
                          <TableCell className="text-center">{getStockBadge(p.stock_quantity)}</TableCell>
                          <TableCell className="text-right">৳{p.price}</TableCell>
                          <TableCell className="text-center">
                            {p.is_active ? (
                              <Badge variant="outline" className="text-green-600">সক্রিয়</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">নিষ্ক্রিয়</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="universal">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">স্টক</TableHead>
                      <TableHead className="text-right">মূল্য</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universalProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোন প্রোডাক্ট নেই</TableCell></TableRow>
                    ) : (
                      universalProducts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium max-w-[300px] truncate">{p.name_bn}</TableCell>
                          <TableCell><Badge variant="secondary">{p.product_type}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{p.sku || '-'}</TableCell>
                          <TableCell className="text-center">{getStockBadge(p.stock_quantity)}</TableCell>
                          <TableCell className="text-right">৳{p.price}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Back in Stock অ্যালার্ট ({stockAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stockAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">কোন অ্যালার্ট নেই</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>প্রোডাক্ট ID</TableHead>
                          <TableHead>ইমেইল</TableHead>
                          <TableHead>তারিখ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockAlerts.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">{a.product_id}</TableCell>
                            <TableCell>{a.email || '-'}</TableCell>
                            <TableCell>{new Date(a.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Price Drop অ্যালার্ট ({priceAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {priceAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">কোন অ্যালার্ট নেই</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>প্রোডাক্ট ID</TableHead>
                          <TableHead>মূল দাম</TableHead>
                          <TableHead>তারিখ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceAlerts.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-mono text-xs">{a.product_id}</TableCell>
                            <TableCell>৳{a.original_price}</TableCell>
                            <TableCell>{new Date(a.created_at).toLocaleDateString("bn-BD")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;
