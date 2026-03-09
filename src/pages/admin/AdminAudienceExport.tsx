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
  Shield, Star, Hash, Calendar, ChevronRight, Sparkles, FileText, Brain,
  GitMerge, Send, Timer, AlertTriangle, Settings, Upload, Trash2, Key, Wifi
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

// ── Overlap Row Component ────────────────────────────────
const OverlapRow = ({ a, b, aLabel, bLabel, since }: { a: AudienceType; b: AudienceType; aLabel: string; bLabel: string; since: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['overlap', a, b, since],
    queryFn: async () => {
      const fetchIds = async (type: AudienceType) => {
        let ids: string[] = [];
        if (type === 'purchasers' || type === 'high_value' || type === 'repeat_buyers' || type === 'new_customers') {
          const q = supabase.from('orders').select('user_id, customer_email').gte('created_at', since).in('status', ['delivered', 'confirmed']);
          if (type === 'high_value') q.gte('total_amount', 5000);
          const { data } = await q;
          ids = (data || []).map((o: any) => o.user_id || o.customer_email).filter(Boolean);
        } else if (type === 'cart_abandoners') {
          const { data } = await supabase.from('abandoned_checkouts').select('user_id, email').gte('created_at', since).eq('recovered', false);
          ids = (data || []).map((o: any) => o.user_id || o.email).filter(Boolean);
        } else if (type === 'engaged') {
          const { data } = await supabase.from('engagement_scores' as any).select('user_id, fingerprint_id').gte('created_at', since).gte('engagement_score', 60);
          ids = (data || []).map((o: any) => o.user_id || o.fingerprint_id).filter(Boolean);
        } else if (type === 'wishlist_users') {
          const { data } = await supabase.from('wishlist_items').select('user_id').gte('created_at', since);
          ids = (data || []).map((o: any) => o.user_id).filter(Boolean);
        } else {
          const { data } = await supabase.from('visitor_analytics').select('user_id, session_id').gte('created_at', since).limit(500);
          ids = (data || []).map((o: any) => o.user_id || o.session_id).filter(Boolean);
        }
        return [...new Set(ids)];
      };
      const [idsA, idsB] = await Promise.all([fetchIds(a), fetchIds(b)]);
      const setB = new Set(idsB);
      const overlap = idsA.filter(id => setB.has(id));
      return { sizeA: idsA.length, sizeB: idsB.length, overlap: overlap.length };
    },
    staleTime: 120_000,
  });

  const overlapPct = data && data.sizeA > 0 ? Math.round((data.overlap / data.sizeA) * 100) : 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
      <div className="flex-1 text-right">
        <p className="text-sm font-medium">{aLabel}</p>
        <p className="text-xs text-muted-foreground">{isLoading ? '...' : `${data?.sizeA || 0} জন`}</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-16">
          <div className="absolute left-0 top-1 w-12 h-12 rounded-full border-2 border-blue-400 bg-blue-100/30 dark:bg-blue-900/20" />
          <div className="absolute right-0 top-1 w-12 h-12 rounded-full border-2 border-pink-400 bg-pink-100/30 dark:bg-pink-900/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold bg-background px-1 rounded">{isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${overlapPct}%`}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{isLoading ? '' : `${data?.overlap || 0} কমন`}</p>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{bLabel}</p>
        <p className="text-xs text-muted-foreground">{isLoading ? '...' : `${data?.sizeB || 0} জন`}</p>
      </div>
    </div>
  );
};

const AdminAudienceExport = () => {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('purchasers');
  const [days, setDays] = useState('30');
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('audiences');
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);
  const [excludeExisting, setExcludeExisting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPredictions, setAiPredictions] = useState<any>(null);
  const [aiOptimizations, setAiOptimizations] = useState<any>(null);
  const [overlapPairs, setOverlapPairs] = useState<{ a: AudienceType; b: AudienceType }[]>([
    { a: 'purchasers', b: 'cart_abandoners' },
    { a: 'high_value', b: 'repeat_buyers' },
    { a: 'engaged', b: 'purchasers' },
  ]);

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

  // ── Platform connection status (from ad_platform_credentials) ─
  const { data: platformStatus, refetch: refetchPlatformStatus } = useQuery({
    queryKey: ['ad-platform-credentials-status'],
    queryFn: async () => {
      const { data } = await supabase.from('ad_platform_credentials' as any).select('platform, credential_key').eq('is_active', true);
      const has = (p: string, k: string) => (data || []).some((r: any) => r.platform === p && r.credential_key === k);
      return {
        facebook: { pixel: has('facebook', 'pixel_id'), capi: has('facebook', 'access_token'), adAccount: has('facebook', 'ad_account_id') },
        tiktok: { pixel: has('tiktok', 'pixel_id'), token: has('tiktok', 'access_token'), advertiser: has('tiktok', 'advertiser_id') },
        google: { measurement: has('google', 'measurement_id'), secret: has('google', 'api_secret'), developer: has('google', 'developer_token'), customer: has('google', 'customer_id') },
      };
    },
    staleTime: 30_000,
  });

  // ── All credentials for management ────────────────────
  const { data: allCredentials, refetch: refetchCredentials } = useQuery({
    queryKey: ['ad-platform-all-credentials'],
    queryFn: async () => {
      const { data } = await supabase.from('ad_platform_credentials' as any).select('*').order('platform').order('credential_key');
      return data || [];
    },
    staleTime: 30_000,
  });

  // ── Sync jobs history ─────────────────────────────────
  const { data: syncJobs, refetch: refetchSyncJobs } = useQuery({
    queryKey: ['audience-sync-jobs'],
    queryFn: async () => {
      const { data } = await supabase.from('audience_sync_jobs' as any).select('*').order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    staleTime: 30_000,
  });

  // ── Recent events log ─────────────────────────────────
  const { data: recentEvents } = useQuery({
    queryKey: ['ad-platform-recent-events'],
    queryFn: async () => {
      const { data } = await supabase.from('ad_platform_events' as any).select('*').order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    staleTime: 30_000,
  });

  const [credentialSaving, setCredentialSaving] = useState(false);
  const [newCredPlatform, setNewCredPlatform] = useState('facebook');
  const [newCredKey, setNewCredKey] = useState('');
  const [newCredValue, setNewCredValue] = useState('');
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [inlineCredValues, setInlineCredValues] = useState<Record<string, string>>({});
  const [inlineEditKey, setInlineEditKey] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');

  const saveCredential = async () => {
    if (!newCredKey || !newCredValue) { toast.error('সব ফিল্ড পূরণ করুন'); return; }
    setCredentialSaving(true);
    try {
      const { error } = await supabase.from('ad_platform_credentials' as any).upsert(
        { platform: newCredPlatform, credential_key: newCredKey, credential_value: newCredValue, is_active: true, updated_at: new Date().toISOString() },
        { onConflict: 'platform,credential_key' }
      );
      if (error) throw error;
      toast.success('ক্রেডেনশিয়াল সেভ হয়েছে');
      setNewCredKey(''); setNewCredValue('');
      refetchCredentials(); refetchPlatformStatus();
    } catch (e: any) {
      toast.error(e.message || 'সেভ ব্যর্থ');
    } finally { setCredentialSaving(false); }
  };

  const deleteCredential = async (id: string) => {
    await supabase.from('ad_platform_credentials' as any).delete().eq('id', id);
    toast.success('ক্রেডেনশিয়াল মুছে ফেলা হয়েছে');
    refetchCredentials(); refetchPlatformStatus();
  };

  const directSyncAudience = async (platform: string) => {
    setSyncingPlatform(platform);
    try {
      // Create sync job
      const { data: job, error: jobErr } = await (supabase.from('audience_sync_jobs' as any).insert({
        platform, audience_type: selectedAudience,
        audience_name: `Boialo - ${audienceTypes.find(a => a.value === selectedAudience)?.label} - ${new Date().toLocaleDateString('bn-BD')}`,
        status: 'pending',
      }).select().single() as any);
      if (jobErr) throw jobErr;

      const { error } = await supabase.functions.invoke('ad-audience-sync', {
        body: { platform, audience_type: selectedAudience, job_id: (job as any).id },
      });
      if (error) throw error;
      toast.success(`${platform} এ অডিয়েন্স সিংক শুরু হয়েছে`);
      refetchSyncJobs();
    } catch (e: any) {
      toast.error(e.message || 'সিংক ব্যর্থ');
    } finally { setSyncingPlatform(null); }
  };

  // ── Overview stats ─────────────────────────────────────
  const { data: overviewStats } = useQuery({
    queryKey: ['audience-overview', days],
    queryFn: async () => {
      const [orders, abandoned, visitors, customers] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status', { count: 'exact' }).gte('created_at', since),
        supabase.from('abandoned_checkouts').select('id', { count: 'exact' }).gte('created_at', since).eq('recovered', false),
        supabase.from('visitor_analytics').select('session_id', { count: 'exact' }).gte('created_at', since),
        supabase.from('profiles').select('id', { count: 'exact' }),
      ]);
      const totalOrders = orders.count || 0;
      const totalRevenue = (orders.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      return {
        totalCustomers: customers.count || 0,
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
        supabase.from('wishlist_items').select('id', { count: 'exact' }).gte('created_at', since),
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
                  <Badge variant="outline" className="text-muted-foreground cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-950/30 transition-colors" onClick={() => setActiveTab('credentials')}>
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {['pixel_id', 'access_token', 'ad_account_id'].map(k => {
                  const active = k === 'pixel_id' ? platformStatus?.facebook.pixel : k === 'access_token' ? platformStatus?.facebook.capi : platformStatus?.facebook.adAccount;
                  return (
                    <div key={k} className={`flex-1 text-xs p-2 rounded-lg ${active ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      <span className="font-medium">{k.split('_')[0]}:</span> {active ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>
              {platformStatus?.facebook.pixel && platformStatus?.facebook.capi && (
                <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-xs" onClick={() => directSyncAudience('facebook')} disabled={!!syncingPlatform}>
                  {syncingPlatform === 'facebook' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  সরাসরি সিংক করুন
                </Button>
              )}
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
                  <Badge variant="outline" className="text-muted-foreground cursor-pointer hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 dark:hover:bg-pink-950/30 transition-colors" onClick={() => setActiveTab('credentials')}>
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {['pixel_id', 'access_token', 'advertiser_id'].map(k => {
                  const active = k === 'pixel_id' ? platformStatus?.tiktok.pixel : k === 'access_token' ? platformStatus?.tiktok.token : platformStatus?.tiktok.advertiser;
                  return (
                    <div key={k} className={`flex-1 text-xs p-2 rounded-lg ${active ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      <span className="font-medium">{k.split('_')[0]}:</span> {active ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>
              {platformStatus?.tiktok.pixel && platformStatus?.tiktok.token && (
                <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-xs" onClick={() => directSyncAudience('tiktok')} disabled={!!syncingPlatform}>
                  {syncingPlatform === 'tiktok' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  সরাসরি সিংক করুন
                </Button>
              )}
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
                  <Badge variant="outline" className="text-muted-foreground cursor-pointer hover:bg-green-50 hover:text-green-600 hover:border-green-300 dark:hover:bg-green-950/30 transition-colors" onClick={() => setActiveTab('credentials')}>
                    <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ করুন
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {['measurement_id', 'api_secret', 'developer_token', 'customer_id'].map(k => {
                  const active = k === 'measurement_id' ? platformStatus?.google.measurement : k === 'api_secret' ? platformStatus?.google.secret : k === 'developer_token' ? platformStatus?.google.developer : platformStatus?.google.customer;
                  return (
                    <div key={k} className={`flex-1 text-xs p-1.5 rounded-lg ${active ? 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      <span className="font-medium text-[10px]">{k.split('_')[0]}:</span> {active ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>
              {platformStatus?.google.measurement && platformStatus?.google.secret && (
                <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-xs" onClick={() => directSyncAudience('google')} disabled={!!syncingPlatform}>
                  {syncingPlatform === 'google' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  সরাসরি সিংক করুন
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Main Tabs ──────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap w-full max-w-4xl gap-1">
            <TabsTrigger value="audiences" className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> অডিয়েন্স</TabsTrigger>
            <TabsTrigger value="credentials" className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> API কী</TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> অটো সিংক</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> AI প্রেডিকশন</TabsTrigger>
            <TabsTrigger value="overlap" className="flex items-center gap-1.5"><GitMerge className="w-3.5 h-3.5" /> ওভারল্যাপ</TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5" /> ইনসাইট</TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> বিল্ডার</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> হিস্টোরি</TabsTrigger>
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

          {/* ── Tab: AI Prediction ────────────────────────── */}
          <TabsContent value="ai" className="space-y-5 mt-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> AI অডিয়েন্স প্রেডিকশন</CardTitle>
                  <CardDescription>AI দিয়ে কোন অডিয়েন্সে বেশি কনভার্শন হবে তা প্রেডিক্ট করুন</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={async () => {
                      setAiLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('audience-ai', { body: { action: 'predict' } });
                        if (error) throw error;
                        setAiPredictions(data);
                        toast.success('AI প্রেডিকশন তৈরি হয়েছে');
                      } catch (e: any) {
                        toast.error(e.message || 'AI প্রেডিকশন ব্যর্থ');
                      } finally { setAiLoading(false); }
                    }}
                    disabled={aiLoading}
                    className="w-full"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                    {aiLoading ? 'বিশ্লেষণ চলছে...' : 'AI প্রেডিকশন চালান'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> AI অপ্টিমাইজেশন</CardTitle>
                  <CardDescription>ক্যাম্পেইন অপ্টিমাইজেশনের জন্য AI সাজেশন পান</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setAiLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('audience-ai', { body: { action: 'optimize' } });
                        if (error) throw error;
                        setAiOptimizations(data);
                        toast.success('অপ্টিমাইজেশন সাজেশন তৈরি হয়েছে');
                      } catch (e: any) {
                        toast.error(e.message || 'অপ্টিমাইজেশন ব্যর্থ');
                      } finally { setAiLoading(false); }
                    }}
                    disabled={aiLoading}
                    className="w-full"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {aiLoading ? 'বিশ্লেষণ চলছে...' : 'অপ্টিমাইজেশন সাজেশন পান'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* AI Predictions Results */}
            {aiPredictions?.predictions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">প্রেডিকশন রেজাল্ট</CardTitle>
                  {aiPredictions.overall_strategy && (
                    <CardDescription>{aiPredictions.overall_strategy}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiPredictions.predictions.map((p: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{p.audience}</h4>
                          <Badge variant="outline" className="text-xs mt-1">{p.platform}</Badge>
                        </div>
                        <div className="text-right">
                          <Badge className={`${p.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : p.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {p.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{p.recommendation}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-background border text-center">
                          <p className="font-bold text-emerald-600">{p.confidence}%</p>
                          <p className="text-muted-foreground">কনফিডেন্স</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background border text-center">
                          <p className="font-bold text-blue-600">{p.expected_roas}x</p>
                          <p className="text-muted-foreground">ROAS</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background border text-center">
                          <p className="font-bold">{(p.estimated_size || 0).toLocaleString()}</p>
                          <p className="text-muted-foreground">সাইজ</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Budget Allocation */}
                  {aiPredictions.budget_allocation && (
                    <div className="p-4 rounded-xl border bg-primary/5">
                      <h4 className="font-semibold text-sm mb-3">বাজেট বিভাজন সাজেশন</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(aiPredictions.budget_allocation).map(([platform, pct]: any) => (
                          <div key={platform} className="text-center">
                            <p className="text-2xl font-bold">{pct}%</p>
                            <p className="text-xs text-muted-foreground capitalize">{platform}</p>
                            <Progress value={pct} className="h-1.5 mt-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Optimizations Results */}
            {aiOptimizations?.optimizations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">অপ্টিমাইজেশন সাজেশন</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiOptimizations.optimizations.map((o: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                        o.effort === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        o.effort === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {o.priority || i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{o.area}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.current_issue}</p>
                        <p className="text-xs mt-1">💡 {o.suggestion}</p>
                        <Badge variant="outline" className="text-xs mt-1">{o.expected_improvement}</Badge>
                      </div>
                    </div>
                  ))}

                  {aiOptimizations.quick_wins && (
                    <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 mb-2">⚡ কুইক উইন</h4>
                      <ul className="space-y-1">
                        {aiOptimizations.quick_wins.map((w: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" /> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Overlap Analysis ─────────────────────── */}
          <TabsContent value="overlap" className="space-y-5 mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitMerge className="w-5 h-5" /> অডিয়েন্স ওভারল্যাপ বিশ্লেষণ</CardTitle>
                <CardDescription>বিভিন্ন অডিয়েন্সের মধ্যে কত জন কমন তা দেখুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {overlapPairs.map((pair, idx) => {
                  const aLabel = audienceTypes.find(a => a.value === pair.a)?.label || pair.a;
                  const bLabel = audienceTypes.find(a => a.value === pair.b)?.label || pair.b;
                  return (
                    <OverlapRow key={idx} a={pair.a} b={pair.b} aLabel={aLabel} bLabel={bLabel} since={since} />
                  );
                })}

                {/* Add custom pair */}
                <div className="flex gap-3 items-end p-4 rounded-xl bg-muted/30">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">অডিয়েন্স A</Label>
                    <Select onValueChange={(v) => setOverlapPairs(p => [...p, { a: v as AudienceType, b: p[0]?.b || 'purchasers' }])}>
                      <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                      <SelectContent>
                        {audienceTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <GitMerge className="w-5 h-5 text-muted-foreground mb-2" />
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">অডিয়েন্স B</Label>
                    <Select onValueChange={(v) => setOverlapPairs(p => { const last = p[p.length - 1]; if (last) last.b = v as AudienceType; return [...p]; })}>
                      <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                      <SelectContent>
                        {audienceTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overlap Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> ওভারল্যাপ ইনসাইট</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs"><strong>ডুপ্লিকেট স্পেন্ড:</strong> ওভারল্যাপিং অডিয়েন্সে একই ব্যক্তিকে একাধিক প্ল্যাটফর্মে টার্গেট করলে বাজেট নষ্ট হয়। Exclude list ব্যবহার করুন।</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs"><strong>ক্রস-সেল:</strong> যারা ক্রেতা এবং উইশলিস্ট ইউজার দুটোতেই আছে, তাদের জন্য ক্রস-সেল ক্যাম্পেইন চালান।</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                    <Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs"><strong>Exclusion Strategy:</strong> Facebook ক্যাম্পেইনে "ক্রেতা" অডিয়েন্সকে exclude করলে শুধু নতুন কাস্টমারকে টার্গেট করা যায়।</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: API Credentials ─────────────────────── */}
          <TabsContent value="credentials" className="space-y-6 mt-5">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 md:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">API ক্রেডেনশিয়াল ভল্ট</h2>
                      <p className="text-sm text-muted-foreground">সিকিউরলি আপনার Ad Platform API কী ম্যানেজ করুন</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const total = (allCredentials || []).length;
                    const active = (allCredentials as any[] || []).filter((c: any) => c.is_active).length;
                    return (
                      <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-background/80 backdrop-blur border">
                        <div className="text-center">
                          <p className="text-lg font-bold text-primary">{total}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">মোট কী</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">{active}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">সক্রিয়</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Platform Connection Cards with Inline Credential Inputs */}
            <div className="space-y-6">
              {[
                { platform: 'facebook', label: 'Facebook', icon: Facebook, gradient: 'from-blue-500/10 to-blue-600/5', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600', borderActive: 'border-blue-500/30', accentColor: 'blue', keys: [
                  { key: 'pixel_id', label: 'Pixel ID', desc: 'Events Manager → Data Sources → Pixel', placeholder: 'e.g. 1234567890123456', required: true },
                  { key: 'access_token', label: 'System Access Token', desc: 'Business Settings → System Users → Generate Token', placeholder: 'EAAxxxxxxx...', required: true },
                  { key: 'ad_account_id', label: 'Ad Account ID', desc: 'act_XXXXXXXXX ফরম্যাটে পেস্ট করুন', placeholder: 'act_1234567890', required: false },
                  { key: 'test_event_code', label: 'Test Event Code (ঐচ্ছিক)', desc: 'টেস্টিং মোডের জন্য', placeholder: 'TEST12345', required: false },
                ]},
                { platform: 'tiktok', label: 'TikTok', icon: Zap, gradient: 'from-pink-500/10 to-fuchsia-600/5', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-600', borderActive: 'border-pink-500/30', accentColor: 'pink', keys: [
                  { key: 'pixel_id', label: 'Pixel Code', desc: 'TikTok Ads Manager → Assets → Events', placeholder: 'e.g. CXXXXXXXXX', required: true },
                  { key: 'access_token', label: 'Access Token', desc: 'TikTok Marketing API → App Management', placeholder: 'Token পেস্ট করুন...', required: true },
                  { key: 'advertiser_id', label: 'Advertiser ID', desc: 'TikTok Ads Dashboard থেকে কপি করুন', placeholder: 'e.g. 7012345678901', required: false },
                ]},
                { platform: 'google', label: 'Google', icon: BarChart3, gradient: 'from-emerald-500/10 to-green-600/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600', borderActive: 'border-emerald-500/30', accentColor: 'emerald', keys: [
                  { key: 'measurement_id', label: 'Measurement ID', desc: 'GA4 Property → G-XXXXXXX', placeholder: 'G-XXXXXXXXXX', required: true },
                  { key: 'api_secret', label: 'API Secret', desc: 'GA4 → Admin → Data Streams → API Secrets', placeholder: 'Secret পেস্ট করুন...', required: true },
                  { key: 'developer_token', label: 'Developer Token', desc: 'Google Ads → Tools → API Center', placeholder: 'Token পেস্ট করুন...', required: false },
                  { key: 'customer_id', label: 'Customer ID', desc: 'XXX-XXX-XXXX ফরম্যাটে', placeholder: '123-456-7890', required: false },
                  { key: 'client_id', label: 'OAuth Client ID', desc: 'Google Cloud Console → Credentials', placeholder: 'xxxxxx.apps.googleusercontent.com', required: false },
                  { key: 'client_secret', label: 'Client Secret', desc: 'OAuth 2.0 Client Secret', placeholder: 'GOCSPX-xxxxxxx', required: false },
                  { key: 'refresh_token', label: 'Refresh Token', desc: 'OAuth Playground থেকে জেনারেট', placeholder: '1//xxxxxxx', required: false },
                ]},
              ].map((p) => {
                const configuredKeys = p.keys.filter(k => (allCredentials as any[] || []).some((c: any) => c.platform === p.platform && c.credential_key === k.key));
                const requiredKeys = p.keys.filter(k => k.required);
                const configuredRequired = requiredKeys.filter(k => configuredKeys.some(ck => ck.key === k.key));
                const isFullyConnected = configuredRequired.length === requiredKeys.length;
                const progress = Math.round((configuredKeys.length / p.keys.length) * 100);

                return (
                  <Card key={p.platform} className={`relative overflow-hidden transition-all ${isFullyConnected ? p.borderActive : ''}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} pointer-events-none`} />
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                            <p.icon className={`w-5 h-5 ${p.iconColor}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{p.label}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{configuredKeys.length}/{p.keys.length} কী কনফিগার করা হয়েছে</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isFullyConnected ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-semibold text-emerald-600">Connected</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/5">
                              <AlertCircle className="w-3 h-3 mr-1" /> সেটআপ প্রয়োজন
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Progress value={progress} className="h-1.5 mt-4" />
                    </CardHeader>
                    <CardContent className="relative pt-0">
                      <div className="grid gap-3">
                        {p.keys.map((k) => {
                          const existingCred = (allCredentials as any[] || []).find((c: any) => c.platform === p.platform && c.credential_key === k.key);
                          const isEditing = inlineEditKey === `${p.platform}_${k.key}`;

                          return (
                            <div key={k.key} className={`rounded-xl border p-4 transition-all ${existingCred ? 'bg-emerald-500/[0.03] border-emerald-500/15' : 'bg-background/60 border-border/60 hover:border-border'}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${existingCred ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                                    {existingCred ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Key className="w-4 h-4 text-muted-foreground" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold">{k.label}</p>
                                      {k.required && !existingCred && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">আবশ্যক</span>}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.desc}</p>
                                    
                                    {/* Show saved value or input */}
                                    {existingCred && !isEditing ? (
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <code className="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-muted/60 text-muted-foreground tracking-wider">{'•'.repeat(10)}...{existingCred.credential_value?.slice(-4)}</code>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setInlineEditKey(`${p.platform}_${k.key}`); setInlineEditValue(''); }}>
                                          <RefreshCw className="w-3 h-3 mr-1" /> আপডেট
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => deleteCredential(existingCred.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 mt-2.5">
                                        <Input
                                          type="password"
                                          className="h-9 bg-background font-mono text-xs flex-1"
                                          value={isEditing ? inlineEditValue : (inlineCredValues[`${p.platform}_${k.key}`] || '')}
                                          onChange={e => {
                                            if (isEditing) {
                                              setInlineEditValue(e.target.value);
                                            } else {
                                              setInlineCredValues(prev => ({ ...prev, [`${p.platform}_${k.key}`]: e.target.value }));
                                            }
                                          }}
                                          placeholder={k.placeholder}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-9 px-3 text-xs gap-1.5 shrink-0"
                                          disabled={credentialSaving || !(isEditing ? inlineEditValue : inlineCredValues[`${p.platform}_${k.key}`])}
                                          onClick={async () => {
                                            const val = isEditing ? inlineEditValue : inlineCredValues[`${p.platform}_${k.key}`];
                                            if (!val) return;
                                            setCredentialSaving(true);
                                            try {
                                              const { error } = await supabase.from('ad_platform_credentials' as any).upsert(
                                                { platform: p.platform, credential_key: k.key, credential_value: val, is_active: true, updated_at: new Date().toISOString() },
                                                { onConflict: 'platform,credential_key' }
                                              );
                                              if (error) throw error;
                                              toast.success(`${k.label} সেভ হয়েছে`);
                                              setInlineCredValues(prev => { const n = { ...prev }; delete n[`${p.platform}_${k.key}`]; return n; });
                                              setInlineEditKey(null); setInlineEditValue('');
                                              refetchCredentials(); refetchPlatformStatus();
                                            } catch (e: any) { toast.error(e.message || 'সেভ ব্যর্থ'); }
                                            finally { setCredentialSaving(false); }
                                          }}
                                        >
                                          {credentialSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          সেভ
                                        </Button>
                                        {isEditing && (
                                          <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => { setInlineEditKey(null); setInlineEditValue(''); }}>
                                            বাতিল
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Save All Button for unconfigured keys */}
                      {(() => {
                        const pendingKeys = p.keys.filter(k => !configuredKeys.some(ck => ck.key === k.key) && inlineCredValues[`${p.platform}_${k.key}`]);
                        if (pendingKeys.length < 2) return null;
                        return (
                          <Button
                            className="w-full mt-4 h-11 gap-2 font-semibold"
                            disabled={credentialSaving}
                            onClick={async () => {
                              setCredentialSaving(true);
                              try {
                                for (const k of pendingKeys) {
                                  const val = inlineCredValues[`${p.platform}_${k.key}`];
                                  if (!val) continue;
                                  const { error } = await supabase.from('ad_platform_credentials' as any).upsert(
                                    { platform: p.platform, credential_key: k.key, credential_value: val, is_active: true, updated_at: new Date().toISOString() },
                                    { onConflict: 'platform,credential_key' }
                                  );
                                  if (error) throw error;
                                }
                                toast.success(`${p.label} এর ${pendingKeys.length}টি কী সেভ হয়েছে`);
                                setInlineCredValues(prev => {
                                  const n = { ...prev };
                                  pendingKeys.forEach(k => delete n[`${p.platform}_${k.key}`]);
                                  return n;
                                });
                                refetchCredentials(); refetchPlatformStatus();
                              } catch (e: any) { toast.error(e.message || 'সেভ ব্যর্থ'); }
                              finally { setCredentialSaving(false); }
                            }}
                          >
                            {credentialSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            সব কী একসাথে সেভ করুন ({pendingKeys.length}টি)
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Saved Credentials Table */}
            {(allCredentials || []).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Key className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">সেভ করা ক্রেডেনশিয়াল</CardTitle>
                        <CardDescription className="text-xs">{(allCredentials as any[]).length}টি কী সংরক্ষিত আছে</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-t border-b bg-muted/40">
                          <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">প্ল্যাটফর্ম</th>
                          <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ক্রেডেনশিয়াল কী</th>
                          <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ভ্যালু</th>
                          <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">স্ট্যাটাস</th>
                          <th className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">আপডেট</th>
                          <th className="text-right px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(allCredentials as any[]).map((c: any) => {
                          const platformIcons: Record<string, any> = { facebook: Facebook, tiktok: Zap, google: BarChart3 };
                          const platformColors: Record<string, string> = { facebook: 'text-blue-600 bg-blue-500/10', tiktok: 'text-pink-600 bg-pink-500/10', google: 'text-emerald-600 bg-emerald-500/10' };
                          const PIcon = platformIcons[c.platform] || Key;
                          const pColor = platformColors[c.platform] || 'text-muted-foreground bg-muted';
                          return (
                            <tr key={c.id} className="group hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pColor}`}>
                                    <PIcon className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm font-semibold capitalize">{c.platform}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <code className="text-xs px-2 py-1 rounded-md bg-muted font-mono">{c.credential_key}</code>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="text-xs font-mono text-muted-foreground tracking-wider">{'•'.repeat(12)}...{c.credential_value?.slice(-4)}</span>
                              </td>
                              <td className="px-6 py-3.5">
                                {c.is_active ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> সক্রিয়
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border">
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" /> নিষ্ক্রিয়
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="text-xs text-muted-foreground">{c.updated_at ? new Date(c.updated_at).toLocaleDateString('bn-BD') : '—'}</span>
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteCredential(c.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">নিরাপত্তা তথ্য</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">সকল API কী এনক্রিপ্টেড ডাটাবেসে সংরক্ষিত থাকে এবং শুধুমাত্র সার্ভার-সাইড ব্যাকএন্ড ফাংশন থেকে অ্যাক্সেস করা হয়। ক্লায়েন্ট-সাইডে কোনো কী এক্সপোজ হয় না।</p>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Auto Sync ────────────────────────────── */}
          <TabsContent value="sync" className="space-y-5 mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" /> লাইভ ইভেন্ট সিংক + অডিয়েন্স আপলোড</CardTitle>
                <CardDescription>সার্ভার-সাইড ইভেন্ট ও অডিয়েন্স সরাসরি Ad Platforms এ পাঠান</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Live sync status */}
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'Facebook CAPI', active: platformStatus?.facebook.pixel && platformStatus?.facebook.capi, events: ['Purchase', 'AddToCart', 'ViewContent', 'InitiateCheckout', 'Lead', 'Search', 'AddToWishlist'], hasAudienceSync: !!platformStatus?.facebook.adAccount },
                    { name: 'TikTok Events API', active: platformStatus?.tiktok.pixel && platformStatus?.tiktok.token, events: ['CompletePayment', 'AddToCart', 'ViewContent', 'InitiateCheckout', 'Search', 'AddToWishlist'], hasAudienceSync: !!platformStatus?.tiktok.advertiser },
                    { name: 'GA4 + Google Ads', active: platformStatus?.google.measurement && platformStatus?.google.secret, events: ['purchase', 'add_to_cart', 'view_item', 'begin_checkout', 'search', 'sign_up'], hasAudienceSync: !!platformStatus?.google.developer },
                  ].map((p, i) => (
                    <div key={i} className="p-4 rounded-xl border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{p.name}</h4>
                        <div className={`w-3 h-3 rounded-full ${p.active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={p.active ? 'default' : 'outline'} className="text-xs">
                          {p.active ? <Wifi className="w-3 h-3 mr-1" /> : null}
                          {p.active ? 'ইভেন্ট সিংক চালু' : 'API কী দিন'}
                        </Badge>
                        {p.hasAudienceSync && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                            <Upload className="w-3 h-3 mr-1" /> অডিয়েন্স সিংক
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.events.map((e, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] px-1.5 py-0">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* How it works */}
                <div className="p-4 rounded-xl bg-muted/30 border">
                  <h4 className="font-semibold text-sm mb-3">কিভাবে কাজ করে?</h4>
                  <div className="grid md:grid-cols-4 gap-3">
                    {[
                      { step: '১', title: 'API কী সেটআপ', desc: 'API কী ট্যাবে ক্রেডেনশিয়াল দিন' },
                      { step: '২', title: 'ইভেন্ট ফরওয়ার্ড', desc: 'Purchase, AddToCart ইত্যাদি' },
                      { step: '৩', title: 'অডিয়েন্স সিংক', desc: 'সরাসরি প্ল্যাটফর্মে আপলোড' },
                      { step: '৪', title: 'অ্যাড অপ্টিমাইজ', desc: 'বেটার ROAS ও কনভার্শন' },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-3 rounded-lg bg-background border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mx-auto mb-2">{s.step}</div>
                        <p className="text-xs font-medium">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sync jobs history */}
                {(syncJobs || []).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> সিংক হিস্টোরি</h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">প্ল্যাটফর্ম</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">অডিয়েন্স</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">স্ট্যাটাস</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">ইউজার</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">সময়</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(syncJobs as any[]).map((job: any) => (
                            <tr key={job.id} className="border-t hover:bg-muted/30">
                              <td className="p-2.5 text-xs font-medium capitalize">{job.platform}</td>
                              <td className="p-2.5 text-xs">{job.audience_name || job.audience_type}</td>
                              <td className="p-2.5">
                                <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'outline'} className="text-xs">
                                  {job.status === 'completed' ? '✓ সম্পন্ন' : job.status === 'failed' ? '✗ ব্যর্থ' : job.status === 'processing' ? '⟳ চলছে' : 'পেন্ডিং'}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-xs">{job.synced_users || 0}/{job.total_users || 0}</td>
                              <td className="p-2.5 text-xs">{new Date(job.created_at).toLocaleString('bn-BD')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent events */}
                {(recentEvents || []).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> সাম্প্রতিক ইভেন্ট লগ</h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">প্ল্যাটফর্ম</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">ইভেন্ট</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">স্ট্যাটাস</th>
                            <th className="text-left p-2.5 text-xs font-medium uppercase text-muted-foreground">সময়</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(recentEvents as any[]).slice(0, 10).map((evt: any) => (
                            <tr key={evt.id} className="border-t hover:bg-muted/30">
                              <td className="p-2.5 text-xs font-medium capitalize">{evt.platform}</td>
                              <td className="p-2.5 text-xs">{evt.event_name}</td>
                              <td className="p-2.5">
                                <Badge variant={evt.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                                  {evt.status === 'success' ? '✓' : '✗'} {evt.status}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-xs">{new Date(evt.created_at).toLocaleString('bn-BD')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Benefits */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10">
                    <h4 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 mb-2">✓ অ্যাড ব্লকার বাইপাস</h4>
                    <p className="text-xs text-muted-foreground">সার্ভার-সাইড ট্র্যাকিং ক্লায়েন্ট-সাইড ব্লকার এড়িয়ে যায়, ফলে ৩০-৪০% বেশি ডেটা ক্যাপচার হয়।</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-blue-50/30 dark:bg-blue-950/10">
                    <h4 className="font-semibold text-xs text-blue-700 dark:text-blue-400 mb-2">✓ ডাইরেক্ট API সিংক</h4>
                    <p className="text-xs text-muted-foreground">CSV ম্যানুয়ালি আপলোডের বদলে সরাসরি Facebook/TikTok/Google API দিয়ে অডিয়েন্স সিংক করুন।</p>
                  </div>
                </div>

                {!platformStatus?.facebook.pixel && !platformStatus?.tiktok.pixel && !platformStatus?.google.measurement && (
                  <Button variant="outline" onClick={() => setActiveTab('credentials')} className="w-full">
                    <Key className="w-4 h-4 mr-2" /> প্রথমে API কী সেটআপ করুন
                  </Button>
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
