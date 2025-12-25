import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Download, TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';

interface SalesData {
  date: string;
  total: number;
  orders: number;
}

const AdminReports = () => {
  const [period, setPeriod] = useState('7days');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const daysMap: Record<string, number> = {
        '7days': 7,
        '30days': 30,
        '90days': 90
      };
      const days = daysMap[period] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalProducts: productsCount || 0
      });

      // Group by date for chart
      const salesByDate: Record<string, SalesData> = {};
      orders?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-CA');
        if (!salesByDate[date]) {
          salesByDate[date] = { date, total: 0, orders: 0 };
        }
        salesByDate[date].total += Number(order.total);
        salesByDate[date].orders += 1;
      });
      setSalesData(Object.values(salesByDate));

      // Fetch top products from order_items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_title, quantity, price');

      const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { title: item.product_title, quantity: 0, revenue: 0 };
        }
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += item.price * item.quantity;
      });

      const topProductsList = Object.entries(productSales)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopProducts(topProductsList);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['তারিখ', 'অর্ডার সংখ্যা', 'মোট বিক্রি'];
    const rows = salesData.map(d => [d.date, d.orders, d.total]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${period}.csv`;
    link.click();
  };

  const statCards = [
    { title: 'মোট রেভিনিউ', value: `৳${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'মোট অর্ডার', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-blue-500' },
    { title: 'গড় অর্ডার মূল্য', value: `৳${Math.round(stats.avgOrderValue).toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500' },
    { title: 'মোট প্রোডাক্ট', value: stats.totalProducts, icon: Package, color: 'bg-orange-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">রিপোর্ট</h1>
            <p className="text-muted-foreground">বিক্রি ও পারফরম্যান্স রিপোর্ট</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">গত ৭ দিন</SelectItem>
                <SelectItem value="30days">গত ৩০ দিন</SelectItem>
                <SelectItem value="90days">গত ৯০ দিন</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              এক্সপোর্ট
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
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

            {/* Sales Chart (Simple Table View) */}
            <Card>
              <CardHeader>
                <CardTitle>দৈনিক বিক্রি</CardTitle>
              </CardHeader>
              <CardContent>
                {salesData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">এই সময়ে কোন বিক্রি নেই</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium">তারিখ</th>
                          <th className="text-right py-2 px-4 font-medium">অর্ডার</th>
                          <th className="text-right py-2 px-4 font-medium">বিক্রি</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.map((day) => (
                          <tr key={day.date} className="border-b">
                            <td className="py-2 px-4">{day.date}</td>
                            <td className="py-2 px-4 text-right">{day.orders}</td>
                            <td className="py-2 px-4 text-right font-medium">৳{day.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>টপ বিক্রিত প্রোডাক্ট</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">কোন ডেটা নেই</p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-muted-foreground">{product.quantity} বিক্রি</p>
                          </div>
                        </div>
                        <p className="font-bold">৳{product.revenue.toLocaleString()}</p>
                      </div>
                    ))}
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

export default AdminReports;
