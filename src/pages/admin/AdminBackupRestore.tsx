import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Upload, Database, Settings, FileText, History, HardDrive, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const AdminBackupRestore = () => {
  const [importing, setImporting] = useState(false);

  const { data: backupHistory } = useQuery({
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

  const exportSettings = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('*');
      const { data: footerSections } = await supabase.from('footer_sections').select('*');
      const { data: footerLinks } = await supabase.from('footer_links').select('*');
      const { data: menuData } = await supabase.from('navigation_menus').select('*');
      const { data: menuItems } = await supabase.from('menu_items').select('*');
      const { data: banners } = await supabase.from('banners').select('*');
      const { data: homeSections } = await supabase.from('homepage_sections').select('*');
      const { data: pages } = await supabase.from('pages').select('*');

      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        type: 'settings',
        data: { site_settings: data, footer_sections: footerSections, footer_links: footerLinks, navigation_menus: menuData, menu_items: menuItems, banners, homepage_sections: homeSections }
      };

      downloadJSON(backup, `settings-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      await logBackup('settings', `settings-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      toast.success('সেটিংস ব্যাকআপ ডাউনলোড হয়েছে!');
    } catch (error) {
      toast.error('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const exportProducts = async (type: 'books' | 'universal' | 'all') => {
    try {
      let products: any[] = [];
      let categories: any[] = [];

      if (type === 'books' || type === 'all') {
        const { data: cats } = await supabase.from('categories').select('*');
        categories = [...categories, ...(cats || [])];
      }
      if (type === 'universal' || type === 'all') {
        const { data: uProducts } = await supabase.from('universal_products').select('*');
        const { data: uCats } = await supabase.from('universal_categories').select('*');
        products = [...products, ...(uProducts || [])];
        categories = [...categories, ...(uCats || [])];
      }

      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        type: `products-${type}`,
        data: { products, categories }
      };

      downloadJSON(backup, `products-${type}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      await logBackup('products', `products-${type}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      toast.success('প্রোডাক্ট ডাটা এক্সপোর্ট হয়েছে!');
    } catch (error) {
      toast.error('এক্সপোর্ট করতে সমস্যা হয়েছে');
    }
  };

  const exportCSV = async (tableName: string) => {
    try {
      const { data, error } = await supabase.from(tableName as any).select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('কোন ডাটা পাওয়া যায়নি');
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = (row as any)[h];
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${tableName} CSV এক্সপোর্ট হয়েছে!`);
    } catch (error) {
      toast.error('CSV এক্সপোর্ট করতে সমস্যা হয়েছে');
    }
  };

  const exportFullBackup = async () => {
    try {
      const tables = ['site_settings', 'categories', 'universal_products', 'universal_categories', 'brands', 'publishers', 'banners', 'coupons', 'offers', 'homepage_sections', 'footer_sections', 'footer_links', 'navigation_menus', 'menu_items', 'payment_methods', 'courier_providers', 'email_templates', 'notification_settings'];
      
      const fullData: Record<string, any> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table as any).select('*');
        fullData[table] = data || [];
      }

      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        type: 'full',
        tables_count: tables.length,
        data: fullData
      };

      downloadJSON(backup, `full-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      await logBackup('full', `full-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`);
      toast.success('সম্পূর্ণ ব্যাকআপ ডাউনলোড হয়েছে!');
    } catch (error) {
      toast.error('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        toast.error('অবৈধ ব্যাকআপ ফাইল');
        return;
      }

      if (backup.data.site_settings) {
        for (const setting of backup.data.site_settings) {
          await supabase.from('site_settings').upsert(setting, { onConflict: 'setting_key' });
        }
      }

      toast.success('সেটিংস রিস্টোর সম্পন্ন!');
      await logBackup('restore', file.name);
    } catch (error) {
      toast.error('ফাইল পড়তে সমস্যা হয়েছে');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logBackup = async (type: string, fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('backup_history').insert({
      backup_type: type,
      file_name: fileName,
      created_by: user?.id,
      status: 'completed'
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="h-6 w-6" /> ব্যাকআপ ও রিস্টোর</h1>
          <p className="text-muted-foreground mt-1">ডাটা ব্যাকআপ, এক্সপোর্ট এবং রিস্টোর করুন</p>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> সেটিংস</TabsTrigger>
            <TabsTrigger value="products"><FileText className="h-4 w-4 mr-1" /> প্রোডাক্ট</TabsTrigger>
            <TabsTrigger value="full"><Database className="h-4 w-4 mr-1" /> সম্পূর্ণ</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> হিস্টোরি</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> সেটিংস ব্যাকআপ</CardTitle>
                  <CardDescription>সাইট সেটিংস, মেনু, ব্যানার, হোমপেজ কনফিগারেশন</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportSettings} className="w-full"><Download className="h-4 w-4 mr-2" /> JSON ব্যাকআপ ডাউনলোড</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> সেটিংস রিস্টোর</CardTitle>
                  <CardDescription>আগের ব্যাকআপ ফাইল থেকে রিস্টোর করুন</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>রিস্টোর করলে বর্তমান সেটিংস প্রতিস্থাপিত হবে</span>
                    </div>
                    <Label htmlFor="import-file" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">{importing ? 'আপলোড হচ্ছে...' : 'JSON ফাইল নির্বাচন করুন'}</p>
                      </div>
                    </Label>
                    <Input id="import-file" type="file" accept=".json" className="hidden" onChange={importSettings} disabled={importing} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">বই ডাটা</CardTitle>
                  <CardDescription>ক্যাটাগরি সহ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => exportProducts('books')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> JSON এক্সপোর্ট</Button>
                  <Button onClick={() => exportCSV('categories')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> CSV ক্যাটাগরি</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">সাধারণ প্রোডাক্ট</CardTitle>
                  <CardDescription>ইউনিভার্সাল প্রোডাক্ট ও ক্যাটাগরি</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => exportProducts('universal')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> JSON এক্সপোর্ট</Button>
                  <Button onClick={() => exportCSV('universal_products')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> CSV প্রোডাক্ট</Button>
                  <Button onClick={() => exportCSV('universal_categories')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> CSV ক্যাটাগরি</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">অর্ডার ডাটা</CardTitle>
                  <CardDescription>অর্ডার ও কাস্টমার তথ্য</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => exportCSV('orders')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> CSV অর্ডার</Button>
                  <Button onClick={() => exportCSV('order_items')} className="w-full" variant="outline"><Download className="h-4 w-4 mr-2" /> CSV আইটেম</Button>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">অন্যান্য ডাটা এক্সপোর্ট</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['coupons', 'offers', 'brands', 'publishers', 'email_subscribers', 'reviews'].map(table => (
                    <Button key={table} variant="outline" size="sm" onClick={() => exportCSV(table)}><Download className="h-3 w-3 mr-1" /> {table}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="full" className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> সম্পূর্ণ ডাটাবেস ব্যাকআপ</CardTitle>
                <CardDescription>সকল সেটিংস, প্রোডাক্ট, ক্যাটাগরি, অফার, কুপন সহ সম্পূর্ণ ডাটা</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportFullBackup} size="lg" className="w-full"><Database className="h-5 w-5 mr-2" /> সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন</Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">এতে অর্ডার এবং ইউজার ডাটা অন্তর্ভুক্ত নয় (প্রাইভেসি কারণে)</p>
              </CardContent>
            </Card>
          </TabsContent>

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
                        <TableHead>স্ট্যাটাস</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupHistory.map((backup: any) => (
                        <TableRow key={backup.id}>
                          <TableCell className="text-sm">{format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell><Badge variant="outline">{backup.backup_type}</Badge></TableCell>
                          <TableCell className="text-sm font-mono">{backup.file_name}</TableCell>
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
