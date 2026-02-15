import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

const AdminBundles = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    description_bn: '',
    bundle_price: '',
    original_total: '',
    discount_percent: '',
    image_url: '',
  });

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*, bundle_items(*, products:product_id(title_bn, title_en))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBundle) {
        const { error } = await supabase
          .from('product_bundles')
          .update(data)
          .eq('id', editingBundle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_bundles')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success(editingBundle ? 'বান্ডেল আপডেট হয়েছে' : 'বান্ডেল তৈরি হয়েছে');
      resetForm();
    },
    onError: () => toast.error('সমস্যা হয়েছে'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('product_bundles')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success('স্ট্যাটাস পরিবর্তন হয়েছে');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_bundles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success('বান্ডেল মুছে ফেলা হয়েছে');
    },
  });

  const resetForm = () => {
    setFormData({ name_bn: '', name_en: '', slug: '', description_bn: '', bundle_price: '', original_total: '', discount_percent: '', image_url: '' });
    setEditingBundle(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (bundle: any) => {
    setEditingBundle(bundle);
    setFormData({
      name_bn: bundle.name_bn || '',
      name_en: bundle.name_en || '',
      slug: bundle.slug || '',
      description_bn: bundle.description_bn || '',
      bundle_price: String(bundle.bundle_price || ''),
      original_total: String(bundle.original_total || ''),
      discount_percent: String(bundle.discount_percent || ''),
      image_url: bundle.image_url || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name_bn || !formData.slug || !formData.bundle_price) {
      toast.error('প্রয়োজনীয় ফিল্ড পূরণ করুন');
      return;
    }
    saveMutation.mutate({
      name_bn: formData.name_bn,
      name_en: formData.name_en,
      slug: formData.slug,
      description_bn: formData.description_bn,
      bundle_price: parseFloat(formData.bundle_price),
      original_total: parseFloat(formData.original_total || '0'),
      discount_percent: parseInt(formData.discount_percent || '0'),
      image_url: formData.image_url || null,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">বান্ডেল ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">প্রোডাক্ট বান্ডেল তৈরি ও পরিচালনা করুন</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> নতুন বান্ডেল
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBundle ? 'বান্ডেল সম্পাদনা' : 'নতুন বান্ডেল'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>নাম (বাংলা) *</Label>
                  <Input value={formData.name_bn} onChange={e => setFormData(p => ({ ...p, name_bn: e.target.value }))} />
                </div>
                <div>
                  <Label>নাম (English)</Label>
                  <Input value={formData.name_en} onChange={e => setFormData(p => ({ ...p, name_en: e.target.value }))} />
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} />
                </div>
                <div>
                  <Label>বিবরণ (বাংলা)</Label>
                  <Input value={formData.description_bn} onChange={e => setFormData(p => ({ ...p, description_bn: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>বান্ডেল মূল্য *</Label>
                    <Input type="number" value={formData.bundle_price} onChange={e => setFormData(p => ({ ...p, bundle_price: e.target.value }))} />
                  </div>
                  <div>
                    <Label>মূল মূল্য</Label>
                    <Input type="number" value={formData.original_total} onChange={e => setFormData(p => ({ ...p, original_total: e.target.value }))} />
                  </div>
                  <div>
                    <Label>ছাড় %</Label>
                    <Input type="number" value={formData.discount_percent} onChange={e => setFormData(p => ({ ...p, discount_percent: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>ইমেজ URL</Label>
                  <Input value={formData.image_url} onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))} />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'সেভ হচ্ছে...' : (editingBundle ? 'আপডেট করুন' : 'তৈরি করুন')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> সকল বান্ডেল ({bundles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
            ) : bundles.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">কোনো বান্ডেল নেই</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>মূল্য</TableHead>
                    <TableHead>ছাড়</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles.map((bundle: any) => (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bundle.name_bn}</p>
                          {bundle.name_en && <p className="text-sm text-muted-foreground">{bundle.name_en}</p>}
                        </div>
                      </TableCell>
                      <TableCell>৳{bundle.bundle_price}</TableCell>
                      <TableCell>
                        {bundle.discount_percent > 0 && (
                          <Badge variant="secondary">{bundle.discount_percent}%</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bundle.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: bundle.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(bundle)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                          if (confirm('মুছে ফেলতে চান?')) deleteMutation.mutate(bundle.id);
                        }}>
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
      </div>
    </AdminLayout>
  );
};

export default AdminBundles;
