import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LogoUpload } from '@/components/admin/LogoUpload';
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

interface Writer {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  bio_en: string | null;
  bio_bn: string | null;
  image_url: string | null;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
}

const AdminWriters = () => {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWriter, setEditingWriter] = useState<Writer | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    bio_bn: '',
    bio_en: '',
    image_url: '',
    is_active: true,
    meta_title: '',
    meta_description: '',
  });

  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    try {
      const { data, error } = await supabase
        .from('writers')
        .select('*')
        .order('name_bn');

      if (error) throw error;
      setWriters(data || []);
    } catch (error) {
      console.error('Error fetching writers:', error);
      toast({ title: 'Error', description: 'লেখক লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
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
      const writerData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name_en),
        bio_bn: formData.bio_bn || null,
        bio_en: formData.bio_en || null,
        image_url: formData.image_url || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
      };

      if (editingWriter) {
        const { error } = await supabase
          .from('writers')
          .update(writerData)
          .eq('id', editingWriter.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'লেখক আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('writers')
          .insert([writerData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'লেখক যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchWriters();
    } catch (error: any) {
      console.error('Error saving writer:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (writer: Writer) => {
    setEditingWriter(writer);
    setFormData({
      name_bn: writer.name_bn,
      name_en: writer.name_en,
      slug: writer.slug,
      bio_bn: writer.bio_bn || '',
      bio_en: writer.bio_en || '',
      image_url: writer.image_url || '',
      is_active: writer.is_active,
      meta_title: writer.meta_title || '',
      meta_description: writer.meta_description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই লেখক মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('writers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'সফল', description: 'লেখক মুছে ফেলা হয়েছে' });
      fetchWriters();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingWriter(null);
    setFormData({
      name_bn: '',
      name_en: '',
      slug: '',
      bio_bn: '',
      bio_en: '',
      image_url: '',
      is_active: true,
      meta_title: '',
      meta_description: '',
    });
  };

  const filteredWriters = writers.filter(w =>
    w.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">লেখক</h1>
            <p className="text-muted-foreground">সকল লেখক ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন লেখক</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingWriter ? 'লেখক এডিট' : 'নতুন লেখক'}</DialogTitle>
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
                    <div>
                      <Label>Slug</Label>
                      <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                    </div>
                    <div>
                      <Label>ছবি</Label>
                      <LogoUpload
                        value={formData.image_url}
                        onChange={(url) => setFormData({ ...formData, image_url: url })}
                        label="লেখকের ছবি"
                        folder="writers"
                      />
                    </div>
                    <div>
                      <Label>জীবনী (বাংলা)</Label>
                      <Textarea value={formData.bio_bn} onChange={(e) => setFormData({ ...formData, bio_bn: e.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>Bio (English)</Label>
                      <Textarea value={formData.bio_en} onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })} rows={3} />
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
                <Button type="submit" className="w-full">{editingWriter ? 'আপডেট করুন' : 'যোগ করুন'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="লেখক খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredWriters.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন লেখক নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">লেখক</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWriters.map((writer) => (
                      <tr key={writer.id} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {writer.image_url && <img src={writer.image_url} alt={writer.name_bn} className="w-10 h-10 rounded-full object-cover" />}
                            <div>
                              <p className="font-medium">{writer.name_bn}</p>
                              <p className="text-sm text-muted-foreground">{writer.name_en}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {writer.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">অ্যাক্টিভ</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">ইনঅ্যাক্টিভ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(writer)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(writer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminWriters;
