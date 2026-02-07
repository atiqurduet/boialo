import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, Activity, ShoppingCart, Shield, Download, Eye, Clock, User, Filter } from 'lucide-react';
import { format } from 'date-fns';

const AdminAuditLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [loginEventFilter, setLoginEventFilter] = useState('all');

  // Admin activity logs
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    }
  });

  // Order status changes
  const { data: orderHistory } = useQuery({
    queryKey: ['order-status-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_status_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    }
  });

  // Login logs
  const { data: loginLogs } = useQuery({
    queryKey: ['login-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    }
  });

  // Profiles for user lookup
  const { data: profiles } = useQuery({
    queryKey: ['profiles-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      return data || [];
    }
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return 'সিস্টেম';
    const p = profiles?.find((p: any) => p.id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter((log: any) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;
      if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (log.action?.toLowerCase().includes(q) || log.table_name?.toLowerCase().includes(q) || log.record_id?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [auditLogs, actionFilter, tableFilter, dateFrom, dateTo, searchQuery]);

  const filteredLoginLogs = useMemo(() => {
    if (!loginLogs) return [];
    return loginLogs.filter((log: any) => {
      if (loginEventFilter !== 'all' && log.event_type !== loginEventFilter) return false;
      if (loginSearch) {
        const q = loginSearch.toLowerCase();
        return (log.email?.toLowerCase().includes(q) || log.ip_address?.includes(q));
      }
      return true;
    });
  }, [loginLogs, loginEventFilter, loginSearch]);

  const uniqueActions = useMemo(() => {
    if (!auditLogs) return [];
    return [...new Set(auditLogs.map((l: any) => l.action))].filter(Boolean);
  }, [auditLogs]);

  const uniqueTables = useMemo(() => {
    if (!auditLogs) return [];
    return [...new Set(auditLogs.map((l: any) => l.table_name))].filter(Boolean);
  }, [auditLogs]);

  const getActionColor = (action: string) => {
    if (action?.includes('create') || action?.includes('insert')) return 'bg-green-100 text-green-700';
    if (action?.includes('update') || action?.includes('edit')) return 'bg-blue-100 text-blue-700';
    if (action?.includes('delete') || action?.includes('remove')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-indigo-100 text-indigo-700', shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const exportLogs = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Stats
  const todayLogs = auditLogs?.filter((l: any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0;
  const failedLogins = loginLogs?.filter((l: any) => !l.success).length || 0;
  const orderChangesToday = orderHistory?.filter((l: any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> অডিট লগ</h1>
            <p className="text-muted-foreground mt-1">সকল অ্যাডমিন কার্যকলাপ, অর্ডার পরিবর্তন এবং লগইন ইতিহাস</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Activity className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{todayLogs}</p><p className="text-xs text-muted-foreground">আজকের অ্যাক্টিভিটি</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{orderChangesToday}</p><p className="text-xs text-muted-foreground">অর্ডার পরিবর্তন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><User className="h-5 w-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold">{loginLogs?.length || 0}</p><p className="text-xs text-muted-foreground">মোট লগইন</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Shield className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold">{failedLogins}</p><p className="text-xs text-muted-foreground">ফেইলড লগইন</p></div>
            </div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="activity">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" /> অ্যাডমিন অ্যাক্টিভিটি</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" /> অর্ডার পরিবর্তন</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" /> সিকিউরিটি লগ</TabsTrigger>
          </TabsList>

          {/* Admin Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="সার্চ করুন..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="অ্যাকশন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল অ্যাকশন</SelectItem>
                      {uniqueActions.map(a => <SelectItem key={a} value={a!}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="টেবিল" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল টেবিল</SelectItem>
                      {uniqueTables.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" className="w-[150px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <Input type="date" className="w-[150px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={() => exportLogs(filteredAuditLogs, 'audit-logs')}><Download className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>ইউজার</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                      <TableHead>টেবিল</TableHead>
                      <TableHead>রেকর্ড</TableHead>
                      <TableHead>বিস্তারিত</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap"><Clock className="h-3 w-3 inline mr-1" />{format(new Date(log.created_at), 'dd/MM HH:mm')}</TableCell>
                        <TableCell className="text-sm">{getUserName(log.user_id)}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span></TableCell>
                        <TableCell className="text-sm font-mono">{log.table_name}</TableCell>
                        <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8)}</TableCell>
                        <TableCell>
                          {(log.old_values || log.new_values) && (
                            <Dialog>
                              <DialogTrigger asChild><Button variant="ghost" size="sm"><Eye className="h-3 w-3" /></Button></DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader><DialogTitle>পরিবর্তনের বিস্তারিত</DialogTitle></DialogHeader>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium text-sm mb-2 text-red-600">আগের মান</h4>
                                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(log.old_values, null, 2)}</pre>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm mb-2 text-green-600">নতুন মান</h4>
                                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(log.new_values, null, 2)}</pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAuditLogs.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোন লগ পাওয়া যায়নি</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Order Changes Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">অর্ডার স্ট্যাটাস পরিবর্তন</CardTitle>
                <Button variant="outline" size="sm" onClick={() => orderHistory && exportLogs(orderHistory, 'order-history')}><Download className="h-4 w-4 mr-1" /> এক্সপোর্ট</Button>
              </CardHeader>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>অর্ডার</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>পরিবর্তনকারী</TableHead>
                      <TableHead>নোট</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory?.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">{format(new Date(h.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell className="text-sm font-mono">{h.order_id?.slice(0, 8)}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(h.status)}`}>{h.status}</span></TableCell>
                        <TableCell className="text-sm">{getUserName(h.changed_by)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{h.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Security Log Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="ইমেইল বা IP সার্চ..." className="pl-10" value={loginSearch} onChange={e => setLoginSearch(e.target.value)} />
                  </div>
                  <Select value={loginEventFilter} onValueChange={setLoginEventFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সকল ইভেন্ট</SelectItem>
                      <SelectItem value="login">লগইন</SelectItem>
                      <SelectItem value="logout">লগআউট</SelectItem>
                      <SelectItem value="failed_login">ফেইলড লগইন</SelectItem>
                      <SelectItem value="password_reset">পাসওয়ার্ড রিসেট</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => filteredLoginLogs.length && exportLogs(filteredLoginLogs, 'login-logs')}><Download className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>ইমেইল</TableHead>
                      <TableHead>ইভেন্ট</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>কারণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoginLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell className="text-sm">{log.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={log.event_type === 'failed_login' ? 'destructive' : 'outline'}>
                            {log.event_type === 'login' ? 'লগইন' : log.event_type === 'logout' ? 'লগআউট' : log.event_type === 'failed_login' ? 'ফেইলড' : 'রিসেট'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.success ? <Badge className="bg-green-100 text-green-700">সফল</Badge> : <Badge variant="destructive">ব্যর্থ</Badge>}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{log.failure_reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredLoginLogs.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোন লগইন লগ পাওয়া যায়নি</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLog;
