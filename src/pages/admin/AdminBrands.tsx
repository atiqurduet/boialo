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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Brand {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  description_en: string | null;
  description_bn: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
}

const AdminBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    description_bn: '',
    description_en: '',
    logo_url: '',
    website_url: '',
    is_active: true,
    meta_title: '',
    meta_description: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name_bn');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({ title: 'Error', description: 'ব্র্যান্ড লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const brandData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name_en),
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        logo_url: formData.logo_url || null,
        website_url: formData.website_url || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
      };

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update(brandData)
          .eq('id', editingBrand.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ব্র্যান্ড আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([brandData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ব্র্যান্ড যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchBrands();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name_bn: brand.name_bn,
      name_en: brand.name_en,
      slug: brand.slug,
      description_bn: brand.description_bn || '',
      description_en: brand.description_en || '',
      logo_url: brand.logo_url || '',
      website_url: brand.website_url || '',
      is_active: brand.is_active,
      meta_title: brand.meta_title || '',
      meta_description: brand.meta_description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ব্র্যান্ড মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'সফল', description: 'ব্র্যান্ড মুছে ফেলা হয়েছে' });
      fetchBrands();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingBrand(null);
    setFormData({
      name_bn: '',
      name_en: '',
      slug: '',
      description_bn: '',
      description_en: '',
      logo_url: '',
      website_url: '',
      is_active: true,
      meta_title: '',
      meta_description: '',
    });
  };

  const filteredBrands = brands.filter(b =>
    b.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ব্র্যান্ড</h1>
            <p className="text-muted-foreground">সকল ব্র্যান্ড ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন ব্র্যান্ড</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBrand ? 'ব্র্যান্ড এডিট' : 'নতুন ব্র্যান্ড'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">মূল তথ্য</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>নাম (বাংলা) *</Label>
                        <Input value={formData.name_bn} onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Name (English) *</Label>
                        <Input value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Slug</Label>
                        <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                      </div>
                      <div>
                        <Label>Website URL</Label>
                        <Input value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://" />
                      </div>
                    </div>
                    <div>
                      <Label>লোগো URL</Label>
                      <Input value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} />
                    </div>
                    <div>
                      <Label>বিবরণ (বাংলা)</Label>
                      <Textarea value={formData.description_bn} onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>Description (English)</Label>
                      <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={3} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                      <Label>অ্যাক্টিভ</Label>
                    </div>
                  </TabsContent>
                  <TabsContent value="seo" className="space-y-4 mt-4">
                    <div>
                      <Label>Meta Title</Label>
                      <Input value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} placeholder="SEO title" />
                    </div>
                    <div>
                      <Label>Meta Description</Label>
                      <Textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={3} placeholder="SEO description" />
                    </div>
                  </TabsContent>
                </Tabs>
                <Button type="submit" className="w-full">{editingBrand ? 'আপডেট করুন' : 'যোগ করুন'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ব্র্যান্ড খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredBrands.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন ব্র্যান্ড নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">ব্র্যান্ড</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((brand) => (
                      <tr key={brand.id} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {brand.logo_url && <img src={brand.logo_url} alt={brand.name_bn} className="w-10 h-10 rounded object-cover" />}
                            <div>
                              <p className="font-medium">{brand.name_bn}</p>
                              <p className="text-sm text-muted-foreground">{brand.name_en}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {brand.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">অ্যাক্টিভ</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">ইনঅ্যাক্টিভ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBrands;
