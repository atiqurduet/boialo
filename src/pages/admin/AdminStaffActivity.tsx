import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, subDays, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';
import { Download, Search, Activity, Shield, Eye, Clock, User, Filter, ShoppingCart, LogIn, LogOut, AlertTriangle, CheckCircle2, XCircle, BarChart3, TrendingUp, Loader2, RefreshCw, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

// ── Types ──
interface StaffProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_id: string | null;
  created_at: string;
}

interface LoginLog {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

// ── Constants ──
const ACTION_LABELS: Record<string, string> = {
  create: 'তৈরি', insert: 'যোগ', update: 'আপডেট', edit: 'সম্পাদনা',
  delete: 'মুছে ফেলা', remove: 'অপসারণ', login: 'লগইন', logout: 'লগআউট',
  status_change: 'স্ট্যাটাস পরিবর্তন', role_change: 'রোল পরিবর্তন',
};

const TABLE_LABELS: Record<string, string> = {
  products: 'বই', orders: 'অর্ডার', categories: 'ক্যাটাগরি', coupons: 'কুপন',
  banners: 'ব্যানার', profiles: 'প্রোফাইল', user_roles: 'ইউজার রোল',
  site_settings: 'সেটিংস', universal_products: 'প্রোডাক্ট', digital_products: 'ডিজিটাল প্রোডাক্ট',
  blog_posts: 'ব্লগ', pages: 'পেজ', offers: 'অফার', writers: 'লেখক', publishers: 'প্রকাশনী',
  order_tasks: 'টাস্ক', notification_settings: 'নোটিফিকেশন', menu_items: 'মেনু',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  support: 'bg-green-100 text-green-800',
};

const AdminStaffActivity = () => {
  const [staffFilter, setStaffFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('7'); // days
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loginStaffFilter, setLoginStaffFilter] = useState('all');
  const [loginEventFilter, setLoginEventFilter] = useState('all');

  // ── Queries ──
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staff-profiles-activity'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds);
      return (profiles || []).map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'unknown',
      }));
    },
  });

  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['staff-audit-logs', dateRange],
    queryFn: async () => {
      const staffIds = staffProfiles.map(s => s.id);
      if (!staffIds.length) return [];
      let query = supabase.from('admin_audit_logs').select('*').in('user_id', staffIds).order('created_at', { ascending: false }).limit(500);
      if (dateRange !== 'all') {
        const from = subDays(new Date(), parseInt(dateRange)).toISOString();
        query = query.gte('created_at', from);
      }
      const { data } = await query;
      return (data || []) as AuditLog[];
    },
    enabled: staffProfiles.length > 0,
  });

  const { data: loginLogs = [], isLoading: loginLoading } = useQuery({
    queryKey: ['staff-login-logs', dateRange],
    queryFn: async () => {
      let query = supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(500);
      if (dateRange !== 'all') {
        const from = subDays(new Date(), parseInt(dateRange)).toISOString();
        query = query.gte('created_at', from);
      }
      const { data } = await query;
      return (data || []) as LoginLog[];
    },
  });

  const { data: orderHistory = [] } = useQuery({
    queryKey: ['staff-order-history', dateRange],
    queryFn: async () => {
      const staffIds = staffProfiles.map(s => s.id);
      if (!staffIds.length) return [];
      let query = supabase.from('order_status_history').select('*').in('changed_by', staffIds).order('created_at', { ascending: false }).limit(500);
      if (dateRange !== 'all') {
        const from = subDays(new Date(), parseInt(dateRange)).toISOString();
        query = query.gte('created_at', from);
      }
      const { data } = await query;
      return (data || []) as OrderStatusHistory[];
    },
    enabled: staffProfiles.length > 0,
  });

  const { data: taskStats = [] } = useQuery({
    queryKey: ['staff-task-stats'],
    queryFn: async () => {
      const staffIds = staffProfiles.map(s => s.id);
      if (!staffIds.length) return [];
      const { data } = await supabase.from('order_tasks').select('assigned_to, status').in('assigned_to', staffIds);
      return data || [];
    },
    enabled: staffProfiles.length > 0,
  });

  // ── Helpers ──
  const getStaffName = (userId: string | null) => {
    if (!userId) return 'সিস্টেম';
    const p = staffProfiles.find(s => s.id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  const getStaffAvatar = (userId: string | null) => {
    const p = staffProfiles.find(s => s.id === userId);
    return p?.avatar_url || null;
  };

  const getStaffRole = (userId: string | null) => {
    const p = staffProfiles.find((s: any) => s.id === userId);
    return (p as any)?.role || '';
  };

  const getActionColor = (action: string) => {
    if (action?.includes('create') || action?.includes('insert')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return <Monitor className="h-4 w-4" />;
    if (/mobile|android|iphone/i.test(ua)) return <Smartphone className="h-4 w-4" />;
    if (/ipad|tablet/i.test(ua)) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getBrowserFromUA = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  };

  // ── Filtered Data ──
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (staffFilter !== 'all' && log.user_id !== staffFilter) return false;
      if (actionFilter !== 'all' && !log.action?.includes(actionFilter)) return false;
      if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;
      if (dateFrom && new Date(log.created_at) < startOfDay(new Date(dateFrom))) return false;
      if (dateTo && new Date(log.created_at) > endOfDay(new Date(dateTo))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (log.action?.toLowerCase().includes(q) || log.table_name?.toLowerCase().includes(q) || log.record_id?.toLowerCase().includes(q) || getStaffName(log.user_id).toLowerCase().includes(q));
      }
      return true;
    });
  }, [auditLogs, staffFilter, actionFilter, tableFilter, dateFrom, dateTo, searchQuery, staffProfiles]);

  const filteredLoginLogs = useMemo(() => {
    return loginLogs.filter(log => {
      if (loginStaffFilter !== 'all' && log.user_id !== loginStaffFilter) return false;
      if (loginEventFilter !== 'all') {
        if (loginEventFilter === 'success' && !log.success) return false;
        if (loginEventFilter === 'failed' && log.success) return false;
        if (loginEventFilter !== 'success' && loginEventFilter !== 'failed' && log.event_type !== loginEventFilter) return false;
      }
      return true;
    });
  }, [loginLogs, loginStaffFilter, loginEventFilter]);

  const uniqueActions = useMemo(() => [...new Set(auditLogs.map(l => l.action))].filter(Boolean).sort(), [auditLogs]);
  const uniqueTables = useMemo(() => [...new Set(auditLogs.map(l => l.table_name))].filter(Boolean).sort(), [auditLogs]);

  // ── Analytics ──
  const todayLogs = auditLogs.filter(l => isToday(new Date(l.created_at))).length;
  const yesterdayLogs = auditLogs.filter(l => isYesterday(new Date(l.created_at))).length;
  const todayGrowth = yesterdayLogs > 0 ? Math.round(((todayLogs - yesterdayLogs) / yesterdayLogs) * 100) : 0;
  const successLogins = loginLogs.filter(l => l.success).length;
  const failedLogins = loginLogs.filter(l => !l.success).length;
  const orderChangesToday = orderHistory.filter(l => isToday(new Date(l.created_at))).length;
  const activeStaffToday = new Set(auditLogs.filter(l => isToday(new Date(l.created_at))).map(l => l.user_id)).size;

  // Per-staff activity chart data
  const staffActivityData = useMemo(() => {
    const counts: Record<string, { name: string; actions: number; logins: number; orders: number }> = {};
    staffProfiles.forEach(s => {
      counts[s.id] = { name: s.full_name || s.email || 'Unknown', actions: 0, logins: 0, orders: 0 };
    });
    auditLogs.forEach(l => { if (l.user_id && counts[l.user_id]) counts[l.user_id].actions++; });
    loginLogs.forEach(l => { if (l.user_id && counts[l.user_id!]) counts[l.user_id!].logins++; });
    orderHistory.forEach(l => { if (l.changed_by && counts[l.changed_by]) counts[l.changed_by].orders++; });
    return Object.values(counts).filter(c => c.actions + c.logins + c.orders > 0).sort((a, b) => (b.actions + b.orders) - (a.actions + a.orders));
  }, [staffProfiles, auditLogs, loginLogs, orderHistory]);

  // Daily activity trend
  const dailyTrend = useMemo(() => {
    const days = parseInt(dateRange === 'all' ? '30' : dateRange);
    const trend: Record<string, { date: string; actions: number; logins: number }> = {};
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = format(subDays(new Date(), i), 'MM/dd');
      trend[d] = { date: d, actions: 0, logins: 0 };
    }
    auditLogs.forEach(l => {
      const d = format(new Date(l.created_at), 'MM/dd');
      if (trend[d]) trend[d].actions++;
    });
    loginLogs.forEach(l => {
      const d = format(new Date(l.created_at), 'MM/dd');
      if (trend[d]) trend[d].logins++;
    });
    return Object.values(trend).reverse();
  }, [auditLogs, loginLogs, dateRange]);

  // Action type distribution
  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach(l => {
      const key = l.action?.split('_')[0] || 'other';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: ACTION_LABELS[name] || name, value })).sort((a, b) => b.value - a.value);
  }, [auditLogs]);

  // Table distribution
  const tableDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach(l => {
      const key = l.table_name || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: TABLE_LABELS[name] || name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [auditLogs]);

  // Staff task performance
  const staffTaskPerformance = useMemo(() => {
    const perf: Record<string, { name: string; pending: number; in_progress: number; completed: number }> = {};
    staffProfiles.forEach(s => {
      perf[s.id] = { name: s.full_name || s.email || '?', pending: 0, in_progress: 0, completed: 0 };
    });
    taskStats.forEach((t: any) => {
      if (t.assigned_to && perf[t.assigned_to]) {
        if (t.status === 'pending') perf[t.assigned_to].pending++;
        else if (t.status === 'in_progress') perf[t.assigned_to].in_progress++;
        else if (t.status === 'completed') perf[t.assigned_to].completed++;
      }
    });
    return Object.values(perf).filter(p => p.pending + p.in_progress + p.completed > 0);
  }, [staffProfiles, taskStats]);

  // Hourly heatmap data
  const hourlyHeatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    auditLogs.forEach(l => {
      const h = new Date(l.created_at).getHours();
      hours[h].count++;
    });
    return hours;
  }, [auditLogs]);

  // Export
  const exportLogs = (data: any[], filename: string) => {
    if (!data.length) return;
    const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const isLoading = auditLoading || loginLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> স্টাফ অ্যাক্টিভিটি লগ</h1>
            <p className="text-muted-foreground mt-1">সকল স্টাফের কার্যকলাপ, লগইন ইতিহাস ও পারফরম্যান্স অ্যানালিটিক্স</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]"><Clock className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">আজ</SelectItem>
                <SelectItem value="7">৭ দিন</SelectItem>
                <SelectItem value="30">৩০ দিন</SelectItem>
                <SelectItem value="90">৯০ দিন</SelectItem>
                <SelectItem value="all">সব</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => { refetchAudit(); }}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl"><Activity className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{todayLogs}</p>
                <p className="text-xs text-muted-foreground">আজকের অ্যাকশন</p>
                {todayGrowth !== 0 && <p className={`text-[10px] font-medium ${todayGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>{todayGrowth > 0 ? '↑' : '↓'} {Math.abs(todayGrowth)}% গতকালের চেয়ে</p>}
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/20 rounded-xl"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{successLogins}</p>
                <p className="text-xs text-muted-foreground">সফল লগইন</p>
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/20 rounded-xl"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{failedLogins}</p>
                <p className="text-xs text-muted-foreground">ফেইলড লগইন</p>
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/20 rounded-xl"><ShoppingCart className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{orderChangesToday}</p>
                <p className="text-xs text-muted-foreground">অর্ডার পরিবর্তন</p>
              </div>
            </div>
          </CardContent></Card>

          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-xl"><User className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{activeStaffToday}</p>
                <p className="text-xs text-muted-foreground">আজ সক্রিয় স্টাফ</p>
              </div>
            </div>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যাক্টিভিটি</TabsTrigger>
            <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-1 hidden sm:inline" /> লগইন</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1 hidden sm:inline" /> অর্ডার</TabsTrigger>
            <TabsTrigger value="performance"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> পারফরম্যান্স</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যানালিটিক্স</TabsTrigger>
          </TabsList>

          {/* ═══ Activity Tab ═══ */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="সার্চ করুন..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Select value={staffFilter} onValueChange={setStaffFilter}>
                    <SelectTrigger className="w-[180px]"><User className="h-4 w-4 mr-1" /><SelectValue placeholder="স্টাফ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল স্টাফ</SelectItem>
                      {staffProfiles.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="অ্যাকশন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল অ্যাকশন</SelectItem>
                      {uniqueActions.map(a => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="টেবিল" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল মডিউল</SelectItem>
                      {uniqueTables.map(t => <SelectItem key={t!} value={t!}>{TABLE_LABELS[t!] || t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" className="w-[140px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <Input type="date" className="w-[140px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={() => exportLogs(filteredAuditLogs, 'staff-activity')}><Download className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">সময়</TableHead>
                      <TableHead>স্টাফ</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                      <TableHead>মডিউল</TableHead>
                      <TableHead>রেকর্ড</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>বিস্তারিত</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : filteredAuditLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">কোন লগ পাওয়া যায়নি</TableCell></TableRow>
                    ) : filteredAuditLogs.map(log => (
                      <TableRow key={log.id} className="group">
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss')}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: bn })}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={getStaffAvatar(log.user_id) || ''} />
                              <AvatarFallback className="text-[10px]">{getStaffName(log.user_id)[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium leading-tight">{getStaffName(log.user_id)}</p>
                              <Badge className={`text-[9px] px-1 py-0 ${ROLE_COLORS[getStaffRole(log.user_id)] || 'bg-muted'}`}>{getStaffRole(log.user_id)}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                        </TableCell>
                        <TableCell className="text-sm">{TABLE_LABELS[log.table_name || ''] || log.table_name}</TableCell>
                        <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip_address || '-'}</TableCell>
                        <TableCell>
                          {(log.old_values || log.new_values) && (
                            <Dialog>
                              <DialogTrigger asChild><Button variant="ghost" size="sm"><Eye className="h-3 w-3" /></Button></DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader><DialogTitle>পরিবর্তনের বিস্তারিত</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                    <Avatar className="h-8 w-8"><AvatarFallback>{getStaffName(log.user_id)[0]}</AvatarFallback></Avatar>
                                    <div>
                                      <p className="font-medium">{getStaffName(log.user_id)}</p>
                                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd MMMM yyyy, hh:mm:ss a', { locale: bn })} • IP: {log.ip_address || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium text-sm mb-2 text-red-600">আগের মান</h4>
                                      <pre className="text-xs bg-red-50 dark:bg-red-900/10 p-3 rounded-lg overflow-auto max-h-[400px] border">{JSON.stringify(log.old_values, null, 2) || 'N/A'}</pre>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm mb-2 text-green-600">নতুন মান</h4>
                                      <pre className="text-xs bg-green-50 dark:bg-green-900/10 p-3 rounded-lg overflow-auto max-h-[400px] border">{JSON.stringify(log.new_values, null, 2) || 'N/A'}</pre>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {filteredAuditLogs.length > 0 && (
                <div className="p-3 border-t text-xs text-muted-foreground text-center">
                  মোট {filteredAuditLogs.length}টি লগ দেখানো হচ্ছে
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═══ Login Tab ═══ */}
          <TabsContent value="login" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={loginStaffFilter} onValueChange={setLoginStaffFilter}>
                    <SelectTrigger className="w-[180px]"><User className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল স্টাফ</SelectItem>
                      {staffProfiles.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={loginEventFilter} onValueChange={setLoginEventFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ইভেন্ট</SelectItem>
                      <SelectItem value="success">সফল লগইন</SelectItem>
                      <SelectItem value="failed">ফেইলড লগইন</SelectItem>
                      <SelectItem value="logout">লগআউট</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => exportLogs(filteredLoginLogs, 'login-logs')}><Download className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>ইউজার</TableHead>
                      <TableHead>ইমেইল</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>ডিভাইস</TableHead>
                      <TableHead>ব্রাউজার</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoginLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">কোন লগ নেই</TableCell></TableRow>
                    ) : filteredLoginLogs.map(log => (
                      <TableRow key={log.id} className={!log.success ? 'bg-red-50/50 dark:bg-red-900/5' : ''}>
                        <TableCell className="text-xs">
                          <div>{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: bn })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{getStaffName(log.user_id)?.[0] || '?'}</AvatarFallback></Avatar>
                            <span className="text-sm">{getStaffName(log.user_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{log.email || '-'}</TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />সফল</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />ব্যর্থ</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getDeviceIcon(log.user_agent)}</TableCell>
                        <TableCell className="text-xs">{getBrowserFromUA(log.user_agent)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip_address || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ═══ Orders Tab ═══ */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">স্টাফ অর্ডার স্ট্যাটাস পরিবর্তন</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportLogs(orderHistory, 'order-changes')}><Download className="h-4 w-4 mr-1" />এক্সপোর্ট</Button>
              </CardHeader>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>স্টাফ</TableHead>
                      <TableHead>অর্ডার ID</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>নোট</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">কোন পরিবর্তন নেই</TableCell></TableRow>
                    ) : orderHistory.map(h => (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">
                          <div>{format(new Date(h.created_at), 'dd/MM/yy HH:mm')}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: bn })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{getStaffName(h.changed_by)?.[0] || '?'}</AvatarFallback></Avatar>
                            <span className="text-sm">{getStaffName(h.changed_by)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{h.order_id?.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            h.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            h.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            h.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                            h.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>{h.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{h.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ═══ Performance Tab ═══ */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Staff Activity Comparison */}
              <Card>
                <CardHeader><CardTitle className="text-base">স্টাফ কার্যকলাপ তুলনা</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="actions" name="অ্যাকশন" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="orders" name="অর্ডার" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="logins" name="লগইন" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Task Performance */}
              <Card>
                <CardHeader><CardTitle className="text-base">টাস্ক পারফরম্যান্স</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {staffTaskPerformance.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">কোন টাস্ক ডেটা নেই</p>
                    ) : staffTaskPerformance.map((s, i) => {
                      const total = s.pending + s.in_progress + s.completed;
                      const rate = total > 0 ? Math.round((s.completed / total) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground">{rate}% সম্পন্ন ({s.completed}/{total})</span>
                          </div>
                          <Progress value={rate} className="h-2" />
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="text-orange-600">পেন্ডিং: {s.pending}</span>
                            <span className="text-blue-600">চলমান: {s.in_progress}</span>
                            <span className="text-green-600">সম্পন্ন: {s.completed}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffProfiles.map(staff => {
                const staffLogs = auditLogs.filter(l => l.user_id === staff.id);
                const staffLogins = loginLogs.filter(l => l.user_id === staff.id && l.success);
                const staffOrders = orderHistory.filter(l => l.changed_by === staff.id);
                const lastLogin = staffLogins[0]?.created_at;
                const lastAction = staffLogs[0]?.created_at;
                return (
                  <Card key={staff.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={staff.avatar_url || ''} />
                          <AvatarFallback>{(staff.full_name || staff.email || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{staff.full_name || staff.email}</p>
                          <Badge className={`text-[10px] ${ROLE_COLORS[(staff as any).role] || 'bg-muted'}`}>{(staff as any).role}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-2">
                          <p className="text-lg font-bold text-blue-600">{staffLogs.length}</p>
                          <p className="text-[10px] text-muted-foreground">অ্যাকশন</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded p-2">
                          <p className="text-lg font-bold text-green-600">{staffLogins.length}</p>
                          <p className="text-[10px] text-muted-foreground">লগইন</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded p-2">
                          <p className="text-lg font-bold text-purple-600">{staffOrders.length}</p>
                          <p className="text-[10px] text-muted-foreground">অর্ডার</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>শেষ লগইন: {lastLogin ? formatDistanceToNow(new Date(lastLogin), { addSuffix: true, locale: bn }) : 'N/A'}</p>
                        <p>শেষ অ্যাকশন: {lastAction ? formatDistanceToNow(new Date(lastAction), { addSuffix: true, locale: bn }) : 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ═══ Analytics Tab ═══ */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Daily Trend */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">দৈনিক অ্যাক্টিভিটি ট্রেন্ড</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="actions" name="অ্যাকশন" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="logins" name="লগইন" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Action Distribution Pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">অ্যাকশন ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={actionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {actionDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-base">মডিউল ভিত্তিক কার্যকলাপ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tableDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="কার্যকলাপ" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hourly Heatmap */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">ঘন্টা ভিত্তিক কার্যকলাপ হিটম্যাপ</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {hourlyHeatmap.map((h, i) => {
                      const maxCount = Math.max(...hourlyHeatmap.map(x => x.count), 1);
                      const intensity = h.count / maxCount;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-1"
                          title={`${h.hour}: ${h.count}টি কার্যকলাপ`}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-medium transition-colors border"
                            style={{
                              backgroundColor: intensity > 0.7 ? '#22c55e' : intensity > 0.4 ? '#86efac' : intensity > 0.1 ? '#dcfce7' : 'transparent',
                              color: intensity > 0.5 ? 'white' : 'inherit',
                            }}
                          >
                            {h.count}
                          </div>
                          <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffActivity;
