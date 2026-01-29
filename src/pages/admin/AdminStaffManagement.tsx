import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  UserPlus, 
  Users, 
  Mail,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

type AppRole = "admin" | "manager" | "support";

interface StaffMember {
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  pending_tasks?: number;
}

interface StaffInvitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "এডমিন", description: "সম্পূর্ণ অ্যাক্সেস" },
  { value: "manager", label: "ম্যানেজার", description: "অর্ডার ও প্রোডাক্ট ম্যানেজমেন্ট" },
  { value: "support", label: "সাপোর্ট", description: "কাস্টমার সাপোর্ট ও টাস্ক" },
];

const AdminStaffManagement = () => {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("support");
  const [newRole, setNewRole] = useState<AppRole>("support");

  // Fetch staff members
  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      // Get pending task counts
      const { data: tasks } = await supabase
        .from("order_tasks")
        .select("assigned_to")
        .eq("status", "pending")
        .in("assigned_to", userIds);

      const taskCounts: Record<string, number> = {};
      tasks?.forEach((t) => {
        taskCounts[t.assigned_to] = (taskCounts[t.assigned_to] || 0) + 1;
      });

      return roles.map((role) => ({
        ...role,
        profile: profiles?.find((p) => p.id === role.user_id),
        pending_tasks: taskCounts[role.user_id] || 0,
      })) as StaffMember[];
    },
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StaffInvitation[];
    },
  });

  // Send invitation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from("staff_invitations").insert({
        email,
        role,
        token,
        invited_by: user?.id,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;
      return { email, token };
    },
    onSuccess: ({ email }) => {
      toast.success(`${email} কে ইনভাইট পাঠানো হয়েছে`);
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("support");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রোল আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setEditingStaff(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete staff
  const deleteStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("স্টাফ সরিয়ে দেওয়া হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete invitation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ইনভাইটেশন বাতিল হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">স্টাফ ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">টিম মেম্বার ও রোল ম্যানেজ করুন</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                নতুন স্টাফ ইনভাইট
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>নতুন স্টাফ ইনভাইট করুন</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>ইমেইল</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>রোল</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span>{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    বাতিল
                  </Button>
                  <Button
                    onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                    disabled={inviteMutation.isPending || !inviteEmail}
                  >
                    {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    ইনভাইট পাঠান
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                  <p className="text-2xl font-bold">{staffMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">এডমিন</p>
                  <p className="text-2xl font-bold">
                    {staffMembers.filter((s) => s.role === "admin").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Mail className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">পেন্ডিং ইনভাইট</p>
                  <p className="text-2xl font-bold">
                    {invitations.filter((i) => i.status === "pending").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">পেন্ডিং টাস্ক</p>
                  <p className="text-2xl font-bold">
                    {staffMembers.reduce((sum, s) => sum + (s.pending_tasks || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="staff">
          <TabsList>
            <TabsTrigger value="staff">স্টাফ মেম্বার</TabsTrigger>
            <TabsTrigger value="invitations">ইনভাইটেশন</TabsTrigger>
            <TabsTrigger value="roles">রোল পার্মিশন</TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>সক্রিয় স্টাফ</CardTitle>
                <CardDescription>সিস্টেমে অ্যাক্সেস আছে এমন সকল স্টাফ</CardDescription>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : staffMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    কোনো স্টাফ নেই।
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>নাম</TableHead>
                        <TableHead>ইমেইল</TableHead>
                        <TableHead>রোল</TableHead>
                        <TableHead>পেন্ডিং টাস্ক</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMembers.map((staff) => (
                        <TableRow key={staff.user_id}>
                          <TableCell className="font-medium">
                            {staff.profile?.full_name || "N/A"}
                          </TableCell>
                          <TableCell>{staff.profile?.email}</TableCell>
                          <TableCell>{getRoleBadge(staff.role)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{staff.pending_tasks}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingStaff(staff);
                                setNewRole(staff.role);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("এই স্টাফকে সরিয়ে দিতে চান?")) {
                                  deleteStaffMutation.mutate(staff.user_id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle>ইনভাইটেশন</CardTitle>
                <CardDescription>পাঠানো ইনভাইটেশনের তালিকা</CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    কোনো ইনভাইটেশন নেই।
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ইমেইল</TableHead>
                        <TableHead>রোল</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>এক্সপায়ার</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>{getRoleBadge(invite.role)}</TableCell>
                          <TableCell>
                            {invite.status === "pending" ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                অপেক্ষমাণ
                              </Badge>
                            ) : invite.status === "accepted" ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                গৃহীত
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                এক্সপায়ার্ড
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invite.expires_at), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            {invite.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("এই ইনভাইটেশন বাতিল করতে চান?")) {
                                    deleteInvitationMutation.mutate(invite.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>রোল পার্মিশন</CardTitle>
                <CardDescription>বিভিন্ন রোলের অ্যাক্সেস লেভেল</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {ROLES.map((role) => (
                    <div key={role.value} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getRoleBadge(role.value)}
                        <span className="font-medium">{role.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {role.value === "admin" && (
                          <>
                            <Badge variant="outline">✓ সকল মেনু অ্যাক্সেস</Badge>
                            <Badge variant="outline">✓ স্টাফ ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ সেটিংস</Badge>
                            <Badge variant="outline">✓ রোল অ্যাসাইন</Badge>
                            <Badge variant="outline">✓ ডিলিট পার্মিশন</Badge>
                            <Badge variant="outline">✓ রিপোর্ট</Badge>
                          </>
                        )}
                        {role.value === "manager" && (
                          <>
                            <Badge variant="outline">✓ অর্ডার ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ প্রোডাক্ট ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ কাস্টমার ভিউ</Badge>
                            <Badge variant="outline">✓ টাস্ক অ্যাসাইন</Badge>
                            <Badge variant="outline">✓ রিফান্ড প্রসেসিং</Badge>
                            <Badge variant="outline">✗ সেটিংস</Badge>
                          </>
                        )}
                        {role.value === "support" && (
                          <>
                            <Badge variant="outline">✓ অ্যাসাইনড টাস্ক</Badge>
                            <Badge variant="outline">✓ অর্ডার ভিউ</Badge>
                            <Badge variant="outline">✓ চ্যাট সাপোর্ট</Badge>
                            <Badge variant="outline">✗ এডিট পার্মিশন</Badge>
                            <Badge variant="outline">✗ ডিলিট পার্মিশন</Badge>
                            <Badge variant="outline">✗ সেটিংস</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Role Modal */}
        <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>রোল পরিবর্তন</DialogTitle>
            </DialogHeader>
            {editingStaff && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-muted-foreground">স্টাফ</Label>
                  <p className="font-medium">{editingStaff.profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{editingStaff.profile?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>নতুন রোল</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger>
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
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingStaff(null)}>
                    বাতিল
                  </Button>
                  <Button
                    onClick={() => updateRoleMutation.mutate({ userId: editingStaff.user_id, role: newRole })}
                    disabled={updateRoleMutation.isPending}
                  >
                    {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    আপডেট করুন
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffManagement;
