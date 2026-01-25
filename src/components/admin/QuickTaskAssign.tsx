import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UserPlus, User } from "lucide-react";

interface QuickTaskAssignProps {
  orderId: string;
  orderNumber: string;
  assignedTo?: string | null;
  onComplete?: () => void;
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
  { value: "low", label: "কম" },
  { value: "normal", label: "সাধারণ" },
  { value: "high", label: "উচ্চ" },
  { value: "urgent", label: "জরুরি" },
];

export const QuickTaskAssign = ({
  orderId,
  orderNumber,
  assignedTo,
  onComplete,
}: QuickTaskAssignProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState("order_processing");
  const [selectedUser, setSelectedUser] = useState("");
  const [priority, setPriority] = useState("normal");
  const [title, setTitle] = useState("");

  // Fetch team members grouped by role
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;

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

  // Get current assignee name
  const assigneeName = assignedTo
    ? teamMembers.find((m) => m.user_id === assignedTo)?.full_name ||
      teamMembers.find((m) => m.user_id === assignedTo)?.email ||
      "অ্যাসাইনড"
    : null;

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const taskTitle = title || `${TASK_TYPES.find(t => t.value === taskType)?.label} - ${orderNumber}`;
      
      const { error } = await supabase.from("order_tasks").insert({
        order_id: orderId,
        task_type: taskType,
        title: taskTitle,
        priority,
        assigned_to: selectedUser,
        assigned_by: user?.id || null,
      });

      if (error) throw error;

      // Update order assigned_to
      await supabase
        .from("orders")
        .update({ assigned_to: selectedUser })
        .eq("id", orderId);
    },
    onSuccess: () => {
      toast.success("টাস্ক অ্যাসাইন করা হয়েছে");
      setOpen(false);
      setTitle("");
      setSelectedUser("");
      setTaskType("order_processing");
      setPriority("normal");
      queryClient.invalidateQueries({ queryKey: ["order-tasks", orderId] });
      onComplete?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={assigneeName ? "outline" : "ghost"}
          size="icon"
          title={assigneeName ? `অ্যাসাইনড: ${assigneeName}` : "টাস্ক অ্যাসাইন করুন"}
          className="relative"
        >
          <UserPlus className="h-4 w-4" />
          {assigneeName && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>দ্রুত টাস্ক অ্যাসাইন - {orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Task Type */}
          <div className="space-y-2">
            <Label>টাস্কের ধরন</Label>
            <Select value={taskType} onValueChange={setTaskType}>
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

          {/* Title (optional) */}
          <div className="space-y-2">
            <Label>টাইটেল (ঐচ্ছিক)</Label>
            <Input
              placeholder="অটো-জেনারেট হবে..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Assign To - Grouped by Role */}
          <div className="space-y-2">
            <Label>অ্যাসাইন করুন (রোল অনুযায়ী)</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="টিম মেম্বার সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                {["admin", "manager", "support"].map((role) => {
                  const roleMembers = teamMembers.filter((m) => m.role === role);
                  if (roleMembers.length === 0) return null;
                  return (
                    <div key={role}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                        <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                          {role === "admin" ? "এডমিন" : role === "manager" ? "ম্যানেজার" : "সাপোর্ট"}
                        </Badge>
                        <span>({roleMembers.length} জন)</span>
                      </div>
                      {roleMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{member.full_name || member.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>প্রায়োরিটি</Label>
            <Select value={priority} onValueChange={setPriority}>
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

          {/* Submit */}
          <Button
            onClick={() => createTaskMutation.mutate()}
            disabled={createTaskMutation.isPending || !selectedUser}
            className="w-full"
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                অ্যাসাইন হচ্ছে...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                টাস্ক অ্যাসাইন করুন
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
