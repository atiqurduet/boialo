import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Zap, ShoppingCart, Gift, UserPlus, Clock, Star, TrendingUp,
  Mail, Smartphone, Play, Pause, Plus, Edit, Trash2, Eye,
  BarChart3, Target, Users, RefreshCw, ArrowRight, Loader2,
  CheckCircle2, XCircle, Send, Copy, Settings,
  Sparkles, Heart, Package, Megaphone, CalendarDays,
  FlaskConical, Filter, Calendar, Layers, DollarSign,
  GitBranch, Workflow, ArrowDown, AlertTriangle, TrendingDown,
  RotateCcw, Ban, MousePointerClick, Percent, Hash, Globe,
  Smartphone as PhoneIcon, BellRing, Repeat, Timer, Activity
} from "lucide-react";

// ========== TYPES ==========
interface Automation {
  id: string;
  name_bn: string;
  name_en: string | null;
  description_bn: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  email_template_id: string | null;
  sms_template: string | null;
  email_subject: string | null;
  email_content: string | null;
  target_segment: string;
  is_active: boolean;
  priority: number;
  delay_minutes: number;
  max_sends_per_user: number;
  cooldown_hours: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  total_revenue: number;
  total_unsubscribed: number;
  last_triggered_at: string | null;
  created_at: string;
  ab_test_enabled: boolean;
  ab_variant_b_subject: string | null;
  ab_variant_b_content: string | null;
  ab_variant_b_sms: string | null;
  ab_split_percent: number;
  ab_winner: string;
  ab_variant_a_sent: number;
  ab_variant_a_converted: number;
  ab_variant_b_sent: number;
  ab_variant_b_converted: number;
  schedule_type: string;
  schedule_days: string[];
  schedule_time_start: string | null;
  schedule_time_end: string | null;
  conditions: any[];
  exclude_segments: string[];
  send_limit_per_day: number;
  funnel_steps: any[];
  tags: string[];
}

interface AutomationLog {
  id: string;
  automation_id: string;
  channel: string;
  recipient: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface AutomationSchedule {
  id: string;
  automation_id: string;
  scheduled_for: string;
  executed_at: string | null;
  status: string;
  recipients_count: number;
  sent_count: number;
  created_at: string;
}

// ========== CONSTANTS ==========
const triggerTypes = [
  { value: 'abandoned_cart', label: 'কার্ট অ্যাবান্ডনমেন্ট', icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', desc: 'কার্টে পণ্য রেখে চলে গেলে' },
  { value: 'post_purchase', label: 'পোস্ট-পার্চেজ ফলোআপ', icon: Package, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', desc: 'অর্ডার সম্পন্ন হওয়ার পর' },
  { value: 'welcome', label: 'ওয়েলকাম সিরিজ', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', desc: 'নতুন কাস্টমার রেজিস্ট্রেশনে' },
  { value: 'birthday', label: 'জন্মদিনের শুভেচ্ছা', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30', desc: 'কাস্টমারের জন্মদিনে' },
  { value: 're_engagement', label: 'রি-এনগেজমেন্ট', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'দীর্ঘদিন নিষ্ক্রিয় কাস্টমারদের জন্য' },
  { value: 'price_drop', label: 'প্রাইস ড্রপ অ্যালার্ট', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', desc: 'উইশলিস্টের পণ্যের দাম কমলে' },
  { value: 'back_in_stock', label: 'ব্যাক ইন স্টক', icon: Package, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30', desc: 'স্টকআউট পণ্য ফিরে এলে' },
  { value: 'review_request', label: 'রিভিউ রিকোয়েস্ট', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', desc: 'ডেলিভারির পর রিভিউ চাওয়া' },
  { value: 'order_milestone', label: 'অর্ডার মাইলস্টোন', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30', desc: 'নির্দিষ্ট অর্ডার সংখ্যা পূর্ণ হলে' },
  { value: 'loyalty_reward', label: 'লয়্যালটি রিওয়ার্ড', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30', desc: 'পয়েন্ট অর্জনে পুরস্কার' },
  { value: 'win_back', label: 'উইন-ব্যাক ক্যাম্পেইন', icon: RotateCcw, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', desc: 'হারানো কাস্টমার ফিরিয়ে আনা' },
  { value: 'cross_sell', label: 'ক্রস-সেল সাজেশন', icon: Layers, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', desc: 'সম্পর্কিত পণ্য সাজেস্ট করা' },
];

const segmentOptions = [
  { value: 'all', label: 'সকল কাস্টমার', icon: Globe },
  { value: 'new', label: 'নতুন কাস্টমার (৩০ দিনের মধ্যে)', icon: UserPlus },
  { value: 'returning', label: 'রিটার্নিং কাস্টমার', icon: Repeat },
  { value: 'vip', label: 'VIP কাস্টমার (৫+ অর্ডার)', icon: Star },
  { value: 'inactive', label: 'নিষ্ক্রিয় (৬০+ দিন)', icon: Ban },
  { value: 'high_value', label: 'উচ্চ মূল্যের কাস্টমার', icon: DollarSign },
  { value: 'at_risk', label: 'ঝুঁকিপূর্ণ (চার্ন হতে পারে)', icon: AlertTriangle },
];

const conditionTypes = [
  { value: 'min_order_count', label: 'ন্যূনতম অর্ডার সংখ্যা' },
  { value: 'min_order_value', label: 'ন্যূনতম অর্ডার মূল্য (৳)' },
  { value: 'days_since_last_order', label: 'শেষ অর্ডারের পর দিন' },
  { value: 'has_category_purchase', label: 'নির্দিষ্ট ক্যাটাগরি কেনেছে' },
  { value: 'cart_value_above', label: 'কার্ট মূল্য (৳) এর বেশি' },
  { value: 'loyalty_points_above', label: 'লয়্যালটি পয়েন্ট এর বেশি' },
  { value: 'email_opened_last', label: 'শেষ ইমেইল ওপেন করেছে' },
  { value: 'registered_days_ago', label: 'রেজিস্ট্রেশনের পর দিন' },
];

const weekDays = [
  { value: 'sat', label: 'শনি' },
  { value: 'sun', label: 'রবি' },
  { value: 'mon', label: 'সোম' },
  { value: 'tue', label: 'মঙ্গল' },
  { value: 'wed', label: 'বুধ' },
  { value: 'thu', label: 'বৃহঃ' },
  { value: 'fri', label: 'শুক্র' },
];

const emailVariables = [
  '{{customer_name}}', '{{order_number}}', '{{cart_items}}', '{{cart_total}}',
  '{{product_name}}', '{{discount_code}}', '{{loyalty_points}}', '{{site_url}}',
  '{{unsubscribe_link}}', '{{birthday_offer}}', '{{days_inactive}}'
];

// ========== MAIN COMPONENT ==========
const AdminMarketingAutomation = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("workflows");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const defaultForm = {
    name_bn: '', name_en: '', description_bn: '',
    trigger_type: 'abandoned_cart', action_type: 'email',
    email_subject: '', email_content: '', sms_template: '',
    target_segment: 'all', delay_minutes: 60,
    max_sends_per_user: 1, cooldown_hours: 24, priority: 0,
    ab_test_enabled: false, ab_variant_b_subject: '', ab_variant_b_content: '',
    ab_variant_b_sms: '', ab_split_percent: 50,
    schedule_type: 'immediate', schedule_days: [] as string[],
    schedule_time_start: '', schedule_time_end: '',
    conditions: [] as any[], exclude_segments: [] as string[],
    send_limit_per_day: 0, tags: [] as string[],
    funnel_steps: [] as any[],
  };

  const [form, setForm] = useState(defaultForm);
  const [newTag, setNewTag] = useState('');
  const [newCondition, setNewCondition] = useState({ type: 'min_order_count', value: '' });

  // ===== QUERIES =====
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['marketing-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_automations')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as unknown as Automation[];
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['automation-logs', selectedLog],
    queryFn: async () => {
      if (!selectedLog) return [];
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', selectedLog)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!selectedLog,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['automation-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_schedules')
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutomationSchedule[];
    }
  });

  // ===== MUTATIONS =====
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const { id, ...rest } = data;
      const payload = {
        ...rest,
        trigger_config: {},
        schedule_days: rest.schedule_days || [],
        conditions: rest.conditions || [],
        exclude_segments: rest.exclude_segments || [],
        tags: rest.tags || [],
        funnel_steps: rest.funnel_steps || [],
      };
      if (id) {
        const { error } = await supabase.from('marketing_automations').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_automations').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
      setDialogOpen(false);
      setEditing(null);
      setDialogStep(1);
      setForm(defaultForm);
      toast.success(duplicating ? "অটোমেশন ডুপ্লিকেট হয়েছে!" : "অটোমেশন সেভ হয়েছে!");
      setDuplicating(false);
    },
    onError: () => toast.error("সেভ করতে সমস্যা হয়েছে"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('marketing_automations').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
      toast.success("অটোমেশন ডিলিট হয়েছে");
    },
  });

  // ===== HELPERS =====
  const resetForm = () => { setForm(defaultForm); setDialogStep(1); setDuplicating(false); };

  const openEdit = (a: Automation) => {
    setEditing(a);
    setForm({
      name_bn: a.name_bn, name_en: a.name_en || '', description_bn: a.description_bn || '',
      trigger_type: a.trigger_type, action_type: a.action_type,
      email_subject: a.email_subject || '', email_content: a.email_content || '',
      sms_template: a.sms_template || '', target_segment: a.target_segment,
      delay_minutes: a.delay_minutes, max_sends_per_user: a.max_sends_per_user,
      cooldown_hours: a.cooldown_hours, priority: a.priority,
      ab_test_enabled: a.ab_test_enabled || false,
      ab_variant_b_subject: a.ab_variant_b_subject || '',
      ab_variant_b_content: a.ab_variant_b_content || '',
      ab_variant_b_sms: a.ab_variant_b_sms || '',
      ab_split_percent: a.ab_split_percent || 50,
      schedule_type: a.schedule_type || 'immediate',
      schedule_days: a.schedule_days || [],
      schedule_time_start: a.schedule_time_start || '',
      schedule_time_end: a.schedule_time_end || '',
      conditions: a.conditions || [],
      exclude_segments: a.exclude_segments || [],
      send_limit_per_day: a.send_limit_per_day || 0,
      tags: a.tags || [],
      funnel_steps: a.funnel_steps || [],
    });
    setDialogStep(1);
    setDialogOpen(true);
  };

  const duplicateAutomation = (a: Automation) => {
    setEditing(null);
    setDuplicating(true);
    setForm({
      name_bn: a.name_bn + ' (কপি)', name_en: (a.name_en || '') + ' (Copy)',
      description_bn: a.description_bn || '', trigger_type: a.trigger_type,
      action_type: a.action_type, email_subject: a.email_subject || '',
      email_content: a.email_content || '', sms_template: a.sms_template || '',
      target_segment: a.target_segment, delay_minutes: a.delay_minutes,
      max_sends_per_user: a.max_sends_per_user, cooldown_hours: a.cooldown_hours,
      priority: a.priority, ab_test_enabled: a.ab_test_enabled || false,
      ab_variant_b_subject: a.ab_variant_b_subject || '',
      ab_variant_b_content: a.ab_variant_b_content || '',
      ab_variant_b_sms: a.ab_variant_b_sms || '',
      ab_split_percent: a.ab_split_percent || 50,
      schedule_type: a.schedule_type || 'immediate',
      schedule_days: a.schedule_days || [], schedule_time_start: a.schedule_time_start || '',
      schedule_time_end: a.schedule_time_end || '', conditions: a.conditions || [],
      exclude_segments: a.exclude_segments || [], send_limit_per_day: a.send_limit_per_day || 0,
      tags: a.tags || [], funnel_steps: a.funnel_steps || [],
    });
    setDialogStep(1);
    setDialogOpen(true);
  };

  const getTriggerInfo = (type: string) => triggerTypes.find(t => t.value === type);

  const addCondition = () => {
    if (!newCondition.value) return;
    setForm(f => ({ ...f, conditions: [...f.conditions, { ...newCondition }] }));
    setNewCondition({ type: 'min_order_count', value: '' });
  };

  const removeCondition = (idx: number) => {
    setForm(f => ({ ...f, conditions: f.conditions.filter((_, i) => i !== idx) }));
  };

  const addTag = () => {
    if (!newTag.trim() || form.tags.includes(newTag.trim())) return;
    setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  // ===== COMPUTED =====
  const activeCount = automations.filter(a => a.is_active).length;
  const totalSent = automations.reduce((s, a) => s + (a.total_sent || 0), 0);
  const totalConverted = automations.reduce((s, a) => s + (a.total_converted || 0), 0);
  const totalRevenue = automations.reduce((s, a) => s + (Number(a.total_revenue) || 0), 0);
  const avgConversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0';

  const allTags = [...new Set(automations.flatMap(a => a.tags || []))];

  const filteredAutomations = automations.filter(a => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !a.is_active) return false;
      if (filterStatus === 'inactive' && a.is_active) return false;
    }
    if (filterTag !== 'all' && !(a.tags || []).includes(filterTag)) return false;
    return true;
  });

  const formatDelay = (min: number) => {
    if (min >= 1440) return `${Math.floor(min / 1440)} দিন`;
    if (min >= 60) return `${Math.floor(min / 60)} ঘণ্টা`;
    return `${min} মিনিট`;
  };

  // ===== RENDER =====
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              মার্কেটিং অটোমেশন
            </h1>
            <p className="text-muted-foreground mt-1">
              অ্যাডভান্সড অটোমেটেড মার্কেটিং ওয়ার্কফ্লো, A/B টেস্টিং ও স্মার্ট সেগমেন্টেশন
            </p>
          </div>
          <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন অটোমেশন
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: Zap, label: 'সক্রিয় ওয়ার্কফ্লো', value: activeCount, color: 'text-primary', borderColor: 'border-l-primary', bg: 'bg-primary/10' },
            { icon: Send, label: 'মোট পাঠানো', value: totalSent.toLocaleString('bn-BD'), color: 'text-blue-500', borderColor: 'border-l-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Target, label: 'কনভার্সন', value: totalConverted.toLocaleString('bn-BD'), color: 'text-green-500', borderColor: 'border-l-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
            { icon: TrendingUp, label: 'কনভার্সন রেট', value: `${avgConversionRate}%`, color: 'text-orange-500', borderColor: 'border-l-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            { icon: DollarSign, label: 'মোট রেভিনিউ', value: `৳${totalRevenue.toLocaleString('bn-BD')}`, color: 'text-emerald-500', borderColor: 'border-l-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          ].map(stat => (
            <Card key={stat.label} className={`border-l-4 ${stat.borderColor}`}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {[
              { value: 'workflows', icon: Zap, label: 'ওয়ার্কফ্লো' },
              { value: 'templates', icon: Sparkles, label: 'ট্রিগার' },
              { value: 'ab_testing', icon: FlaskConical, label: 'A/B টেস্ট' },
              { value: 'schedules', icon: Calendar, label: 'শিডিউল' },
              { value: 'funnel', icon: GitBranch, label: 'ফানেল' },
              { value: 'logs', icon: Activity, label: 'লগ' },
              { value: 'analytics', icon: BarChart3, label: 'অ্যানালিটিক্স' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2 py-2.5 px-4">
                <tab.icon className="w-4 h-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ===== WORKFLOWS TAB ===== */}
          <TabsContent value="workflows" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="সব স্ট্যাটাস" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                  <SelectItem value="active">সক্রিয়</SelectItem>
                  <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="সব ট্যাগ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ট্যাগ</SelectItem>
                  {allTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary">{filteredAutomations.length}টি ওয়ার্কফ্লো</Badge>
            </div>

            {isLoading ? (
              <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" /><p className="text-muted-foreground">লোড হচ্ছে...</p></CardContent></Card>
            ) : filteredAutomations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">কোনো অটোমেশন নেই</h3>
                  <p className="text-muted-foreground mb-4">প্রথম অটোমেটেড মার্কেটিং ওয়ার্কফ্লো তৈরি করুন</p>
                  <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> তৈরি করুন</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAutomations.map(automation => {
                  const trigger = getTriggerInfo(automation.trigger_type);
                  const Icon = trigger?.icon || Zap;
                  const convRate = automation.total_sent > 0 ? ((automation.total_converted / automation.total_sent) * 100).toFixed(1) : '0';
                  return (
                    <Card key={automation.id} className={`transition-all duration-200 hover:shadow-md ${automation.is_active ? 'border-primary/20' : 'opacity-70'}`}>
                      <CardContent className="py-5">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${trigger?.bg || 'bg-muted'} shrink-0`}>
                            <Icon className={`h-6 w-6 ${trigger?.color || 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-base">{automation.name_bn}</h3>
                              <Badge variant={automation.is_active ? "default" : "secondary"} className="gap-1">
                                {automation.is_active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                {automation.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                {automation.action_type === 'email' ? <Mail className="h-3 w-3" /> : automation.action_type === 'sms' ? <Smartphone className="h-3 w-3" /> : <><Mail className="h-3 w-3" /><Smartphone className="h-3 w-3" /></>}
                                {automation.action_type === 'both' ? 'Email + SMS' : automation.action_type.toUpperCase()}
                              </Badge>
                              {automation.ab_test_enabled && <Badge variant="outline" className="gap-1 border-purple-300 text-purple-600"><FlaskConical className="h-3 w-3" />A/B</Badge>}
                              {automation.schedule_type !== 'immediate' && <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />{automation.schedule_type === 'scheduled' ? 'শিডিউলড' : 'রিকারিং'}</Badge>}
                              <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{formatDelay(automation.delay_minutes)} পর</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{trigger?.desc}</p>
                            {/* Tags */}
                            {(automation.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {automation.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                              </div>
                            )}
                            {/* Metrics */}
                            <div className="grid grid-cols-5 gap-3 text-center">
                              {[
                                { label: 'পাঠানো', value: automation.total_sent },
                                { label: 'ওপেন', value: automation.total_opened },
                                { label: 'ক্লিক', value: automation.total_clicked },
                                { label: 'কনভার্সন', value: `${convRate}%`, isRate: true },
                                { label: 'রেভিনিউ', value: `৳${Number(automation.total_revenue || 0).toLocaleString('bn-BD')}` },
                              ].map(m => (
                                <div key={m.label}>
                                  <p className={`text-lg font-bold ${m.isRate ? 'text-green-600' : ''}`}>{typeof m.value === 'number' ? m.value.toLocaleString('bn-BD') : m.value}</p>
                                  <p className="text-xs text-muted-foreground">{m.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Switch checked={automation.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: automation.id, is_active: checked })} />
                            <Button variant="outline" size="icon" onClick={() => openEdit(automation)} title="এডিট"><Edit className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => duplicateAutomation(automation)} title="ডুপ্লিকেট"><Copy className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => { setSelectedLog(automation.id); setActiveTab('logs'); }} title="লগ"><Eye className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="text-destructive" onClick={() => { if (confirm('ডিলিট করতে চান?')) deleteMutation.mutate(automation.id); }} title="ডিলিট"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== TEMPLATES TAB ===== */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {triggerTypes.map(trigger => {
                const Icon = trigger.icon;
                const existing = automations.filter(a => a.trigger_type === trigger.value);
                return (
                  <Card key={trigger.value} className="cursor-pointer hover:shadow-md transition-all group" onClick={() => {
                    resetForm();
                    setForm(f => ({ ...f, trigger_type: trigger.value, name_bn: trigger.label }));
                    setEditing(null);
                    setDialogOpen(true);
                  }}>
                    <CardContent className="py-6 text-center">
                      <div className={`p-3 rounded-xl ${trigger.bg} w-fit mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-7 w-7 ${trigger.color}`} />
                      </div>
                      <h3 className="font-semibold mb-1">{trigger.label}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{trigger.desc}</p>
                      {existing.length > 0 ? (
                        <Badge variant="secondary">{existing.length}টি সেটআপ</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Plus className="h-3 w-3" /> সেটআপ করুন</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Preset Workflows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />রেডিমেড ওয়ার্কফ্লো প্রিসেট</CardTitle>
                <CardDescription>এক ক্লিকে জনপ্রিয় অটোমেশন সেটআপ করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { name: 'কার্ট রিকভারি ফানেল (৩ ধাপ)', desc: '১ ঘণ্টা → ২৪ ঘণ্টা → ৭২ ঘণ্টা রিমাইন্ডার, A/B টেস্ট সহ', trigger: 'abandoned_cart', icon: ShoppingCart, tags: ['cart', 'recovery'] },
                    { name: 'নতুন কাস্টমার অনবোর্ডিং', desc: 'ওয়েলকাম → গাইড → প্রথম অফার → ফিডব্যাক', trigger: 'welcome', icon: UserPlus, tags: ['onboarding'] },
                    { name: 'VIP রি-এনগেজমেন্ট', desc: '৩০ দিন নিষ্ক্রিয় VIP কাস্টমারদের এক্সক্লুসিভ অফার', trigger: 're_engagement', icon: Heart, tags: ['vip', 'reengagement'] },
                    { name: 'পোস্ট-পার্চেজ ক্রস-সেল', desc: 'ক্রয়ের ৫ দিন পর সম্পর্কিত পণ্য সাজেশন', trigger: 'cross_sell', icon: Layers, tags: ['upsell'] },
                    { name: 'রিভিউ + লয়্যালটি কম্বো', desc: 'ডেলিভারির ৩ দিন পর রিভিউ → পয়েন্ট বোনাস', trigger: 'review_request', icon: Star, tags: ['review', 'loyalty'] },
                    { name: 'উইন-ব্যাক সিক্যুয়েন্স', desc: '৯০ দিন নিষ্ক্রিয়দের জন্য ৩ ধাপের উইন-ব্যাক ক্যাম্পেইন', trigger: 'win_back', icon: RotateCcw, tags: ['winback'] },
                  ].map(preset => {
                    const Icon = preset.icon;
                    return (
                      <div key={preset.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                        resetForm();
                        setForm(f => ({ ...f, trigger_type: preset.trigger, name_bn: preset.name, description_bn: preset.desc, tags: preset.tags }));
                        setEditing(null);
                        setDialogOpen(true);
                      }}>
                        <Icon className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{preset.name}</p>
                          <p className="text-xs text-muted-foreground">{preset.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== A/B TESTING TAB ===== */}
          <TabsContent value="ab_testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-purple-500" />A/B টেস্ট রেজাল্ট</CardTitle>
                <CardDescription>চলমান এবং সম্পন্ন A/B টেস্টের তুলনামূলক ফলাফল</CardDescription>
              </CardHeader>
              <CardContent>
                {automations.filter(a => a.ab_test_enabled).length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>কোনো A/B টেস্ট চলছে না</p>
                    <p className="text-xs mt-1">নতুন অটোমেশন তৈরি করার সময় A/B টেস্ট চালু করুন</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {automations.filter(a => a.ab_test_enabled).map(a => {
                      const aRate = a.ab_variant_a_sent > 0 ? ((a.ab_variant_a_converted / a.ab_variant_a_sent) * 100) : 0;
                      const bRate = a.ab_variant_b_sent > 0 ? ((a.ab_variant_b_converted / a.ab_variant_b_sent) * 100) : 0;
                      const winner = aRate > bRate ? 'A' : bRate > aRate ? 'B' : 'tie';
                      return (
                        <div key={a.id} className="p-4 rounded-lg border space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{a.name_bn}</h3>
                            <Badge variant={a.ab_winner !== 'none' ? 'default' : 'secondary'}>
                              {a.ab_winner !== 'none' ? `বিজয়ী: ভ্যারিয়েন্ট ${a.ab_winner}` : 'চলমান'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Variant A */}
                            <div className={`p-4 rounded-lg border-2 ${winner === 'A' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-muted'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="outline" className="gap-1">ভ্যারিয়েন্ট A ({a.ab_split_percent}%)</Badge>
                                {winner === 'A' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 truncate">{a.email_subject || 'N/A'}</p>
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div><p className="text-lg font-bold">{a.ab_variant_a_sent}</p><p className="text-xs text-muted-foreground">পাঠানো</p></div>
                                <div><p className="text-lg font-bold text-green-600">{aRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">কনভার্সন</p></div>
                              </div>
                            </div>
                            {/* Variant B */}
                            <div className={`p-4 rounded-lg border-2 ${winner === 'B' ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-muted'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="outline" className="gap-1">ভ্যারিয়েন্ট B ({100 - a.ab_split_percent}%)</Badge>
                                {winner === 'B' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2 truncate">{a.ab_variant_b_subject || 'N/A'}</p>
                              <div className="grid grid-cols-2 gap-2 text-center">
                                <div><p className="text-lg font-bold">{a.ab_variant_b_sent}</p><p className="text-xs text-muted-foreground">পাঠানো</p></div>
                                <div><p className="text-lg font-bold text-green-600">{bRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">কনভার্সন</p></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SCHEDULES TAB ===== */}
          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />শিডিউলড অটোমেশন</CardTitle>
                <CardDescription>আসন্ন ও সম্পন্ন শিডিউল দেখুন</CardDescription>
              </CardHeader>
              <CardContent>
                {automations.filter(a => a.schedule_type !== 'immediate').length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>কোনো শিডিউলড অটোমেশন নেই</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {automations.filter(a => a.schedule_type !== 'immediate').map(a => (
                      <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border">
                        <Calendar className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{a.name_bn}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline">{a.schedule_type === 'recurring' ? 'রিকারিং' : 'শিডিউলড'}</Badge>
                            {(a.schedule_days || []).length > 0 && (
                              <Badge variant="secondary">
                                {a.schedule_days.map(d => weekDays.find(w => w.value === d)?.label || d).join(', ')}
                              </Badge>
                            )}
                            {a.schedule_time_start && <Badge variant="secondary">{a.schedule_time_start} - {a.schedule_time_end || '23:59'}</Badge>}
                            {a.send_limit_per_day > 0 && <Badge variant="outline">দৈনিক সীমা: {a.send_limit_per_day}</Badge>}
                          </div>
                        </div>
                        <Switch checked={a.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: a.id, is_active: checked })} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent schedule executions */}
                {schedules.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">সাম্প্রতিক শিডিউল এক্সিকিউশন</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>শিডিউল</TableHead>
                          <TableHead>স্ট্যাটাস</TableHead>
                          <TableHead>প্রাপক</TableHead>
                          <TableHead>পাঠানো</TableHead>
                          <TableHead>এক্সিকিউশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.slice(0, 10).map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm">{format(new Date(s.scheduled_for), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell><Badge variant={s.status === 'completed' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'}>{s.status}</Badge></TableCell>
                            <TableCell>{s.recipients_count}</TableCell>
                            <TableCell>{s.sent_count}</TableCell>
                            <TableCell className="text-sm">{s.executed_at ? format(new Date(s.executed_at), 'dd/MM HH:mm') : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== FUNNEL TAB ===== */}
          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" />ওয়ার্কফ্লো ফানেল ভিজুয়ালাইজেশন</CardTitle>
                <CardDescription>প্রতিটি অটোমেশনের পারফরম্যান্স ফানেল</CardDescription>
              </CardHeader>
              <CardContent>
                {automations.filter(a => a.total_sent > 0).length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>অটোমেশন চালু হলে ফানেল দেখা যাবে</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {automations.filter(a => a.total_sent > 0).map(a => {
                      const trigger = getTriggerInfo(a.trigger_type);
                      const steps = [
                        { label: 'পাঠানো', value: a.total_sent, color: 'bg-blue-500' },
                        { label: 'ওপেন', value: a.total_opened, color: 'bg-indigo-500' },
                        { label: 'ক্লিক', value: a.total_clicked, color: 'bg-purple-500' },
                        { label: 'কনভার্সন', value: a.total_converted, color: 'bg-green-500' },
                      ];
                      const maxVal = Math.max(...steps.map(s => s.value), 1);
                      return (
                        <div key={a.id} className="space-y-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            {trigger && <trigger.icon className={`h-4 w-4 ${trigger.color}`} />}
                            {a.name_bn}
                          </h3>
                          <div className="space-y-2">
                            {steps.map((step, i) => {
                              const width = (step.value / maxVal) * 100;
                              const dropRate = i > 0 && steps[i - 1].value > 0 
                                ? (((steps[i - 1].value - step.value) / steps[i - 1].value) * 100).toFixed(1) 
                                : null;
                              return (
                                <div key={step.label}>
                                  {dropRate && <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2 mb-0.5"><ArrowDown className="h-3 w-3" /> {dropRate}% ড্রপ</div>}
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm w-20 text-right">{step.label}</span>
                                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                                      <div className={`h-full ${step.color} rounded-full flex items-center justify-end pr-3 transition-all duration-500`} style={{ width: `${Math.max(width, 5)}%` }}>
                                        <span className="text-xs font-bold text-white">{step.value.toLocaleString('bn-BD')}</span>
                                      </div>
                                    </div>
                                    <span className="text-sm w-14 text-muted-foreground">{a.total_sent > 0 ? ((step.value / a.total_sent) * 100).toFixed(0) : 0}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== LOGS TAB ===== */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Select value={selectedLog || ''} onValueChange={setSelectedLog}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="অটোমেশন সিলেক্ট করুন" /></SelectTrigger>
                <SelectContent>{automations.map(a => <SelectItem key={a.id} value={a.id}>{a.name_bn}</SelectItem>)}</SelectContent>
              </Select>
              {selectedLog && <Badge variant="secondary">{logs.length}টি লগ</Badge>}
            </div>
            {selectedLog ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>চ্যানেল</TableHead>
                      <TableHead>প্রাপক</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>ত্রুটি</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো লগ নেই</TableCell></TableRow>
                    ) : logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell><Badge variant="outline" className="gap-1">{log.channel === 'email' ? <Mail className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}{log.channel}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{log.recipient}</TableCell>
                        <TableCell><Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="gap-1">{log.status === 'sent' ? <CheckCircle2 className="h-3 w-3" /> : log.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{log.status}</Badge></TableCell>
                        <TableCell className="text-sm text-destructive">{log.error_message || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">একটি অটোমেশন সিলেক্ট করুন</CardContent></Card>
            )}
          </TabsContent>

          {/* ===== ANALYTICS TAB ===== */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />টপ পারফর্মার</CardTitle>
              </CardHeader>
              <CardContent>
                {automations.filter(a => a.total_sent > 0).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">অটোমেশন চালু হলে অ্যানালিটিক্স দেখা যাবে</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {automations.filter(a => a.total_sent > 0).sort((a, b) => {
                      const aRate = a.total_sent > 0 ? a.total_converted / a.total_sent : 0;
                      const bRate = b.total_sent > 0 ? b.total_converted / b.total_sent : 0;
                      return bRate - aRate;
                    }).map(automation => {
                      const trigger = getTriggerInfo(automation.trigger_type);
                      const Icon = trigger?.icon || Zap;
                      const openRate = automation.total_sent > 0 ? ((automation.total_opened / automation.total_sent) * 100) : 0;
                      const clickRate = automation.total_sent > 0 ? ((automation.total_clicked / automation.total_sent) * 100) : 0;
                      const convRate = automation.total_sent > 0 ? ((automation.total_converted / automation.total_sent) * 100) : 0;
                      const unsubRate = automation.total_sent > 0 ? ((Number(automation.total_unsubscribed || 0) / automation.total_sent) * 100) : 0;
                      return (
                        <Card key={automation.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${trigger?.color}`} />
                              {automation.name_bn}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {[
                              { label: 'ওপেন রেট', value: openRate, color: '' },
                              { label: 'ক্লিক রেট', value: clickRate, color: '' },
                              { label: 'কনভার্সন রেট', value: convRate, color: 'text-green-600 font-semibold' },
                              { label: 'আনসাবস্ক্রাইব', value: unsubRate, color: 'text-red-500' },
                            ].map(m => (
                              <div key={m.label}>
                                <div className="flex justify-between text-sm mb-1"><span>{m.label}</span><span className={m.color}>{m.value.toFixed(1)}%</span></div>
                                <Progress value={m.value} className="h-2" />
                              </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>পাঠানো: {automation.total_sent.toLocaleString('bn-BD')}</span>
                              <span>রেভিনিউ: ৳{Number(automation.total_revenue || 0).toLocaleString('bn-BD')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              শেষ ট্রিগার: {automation.last_triggered_at ? format(new Date(automation.last_triggered_at), 'dd/MM/yyyy HH:mm') : 'নেই'}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===== CREATE/EDIT DIALOG (Multi-step) ===== */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setDialogStep(1); setEditing(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {editing ? 'অটোমেশন এডিট করুন' : duplicating ? 'অটোমেশন ডুপ্লিকেট' : 'নতুন অটোমেশন তৈরি করুন'}
              </DialogTitle>
              {/* Step indicator */}
              <div className="flex items-center gap-2 pt-2">
                {['বেসিক', 'টার্গেটিং', 'কন্টেন্ট', 'অ্যাডভান্সড'].map((step, i) => (
                  <div key={step} className="flex items-center gap-1">
                    <button
                      onClick={() => setDialogStep(i + 1)}
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${dialogStep === i + 1 ? 'bg-primary text-primary-foreground' : dialogStep > i + 1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}
                    >{i + 1}</button>
                    <span className={`text-xs hidden sm:inline ${dialogStep === i + 1 ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</span>
                    {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
                  </div>
                ))}
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 py-2">
                {/* Step 1: Basic */}
                {dialogStep === 1 && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>নাম (বাংলা) *</Label><Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="অটোমেশনের নাম" /></div>
                      <div className="space-y-2"><Label>নাম (ইংরেজি)</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Automation name" /></div>
                    </div>
                    <div className="space-y-2"><Label>বিবরণ</Label><Textarea value={form.description_bn} onChange={e => setForm(f => ({ ...f, description_bn: e.target.value }))} placeholder="অটোমেশনের বিবরণ" rows={2} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>ট্রিগার টাইপ *</Label>
                        <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{triggerTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>অ্যাকশন টাইপ *</Label>
                        <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">শুধু Email</SelectItem>
                            <SelectItem value="sms">শুধু SMS</SelectItem>
                            <SelectItem value="both">Email + SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>ট্যাগ</Label>
                      <div className="flex gap-2">
                        <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="ট্যাগ যোগ করুন" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1" />
                        <Button variant="outline" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                      </div>
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">{form.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(tag)}>{tag}<XCircle className="h-3 w-3" /></Badge>
                        ))}</div>
                      )}
                    </div>
                  </>
                )}

                {/* Step 2: Targeting */}
                {dialogStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label>টার্গেট সেগমেন্ট</Label>
                      <Select value={form.target_segment} onValueChange={v => setForm(f => ({ ...f, target_segment: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{segmentOptions.map(s => <SelectItem key={s.value} value={s.value}><span className="flex items-center gap-2"><s.icon className="h-4 w-4" />{s.label}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {/* Exclude segments */}
                    <div className="space-y-2">
                      <Label>বাদ দিন (Exclude Segments)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {segmentOptions.filter(s => s.value !== form.target_segment && s.value !== 'all').map(s => (
                          <label key={s.value} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                            <Checkbox checked={form.exclude_segments.includes(s.value)} onCheckedChange={(checked) => {
                              setForm(f => ({
                                ...f, exclude_segments: checked ? [...f.exclude_segments, s.value] : f.exclude_segments.filter(es => es !== s.value)
                              }));
                            }} />
                            <s.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Advanced Conditions */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2"><Filter className="h-4 w-4" />অ্যাডভান্সড কন্ডিশন</Label>
                      {form.conditions.length > 0 && (
                        <div className="space-y-2">
                          {form.conditions.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                              <Badge variant="outline">{conditionTypes.find(ct => ct.value === c.type)?.label || c.type}</Badge>
                              <span className="text-sm font-semibold">{c.value}</span>
                              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => removeCondition(i)}><XCircle className="h-3 w-3" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Select value={newCondition.type} onValueChange={v => setNewCondition(c => ({ ...c, type: v }))}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{conditionTypes.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="w-28" placeholder="মান" value={newCondition.value} onChange={e => setNewCondition(c => ({ ...c, value: e.target.value }))} />
                        <Button variant="outline" size="sm" onClick={addCondition}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {/* Timing */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2"><Label>বিলম্ব (মিনিট)</Label><Input type="number" min={0} value={form.delay_minutes} onChange={e => setForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))} /></div>
                      <div className="space-y-2"><Label>কুলডাউন (ঘণ্টা)</Label><Input type="number" min={1} value={form.cooldown_hours} onChange={e => setForm(f => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))} /></div>
                      <div className="space-y-2"><Label>প্রতি ইউজারে সর্বোচ্চ</Label><Input type="number" min={1} value={form.max_sends_per_user} onChange={e => setForm(f => ({ ...f, max_sends_per_user: parseInt(e.target.value) || 1 }))} /></div>
                    </div>
                  </>
                )}

                {/* Step 3: Content */}
                {dialogStep === 3 && (
                  <>
                    {(form.action_type === 'email' || form.action_type === 'both') && (
                      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> ইমেইল কন্টেন্ট (ভ্যারিয়েন্ট A)</h4>
                        <div className="space-y-2"><Label>সাবজেক্ট</Label><Input value={form.email_subject} onChange={e => setForm(f => ({ ...f, email_subject: e.target.value }))} placeholder="ইমেইল সাবজেক্ট" /></div>
                        <div className="space-y-2">
                          <Label>কন্টেন্ট (HTML)</Label>
                          <Textarea value={form.email_content} onChange={e => setForm(f => ({ ...f, email_content: e.target.value }))} placeholder="ইমেইল HTML কন্টেন্ট" rows={6} className="font-mono text-sm" />
                        </div>
                        {/* Variable helper */}
                        <div>
                          <Label className="text-xs text-muted-foreground">ভ্যারিয়েবল ব্যবহার করুন:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {emailVariables.map(v => (
                              <Badge key={v} variant="outline" className="cursor-pointer text-xs hover:bg-primary/10" onClick={() => {
                                setForm(f => ({ ...f, email_content: f.email_content + ' ' + v }));
                                toast.info(`${v} যোগ করা হয়েছে`);
                              }}>{v}</Badge>
                            ))}
                          </div>
                        </div>
                        {/* Preview */}
                        {form.email_content && (
                          <div className="space-y-2">
                            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)} className="gap-2"><Eye className="h-4 w-4" />{previewOpen ? 'প্রিভিউ বন্ধ' : 'প্রিভিউ'}</Button>
                            {previewOpen && (
                              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border max-h-48 overflow-y-auto">
                                <div dangerouslySetInnerHTML={{ __html: form.email_content.replace(/\{\{(\w+)\}\}/g, '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">[$1]</span>') }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(form.action_type === 'sms' || form.action_type === 'both') && (
                      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> SMS টেমপ্লেট (ভ্যারিয়েন্ট A)</h4>
                        <Textarea value={form.sms_template} onChange={e => setForm(f => ({ ...f, sms_template: e.target.value }))} placeholder="SMS টেমপ্লেট" rows={3} />
                        <p className="text-xs text-muted-foreground">{form.sms_template.length}/160 অক্ষর ({Math.ceil(form.sms_template.length / 160) || 1} SMS)</p>
                      </div>
                    )}

                    {/* A/B Testing */}
                    <div className="space-y-3 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4 text-purple-500" /> A/B টেস্ট</h4>
                        <Switch checked={form.ab_test_enabled} onCheckedChange={checked => setForm(f => ({ ...f, ab_test_enabled: checked }))} />
                      </div>
                      {form.ab_test_enabled && (
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label>স্প্লিট রেশিও: A ({form.ab_split_percent}%) / B ({100 - form.ab_split_percent}%)</Label>
                            <Input type="range" min={10} max={90} value={form.ab_split_percent} onChange={e => setForm(f => ({ ...f, ab_split_percent: parseInt(e.target.value) }))} className="cursor-pointer" />
                          </div>
                          {(form.action_type === 'email' || form.action_type === 'both') && (
                            <div className="space-y-2 p-3 rounded border bg-purple-50 dark:bg-purple-900/10">
                              <Label className="text-purple-600">ভ্যারিয়েন্ট B - সাবজেক্ট</Label>
                              <Input value={form.ab_variant_b_subject} onChange={e => setForm(f => ({ ...f, ab_variant_b_subject: e.target.value }))} placeholder="বিকল্প সাবজেক্ট" />
                              <Label className="text-purple-600">ভ্যারিয়েন্ট B - কন্টেন্ট</Label>
                              <Textarea value={form.ab_variant_b_content} onChange={e => setForm(f => ({ ...f, ab_variant_b_content: e.target.value }))} placeholder="বিকল্প ইমেইল কন্টেন্ট" rows={4} className="font-mono text-sm" />
                            </div>
                          )}
                          {(form.action_type === 'sms' || form.action_type === 'both') && (
                            <div className="space-y-2 p-3 rounded border bg-purple-50 dark:bg-purple-900/10">
                              <Label className="text-purple-600">ভ্যারিয়েন্ট B - SMS</Label>
                              <Textarea value={form.ab_variant_b_sms} onChange={e => setForm(f => ({ ...f, ab_variant_b_sms: e.target.value }))} placeholder="বিকল্প SMS" rows={2} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Step 4: Advanced */}
                {dialogStep === 4 && (
                  <>
                    {/* Schedule */}
                    <div className="space-y-3 p-4 rounded-lg border">
                      <h4 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> শিডিউলিং</h4>
                      <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">তাৎক্ষণিক (ট্রিগার হলেই)</SelectItem>
                          <SelectItem value="scheduled">নির্দিষ্ট সময়ে</SelectItem>
                          <SelectItem value="recurring">পুনরাবৃত্তি (রিকারিং)</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.schedule_type !== 'immediate' && (
                        <>
                          <div className="space-y-2">
                            <Label>সক্রিয় দিন</Label>
                            <div className="flex flex-wrap gap-2">
                              {weekDays.map(day => (
                                <label key={day.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${form.schedule_days.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                                  <Checkbox
                                    checked={form.schedule_days.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      setForm(f => ({
                                        ...f, schedule_days: checked ? [...f.schedule_days, day.value] : f.schedule_days.filter(d => d !== day.value)
                                      }));
                                    }}
                                    className="hidden"
                                  />
                                  <span className="text-sm">{day.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>শুরুর সময়</Label><Input type="time" value={form.schedule_time_start} onChange={e => setForm(f => ({ ...f, schedule_time_start: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>শেষের সময়</Label><Input type="time" value={form.schedule_time_end} onChange={e => setForm(f => ({ ...f, schedule_time_end: e.target.value }))} /></div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>দৈনিক পাঠানোর সীমা (০ = সীমাহীন)</Label><Input type="number" min={0} value={form.send_limit_per_day} onChange={e => setForm(f => ({ ...f, send_limit_per_day: parseInt(e.target.value) || 0 }))} /></div>
                      <div className="space-y-2"><Label>প্রায়োরিটি (উচ্চতর = আগে)</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} /></div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <h4 className="font-semibold">সারাংশ</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">নাম:</span> {form.name_bn || '-'}</div>
                        <div><span className="text-muted-foreground">ট্রিগার:</span> {getTriggerInfo(form.trigger_type)?.label}</div>
                        <div><span className="text-muted-foreground">চ্যানেল:</span> {form.action_type}</div>
                        <div><span className="text-muted-foreground">টার্গেট:</span> {segmentOptions.find(s => s.value === form.target_segment)?.label}</div>
                        <div><span className="text-muted-foreground">বিলম্ব:</span> {formatDelay(form.delay_minutes)}</div>
                        <div><span className="text-muted-foreground">A/B টেস্ট:</span> {form.ab_test_enabled ? 'হ্যাঁ' : 'না'}</div>
                        <div><span className="text-muted-foreground">শিডিউল:</span> {form.schedule_type === 'immediate' ? 'তাৎক্ষণিক' : form.schedule_type}</div>
                        <div><span className="text-muted-foreground">কন্ডিশন:</span> {form.conditions.length}টি</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              {dialogStep > 1 && (
                <Button variant="outline" onClick={() => setDialogStep(s => s - 1)}>পূর্ববর্তী</Button>
              )}
              <div className="flex-1" />
              {dialogStep < 4 ? (
                <Button onClick={() => setDialogStep(s => s + 1)}>
                  পরবর্তী <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => saveMutation.mutate(editing ? { ...form, id: editing.id } : form)}
                  disabled={saveMutation.isPending || !form.name_bn}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'আপডেট করুন' : 'তৈরি করুন'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketingAutomation;
