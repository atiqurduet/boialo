import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalRevenue: number;
  todayOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalRevenue: 0,
    todayOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders?.filter(o => new Date(o.created_at) >= today) || [];
      const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
      const processingOrders = orders?.filter(o => o.status === 'processing') || [];
      const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      setStats({
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        processingOrders: processingOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalProducts: productsCount || 0,
        totalCategories: categoriesCount || 0,
        totalRevenue,
        todayOrders: todayOrders.length
      });

      setRecentOrders(orders?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'মোট অর্ডার', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-blue-500' },
    { title: 'আজকের অর্ডার', value: stats.todayOrders, icon: Clock, color: 'bg-green-500' },
    { title: 'পেন্ডিং অর্ডার', value: stats.pendingOrders, icon: Clock, color: 'bg-yellow-500' },
    { title: 'প্রসেসিং', value: stats.processingOrders, icon: Truck, color: 'bg-orange-500' },
    { title: 'ডেলিভার্ড', value: stats.deliveredOrders, icon: CheckCircle, color: 'bg-emerald-500' },
    { title: 'মোট প্রোডাক্ট', value: stats.totalProducts, icon: Package, color: 'bg-purple-500' },
    { title: 'ক্যাটাগরি', value: stats.totalCategories, icon: Package, color: 'bg-pink-500' },
    { title: 'মোট রেভিনিউ', value: `৳${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-indigo-500' },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'পেন্ডিং', className: 'bg-yellow-100 text-yellow-800' },
      processing: { label: 'প্রসেসিং', className: 'bg-blue-100 text-blue-800' },
      delivered: { label: 'ডেলিভার্ড', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'বাতিল', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground">আপনার স্টোরের সামারি</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>সাম্প্রতিক অর্ডার</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">কোন অর্ডার নেই</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">অর্ডার নং</th>
                          <th className="text-left py-3 px-4 font-medium">গ্রাহক</th>
                          <th className="text-left py-3 px-4 font-medium">মোট</th>
                          <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                          <th className="text-left py-3 px-4 font-medium">তারিখ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b">
                            <td className="py-3 px-4 font-mono text-sm">{order.order_number}</td>
                            <td className="py-3 px-4">{order.full_name}</td>
                            <td className="py-3 px-4">৳{Number(order.total).toLocaleString()}</td>
                            <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('bn-BD')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
