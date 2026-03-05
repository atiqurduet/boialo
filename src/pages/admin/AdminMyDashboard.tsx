import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, ListChecks, Loader2, RefreshCw, Target,
  TrendingUp, AlertTriangle, BarChart3, User, Eye, EyeOff, Play, Pause,
  ArrowUpRight, ArrowRight, Zap, Calendar, Timer, Award,
  ShieldCheck, Users, ChevronRight, Circle, Package,
  MessageSquarePlus, Bell, BellRing, Send, Pin, PinOff, Trash2,
  Mail, MailOpen, AlertCircle, Megaphone, Lock
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { format, formatDistanceToNow, isToday, differenceInMinutes, subDays, startOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  urgent: { label: 'জরুরি', color: 'bg-red-500 text-white', icon: '🔴' },
  high: { label: 'উচ্চ', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🟠' },
  medium: { label: 'মাঝারি', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '🟡' },
  low: { label: 'নিম্ন', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '🟢' },
};

const MSG_PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  emergency: { label: 'ইমার্জেন্সি', color: 'text-red-600', icon: <AlertCircle className="h-4 w-4 text-red-500" />, bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' },
  urgent: { label: 'জরুরি', color: 'text-orange-600', icon: <BellRing className="h-4 w-4 text-orange-500" />, bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800' },
  normal: { label: 'সাধারণ', color: 'text-blue-600', icon: <Bell className="h-4 w-4 text-blue-500" />, bgColor: 'bg-background border' },
  info: { label: 'তথ্য', color: 'text-muted-foreground', icon: <Mail className="h-4 w-4 text-muted-foreground" />, bgColor: 'bg-muted/30 border' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'পেন্ডিং', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
  in_progress: { label: 'প্রসেসিং', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
  completed: { label: 'সম্পন্ন', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
};

const TASK_TYPES: Record<string, string> = {
  order_processing: '📦 অর্ডার প্রসেসিং',
  payment_collection: '💰 পেমেন্ট কালেকশন',
  courier_booking: '🚚 কুরিয়ার বুকিং',
  delivery_followup: '📞 ডেলিভারি ফলোআপ',
  customer_support: '🎧 কাস্টমার সাপোর্ট',
  return_handling: '🔄 রিটার্ন হ্যান্ডলিং',
  refund_processing: '💸 রিফান্ড প্রসেসিং',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  support: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'সুপার এডমিন', admin: 'এডমিন', manager: 'ম্যানেজার', support: 'সাপোর্ট',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ═══════════════════════════════════════════════
// Staff Personal Task Card
// ═══════════════════════════════════════════════
const TaskCard = ({ task, onStatusChange, isChanging }: { task: any; onStatusChange: (id: string, status: string) => void; isChanging: boolean }) => {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className={`border rounded-xl p-4 transition-all hover:shadow-md ${status.bgColor} ${isOverdue ? 'ring-2 ring-red-400' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : task.status === 'in_progress' ? (
            <Play className="h-5 w-5 text-blue-500 fill-blue-500" />
          ) : (
            <Circle className="h-5 w-5 text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{task.title}</h3>
            {isOverdue && <Badge variant="destructive" className="text-[9px]">ওভারডিউ</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`text-[9px] ${priority.color}`}>{priority.icon} {priority.label}</Badge>
            <span className="text-[10px] text-muted-foreground">{TASK_TYPES[task.task_type] || task.task_type}</span>
          </div>
          {task.orders?.order_number && (
            <p className="text-[11px] text-muted-foreground mt-1">অর্ডার: #{task.orders.order_number}</p>
          )}
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(task.created_at), 'dd MMM, h:mm a', { locale: bn })}</span>
            {task.due_date && <span className="flex items-center gap-1"><Timer className="h-3 w-3" />ডিউ: {format(new Date(task.due_date), 'dd MMM', { locale: bn })}</span>}
          </div>
        </div>
        <div className="shrink-0">
          {task.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(task.id, 'in_progress')} disabled={isChanging}>
              <Play className="h-3 w-3 mr-1" /> শুরু
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => onStatusChange(task.id, 'completed')} disabled={isChanging}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> সম্পন্ন
            </Button>
          )}
          {task.status === 'completed' && task.completed_at && (
            <span className="text-[10px] text-green-600">{formatDistanceToNow(new Date(task.completed_at), { addSuffix: true, locale: bn })}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Super Admin: Staff Performance Card
// ═══════════════════════════════════════════════
const StaffPerformanceCard = ({ staff, onClick }: { staff: any; onClick: () => void }) => {
  const totalTasks = staff.pending + staff.in_progress + staff.completed;
  const completionRate = totalTasks > 0 ? Math.round((staff.completed / totalTasks) * 100) : 0;

  return (
    <div className="border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all hover:border-primary/50" onClick={onClick}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
            {(staff.name || '?').charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{staff.name}</h3>
          <Badge className={`text-[9px] ${ROLE_COLORS[staff.role] || ''}`}>{ROLE_LABELS[staff.role] || staff.role}</Badge>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{completionRate}%</div>
          <p className="text-[9px] text-muted-foreground">সম্পন্ন হার</p>
        </div>
      </div>
      <Progress value={completionRate} className="h-2 mb-3" />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2">
          <p className="text-lg font-bold text-amber-600">{staff.pending}</p>
          <p className="text-[9px] text-muted-foreground">পেন্ডিং</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-600">{staff.in_progress}</p>
          <p className="text-[9px] text-muted-foreground">প্রসেসিং</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
          <p className="text-lg font-bold text-green-600">{staff.completedToday}</p>
          <p className="text-[9px] text-muted-foreground">আজ সম্পন্ন</p>
        </div>
      </div>
      {staff.avgTime > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Timer className="h-3 w-3" /> গড় সময়: {staff.avgTime} মিনিট
        </p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Message Card Component
// ═══════════════════════════════════════════════
const MessageCard = ({ msg, currentUserId, senderName, onMarkRead, onPin, onDelete }: {
  msg: any; currentUserId: string; senderName: string;
  onMarkRead: (id: string) => void; onPin: (id: string, pinned: boolean) => void; onDelete: (id: string) => void;
}) => {
  const config = MSG_PRIORITY_CONFIG[msg.priority] || MSG_PRIORITY_CONFIG.normal;
  const isMine = msg.sender_id === currentUserId;
  const isUnread = !msg.is_read && msg.recipient_id === currentUserId;

  return (
    <div className={`border rounded-xl p-4 transition-all ${config.bgColor} ${isUnread ? 'ring-2 ring-primary/50 shadow-md' : ''} ${msg.is_pinned ? 'border-amber-400 dark:border-amber-600' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {msg.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
            <h3 className="font-semibold text-sm">{msg.subject}</h3>
            <Badge className={`text-[9px] ${msg.priority === 'emergency' ? 'bg-red-500 text-white animate-pulse' : msg.priority === 'urgent' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {config.label}
            </Badge>
            {isUnread && <Badge variant="destructive" className="text-[9px]">নতুন</Badge>}
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{msg.message}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>{isMine ? 'আপনি পাঠিয়েছেন' : `প্রেরক: ${senderName}`}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: bn })}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {isUnread && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMarkRead(msg.id)} title="পড়া হয়েছে">
              <MailOpen className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPin(msg.id, !msg.is_pinned)} title={msg.is_pinned ? 'আনপিন' : 'পিন'}>
            {msg.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          {isMine && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(msg.id)} title="মুছুন">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
const AdminMyDashboard = () => {
  const { user } = useAuth();
  const { role, isSuperAdmin } = useAdminAuth();
  const isAdminOrSuper = role === 'super_admin' || role === 'admin';
  const queryClient = useQueryClient();
  const [changingTaskId, setChangingTaskId] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');

  // Message compose state
  const [showCompose, setShowCompose] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState('all');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgPriority, setMsgPriority] = useState('normal');
  const [isSending, setIsSending] = useState(false);

  // ── My Tasks ──
  const { data: myTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['my-dashboard-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('order_tasks')
        .select('*, orders(order_number, status, total)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // ── My Messages ──
  const { data: myMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['my-staff-messages', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('staff_messages')
        .select('*')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // ── All Staff Tasks (Super Admin) ──
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-staff-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_tasks')
        .select('*, orders(order_number, status, total)')
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // ── Staff Profiles ──
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['dashboard-staff-profiles'],
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
    enabled: !!user,
  });

  // ── My Audit Logs (recent) ──
  const { data: myRecentActivity = [] } = useQuery({
    queryKey: ['my-recent-activity', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);
      return data || [];
    },
    enabled: !!user,
  });

  // ── Realtime messages ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('staff-messages-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        refetchMessages();
        const p = payload.new as any;
        const pri = MSG_PRIORITY_CONFIG[p.priority];
        toast(p.subject, { description: p.message?.slice(0, 60), icon: p.priority === 'emergency' ? '🚨' : '📩' });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Status change mutation ──
  const statusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      setChangingTaskId(taskId);
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('order_tasks').update(updates).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('টাস্ক আপডেট হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['my-dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-staff-tasks'] });
      setChangingTaskId(null);
    },
    onError: (err: Error) => { toast.error(err.message); setChangingTaskId(null); },
  });

  // ── Send message ──
  const sendMessage = async () => {
    if (!user || !msgSubject.trim() || !msgBody.trim()) {
      toast.error('বিষয় এবং বার্তা পূরণ করুন');
      return;
    }
    setIsSending(true);
    try {
      if (msgRecipient === 'all') {
        // Send to all staff except self
        const recipients = staffProfiles.filter((s: any) => s.id !== user.id);
        if (recipients.length === 0) { toast.error('কোনো স্টাফ পাওয়া যায়নি'); return; }
        const rows = recipients.map((s: any) => ({
          sender_id: user.id,
          recipient_id: s.id,
          subject: msgSubject.trim(),
          message: msgBody.trim(),
          priority: msgPriority,
        }));
        const { error } = await supabase.from('staff_messages').insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_messages').insert({
          sender_id: user.id,
          recipient_id: msgRecipient,
          subject: msgSubject.trim(),
          message: msgBody.trim(),
          priority: msgPriority,
        });
        if (error) throw error;
      }
      toast.success('বার্তা পাঠানো হয়েছে');
      setShowCompose(false);
      setMsgSubject('');
      setMsgBody('');
      setMsgPriority('normal');
      setMsgRecipient('all');
      refetchMessages();
    } catch (err: any) {
      toast.error(err.message || 'বার্তা পাঠানো যায়নি');
    } finally {
      setIsSending(false);
    }
  };

  // ── Mark read ──
  const markAsRead = async (id: string) => {
    await supabase.from('staff_messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    refetchMessages();
  };

  // ── Pin/unpin ──
  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from('staff_messages').update({ is_pinned: pinned }).eq('id', id);
    refetchMessages();
  };

  // ── Delete ──
  const deleteMessage = async (id: string) => {
    await supabase.from('staff_messages').delete().eq('id', id);
    refetchMessages();
    toast.success('বার্তা মুছে ফেলা হয়েছে');
  };

  // ── Derived Stats ──
  const myPending = myTasks.filter(t => t.status === 'pending');
  const myInProgress = myTasks.filter(t => t.status === 'in_progress');
  const myCompletedToday = myTasks.filter(t => t.status === 'completed' && t.completed_at && isToday(new Date(t.completed_at)));
  const myCompleted = myTasks.filter(t => t.status === 'completed');
  const myOverdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
  const myCompletionRate = myTasks.length > 0 ? Math.round((myCompleted.length / myTasks.length) * 100) : 0;
  const unreadCount = myMessages.filter(m => !m.is_read && m.recipient_id === user?.id).length;

  const myAvgCompletionTime = useMemo(() => {
    const times = myCompleted
      .filter(t => t.completed_at && t.created_at)
      .map(t => differenceInMinutes(new Date(t.completed_at), new Date(t.created_at)));
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }, [myCompleted]);

  // ── Super Admin: Staff Performance ──
  const staffPerformance = useMemo(() => {
    if (!isSuperAdmin) return [];
    const today = startOfDay(new Date());
    return staffProfiles.map((s: any) => {
      const tasks = allTasks.filter((t: any) => t.assigned_to === s.id);
      const completedTasks = tasks.filter((t: any) => t.status === 'completed');
      const completionTimes = completedTasks
        .filter((t: any) => t.completed_at && t.created_at)
        .map((t: any) => differenceInMinutes(new Date(t.completed_at), new Date(t.created_at)));
      return {
        id: s.id,
        name: s.full_name || s.email || '?',
        role: s.role,
        pending: tasks.filter((t: any) => t.status === 'pending').length,
        in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
        completed: completedTasks.length,
        completedToday: completedTasks.filter((t: any) => t.completed_at && new Date(t.completed_at) >= today).length,
        overdue: tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
        avgTime: completionTimes.length > 0 ? Math.round(completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length) : 0,
        total: tasks.length,
      };
    }).filter(s => s.total > 0).sort((a, b) => (b.completedToday + b.in_progress) - (a.completedToday + a.in_progress));
  }, [isSuperAdmin, staffProfiles, allTasks]);

  // ── Super Admin: Daily Trend ──
  const dailyTrend = useMemo(() => {
    if (!isSuperAdmin) return [];
    const days: Record<string, { date: string; completed: number; created: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'dd/MM');
      days[d] = { date: d, completed: 0, created: 0 };
    }
    allTasks.forEach((t: any) => {
      const d = format(new Date(t.created_at), 'dd/MM');
      if (days[d]) days[d].created++;
      if (t.status === 'completed' && t.completed_at) {
        const cd = format(new Date(t.completed_at), 'dd/MM');
        if (days[cd]) days[cd].completed++;
      }
    });
    return Object.values(days);
  }, [isSuperAdmin, allTasks]);

  // ── Super Admin: Task Type Distribution ──
  const taskTypeDist = useMemo(() => {
    if (!isSuperAdmin) return [];
    const counts: Record<string, number> = {};
    allTasks.forEach((t: any) => {
      counts[t.task_type] = (counts[t.task_type] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: TASK_TYPES[key]?.replace(/^.+\s/, '') || key,
      value,
    })).sort((a, b) => b.value - a.value);
  }, [isSuperAdmin, allTasks]);

  // Filtered tasks for my view
  const filteredMyTasks = useMemo(() => {
    return myTasks.filter(t => {
      if (taskStatusFilter === 'pending') return t.status === 'pending';
      if (taskStatusFilter === 'in_progress') return t.status === 'in_progress';
      if (taskStatusFilter === 'completed') return t.status === 'completed';
      if (taskStatusFilter === 'overdue') return t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
      return true;
    });
  }, [myTasks, taskStatusFilter]);

  // Selected staff detail tasks
  const selectedStaffTasks = useMemo(() => {
    if (!selectedStaffId) return [];
    return allTasks.filter((t: any) => t.assigned_to === selectedStaffId);
  }, [selectedStaffId, allTasks]);

  const getStaffName = (id: string) => {
    const s = staffProfiles.find((s: any) => s.id === id);
    return s?.full_name || s?.email || id.slice(0, 8);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              {isSuperAdmin ? 'টাস্ক ড্যাশবোর্ড — সুপার এডমিন' : 'আমার টাস্ক ড্যাশবোর্ড'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin
                ? 'সকল স্টাফের টাস্ক, পারফরম্যান্স এবং কার্যকলাপ ট্র্যাকিং'
                : 'আজকের টাস্ক, অগ্রগতি এবং কার্যকলাপ'}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdminOrSuper && (
              <Button onClick={() => setShowCompose(true)} className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white">
                <MessageSquarePlus className="h-4 w-4 mr-1" /> বার্তা পাঠান
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { refetchTasks(); refetchMessages(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ
            </Button>
          </div>
        </div>

        {/* Emergency Messages Banner */}
        {myMessages.filter(m => !m.is_read && m.recipient_id === user?.id && (m.priority === 'emergency' || m.priority === 'urgent')).length > 0 && (
          <Card className="border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/10 animate-pulse">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                আপনার {myMessages.filter(m => !m.is_read && m.recipient_id === user?.id && (m.priority === 'emergency' || m.priority === 'urgent')).length}টি জরুরি/ইমার্জেন্সি বার্তা আছে — নিচে "বার্তা" ট্যাবে দেখুন
              </p>
            </CardContent>
          </Card>
        )}

        {/* ═══ My Stats ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
                <div><p className="text-xl font-bold">{myPending.length}</p><p className="text-[10px] text-muted-foreground">পেন্ডিং</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Play className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{myInProgress.length}</p><p className="text-[10px] text-muted-foreground">চলমান</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                <div><p className="text-xl font-bold">{myCompletedToday.length}</p><p className="text-[10px] text-muted-foreground">আজ সম্পন্ন</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className={myOverdue.length > 0 ? 'border-red-300 dark:border-red-700' : ''}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
                <div><p className="text-xl font-bold">{myOverdue.length}</p><p className="text-[10px] text-muted-foreground">ওভারডিউ</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
                <div><p className="text-xl font-bold">{myCompletionRate}%</p><p className="text-[10px] text-muted-foreground">সম্পন্ন হার</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className={unreadCount > 0 ? 'border-red-300 dark:border-red-700' : ''}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${unreadCount > 0 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                  <BellRing className={`h-4 w-4 ${unreadCount > 0 ? 'text-red-600' : 'text-purple-600'}`} />
                </div>
                <div><p className="text-xl font-bold">{unreadCount}</p><p className="text-[10px] text-muted-foreground">অপঠিত বার্তা</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="my-tasks">
          <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <TabsTrigger value="my-tasks"><ListChecks className="h-4 w-4 mr-1 hidden sm:inline" /> আমার টাস্ক</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              <Megaphone className="h-4 w-4 mr-1 hidden sm:inline" /> বার্তা
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-activity"><Zap className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যাক্টিভিটি</TabsTrigger>
            <TabsTrigger value="change-password"><ShieldCheck className="h-4 w-4 mr-1 hidden sm:inline" /> পাসওয়ার্ড</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="team"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> টিম</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> অ্যানালিটিক্স</TabsTrigger>}
          </TabsList>

          {/* ═══ My Tasks Tab ═══ */}
          <TabsContent value="my-tasks" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5">
                {[
                  { val: 'all', label: 'সব', count: myTasks.length },
                  { val: 'pending', label: 'পেন্ডিং', count: myPending.length },
                  { val: 'in_progress', label: 'চলমান', count: myInProgress.length },
                  { val: 'completed', label: 'সম্পন্ন', count: myCompleted.length },
                  { val: 'overdue', label: 'ওভারডিউ', count: myOverdue.length },
                ].map(f => (
                  <Button
                    key={f.val}
                    size="sm"
                    variant={taskStatusFilter === f.val ? 'default' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => setTaskStatusFilter(f.val)}
                  >
                    {f.label} <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">{f.count}</Badge>
                  </Button>
                ))}
              </div>
            </div>
            {tasksLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredMyTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-50" />
                  <h3 className="font-semibold text-lg mb-1">
                    {taskStatusFilter === 'all' ? 'কোনো টাস্ক নেই' : `কোনো ${STATUS_CONFIG[taskStatusFilter]?.label || ''} টাস্ক নেই`}
                  </h3>
                  <p className="text-sm text-muted-foreground">নতুন টাস্ক অ্যাসাইন হলে এখানে দেখা যাবে</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredMyTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, newStatus: status })}
                    isChanging={changingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ Messages Tab ═══ */}
          <TabsContent value="messages" className="space-y-4">
            {isAdminOrSuper && (
              <div className="flex justify-end">
                <Button onClick={() => setShowCompose(true)} size="sm">
                  <MessageSquarePlus className="h-4 w-4 mr-1" /> নতুন বার্তা
                </Button>
              </div>
            )}
            {myMessages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h3 className="font-semibold text-lg mb-1">কোনো বার্তা নেই</h3>
                  <p className="text-sm text-muted-foreground">নতুন বার্তা আসলে এখানে দেখা যাবে</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myMessages.map(msg => (
                  <MessageCard
                    key={msg.id}
                    msg={msg}
                    currentUserId={user?.id || ''}
                    senderName={getStaffName(msg.sender_id)}
                    onMarkRead={markAsRead}
                    onPin={togglePin}
                    onDelete={deleteMessage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ My Activity Tab ═══ */}
          <TabsContent value="my-activity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> সাম্প্রতিক কার্যকলাপ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {myRecentActivity.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 border">
                          <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                            <Package className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {log.table_name && <span className="font-medium">{log.table_name}</span>}
                              {log.record_id && <span> • ID: {log.record_id.slice(0, 8)}</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: bn })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {myRecentActivity.length === 0 && (
                        <p className="text-center text-muted-foreground py-8 text-sm">কোনো কার্যকলাপ নেই</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> পারফরম্যান্স সারাংশ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl">
                      <p className="text-5xl font-bold text-primary">{myCompletionRate}%</p>
                      <p className="text-sm text-muted-foreground mt-1">সামগ্রিক সম্পন্ন হার</p>
                      <Progress value={myCompletionRate} className="h-2 mt-3" />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{myCompleted.length}</p>
                        <p className="text-[10px] text-muted-foreground">মোট সম্পন্ন</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{myTasks.length}</p>
                        <p className="text-[10px] text-muted-foreground">মোট টাস্ক</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{myAvgCompletionTime}</p>
                        <p className="text-[10px] text-muted-foreground">গড় মিনিট</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{myCompletedToday.length}</p>
                        <p className="text-[10px] text-muted-foreground">আজ সম্পন্ন</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ Change Password Tab ═══ */}
          <TabsContent value="change-password" className="space-y-4">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> পাসওয়ার্ড পরিবর্তন করুন
                </CardTitle>
                <CardDescription>আপনার বর্তমান পাসওয়ার্ড দিয়ে নতুন পাসওয়ার্ড সেট করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </TabsContent>


          {isSuperAdmin && (
            <TabsContent value="team" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffPerformance.map(staff => (
                  <StaffPerformanceCard
                    key={staff.id}
                    staff={staff}
                    onClick={() => setSelectedStaffId(staff.id)}
                  />
                ))}
                {staffPerformance.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center text-muted-foreground">কোনো স্টাফ টাস্ক ডেটা নেই</CardContent>
                  </Card>
                )}
              </div>
              <Dialog open={!!selectedStaffId} onOpenChange={(open) => !open && setSelectedStaffId(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" /> {selectedStaffId ? getStaffName(selectedStaffId) : ''} — টাস্ক বিস্তারিত
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-3 pr-2">
                      {selectedStaffTasks.map((task: any) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, newStatus: status })}
                          isChanging={changingTaskId === task.id}
                        />
                      ))}
                      {selectedStaffTasks.length === 0 && <p className="text-center text-muted-foreground py-6">কোনো টাস্ক নেই</p>}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* ═══ Analytics (Super Admin) ═══ */}
          {isSuperAdmin && (
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">৭ দিনের টাস্ক ট্রেন্ড</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyTrend}>
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="created" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="তৈরি" />
                        <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="সম্পন্ন" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">টাস্ক টাইপ বণ্টন</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {taskTypeDist.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={taskTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {taskTypeDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-12">ডেটা নেই</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">স্টাফ তুলনা</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={staffPerformance.map(s => ({
                        name: s.name.split(' ')[0] || '?',
                        পেন্ডিং: s.pending,
                        চলমান: s.in_progress,
                        'আজ সম্পন্ন': s.completedToday,
                        মোট: s.completed,
                      }))}>
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="পেন্ডিং" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="চলমান" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="আজ সম্পন্ন" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ═══ Compose Message Dialog ═══ */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" /> স্টাফকে বার্তা পাঠান
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">প্রাপক</label>
              <Select value={msgRecipient} onValueChange={setMsgRecipient}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 সকল স্টাফ</SelectItem>
                  {staffProfiles.filter((s: any) => s.id !== user?.id).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email} ({ROLE_LABELS[s.role] || s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">প্রায়োরিটি</label>
              <Select value={msgPriority} onValueChange={setMsgPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">🚨 ইমার্জেন্সি — তাৎক্ষণিক প্রয়োজন</SelectItem>
                  <SelectItem value="urgent">🔔 জরুরি</SelectItem>
                  <SelectItem value="normal">📩 সাধারণ</SelectItem>
                  <SelectItem value="info">ℹ️ তথ্য / নোট</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">বিষয়</label>
              <Input
                placeholder="বার্তার বিষয় লিখুন..."
                value={msgSubject}
                onChange={e => setMsgSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">বার্তা</label>
              <Textarea
                placeholder="বিস্তারিত বার্তা লিখুন..."
                rows={4}
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>বাতিল</Button>
            <Button onClick={sendMessage} disabled={isSending} className={msgPriority === 'emergency' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMyDashboard;

// ═══════════════════════════════════════════════
// Change Password Form Component
// ═══════════════════════════════════════════════
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('সব ফিল্ড পূরণ করুন');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('পাসওয়ার্ড মিলছে না');
      return;
    }

    setLoading(true);
    try {
      // Verify current password by attempting sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('বর্তমান পাসওয়ার্ড ভুল');
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">বর্তমান পাসওয়ার্ড</label>
        <div className="relative">
          <Input
            type={showCurrent ? 'text' : 'password'}
            placeholder="বর্তমান পাসওয়ার্ড দিন"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">নতুন পাসওয়ার্ড</label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            placeholder="কমপক্ষে ৬ অক্ষর"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={loading}
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">পাসওয়ার্ড নিশ্চিত করুন</label>
        <Input
          type="password"
          placeholder="আবার নতুন পাসওয়ার্ড দিন"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />পরিবর্তন হচ্ছে...</> : <><Lock className="h-4 w-4 mr-2" />পাসওয়ার্ড পরিবর্তন করুন</>}
      </Button>
    </form>
  );
};
