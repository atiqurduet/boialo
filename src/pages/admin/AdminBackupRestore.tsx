import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Upload, Database, Settings, FileText, History, HardDrive, AlertTriangle, RefreshCw, CheckCircle, XCircle, Loader2, Package, Shield } from 'lucide-react';
import { format } from 'date-fns';

const TABLE_GROUPS: Record<string, { label: string; icon: React.ReactNode }> = {
  settings: { label: 'সেটিংস ও কনফিগারেশন', icon: <Settings className="h-4 w-4" /> },
  products: { label: 'বই ও প্রোডাক্ট', icon: <FileText className="h-4 w-4" /> },
  universal_products: { label: 'ইউনিভার্সাল প্রোডাক্ট', icon: <Package className="h-4 w-4" /> },
  digital: { label: 'ডিজিটাল প্রোডাক্ট', icon: <FileText className="h-4 w-4" /> },
  orders: { label: 'অর্ডার ও পেমেন্ট', icon: <FileText className="h-4 w-4" /> },
  users: { label: 'ইউজার ও রোল', icon: <Shield className="h-4 w-4" /> },
  content: { label: 'কন্টেন্ট ও পেজ', icon: <FileText className="h-4 w-4" /> },
  marketing: { label: 'মার্কেটিং ও কুপন', icon: <FileText className="h-4 w-4" /> },
  reviews: { label: 'রিভিউ ও উইশলিস্ট', icon: <FileText className="h-4 w-4" /> },
};

const AdminBackupRestore = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [restoreResults, setRestoreResults] = useState<Record<string, { success: boolean; rows: number; error?: string }> | null>(null);
  const queryClient = useQueryClient();

  const { data: backupHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    }
  });

  const loadTableCounts = async () => {
    setLoadingCounts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('লগইন প্রয়োজন'); return; }

      const response = await supabase.functions.invoke('admin-backup', {
        body: { action: 'get_table_counts' },
      });

      if (response.error) throw response.error;
      setTableCounts(response.data.counts || {});
    } catch (error: any) {
      toast.error('টেবিল কাউন্ট লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => { loadTableCounts(); }, []);

  const escapeSQL = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const convertToSQL = (backupData: Record<string, any[]>): string => {
    const lines: string[] = [
      '-- BoiAlo Complete Database Backup',
      `-- Generated: ${new Date().toISOString()}`,
      `-- Tables: ${Object.keys(backupData).length}`,
      '',
      'BEGIN;',
      '',
    ];

    for (const [table, rows] of Object.entries(backupData)) {
      if (!rows || rows.length === 0) continue;
      lines.push(`-- Table: ${table} (${rows.length} rows)`);
      lines.push(`DELETE FROM public.${table};`);

      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');

      // Batch inserts in groups of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        lines.push(`INSERT INTO public.${table} (${colList}) VALUES`);
        const valueLines = batch.map(row => {
          const vals = columns.map(c => escapeSQL(row[c])).join(', ');
          return `  (${vals})`;
        });
        lines.push(valueLines.join(',\n') + ';');
      }
      lines.push('');
    }

    lines.push('COMMIT;');
    return lines.join('\n');
  };

  const fetchBackupData = async (group?: string): Promise<any | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('লগইন প্রয়োজন'); return null; }

    const body: any = { action: 'export' };
    if (group) body.group = group;
    else if (selectedTables.length > 0) body.tables = selectedTables;

    const response = await supabase.functions.invoke('admin-backup', { body });
    if (response.error) throw response.error;
    return response.data;
  };

  const exportBackup = async (group?: string, exportFormat: 'json' | 'sql' = 'json') => {
    setExporting(true);
    setExportProgress(10);
    try {
      setExportProgress(30);
      const backup = await fetchBackupData(group);
      if (!backup) return;
      setExportProgress(80);

      let blob: Blob;
      let filename: string;

      if (exportFormat === 'sql') {
        const sql = convertToSQL(backup.data);
        blob = new Blob([sql], { type: 'application/sql;charset=utf-8;' });
        filename = `backup-${group || 'full'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.sql`;
      } else {
        blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        filename = `backup-${group || 'full'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      toast.success(`${exportFormat.toUpperCase()} ব্যাকআপ সম্পন্ন! ${backup.tables_count} টেবিল, ${backup.total_rows} রো`);
      refetchHistory();
    } catch (error: any) {
      toast.error('ব্যাকআপ তৈরি করতে সমস্যা: ' + (error.message || ''));
    } finally {
      setTimeout(() => { setExporting(false); setExportProgress(0); }, 1000);
    }
  };

  const exportCSV = async (tableName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('লগইন প্রয়োজন'); return; }

      const response = await supabase.functions.invoke('admin-backup', {
        body: { action: 'export', tables: [tableName] },
      });

      if (response.error) throw response.error;
      const rows = response.data?.data?.[tableName] || [];
      if (rows.length === 0) { toast.error('কোন ডাটা নেই'); return; }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map((row: any) => headers.map(h => {
          const val = row[h];
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${tableName} CSV এক্সপোর্ট হয়েছে!`);
    } catch (error: any) {
      toast.error('CSV এক্সপোর্ট সমস্যা');
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setRestoreResults(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || typeof backup.data !== 'object') {
        toast.error('অবৈধ ব্যাকআপ ফাইল');
        return;
      }

      const confirmed = window.confirm(
        `⚠️ রিস্টোর করলে বর্তমান ডাটা প্রতিস্থাপিত হবে!\n\n` +
        `ফাইল: ${file.name}\n` +
        `টেবিল: ${Object.keys(backup.data).length}\n` +
        `মোট রো: ${backup.total_rows || 'অজানা'}\n\n` +
        `আপনি কি নিশ্চিত?`
      );
      if (!confirmed) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('লগইন প্রয়োজন'); return; }

      const response = await supabase.functions.invoke('admin-backup', {
        body: { action: 'restore', data: backup.data },
      });

      if (response.error) throw response.error;

      setRestoreResults(response.data.results);
      const successCount = Object.values(response.data.results as Record<string, any>).filter((r: any) => r.success).length;
      toast.success(`রিস্টোর সম্পন্ন! ${successCount}/${Object.keys(response.data.results).length} টেবিল সফল`);
      refetchHistory();
      loadTableCounts();
    } catch (error: any) {
      toast.error('রিস্টোর সমস্যা: ' + (error.message || ''));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables(prev => prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]);
  };

  const toggleGroup = (groupKey: string) => {
    const response = supabase.functions.invoke('admin-backup', { body: { action: 'get_table_list' } });
    // Use hardcoded groups for now
    const groupTables = Object.entries(tableCounts).filter(([t]) => {
      const groups: Record<string, string[]> = {
        settings: ['site_settings', 'notification_settings', 'loyalty_settings', 'referral_settings', 'auto_post_settings', 'auto_logout_settings', 'checkout_form_fields'],
        products: ['products', 'categories', 'writers', 'publishers', 'brands', 'product_bundles', 'bundle_items', 'product_variants', 'product_types', 'product_type_attribute_templates'],
        universal_products: ['universal_products', 'universal_categories', 'universal_product_attributes', 'universal_product_variants'],
        orders: ['orders', 'order_items', 'order_status_history', 'order_tasks'],
        users: ['profiles', 'user_roles', 'permissions', 'role_permissions', 'address_book'],
        content: ['banners', 'homepage_sections', 'pages', 'page_sections', 'footer_sections', 'footer_links', 'navigation_menus', 'menu_items', 'blog_posts'],
        marketing: ['email_templates', 'email_campaigns', 'email_subscribers', 'coupons', 'offers', 'gift_cards'],
      };
      return groups[groupKey]?.includes(t);
    }).map(([t]) => t);

    const allSelected = groupTables.every(t => selectedTables.includes(t));
    if (allSelected) {
      setSelectedTables(prev => prev.filter(t => !groupTables.includes(t)));
    } else {
      setSelectedTables(prev => [...new Set([...prev, ...groupTables])]);
    }
  };

  const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0);
  const totalTables = Object.keys(tableCounts).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="h-6 w-6" /> ব্যাকআপ ও রিস্টোর</h1>
            <p className="text-muted-foreground mt-1">সম্পূর্ণ ডাটাবেস ব্যাকআপ, সিলেক্টিভ এক্সপোর্ট এবং রিস্টোর</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>মোট টেবিল: <strong>{totalTables}</strong></p>
            <p>মোট রো: <strong>{totalRows.toLocaleString()}</strong></p>
          </div>
        </div>

        {exporting && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ব্যাকআপ চলছে...</p>
                  <Progress value={exportProgress} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="full"><Database className="h-4 w-4 mr-1" /> সম্পূর্ণ</TabsTrigger>
            <TabsTrigger value="group"><Package className="h-4 w-4 mr-1" /> গ্রুপ</TabsTrigger>
            <TabsTrigger value="selective"><Settings className="h-4 w-4 mr-1" /> সিলেক্টিভ</TabsTrigger>
            <TabsTrigger value="restore"><Upload className="h-4 w-4 mr-1" /> রিস্টোর</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> হিস্টোরি</TabsTrigger>
          </TabsList>

          {/* Full Backup */}
          <TabsContent value="full" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5" /> সম্পূর্ণ ডাটাবেস ব্যাকআপ</CardTitle>
                <CardDescription>সকল টেবিলের সকল ডাটা একসাথে JSON ফাইলে ডাউনলোড করুন (১০০০+ রো সাপোর্ট)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{totalTables}</p>
                    <p className="text-xs text-muted-foreground">টেবিল</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{totalRows.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">মোট রো</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{tableCounts['products'] || 0}</p>
                    <p className="text-xs text-muted-foreground">বই</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{tableCounts['orders'] || 0}</p>
                    <p className="text-xs text-muted-foreground">অর্ডার</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button onClick={() => exportBackup(undefined, 'json')} disabled={exporting} size="lg">
                    {exporting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Database className="h-5 w-5 mr-2" />}
                    JSON ব্যাকআপ
                  </Button>
                  <Button onClick={() => exportBackup(undefined, 'sql')} disabled={exporting} size="lg" variant="secondary">
                    {exporting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <FileText className="h-5 w-5 mr-2" />}
                    SQL ব্যাকআপ (.sql)
                  </Button>
                </div>
                <Button onClick={loadTableCounts} variant="outline" size="sm" disabled={loadingCounts}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingCounts ? 'animate-spin' : ''}`} /> কাউন্ট রিফ্রেশ
                </Button>
              </CardContent>
            </Card>

            {/* Table Overview */}
            <Card>
              <CardHeader><CardTitle className="text-base">টেবিল ওভারভিউ</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>টেবিল</TableHead>
                        <TableHead className="text-right">রো</TableHead>
                        <TableHead className="text-right">CSV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(tableCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([table, count]) => (
                        <TableRow key={table}>
                          <TableCell className="font-mono text-sm">{table}</TableCell>
                          <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => exportCSV(table)} disabled={count === 0}>
                              <Download className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Group Backup */}
          <TabsContent value="group" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(TABLE_GROUPS).map(([key, { label, icon }]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">{icon} {label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={() => exportBackup(key)} disabled={exporting} className="w-full" variant="outline">
                      <Download className="h-4 w-4 mr-2" /> JSON এক্সপোর্ট
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Selective Backup */}
          <TabsContent value="selective" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">টেবিল নির্বাচন করুন</CardTitle>
                <CardDescription>
                  নির্বাচিত: {selectedTables.length} টেবিল
                  <Button variant="link" size="sm" onClick={() => setSelectedTables(Object.keys(tableCounts))}>সব নির্বাচন</Button>
                  <Button variant="link" size="sm" onClick={() => setSelectedTables([])}>সব বাদ</Button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(tableCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([table, count]) => (
                    <label key={table} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedTables.includes(table)}
                        onCheckedChange={() => toggleTable(table)}
                      />
                      <span className="font-mono truncate flex-1">{table}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={() => exportBackup()}
                  disabled={exporting || selectedTables.length === 0}
                  className="w-full mt-4"
                >
                  <Download className="h-4 w-4 mr-2" /> নির্বাচিত {selectedTables.length} টেবিল এক্সপোর্ট
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restore */}
          <TabsContent value="restore" className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> ডাটা রিস্টোর</CardTitle>
                <CardDescription>আগের ব্যাকআপ ফাইল থেকে ডাটা রিস্টোর করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-100/50 dark:bg-amber-900/30 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>⚠️ রিস্টোর করলে বর্তমান ডাটা প্রতিস্থাপিত (overwrite) হবে। আগে ব্যাকআপ নিন!</span>
                </div>
                <Label htmlFor="restore-file" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{importing ? 'আপলোড ও রিস্টোর হচ্ছে...' : 'JSON ব্যাকআপ ফাইল নির্বাচন করুন'}</p>
                    <p className="text-xs text-muted-foreground mt-1">শুধুমাত্র এই সিস্টেমের ব্যাকআপ ফাইল সাপোর্ট করে</p>
                  </div>
                </Label>
                <Input id="restore-file" type="file" accept=".json" className="hidden" onChange={importBackup} disabled={importing} />
              </CardContent>
            </Card>

            {restoreResults && (
              <Card>
                <CardHeader><CardTitle className="text-base">রিস্টোর ফলাফল</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>টেবিল</TableHead>
                          <TableHead>স্ট্যাটাস</TableHead>
                          <TableHead className="text-right">রো</TableHead>
                          <TableHead>ত্রুটি</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(restoreResults).map(([table, result]) => (
                          <TableRow key={table}>
                            <TableCell className="font-mono text-sm">{table}</TableCell>
                            <TableCell>
                              {result.success ? (
                                <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> সফল</Badge>
                              ) : (
                                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> ব্যর্থ</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{result.rows}</TableCell>
                            <TableCell className="text-xs text-destructive max-w-[200px] truncate">{result.error || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle className="text-base">ব্যাকআপ হিস্টোরি</CardTitle></CardHeader>
              <CardContent>
                {backupHistory && backupHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>তারিখ</TableHead>
                        <TableHead>ধরন</TableHead>
                        <TableHead>ফাইল</TableHead>
                        <TableHead>সাইজ</TableHead>
                        <TableHead>নোট</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupHistory.map((backup: any) => (
                        <TableRow key={backup.id}>
                          <TableCell className="text-sm">{format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell><Badge variant="outline">{backup.backup_type}</Badge></TableCell>
                          <TableCell className="text-sm font-mono max-w-[200px] truncate">{backup.file_name}</TableCell>
                          <TableCell className="text-sm">{backup.file_size ? `${(backup.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{backup.notes || '-'}</TableCell>
                          <TableCell><Badge variant={backup.status === 'completed' ? 'default' : 'destructive'}>{backup.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">কোন ব্যাকআপ হিস্টোরি নেই</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminBackupRestore;
