import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, subDays, isToday, isYesterday, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
  Download, Search, Activity, Eye, Clock, User, Filter, ShoppingCart,
  LogIn, CheckCircle2, XCircle, BarChart3, TrendingUp, Loader2, RefreshCw,
  Monitor, Smartphone, Tablet, AlertTriangle, Zap, Timer, UserCheck,
  Shield, ArrowUpRight, ArrowDownRight, Minus, Wifi, WifiOff, Settings2, Save, Power
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ── Types ──
interface AuditLog {
  id: string; action: string; table_name: string | null; record_id: string | null;
  old_values: any; new_values: any; ip_address: string | null; user_id: string | null; created_at: string;
}
interface LoginLog {
  id: string; user_id: string | null; email: string | null; event_type: string;
  success: boolean; ip_address: string | null; user_agent: string | null; created_at: string;
}
interface OrderStatusHistory {
  id: string; order_id: string; status: string; notes: string | null; changed_by: string | null; created_at: string;
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
  super_admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  support: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'সুপার এডমিন', admin: 'এডমিন', manager: 'ম্যানেজার', support: 'সাপোর্ট',
};

// ── Active Sessions Panel ──
const ActiveSessionsPanel = ({ staffProfiles, getStaffName, getStaffRole, getDeviceIcon, getBrowserFromUA }: {
  staffProfiles: any[]; getStaffName: (id: string | null) => string; getStaffRole: (id: string | null) => string;
  getDeviceIcon: (ua: string | null) => React.ReactNode; getBrowserFromUA: (ua: string | null) => string;
}) => {
  const [editingTimeout, setEditingTimeout] = useState<Record<string, number>>({});
  const [savingTimeout, setSavingTimeout] = useState<string | null>(null);

  const { data: activeSessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('active_sessions').select('*').eq('is_active', true).order('last_activity_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const { data: logoutSettings = [], refetch: refetchSettings } = useQuery({
    queryKey: ['auto-logout-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('auto_logout_settings').select('*');
      return data || [];
    },
  });

  const getTimeoutForUser = (userId: string) => {
    const setting = logoutSettings.find((s: any) => s.user_id === userId);
    return setting?.timeout_minutes ?? 30;
  };

  const isTimeoutEnabled = (userId: string) => {
    const setting = logoutSettings.find((s: any) => s.user_id === userId);
    return setting?.is_enabled ?? true;
  };

  const getInactiveMinutes = (lastActivity: string) => {
    return Math.round((Date.now() - new Date(lastActivity).getTime()) / 60_000);
  };

  const getStatusColor = (lastActivity: string) => {
    const mins = getInactiveMinutes(lastActivity);
    if (mins < 5) return 'bg-green-500';
    if (mins < 15) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusText = (lastActivity: string) => {
    const mins = getInactiveMinutes(lastActivity);
    if (mins < 2) return 'এখন অ্যাক্টিভ';
    if (mins < 5) return `${mins} মিনিট আগে`;
    if (mins < 60) return `${mins} মিনিট নিষ্ক্রিয়`;
    return `${Math.floor(mins / 60)} ঘন্টা নিষ্ক্রিয়`;
  };

  const handleSaveTimeout = async (userId: string) => {
    setSavingTimeout(userId);
    const timeout = editingTimeout[userId] ?? getTimeoutForUser(userId);
    const existing = logoutSettings.find((s: any) => s.user_id === userId);
    if (existing) {
      await supabase.from('auto_logout_settings').update({ timeout_minutes: timeout, updated_at: new Date().toISOString() }).eq('user_id', userId);
    } else {
      await supabase.from('auto_logout_settings').insert({ user_id: userId, timeout_minutes: timeout, is_enabled: true });
    }
    await refetchSettings();
    setSavingTimeout(null);
    setEditingTimeout(prev => { const n = { ...prev }; delete n[userId]; return n; });
  };

  const handleToggleEnabled = async (userId: string) => {
    const existing = logoutSettings.find((s: any) => s.user_id === userId);
    if (existing) {
      await supabase.from('auto_logout_settings').update({ is_enabled: !(existing as any).is_enabled, updated_at: new Date().toISOString() }).eq('user_id', userId);
    } else {
      await supabase.from('auto_logout_settings').insert({ user_id: userId, timeout_minutes: 30, is_enabled: true });
    }
    await refetchSettings();
  };

  const handleForceLogout = async (sessionId: string) => {
    await supabase.from('active_sessions').update({ is_active: false, logged_out_at: new Date().toISOString() }).eq('id', sessionId);
    await refetchSessions();
  };

  return (
    <div className="space-y-4">
      {/* Active Now */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" /> বর্তমান অ্যাক্টিভ সেশন
              <Badge variant="secondary" className="text-xs">{activeSessions.length} জন</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> রিফ্রেশ
            </Button>
          </div>
          <CardDescription>কারা এখন লগইন করে আছেন এবং তাদের সর্বশেষ কার্যকলাপ</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <WifiOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>এই মুহূর্তে কেউ অ্যাক্টিভ নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session: any) => (
                <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-semibold">{getStaffName(session.user_id)?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${getStatusColor(session.last_activity_at)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{getStaffName(session.user_id)}</span>
                      {getStaffRole(session.user_id) && (
                        <Badge className={`text-[9px] ${ROLE_COLORS[getStaffRole(session.user_id)] || 'bg-muted'}`}>
                          {ROLE_LABELS[getStaffRole(session.user_id)] || getStaffRole(session.user_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">{getDeviceIcon(session.user_agent)} {getBrowserFromUA(session.user_agent)}</span>
                      <span>IP: {session.ip_address || 'N/A'}</span>
                      <span>লগইন: {format(new Date(session.logged_in_at), 'dd MMM, h:mm a', { locale: bn })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={`text-[10px] ${getInactiveMinutes(session.last_activity_at) < 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : getInactiveMinutes(session.last_activity_at) < 15 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {getStatusText(session.last_activity_at)}
                    </Badge>
                    <div className="mt-1.5">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => handleForceLogout(session.id)}>
                        <Power className="h-3 w-3 mr-1" /> ফোর্স লগআউট
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Logout Settings per User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> অটো লগআউট সেটিংস
          </CardTitle>
          <CardDescription>প্রতিটি ইউজারের জন্য আলাদা নিষ্ক্রিয়তার সময়সীমা নির্ধারণ করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>স্টাফ</TableHead>
                <TableHead>রোল</TableHead>
                <TableHead>টাইমআউট (মিনিট)</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffProfiles.map((staff: any) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">{staff.full_name || staff.email}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${ROLE_COLORS[staff.role] || 'bg-muted'}`}>
                      {ROLE_LABELS[staff.role] || staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      className="w-24 h-8 text-sm"
                      value={editingTimeout[staff.id] ?? getTimeoutForUser(staff.id)}
                      onChange={(e) => setEditingTimeout(prev => ({ ...prev, [staff.id]: parseInt(e.target.value) || 30 }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={isTimeoutEnabled(staff.id) ? 'default' : 'secondary'} className="text-[10px] cursor-pointer" onClick={() => handleToggleEnabled(staff.id)}>
                      {isTimeoutEnabled(staff.id) ? '✓ সক্রিয়' : '✗ নিষ্ক্রিয়'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSaveTimeout(staff.id)} disabled={savingTimeout === staff.id}>
                      {savingTimeout === staff.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      সেভ
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminStaffActivity = () => {
  const [staffFilter, setStaffFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('7');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loginStaffFilter, setLoginStaffFilter] = useState('all');
  const [loginEventFilter, setLoginEventFilter] = useState('all');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<string | null>(null);

  // ── Queries ──
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staff-profiles-activity'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds);
      return (profiles || []).map(p => ({ ...p, role: roles.find(r => r.user_id === p.id)?.role || 'unknown' }));
    },
  });

  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['staff-audit-logs', dateRange],
    queryFn: async () => {
      const staffIds = staffProfiles.map(s => s.id);
      if (!staffIds.length) return [];
      let query = supabase.from('admin_audit_logs').select('*').in('user_id', staffIds).order('created_at', { ascending: false }).limit(500);
      if (dateRange !== 'all') query = query.gte('created_at', subDays(new Date(), parseInt(dateRange)).toISOString());
      const { data } = await query;
      return (data || []) as AuditLog[];
    },
    enabled: staffProfiles.length > 0,
  });

  const { data: loginLogs = [], isLoading: loginLoading } = useQuery({
    queryKey: ['staff-login-logs', dateRange],
    queryFn: async () => {
      let query = supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(500);
      if (dateRange !== 'all') query = query.gte('created_at', subDays(new Date(), parseInt(dateRange)).toISOString());
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
      if (dateRange !== 'all') query = query.gte('created_at', subDays(new Date(), parseInt(dateRange)).toISOString());
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
      const { data } = await supabase.from('order_tasks').select('assigned_to, status, created_at, completed_at').in('assigned_to', staffIds);
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
  const getStaffAvatar = (userId: string | null) => staffProfiles.find(s => s.id === userId)?.avatar_url || null;
  const getStaffRole = (userId: string | null) => (staffProfiles.find(s => s.id === userId) as any)?.role || '';

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
      if (loginEventFilter === 'success' && !log.success) return false;
      if (loginEventFilter === 'failed' && log.success) return false;
      if (loginEventFilter !== 'all' && loginEventFilter !== 'success' && loginEventFilter !== 'failed' && log.event_type !== loginEventFilter) return false;
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

  // Suspicious activity detection
  const suspiciousActivities = useMemo(() => {
    const alerts: { type: string; message: string; severity: 'high' | 'medium' | 'low'; timestamp: string; userId: string | null }[] = [];

    // Multiple failed logins from same user
    const failedByUser: Record<string, number> = {};
    loginLogs.filter(l => !l.success && isToday(new Date(l.created_at))).forEach(l => {
      const key = l.email || l.user_id || 'unknown';
      failedByUser[key] = (failedByUser[key] || 0) + 1;
    });
    Object.entries(failedByUser).filter(([, c]) => c >= 3).forEach(([email, count]) => {
      alerts.push({ type: 'failed_login', message: `${email} - ${count}টি ব্যর্থ লগইন প্রচেষ্টা`, severity: 'high', timestamp: new Date().toISOString(), userId: null });
    });

    // Multiple IPs for same user in short time
    const ipsByUser: Record<string, Set<string>> = {};
    loginLogs.filter(l => l.success && l.user_id && l.ip_address).forEach(l => {
      if (!ipsByUser[l.user_id!]) ipsByUser[l.user_id!] = new Set();
      ipsByUser[l.user_id!].add(l.ip_address!);
    });
    Object.entries(ipsByUser).filter(([, ips]) => ips.size >= 3).forEach(([userId, ips]) => {
      alerts.push({ type: 'multi_ip', message: `${getStaffName(userId)} - ${ips.size}টি ভিন্ন IP থেকে লগইন`, severity: 'medium', timestamp: new Date().toISOString(), userId });
    });

    // Bulk delete operations
    const bulkDeletes = auditLogs.filter(l => l.action?.includes('delete') && isToday(new Date(l.created_at)));
    const deletesByUser: Record<string, number> = {};
    bulkDeletes.forEach(l => { if (l.user_id) deletesByUser[l.user_id] = (deletesByUser[l.user_id] || 0) + 1; });
    Object.entries(deletesByUser).filter(([, c]) => c >= 5).forEach(([userId, count]) => {
      alerts.push({ type: 'bulk_delete', message: `${getStaffName(userId)} - ${count}টি ডিলিট অপারেশন`, severity: 'medium', timestamp: new Date().toISOString(), userId });
    });

    // Late night activity (12am-5am)
    auditLogs.filter(l => {
      const h = new Date(l.created_at).getHours();
      return h >= 0 && h < 5 && isToday(new Date(l.created_at));
    }).forEach(l => {
      alerts.push({ type: 'late_night', message: `${getStaffName(l.user_id)} - রাত ${format(new Date(l.created_at), 'h:mm a')} এ অ্যাক্টিভ`, severity: 'low', timestamp: l.created_at, userId: l.user_id });
    });

    return alerts.slice(0, 10);
  }, [auditLogs, loginLogs, staffProfiles]);

  // Real-time feed (last 15 combined events)
  const realtimeFeed = useMemo(() => {
    const feed: { id: string; type: 'audit' | 'login' | 'order'; icon: string; text: string; time: string; userId: string | null }[] = [];
    auditLogs.slice(0, 10).forEach(l => feed.push({
      id: `a-${l.id}`, type: 'audit', icon: '📝',
      text: `${getStaffName(l.user_id)} → ${l.action} (${TABLE_LABELS[l.table_name || ''] || l.table_name})`,
      time: l.created_at, userId: l.user_id,
    }));
    loginLogs.slice(0, 5).forEach(l => feed.push({
      id: `l-${l.id}`, type: 'login', icon: l.success ? '🟢' : '🔴',
      text: `${l.email || getStaffName(l.user_id)} → ${l.success ? 'লগইন সফল' : 'লগইন ব্যর্থ'}`,
      time: l.created_at, userId: l.user_id,
    }));
    orderHistory.slice(0, 5).forEach(l => feed.push({
      id: `o-${l.id}`, type: 'order', icon: '📦',
      text: `${getStaffName(l.changed_by)} → অর্ডার ${l.status}`,
      time: l.created_at, userId: l.changed_by,
    }));
    return feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
  }, [auditLogs, loginLogs, orderHistory, staffProfiles]);

  // Staff activity data for charts
  const staffActivityData = useMemo(() => {
    const counts: Record<string, { name: string; actions: number; logins: number; orders: number }> = {};
    staffProfiles.forEach(s => { counts[s.id] = { name: s.full_name || s.email || '?', actions: 0, logins: 0, orders: 0 }; });
    auditLogs.forEach(l => { if (l.user_id && counts[l.user_id]) counts[l.user_id].actions++; });
    loginLogs.forEach(l => { if (l.user_id && counts[l.user_id!]) counts[l.user_id!].logins++; });
    orderHistory.forEach(l => { if (l.changed_by && counts[l.changed_by]) counts[l.changed_by].orders++; });
    return Object.values(counts).filter(c => c.actions + c.logins + c.orders > 0).sort((a, b) => (b.actions + b.orders) - (a.actions + a.orders));
  }, [staffProfiles, auditLogs, loginLogs, orderHistory]);

  const dailyTrend = useMemo(() => {
    const days = parseInt(dateRange === 'all' ? '30' : dateRange);
    const trend: Record<string, { date: string; actions: number; logins: number; orders: number }> = {};
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = format(subDays(new Date(), i), 'MM/dd');
      trend[d] = { date: d, actions: 0, logins: 0, orders: 0 };
    }
    auditLogs.forEach(l => { const d = format(new Date(l.created_at), 'MM/dd'); if (trend[d]) trend[d].actions++; });
    loginLogs.forEach(l => { const d = format(new Date(l.created_at), 'MM/dd'); if (trend[d]) trend[d].logins++; });
    orderHistory.forEach(l => { const d = format(new Date(l.created_at), 'MM/dd'); if (trend[d]) trend[d].orders++; });
    return Object.values(trend).reverse();
  }, [auditLogs, loginLogs, orderHistory, dateRange]);

  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach(l => { const key = l.action?.split('_')[0] || 'other'; counts[key] = (counts[key] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: ACTION_LABELS[name] || name, value })).sort((a, b) => b.value - a.value);
  }, [auditLogs]);

  const tableDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    auditLogs.forEach(l => { const key = l.table_name || 'unknown'; counts[key] = (counts[key] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: TABLE_LABELS[name] || name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [auditLogs]);

  const staffTaskPerformance = useMemo(() => {
    const perf: Record<string, { name: string; pending: number; in_progress: number; completed: number; avgTime: number }> = {};
    staffProfiles.forEach(s => { perf[s.id] = { name: s.full_name || s.email || '?', pending: 0, in_progress: 0, completed: 0, avgTime: 0 }; });
    const completionTimes: Record<string, number[]> = {};
    taskStats.forEach((t: any) => {
      if (t.assigned_to && perf[t.assigned_to]) {
        if (t.status === 'pending') perf[t.assigned_to].pending++;
        else if (t.status === 'in_progress') perf[t.assigned_to].in_progress++;
        else if (t.status === 'completed') {
          perf[t.assigned_to].completed++;
          if (t.created_at && t.completed_at) {
            if (!completionTimes[t.assigned_to]) completionTimes[t.assigned_to] = [];
            completionTimes[t.assigned_to].push(differenceInMinutes(new Date(t.completed_at), new Date(t.created_at)));
          }
        }
      }
    });
    Object.entries(completionTimes).forEach(([uid, times]) => {
      if (perf[uid] && times.length > 0) perf[uid].avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    });
    return Object.values(perf).filter(p => p.pending + p.in_progress + p.completed > 0);
  }, [staffProfiles, taskStats]);

  const hourlyHeatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    auditLogs.forEach(l => { hours[new Date(l.created_at).getHours()].count++; });
    return hours;
  }, [auditLogs]);

  // Staff radar chart data (multi-dimensional performance)
  const staffRadarData = useMemo(() => {
    return staffProfiles.map(s => {
      const logs = auditLogs.filter(l => l.user_id === s.id).length;
      const logins = loginLogs.filter(l => l.user_id === s.id && l.success).length;
      const orders = orderHistory.filter(l => l.changed_by === s.id).length;
      const tasks = taskStats.filter((t: any) => t.assigned_to === s.id && t.status === 'completed').length;
      return { name: s.full_name || s.email || '?', অ্যাকশন: logs, লগইন: logins, অর্ডার: orders, টাস্ক: tasks };
    }).filter(d => d.অ্যাকশন + d.লগইন + d.অর্ডার + d.টাস্ক > 0);
  }, [staffProfiles, auditLogs, loginLogs, orderHistory, taskStats]);

  // Peak hours calculation
  const peakHour = useMemo(() => {
    const max = hourlyHeatmap.reduce((prev, curr) => curr.count > prev.count ? curr : prev, hourlyHeatmap[0]);
    return max;
  }, [hourlyHeatmap]);

  // Avg actions per active staff
  const avgActionsPerStaff = activeStaffToday > 0 ? Math.round(todayLogs / activeStaffToday) : 0;

  const exportLogs = (data: any[], filename: string) => {
    if (!data.length) return;
    const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  const isLoading = auditLoading || loginLoading;

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" />অপরিবর্তিত</span>;
    return value > 0
      ? <span className="text-[10px] text-green-600 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{value}%</span>
      : <span className="text-[10px] text-red-600 flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{Math.abs(value)}%</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> স্টাফ অ্যাক্টিভিটি লগ</h1>
            <p className="text-muted-foreground mt-1">সকল স্টাফের কার্যকলাপ, লগইন ইতিহাস, সিকিউরিটি অ্যালার্ট ও পারফরম্যান্স</p>
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
            <Button variant="outline" size="icon" onClick={() => refetchAudit()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xl font-bold">{todayLogs}</p><p className="text-[10px] text-muted-foreground">আজকের অ্যাকশন</p><GrowthIndicator value={todayGrowth} /></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xl font-bold">{successLogins}</p><p className="text-[10px] text-muted-foreground">সফল লগইন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg"><XCircle className="h-4 w-4 text-red-600" /></div>
              <div><p className="text-xl font-bold">{failedLogins}</p><p className="text-[10px] text-muted-foreground">ফেইলড লগইন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg"><ShoppingCart className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xl font-bold">{orderChangesToday}</p><p className="text-[10px] text-muted-foreground">অর্ডার পরিবর্তন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><UserCheck className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xl font-bold">{activeStaffToday}</p><p className="text-[10px] text-muted-foreground">আজ সক্রিয়</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg"><Zap className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xl font-bold">{avgActionsPerStaff}</p><p className="text-[10px] text-muted-foreground">গড় অ্যাকশন/স্টাফ</p></div>
            </div>
          </CardContent></Card>
        </div>

        {/* Suspicious Activity Alerts + Real-time Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alerts */}
          <Card className={suspiciousActivities.length > 0 ? 'border-red-200 dark:border-red-800' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" /> সিকিউরিটি অ্যালার্ট
                {suspiciousActivities.length > 0 && <Badge variant="destructive" className="text-[10px]">{suspiciousActivities.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {suspiciousActivities.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">কোন সন্দেহজনক কার্যকলাপ নেই ✓</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suspiciousActivities.map((alert, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${
                        alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/10 border-red-200' :
                        alert.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' :
                        'bg-muted/50 border-border'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                          alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
                        }`} />
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {alert.type === 'failed_login' ? 'ব্রুটফোর্স প্রচেষ্টা' :
                             alert.type === 'multi_ip' ? 'মাল্টি-লোকেশন অ্যাক্সেস' :
                             alert.type === 'bulk_delete' ? 'বাল্ক ডিলিট অপারেশন' : 'অস্বাভাবিক সময়ে অ্যাক্সেস'}
                          </p>
                        </div>
                        <Badge className={`ml-auto shrink-0 text-[9px] ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                        }`}>{alert.severity === 'high' ? 'জরুরি' : alert.severity === 'medium' ? 'সতর্কতা' : 'তথ্য'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Real-time Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> লাইভ ফিড
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1.5">
                  {realtimeFeed.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded text-sm">
                      <span className="text-base">{item.icon}</span>
                      <span className="flex-1 truncate">{item.text}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: bn })}</span>
                    </div>
                  ))}
                  {realtimeFeed.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">কোন রিসেন্ট অ্যাক্টিভিটি নেই</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Tabs — 5 tabs */}
        <Tabs defaultValue="sessions">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sessions"><Wifi className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যাক্টিভ সেশন</TabsTrigger>
            <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-1 hidden sm:inline" /> লগইন ইতিহাস</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1 hidden sm:inline" /> অর্ডার লগ</TabsTrigger>
            <TabsTrigger value="performance"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> পারফরম্যান্স</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যানালিটিক্স</TabsTrigger>
          </TabsList>

          {/* ═══ Active Sessions Tab ═══ */}
          <TabsContent value="sessions" className="space-y-4">
            <ActiveSessionsPanel staffProfiles={staffProfiles} getStaffName={getStaffName} getStaffRole={getStaffRole} getDeviceIcon={getDeviceIcon} getBrowserFromUA={getBrowserFromUA} />
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
              <ScrollArea className="h-[500px]">
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
                          {log.success
                            ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />সফল</Badge>
                            : <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />ব্যর্থ</Badge>
                          }
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
              <ScrollArea className="h-[500px]">
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
                            h.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
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

              <Card>
                <CardHeader><CardTitle className="text-base">টাস্ক পারফরম্যান্স ও রেসপন্স টাইম</CardTitle></CardHeader>
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
                            <div className="flex items-center gap-2">
                              {s.avgTime > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Timer className="h-3 w-3" />গড় {s.avgTime < 60 ? `${s.avgTime} মি.` : `${Math.round(s.avgTime / 60)} ঘ.`}
                                </span>
                              )}
                              <span className="text-muted-foreground">{rate}%</span>
                            </div>
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
                const staffTasks = taskStats.filter((t: any) => t.assigned_to === staff.id);
                const completedTasks = staffTasks.filter((t: any) => t.status === 'completed').length;
                const totalTasks = staffTasks.length;
                const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const lastLogin = staffLogins[0]?.created_at;
                const lastAction = staffLogs[0]?.created_at;
                const uniqueIPs = new Set(staffLogins.map(l => (l as any).ip_address).filter(Boolean)).size;

                return (
                  <Card key={staff.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStaffDetail(staff.id)}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={staff.avatar_url || ''} />
                          <AvatarFallback>{(staff.full_name || staff.email || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{staff.full_name || staff.email}</p>
                          <Badge className={`text-[9px] ${ROLE_COLORS[(staff as any).role] || 'bg-muted'}`}>{ROLE_LABELS[(staff as any).role] || (staff as any).role}</Badge>
                        </div>
                        {isToday(new Date(lastAction || 0)) && <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" title="আজ সক্রিয়" />}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-1.5">
                          <p className="text-sm font-bold text-blue-600">{staffLogs.length}</p>
                          <p className="text-[9px] text-muted-foreground">অ্যাকশন</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded p-1.5">
                          <p className="text-sm font-bold text-green-600">{staffLogins.length}</p>
                          <p className="text-[9px] text-muted-foreground">লগইন</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded p-1.5">
                          <p className="text-sm font-bold text-purple-600">{staffOrders.length}</p>
                          <p className="text-[9px] text-muted-foreground">অর্ডার</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded p-1.5">
                          <p className="text-sm font-bold text-amber-600">{taskRate}%</p>
                          <p className="text-[9px] text-muted-foreground">টাস্ক</p>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <div className="flex justify-between"><span>শেষ লগইন</span><span>{lastLogin ? formatDistanceToNow(new Date(lastLogin), { addSuffix: true, locale: bn }) : 'N/A'}</span></div>
                        <div className="flex justify-between"><span>শেষ অ্যাকশন</span><span>{lastAction ? formatDistanceToNow(new Date(lastAction), { addSuffix: true, locale: bn }) : 'N/A'}</span></div>
                        <div className="flex justify-between"><span>ইউনিক IP</span><span>{uniqueIPs}টি</span></div>
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
              {/* Daily Trend with Area */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">দৈনিক অ্যাক্টিভিটি ট্রেন্ড</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="actions" name="অ্যাকশন" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="logins" name="লগইন" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="orders" name="অর্ডার" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Action Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-base">অ্যাকশন ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={actionDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {actionDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Module Distribution */}
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

              {/* Radar Chart */}
              {staffRadarData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">স্টাফ মাল্টি-ডাইমেনশন স্কোর</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={staffRadarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={{ fontSize: 9 }} />
                        <Radar name="স্কোর" dataKey="অ্যাকশন" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Hourly Heatmap */}
              <Card className={staffRadarData.length > 0 ? '' : 'lg:col-span-2'}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    ঘন্টা ভিত্তিক হিটম্যাপ
                    {peakHour && <Badge variant="outline" className="text-[10px] font-normal">পিক: {peakHour.hour} ({peakHour.count}টি)</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {hourlyHeatmap.map((h, i) => {
                      const maxCount = Math.max(...hourlyHeatmap.map(x => x.count), 1);
                      const intensity = h.count / maxCount;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1" title={`${h.hour}: ${h.count}টি`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-medium border transition-colors"
                            style={{
                              backgroundColor: intensity > 0.7 ? 'hsl(var(--primary))' : intensity > 0.4 ? 'hsl(var(--primary) / 0.4)' : intensity > 0.1 ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                              color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'inherit',
                            }}>
                            {h.count}
                          </div>
                          <span className="text-[8px] text-muted-foreground">{h.hour}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Staff Detail Dialog */}
        <Dialog open={!!selectedStaffDetail} onOpenChange={() => setSelectedStaffDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>স্টাফ বিস্তারিত অ্যাক্টিভিটি</DialogTitle></DialogHeader>
            {selectedStaffDetail && (() => {
              const staff = staffProfiles.find(s => s.id === selectedStaffDetail);
              if (!staff) return null;
              const staffLogs = auditLogs.filter(l => l.user_id === staff.id);
              const staffLogins = loginLogs.filter(l => l.user_id === staff.id);
              const staffOrders = orderHistory.filter(l => l.changed_by === staff.id);
              const recentActions = staffLogs.slice(0, 10);
              const recentLogins = staffLogins.slice(0, 5);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={staff.avatar_url || ''} />
                      <AvatarFallback className="text-lg">{(staff.full_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{staff.full_name || staff.email}</p>
                      <Badge className={ROLE_COLORS[(staff as any).role] || 'bg-muted'}>{ROLE_LABELS[(staff as any).role] || (staff as any).role}</Badge>
                    </div>
                    <div className="ml-auto text-right text-sm text-muted-foreground">
                      <p>{staffLogs.length} অ্যাকশন • {staffLogins.filter(l => l.success).length} লগইন</p>
                      <p>{staffOrders.length} অর্ডার পরিবর্তন</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">সাম্প্রতিক অ্যাকশন</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {recentActions.map(log => (
                          <div key={log.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded text-sm">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                            <span className="text-muted-foreground">{TABLE_LABELS[log.table_name || ''] || log.table_name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: bn })}</span>
                          </div>
                        ))}
                        {recentActions.length === 0 && <p className="text-center text-muted-foreground py-4">কোন অ্যাকশন নেই</p>}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-sm mb-2">সাম্প্রতিক লগইন</h4>
                    <div className="space-y-1">
                      {recentLogins.map(log => (
                        <div key={log.id} className="flex items-center gap-2 p-2 text-sm">
                          {log.success ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                          <span>{log.success ? 'সফল' : 'ব্যর্থ'}</span>
                          <span className="text-muted-foreground">• {getBrowserFromUA(log.user_agent)} • {log.ip_address || 'N/A'}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                        </div>
                      ))}
                      {recentLogins.length === 0 && <p className="text-center text-muted-foreground py-4">কোন লগইন নেই</p>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffActivity;
