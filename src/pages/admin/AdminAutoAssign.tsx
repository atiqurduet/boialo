import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Settings, Users, BarChart3 } from "lucide-react";

type AppRole = "admin" | "manager" | "support";

interface AutoAssignRule {
  id: string;
  task_type: string;
  assigned_role: AppRole;
  is_active: boolean;
}

interface StaffWorkload {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string | null;
  pending_count: number;
  in_progress_count: number;
  completed_today: number;
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

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "এডমিন" },
  { value: "manager", label: "ম্যানেজার" },
  { value: "support", label: "সাপোর্ট" },
];

const AdminAutoAssign = () => {
  const queryClient = useQueryClient();

  // Fetch auto-assign rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
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

  // Fetch staff workload
  const { data: workloads = [], isLoading: workloadLoading } = useQuery({
    queryKey: ["staff-workload"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const { data: tasks } = await supabase
        .from("order_tasks")
        .select("assigned_to, status, completed_at")
        .in("assigned_to", userIds);

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
          completed_today: userTasks.filter((t) => 
            t.status === "completed" && 
            t.completed_at && 
            new Date(t.completed_at) >= today
          ).length,
        };
      }) as StaffWorkload[];
    },
  });

  // Update rule
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutoAssignRule> }) => {
      const { error } = await supabase
        .from("task_auto_assign_rules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রুল আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["auto-assign-rules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getRoleBadge = (role: AppRole) => {
    const colors: Record<AppRole, string> = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      support: "bg-green-100 text-green-800",
    };
    const labels: Record<AppRole, string> = {
      admin: "এডমিন",
      manager: "ম্যানেজার",
      support: "সাপোর্ট",
    };
    return <Badge className={colors[role]}>{labels[role]}</Badge>;
  };

  const totalPending = workloads.reduce((sum, w) => sum + w.pending_count, 0);
  const totalInProgress = workloads.reduce((sum, w) => sum + w.in_progress_count, 0);
  const totalCompletedToday = workloads.reduce((sum, w) => sum + w.completed_today, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">অটো-অ্যাসাইন সেটিংস</h1>
          <p className="text-muted-foreground">
            টাস্ক অটোমেটিক্যালি স্টাফদের মধ্যে লোড ব্যালেন্সিং এর মাধ্যমে বণ্টন হবে
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">মোট স্টাফ</p>
                  <p className="text-2xl font-bold">{workloads.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">পেন্ডিং</p>
                  <p className="text-2xl font-bold">{totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Loader2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">প্রসেসিং</p>
                  <p className="text-2xl font-bold">{totalInProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">আজ সম্পন্ন</p>
                  <p className="text-2xl font-bold">{totalCompletedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Auto-assign Rules */}
          <Card>
            <CardHeader>
              <CardTitle>অ্যাসাইনমেন্ট রুলস</CardTitle>
              <CardDescription>
                কোন টাস্ক কোন রোলে অটো-অ্যাসাইন হবে তা নির্ধারণ করুন
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) =>
                            updateRuleMutation.mutate({ id: rule.id, updates: { is_active: checked } })
                          }
                        />
                        <span className={rule.is_active ? "" : "text-muted-foreground"}>
                          {TASK_TYPES[rule.task_type] || rule.task_type}
                        </span>
                      </div>
                      <Select
                        value={rule.assigned_role}
                        onValueChange={(value) =>
                          updateRuleMutation.mutate({ 
                            id: rule.id, 
                            updates: { assigned_role: value as AppRole } 
                          })
                        }
                        disabled={!rule.is_active}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Workload */}
          <Card>
            <CardHeader>
              <CardTitle>স্টাফ ওয়ার্কলোড</CardTitle>
              <CardDescription>
                বর্তমান টাস্ক ডিস্ট্রিবিউশন
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workloadLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : workloads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  কোনো স্টাফ নেই।
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>স্টাফ</TableHead>
                      <TableHead className="text-center">পেন্ডিং</TableHead>
                      <TableHead className="text-center">প্রসেসিং</TableHead>
                      <TableHead className="text-center">আজ সম্পন্ন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workloads
                      .sort((a, b) => a.pending_count - b.pending_count)
                      .map((staff) => (
                        <TableRow key={staff.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{staff.full_name || "N/A"}</p>
                              <div className="flex items-center gap-1">
                                {getRoleBadge(staff.role)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-50">
                              {staff.pending_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50">
                              {staff.in_progress_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50">
                              {staff.completed_today}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>লোড ব্যালেন্সিং কীভাবে কাজ করে</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Badge className="bg-primary">১</Badge>
                <p>নতুন টাস্ক তৈরি হলে সিস্টেম টাস্ক টাইপ চেক করে।</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-primary">২</Badge>
                <p>সেই টাস্ক টাইপের জন্য নির্ধারিত রোল খোঁজে (উপরের রুলস অনুযায়ী)।</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-primary">৩</Badge>
                <p>সেই রোলের সকল স্টাফদের মধ্যে যার সবচেয়ে কম পেন্ডিং টাস্ক আছে তাকে খোঁজে।</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-primary">৪</Badge>
                <p>সবচেয়ে কম লোডেড স্টাফকে অটোমেটিক্যালি টাস্কটি অ্যাসাইন করে।</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAutoAssign;
