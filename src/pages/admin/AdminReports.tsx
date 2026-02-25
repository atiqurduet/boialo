import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Download, TrendingUp, ShoppingCart, Package, DollarSign, Users,
  Printer, FileText, BarChart3, PieChart as PieChartIcon, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format, subDays } from 'date-fns';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AdminReports = () => {
  const [period, setPeriod] = useState('30days');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [deliveryAreaData, setDeliveryAreaData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalProducts: 0,
    totalCustomers: 0, deliveredOrders: 0, cancelledOrders: 0, returnRate: 0
  });

  useEffect(() => { fetchReportData(); }, [period]);

  const getDays = () => ({ '7days': 7, '30days': 30, '90days': 90, '365days': 365 }[period] || 30);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const days = getDays();
      const startDate = subDays(new Date(), days).toISOString();

      const [
        { data: orders },
        { count: productsCount },
        { count: customersCount },
        { data: orderItems },
      ] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', startDate).order('created_at', { ascending: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('order_items').select('product_title, quantity, price'),
      ]);

      const validOrders = orders?.filter(o => o.status !== 'cancelled') || [];
      const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const delivered = orders?.filter(o => o.status === 'delivered').length || 0;
      const cancelled = orders?.filter(o => o.status === 'cancelled').length || 0;

      setStats({
        totalRevenue, totalOrders: orders?.length || 0,
        avgOrderValue: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
        totalProducts: productsCount || 0, totalCustomers: customersCount || 0,
        deliveredOrders: delivered, cancelledOrders: cancelled,
        returnRate: orders?.length ? (cancelled / orders.length * 100) : 0
      });

      // Daily sales
      const salesByDate: Record<string, any> = {};
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (!salesByDate[date]) salesByDate[date] = { date, total: 0, orders: 0, label: format(new Date(order.created_at), 'dd MMM') };
        if (order.status !== 'cancelled') salesByDate[date].total += Number(order.total);
        salesByDate[date].orders += 1;
      });
      setSalesData(Object.values(salesByDate));

      // Order status
      const statusMap: Record<string, number> = {};
      orders?.forEach(o => {
        const label = { pending: 'পেন্ডিং', processing: 'প্রসেসিং', shipped: 'শিপড', delivered: 'ডেলিভার্ড', cancelled: 'বাতিল' }[o.status] || o.status;
        statusMap[label] = (statusMap[label] || 0) + 1;
      });
      setOrderStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // Payment breakdown
      const payMap: Record<string, number> = {};
      orders?.forEach(o => {
        const m = o.payment_method === 'cod' ? 'ক্যাশ অন ডেলিভারি' : o.payment_method === 'bkash' ? 'বিকাশ' : o.payment_method || 'অন্যান্য';
        payMap[m] = (payMap[m] || 0) + 1;
      });
      setPaymentData(Object.entries(payMap).map(([name, value]) => ({ name, value })));

      // Delivery area
      const areaMap: Record<string, { orders: number; revenue: number }> = {};
      orders?.forEach(o => {
        const area = o.delivery_area || 'অজানা';
        if (!areaMap[area]) areaMap[area] = { orders: 0, revenue: 0 };
        areaMap[area].orders += 1;
        if (o.status !== 'cancelled') areaMap[area].revenue += Number(o.total);
      });
      setDeliveryAreaData(Object.entries(areaMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 10));

      // Top products
      const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const key = item.product_title;
        if (!productSales[key]) productSales[key] = { title: item.product_title, quantity: 0, revenue: 0 };
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.price * item.quantity;
      });
      setTopProducts(Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 15));

      // Customer signup trend
      // We approximate using order unique users per period grouping
      const custByDate: Record<string, number> = {};
      const seenUsers = new Set<string>();
      orders?.forEach(o => {
        if (o.user_id && !seenUsers.has(o.user_id)) {
          seenUsers.add(o.user_id);
          const d = format(new Date(o.created_at), days <= 30 ? 'dd MMM' : 'MMM yyyy');
          custByDate[d] = (custByDate[d] || 0) + 1;
        }
      });
      setCustomerData(Object.entries(custByDate).map(([date, count]) => ({ date, count })));

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const rows = data.map(d => headers.map(h => d[h] ?? ''));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = (reportType: string) => {
    const pw = window.open('', '_blank');
    if (!pw) return;

    const periodLabel = { '7days': 'গত ৭ দিন', '30days': 'গত ৩০ দিন', '90days': 'গত ৯০ দিন', '365days': 'গত ১ বছর' }[period] || period;

    let tableContent = '';
    let title = '';
    let summaryHtml = '';

    switch (reportType) {
      case 'sales':
        title = 'বিক্রি রিপোর্ট';
        summaryHtml = `
          <div class="grid"><div class="card"><span class="label">মোট রেভিনিউ</span><span class="val">৳${stats.totalRevenue.toLocaleString()}</span></div>
          <div class="card"><span class="label">মোট অর্ডার</span><span class="val">${stats.totalOrders}</span></div>
          <div class="card"><span class="label">গড় অর্ডার</span><span class="val">৳${Math.round(stats.avgOrderValue).toLocaleString()}</span></div>
          <div class="card"><span class="label">ডেলিভার্ড</span><span class="val">${stats.deliveredOrders}</span></div></div>`;
        tableContent = `<table><thead><tr><th>তারিখ</th><th>অর্ডার</th><th>বিক্রি (৳)</th></tr></thead><tbody>
          ${salesData.map(d => `<tr><td>${d.label || d.date}</td><td>${d.orders}</td><td>৳${d.total.toLocaleString()}</td></tr>`).join('')}
          <tr style="font-weight:bold;border-top:2px solid #333;"><td>মোট</td><td>${salesData.reduce((s, d) => s + d.orders, 0)}</td><td>৳${salesData.reduce((s, d) => s + d.total, 0).toLocaleString()}</td></tr>
          </tbody></table>`;
        break;
      case 'products':
        title = 'প্রোডাক্ট বিক্রি রিপোর্ট';
        tableContent = `<table><thead><tr><th>#</th><th>প্রোডাক্ট</th><th>বিক্রি সংখ্যা</th><th>রেভিনিউ (৳)</th></tr></thead><tbody>
          ${topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.title}</td><td>${p.quantity}</td><td>৳${p.revenue.toLocaleString()}</td></tr>`).join('')}
          </tbody></table>`;
        break;
      case 'orders':
        title = 'অর্ডার স্ট্যাটাস রিপোর্ট';
        summaryHtml = `<div class="grid"><div class="card"><span class="label">মোট অর্ডার</span><span class="val">${stats.totalOrders}</span></div>
          <div class="card"><span class="label">সফল ডেলিভারি</span><span class="val">${stats.deliveredOrders}</span></div>
          <div class="card"><span class="label">বাতিল</span><span class="val">${stats.cancelledOrders}</span></div>
          <div class="card"><span class="label">বাতিল হার</span><span class="val">${stats.returnRate.toFixed(1)}%</span></div></div>`;
        tableContent = `<table><thead><tr><th>স্ট্যাটাস</th><th>সংখ্যা</th><th>শতকরা</th></tr></thead><tbody>
          ${orderStatusData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td><td>${(d.value / (stats.totalOrders || 1) * 100).toFixed(1)}%</td></tr>`).join('')}
          </tbody></table>`;
        break;
      case 'payment':
        title = 'পেমেন্ট মেথড রিপোর্ট';
        tableContent = `<table><thead><tr><th>পেমেন্ট মেথড</th><th>অর্ডার সংখ্যা</th><th>শতকরা</th></tr></thead><tbody>
          ${paymentData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td><td>${(d.value / (stats.totalOrders || 1) * 100).toFixed(1)}%</td></tr>`).join('')}
          </tbody></table>`;
        break;
      case 'area':
        title = 'ডেলিভারি এরিয়া রিপোর্ট';
        tableContent = `<table><thead><tr><th>এরিয়া</th><th>অর্ডার</th><th>রেভিনিউ (৳)</th></tr></thead><tbody>
          ${deliveryAreaData.map(d => `<tr><td>${d.name}</td><td>${d.orders}</td><td>৳${d.revenue.toLocaleString()}</td></tr>`).join('')}
          </tbody></table>`;
        break;
      case 'full':
        title = 'সম্পূর্ণ রিপোর্ট';
        summaryHtml = `
          <div class="grid"><div class="card"><span class="label">মোট রেভিনিউ</span><span class="val">৳${stats.totalRevenue.toLocaleString()}</span></div>
          <div class="card"><span class="label">মোট অর্ডার</span><span class="val">${stats.totalOrders}</span></div>
          <div class="card"><span class="label">গড় অর্ডার</span><span class="val">৳${Math.round(stats.avgOrderValue).toLocaleString()}</span></div>
          <div class="card"><span class="label">গ্রাহক</span><span class="val">${stats.totalCustomers}</span></div></div>`;
        tableContent = `
          <h2>📈 দৈনিক বিক্রি</h2>
          <table><thead><tr><th>তারিখ</th><th>অর্ডার</th><th>বিক্রি</th></tr></thead><tbody>
          ${salesData.map(d => `<tr><td>${d.label || d.date}</td><td>${d.orders}</td><td>৳${d.total.toLocaleString()}</td></tr>`).join('')}
          </tbody></table>
          <h2>📦 অর্ডার স্ট্যাটাস</h2>
          <table><thead><tr><th>স্ট্যাটাস</th><th>সংখ্যা</th></tr></thead><tbody>
          ${orderStatusData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td></tr>`).join('')}
          </tbody></table>
          <h2>💳 পেমেন্ট মেথড</h2>
          <table><thead><tr><th>মেথড</th><th>সংখ্যা</th></tr></thead><tbody>
          ${paymentData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td></tr>`).join('')}
          </tbody></table>
          <h2>🏆 টপ প্রোডাক্ট</h2>
          <table><thead><tr><th>#</th><th>প্রোডাক্ট</th><th>বিক্রি</th><th>রেভিনিউ</th></tr></thead><tbody>
          ${topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${p.title}</td><td>${p.quantity}</td><td>৳${p.revenue.toLocaleString()}</td></tr>`).join('')}
          </tbody></table>
          <h2>🗺️ ডেলিভারি এরিয়া</h2>
          <table><thead><tr><th>এরিয়া</th><th>অর্ডার</th><th>রেভিনিউ</th></tr></thead><tbody>
          ${deliveryAreaData.map(d => `<tr><td>${d.name}</td><td>${d.orders}</td><td>৳${d.revenue.toLocaleString()}</td></tr>`).join('')}
          </tbody></table>`;
        break;
    }

    pw.document.write(`<html><head><title>${title} - ${periodLabel}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:24px;color:#333;max-width:900px;margin:0 auto;}
        .header{border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}
        h1{font-size:20px;margin:0;} h2{font-size:16px;margin:20px 0 8px;padding-top:12px;border-top:1px solid #eee;}
        table{width:100%;border-collapse:collapse;margin:8px 0 16px;}
        th,td{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;}
        th{font-weight:600;background:#f9fafb;}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        .card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;}
        .label{display:block;font-size:11px;color:#6b7280;} .val{display:block;font-size:22px;font-weight:bold;margin-top:4px;}
        .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head><body>
      <div class="header"><div><h1>📊 ${title}</h1><p style="margin:4px 0 0;color:#6b7280;font-size:13px;">সময়কাল: ${periodLabel} | তারিখ: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</p></div></div>
      ${summaryHtml}${tableContent}
      <div class="footer">এই রিপোর্টটি স্বয়ংক্রিয়ভাবে তৈরি হয়েছে • ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
    </body></html>`);
    pw.document.close();
    pw.print();
  };

  const statCards = [
    { title: 'মোট রেভিনিউ', value: `৳${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { title: 'মোট অর্ডার', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600 bg-blue-100' },
    { title: 'গড় অর্ডার মূল্য', value: `৳${Math.round(stats.avgOrderValue).toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { title: 'মোট গ্রাহক', value: stats.totalCustomers, icon: Users, color: 'text-indigo-600 bg-indigo-100' },
    { title: 'ডেলিভার্ড', value: stats.deliveredOrders, icon: Package, color: 'text-emerald-600 bg-emerald-100' },
    { title: 'বাতিল হার', value: `${stats.returnRate.toFixed(1)}%`, icon: FileText, color: 'text-red-600 bg-red-100' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">রিপোর্ট ও বিশ্লেষণ</h1>
            <p className="text-muted-foreground">বিক্রি, প্রোডাক্ট ও গ্রাহক বিশ্লেষণ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">গত ৭ দিন</SelectItem>
                <SelectItem value="30days">গত ৩০ দিন</SelectItem>
                <SelectItem value="90days">গত ৯০ দিন</SelectItem>
                <SelectItem value="365days">গত ১ বছর</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => printReport('full')}>
              <Printer className="h-4 w-4 mr-1" /> সম্পূর্ণ প্রিন্ট
            </Button>
            <Button variant="outline" onClick={() => exportToCSV(salesData, 'sales-report', ['date', 'orders', 'total'])}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
                    <div><p className="text-xs text-muted-foreground">{stat.title}</p><p className="text-lg font-bold">{stat.value}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs for different reports */}
            <Tabs defaultValue="sales" className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="sales" className="gap-1"><BarChart3 className="h-3 w-3" /> বিক্রি</TabsTrigger>
                <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="h-3 w-3" /> অর্ডার</TabsTrigger>
                <TabsTrigger value="products" className="gap-1"><Package className="h-3 w-3" /> প্রোডাক্ট</TabsTrigger>
                <TabsTrigger value="payment" className="gap-1"><DollarSign className="h-3 w-3" /> পেমেন্ট</TabsTrigger>
                <TabsTrigger value="area" className="gap-1"><PieChartIcon className="h-3 w-3" /> এরিয়া</TabsTrigger>
              </TabsList>

              {/* Sales Tab */}
              <TabsContent value="sales" className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => printReport('sales')}><Printer className="h-3 w-3 mr-1" /> প্রিন্ট</Button>
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-base">রেভিনিউ ট্রেন্ড</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        <Legend />
                        <Area type="monotone" dataKey="total" name="রেভিনিউ (৳)" fill="url(#revGrad)" stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="orders" name="অর্ডার" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">দৈনিক বিক্রি টেবিল</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b"><th className="text-left py-2 px-4 font-medium text-sm">তারিখ</th><th className="text-right py-2 px-4 font-medium text-sm">অর্ডার</th><th className="text-right py-2 px-4 font-medium text-sm">বিক্রি</th></tr>
                        </thead>
                        <tbody>
                          {salesData.map(d => (
                            <tr key={d.date} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-4 text-sm">{d.label || d.date}</td>
                              <td className="py-2 px-4 text-right text-sm">{d.orders}</td>
                              <td className="py-2 px-4 text-right font-medium text-sm">৳{d.total.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="font-bold border-t-2"><td className="py-2 px-4">মোট</td><td className="py-2 px-4 text-right">{salesData.reduce((s, d) => s + d.orders, 0)}</td><td className="py-2 px-4 text-right">৳{salesData.reduce((s, d) => s + d.total, 0).toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => printReport('orders')}><Printer className="h-3 w-3 mr-1" /> প্রিন্ট</Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">অর্ডার স্ট্যাটাস ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} style={{ fontSize: 11 }}>
                            {orderStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">স্ট্যাটাস সামারি</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {orderStatusData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-sm">{d.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{d.value}</span>
                              <span className="text-xs text-muted-foreground w-12 text-right">{(d.value / (stats.totalOrders || 1) * 100).toFixed(1)}%</span>
                              <div className="w-24 bg-muted rounded-full h-2">
                                <div className="h-2 rounded-full" style={{ width: `${(d.value / (stats.totalOrders || 1)) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(topProducts, 'products-report', ['title', 'quantity', 'revenue'])}><Download className="h-3 w-3 mr-1" /> CSV</Button>
                  <Button variant="outline" size="sm" onClick={() => printReport('products')}><Printer className="h-3 w-3 mr-1" /> প্রিন্ট</Button>
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-base">টপ বিক্রিত প্রোডাক্ট</CardTitle></CardHeader>
                  <CardContent>
                    {topProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">কোন ডেটা নেই</p>
                    ) : (
                      <div className="space-y-3">
                        {topProducts.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground">{p.quantity}টি বিক্রি</p>
                              </div>
                            </div>
                            <p className="font-bold text-sm shrink-0">৳{p.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment" className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => printReport('payment')}><Printer className="h-3 w-3 mr-1" /> প্রিন্ট</Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">পেমেন্ট মেথড চার্ট</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={paymentData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} style={{ fontSize: 11 }}>
                            {paymentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">পেমেন্ট সামারি</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {paymentData.map((d, i) => (
                          <div key={d.name} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{d.name}</span>
                              <span className="font-bold">{d.value} অর্ডার</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full" style={{ width: `${(d.value / (stats.totalOrders || 1)) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{(d.value / (stats.totalOrders || 1) * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Area Tab */}
              <TabsContent value="area" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(deliveryAreaData, 'area-report', ['name', 'orders', 'revenue'])}><Download className="h-3 w-3 mr-1" /> CSV</Button>
                  <Button variant="outline" size="sm" onClick={() => printReport('area')}><Printer className="h-3 w-3 mr-1" /> প্রিন্ট</Button>
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-base">ডেলিভারি এরিয়া অনুযায়ী বিক্রি</CardTitle></CardHeader>
                  <CardContent>
                    {deliveryAreaData.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">কোন ডেটা নেই</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={deliveryAreaData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                            <Legend />
                            <Bar dataKey="revenue" name="রেভিনিউ (৳)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="orders" name="অর্ডার" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b"><th className="text-left py-2 px-3 font-medium text-sm">এরিয়া</th><th className="text-right py-2 px-3 font-medium text-sm">অর্ডার</th><th className="text-right py-2 px-3 font-medium text-sm">রেভিনিউ</th></tr></thead>
                            <tbody>
                              {deliveryAreaData.map(d => (
                                <tr key={d.name} className="border-b hover:bg-muted/50"><td className="py-2 px-3 text-sm">{d.name}</td><td className="py-2 px-3 text-right text-sm">{d.orders}</td><td className="py-2 px-3 text-right font-medium text-sm">৳{d.revenue.toLocaleString()}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
