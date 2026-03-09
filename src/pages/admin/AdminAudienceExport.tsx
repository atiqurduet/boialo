import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Download, Users, Target, TrendingUp, Facebook, BarChart3, Loader2, Filter,
  CheckCircle2, AlertCircle, Zap, PieChart, ArrowUpRight, ArrowDownRight,
  Globe, Eye, ShoppingCart, UserCheck, Clock, Activity, Layers, RefreshCw,
  Shield, Star, Hash, Calendar, ChevronRight, Sparkles, FileText
} from 'lucide-react';
import { AreaChart, Area, PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// ── Types ────────────────────────────────────────────────
type AudienceType = 'purchasers' | 'cart_abandoners' | 'high_value' | 'engaged' | 'at_risk' | 'all_visitors' | 'repeat_buyers' | 'new_customers' | 'inactive' | 'wishlist_users';

interface AudienceConfig {
  value: AudienceType;
  label: string;
  desc: string;
  icon: any;
  color: string;
}

const audienceTypes: AudienceConfig[] = [
  { value: 'purchasers', label: 'ক্রেতা (Purchasers)', desc: 'সফল অর্ডার সম্পন্নকারী', icon: ShoppingCart, color: 'text-emerald-600' },
  { value: 'repeat_buyers', label: 'রিপিট বায়ার', desc: '২+ বার কেনাকাটা করেছেন', icon: RefreshCw, color: 'text-blue-600' },
  { value: 'high_value', label: 'হাই ভ্যালু (VIP)', desc: '৫০০০+ টাকার অর্ডার', icon: Star, color: 'text-amber-600' },
  { value: 'cart_abandoners', label: 'কার্ট পরিত্যাগ', desc: 'কার্টে পণ্য রেখে চলে গেছেন', icon: ShoppingCart, color: 'text-red-600' },
  { value: 'new_customers', label: 'নতুন কাস্টমার', desc: 'প্রথমবার ক্রেতা', icon: UserCheck, color: 'text-cyan-600' },
  { value: 'engaged', label: 'এনগেজড ভিজিটর', desc: 'উচ্চ এনগেজমেন্ট স্কোর', icon: Activity, color: 'text-purple-600' },
  { value: 'at_risk', label: 'অ্যাট রিস্ক (Churn)', desc: 'চার্ন হওয়ার সম্ভাবনা', icon: AlertCircle, color: 'text-orange-600' },
  { value: 'inactive', label: 'ইনঅ্যাক্টিভ', desc: '৬০+ দিন কোনো অ্যাক্টিভিটি নেই', icon: Clock, color: 'text-gray-500' },
  { value: 'wishlist_users', label: 'উইশলিস্ট ইউজার', desc: 'উইশলিস্টে পণ্য আছে', icon: Target, color: 'text-pink-600' },
  { value: 'all_visitors', label: 'সকল ভিজিটর', desc: 'সব ট্র্যাকড ভিজিটর', icon: Globe, color: 'text-foreground' },
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

const AdminAudienceExport = () => {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('purchasers');
  const [days, setDays] = useState('30');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('audiences');
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);
  const [excludeExisting, setExcludeExisting] = useState(false);

  const since = useMemo(() => new Date(Date.now() - parseInt(days) * 86400000).toISOString(), [days]);

  // ── Fetch audience data ────────────────────────────────
  const { data: audienceData, isLoading } = useQuery({
    queryKey: ['audience-data', selectedAudience, days, minOrderAmount],
    queryFn: async () => {
      switch (selectedAudience) {
        case 'purchasers': {
          const q = supabase.from('orders').select('user_id, total_amount, created_at, customer_email, customer_phone, customer_name')
            .gte('created_at', since).in('status', ['delivered', 'confirmed', 'shipped']);
          if (minOrderAmount > 0) q.gte('total_amount', minOrderAmount);
          const { data } = await q;
          return data || [];
        }
        case 'repeat_buyers': {
          const { data } = await supabase.from('orders').select('user_id, total_amount, customer_email, customer_phone, customer_name, created_at')
            .gte('created_at', since).in('status', ['delivered', 'confirmed', 'shipped']);
          const grouped = (data || []).reduce((acc: any, o: any) => {
            const key = o.user_id || o.customer_email || o.customer_phone;
            if (!acc[key]) acc[key] = { ...o, order_count: 0, total_spent: 0 };
            acc[key].order_count++;
            acc[key].total_spent += o.total_amount || 0;
            return acc;
          }, {});
          return Object.values(grouped).filter((g: any) => g.order_count >= 2);
        }
        case 'high_value': {
          const { data } = await supabase.from('orders').select('user_id, total_amount, customer_email, customer_phone, customer_name, created_at')
            .gte('created_at', since).gte('total_amount', 5000).in('status', ['delivered', 'confirmed', 'shipped']);
          return data || [];
        }
        case 'cart_abandoners': {
          const { data } = await supabase.from('abandoned_checkouts').select('user_id, email, phone, full_name, subtotal, created_at, step')
            .gte('created_at', since).eq('recovered', false);
          return data || [];
        }
        case 'new_customers': {
          const { data } = await supabase.from('orders').select('user_id, customer_email, customer_phone, customer_name, total_amount, created_at')
            .gte('created_at', since).in('status', ['delivered', 'confirmed']).limit(500);
          // Deduplicate - keep only first-time buyers
          const seen = new Set<string>();
          return (data || []).filter((o: any) => {
            const key = o.user_id || o.customer_email;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        case 'engaged': {
          const { data } = await supabase.from('engagement_scores' as any).select('*')
            .gte('created_at', since).gte('engagement_score', 60).order('engagement_score', { ascending: false }).limit(500);
          return data || [];
        }
        case 'at_risk': {
          const { data } = await supabase.from('predictive_scores' as any).select('*')
            .gte('created_at', since).gte('churn_risk', 0.6).order('churn_risk', { ascending: false }).limit(500);
          return data || [];
        }
        case 'inactive': {
          const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
          const { data } = await supabase.from('profiles').select('id, full_name, email, phone, last_login')
            .lt('last_login', sixtyDaysAgo).limit(500);
          return data || [];
        }
        case 'wishlist_users': {
          const { data } = await supabase.from('wishlist_items').select('user_id, created_at').gte('created_at', since);
          const uniqueUsers = [...new Set((data || []).map((w: any) => w.user_id))];
          if (uniqueUsers.length === 0) return [];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, phone').in('id', uniqueUsers.slice(0, 100));
          return profiles || [];
        }
        case 'all_visitors': {
          const { data } = await supabase.from('visitor_analytics').select('session_id, user_id, device_type, browser, os, created_at')
            .gte('created_at', since).limit(1000);
          return data || [];
        }
        default: return [];
      }
    },
  });

  // ── Platform connection status ─────────────────────────
  const { data: platformStatus } = useQuery({
    queryKey: ['ad-platform-status'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('setting_key, setting_value')
        .in('setting_key', ['fb_pixel_id', 'fb_capi_token', 'tiktok_pixel_id', 'tiktok_access_token', 'ga_measurement_id', 'ga_api_secret']);
      const get = (key: string) => {
        let val = data?.find((s: any) => s.setting_key === key)?.setting_value;
        try { if (typeof val === 'string') val = JSON.parse(val); } catch {}
        return typeof val === 'string' && val.length > 3;
      };
      return {
        facebook: { pixel: get('fb_pixel_id'), capi: get('fb_capi_token') },
        tiktok: { pixel: get('tiktok_pixel_id'), token: get('tiktok_access_token') },
        google: { measurement: get('ga_measurement_id'), secret: get('ga_api_secret') },
      };
    },
    staleTime: 60_000,
  });

  // ── Overview stats ─────────────────────────────────────
  const { data: overviewStats } = useQuery({
    queryKey: ['audience-overview', days],
    queryFn: async () => {
      const [orders, abandoned, visitors] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status', { count: 'exact' }).gte('created_at', since),
        supabase.from('abandoned_checkouts').select('id', { count: 'exact' }).gte('created_at', since).eq('recovered', false),
        supabase.from('visitor_analytics').select('session_id', { count: 'exact' }).gte('created_at', since),
      ]);
      const totalOrders = orders.count || 0;
      const totalRevenue = (orders.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      return {
        totalCustomers: totalOrders,
        totalRevenue,
        abandonedCarts: abandoned.count || 0,
        totalVisitors: visitors.count || 0,
        conversionRate: visitors.count ? ((totalOrders / (visitors.count || 1)) * 100).toFixed(1) : '0',
      };
    },
    staleTime: 60_000,
  });

  // ── Audience distribution for pie chart ────────────────
  const { data: distributionData } = useQuery({
    queryKey: ['audience-distribution', days],
    queryFn: async () => {
      const [purchasers, abandoned, highValue, wishlists] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact' }).gte('created_at', since).in('status', ['delivered', 'confirmed']),
        supabase.from('abandoned_checkouts').select('id', { count: 'exact' }).gte('created_at', since).eq('recovered', false),
        supabase.from('orders').select('id', { count: 'exact' }).gte('created_at', since).gte('total_amount', 5000),
        supabase.from('wishlists').select('id', { count: 'exact' }).gte('created_at', since),
      ]);
      return [
        { name: 'ক্রেতা', value: purchasers.count || 0 },
        { name: 'কার্ট পরিত্যাগ', value: abandoned.count || 0 },
        { name: 'হাই ভ্যালু', value: highValue.count || 0 },
        { name: 'উইশলিস্ট', value: wishlists.count || 0 },
      ].filter(d => d.value > 0);
    },
    staleTime: 60_000,
  });

  // ── Export history ─────────────────────────────────────
  const [exportHistory, setExportHistory] = useState<{ time: string; audience: string; format: string; count: number }[]>([]);

  // ── Export function ────────────────────────────────────
  const exportCSV = (format: 'facebook' | 'tiktok' | 'google' | 'raw') => {
    if (!audienceData || audienceData.length === 0) {
      toast.error('কোন ডেটা পাওয়া যায়নি');
      return;
    }
    setExporting(true);

    try {
      let csvContent = '';
      const rows = audienceData as any[];

      if (format === 'facebook') {
        csvContent = 'email,phone,fn,ln,country\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = includeEmail ? (r.customer_email || r.email || '') : '';
          const phone = includePhone ? (r.customer_phone || r.phone || '') : '';
          const name = r.customer_name || r.full_name || '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `${email},${phone},${name.split(' ')[0] || ''},${name.split(' ').slice(1).join(' ') || ''},BD\n`;
          }
        });
      } else if (format === 'tiktok') {
        csvContent = 'IDFA_SHA256,GAID_SHA256,EMAIL_SHA256,PHONE_SHA256\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = includeEmail ? (r.customer_email || r.email || '') : '';
          const phone = includePhone ? (r.customer_phone || r.phone || '') : '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `,,${email},${phone}\n`;
          }
        });
      } else if (format === 'google') {
        csvContent = 'Email,Phone,First Name,Last Name,Country,Zip\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = includeEmail ? (r.customer_email || r.email || '') : '';
          const phone = includePhone ? (r.customer_phone || r.phone || '') : '';
          const name = r.customer_name || r.full_name || '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `${email},${phone},${name.split(' ')[0] || ''},${name.split(' ').slice(1).join(' ') || ''},BD,\n`;
          }
        });
      } else {
        const headers = Object.keys(rows[0] || {});
        csvContent = headers.join(',') + '\n';
        rows.forEach(r => {
          csvContent += headers.map(h => JSON.stringify(r[h] ?? '')).join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audience_${selectedAudience}_${format}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const uniqueCount = new Set(rows.map((r: any) => r.customer_email || r.email || r.user_id || r.session_id)).size;
      setExportHistory(prev => [{
        time: new Date().toLocaleString('bn-BD'),
        audience: audienceTypes.find(a => a.value === selectedAudience)?.label || selectedAudience,
        format: format.toUpperCase(),
        count: uniqueCount,
      }, ...prev.slice(0, 9)]);

      toast.success(`${format.toUpperCase()} ফরম্যাটে ${uniqueCount} জন এক্সপোর্ট হয়েছে`);
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    } finally {
      setExporting(false);
    }
  };

  const currentAudience = audienceTypes.find(a => a.value === selectedAudience);
  const uniqueAudienceCount = useMemo(() => {
    if (!audienceData) return 0;
    return new Set((audienceData as any[]).map((r: any) => r.customer_email || r.email || r.user_id || r.session_id || r.id)).size;
  }, [audienceData]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-7 h-7 text-primary" />
              অডিয়েন্স ম্যানেজার
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Facebook, TikTok, Google Ads এ Custom / Lookalike Audience তৈরি করুন</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">গত ৭ দিন</SelectItem>
                <SelectItem value="30">গত ৩০ দিন</SelectItem>
                <SelectItem value="90">গত ৯০ দিন</SelectItem>
                <SelectItem value="180">গত ৬ মাস</SelectItem>
                <SelectItem value="365">গত ১ বছর</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Platform Connection Status ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border-2 transition-all ${platformStatus?.facebook.pixel && platformStatus?.facebook.capi ? 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20' : 'border-dashed border-muted-foreground/30'}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Facebook Ads</h3>
                    <p className="text-xs text-muted-foreground">CAPI + Custom Audience</p>
                  </div>
                </div>
                {platformStatus?.facebook.pixel && platformStatus?.facebook.capi ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> কানেক্টেড
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.facebook.pixel ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">Pixel:</span> {platformStatus?.facebook.pixel ? '✓' : '✗'}
                </div>
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.facebook.capi ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">CAPI:</span> {platformStatus?.facebook.capi ? '✓' : '✗'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 transition-all ${platformStatus?.tiktok.pixel && platformStatus?.tiktok.token ? 'border-pink-500/40 bg-pink-50/30 dark:bg-pink-950/20' : 'border-dashed border-muted-foreground/30'}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">TikTok Ads</h3>
                    <p className="text-xs text-muted-foreground">Events API + Audience</p>
                  </div>
                </div>
                {platformStatus?.tiktok.pixel && platformStatus?.tiktok.token ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> কানেক্টেড
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.tiktok.pixel ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">Pixel:</span> {platformStatus?.tiktok.pixel ? '✓' : '✗'}
                </div>
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.tiktok.token ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">Token:</span> {platformStatus?.tiktok.token ? '✓' : '✗'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 transition-all ${platformStatus?.google.measurement && platformStatus?.google.secret ? 'border-green-500/40 bg-green-50/30 dark:bg-green-950/20' : 'border-dashed border-muted-foreground/30'}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Google Ads</h3>
                    <p className="text-xs text-muted-foreground">GA4 MP + Customer Match</p>
                  </div>
                </div>
                {platformStatus?.google.measurement && platformStatus?.google.secret ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> কানেক্টেড
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.google.measurement ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">GA4:</span> {platformStatus?.google.measurement ? '✓' : '✗'}
                </div>
                <div className={`flex-1 text-xs p-2 rounded-lg ${platformStatus?.google.secret ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  <span className="font-medium">Secret:</span> {platformStatus?.google.secret ? '✓' : '✗'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Main Tabs ──────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="audiences" className="flex items-center gap-1.5"><Users className="w-4 h-4" /> অডিয়েন্স</TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1.5"><PieChart className="w-4 h-4" /> ইনসাইট</TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> বিল্ডার</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> হিস্টোরি</TabsTrigger>
          </TabsList>

          {/* ── Tab: Audiences ────────────────────────────── */}
          <TabsContent value="audiences" className="space-y-5 mt-5">
            {/* Overview KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'মোট কাস্টমার', value: overviewStats?.totalCustomers || 0, icon: Users, trend: '+12%', up: true },
                { label: 'মোট রেভিনিউ', value: `৳${(overviewStats?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, trend: '+8%', up: true },
                { label: 'কার্ট পরিত্যাগ', value: overviewStats?.abandonedCarts || 0, icon: ShoppingCart, trend: '-3%', up: false },
                { label: 'ভিজিটর', value: overviewStats?.totalVisitors || 0, icon: Eye, trend: '+15%', up: true },
                { label: 'কনভার্শন রেট', value: `${overviewStats?.conversionRate || 0}%`, icon: Target, trend: '+0.5%', up: true },
              ].map((kpi, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <kpi.icon className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-xs flex items-center gap-0.5 ${kpi.up ? 'text-emerald-600' : 'text-red-500'}`}>
                        {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.trend}
                      </span>
                    </div>
                    <p className="text-xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Audience Selector Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {audienceTypes.map(a => (
                <button
                  key={a.value}
                  onClick={() => setSelectedAudience(a.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    selectedAudience === a.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-card hover:border-muted-foreground/20'
                  }`}
                >
                  <a.icon className={`w-5 h-5 mb-2 ${a.color}`} />
                  <p className="text-sm font-medium leading-tight">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>

            {/* Selected Audience Info + Export */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentAudience && <currentAudience.icon className={`w-6 h-6 ${currentAudience.color}`} />}
                    <div>
                      <CardTitle className="text-lg">{currentAudience?.label}</CardTitle>
                      <CardDescription>{currentAudience?.desc}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : uniqueAudienceCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ইউনিক ইউজার</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export progress bar */}
                {audienceData && (audienceData as any[]).length > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>রেডি টু এক্সপোর্ট</span>
                      <span>{uniqueAudienceCount} জন</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                )}

                {/* Export Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    onClick={() => exportCSV('facebook')}
                    disabled={exporting || !audienceData?.length}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Facebook</div>
                      <div className="text-[10px] opacity-80">Custom Audience</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => exportCSV('tiktok')}
                    disabled={exporting || !audienceData?.length}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white h-12"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">TikTok</div>
                      <div className="text-[10px] opacity-80">Customer File</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => exportCSV('google')}
                    disabled={exporting || !audienceData?.length}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white h-12"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Google Ads</div>
                      <div className="text-[10px] opacity-80">Customer Match</div>
                    </div>
                  </Button>
                  <Button variant="outline" onClick={() => exportCSV('raw')} disabled={exporting || !audienceData?.length} className="h-12">
                    <Download className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Raw CSV</div>
                      <div className="text-[10px] text-muted-foreground">সব ফিল্ড</div>
                    </div>
                  </Button>
                </div>

                {/* Platform Upload Guide */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> আপলোড গাইড</h4>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-background border">
                      <p className="font-semibold text-blue-600 mb-1">Facebook Ads Manager</p>
                      <ol className="space-y-1 text-muted-foreground">
                        <li>1. Audiences → Create Audience</li>
                        <li>2. Custom Audience → Customer List</li>
                        <li>3. CSV আপলোড করুন</li>
                        <li>4. Lookalike তৈরি করুন (1-10%)</li>
                      </ol>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <p className="font-semibold text-pink-600 mb-1">TikTok Ads Manager</p>
                      <ol className="space-y-1 text-muted-foreground">
                        <li>1. Assets → Audiences</li>
                        <li>2. Create Audience → Customer File</li>
                        <li>3. CSV আপলোড করুন</li>
                        <li>4. Lookalike Audience তৈরি</li>
                      </ol>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <p className="font-semibold text-green-600 mb-1">Google Ads</p>
                      <ol className="space-y-1 text-muted-foreground">
                        <li>1. Tools → Audience Manager</li>
                        <li>2. + → Customer List</li>
                        <li>3. CSV আপলোড করুন</li>
                        <li>4. Similar Audience অটো তৈরি</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            {audienceData && (audienceData as any[]).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">ডেটা প্রিভিউ</CardTitle>
                    <Badge variant="outline">{(audienceData as any[]).length} রেকর্ড</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {Object.keys((audienceData as any[])[0]).slice(0, 6).map(k => (
                            <th key={k} className="text-left p-2.5 font-medium text-xs uppercase text-muted-foreground">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(audienceData as any[]).slice(0, 8).map((row: any, i: number) => (
                          <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                            {Object.values(row).slice(0, 6).map((val: any, j: number) => (
                              <td key={j} className="p-2.5 truncate max-w-[180px] text-xs">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Insights ─────────────────────────────── */}
          <TabsContent value="insights" className="space-y-5 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Audience Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4" /> অডিয়েন্স ডিস্ট্রিবিউশন</CardTitle>
                </CardHeader>
                <CardContent>
                  {distributionData && distributionData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                          <Pie data={distributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {distributionData.map((_: any, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {distributionData.map((d: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span>{d.name}: <strong>{d.value}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">ডেটা লোড হচ্ছে...</p>
                  )}
                </CardContent>
              </Card>

              {/* Retargeting Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> রিটার্গেটিং সাজেশন</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { title: 'কার্ট পরিত্যাগকারী → Facebook DPA', desc: 'ডায়নামিক প্রোডাক্ট অ্যাড চালান যারা কার্টে পণ্য রেখে চলে গেছেন', priority: 'high' },
                    { title: 'হাই ভ্যালু → Lookalike 1%', desc: 'VIP কাস্টমারের মতো নতুন অডিয়েন্স খুঁজুন', priority: 'high' },
                    { title: 'ভিজিটর → TikTok Retargeting', desc: 'সাইট ভিজিটরদের TikTok এ রিটার্গেট করুন', priority: 'medium' },
                    { title: 'ইনঅ্যাক্টিভ → Win-back Campaign', desc: '৬০+ দিন ইনঅ্যাক্টিভ কাস্টমারদের ফিরিয়ে আনুন', priority: 'medium' },
                    { title: 'উইশলিস্ট → কনভার্শন ক্যাম্পেইন', desc: 'উইশলিস্টে পণ্য আছে কিন্তু কেনেনি এমন কাস্টমার', priority: 'low' },
                  ].map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">{rec.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0 mt-0.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Lookalike Audience Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Lookalike Audience তৈরি করার গাইড</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-blue-50/30 dark:bg-blue-950/10">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Facebook Lookalike</h4>
                    <ul className="text-xs space-y-1.5 text-muted-foreground">
                      <li>• <strong>Source:</strong> হাই ভ্যালু কাস্টমার লিস্ট</li>
                      <li>• <strong>Size:</strong> 1% সবচেয়ে ভালো কাজ করে</li>
                      <li>• <strong>Min source:</strong> ১০০ জন দরকার</li>
                      <li>• <strong>Best for:</strong> নতুন কাস্টমার অর্জন</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl border bg-pink-50/30 dark:bg-pink-950/10">
                    <h4 className="font-semibold text-pink-700 dark:text-pink-400 mb-2">TikTok Lookalike</h4>
                    <ul className="text-xs space-y-1.5 text-muted-foreground">
                      <li>• <strong>Source:</strong> ক্রেতা / এনগেজড ভিজিটর</li>
                      <li>• <strong>Size:</strong> Narrow/Balanced/Broad</li>
                      <li>• <strong>Min source:</strong> ১০০০ জন দরকার</li>
                      <li>• <strong>Best for:</strong> তরুণ অডিয়েন্স রিচ</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl border bg-green-50/30 dark:bg-green-950/10">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Google Similar Audience</h4>
                    <ul className="text-xs space-y-1.5 text-muted-foreground">
                      <li>• <strong>Source:</strong> Customer Match লিস্ট</li>
                      <li>• <strong>Size:</strong> অটো জেনারেট হয়</li>
                      <li>• <strong>Min source:</strong> ১০০০ জন দরকার</li>
                      <li>• <strong>Best for:</strong> সার্চ ইন্টেন্ট ক্যাপচার</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Custom Builder ────────────────────────── */}
          <TabsContent value="builder" className="space-y-5 mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> কাস্টম অডিয়েন্স বিল্ডার</CardTitle>
                <CardDescription>আপনার নিজের ফিল্টার দিয়ে কাস্টম অডিয়েন্স তৈরি করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> ডেটা ফিল্টার</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <Label className="text-sm">ইমেইল অন্তর্ভুক্ত করুন</Label>
                        <Switch checked={includeEmail} onCheckedChange={setIncludeEmail} />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <Label className="text-sm">ফোন নম্বর অন্তর্ভুক্ত করুন</Label>
                        <Switch checked={includePhone} onCheckedChange={setIncludePhone} />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <Label className="text-sm">বিদ্যমান কাস্টমার বাদ দিন</Label>
                        <Switch checked={excludeExisting} onCheckedChange={setExcludeExisting} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Hash className="w-4 h-4" /> ভ্যালু ফিল্টার</h4>

                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-sm">মিনিমাম অর্ডার অ্যামাউন্ট</Label>
                          <Badge variant="outline">৳{minOrderAmount.toLocaleString()}</Badge>
                        </div>
                        <Slider
                          value={[minOrderAmount]}
                          onValueChange={(v) => setMinOrderAmount(v[0])}
                          max={20000}
                          step={500}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>৳০</span>
                          <span>৳২০,০০০</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30">
                        <Label className="text-sm mb-2 block">সময়সীমা</Label>
                        <Select value={days} onValueChange={setDays}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">গত ৭ দিন</SelectItem>
                            <SelectItem value="30">গত ৩০ দিন</SelectItem>
                            <SelectItem value="90">গত ৯০ দিন</SelectItem>
                            <SelectItem value="180">গত ৬ মাস</SelectItem>
                            <SelectItem value="365">গত ১ বছর</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RFM Segmentation Guide */}
                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> RFM সেগমেন্টেশন গাইড
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-2xl font-bold text-emerald-600">R</p>
                      <p className="text-xs font-medium mt-1">Recency</p>
                      <p className="text-[10px] text-muted-foreground mt-1">সর্বশেষ কবে কিনেছেন</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-2xl font-bold text-blue-600">F</p>
                      <p className="text-xs font-medium mt-1">Frequency</p>
                      <p className="text-[10px] text-muted-foreground mt-1">কতবার কিনেছেন</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-2xl font-bold text-amber-600">M</p>
                      <p className="text-xs font-medium mt-1">Monetary</p>
                      <p className="text-[10px] text-muted-foreground mt-1">মোট কত খরচ করেছেন</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 <strong>টিপ:</strong> হাই ভ্যালু + রিপিট বায়ার = আপনার সেরা কাস্টমার। এদের Lookalike তৈরি করলে সবচেয়ে ভালো রেজাল্ট পাবেন।
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedAudience('high_value'); setActiveTab('audiences'); }}>
                    <Star className="w-3 h-3 mr-1" /> VIP লিস্ট দেখুন
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedAudience('cart_abandoners'); setActiveTab('audiences'); }}>
                    <ShoppingCart className="w-3 h-3 mr-1" /> কার্ট পরিত্যাগ দেখুন
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedAudience('repeat_buyers'); setActiveTab('audiences'); }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> রিপিট বায়ার দেখুন
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Export History ────────────────────────── */}
          <TabsContent value="history" className="space-y-5 mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> এক্সপোর্ট হিস্টোরি</CardTitle>
                <CardDescription>এই সেশনের সব এক্সপোর্ট রেকর্ড (ব্রাউজার রিফ্রেশে মুছে যাবে)</CardDescription>
              </CardHeader>
              <CardContent>
                {exportHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">এখনো কোনো এক্সপোর্ট করা হয়নি</p>
                    <p className="text-xs text-muted-foreground mt-1">অডিয়েন্স ট্যাব থেকে এক্সপোর্ট করুন</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">সময়</th>
                          <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">অডিয়েন্স</th>
                          <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">ফরম্যাট</th>
                          <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">রেকর্ড</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportHistory.map((h, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="p-2.5 text-xs">{h.time}</td>
                            <td className="p-2.5 text-xs font-medium">{h.audience}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-xs">
                                {h.format}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-xs font-semibold">{h.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAudienceExport;
