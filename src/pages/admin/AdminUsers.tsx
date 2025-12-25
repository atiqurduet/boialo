import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Shield, Trash2 } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'support';
  created_at: string;
  user_email?: string;
}

const AdminUsers = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'support'>('support');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profile info for each user
      const rolesWithEmails = await Promise.all(
        (data || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', role.user_id)
            .single();
          
          return {
            ...role,
            user_email: profile?.email || 'Unknown'
          };
        })
      );

      setUserRoles(rolesWithEmails);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast({ title: 'Error', description: 'ইউজার লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      // First find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newEmail)
        .single();

      if (profileError || !profile) {
        toast({ 
          title: 'Error', 
          description: 'এই ইমেইলে কোন ইউজার পাওয়া যায়নি। ইউজারকে প্রথমে সাইন আপ করতে হবে।', 
          variant: 'destructive' 
        });
        return;
      }

      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (existingRole) {
        toast({ 
          title: 'Error', 
          description: 'এই ইউজারের ইতিমধ্যে একটি রোল আছে।', 
          variant: 'destructive' 
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: profile.id, role: newRole }]);

      if (error) throw error;

      toast({ title: 'সফল', description: 'এডমিন যোগ হয়েছে' });
      setDialogOpen(false);
      setNewEmail('');
      setNewRole('support');
      fetchUserRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (id: string, newRole: 'admin' | 'manager' | 'support') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'সফল', description: 'রোল আপডেট হয়েছে' });
      fetchUserRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (id: string, userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'Error', description: 'আপনি নিজের রোল মুছতে পারবেন না', variant: 'destructive' });
      return;
    }

    if (!confirm('আপনি কি নিশ্চিত এই এডমিন রিমুভ করতে চান?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'সফল', description: 'এডমিন রিমুভ হয়েছে' });
      fetchUserRoles();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const roleLabels = {
    admin: 'এডমিন',
    manager: 'ম্যানেজার',
    support: 'সাপোর্ট'
  };

  const roleBadgeColors = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    support: 'bg-green-100 text-green-800'
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">এডমিন ইউজার</h1>
            <p className="text-muted-foreground">এডমিন প্যানেল অ্যাক্সেস ম্যানেজ করুন</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            নতুন এডমিন যোগ করুন
          </Button>
        </div>

        {/* Add Admin Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন এডমিন যোগ করুন</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ইউজার ইমেইল</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ইউজারকে প্রথমে সাইটে সাইন আপ করতে হবে
                </p>
              </div>
              <div>
                <Label>রোল</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">এডমিন - সম্পূর্ণ অ্যাক্সেস</SelectItem>
                    <SelectItem value="manager">ম্যানেজার - প্রোডাক্ট ও অর্ডার</SelectItem>
                    <SelectItem value="support">সাপোর্ট - শুধু অর্ডার দেখতে পারবে</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRole} className="w-full">
                যোগ করুন
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Users List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : userRoles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                কোন এডমিন নেই। প্রথম এডমিন যোগ করতে ডাটাবেজে সরাসরি রোল যোগ করুন।
              </div>
            ) : (
              <div className="divide-y">
                {userRoles.map((userRole) => (
                  <div key={userRole.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {userRole.user_email?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{userRole.user_email}</p>
                        <p className="text-sm text-muted-foreground">
                          যোগ হয়েছে: {new Date(userRole.created_at).toLocaleDateString('bn-BD')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={userRole.role}
                        onValueChange={(v) => handleUpdateRole(userRole.id, v as any)}
                        disabled={userRole.user_id === user?.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">এডমিন</SelectItem>
                          <SelectItem value="manager">ম্যানেজার</SelectItem>
                          <SelectItem value="support">সাপোর্ট</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(userRole.id, userRole.user_id)}
                        disabled={userRole.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">রোল পার্মিশন</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${roleBadgeColors.admin}`}>এডমিন</span>
                <span>সম্পূর্ণ অ্যাক্সেস - সেটিংস, ইউজার ম্যানেজমেন্ট সহ সব কিছু</span>
              </div>
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${roleBadgeColors.manager}`}>ম্যানেজার</span>
                <span>প্রোডাক্ট, ক্যাটাগরি, ব্যানার, কুপন, অর্ডার ও রিপোর্ট</span>
              </div>
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${roleBadgeColors.support}`}>সাপোর্ট</span>
                <span>শুধু অর্ডার দেখা ও স্ট্যাটাস আপডেট</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
