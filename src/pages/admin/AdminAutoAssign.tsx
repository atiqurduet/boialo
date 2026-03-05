import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Loader2, Settings, Users, BarChart3, Zap, RefreshCw, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, ArrowRight, Shuffle, Scale,
  Play, Pause, Target, UserCheck, ListChecks, ShieldCheck
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

type AppRole = "admin" | "manager" | "support";

interface AutoAssignRule {
  id: string;
  task_type: string;
  assigned_role: AppRole;
  is_active: boolean;
  assignment_strategy: string;
  max_tasks_per_staff: number | null;
  auto_create_on_order: boolean;
  default_priority: string;
}

interface StaffWorkload {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string | null;
  pending_count: number;
  in_progress_count: number;
  completed_today: number;
  total_completed: number;
}

const TASK_TYPES: Record<string, string> = {
  order_processing: "অর্ডার প্রসেসিং",
  payment_collection: "পেমেন্ট কালেকশন",
  courier_booking: "কুরিয়ার বুকিং",
  delivery_followup: "ডেলিভারি ফলোআপ",
  customer_support: "কাস্টমার সাপোর্ট",
  return_handling: "রিটার্ন হ্যান্ডলিং",
  refund_processing: "রিফান্ড প্রসেসিং",
};

const TASK_ICONS: Record<string, string> = {
  order_processing: "📦", payment_collection: "💰", courier_booking: "🚚",
  delivery_followup: "📞", customer_support: "🎧", return_handling: "🔄", refund_processing: "💸",
};

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "এডমিন" },
  { value: "manager", label: "ম্যানেজার" },
  { value: "support", label: "সাপোর্ট" },
];

const PRIORITIES = [
  { value: "low", label: "নিম্ন", color: "bg-green-100 text-green-700" },
  { value: "medium", label: "মাঝারি", color: "bg-amber-100 text-amber-700" },
  { value: "high", label: "উচ্চ", color: "bg-red-100 text-red-700" },
  { value: "urgent", label: "জরুরি", color: "bg-red-200 text-red-800" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  support: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  super_admin: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminAutoAssign = () => {
  const queryClient = useQueryClient();
  const [globalStrategy, setGlobalStrategy] = useState<string>('least_loaded');

  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ["auto-assign-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_auto_assign_rules")
        .select("*")
        .order("task_type");
      if (error) throw error;
      return data as AutoAssignRule[];
    },
  });

  const { data: workloads = [], isLoading: workloadLoading, refetch: refetchWorkload } = useQuery({
    queryKey: ["staff-workload"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      const [{ data: profiles }, { data: tasks }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("order_tasks").select("assigned_to, status, completed_at").in("assigned_to", userIds),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return roles.map((role) => {
        const userTasks = tasks?.filter((t) => t.assigned_to === role.user_id) || [];
        const profile = profiles?.find((p) => p.id === role.user_id);
        return {
          user_id: role.user_id,
          role: role.role as AppRole,
          full_name: profile?.full_name,
          email: profile?.email,
          pending_count: userTasks.filter((t) => t.status === "pending").length,
          in_progress_count: userTasks.filter((t) => t.status === "in_progress").length,
          completed_today: userTasks.filter((t) => t.status === "completed" && t.completed_at && new Date(t.completed_at) >= today).length,
          total_completed: userTasks.filter((t) => t.status === "completed").length,
        };
      }) as StaffWorkload[];
    },
  });

  // Recent auto-assigned tasks
  const { data: recentTasks = [] } = useQuery({
    queryKey: ["recent-auto-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_tasks")
        .select("*, orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutoAssignRule> }) => {
      const { error } = await supabase.from("task_auto_assign_rules").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রুল আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["auto-assign-rules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const totalPending = workloads.reduce((sum, w) => sum + w.pending_count, 0);
  const totalInProgress = workloads.reduce((sum, w) => sum + w.in_progress_count, 0);
  const totalCompletedToday = workloads.reduce((sum, w) => sum + w.completed_today, 0);
  const activeRules = rules.filter(r => r.is_active).length;
  const autoCreateRules = rules.filter(r => r.auto_create_on_order).length;

  const workloadChartData = workloads
    .filter(w => w.pending_count + w.in_progress_count + w.total_completed > 0)
    .map(w => ({
      name: w.full_name?.split(' ')[0] || w.email?.split('@')[0] || '?',
      পেন্ডিং: w.pending_count,
      প্রসেসিং: w.in_progress_count,
      সম্পন্ন: w.completed_today,
    }));

  const taskTypeDistribution = rules.map(r => ({
    name: TASK_TYPES[r.task_type] || r.task_type,
    active: r.is_active ? 1 : 0,
  }));

  const getStaffName = (id: string) => {
    const w = workloads.find(w => w.user_id === id);
    return w?.full_name || w?.email || id.slice(0, 8);
  };

  const maxLoad = Math.max(...workloads.map(w => w.pending_count + w.in_progress_count), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> অটো-অ্যাসাইন সিস্টেম
            </h1>
            <p className="text-muted-foreground mt-1">
              স্মার্ট টাস্ক বণ্টন — রাউন্ড-রবিন ও লোড ব্যালেন্সিং সহ অটোমেটিক অ্যাসাইনমেন্ট
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchRules(); refetchWorkload(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xl font-bold">{workloads.length}</p><p className="text-[10px] text-muted-foreground">মোট স্টাফ</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
              <div><p className="text-xl font-bold">{totalPending}</p><p className="text-[10px] text-muted-foreground">পেন্ডিং টাস্ক</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg"><Loader2 className="h-4 w-4 text-blue-600" /></div>
              <div><p className="text-xl font-bold">{totalInProgress}</p><p className="text-[10px] text-muted-foreground">প্রসেসিং</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-xl font-bold">{totalCompletedToday}</p><p className="text-[10px] text-muted-foreground">আজ সম্পন্ন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg"><ListChecks className="h-4 w-4 text-purple-600" /></div>
              <div><p className="text-xl font-bold">{activeRules}</p><p className="text-[10px] text-muted-foreground">সক্রিয় রুল</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg"><Zap className="h-4 w-4 text-emerald-600" /></div>
              <div><p className="text-xl font-bold">{autoCreateRules}</p><p className="text-[10px] text-muted-foreground">অটো-ক্রিয়েট</p></div>
            </div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules"><Settings className="h-4 w-4 mr-1 hidden sm:inline" /> রুলস ও কনফিগ</TabsTrigger>
            <TabsTrigger value="workload"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> ওয়ার্কলোড</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1 hidden sm:inline" /> সাম্প্রতিক অ্যাসাইনমেন্ট</TabsTrigger>
          </TabsList>

          {/* ═══ Rules Tab ═══ */}
          <TabsContent value="rules" className="space-y-4">
            {/* Strategy Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> অ্যাসাইনমেন্ট স্ট্র্যাটেজি
                </CardTitle>
                <CardDescription>কিভাবে টাস্ক বণ্টন হবে তা নির্বাচন করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      globalStrategy === 'least_loaded'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setGlobalStrategy('least_loaded')}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Scale className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">লোড ব্যালেন্সিং</h3>
                        <p className="text-xs text-muted-foreground">সবচেয়ে কম পেন্ডিং টাস্ক আছে যার কাছে</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">স্টাফদের মধ্যে সমান কাজ বণ্টন নিশ্চিত করে। বেশি কাজ থাকলে অন্যজনকে দেয়।</p>
                  </div>
                  <div
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      globalStrategy === 'round_robin'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setGlobalStrategy('round_robin')}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Shuffle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">রাউন্ড-রবিন</h3>
                        <p className="text-xs text-muted-foreground">পালা করে প্রত্যেককে টাস্ক দেয়</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">সর্বশেষ যাকে অ্যাসাইন করা হয়নি তাকে পরবর্তী টাস্ক দেয়। সমতা বজায় রাখে।</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rules Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> অ্যাসাইনমেন্ট রুলস
                </CardTitle>
                <CardDescription>প্রতিটি টাস্ক টাইপের জন্য কোন রোলে অ্যাসাইন হবে, অটো ক্রিয়েট হবে কিনা ইত্যাদি</CardDescription>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div key={rule.id} className={`border rounded-xl p-4 transition-all ${rule.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* Left: Toggle + Name */}
                          <div className="flex items-center gap-3 flex-1">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) =>
                                updateRuleMutation.mutate({ id: rule.id, updates: { is_active: checked } })
                              }
                            />
                            <span className="text-xl">{TASK_ICONS[rule.task_type] || '📋'}</span>
                            <div>
                              <p className="font-medium">{TASK_TYPES[rule.task_type] || rule.task_type}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {rule.is_active && (
                                  <Badge variant="secondary" className="text-[9px]">
                                    {rule.auto_create_on_order ? '🟢 অর্ডারে অটো' : '⚪ ম্যানুয়াল'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Controls */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Role */}
                            <Select
                              value={rule.assigned_role}
                              onValueChange={(value) =>
                                updateRuleMutation.mutate({ id: rule.id, updates: { assigned_role: value as AppRole } })
                              }
                              disabled={!rule.is_active}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                              </SelectContent>
                            </Select>

                            {/* Priority */}
                            <Select
                              value={rule.default_priority}
                              onValueChange={(value) =>
                                updateRuleMutation.mutate({ id: rule.id, updates: { default_priority: value } })
                              }
                              disabled={!rule.is_active}
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>

                            {/* Auto-create on order */}
                            <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
                              <span className="text-[10px] text-muted-foreground">অটো</span>
                              <Switch
                                checked={rule.auto_create_on_order}
                                onCheckedChange={(checked) =>
                                  updateRuleMutation.mutate({ id: rule.id, updates: { auto_create_on_order: checked } })
                                }
                                disabled={!rule.is_active}
                                className="scale-75"
                              />
                            </div>

                            {/* Max tasks */}
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              className="w-16 h-8 text-xs text-center"
                              placeholder="ম্যাক্স"
                              value={rule.max_tasks_per_staff ?? ''}
                              onChange={(e) =>
                                updateRuleMutation.mutate({
                                  id: rule.id,
                                  updates: { max_tasks_per_staff: parseInt(e.target.value) || null }
                                })
                              }
                              disabled={!rule.is_active}
                              title="প্রতি স্টাফ সর্বোচ্চ পেন্ডিং টাস্ক"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> কীভাবে কাজ করে
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-full"><span className="text-xs font-bold text-primary px-1">১</span></div>
                      <p>নতুন অর্ডার আসলে "অটো ক্রিয়েট" চালু থাকা রুলগুলো টাস্ক তৈরি করে।</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-full"><span className="text-xs font-bold text-primary px-1">২</span></div>
                      <p>নির্ধারিত রোলের স্টাফদের মধ্যে স্ট্র্যাটেজি অনুযায়ী বণ্টন হয়।</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-full"><span className="text-xs font-bold text-primary px-1">৩</span></div>
                      <p><strong>লোড ব্যালেন্সিং:</strong> কম পেন্ডিং আছে যার, সে পায়।</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-full"><span className="text-xs font-bold text-primary px-1">৪</span></div>
                      <p><strong>রাউন্ড-রবিন:</strong> পালা করে সবাইকে সমান টাস্ক দেয়।</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-2">
                    <p className="font-semibold text-primary">💡 টিপস</p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      <li>• "অটো" চালু করলে নতুন অর্ডারে স্বয়ংক্রিয় টাস্ক তৈরি হবে</li>
                      <li>• "ম্যাক্স" সেট করলে একজনকে বেশি টাস্ক দেওয়া বন্ধ হবে</li>
                      <li>• একাধিক রুল একসাথে সক্রিয় রাখতে পারেন</li>
                      <li>• প্রায়োরিটি পরে টাস্ক লিস্টে সাজানোর জন্য ব্যবহৃত হয়</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Workload Tab ═══ */}
          <TabsContent value="workload" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">স্টাফ ওয়ার্কলোড চার্ট</CardTitle>
                </CardHeader>
                <CardContent>
                  {workloadChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={workloadChartData}>
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="পেন্ডিং" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="প্রসেসিং" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="সম্পন্ন" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">ডেটা নেই</p>
                  )}
                </CardContent>
              </Card>

              {/* Staff Cards */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">স্টাফ ওয়ার্কলোড বিস্তারিত</CardTitle>
                </CardHeader>
                <CardContent>
                  {workloadLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {workloads.sort((a, b) => (b.pending_count + b.in_progress_count) - (a.pending_count + a.in_progress_count)).map((staff) => {
                        const load = staff.pending_count + staff.in_progress_count;
                        const loadPercent = Math.min((load / maxLoad) * 100, 100);
                        return (
                          <div key={staff.user_id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{(staff.full_name || staff.email || '?').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{staff.full_name || staff.email}</p>
                                <Badge className={`text-[9px] ${ROLE_COLORS[staff.role] || ''}`}>
                                  {ROLES.find(r => r.value === staff.role)?.label || staff.role}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{load}</p>
                                <p className="text-[10px] text-muted-foreground">সক্রিয় টাস্ক</p>
                              </div>
                            </div>
                            <Progress value={loadPercent} className="h-1.5 mb-2" />
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-amber-400 rounded-full" /> পেন্ডিং: {staff.pending_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-400 rounded-full" /> প্রসেসিং: {staff.in_progress_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full" /> আজ সম্পন্ন: {staff.completed_today}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {workloads.length === 0 && <p className="text-center text-muted-foreground py-8">কোনো স্টাফ নেই</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ History Tab ═══ */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> সাম্প্রতিক অ্যাসাইনমেন্ট
                </CardTitle>
                <CardDescription>সর্বশেষ অটো ও ম্যানুয়াল অ্যাসাইনমেন্ট</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>টাস্ক</TableHead>
                      <TableHead>অর্ডার</TableHead>
                      <TableHead>অ্যাসাইনড টু</TableHead>
                      <TableHead>প্রায়োরিটি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">সময়</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTasks.map((task: any) => {
                      const priorityConfig = PRIORITIES.find(p => p.value === task.priority);
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{TASK_ICONS[task.task_type] || '📋'}</span>
                              <span className="text-sm font-medium truncate max-w-[200px]">{task.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              #{(task as any).orders?.order_number || '?'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{getStaffName(task.assigned_to)}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${priorityConfig?.color || 'bg-muted'}`}>
                              {priorityConfig?.label || task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'} className="text-[10px]">
                              {task.status === 'pending' ? 'পেন্ডিং' : task.status === 'in_progress' ? 'প্রসেসিং' : 'সম্পন্ন'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString('bn-BD')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {recentTasks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          কোনো সাম্প্রতিক টাস্ক নেই
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAutoAssign;
