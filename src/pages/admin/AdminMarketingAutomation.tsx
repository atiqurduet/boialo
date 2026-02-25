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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Zap, ShoppingCart, Gift, UserPlus, Clock, Star, TrendingUp,
  Mail, Smartphone, Play, Pause, Plus, Edit, Trash2, Eye,
  BarChart3, Target, Users, RefreshCw, ArrowRight, Loader2,
  AlertCircle, CheckCircle2, XCircle, Send, Copy, Settings,
  Sparkles, Timer, Heart, Package, Bell, Megaphone, CalendarDays
} from "lucide-react";

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
  last_triggered_at: string | null;
  created_at: string;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  channel: string;
  recipient: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const triggerTypes = [
  { value: 'abandoned_cart', label: 'কার্ট অ্যাবান্ডনমেন্ট', icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', desc: 'কার্টে পণ্য রেখে চলে গেলে' },
  { value: 'post_purchase', label: 'পোস্ট-পার্চেজ ফলোআপ', icon: Package, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', desc: 'অর্ডার সম্পন্ন হওয়ার পর' },
  { value: 'welcome', label: 'ওয়েলকাম সিরিজ', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', desc: 'নতুন কাস্টমার রেজিস্ট্রেশনে' },
  { value: 'birthday', label: 'জন্মদিনের শুভেচ্ছা', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30', desc: 'কাস্টমারের জন্মদিনে' },
  { value: 're_engagement', label: 'রি-এনগেজমেন্ট', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'দীর্ঘদিন নিষ্ক্রিয় কাস্টমারদের জন্য' },
  { value: 'price_drop', label: 'প্রাইস ড্রপ অ্যালার্ট', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', desc: 'উইশলিস্টের পণ্যের দাম কমলে' },
  { value: 'back_in_stock', label: 'ব্যাক ইন স্টক', icon: Package, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30', desc: 'স্টকআউট পণ্য ফিরে এলে' },
  { value: 'review_request', label: 'রিভিউ রিকোয়েস্ট', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', desc: 'ডেলিভারির পর রিভিউ চাওয়া' },
];

const segmentOptions = [
  { value: 'all', label: 'সকল কাস্টমার' },
  { value: 'new', label: 'নতুন কাস্টমার' },
  { value: 'returning', label: 'রিটার্নিং কাস্টমার' },
  { value: 'vip', label: 'VIP কাস্টমার' },
  { value: 'inactive', label: 'নিষ্ক্রিয় কাস্টমার' },
];

const AdminMarketingAutomation = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("workflows");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const [form, setForm] = useState({
    name_bn: '', name_en: '', description_bn: '',
    trigger_type: 'abandoned_cart', action_type: 'email',
    email_subject: '', email_content: '', sms_template: '',
    target_segment: 'all', delay_minutes: 60,
    max_sends_per_user: 1, cooldown_hours: 24, priority: 0,
  });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['marketing-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_automations')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as Automation[];
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
        .limit(100);
      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!selectedLog,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { ...data, trigger_config: {} };
      if (data.id) {
        const { error } = await supabase.from('marketing_automations').update(payload).eq('id', data.id);
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
      resetForm();
      toast.success("অটোমেশন সেভ হয়েছে!");
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

  const resetForm = () => setForm({
    name_bn: '', name_en: '', description_bn: '',
    trigger_type: 'abandoned_cart', action_type: 'email',
    email_subject: '', email_content: '', sms_template: '',
    target_segment: 'all', delay_minutes: 60,
    max_sends_per_user: 1, cooldown_hours: 24, priority: 0,
  });

  const openEdit = (a: Automation) => {
    setEditing(a);
    setForm({
      name_bn: a.name_bn, name_en: a.name_en || '', description_bn: a.description_bn || '',
      trigger_type: a.trigger_type, action_type: a.action_type,
      email_subject: a.email_subject || '', email_content: a.email_content || '',
      sms_template: a.sms_template || '', target_segment: a.target_segment,
      delay_minutes: a.delay_minutes, max_sends_per_user: a.max_sends_per_user,
      cooldown_hours: a.cooldown_hours, priority: a.priority,
    });
    setDialogOpen(true);
  };

  const getTriggerInfo = (type: string) => triggerTypes.find(t => t.value === type);
  
  // Stats
  const activeCount = automations.filter(a => a.is_active).length;
  const totalSent = automations.reduce((s, a) => s + (a.total_sent || 0), 0);
  const totalConverted = automations.reduce((s, a) => s + (a.total_converted || 0), 0);
  const avgConversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0';

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
              অটোমেটেড মার্কেটিং ওয়ার্কফ্লো সেটআপ ও ম্যানেজ করুন
            </p>
          </div>
          <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> নতুন অটোমেশন
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10"><Zap className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">সক্রিয় ওয়ার্কফ্লো</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Send className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalSent.toLocaleString('bn-BD')}</p>
                  <p className="text-xs text-muted-foreground">মোট পাঠানো</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30"><Target className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalConverted.toLocaleString('bn-BD')}</p>
                  <p className="text-xs text-muted-foreground">কনভার্সন</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30"><TrendingUp className="h-5 w-5 text-orange-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{avgConversionRate}%</p>
                  <p className="text-xs text-muted-foreground">কনভার্সন রেট</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="workflows" className="gap-2 py-2.5 px-4">
              <Zap className="w-4 h-4" /> ওয়ার্কফ্লো
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 py-2.5 px-4">
              <Sparkles className="w-4 h-4" /> ট্রিগার টেমপ্লেট
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 py-2.5 px-4">
              <BarChart3 className="w-4 h-4" /> অ্যাক্টিভিটি লগ
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 py-2.5 px-4">
              <TrendingUp className="w-4 h-4" /> অ্যানালিটিক্স
            </TabsTrigger>
          </TabsList>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            {isLoading ? (
              <Card><CardContent className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" /><p className="text-muted-foreground">লোড হচ্ছে...</p></CardContent></Card>
            ) : automations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">কোনো অটোমেশন নেই</h3>
                  <p className="text-muted-foreground mb-4">প্রথম অটোমেটেড মার্কেটিং ওয়ার্কফ্লো তৈরি করুন</p>
                  <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> তৈরি করুন
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {automations.map(automation => {
                  const trigger = getTriggerInfo(automation.trigger_type);
                  const Icon = trigger?.icon || Zap;
                  const convRate = automation.total_sent > 0 
                    ? ((automation.total_converted / automation.total_sent) * 100).toFixed(1) 
                    : '0';
                  return (
                    <Card key={automation.id} className={`transition-all duration-200 hover:shadow-md ${automation.is_active ? 'border-primary/20' : 'opacity-70'}`}>
                      <CardContent className="py-5">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-xl ${trigger?.bg || 'bg-muted'} shrink-0`}>
                            <Icon className={`h-6 w-6 ${trigger?.color || 'text-muted-foreground'}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-base">{automation.name_bn}</h3>
                              <Badge variant={automation.is_active ? "default" : "secondary"} className="gap-1">
                                {automation.is_active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                {automation.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                {automation.action_type === 'email' ? <Mail className="h-3 w-3" /> : 
                                 automation.action_type === 'sms' ? <Smartphone className="h-3 w-3" /> : 
                                 <><Mail className="h-3 w-3" /><Smartphone className="h-3 w-3" /></>}
                                {automation.action_type === 'both' ? 'Email + SMS' : automation.action_type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {automation.delay_minutes >= 1440
                                  ? `${Math.floor(automation.delay_minutes / 1440)} দিন`
                                  : automation.delay_minutes >= 60
                                  ? `${Math.floor(automation.delay_minutes / 60)} ঘণ্টা`
                                  : `${automation.delay_minutes} মিনিট`} পর
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{trigger?.desc}</p>

                            {/* Metrics */}
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-lg font-bold">{automation.total_sent.toLocaleString('bn-BD')}</p>
                                <p className="text-xs text-muted-foreground">পাঠানো</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold">{automation.total_opened.toLocaleString('bn-BD')}</p>
                                <p className="text-xs text-muted-foreground">ওপেন</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold">{automation.total_clicked.toLocaleString('bn-BD')}</p>
                                <p className="text-xs text-muted-foreground">ক্লিক</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-green-600">{convRate}%</p>
                                <p className="text-xs text-muted-foreground">কনভার্সন</p>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={automation.is_active}
                              onCheckedChange={(checked) => toggleMutation.mutate({ id: automation.id, is_active: checked })}
                            />
                            <Button variant="outline" size="icon" onClick={() => { setSelectedLog(automation.id); setActiveTab('logs'); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => openEdit(automation)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="text-destructive" onClick={() => {
                              if (confirm('ডিলিট করতে চান?')) deleteMutation.mutate(automation.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Trigger Templates Tab */}
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
                        <Badge variant="secondary">{existing.length}টি সক্রিয়</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Plus className="h-3 w-3" /> সেটআপ করুন</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Setup Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  রেডিমেড ওয়ার্কফ্লো প্রিসেট
                </CardTitle>
                <CardDescription>এক ক্লিকে জনপ্রিয় অটোমেশন সেটআপ করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { name: 'কার্ট রিকভারি ফানেল', desc: '১ ঘণ্টা → ২৪ ঘণ্টা → ৭২ ঘণ্টা রিমাইন্ডার', trigger: 'abandoned_cart', icon: ShoppingCart },
                    { name: 'নতুন কাস্টমার অনবোর্ডিং', desc: 'ওয়েলকাম → গাইড → প্রথম অফার', trigger: 'welcome', icon: UserPlus },
                    { name: 'রিভিউ কালেকশন', desc: 'ডেলিভারির ৩ দিন পর রিভিউ অনুরোধ', trigger: 'review_request', icon: Star },
                    { name: 'VIP রি-এনগেজমেন্ট', desc: '৩০ দিন নিষ্ক্রিয় VIP কাস্টমারদের বিশেষ অফার', trigger: 're_engagement', icon: Heart },
                  ].map(preset => {
                    const Icon = preset.icon;
                    return (
                      <div key={preset.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                        resetForm();
                        setForm(f => ({ ...f, trigger_type: preset.trigger, name_bn: preset.name, description_bn: preset.desc }));
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

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Select value={selectedLog || ''} onValueChange={setSelectedLog}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="অটোমেশন সিলেক্ট করুন" />
                </SelectTrigger>
                <SelectContent>
                  {automations.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name_bn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {log.channel === 'email' ? <Mail className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                            {log.channel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.recipient}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="gap-1">
                            {log.status === 'sent' ? <CheckCircle2 className="h-3 w-3" /> : log.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {log.status}
                          </Badge>
                        </TableCell>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {automations.filter(a => a.total_sent > 0).map(automation => {
                const trigger = getTriggerInfo(automation.trigger_type);
                const Icon = trigger?.icon || Zap;
                const openRate = automation.total_sent > 0 ? ((automation.total_opened / automation.total_sent) * 100) : 0;
                const clickRate = automation.total_sent > 0 ? ((automation.total_clicked / automation.total_sent) * 100) : 0;
                const convRate = automation.total_sent > 0 ? ((automation.total_converted / automation.total_sent) * 100) : 0;
                return (
                  <Card key={automation.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${trigger?.color}`} />
                        {automation.name_bn}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>ওপেন রেট</span><span>{openRate.toFixed(1)}%</span></div>
                        <Progress value={openRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>ক্লিক রেট</span><span>{clickRate.toFixed(1)}%</span></div>
                        <Progress value={clickRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>কনভার্সন রেট</span><span className="text-green-600 font-semibold">{convRate.toFixed(1)}%</span></div>
                        <Progress value={convRate} className="h-2" />
                      </div>
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        মোট পাঠানো: {automation.total_sent.toLocaleString('bn-BD')} | 
                        শেষ ট্রিগার: {automation.last_triggered_at ? format(new Date(automation.last_triggered_at), 'dd/MM/yyyy') : 'নেই'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {automations.filter(a => a.total_sent > 0).length === 0 && (
                <Card className="sm:col-span-2">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    অটোমেশন চালু হলে এখানে অ্যানালিটিক্স দেখা যাবে
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {editing ? 'অটোমেশন এডিট করুন' : 'নতুন অটোমেশন তৈরি করুন'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>নাম (বাংলা) *</Label>
                  <Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="অটোমেশনের নাম" />
                </div>
                <div className="space-y-2">
                  <Label>নাম (ইংরেজি)</Label>
                  <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Automation name" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>বিবরণ</Label>
                <Textarea value={form.description_bn} onChange={e => setForm(f => ({ ...f, description_bn: e.target.value }))} placeholder="অটোমেশনের বিবরণ" rows={2} />
              </div>

              {/* Trigger & Action */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ট্রিগার টাইপ *</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">{t.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
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

              {/* Target & Timing */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>টার্গেট সেগমেন্ট</Label>
                  <Select value={form.target_segment} onValueChange={v => setForm(f => ({ ...f, target_segment: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {segmentOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>বিলম্ব (মিনিট)</Label>
                  <Input type="number" min={0} value={form.delay_minutes} onChange={e => setForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>কুলডাউন (ঘণ্টা)</Label>
                  <Input type="number" min={1} value={form.cooldown_hours} onChange={e => setForm(f => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>প্রতি ইউজারে সর্বোচ্চ</Label>
                  <Input type="number" min={1} value={form.max_sends_per_user} onChange={e => setForm(f => ({ ...f, max_sends_per_user: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>প্রায়োরিটি</Label>
                  <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              {/* Email Content */}
              {(form.action_type === 'email' || form.action_type === 'both') && (
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> ইমেইল কন্টেন্ট</h4>
                  <div className="space-y-2">
                    <Label>সাবজেক্ট</Label>
                    <Input value={form.email_subject} onChange={e => setForm(f => ({ ...f, email_subject: e.target.value }))} placeholder="ইমেইল সাবজেক্ট" />
                  </div>
                  <div className="space-y-2">
                    <Label>কন্টেন্ট (HTML)</Label>
                    <Textarea value={form.email_content} onChange={e => setForm(f => ({ ...f, email_content: e.target.value }))} placeholder="ইমেইল কন্টেন্ট..." rows={5} />
                    <p className="text-xs text-muted-foreground">ভ্যারিয়েবল: {"{{customer_name}}, {{product_name}}, {{cart_url}}, {{offer_code}}"}</p>
                  </div>
                </div>
              )}

              {/* SMS Content */}
              {(form.action_type === 'sms' || form.action_type === 'both') && (
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> SMS কন্টেন্ট</h4>
                  <div className="space-y-2">
                    <Label>SMS টেমপ্লেট</Label>
                    <Textarea value={form.sms_template} onChange={e => setForm(f => ({ ...f, sms_template: e.target.value }))} placeholder="SMS মেসেজ..." rows={3} />
                    <p className="text-xs text-muted-foreground">ভ্যারিয়েবল: {"{{customer_name}}, {{product_name}}, {{cart_url}}"}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={saveMutation.isPending || !form.name_bn}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {editing ? 'আপডেট করুন' : 'তৈরি করুন'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketingAutomation;
