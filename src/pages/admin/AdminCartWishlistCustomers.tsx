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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShoppingCart, Heart, Mail, Phone, Search, Package, Eye, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface ProductInfo {
  id: string;
  title: string;
  image: string | null;
  price: number;
  slug: string;
  type: "book" | "universal";
}

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
    product?: ProductInfo;
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
    product?: ProductInfo;
  }[];
  total_items: number;
  last_activity: string;
}

const AdminCartWishlistCustomers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cart");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCartData | CustomerWishlistData | null>(null);

  // Fetch all products for reference
  const { data: allProducts } = useQuery({
    queryKey: ["all-products-reference"],
    queryFn: async () => {
      const productMap = new Map<string, ProductInfo>();

      // Fetch books
      const { data: books } = await supabase
        .from("products")
        .select("id, title_bn, images, price, slug")
        .eq("is_active", true);

      for (const book of books || []) {
        const images = book.images as string[] | null;
        productMap.set(book.id, {
          id: book.id,
          title: book.title_bn,
          image: images && images.length > 0 ? images[0] : null,
          price: book.price,
          slug: book.slug,
          type: "book",
        });
      }

      // Fetch universal products
      const { data: universalProducts } = await supabase
        .from("universal_products")
        .select("id, name_bn, images, price, slug")
        .eq("is_active", true);

      for (const product of universalProducts || []) {
        const images = product.images as string[] | null;
        productMap.set(product.id, {
          id: product.id,
          title: product.name_bn,
          image: images && images.length > 0 ? images[0] : null,
          price: product.price,
          slug: product.slug,
          type: "universal",
        });
      }

      return productMap;
    },
  });

  // Fetch cart customers with their items
  const { data: cartCustomers, isLoading: cartLoading } = useQuery({
    queryKey: ["admin-cart-customers", allProducts],
    queryFn: async () => {
      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select("user_id, product_id, quantity, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

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
          product: allProducts?.get(item.product_id),
        });
        userData.total_items += item.quantity;
        if (new Date(item.created_at) > new Date(userData.last_activity)) {
          userData.last_activity = item.created_at;
        }
      }

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
    enabled: !!allProducts,
  });

  // Fetch wishlist customers with their items
  const { data: wishlistCustomers, isLoading: wishlistLoading } = useQuery({
    queryKey: ["admin-wishlist-customers", allProducts],
    queryFn: async () => {
      const { data: wishlistItems, error } = await supabase
        .from("wishlist_items")
        .select("user_id, product_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

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
          product: allProducts?.get(item.product_id),
        });
        userData.total_items += 1;
        if (new Date(item.created_at) > new Date(userData.last_activity)) {
          userData.last_activity = item.created_at;
        }
      }

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
    enabled: !!allProducts,
  });

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

  const ProductsDialog = ({ customer, type }: { customer: CustomerCartData | CustomerWishlistData; type: "cart" | "wishlist" }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Eye className="w-4 h-4" />
          প্রোডাক্ট দেখুন
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "cart" ? <ShoppingCart className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
            {customer.profile?.full_name || "কাস্টমার"} এর {type === "cart" ? "কার্ট" : "উইশলিস্ট"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg text-sm">
            {customer.profile?.email && (
              <a href={`mailto:${customer.profile.email}`} className="flex items-center gap-1 text-primary hover:underline">
                <Mail className="w-4 h-4" />
                {customer.profile.email}
              </a>
            )}
            {customer.profile?.phone && (
              <a href={`tel:${customer.profile.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                {customer.profile.phone}
              </a>
            )}
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {customer.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                    {item.product?.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium line-clamp-2">
                      {item.product?.title || `প্রোডাক্ট ID: ${item.product_id}`}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {item.product && (
                        <span className="text-primary font-semibold">৳{item.product.price}</span>
                      )}
                      {"quantity" in item && (
                        <Badge variant="secondary">পরিমাণ: {item.quantity}</Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(item.created_at), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>
                  {item.product && (
                    <Link
                      to={item.product.type === "book" ? `/product/${item.product.slug}` : `/universal-product/${item.product.slug}`}
                      target="_blank"
                      className="flex-shrink-0"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-medium">মোট আইটেম:</span>
            <Badge>{customer.total_items}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

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
              <TableHead>প্রোডাক্ট</TableHead>
              <TableHead className="text-center">মোট আইটেম</TableHead>
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
                      className="flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="max-w-[150px] truncate">{customer.profile.email}</span>
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
                <TableCell>
                  <div className="flex -space-x-2">
                    {customer.items.slice(0, 3).map((item, index) => (
                      <div
                        key={index}
                        className="w-10 h-12 bg-muted rounded border-2 border-background overflow-hidden"
                        title={item.product?.title || item.product_id}
                      >
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {customer.items.length > 3 && (
                      <div className="w-10 h-12 bg-muted rounded border-2 border-background flex items-center justify-center text-xs font-medium">
                        +{customer.items.length - 3}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{customer.total_items}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(customer.last_activity), "dd MMM yyyy")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ProductsDialog customer={customer} type={type} />
                    {customer.profile?.phone && (
                      <Button size="sm" variant="outline" asChild>
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
            যেসব কাস্টমার কার্ট বা উইশলিস্টে প্রোডাক্ট যোগ করেছেন তাদের তথ্য ও প্রোডাক্ট লিস্ট
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
