import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Funnel,
  FunnelChart,
  LabelList,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  ShoppingCart,
  CreditCard,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { bn } from "date-fns/locale";

interface FunnelStep {
  step: string;
  label: string;
  count: number;
  color: string;
  icon: React.ElementType;
}

interface DailyData {
  date: string;
  abandoned: number;
  recovered: number;
  orders: number;
}

const stepConfig: Record<string, { label: string; color: string; order: number; icon: React.ElementType }> = {
  cart: { label: "কার্টে যোগ", color: "hsl(var(--chart-1))", order: 1, icon: ShoppingCart },
  checkout_started: { label: "চেকআউট শুরু", color: "hsl(var(--chart-2))", order: 2, icon: Target },
  address_filled: { label: "ঠিকানা দেওয়া", color: "hsl(var(--chart-3))", order: 3, icon: MapPin },
  payment_selected: { label: "পেমেন্ট নির্বাচন", color: "hsl(var(--chart-4))", order: 4, icon: CreditCard },
  otp_pending: { label: "OTP যাচাই", color: "hsl(var(--chart-5))", order: 5, icon: CheckCircle },
};

const chartConfig = {
  cart: { label: "কার্টে যোগ", color: "hsl(var(--chart-1))" },
  checkout_started: { label: "চেকআউট শুরু", color: "hsl(var(--chart-2))" },
  address_filled: { label: "ঠিকানা দেওয়া", color: "hsl(var(--chart-3))" },
  payment_selected: { label: "পেমেন্ট নির্বাচন", color: "hsl(var(--chart-4))" },
  otp_pending: { label: "OTP যাচাই", color: "hsl(var(--chart-5))" },
  abandoned: { label: "অসম্পূর্ণ", color: "hsl(var(--destructive))" },
  recovered: { label: "রিকভার্ড", color: "hsl(var(--chart-2))" },
  orders: { label: "অর্ডার", color: "hsl(var(--primary))" },
};

const AdminCheckoutAnalytics = () => {
  // Fetch funnel data
  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ["checkout-funnel-analytics"],
    queryFn: async () => {
      // Get abandoned checkouts by step
      const { data: abandoned, error: abandonedError } = await supabase
        .from("abandoned_checkouts")
        .select("step, recovered");

      if (abandonedError) throw abandonedError;

      // Get completed orders count
      const { count: ordersCount, error: ordersError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      if (ordersError) throw ordersError;

      // Count by step
      const stepCounts: Record<string, { total: number; recovered: number }> = {};
      abandoned?.forEach((item) => {
        if (!stepCounts[item.step]) {
          stepCounts[item.step] = { total: 0, recovered: 0 };
        }
        stepCounts[item.step].total++;
        if (item.recovered) {
          stepCounts[item.step].recovered++;
        }
      });

      // Build funnel with cumulative counts (each step includes previous steps)
      const steps = Object.entries(stepConfig)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key, config]) => ({
          step: key,
          label: config.label,
          color: config.color,
          icon: config.icon,
          count: stepCounts[key]?.total || 0,
          recovered: stepCounts[key]?.recovered || 0,
        }));

      // Calculate cumulative - users who reached this step or further
      let cumulativeCount = (ordersCount || 0);
      const cumulativeSteps = [...steps].reverse().map((step) => {
        cumulativeCount += step.count;
        return { ...step, cumulativeCount };
      }).reverse();

      return {
        steps: cumulativeSteps,
        totalOrders: ordersCount || 0,
        totalAbandoned: abandoned?.filter((a) => !a.recovered).length || 0,
        totalRecovered: abandoned?.filter((a) => a.recovered).length || 0,
      };
    },
  });

  // Fetch daily trend data (last 7 days)
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["checkout-trend-analytics"],
    queryFn: async () => {
      const days = 7;
      const startDate = subDays(new Date(), days - 1);

      // Get abandoned checkouts
      const { data: abandoned, error: abandonedError } = await supabase
        .from("abandoned_checkouts")
        .select("created_at, recovered")
        .gte("created_at", startOfDay(startDate).toISOString());

      if (abandonedError) throw abandonedError;

      // Get orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", startOfDay(startDate).toISOString());

      if (ordersError) throw ordersError;

      // Build daily data
      const dailyData: DailyData[] = [];
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const displayDate = format(date, "dd MMM", { locale: bn });

        const dayAbandoned = abandoned?.filter((a) => {
          const d = format(new Date(a.created_at), "yyyy-MM-dd");
          return d === dateStr && !a.recovered;
        }).length || 0;

        const dayRecovered = abandoned?.filter((a) => {
          const d = format(new Date(a.created_at), "yyyy-MM-dd");
          return d === dateStr && a.recovered;
        }).length || 0;

        const dayOrders = orders?.filter((o) => {
          const d = format(new Date(o.created_at), "yyyy-MM-dd");
          return d === dateStr;
        }).length || 0;

        dailyData.push({
          date: displayDate,
          abandoned: dayAbandoned,
          recovered: dayRecovered,
          orders: dayOrders,
        });
      }

      return dailyData;
    },
  });

  // Fetch drop-off analysis
  const { data: dropOffData, isLoading: dropOffLoading } = useQuery({
    queryKey: ["checkout-dropoff-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_checkouts")
        .select("step")
        .eq("recovered", false);

      if (error) throw error;

      const stepCounts: Record<string, number> = {};
      data?.forEach((item) => {
        stepCounts[item.step] = (stepCounts[item.step] || 0) + 1;
      });

      const total = data?.length || 1;
      return Object.entries(stepCounts)
        .map(([step, count]) => ({
          step,
          label: stepConfig[step]?.label || step,
          count,
          percentage: Math.round((count / total) * 100),
          color: stepConfig[step]?.color || "hsl(var(--muted))",
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Calculate conversion rates
  const conversionRate = funnelData
    ? Math.round(
        (funnelData.totalOrders /
          (funnelData.totalOrders + funnelData.totalAbandoned || 1)) *
          100
      )
    : 0;

  const recoveryRate = funnelData
    ? Math.round(
        (funnelData.totalRecovered /
          (funnelData.totalAbandoned + funnelData.totalRecovered || 1)) *
          100
      )
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            চেকআউট ফানেল অ্যানালিটিক্স
          </h1>
          <p className="text-muted-foreground mt-1">
            চেকআউট প্রক্রিয়ার কনভার্সন রেট এবং ড্রপ-অফ পয়েন্ট বিশ্লেষণ
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">কনভার্সন রেট</p>
                  <p className="text-3xl font-bold text-primary">{conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">রিকভারি রেট</p>
                  <p className="text-3xl font-bold text-chart-2">{recoveryRate}%</p>
                </div>
                <Target className="h-8 w-8 text-chart-2 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">সম্পূর্ণ অর্ডার</p>
                  <p className="text-3xl font-bold">{funnelData?.totalOrders || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">অসম্পূর্ণ</p>
                  <p className="text-3xl font-bold text-destructive">
                    {funnelData?.totalAbandoned || 0}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle>চেকআউট ফানেল</CardTitle>
              <CardDescription>
                প্রতিটি ধাপে কতজন কাস্টমার আছেন
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart
                    data={funnelData?.steps || []}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    />
                    <Bar dataKey="cumulativeCount" radius={[0, 4, 4, 0]}>
                      {funnelData?.steps?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Drop-off Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>ড্রপ-অফ পয়েন্ট</CardTitle>
              <CardDescription>
                কোন ধাপে সবচেয়ে বেশি কাস্টমার হারাচ্ছেন
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dropOffLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : dropOffData && dropOffData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={dropOffData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ label, percentage }) => `${label}: ${percentage}%`}
                      labelLine={false}
                    >
                      {dropOffData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} জন`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  কোন ড্রপ-অফ ডেটা নেই
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>৭ দিনের ট্রেন্ড</CardTitle>
            <CardDescription>
              দৈনিক অর্ডার, অসম্পূর্ণ এবং রিকভার্ড চেকআউটের তুলনা
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="অর্ডার"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="abandoned"
                    name="অসম্পূর্ণ"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="recovered"
                    name="রিকভার্ড"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Drop-off Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>ড্রপ-অফ বিশ্লেষণ</CardTitle>
            <CardDescription>
              প্রতিটি ধাপে কতজন কাস্টমার চেকআউট ছেড়ে দিয়েছেন
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dropOffLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : dropOffData && dropOffData.length > 0 ? (
              <div className="space-y-4">
                {dropOffData.map((item) => {
                  const Icon = stepConfig[item.step]?.icon || ShoppingCart;
                  return (
                    <div key={item.step} className="flex items-center gap-4">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: item.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.count} জন ({item.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                কোন ড্রপ-অফ ডেটা নেই
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCheckoutAnalytics;
