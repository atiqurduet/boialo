import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PendingTasksWidget } from '@/components/admin/PendingTasksWidget';
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';

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

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0, pendingOrders: 0, processingOrders: 0, deliveredOrders: 0,
    totalProducts: 0, totalCategories: 0, totalRevenue: 0, todayOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders').select('*').order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const { count: productsCount } = await supabase
        .from('products').select('*', { count: 'exact', head: true });
      const { count: categoriesCount } = await supabase
        .from('categories').select('*', { count: 'exact', head: true });

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayOrders = orders?.filter(o => new Date(o.created_at) >= today) || [];
      const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
      const processingOrders = orders?.filter(o => o.status === 'processing') || [];
      const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled') || [];
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      setStats({
        totalOrders: orders?.length || 0, pendingOrders: pendingOrders.length,
        processingOrders: processingOrders.length, deliveredOrders: deliveredOrders.length,
        totalProducts: productsCount || 0, totalCategories: categoriesCount || 0,
        totalRevenue, todayOrders: todayOrders.length
      });

      // Order status pie chart
      setOrderStatusData([
        { name: 'পেন্ডিং', value: pendingOrders.length },
        { name: 'প্রসেসিং', value: processingOrders.length },
        { name: 'ডেলিভার্ড', value: deliveredOrders.length },
        { name: 'বাতিল', value: cancelledOrders.length },
      ].filter(d => d.value > 0));

      // Daily revenue for last 7 days
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOrders = orders?.filter(o => o.created_at?.startsWith(dateStr)) || [];
        return {
          date: format(date, 'dd MMM'),
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        };
      });
      setDailyRevenue(last7);

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
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
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
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
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

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>সাপ্তাহিক রেভিনিউ ও অর্ডার</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="রেভিনিউ (৳)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="অর্ডার" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Order Status Pie */}
              <Card>
                <CardHeader><CardTitle>অর্ডার স্ট্যাটাস</CardTitle></CardHeader>
                <CardContent>
                  {orderStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {orderStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">কোন ডেটা নেই</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout for Tasks and Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendingTasksWidget />
              <Card>
                <CardHeader><CardTitle>সাম্প্রতিক অর্ডার</CardTitle></CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">কোন অর্ডার নেই</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium text-sm">অর্ডার</th>
                            <th className="text-left py-3 px-2 font-medium text-sm">গ্রাহক</th>
                            <th className="text-left py-3 px-2 font-medium text-sm">মোট</th>
                            <th className="text-left py-3 px-2 font-medium text-sm">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => (
                            <tr key={order.id} className="border-b">
                              <td className="py-2 px-2 font-mono text-xs">{order.order_number}</td>
                              <td className="py-2 px-2 text-sm">{order.full_name}</td>
                              <td className="py-2 px-2 text-sm">৳{Number(order.total).toLocaleString()}</td>
                              <td className="py-2 px-2">{getStatusBadge(order.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
