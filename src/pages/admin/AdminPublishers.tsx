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

interface Publisher {
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

const AdminPublishers = () => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
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
    fetchPublishers();
  }, []);

  const fetchPublishers = async () => {
    try {
      const { data, error } = await supabase
        .from('publishers')
        .select('*')
        .order('name_bn');

      if (error) throw error;
      setPublishers(data || []);
    } catch (error) {
      console.error('Error fetching publishers:', error);
      toast({ title: 'Error', description: 'প্রকাশনী লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
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
      const publisherData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name_en),
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        logo_url: formData.logo_url || null,
        website_url: formData.website_url || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
      };

      if (editingPublisher) {
        const { error } = await supabase
          .from('publishers')
          .update(publisherData)
          .eq('id', editingPublisher.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রকাশনী আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('publishers')
          .insert([publisherData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রকাশনী যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchPublishers();
    } catch (error: any) {
      console.error('Error saving publisher:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (publisher: Publisher) => {
    setEditingPublisher(publisher);
    setFormData({
      name_bn: publisher.name_bn,
      name_en: publisher.name_en,
      slug: publisher.slug,
      description_bn: publisher.description_bn || '',
      description_en: publisher.description_en || '',
      logo_url: publisher.logo_url || '',
      website_url: publisher.website_url || '',
      is_active: publisher.is_active,
      meta_title: publisher.meta_title || '',
      meta_description: publisher.meta_description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই প্রকাশনী মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('publishers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'সফল', description: 'প্রকাশনী মুছে ফেলা হয়েছে' });
      fetchPublishers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingPublisher(null);
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

  const filteredPublishers = publishers.filter(p =>
    p.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">প্রকাশনী</h1>
            <p className="text-muted-foreground">সকল প্রকাশনী ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন প্রকাশনী</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPublisher ? 'প্রকাশনী এডিট' : 'নতুন প্রকাশনী'}</DialogTitle>
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
                <Button type="submit" className="w-full">{editingPublisher ? 'আপডেট করুন' : 'যোগ করুন'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="প্রকাশনী খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredPublishers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন প্রকাশনী নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">প্রকাশনী</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPublishers.map((publisher) => (
                      <tr key={publisher.id} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {publisher.logo_url && <img src={publisher.logo_url} alt={publisher.name_bn} className="w-10 h-10 rounded object-cover" />}
                            <div>
                              <p className="font-medium">{publisher.name_bn}</p>
                              <p className="text-sm text-muted-foreground">{publisher.name_en}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {publisher.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">অ্যাক্টিভ</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">ইনঅ্যাক্টিভ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(publisher)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(publisher.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminPublishers;
