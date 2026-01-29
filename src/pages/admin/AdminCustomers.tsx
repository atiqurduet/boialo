import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Ban,
  CheckCircle,
  TrendingUp,
  Package,
  Heart,
  ShoppingCart,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { CustomerOrderHistory } from "@/components/admin/customer/CustomerOrderHistory";
import { CustomerAnalytics } from "@/components/admin/customer/CustomerAnalytics";
import { CustomerActivityTimeline } from "@/components/admin/customer/CustomerActivityTimeline";
import { CustomerContactActions } from "@/components/admin/customer/CustomerContactActions";
import { CustomerAddressBook } from "@/components/admin/customer/CustomerAddressBook";

interface CustomerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface RiskProfile {
  id: string;
  user_id: string;
  phone_verified: boolean;
  total_orders: number;
  successful_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  risk_score: number;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  notes: string | null;
}

interface CustomerStats {
  totalSpent: number;
  orderCount: number;
  cartItems: number;
  wishlistItems: number;
}

const AdminCustomers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch customers with stats
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers-advanced", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch stats for each customer
      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get order stats
          const { data: orders } = await supabase
            .from("orders")
            .select("total, status")
            .eq("user_id", profile.id);

          const deliveredOrders = orders?.filter(o => o.status === "delivered") || [];
          const totalSpent = deliveredOrders.reduce((sum, o) => sum + Number(o.total), 0);

          // Get cart count
          const { count: cartCount } = await supabase
            .from("cart_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          // Get wishlist count
          const { count: wishlistCount } = await supabase
            .from("wishlist_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          return {
            ...profile,
            stats: {
              totalSpent,
              orderCount: orders?.length || 0,
              cartItems: cartCount || 0,
              wishlistItems: wishlistCount || 0,
            } as CustomerStats,
          };
        })
      );

      return customersWithStats;
    },
  });

  // Calculate summary stats
  const summaryStats = {
    totalCustomers: customers?.length || 0,
    totalRevenue: customers?.reduce((sum, c) => sum + c.stats.totalSpent, 0) || 0,
    totalOrders: customers?.reduce((sum, c) => sum + c.stats.orderCount, 0) || 0,
    activeCart: customers?.filter(c => c.stats.cartItems > 0).length || 0,
  };

  const fetchRiskProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("customer_risk_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as RiskProfile | null;
  };

  const openCustomerDetails = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsSheetOpen(true);
    try {
      const profile = await fetchRiskProfile(customer.id);
      setRiskProfile(profile);
      setBlacklistReason(profile?.blacklist_reason || "");
      setNotes(profile?.notes || "");
    } catch (error) {
      console.error("Error fetching risk profile:", error);
      setRiskProfile(null);
    }
  };

  const updateRiskProfile = useMutation({
    mutationFn: async (updates: Partial<RiskProfile>) => {
      if (!selectedCustomer) return;

      if (riskProfile) {
        const { error } = await supabase
          .from("customer_risk_profiles")
          .update(updates)
          .eq("user_id", selectedCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_risk_profiles")
          .insert({ user_id: selectedCustomer.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers-advanced"] });
      toast.success("প্রোফাইল আপডেট হয়েছে");
      if (selectedCustomer) {
        fetchRiskProfile(selectedCustomer.id).then(setRiskProfile);
      }
    },
    onError: (error) => {
      toast.error("আপডেট ব্যর্থ: " + error.message);
    },
  });

  const toggleBlacklist = () => {
    const newStatus = !riskProfile?.is_blacklisted;
    updateRiskProfile.mutate({
      is_blacklisted: newStatus,
      blacklist_reason: newStatus ? blacklistReason : null,
    });
  };

  const saveNotes = () => {
    updateRiskProfile.mutate({ notes });
  };

  const getRiskBadge = (score: number) => {
    if (score < 30) return <Badge className="bg-green-500">Low Risk</Badge>;
    if (score < 60) return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    return <Badge className="bg-red-500">High Risk</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">লোড হচ্ছে...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            কাস্টমার ম্যানেজমেন্ট
          </h1>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryStats.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">মোট কাস্টমার</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">৳{summaryStats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">মোট রেভিনিউ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryStats.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">মোট অর্ডার</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryStats.activeCart}</p>
                  <p className="text-xs text-muted-foreground">অ্যাক্টিভ কার্ট</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="নাম, ইমেইল বা ফোন দিয়ে সার্চ করুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>যোগাযোগ</TableHead>
                  <TableHead className="text-center">অর্ডার</TableHead>
                  <TableHead className="text-center">মোট খরচ</TableHead>
                  <TableHead className="text-center">কার্ট/উইশলিস্ট</TableHead>
                  <TableHead>যোগদান</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {customer.full_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <p className="text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </p>
                        )}
                        {customer.phone && (
                          <p className="text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.stats.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      ৳{customer.stats.totalSpent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex items-center gap-1 text-xs">
                          <ShoppingCart className="h-3 w-3" />
                          {customer.stats.cartItems}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Heart className="h-3 w-3" />
                          {customer.stats.wishlistItems}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCustomerDetails(customer)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        বিস্তারিত
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCustomer?.full_name || "কাস্টমার"} - বিস্তারিত
            </SheetTitle>
          </SheetHeader>

          {selectedCustomer && (
            <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">ওভারভিউ</TabsTrigger>
                  <TabsTrigger value="orders">অর্ডার</TabsTrigger>
                  <TabsTrigger value="activity">অ্যাক্টিভিটি</TabsTrigger>
                  <TabsTrigger value="addresses">ঠিকানা</TabsTrigger>
                  <TabsTrigger value="risk">রিস্ক</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Customer Info Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">প্রোফাইল তথ্য</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">নাম</Label>
                        <p className="font-medium">{selectedCustomer.full_name || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">ইমেইল</Label>
                        <p className="font-medium">{selectedCustomer.email || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">ফোন</Label>
                        <p className="font-medium">{selectedCustomer.phone || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">যোগদান</Label>
                        <p className="font-medium">{formatDate(selectedCustomer.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics */}
                  <CustomerAnalytics customerId={selectedCustomer.id} />

                  {/* Contact Actions */}
                  <CustomerContactActions customer={selectedCustomer} />
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders">
                  <CustomerOrderHistory customerId={selectedCustomer.id} />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                  <CustomerActivityTimeline customerId={selectedCustomer.id} />
                </TabsContent>

                {/* Addresses Tab */}
                <TabsContent value="addresses">
                  <CustomerAddressBook customerId={selectedCustomer.id} />
                </TabsContent>

                {/* Risk Tab */}
                <TabsContent value="risk" className="space-y-4">
                  {/* Risk Assessment */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        রিস্ক অ্যাসেসমেন্ট
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">{riskProfile?.total_orders || 0}</p>
                          <p className="text-sm text-muted-foreground">মোট অর্ডার</p>
                        </div>
                        <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{riskProfile?.successful_orders || 0}</p>
                          <p className="text-sm text-muted-foreground">সফল</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">{riskProfile?.cancelled_orders || 0}</p>
                          <p className="text-sm text-muted-foreground">বাতিল</p>
                        </div>
                        <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{riskProfile?.returned_orders || 0}</p>
                          <p className="text-sm text-muted-foreground">রিটার্ন</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>রিস্ক স্কোর:</span>
                          {getRiskBadge(riskProfile?.risk_score || 50)}
                          <span className="text-muted-foreground">
                            ({riskProfile?.risk_score || 50}/100)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {riskProfile?.phone_verified ? (
                            <Badge variant="outline" className="text-green-600">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              ফোন ভেরিফাইড
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              ফোন ভেরিফাই নয়
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Blacklist Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {riskProfile?.is_blacklisted ? (
                          <Ban className="h-5 w-5 text-red-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        অ্যাকাউন্ট স্ট্যাটাস
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={riskProfile?.is_blacklisted || false}
                            onCheckedChange={toggleBlacklist}
                          />
                          <span>
                            {riskProfile?.is_blacklisted
                              ? "ব্ল্যাকলিস্টেড"
                              : "অ্যাক্টিভ অ্যাকাউন্ট"}
                          </span>
                        </div>
                      </div>
                      {(riskProfile?.is_blacklisted || blacklistReason) && (
                        <div className="space-y-2">
                          <Label>ব্ল্যাকলিস্ট কারণ</Label>
                          <Input
                            value={blacklistReason}
                            onChange={(e) => setBlacklistReason(e.target.value)}
                            placeholder="ব্ল্যাকলিস্ট করার কারণ লিখুন..."
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">অ্যাডমিন নোটস</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="এই কাস্টমার সম্পর্কে নোট লিখুন..."
                        rows={4}
                      />
                      <Button onClick={saveNotes} size="sm">
                        নোট সেভ করুন
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default AdminCustomers;
