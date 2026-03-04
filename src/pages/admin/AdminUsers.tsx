import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Search, Shield, Trash2, UserPlus, Users, Mail, Clock, CheckCircle, XCircle,
  MoreHorizontal, Edit, Loader2, RefreshCw, Send, Copy, UserCheck,
  Filter, ChevronDown, Eye, Plus, Settings2, Activity, BarChart3,
  ShieldCheck, AlertCircle, KeyRound,
} from 'lucide-react';

// ── Types ──
interface RoleConfig {
  id: string; role_key: string; label_bn: string; label_en: string;
  description_bn: string; description_en: string; is_system: boolean; is_active: boolean; sort_order: number;
}

interface StaffMember {
  id: string; user_id: string; role: string; created_at: string;
  profile?: { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; created_at: string | null };
  pending_tasks: number; in_progress_tasks: number; completed_tasks: number;
  last_login?: string | null;
}

interface Invitation {
  id: string; email: string; role: string; token: string; status: string;
  expires_at: string; accepted_at: string | null; created_at: string;
}

interface AuditEntry {
  id: string; action: string; table_name: string | null; created_at: string; user_id: string | null;
  new_values: any; old_values: any;
}

// ── Color helper ──
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  support: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};
const getRoleColor = (role: string) => ROLE_COLORS[role] || 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';

// ── Component ──
const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // UI state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addDirectOpen, setAddDirectOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [viewingUser, setViewingUser] = useState<StaffMember | null>(null);
  const [editingRole, setEditingRole] = useState<RoleConfig | null>(null);

  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support');
  const [directEmail, setDirectEmail] = useState('');
  const [directRole, setDirectRole] = useState('support');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState('support');
  const [editRole, setEditRole] = useState('support');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleLabelBn, setNewRoleLabelBn] = useState('');
  const [newRoleLabelEn, setNewRoleLabelEn] = useState('');
  const [newRoleDescBn, setNewRoleDescBn] = useState('');
  const [newRoleDescEn, setNewRoleDescEn] = useState('');

  // ── Queries ──
  const { data: rolesConfig = [] } = useQuery({
    queryKey: ['roles-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles_config').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as RoleConfig[];
    },
  });

  const { data: allRolesConfig = [] } = useQuery({
    queryKey: ['all-roles-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles_config').select('*').order('sort_order');
      if (error) throw error;
      return data as RoleConfig[];
    },
  });

  const getRoleLabel = (roleKey: string) => rolesConfig.find(r => r.role_key === roleKey)?.label_bn || roleKey;

  // Fetch staff with task stats & last login
  const { data: staffMembers = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = roles.map(r => r.user_id);
      if (userIds.length === 0) return [];

      const [profilesRes, pendingRes, inProgressRes, completedRes, loginRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, avatar_url, created_at').in('id', userIds),
        supabase.from('order_tasks').select('assigned_to').eq('status', 'pending').in('assigned_to', userIds),
        supabase.from('order_tasks').select('assigned_to').eq('status', 'in_progress').in('assigned_to', userIds),
        supabase.from('order_tasks').select('assigned_to').eq('status', 'completed').in('assigned_to', userIds),
        supabase.from('login_logs').select('user_id, created_at').eq('event_type', 'login').eq('success', true).in('user_id', userIds).order('created_at', { ascending: false }).limit(100),
      ]);

      const pendingCounts: Record<string, number> = {};
      pendingRes.data?.forEach(t => { pendingCounts[t.assigned_to] = (pendingCounts[t.assigned_to] || 0) + 1; });
      const inProgressCounts: Record<string, number> = {};
      inProgressRes.data?.forEach(t => { inProgressCounts[t.assigned_to] = (inProgressCounts[t.assigned_to] || 0) + 1; });
      const completedCounts: Record<string, number> = {};
      completedRes.data?.forEach(t => { completedCounts[t.assigned_to] = (completedCounts[t.assigned_to] || 0) + 1; });

      // Get latest login per user
      const lastLogins: Record<string, string> = {};
      loginRes.data?.forEach(l => { if (!lastLogins[l.user_id!]) lastLogins[l.user_id!] = l.created_at; });

      return roles.map(role => ({
        ...role,
        profile: profilesRes.data?.find(p => p.id === role.user_id),
        pending_tasks: pendingCounts[role.user_id] || 0,
        in_progress_tasks: inProgressCounts[role.user_id] || 0,
        completed_tasks: completedCounts[role.user_id] || 0,
        last_login: lastLogins[role.user_id] || null,
      })) as StaffMember[];
    },
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invLoading } = useQuery({
    queryKey: ['admin-users-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_invitations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
  });

  // Fetch recent audit logs for staff
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['staff-activity-log'],
    queryFn: async () => {
      const staffIds = staffMembers.map(s => s.user_id);
      if (staffIds.length === 0) return [];
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .in('user_id', staffIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: staffMembers.length > 0,
  });

  // ── Mutations ──
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (existing) {
        const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', existing.id).maybeSingle();
        if (existingRole) throw new Error('এই ইউজারের ইতিমধ্যে একটি রোল আছে');
      }
      const { data: pendingInvite } = await supabase.from('staff_invitations').select('id').eq('email', email.trim().toLowerCase()).eq('status', 'pending').maybeSingle();
      if (pendingInvite) throw new Error('এই ইমেইলে ইতিমধ্যে একটি পেন্ডিং ইনভাইটেশন আছে');

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('staff_invitations').insert({
        email: email.trim().toLowerCase(), role: role as any, token,
        invited_by: currentUser?.id, expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      const inviteUrl = `${window.location.origin}/sign-in?invite=${token}`;
      const roleLabel = getRoleLabel(role);
      const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#1e293b;">স্টাফ ইনভাইটেশন</h2><p>আপনাকে <strong>${roleLabel}</strong> হিসেবে আমন্ত্রণ জানানো হয়েছে।</p><div style="text-align:center;margin:30px 0;"><a href="${inviteUrl}" style="background-color:#dc2626;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;">একাউন্ট তৈরি করুন</a></div><p style="color:#64748b;font-size:14px;">এই লিংক ৭ দিন বৈধ।</p></div>`;

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: { to: email.trim(), subject: 'স্টাফ ইনভাইটেশন - Boialo', html: emailHtml },
      });
      if (emailError) toast.warning('ইনভাইটেশন তৈরি হয়েছে কিন্তু ইমেইল পাঠাতে সমস্যা হয়েছে');
    },
    onSuccess: () => { toast.success('ইনভাইটেশন পাঠানো হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] }); setInviteDialogOpen(false); setInviteEmail(''); setInviteRole('support'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const directAddMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: profile, error: pErr } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).single();
      if (pErr || !profile) throw new Error('এই ইমেইলে কোন ইউজার পাওয়া যায়নি।');
      const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', profile.id).maybeSingle();
      if (existing) throw new Error('এই ইউজারের ইতিমধ্যে একটি রোল আছে');
      const { error } = await supabase.from('user_roles').insert([{ user_id: profile.id, role: role as any }]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('ইউজার যোগ হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] }); setAddDirectOpen(false); setDirectEmail(''); setDirectRole('support'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; full_name: string; phone: string; role: string }) => {
      const { data: res, error } = await supabase.functions.invoke('admin-create-user', { body: data });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => { toast.success('নতুন ইউজার তৈরি হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] }); setCreateUserOpen(false); setCreateEmail(''); setCreatePassword(''); setCreateName(''); setCreatePhone(''); setCreateRole('support'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from('user_roles').update({ role: role as any }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('রোল আপডেট হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] }); setEditingUser(null); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === user?.id) throw new Error('আপনি নিজেকে রিমুভ করতে পারবেন না');
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('ইউজার রিমুভ হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('staff_invitations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('ইনভাইটেশন বাতিল হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invite: Invitation) => {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase.from('staff_invitations').update({ token: newToken, expires_at: expiresAt.toISOString(), status: 'pending' }).eq('id', invite.id);
      if (error) throw error;
      const inviteUrl = `${window.location.origin}/sign-in?invite=${newToken}`;
      const roleLabel = getRoleLabel(invite.role);
      const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>স্টাফ ইনভাইটেশন (পুনরায়)</h2><p><strong>${roleLabel}</strong> হিসেবে পুনরায় আমন্ত্রণ।</p><div style="text-align:center;margin:30px 0;"><a href="${inviteUrl}" style="background-color:#dc2626;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;display:inline-block;">একাউন্ট তৈরি করুন</a></div></div>`;
      await supabase.functions.invoke('send-email', { body: { to: invite.email, subject: 'স্টাফ ইনভাইটেশন (পুনরায়) - Boialo', html: emailHtml } });
    },
    onSuccess: () => { toast.success('ইনভাইটেশন পুনরায় পাঠানো হয়েছে'); queryClient.invalidateQueries({ queryKey: ['admin-users-invitations'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const filtered = userIds.filter(id => id !== user?.id);
      if (filtered.length === 0) throw new Error('নিজেকে রিমুভ করা যাবে না');
      const { error } = await supabase.from('user_roles').delete().in('user_id', filtered);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('সিলেক্টেড ইউজার রিমুভ হয়েছে'); setSelectedIds([]); queryClient.invalidateQueries({ queryKey: ['admin-users-staff'] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: { role_key: string; label_bn: string; label_en: string; description_bn: string; description_en: string }) => {
      const { error } = await supabase.from('roles_config').insert({
        role_key: data.role_key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label_bn: data.label_bn, label_en: data.label_en,
        description_bn: data.description_bn, description_en: data.description_en,
        is_system: false, sort_order: allRolesConfig.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('নতুন রোল তৈরি হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['roles-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles-config'] });
      setCreateRoleOpen(false);
      setNewRoleKey(''); setNewRoleLabelBn(''); setNewRoleLabelEn(''); setNewRoleDescBn(''); setNewRoleDescEn('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRoleConfigMutation = useMutation({
    mutationFn: async (data: { id: string; label_bn: string; label_en: string; description_bn: string; description_en: string; is_active: boolean }) => {
      const { id, ...rest } = data;
      const { error } = await supabase.from('roles_config').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('রোল আপডেট হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['roles-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles-config'] });
      setEditingRole(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteRoleConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roles_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('রোল ডিলিট হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['roles-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles-config'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Filtered data ──
  const filteredStaff = staffMembers.filter(s => {
    const matchSearch = !search || s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || s.profile?.email?.toLowerCase().includes(search.toLowerCase()) || s.profile?.phone?.includes(search);
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleSelect = (userId: string) => setSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filteredStaff.length ? [] : filteredStaff.map(s => s.user_id));

  const stats = {
    total: staffMembers.length,
    admins: staffMembers.filter(s => s.role === 'admin').length,
    pendingInvites: invitations.filter(i => i.status === 'pending').length,
    totalRoles: allRolesConfig.length,
    totalPendingTasks: staffMembers.reduce((s, m) => s + m.pending_tasks, 0),
    totalCompletedTasks: staffMembers.reduce((s, m) => s + m.completed_tasks, 0),
  };

  const RoleSelectItems = () => (
    <>{rolesConfig.map(r => (
      <SelectItem key={r.role_key} value={r.role_key}>
        <span>{r.label_bn}</span>
        <span className="text-xs text-muted-foreground ml-2">— {r.description_bn}</span>
      </SelectItem>
    ))}</>
  );

  const getStaffName = (userId: string | null) => {
    const staff = staffMembers.find(s => s.user_id === userId);
    return staff?.profile?.full_name || staff?.profile?.email || userId?.slice(0, 8) || 'অজানা';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">স্টাফ ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">সুপার এডমিন — সকল স্টাফ, রোল ও অ্যাক্টিভিটি ম্যানেজ করুন</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/admin/role-permissions')}>
              <KeyRound className="h-4 w-4 mr-2" />পার্মিশন সেটিংস
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />নতুন স্টাফ<ChevronDown className="h-4 w-4 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />সরাসরি তৈরি করুন
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />ইমেইলে ইনভাইটেশন
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAddDirectOpen(true)}>
                  <UserCheck className="h-4 w-4 mr-2" />বিদ্যমান ইউজারকে রোল দিন
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'মোট স্টাফ', value: stats.total, icon: Users, bg: 'bg-primary/10', fg: 'text-primary' },
            { label: 'এডমিন', value: stats.admins, icon: Shield, bg: 'bg-destructive/10', fg: 'text-destructive' },
            { label: 'মোট রোল', value: stats.totalRoles, icon: Settings2, bg: 'bg-secondary', fg: 'text-secondary-foreground' },
            { label: 'পেন্ডিং ইনভাইট', value: stats.pendingInvites, icon: Clock, bg: 'bg-accent', fg: 'text-accent-foreground' },
            { label: 'পেন্ডিং টাস্ক', value: stats.totalPendingTasks, icon: AlertCircle, bg: 'bg-orange-100 dark:bg-orange-900/20', fg: 'text-orange-600' },
            { label: 'সম্পন্ন টাস্ক', value: stats.totalCompletedTasks, icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/20', fg: 'text-green-600' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-4 w-4 ${stat.fg}`} /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="staff">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="staff"><Users className="h-4 w-4 mr-1" />স্টাফ ({staffMembers.length})</TabsTrigger>
            <TabsTrigger value="invitations"><Mail className="h-4 w-4 mr-1" />ইনভাইটেশন ({invitations.length})</TabsTrigger>
            <TabsTrigger value="workload"><BarChart3 className="h-4 w-4 mr-1" />ওয়ার্কলোড</TabsTrigger>
            <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-1" />রোল ({allRolesConfig.length})</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" />অ্যাক্টিভিটি</TabsTrigger>
          </TabsList>

          {/* ── Staff Tab ── */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="নাম, ইমেইল বা ফোন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="রোল" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল রোল</SelectItem>
                    {rolesConfig.map(r => <SelectItem key={r.role_key} value={r.role_key}>{r.label_bn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {selectedIds.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => { if (confirm(`${selectedIds.length} জন রিমুভ করতে চান?`)) bulkDeleteMutation.mutate(selectedIds); }}>
                    <Trash2 className="h-4 w-4 mr-1" />{selectedIds.length} জন রিমুভ
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => refetchStaff()}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{search || roleFilter !== 'all' ? 'কোনো স্টাফ পাওয়া যায়নি' : 'কোনো স্টাফ নেই।'}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"><Checkbox checked={selectedIds.length === filteredStaff.length && filteredStaff.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                        <TableHead>স্টাফ</TableHead>
                        <TableHead>রোল</TableHead>
                        <TableHead className="hidden md:table-cell">টাস্ক</TableHead>
                        <TableHead className="hidden lg:table-cell">শেষ লগইন</TableHead>
                        <TableHead className="hidden lg:table-cell">যোগদান</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map(staff => {
                        const isSelf = staff.user_id === user?.id;
                        const totalTasks = staff.pending_tasks + staff.in_progress_tasks + staff.completed_tasks;
                        const completionRate = totalTasks > 0 ? Math.round((staff.completed_tasks / totalTasks) * 100) : 0;
                        return (
                          <TableRow key={staff.user_id}>
                            <TableCell><Checkbox checked={selectedIds.includes(staff.user_id)} onCheckedChange={() => toggleSelect(staff.user_id)} disabled={isSelf} /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary font-semibold text-sm">{staff.profile?.full_name?.[0]?.toUpperCase() || staff.profile?.email?.[0]?.toUpperCase() || '?'}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate flex items-center gap-1">
                                    {staff.profile?.full_name || 'N/A'}
                                    {isSelf && <Badge variant="outline" className="text-[10px] px-1 py-0">আপনি</Badge>}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">{staff.profile?.email}</p>
                                  {staff.profile?.phone && <p className="text-xs text-muted-foreground md:hidden">{staff.profile.phone}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge className={getRoleColor(staff.role)}>{getRoleLabel(staff.role)}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1 text-xs">
                                  {staff.pending_tasks > 0 && <Badge variant="outline" className="text-orange-600 border-orange-200 px-1.5">{staff.pending_tasks}</Badge>}
                                  {staff.in_progress_tasks > 0 && <Badge variant="outline" className="text-blue-600 border-blue-200 px-1.5">{staff.in_progress_tasks}</Badge>}
                                  <Badge variant="outline" className="text-green-600 border-green-200 px-1.5">{staff.completed_tasks}</Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {staff.last_login
                                ? formatDistanceToNow(new Date(staff.last_login), { addSuffix: true, locale: bn })
                                : <span className="text-xs text-muted-foreground/50">লগইন নেই</span>
                              }
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(staff.created_at), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewingUser(staff)}><Eye className="h-4 w-4 mr-2" />বিস্তারিত দেখুন</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditingUser(staff); setEditRole(staff.role); }}><Edit className="h-4 w-4 mr-2" />রোল পরিবর্তন</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" disabled={isSelf} onClick={() => { if (confirm('রিমুভ করতে চান?')) deleteUserMutation.mutate(staff.user_id); }}>
                                    <Trash2 className="h-4 w-4 mr-2" />রিমুভ করুন
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

          {/* ── Invitations Tab ── */}
          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>ইনভাইটেশন</CardTitle><CardDescription>পাঠানো ইনভাইটেশনের তালিকা</CardDescription></div>
                  <Button size="sm" onClick={() => setInviteDialogOpen(true)}><Mail className="h-4 w-4 mr-2" />নতুন ইনভাইট</Button>
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
                        <TableHead>ইমেইল</TableHead><TableHead>রোল</TableHead><TableHead>স্ট্যাটাস</TableHead>
                        <TableHead className="hidden md:table-cell">তারিখ</TableHead><TableHead className="hidden md:table-cell">এক্সপায়ার</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map(inv => {
                        const isExpired = new Date(inv.expires_at) < new Date();
                        const statusDisplay = inv.status === 'accepted'
                          ? { icon: CheckCircle, label: 'গৃহীত', color: 'bg-green-100 text-green-800' }
                          : isExpired ? { icon: XCircle, label: 'এক্সপায়ার্ড', color: 'bg-red-100 text-red-800' }
                          : { icon: Clock, label: 'অপেক্ষমাণ', color: 'bg-yellow-100 text-yellow-800' };
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.email}</TableCell>
                            <TableCell><Badge className={getRoleColor(inv.role)}>{getRoleLabel(inv.role)}</Badge></TableCell>
                            <TableCell><Badge className={statusDisplay.color}><statusDisplay.icon className="h-3 w-3 mr-1" />{statusDisplay.label}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(inv.created_at), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{format(new Date(inv.expires_at), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {inv.status !== 'accepted' && <DropdownMenuItem onClick={() => resendInviteMutation.mutate(inv)}><Send className="h-4 w-4 mr-2" />পুনরায় পাঠান</DropdownMenuItem>}
                                  {inv.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/sign-in?invite=${inv.token}`); toast.success('লিংক কপি হয়েছে'); }}>
                                      <Copy className="h-4 w-4 mr-2" />লিংক কপি
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('বাতিল করতে চান?')) deleteInviteMutation.mutate(inv.id); }}>
                                    <Trash2 className="h-4 w-4 mr-2" />বাতিল করুন
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

          {/* ── Workload Tab ── */}
          <TabsContent value="workload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffMembers.map(staff => {
                const total = staff.pending_tasks + staff.in_progress_tasks + staff.completed_tasks;
                const completionRate = total > 0 ? Math.round((staff.completed_tasks / total) * 100) : 0;
                return (
                  <Card key={staff.user_id}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">{staff.profile?.full_name?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                          <div>
                            <p className="font-medium">{staff.profile?.full_name || 'N/A'}</p>
                            <Badge className={`${getRoleColor(staff.role)} text-[10px]`}>{getRoleLabel(staff.role)}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{completionRate}%</p>
                          <p className="text-xs text-muted-foreground">সম্পন্ন</p>
                        </div>
                      </div>
                      <Progress value={completionRate} className="h-2 mb-3" />
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2">
                          <p className="font-bold text-orange-600">{staff.pending_tasks}</p>
                          <p className="text-[10px] text-muted-foreground">পেন্ডিং</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2">
                          <p className="font-bold text-blue-600">{staff.in_progress_tasks}</p>
                          <p className="text-[10px] text-muted-foreground">চলমান</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
                          <p className="font-bold text-green-600">{staff.completed_tasks}</p>
                          <p className="text-[10px] text-muted-foreground">সম্পন্ন</p>
                        </div>
                      </div>
                      {staff.last_login && (
                        <p className="text-xs text-muted-foreground mt-3">
                          শেষ লগইন: {formatDistanceToNow(new Date(staff.last_login), { addSuffix: true, locale: bn })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {staffMembers.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground">কোনো স্টাফ নেই।</div>
              )}
            </div>
          </TabsContent>

          {/* ── Roles Management Tab ── */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>রোল ম্যানেজমেন্ট</CardTitle>
                    <CardDescription>সিস্টেমের সকল রোল তৈরি, এডিট ও ম্যানেজ করুন</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/role-permissions')}>
                      <ShieldCheck className="h-4 w-4 mr-2" />পার্মিশন ম্যাট্রিক্স
                    </Button>
                    <Button onClick={() => setCreateRoleOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />নতুন রোল
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allRolesConfig.map(role => {
                    const usersWithRole = staffMembers.filter(s => s.role === role.role_key).length;
                    return (
                      <div key={role.id} className={`border rounded-lg p-4 ${!role.is_active ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={getRoleColor(role.role_key)}>{role.label_bn}</Badge>
                            {role.label_en && <span className="text-sm text-muted-foreground">({role.label_en})</span>}
                            {role.is_system && <Badge variant="outline" className="text-[10px]">সিস্টেম</Badge>}
                            {!role.is_active && <Badge variant="destructive" className="text-[10px]">নিষ্ক্রিয়</Badge>}
                            <Badge variant="secondary" className="text-[10px]">{usersWithRole} জন</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingRole(role)}><Edit className="h-4 w-4" /></Button>
                            {!role.is_system && (
                              <Button variant="ghost" size="icon" onClick={() => {
                                if (usersWithRole > 0) { toast.error(`এই রোলে ${usersWithRole} জন ইউজার আছে। প্রথমে তাদের অন্য রোলে সরান।`); return; }
                                if (confirm(`"${role.label_bn}" রোল ডিলিট করতে চান?`)) deleteRoleConfigMutation.mutate(role.id);
                              }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {role.description_bn && <p className="text-sm text-muted-foreground mt-2">{role.description_bn}</p>}
                      </div>
                    );
                  })}
                  {allRolesConfig.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">কোনো রোল কনফিগার করা হয়নি।</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Activity Log Tab ── */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />স্টাফ অ্যাক্টিভিটি লগ</CardTitle>
                <CardDescription>সাম্প্রতিক ৫০টি এডমিন কার্যক্রম</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">কোনো অ্যাক্টিভিটি নেই।</div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {recentActivity.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{getStaffName(entry.user_id)}</span>
                            <Badge variant="outline" className="text-[10px]">{entry.action}</Badge>
                            {entry.table_name && <Badge variant="secondary" className="text-[10px]">{entry.table_name}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: bn })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ═══════════ DIALOGS ═══════════ */}

        {/* Create User Dialog */}
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>নতুন স্টাফ তৈরি করুন</DialogTitle>
              <DialogDescription>ইমেইল, পাসওয়ার্ড ও তথ্য দিয়ে সরাসরি তৈরি করুন</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>ইমেইল <span className="text-destructive">*</span></Label>
                  <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>পাসওয়ার্ড <span className="text-destructive">*</span></Label>
                  <Input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} placeholder="ন্যূনতম ৬ অক্ষর" />
                </div>
                <div className="space-y-2"><Label>পুরো নাম</Label><Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="নাম" /></div>
                <div className="space-y-2"><Label>ফোন</Label><Input value={createPhone} onChange={e => setCreatePhone(e.target.value)} placeholder="01XXXXXXXXX" /></div>
              </div>
              <div className="space-y-2">
                <Label>রোল <span className="text-destructive">*</span></Label>
                <Select value={createRole} onValueChange={setCreateRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><RoleSelectItems /></SelectContent></Select>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>• ইমেইল স্বয়ংক্রিয়ভাবে ভেরিফাই হবে</p>
                <p>• স্টাফ সরাসরি লগইন করতে পারবে</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateUserOpen(false)}>বাতিল</Button>
                <Button onClick={() => createUserMutation.mutate({ email: createEmail, password: createPassword, full_name: createName, phone: createPhone, role: createRole })} disabled={createUserMutation.isPending || !createEmail.trim() || !createPassword || createPassword.length < 6}>
                  {createUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <UserPlus className="h-4 w-4 mr-2" />তৈরি করুন
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>ইমেইলে ইনভাইটেশন পাঠান</DialogTitle><DialogDescription>স্টাফের ইমেইলে ইনভাইটেশন লিংক পাঠানো হবে</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>ইমেইল</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" /></div>
              <div className="space-y-2"><Label>রোল</Label><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><RoleSelectItems /></SelectContent></Select></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>বাতিল</Button>
                <Button onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}<Send className="h-4 w-4 mr-2" />ইনভাইট পাঠান
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Direct Add Dialog */}
        <Dialog open={addDirectOpen} onOpenChange={setAddDirectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>বিদ্যমান ইউজারকে রোল দিন</DialogTitle><DialogDescription>সাইন আপ করা ইউজারের ইমেইল দিন</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>ইমেইল</Label><Input type="email" value={directEmail} onChange={e => setDirectEmail(e.target.value)} placeholder="email@example.com" /></div>
              <div className="space-y-2"><Label>রোল</Label><Select value={directRole} onValueChange={setDirectRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><RoleSelectItems /></SelectContent></Select></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddDirectOpen(false)}>বাতিল</Button>
                <Button onClick={() => directAddMutation.mutate({ email: directEmail, role: directRole })} disabled={directAddMutation.isPending || !directEmail.trim()}>
                  {directAddMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}যোগ করুন
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>রোল পরিবর্তন</DialogTitle></DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">{editingUser.profile?.full_name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div><p className="font-medium">{editingUser.profile?.full_name || 'N/A'}</p><p className="text-sm text-muted-foreground">{editingUser.profile?.email}</p></div>
                </div>
                <div className="space-y-2"><Label>নতুন রোল</Label><Select value={editRole} onValueChange={setEditRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><RoleSelectItems /></SelectContent></Select></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingUser(null)}>বাতিল</Button>
                  <Button onClick={() => updateRoleMutation.mutate({ userId: editingUser.user_id, role: editRole })} disabled={updateRoleMutation.isPending}>
                    {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}আপডেট করুন
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>স্টাফ বিস্তারিত</DialogTitle></DialogHeader>
            {viewingUser && (() => {
              const total = viewingUser.pending_tasks + viewingUser.in_progress_tasks + viewingUser.completed_tasks;
              const completionRate = total > 0 ? Math.round((viewingUser.completed_tasks / total) * 100) : 0;
              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-2xl">{viewingUser.profile?.full_name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{viewingUser.profile?.full_name || 'N/A'}</p>
                      <Badge className={getRoleColor(viewingUser.role)}>{getRoleLabel(viewingUser.role)}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                    <div><p className="text-muted-foreground">ইমেইল</p><p className="font-medium">{viewingUser.profile?.email || '—'}</p></div>
                    <div><p className="text-muted-foreground">ফোন</p><p className="font-medium">{viewingUser.profile?.phone || '—'}</p></div>
                    <div><p className="text-muted-foreground">রোল যোগ</p><p className="font-medium">{format(new Date(viewingUser.created_at), 'dd/MM/yyyy hh:mm a')}</p></div>
                    <div>
                      <p className="text-muted-foreground">শেষ লগইন</p>
                      <p className="font-medium">{viewingUser.last_login
                        ? formatDistanceToNow(new Date(viewingUser.last_login), { addSuffix: true, locale: bn })
                        : 'লগইন নেই'
                      }</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">টাস্ক পারফরম্যান্স</p>
                    <Progress value={completionRate} className="h-2 mb-3" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2.5">
                        <p className="font-bold text-orange-600 text-lg">{viewingUser.pending_tasks}</p>
                        <p className="text-xs text-muted-foreground">পেন্ডিং</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2.5">
                        <p className="font-bold text-blue-600 text-lg">{viewingUser.in_progress_tasks}</p>
                        <p className="text-xs text-muted-foreground">চলমান</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2.5">
                        <p className="font-bold text-green-600 text-lg">{viewingUser.completed_tasks}</p>
                        <p className="text-xs text-muted-foreground">সম্পন্ন</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Create Role Dialog */}
        <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>নতুন রোল তৈরি করুন</DialogTitle>
              <DialogDescription>কাস্টম রোল তৈরি করে স্টাফদের অ্যাসাইন করুন</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>রোল কী (ইংরেজি) <span className="text-destructive">*</span></Label>
                <Input value={newRoleKey} onChange={e => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} placeholder="যেমন: editor, accountant" />
                <p className="text-xs text-muted-foreground">শুধু ইংরেজি ছোট হাতের অক্ষর ও আন্ডারস্কোর</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>নাম (বাংলা) <span className="text-destructive">*</span></Label><Input value={newRoleLabelBn} onChange={e => setNewRoleLabelBn(e.target.value)} placeholder="যেমন: এডিটর" /></div>
                <div className="space-y-2"><Label>নাম (English)</Label><Input value={newRoleLabelEn} onChange={e => setNewRoleLabelEn(e.target.value)} placeholder="e.g. Editor" /></div>
              </div>
              <div className="space-y-2"><Label>বিবরণ (বাংলা)</Label><Textarea value={newRoleDescBn} onChange={e => setNewRoleDescBn(e.target.value)} placeholder="এই রোলের কাজ কী..." rows={2} /></div>
              <div className="space-y-2"><Label>বিবরণ (English)</Label><Textarea value={newRoleDescEn} onChange={e => setNewRoleDescEn(e.target.value)} placeholder="What this role does..." rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateRoleOpen(false)}>বাতিল</Button>
                <Button onClick={() => createRoleMutation.mutate({ role_key: newRoleKey, label_bn: newRoleLabelBn, label_en: newRoleLabelEn, description_bn: newRoleDescBn, description_en: newRoleDescEn })} disabled={createRoleMutation.isPending || !newRoleKey.trim() || !newRoleLabelBn.trim()}>
                  {createRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Plus className="h-4 w-4 mr-2" />রোল তৈরি করুন
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Role Config Dialog */}
        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>রোল এডিট করুন</DialogTitle>
              <DialogDescription>রোলের তথ্য আপডেট করুন</DialogDescription>
            </DialogHeader>
            {editingRole && (
              <EditRoleForm
                role={editingRole}
                isPending={updateRoleConfigMutation.isPending}
                onSave={(data) => updateRoleConfigMutation.mutate(data)}
                onCancel={() => setEditingRole(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

// ── Edit Role Form ──
const EditRoleForm = ({ role, isPending, onSave, onCancel }: {
  role: RoleConfig; isPending: boolean;
  onSave: (data: { id: string; label_bn: string; label_en: string; description_bn: string; description_en: string; is_active: boolean }) => void;
  onCancel: () => void;
}) => {
  const [labelBn, setLabelBn] = useState(role.label_bn);
  const [labelEn, setLabelEn] = useState(role.label_en);
  const [descBn, setDescBn] = useState(role.description_bn);
  const [descEn, setDescEn] = useState(role.description_en);
  const [isActive, setIsActive] = useState(role.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2 bg-muted rounded">
        <Badge className={getRoleColor(role.role_key)}>{role.role_key}</Badge>
        {role.is_system && <Badge variant="outline" className="text-[10px]">সিস্টেম রোল</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>নাম (বাংলা)</Label><Input value={labelBn} onChange={e => setLabelBn(e.target.value)} /></div>
        <div className="space-y-2"><Label>নাম (English)</Label><Input value={labelEn} onChange={e => setLabelEn(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>বিবরণ (বাংলা)</Label><Textarea value={descBn} onChange={e => setDescBn(e.target.value)} rows={2} /></div>
      <div className="space-y-2"><Label>বিবরণ (English)</Label><Textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={2} /></div>
      <div className="flex items-center justify-between">
        <Label>সক্রিয়</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} disabled={role.is_system} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>বাতিল</Button>
        <Button onClick={() => onSave({ id: role.id, label_bn: labelBn, label_en: labelEn, description_bn: descBn, description_en: descEn, is_active: isActive })} disabled={isPending || !labelBn.trim()}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}আপডেট করুন
        </Button>
      </div>
    </div>
  );
};

export default AdminUsers;
