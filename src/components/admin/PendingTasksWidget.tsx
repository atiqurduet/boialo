import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ClipboardList, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

interface Task {
  id: string;
  order_id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  orders?: {
    order_number: string;
  };
}

const TASK_TYPE_LABELS: Record<string, string> = {
  order_processing: "অর্ডার প্রসেসিং",
  payment_collection: "পেমেন্ট কালেকশন",
  courier_booking: "কুরিয়ার বুকিং",
  delivery_followup: "ডেলিভারি ফলোআপ",
  customer_support: "কাস্টমার সাপোর্ট",
  return_handling: "রিটার্ন হ্যান্ডলিং",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  urgent: { label: "জরুরি", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  high: { label: "উচ্চ", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  normal: { label: "সাধারণ", color: "bg-blue-100 text-blue-800", icon: Clock },
  low: { label: "কম", color: "bg-gray-100 text-gray-800", icon: Clock },
};

export const PendingTasksWidget = () => {
  const queryClient = useQueryClient();

  // Fetch pending tasks for current user
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-pending-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("order_tasks")
        .select(`
          id,
          order_id,
          task_type,
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          orders!inner(order_number)
        `)
        .eq("assigned_to", user.id)
        .in("status", ["pending", "in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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
    onSuccess: (_, { status }) => {
      toast.success(status === "completed" ? "টাস্ক সম্পন্ন হয়েছে" : "টাস্ক শুরু হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["my-pending-tasks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            আমার টাস্ক
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            আমার টাস্ক
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tasks.length}
              </Badge>
            )}
          </CardTitle>
          <Link to="/admin/orders">
            <Button variant="ghost" size="sm">
              সব দেখুন
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">কোন পেন্ডিং টাস্ক নেই</p>
            <p className="text-sm">আপনার সব কাজ শেষ!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border ${
                  isOverdue(task.due_date) ? "border-red-200 bg-red-50" : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{task.title}</span>
                      {getPriorityBadge(task.priority)}
                      {task.status === "in_progress" && (
                        <Badge variant="outline" className="bg-blue-50">
                          চলমান
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{TASK_TYPE_LABELS[task.task_type] || task.task_type}</span>
                      <span>•</span>
                      <Link 
                        to={`/admin/orders`} 
                        className="font-mono hover:text-primary"
                      >
                        #{task.orders?.order_number}
                      </Link>
                    </div>
                    {task.due_date && (
                      <div className={`text-xs mt-1 ${isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {isOverdue(task.due_date) ? "⚠️ " : ""}
                        শেষ তারিখ: {new Date(task.due_date).toLocaleString("bn-BD")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })}
                        disabled={updateTaskMutation.isPending}
                        title="শুরু করুন"
                      >
                        {updateTaskMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                      disabled={updateTaskMutation.isPending}
                      title="সম্পন্ন করুন"
                    >
                      {updateTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
