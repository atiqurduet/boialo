import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, UserPlus, CheckCircle2, Clock, AlertCircle, User } from "lucide-react";

interface OrderTaskAssignmentProps {
  orderId: string;
  orderNumber: string;
}

interface Task {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  assigned_to: string;
  assigned_by: string | null;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
}

const TASK_TYPES = [
  { value: "order_processing", label: "অর্ডার প্রসেসিং" },
  { value: "payment_collection", label: "পেমেন্ট কালেকশন" },
  { value: "courier_booking", label: "কুরিয়ার বুকিং" },
  { value: "delivery_followup", label: "ডেলিভারি ফলোআপ" },
  { value: "customer_support", label: "কাস্টমার সাপোর্ট" },
  { value: "return_handling", label: "রিটার্ন হ্যান্ডলিং" },
];

const PRIORITIES = [
  { value: "low", label: "কম", color: "bg-gray-100 text-gray-800" },
  { value: "normal", label: "সাধারণ", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "উচ্চ", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "জরুরি", color: "bg-red-100 text-red-800" },
];

const TASK_STATUSES = [
  { value: "pending", label: "পেন্ডিং", icon: Clock, color: "text-yellow-600" },
  { value: "in_progress", label: "চলমান", icon: AlertCircle, color: "text-blue-600" },
  { value: "completed", label: "সম্পন্ন", icon: CheckCircle2, color: "text-green-600" },
  { value: "cancelled", label: "বাতিল", icon: AlertCircle, color: "text-gray-600" },
];

export const OrderTaskAssignment = ({ orderId, orderNumber }: OrderTaskAssignmentProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    task_type: "order_processing",
    title: "",
    description: "",
    priority: "normal",
    assigned_to: "",
    due_date: "",
  });

  // Fetch team members (users with roles)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;

      // Get profiles for these users
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profileError) throw profileError;

      return roles.map((role) => {
        const profile = profiles?.find((p) => p.id === role.user_id);
        return {
          user_id: role.user_id,
          role: role.role,
          email: profile?.email || "Unknown",
          full_name: profile?.full_name || null,
        };
      }) as TeamMember[];
    },
  });

  // Fetch tasks for this order
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["order-tasks", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_tasks")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("order_tasks").insert({
        order_id: orderId,
        task_type: newTask.task_type,
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to,
        assigned_by: user?.id || null,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      });

      if (error) throw error;

      // Update order assigned_to if not already set
      await supabase
        .from("orders")
        .update({ assigned_to: newTask.assigned_to })
        .eq("id", orderId)
        .is("assigned_to", null);
    },
    onSuccess: () => {
      toast.success("টাস্ক অ্যাসাইন করা হয়েছে");
      setIsDialogOpen(false);
      setNewTask({
        task_type: "order_processing",
        title: "",
        description: "",
        priority: "normal",
        assigned_to: "",
        due_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ["order-tasks", orderId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("order_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("টাস্ক আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["order-tasks", orderId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getAssigneeName = (userId: string) => {
    const member = teamMembers.find((m) => m.user_id === userId);
    return member?.full_name || member?.email || "Unknown";
  };

  const getTaskTypeLabel = (type: string) => {
    return TASK_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find((pr) => pr.value === priority);
    return p ? (
      <Badge className={p.color}>{p.label}</Badge>
    ) : (
      <Badge variant="outline">{priority}</Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const s = TASK_STATUSES.find((st) => st.value === status);
    if (!s) return null;
    const Icon = s.icon;
    return <Icon className={`h-4 w-4 ${s.color}`} />;
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          টাস্ক অ্যাসাইনমেন্ট
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              নতুন টাস্ক
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন টাস্ক অ্যাসাইন করুন - {orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Task Type */}
              <div className="space-y-2">
                <Label>টাস্কের ধরন</Label>
                <Select
                  value={newTask.task_type}
                  onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>টাইটেল</Label>
                <Input
                  placeholder="টাস্কের শিরোনাম..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>

              {/* Assign To */}
              <div className="space-y-2">
                <Label>অ্যাসাইন করুন</Label>
                <Select
                  value={newTask.assigned_to}
                  onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="টিম মেম্বার সিলেক্ট করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{member.full_name || member.email}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {member.role === "admin"
                              ? "এডমিন"
                              : member.role === "manager"
                              ? "ম্যানেজার"
                              : "সাপোর্ট"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>প্রায়োরিটি</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label>শেষ তারিখ (ঐচ্ছিক)</Label>
                <Input
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>বিস্তারিত (ঐচ্ছিক)</Label>
                <Textarea
                  placeholder="টাস্কের বিস্তারিত বিবরণ..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={() => createTaskMutation.mutate()}
                disabled={createTaskMutation.isPending || !newTask.title || !newTask.assigned_to}
                className="w-full"
              >
                {createTaskMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    অ্যাসাইন হচ্ছে...
                  </>
                ) : (
                  "টাস্ক অ্যাসাইন করুন"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>কোন টাস্ক অ্যাসাইন করা হয়নি</p>
            <p className="text-sm">নতুন টাস্ক বাটনে ক্লিক করে টাস্ক অ্যাসাইন করুন</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                  </div>
                  {getPriorityBadge(task.priority)}
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">ধরন:</span>
                    <Badge variant="outline">{getTaskTypeLabel(task.task_type)}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">অ্যাসাইনি:</span>
                    <span className="font-medium">{getAssigneeName(task.assigned_to)}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">শেষ তারিখ:</span>
                      <span>{new Date(task.due_date).toLocaleString("bn-BD")}</span>
                    </div>
                  )}
                  {task.description && (
                    <p className="text-muted-foreground">{task.description}</p>
                  )}

                  {/* Status Update */}
                  {task.status !== "completed" && task.status !== "cancelled" && (
                    <div className="flex gap-2 pt-2">
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })
                          }
                          disabled={updateTaskMutation.isPending}
                        >
                          শুরু করুন
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() =>
                          updateTaskMutation.mutate({ taskId: task.id, status: "completed" })
                        }
                        disabled={updateTaskMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        সম্পন্ন
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
