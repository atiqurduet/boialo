import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { DynamicLinkSelector } from '@/components/admin/page/DynamicLinkSelector';

interface MenuItem {
  id: string;
  menu_id: string;
  title_bn: string;
  title_en: string | null;
  url: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

const AdminMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title_bn: '',
    title_en: '',
    url: '',
    is_active: true,
    open_in_new_tab: false,
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data: menu } = await supabase
        .from('navigation_menus')
        .select('id')
        .eq('location', 'header')
        .single();

      if (menu) {
        setMenuId(menu.id);
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('menu_id', menu.id)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setMenuItems(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuId) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({ ...formData, title_en: formData.title_en || null })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'সফল', description: 'মেনু আইটেম আপডেট হয়েছে' });
      } else {
        const maxOrder = menuItems.length > 0 ? Math.max(...menuItems.map(m => m.sort_order)) + 1 : 0;
        const { error } = await supabase
          .from('menu_items')
          .insert({ ...formData, title_en: formData.title_en || null, menu_id: menuId, sort_order: maxOrder });
        if (error) throw error;
        toast({ title: 'সফল', description: 'নতুন মেনু আইটেম যোগ হয়েছে' });
      }
      setDialogOpen(false);
      fetchMenuItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('মুছে ফেলতে চান?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (!error) {
      toast({ title: 'সফল', description: 'মেনু আইটেম মুছে ফেলা হয়েছে' });
      fetchMenuItems();
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title_bn: '', title_en: '', url: '', is_active: true, open_in_new_tab: false });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      title_bn: item.title_bn,
      title_en: item.title_en || '',
      url: item.url,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">নেভিগেশন মেনু</h1>
            <p className="text-muted-foreground">হেডার মেনু আইটেম ম্যানেজ করুন</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />নতুন আইটেম</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : (
              <div className="divide-y">
                {menuItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 ${!item.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.title_bn}</p>
                        <p className="text-sm text-muted-foreground">{item.url}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'মেনু আইটেম এডিট' : 'নতুন মেনু আইটেম'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>নাম (বাংলা)</Label><Input value={formData.title_bn} onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })} required /></div>
              <div><Label>Name (English)</Label><Input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} /></div>
              <DynamicLinkSelector value={formData.url} onChange={(url) => setFormData({ ...formData, url })} label="URL" placeholder="/shop" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} /><Label>অ্যাক্টিভ</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.open_in_new_tab} onCheckedChange={(c) => setFormData({ ...formData, open_in_new_tab: c })} /><Label>নতুন ট্যাবে খুলুন</Label></div>
              </div>
              <Button type="submit" className="w-full">{editingItem ? 'আপডেট করুন' : 'যোগ করুন'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMenu;
