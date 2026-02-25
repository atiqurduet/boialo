import { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PendingTasksWidget } from '@/components/admin/PendingTasksWidget';
import {
  ShoppingCart, Package, Users, TrendingUp, Clock, CheckCircle,
  XCircle, Truck, AlertTriangle, CreditCard, Wallet, ArrowUpRight,
  ArrowDownRight, Eye, RefreshCw, Printer, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  avgOrderValue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  shippedOrders: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const STATUS_COLORS: Record<string, string> = {
  'পেন্ডিং': '#f59e0b',
  'প্রসেসিং': '#3b82f6',
  'শিপড': '#8b5cf6',
  'ডেলিভার্ড': '#10b981',
  'বাতিল': '#ef4444',
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0, pendingOrders: 0, processingOrders: 0, deliveredOrders: 0,
    cancelledOrders: 0, totalProducts: 0, totalCategories: 0, totalRevenue: 0,
    todayOrders: 0, todayRevenue: 0, totalCustomers: 0, lowStockProducts: 0,
    avgOrderValue: 0, thisMonthRevenue: 0, lastMonthRevenue: 0, shippedOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        { data: orders },
        { count: productsCount },
        { count: categoriesCount },
        { count: customersCount },
        { count: lowStockCount },
        { data: orderItems },
      ] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock_quantity', 5).gt('stock_quantity', -1),
        supabase.from('order_items').select('product_title, quantity, price').limit(500),
      ]);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const thisMonthStart = startOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const todayOrders = orders?.filter(o => new Date(o.created_at) >= today) || [];
      const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
      const processingOrders = orders?.filter(o => o.status === 'processing') || [];
      const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled') || [];
      const shippedOrders = orders?.filter(o => o.status === 'shipped') || [];
      const totalRevenue = orders?.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
      const thisMonthOrders = orders?.filter(o => new Date(o.created_at) >= thisMonthStart && o.status !== 'cancelled') || [];
      const lastMonthOrders = orders?.filter(o => new Date(o.created_at) >= lastMonthStart && new Date(o.created_at) <= lastMonthEnd && o.status !== 'cancelled') || [];
      const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + Number(o.total), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + Number(o.total), 0);
      const validOrders = orders?.filter(o => o.status !== 'cancelled') || [];

      setStats({
        totalOrders: orders?.length || 0, pendingOrders: pendingOrders.length,
        processingOrders: processingOrders.length, deliveredOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length, shippedOrders: shippedOrders.length,
        totalProducts: productsCount || 0, totalCategories: categoriesCount || 0,
        totalRevenue, todayOrders: todayOrders.length, todayRevenue,
        totalCustomers: customersCount || 0, lowStockProducts: lowStockCount || 0,
        avgOrderValue: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
        thisMonthRevenue, lastMonthRevenue
      });

      // Order status pie
      setOrderStatusData([
        { name: 'পেন্ডিং', value: pendingOrders.length },
        { name: 'প্রসেসিং', value: processingOrders.length },
        { name: 'শিপড', value: shippedOrders.length },
        { name: 'ডেলিভার্ড', value: deliveredOrders.length },
        { name: 'বাতিল', value: cancelledOrders.length },
      ].filter(d => d.value > 0));

      // Payment method breakdown
      const paymentMap: Record<string, number> = {};
      orders?.forEach(o => {
        const method = o.payment_method === 'cod' ? 'ক্যাশ অন ডেলিভারি' : o.payment_method === 'bkash' ? 'বিকাশ' : o.payment_method || 'অন্যান্য';
        paymentMap[method] = (paymentMap[method] || 0) + 1;
      });
      setPaymentMethodData(Object.entries(paymentMap).map(([name, value]) => ({ name, value })));

      // Daily revenue for last 14 days
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOrders = orders?.filter(o => o.created_at?.startsWith(dateStr) && o.status !== 'cancelled') || [];
        return {
          date: format(date, 'dd MMM'),
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        };
      });
      setDailyRevenue(last14);

      // Top products
      const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const key = item.product_title;
        if (!productSales[key]) productSales[key] = { title: item.product_title, quantity: 0, revenue: 0 };
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.price * item.quantity;
      });
      setTopProducts(Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      setRecentOrders(orders?.slice(0, 8) || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const revenueGrowth = stats.lastMonthRevenue > 0
    ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100).toFixed(1)
    : '0';
  const isPositiveGrowth = Number(revenueGrowth) >= 0;

  const handlePrintDashboard = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>ড্যাশবোর্ড রিপোর্ট - ${format(new Date(), 'dd/MM/yyyy')}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; }
        .grid { display: grid; gap: 16px; }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
        th { font-weight: 600; background: #f9fafb; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin: 16px 0 8px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
        <div class="header">
          <div><h1>📊 ড্যাশবোর্ড সামারি রিপোর্ট</h1><p style="color:#6b7280;margin:0;">তারিখ: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</p></div>
        </div>
        <div class="grid grid-4">
          <div class="card"><div class="stat-label">মোট রেভিনিউ</div><div class="stat-value">৳${stats.totalRevenue.toLocaleString()}</div></div>
          <div class="card"><div class="stat-label">মোট অর্ডার</div><div class="stat-value">${stats.totalOrders}</div></div>
          <div class="card"><div class="stat-label">গড় অর্ডার মূল্য</div><div class="stat-value">৳${Math.round(stats.avgOrderValue).toLocaleString()}</div></div>
          <div class="card"><div class="stat-label">মোট গ্রাহক</div><div class="stat-value">${stats.totalCustomers}</div></div>
        </div>
        <div class="grid grid-2" style="margin-top:16px;">
          <div class="card"><div class="stat-label">আজকের অর্ডার</div><div class="stat-value">${stats.todayOrders}</div><div class="stat-label">আজকের রেভিনিউ: ৳${stats.todayRevenue.toLocaleString()}</div></div>
          <div class="card"><div class="stat-label">এই মাসের রেভিনিউ</div><div class="stat-value">৳${stats.thisMonthRevenue.toLocaleString()}</div><div class="stat-label">গত মাস: ৳${stats.lastMonthRevenue.toLocaleString()} | বৃদ্ধি: ${revenueGrowth}%</div></div>
        </div>
        <h2>অর্ডার স্ট্যাটাস সামারি</h2>
        <table><thead><tr><th>স্ট্যাটাস</th><th>সংখ্যা</th><th>শতকরা</th></tr></thead><tbody>
          <tr><td>পেন্ডিং</td><td>${stats.pendingOrders}</td><td>${stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>প্রসেসিং</td><td>${stats.processingOrders}</td><td>${stats.totalOrders > 0 ? (stats.processingOrders / stats.totalOrders * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>শিপড</td><td>${stats.shippedOrders}</td><td>${stats.totalOrders > 0 ? (stats.shippedOrders / stats.totalOrders * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>ডেলিভার্ড</td><td>${stats.deliveredOrders}</td><td>${stats.totalOrders > 0 ? (stats.deliveredOrders / stats.totalOrders * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>বাতিল</td><td>${stats.cancelledOrders}</td><td>${stats.totalOrders > 0 ? (stats.cancelledOrders / stats.totalOrders * 100).toFixed(1) : 0}%</td></tr>
        </tbody></table>
        <h2>সাম্প্রতিক অর্ডার</h2>
        <table><thead><tr><th>#</th><th>অর্ডার</th><th>গ্রাহক</th><th>ফোন</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th></tr></thead><tbody>
          ${recentOrders.map((o, i) => `<tr><td>${i + 1}</td><td>${o.order_number}</td><td>${o.full_name}</td><td>${o.phone || '-'}</td><td>৳${Number(o.total).toLocaleString()}</td><td>${o.payment_method || '-'}</td><td>${o.status}</td></tr>`).join('')}
        </tbody></table>
        ${topProducts.length > 0 ? `<h2>টপ বিক্রিত প্রোডাক্ট</h2>
        <table><thead><tr><th>#</th><th>প্রোডাক্ট</th><th>বিক্রি</th><th>রেভিনিউ</th></tr></thead><tbody>
          ${topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.title}</td><td>${p.quantity}</td><td>৳${p.revenue.toLocaleString()}</td></tr>`).join('')}
        </tbody></table>` : ''}
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;">
          এই রিপোর্টটি স্বয়ংক্রিয়ভাবে তৈরি হয়েছে • ${format(new Date(), 'dd/MM/yyyy hh:mm a')}
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: 'পেন্ডিং', variant: 'secondary' },
      processing: { label: 'প্রসেসিং', variant: 'default' },
      shipped: { label: 'শিপড', variant: 'default' },
      delivered: { label: 'ডেলিভার্ড', variant: 'default' },
      cancelled: { label: 'বাতিল', variant: 'destructive' },
    };
    const c = config[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6" ref={printRef}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ড্যাশবোর্ড</h1>
            <p className="text-muted-foreground text-sm">
              সর্বশেষ আপডেট: {format(lastRefresh, 'hh:mm a')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintDashboard}>
              <Printer className="h-4 w-4 mr-1" /> প্রিন্ট
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchDashboardData(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ
            </Button>
            <Link to="/admin/reports">
              <Button size="sm"><BarChart3 className="h-4 w-4 mr-1" /> বিস্তারিত রিপোর্ট</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Revenue Highlight Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">মোট রেভিনিউ</p>
                      <p className="text-3xl font-bold text-primary">৳{stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">গড় অর্ডার: ৳{Math.round(stats.avgOrderValue).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/30 to-accent/10 border-accent/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">আজকের পারফরম্যান্স</p>
                      <p className="text-3xl font-bold">৳{stats.todayRevenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stats.todayOrders}টি অর্ডার আজ</p>
                    </div>
                    <div className="p-3 bg-accent/20 rounded-full">
                      <Clock className="h-8 w-8 text-accent-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">মাসিক বৃদ্ধি</p>
                      <p className="text-3xl font-bold">৳{stats.thisMonthRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {isPositiveGrowth ? (
                          <ArrowUpRight className="h-3 w-3 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs font-medium ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                          {revenueGrowth}% গত মাসের তুলনায়
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-full">
                      {isPositiveGrowth ? <ArrowUpRight className="h-8 w-8 text-green-600" /> : <ArrowDownRight className="h-8 w-8 text-red-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { title: 'মোট অর্ডার', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600 bg-blue-100' },
                { title: 'পেন্ডিং', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
                { title: 'প্রসেসিং', value: stats.processingOrders, icon: Truck, color: 'text-orange-600 bg-orange-100' },
                { title: 'ডেলিভার্ড', value: stats.deliveredOrders, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
                { title: 'বাতিল', value: stats.cancelledOrders, icon: XCircle, color: 'text-red-600 bg-red-100' },
                { title: 'গ্রাহক', value: stats.totalCustomers, icon: Users, color: 'text-purple-600 bg-purple-100' },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Alert Cards */}
            {(stats.lowStockProducts > 0 || stats.pendingOrders > 5) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.lowStockProducts > 0 && (
                  <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">{stats.lowStockProducts}টি প্রোডাক্ট স্টক কমে যাচ্ছে</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">স্টক ৫-এর কম আছে এমন প্রোডাক্ট</p>
                      </div>
                      <Link to="/admin/inventory">
                        <Button size="sm" variant="outline" className="border-yellow-400"><Eye className="h-3 w-3 mr-1" /> দেখুন</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
                {stats.pendingOrders > 5 && (
                  <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-800 dark:text-orange-200">{stats.pendingOrders}টি অর্ডার পেন্ডিং</p>
                        <p className="text-xs text-orange-700 dark:text-orange-300">দ্রুত প্রসেস করুন</p>
                      </div>
                      <Link to="/admin/orders">
                        <Button size="sm" variant="outline" className="border-orange-400"><Eye className="h-3 w-3 mr-1" /> দেখুন</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">রেভিনিউ ও অর্ডার ট্রেন্ড (১৪ দিন)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyRevenue}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" name="রেভিনিউ (৳)" fill="url(#revenueGrad)" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="অর্ডার" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">অর্ডার স্ট্যাটাস</CardTitle></CardHeader>
                <CardContent>
                  {orderStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                          {orderStatusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-muted-foreground text-center py-8">কোন ডেটা নেই</p>}
                </CardContent>
              </Card>
            </div>

            {/* Payment Method & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">পেমেন্ট মেথড বিশ্লেষণ</CardTitle></CardHeader>
                <CardContent>
                  {paymentMethodData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={paymentMethodData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="value" name="অর্ডার" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-muted-foreground text-center py-8">কোন ডেটা নেই</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">টপ বিক্রিত প্রোডাক্ট</CardTitle></CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">কোন ডেটা নেই</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.quantity}টি বিক্রি</p>
                            </div>
                          </div>
                          <p className="font-bold text-sm">৳{p.revenue.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tasks + Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendingTasksWidget />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">সাম্প্রতিক অর্ডার</CardTitle>
                  <Link to="/admin/orders"><Button variant="ghost" size="sm">সব দেখুন</Button></Link>
                </CardHeader>
                <CardContent>
                  {recentOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">কোন অর্ডার নেই</p>
                  ) : (
                    <div className="space-y-2">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium">#{order.order_number}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">{order.full_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">৳{Number(order.total).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {order.payment_method === 'cod' ? <Wallet className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                              {order.payment_method === 'cod' ? 'COD' : order.payment_method}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.totalProducts}</p><p className="text-xs text-muted-foreground">মোট প্রোডাক্ট</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.totalCategories}</p><p className="text-xs text-muted-foreground">ক্যাটাগরি</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.lowStockProducts}</p><p className="text-xs text-muted-foreground">লো স্টক</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{((stats.deliveredOrders / (stats.totalOrders || 1)) * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">ডেলিভারি রেট</p></CardContent></Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
