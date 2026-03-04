import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Search, Shield, Trash2, UserPlus, Users, Mail, Clock, CheckCircle, XCircle,
  MoreHorizontal, Edit, Loader2, RefreshCw, Send, Copy, UserCheck, UserX,
  Filter, Download, ChevronDown, AlertTriangle, Eye,
} from 'lucide-react';

type AppRole = 'admin' | 'manager' | 'support';

interface StaffMember {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string | null;
  };
  pending_tasks: number;
  is_active: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  { value: 'admin', label: 'সুপার এডমিন', description: 'সম্পূর্ণ অ্যাক্সেস - সব কিছু ম্যানেজ করতে পারবে', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'manager', label: 'ম্যানেজার', description: 'প্রোডাক্ট, অর্ডার, কাস্টমার ম্যানেজমেন্ট', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'support', label: 'সাপোর্ট', description: 'শুধু অর্ডার দেখা ও কাস্টমার সাপোর্ট', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
];

const getRoleInfo = (role: AppRole) => ROLES.find(r => r.value === role) || ROLES[2];

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addDirectOpen, setAddDirectOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [viewingUser, setViewingUser] = useState<StaffMember | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('support');

  // Direct add form
  const [directEmail, setDirectEmail] = useState('');
  const [directRole, setDirectRole] = useState<AppRole>('support');

  // Edit form
  const [editRole, setEditRole] = useState<AppRole>('support');

  // Fetch staff members
  const { data: staffMembers = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, created_at')
        .in('id', userIds);

      const { data: tasks } = await supabase
        .from('order_tasks')
        .select('assigned_to')
        .eq('status', 'pending')
        .in('assigned_to', userIds);

      const taskCounts: Record<string, number> = {};
      tasks?.forEach(t => {
        taskCounts[t.assigned_to] = (taskCounts[t.assigned_to] || 0) + 1;
      });

      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id),
        pending_tasks: taskCounts[role.user_id] || 0,
        is_active: true, // Role exists = active
      })) as StaffMember[];
    },
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invLoading } = useQuery({
    queryKey: ['admin-users-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
  });

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // Check if already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        // Check if already has a role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', existing.id)
          .maybeSingle();
        if (existingRole) throw new Error('এই ইউজারের ইতিমধ্যে একটি রোল আছে');
      }

      // Check pending invitation
      const { data: pendingInvite } = await supabase
        .from('staff_invitations')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();
      if (pendingInvite) throw new Error('এই ইমেইলে ইতিমধ্যে একটি পেন্ডিং ইনভাইটেশন আছে');

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('staff_invitations').insert({
        email: email.trim().toLowerCase(),
        role,
        token,
        invited_by: currentUser?.id,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      // Send email
      const inviteUrl = `${window.location.origin}/sign-in?invite=${token}`;
      const roleLabel = getRoleInfo(role).label;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b;">স্টাফ ইনভাইটেশন</h2>
          <p>আপনাকে <strong>${roleLabel}</strong> হিসেবে যোগদানের জন্য আমন্ত্রণ জানানো হয়েছে।</p>
          <p>নিচের বাটনে ক্লিক করে সাইন আপ করুন:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">একাউন্ট তৈরি করুন</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">এই লিংক ৭ দিন পর্যন্ত বৈধ থাকবে।</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">যদি আপনি এই ইনভাইটেশন আশা না করে থাকেন, এই ইমেইল উপেক্ষা করুন।</p>
        </div>`;

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: { to: email.trim(), subject: 'স্টাফ ইনভাইটেশন - Boialo', html: emailHtml },
      });
      if (emailError) {
        toast.warning('ইনভাইটেশন তৈরি হয়েছে কিন্তু ইমেইল পাঠাতে সমস্যা হয়েছে');
      }
    },
    onSuccess: () => {
      toast.success('ইনভাইটেশন পাঠানো হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('support');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Direct add user (existing user by email)
  const directAddMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single();
      if (pErr || !profile) throw new Error('এই ইমেইলে কোন ইউজার পাওয়া যায়নি। ইউজারকে প্রথমে সাইন আপ করতে হবে অথবা ইনভাইটেশন পাঠান।');

      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (existing) throw new Error('এই ইউজারের ইতিমধ্যে একটি রোল আছে');

      const { error } = await supabase.from('user_roles').insert([{ user_id: profile.id, role }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ইউজার যোগ হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] });
      setAddDirectOpen(false);
      setDirectEmail('');
      setDirectRole('support');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from('user_roles').update({ role }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('রোল আপডেট হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] });
      setEditingUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete user role
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === user?.id) throw new Error('আপনি নিজেকে রিমুভ করতে পারবেন না');
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ইউজার রিমুভ হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete invitation
  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ইনভাইটেশন বাতিল হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Resend invitation
  const resendInviteMutation = useMutation({
    mutationFn: async (invite: Invitation) => {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('staff_invitations')
        .update({ token: newToken, expires_at: expiresAt.toISOString(), status: 'pending' })
        .eq('id', invite.id);
      if (error) throw error;

      const inviteUrl = `${window.location.origin}/sign-in?invite=${newToken}`;
      const roleLabel = getRoleInfo(invite.role).label;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b;">স্টাফ ইনভাইটেশন (পুনরায়)</h2>
          <p>আপনাকে <strong>${roleLabel}</strong> হিসেবে যোগদানের জন্য পুনরায় আমন্ত্রণ জানানো হচ্ছে।</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">একাউন্ট তৈরি করুন</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">এই লিংক ৭ দিন পর্যন্ত বৈধ থাকবে।</p>
        </div>`;

      await supabase.functions.invoke('send-email', {
        body: { to: invite.email, subject: 'স্টাফ ইনভাইটেশন (পুনরায়) - Boialo', html: emailHtml },
      });
    },
    onSuccess: () => {
      toast.success('ইনভাইটেশন পুনরায় পাঠানো হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const filtered = userIds.filter(id => id !== user?.id);
      if (filtered.length === 0) throw new Error('নিজেকে রিমুভ করা যাবে না');
      const { error } = await supabase.from('user_roles').delete().in('user_id', filtered);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('সিলেক্টেড ইউজার রিমুভ হয়েছে');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filtered staff
  const filteredStaff = staffMembers.filter(s => {
    const matchSearch = !search ||
      s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.profile?.phone?.includes(search);
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStaff.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStaff.map(s => s.user_id));
    }
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const expiredInvitations = invitations.filter(i => i.status !== 'pending' && i.status !== 'accepted' || new Date(i.expires_at) < new Date());

  const stats = {
    total: staffMembers.length,
    admins: staffMembers.filter(s => s.role === 'admin').length,
    managers: staffMembers.filter(s => s.role === 'manager').length,
    support: staffMembers.filter(s => s.role === 'support').length,
    pendingInvites: pendingInvitations.length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ইউজার ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">সুপার এডমিন - সকল ইউজার ও রোল ম্যানেজ করুন</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  নতুন ইউজার
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  ইমেইলে ইনভাইটেশন পাঠান
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAddDirectOpen(true)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  বিদ্যমান ইউজারকে রোল দিন
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'মোট স্টাফ', value: stats.total, icon: Users, bg: 'bg-primary/10', fg: 'text-primary' },
            { label: 'সুপার এডমিন', value: stats.admins, icon: Shield, bg: 'bg-destructive/10', fg: 'text-destructive' },
            { label: 'ম্যানেজার', value: stats.managers, icon: Edit, bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600' },
            { label: 'সাপোর্ট', value: stats.support, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', fg: 'text-green-600' },
            { label: 'পেন্ডিং ইনভাইট', value: stats.pendingInvites, icon: Clock, bg: 'bg-yellow-100 dark:bg-yellow-900/30', fg: 'text-yellow-600' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.fg}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="staff">
          <TabsList>
            <TabsTrigger value="staff">
              <Users className="h-4 w-4 mr-1" />
              সক্রিয় ইউজার ({staffMembers.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              <Mail className="h-4 w-4 mr-1" />
              ইনভাইটেশন ({invitations.length})
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="h-4 w-4 mr-1" />
              রোল ও পার্মিশন
            </TabsTrigger>
          </TabsList>

          {/* Active Users Tab */}
          <TabsContent value="staff" className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="রোল" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল রোল</SelectItem>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {selectedIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`${selectedIds.length} জন ইউজার রিমুভ করতে চান?`)) {
                        bulkDeleteMutation.mutate(selectedIds);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {selectedIds.length} জন রিমুভ
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => refetchStaff()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {search || roleFilter !== 'all' ? 'কোনো ইউজার পাওয়া যায়নি' : 'কোনো স্টাফ নেই। নতুন ইউজার যোগ করুন।'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedIds.length === filteredStaff.length && filteredStaff.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>ইউজার</TableHead>
                        <TableHead>রোল</TableHead>
                        <TableHead className="hidden md:table-cell">ফোন</TableHead>
                        <TableHead className="hidden md:table-cell">পেন্ডিং টাস্ক</TableHead>
                        <TableHead className="hidden lg:table-cell">যোগদান</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map(staff => {
                        const roleInfo = getRoleInfo(staff.role);
                        const isSelf = staff.user_id === user?.id;
                        return (
                          <TableRow key={staff.user_id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(staff.user_id)}
                                onCheckedChange={() => toggleSelect(staff.user_id)}
                                disabled={isSelf}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary font-semibold text-sm">
                                    {staff.profile?.full_name?.[0]?.toUpperCase() || staff.profile?.email?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate flex items-center gap-1">
                                    {staff.profile?.full_name || 'N/A'}
                                    {isSelf && <Badge variant="outline" className="text-[10px] px-1 py-0">আপনি</Badge>}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">{staff.profile?.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm">{staff.profile?.phone || '—'}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {staff.pending_tasks > 0 ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{staff.pending_tasks}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">০</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(staff.created_at), 'dd/MM/yyyy')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewingUser(staff)}>
                                    <Eye className="h-4 w-4 mr-2" /> বিস্তারিত দেখুন
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditingUser(staff); setEditRole(staff.role); }}>
                                    <Edit className="h-4 w-4 mr-2" /> রোল পরিবর্তন
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={isSelf}
                                    onClick={() => {
                                      if (confirm(`${staff.profile?.full_name || staff.profile?.email} কে রিমুভ করতে চান?`)) {
                                        deleteUserMutation.mutate(staff.user_id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> রিমুভ করুন
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ইনভাইটেশন</CardTitle>
                    <CardDescription>পাঠানো ইনভাইটেশনের তালিকা</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    নতুন ইনভাইট
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invLoading ? (
                  <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">কোনো ইনভাইটেশন নেই।</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ইমেইল</TableHead>
                        <TableHead>রোল</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead className="hidden md:table-cell">তারিখ</TableHead>
                        <TableHead className="hidden md:table-cell">এক্সপায়ার</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map(inv => {
                        const isExpired = new Date(inv.expires_at) < new Date();
                        const roleInfo = getRoleInfo(inv.role);
                        const statusDisplay = inv.status === 'accepted'
                          ? { icon: CheckCircle, label: 'গৃহীত', color: 'bg-green-100 text-green-800' }
                          : isExpired
                            ? { icon: XCircle, label: 'এক্সপায়ার্ড', color: 'bg-red-100 text-red-800' }
                            : { icon: Clock, label: 'অপেক্ষমাণ', color: 'bg-yellow-100 text-yellow-800' };

                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.email}</TableCell>
                            <TableCell><Badge className={roleInfo.color}>{roleInfo.label}</Badge></TableCell>
                            <TableCell>
                              <Badge className={statusDisplay.color}>
                                <statusDisplay.icon className="h-3 w-3 mr-1" />
                                {statusDisplay.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {format(new Date(inv.created_at), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {format(new Date(inv.expires_at), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {(inv.status === 'pending' || isExpired) && inv.status !== 'accepted' && (
                                    <DropdownMenuItem onClick={() => resendInviteMutation.mutate(inv)}>
                                      <Send className="h-4 w-4 mr-2" /> পুনরায় পাঠান
                                    </DropdownMenuItem>
                                  )}
                                  {inv.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/sign-in?invite=${inv.token}`);
                                      toast.success('ইনভাইট লিংক কপি হয়েছে');
                                    }}>
                                      <Copy className="h-4 w-4 mr-2" /> লিংক কপি
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm('এই ইনভাইটেশন বাতিল করতে চান?')) {
                                        deleteInviteMutation.mutate(inv.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> বাতিল করুন
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>রোল ও পার্মিশন ম্যাট্রিক্স</CardTitle>
                <CardDescription>প্রতিটি রোলের অ্যাক্সেস লেভেল</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {ROLES.map(role => (
                    <div key={role.value} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={role.color}>{role.label}</Badge>
                        <span className="text-sm text-muted-foreground">— {role.description}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-3">
                        {role.value === 'admin' && (
                          <>
                            <Badge variant="outline">✓ সকল মেনু অ্যাক্সেস</Badge>
                            <Badge variant="outline">✓ ইউজার ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ সেটিংস</Badge>
                            <Badge variant="outline">✓ রোল অ্যাসাইন</Badge>
                            <Badge variant="outline">✓ ডিলিট পার্মিশন</Badge>
                            <Badge variant="outline">✓ রিপোর্ট ও এনালিটিক্স</Badge>
                          </>
                        )}
                        {role.value === 'manager' && (
                          <>
                            <Badge variant="outline">✓ অর্ডার ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ প্রোডাক্ট ম্যানেজমেন্ট</Badge>
                            <Badge variant="outline">✓ কাস্টমার ভিউ</Badge>
                            <Badge variant="outline">✓ টাস্ক অ্যাসাইন</Badge>
                            <Badge variant="outline">✓ রিফান্ড প্রসেসিং</Badge>
                            <Badge variant="outline">✗ সেটিংস</Badge>
                          </>
                        )}
                        {role.value === 'support' && (
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

        {/* =================== DIALOGS =================== */}

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ইমেইলে ইনভাইটেশন পাঠান</DialogTitle>
              <DialogDescription>ইউজারের ইমেইলে ইনভাইটেশন লিংক পাঠানো হবে</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ইমেইল</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>রোল</Label>
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {r.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>বাতিল</Button>
                <Button
                  onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                  disabled={inviteMutation.isPending || !inviteEmail.trim()}
                >
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Send className="h-4 w-4 mr-2" />
                  ইনভাইট পাঠান
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Direct Add Dialog */}
        <Dialog open={addDirectOpen} onOpenChange={setAddDirectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>বিদ্যমান ইউজারকে রোল দিন</DialogTitle>
              <DialogDescription>ইউজারকে প্রথমে সাইটে সাইন আপ করতে হবে</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ইউজার ইমেইল</Label>
                <Input
                  type="email"
                  value={directEmail}
                  onChange={e => setDirectEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>রোল</Label>
                <Select value={directRole} onValueChange={v => setDirectRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {r.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddDirectOpen(false)}>বাতিল</Button>
                <Button
                  onClick={() => directAddMutation.mutate({ email: directEmail, role: directRole })}
                  disabled={directAddMutation.isPending || !directEmail.trim()}
                >
                  {directAddMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  যোগ করুন
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>রোল পরিবর্তন</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {editingUser.profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{editingUser.profile?.full_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{editingUser.profile?.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>নতুন রোল</Label>
                  <Select value={editRole} onValueChange={v => setEditRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingUser(null)}>বাতিল</Button>
                  <Button
                    onClick={() => updateRoleMutation.mutate({ userId: editingUser.user_id, role: editRole })}
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

        {/* View User Dialog */}
        <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ইউজার বিস্তারিত</DialogTitle>
            </DialogHeader>
            {viewingUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {viewingUser.profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{viewingUser.profile?.full_name || 'N/A'}</p>
                    <Badge className={getRoleInfo(viewingUser.role).color}>{getRoleInfo(viewingUser.role).label}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  <div>
                    <p className="text-muted-foreground">ইমেইল</p>
                    <p className="font-medium">{viewingUser.profile?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ফোন</p>
                    <p className="font-medium">{viewingUser.profile?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">রোল যোগ হয়েছে</p>
                    <p className="font-medium">{format(new Date(viewingUser.created_at), 'dd/MM/yyyy hh:mm a')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">পেন্ডিং টাস্ক</p>
                    <p className="font-medium">{viewingUser.pending_tasks}</p>
                  </div>
                  {viewingUser.profile?.created_at && (
                    <div>
                      <p className="text-muted-foreground">একাউন্ট তৈরি</p>
                      <p className="font-medium">{format(new Date(viewingUser.profile.created_at), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
