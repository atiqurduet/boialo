import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingCart, Heart, Mail, Phone, Search, Package } from "lucide-react";
import { format } from "date-fns";

interface CustomerCartData {
  user_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  items: {
    product_id: string;
    quantity: number;
    created_at: string;
  }[];
  total_items: number;
  last_activity: string;
}

interface CustomerWishlistData {
  user_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  items: {
    product_id: string;
    created_at: string;
  }[];
  total_items: number;
  last_activity: string;
}

const AdminCartWishlistCustomers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cart");

  // Fetch cart customers with their items
  const { data: cartCustomers, isLoading: cartLoading } = useQuery({
    queryKey: ["admin-cart-customers"],
    queryFn: async () => {
      // Get all cart items with user info
      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select("user_id, product_id, quantity, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by user_id
      const userMap = new Map<string, CustomerCartData>();
      
      for (const item of cartItems || []) {
        if (!userMap.has(item.user_id)) {
          userMap.set(item.user_id, {
            user_id: item.user_id,
            profile: null,
            items: [],
            total_items: 0,
            last_activity: item.created_at,
          });
        }
        const userData = userMap.get(item.user_id)!;
        userData.items.push({
          product_id: item.product_id,
          quantity: item.quantity,
          created_at: item.created_at,
        });
        userData.total_items += item.quantity;
        if (new Date(item.created_at) > new Date(userData.last_activity)) {
          userData.last_activity = item.created_at;
        }
      }

      // Fetch profiles for all users
      const userIds = Array.from(userMap.keys());
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        for (const profile of profiles || []) {
          const userData = userMap.get(profile.id);
          if (userData) {
            userData.profile = {
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
            };
          }
        }
      }

      return Array.from(userMap.values()).sort(
        (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
    },
  });

  // Fetch wishlist customers with their items
  const { data: wishlistCustomers, isLoading: wishlistLoading } = useQuery({
    queryKey: ["admin-wishlist-customers"],
    queryFn: async () => {
      const { data: wishlistItems, error } = await supabase
        .from("wishlist_items")
        .select("user_id, product_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by user_id
      const userMap = new Map<string, CustomerWishlistData>();
      
      for (const item of wishlistItems || []) {
        if (!userMap.has(item.user_id)) {
          userMap.set(item.user_id, {
            user_id: item.user_id,
            profile: null,
            items: [],
            total_items: 0,
            last_activity: item.created_at,
          });
        }
        const userData = userMap.get(item.user_id)!;
        userData.items.push({
          product_id: item.product_id,
          created_at: item.created_at,
        });
        userData.total_items += 1;
        if (new Date(item.created_at) > new Date(userData.last_activity)) {
          userData.last_activity = item.created_at;
        }
      }

      // Fetch profiles for all users
      const userIds = Array.from(userMap.keys());
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        for (const profile of profiles || []) {
          const userData = userMap.get(profile.id);
          if (userData) {
            userData.profile = {
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
            };
          }
        }
      }

      return Array.from(userMap.values()).sort(
        (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
    },
  });

  // Filter customers based on search
  const filteredCartCustomers = cartCustomers?.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.profile?.full_name?.toLowerCase().includes(searchLower) ||
      customer.profile?.email?.toLowerCase().includes(searchLower) ||
      customer.profile?.phone?.includes(searchTerm)
    );
  });

  const filteredWishlistCustomers = wishlistCustomers?.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.profile?.full_name?.toLowerCase().includes(searchLower) ||
      customer.profile?.email?.toLowerCase().includes(searchLower) ||
      customer.profile?.phone?.includes(searchTerm)
    );
  });

  const renderCustomerTable = (
    customers: (CustomerCartData | CustomerWishlistData)[] | undefined,
    isLoading: boolean,
    type: "cart" | "wishlist"
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!customers || customers.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>কোনো কাস্টমার পাওয়া যায়নি</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>কাস্টমার</TableHead>
              <TableHead>ইমেইল</TableHead>
              <TableHead>ফোন</TableHead>
              <TableHead className="text-center">
                {type === "cart" ? "মোট আইটেম" : "পছন্দের আইটেম"}
              </TableHead>
              <TableHead>শেষ অ্যাক্টিভিটি</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.user_id}>
                <TableCell>
                  <div className="font-medium">
                    {customer.profile?.full_name || "নাম নেই"}
                  </div>
                </TableCell>
                <TableCell>
                  {customer.profile?.email ? (
                    <a
                      href={`mailto:${customer.profile.email}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {customer.profile.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {customer.profile?.phone ? (
                    <a
                      href={`tel:${customer.profile.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {customer.profile.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {customer.total_items}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(customer.last_activity), "dd MMM yyyy, hh:mm a")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {customer.profile?.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={`mailto:${customer.profile.email}`}>
                          <Mail className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {customer.profile?.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={`tel:${customer.profile.phone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">কার্ট ও উইশলিস্ট কাস্টমার</h1>
          <p className="text-muted-foreground">
            যেসব কাস্টমার কার্ট বা উইশলিস্টে প্রোডাক্ট যোগ করেছেন তাদের তথ্য
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">কার্টে প্রোডাক্ট আছে</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : cartCustomers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">জন কাস্টমার</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">উইশলিস্টে প্রোডাক্ট আছে</CardTitle>
              <Heart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wishlistLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : wishlistCustomers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">জন কাস্টমার</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cart" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              কার্ট ({filteredCartCustomers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2">
              <Heart className="w-4 h-4" />
              উইশলিস্ট ({filteredWishlistCustomers?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cart" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  কার্টে প্রোডাক্ট যোগ করা কাস্টমার
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCustomerTable(filteredCartCustomers, cartLoading, "cart")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  উইশলিস্টে প্রোডাক্ট যোগ করা কাস্টমার
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCustomerTable(filteredWishlistCustomers, wishlistLoading, "wishlist")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCartWishlistCustomers;
