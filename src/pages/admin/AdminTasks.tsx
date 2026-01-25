import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  PlayCircle
} from 'lucide-react';

interface Task {
  id: string;
  order_id: string;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    full_name: string;
  };
}

interface AdminUser {
  user_id: string;
  role: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

const taskTypeLabels: Record<string, string> = {
  order_processing: 'অর্ডার প্রসেসিং',
  payment_collection: 'পেমেন্ট কালেকশন',
  courier_booking: 'কুরিয়ার বুকিং',
  delivery_followup: 'ডেলিভারি ফলোআপ',
  customer_support: 'কাস্টমার সাপোর্ট',
  return_handling: 'রিটার্ন হ্যান্ডলিং',
  other: 'অন্যান্য'
};

const priorityLabels: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  urgent: { label: 'জরুরি', variant: 'destructive' },
  high: { label: 'হাই', variant: 'default' },
  normal: { label: 'নরমাল', variant: 'secondary' },
  low: { label: 'লো', variant: 'outline' }
};

const statusLabels: Record<string, { label: string; icon: any }> = {
  pending: { label: 'পেন্ডিং', icon: Clock },
  in_progress: { label: 'চলমান', icon: PlayCircle },
  completed: { label: 'সম্পন্ন', icon: CheckCircle2 },
  cancelled: { label: 'বাতিল', icon: AlertCircle }
};

const AdminTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch all tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['admin-tasks', statusFilter, priorityFilter, assigneeFilter],
    queryFn: async () => {
      let query = supabase
        .from('order_tasks')
        .select(`
          *,
          orders (order_number, full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }
      if (assigneeFilter !== 'all') {
        query = query.eq('assigned_to', assigneeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    }
  });

  // Fetch admin users for assignment
  const { data: adminUsers = [] } = useQuery({
    queryKey: ['admin-users-for-tasks'],
    queryFn: async () => {
      // First get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'manager', 'support']);

      if (rolesError) throw rolesError;

      // Then get profiles for those users
      const userIds = roles?.map(r => r.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return roles?.map(role => ({
        user_id: role.user_id,
        role: role.role,
        profiles: profiles?.find(p => p.id === role.user_id)
      })) || [];
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task> & { id: string }) => {
      const { id, ...data } = updates;
      const updateData: any = { ...data };
      
      if (data.status === 'completed' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('order_tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast({ title: 'সফল', description: 'টাস্ক আপডেট হয়েছে' });
      setEditDialogOpen(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('order_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast({ title: 'সফল', description: 'টাস্ক মুছে ফেলা হয়েছে' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.orders?.order_number?.toLowerCase().includes(query) ||
      task.orders?.full_name?.toLowerCase().includes(query)
    );
  });

  const handleQuickStatusChange = (task: Task, newStatus: string) => {
    updateTaskMutation.mutate({ id: task.id, status: newStatus });
  };

  const handleDelete = (taskId: string) => {
    if (confirm('এই টাস্ক মুছে ফেলতে চান?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getAssigneeName = (userId: string) => {
    const user = adminUsers.find(u => u.user_id === userId);
    return user?.profiles?.full_name || user?.profiles?.email || 'Unknown';
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status !== 'completed' && isOverdue(t.due_date)).length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            টাস্ক ম্যানেজমেন্ট
          </h1>
          <p className="text-muted-foreground">সকল অর্ডার টাস্ক পরিচালনা করুন</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">মোট টাস্ক</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">পেন্ডিং</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">চলমান</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">সম্পন্ন</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">ওভারডিউ</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="টাস্ক বা অর্ডার খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="স্ট্যাটাস" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                  <SelectItem value="pending">পেন্ডিং</SelectItem>
                  <SelectItem value="in_progress">চলমান</SelectItem>
                  <SelectItem value="completed">সম্পন্ন</SelectItem>
                  <SelectItem value="cancelled">বাতিল</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="প্রায়োরিটি" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব প্রায়োরিটি</SelectItem>
                  <SelectItem value="urgent">জরুরি</SelectItem>
                  <SelectItem value="high">হাই</SelectItem>
                  <SelectItem value="normal">নরমাল</SelectItem>
                  <SelectItem value="low">লো</SelectItem>
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="অ্যাসাইনি" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব অ্যাসাইনি</SelectItem>
                  {adminUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.profiles?.full_name || user.profiles?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>টাস্ক তালিকা ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">লোড হচ্ছে...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">কোনো টাস্ক পাওয়া যায়নি</div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const StatusIcon = statusLabels[task.status]?.icon || Clock;
                  const overdue = task.status !== 'completed' && isOverdue(task.due_date);

                  return (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg ${overdue ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={priorityLabels[task.priority]?.variant || 'secondary'}>
                              {priorityLabels[task.priority]?.label}
                            </Badge>
                            <Badge variant="outline">
                              {taskTypeLabels[task.task_type] || task.task_type}
                            </Badge>
                            <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusLabels[task.status]?.label}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive">ওভারডিউ</Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              অর্ডার: {task.orders?.order_number}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getAssigneeName(task.assigned_to)}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                ডিউ: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: bn })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickStatusChange(task, 'in_progress')}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              শুরু
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleQuickStatusChange(task, 'completed')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              সম্পন্ন
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTask(task);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>টাস্ক এডিট করুন</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <Label>টাইটেল</Label>
                  <Input
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>বিবরণ</Label>
                  <Textarea
                    value={selectedTask.description || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>স্ট্যাটাস</Label>
                    <Select
                      value={selectedTask.status}
                      onValueChange={(value) => setSelectedTask({ ...selectedTask, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">পেন্ডিং</SelectItem>
                        <SelectItem value="in_progress">চলমান</SelectItem>
                        <SelectItem value="completed">সম্পন্ন</SelectItem>
                        <SelectItem value="cancelled">বাতিল</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>প্রায়োরিটি</Label>
                    <Select
                      value={selectedTask.priority}
                      onValueChange={(value) => setSelectedTask({ ...selectedTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">জরুরি</SelectItem>
                        <SelectItem value="high">হাই</SelectItem>
                        <SelectItem value="normal">নরমাল</SelectItem>
                        <SelectItem value="low">লো</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>অ্যাসাইন করুন</Label>
                  <Select
                    value={selectedTask.assigned_to}
                    onValueChange={(value) => setSelectedTask({ ...selectedTask, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adminUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.profiles?.full_name || user.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>নোট</Label>
                  <Textarea
                    value={selectedTask.notes || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, notes: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => updateTaskMutation.mutate(selectedTask)}
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminTasks;
