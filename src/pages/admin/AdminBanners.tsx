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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Image } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  image_desktop: string;
  image_mobile: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    image_desktop: '',
    image_mobile: '',
    link_url: '',
    sort_order: 0,
    is_active: true,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast({ title: 'Error', description: 'ব্যানার লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const bannerData = {
        title: formData.title,
        image_desktop: formData.image_desktop,
        image_mobile: formData.image_mobile || null,
        link_url: formData.link_url || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ব্যানার আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([bannerData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ব্যানার যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_desktop: banner.image_desktop,
      image_mobile: banner.image_mobile || '',
      link_url: banner.link_url || '',
      sort_order: banner.sort_order,
      is_active: banner.is_active,
      start_date: banner.start_date?.split('T')[0] || '',
      end_date: banner.end_date?.split('T')[0] || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ব্যানার মুছতে চান?')) return;

    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'সফল', description: 'ব্যানার মুছে ফেলা হয়েছে' });
      fetchBanners();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      image_desktop: '',
      image_mobile: '',
      link_url: '',
      sort_order: 0,
      is_active: true,
      start_date: '',
      end_date: ''
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ব্যানার</h1>
            <p className="text-muted-foreground">হোমপেজ স্লাইডার ব্যানার ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                নতুন ব্যানার
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBanner ? 'ব্যানার এডিট' : 'নতুন ব্যানার'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>টাইটেল</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>ডেস্কটপ ইমেজ URL *</Label>
                  <Input
                    value={formData.image_desktop}
                    onChange={(e) => setFormData({ ...formData, image_desktop: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div>
                  <Label>মোবাইল ইমেজ URL</Label>
                  <Input
                    value={formData.image_mobile}
                    onChange={(e) => setFormData({ ...formData, image_mobile: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>লিংক URL</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://... বা /shop"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>শুরুর তারিখ</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>শেষ তারিখ</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>সর্ট অর্ডার</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>অ্যাক্টিভ</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingBanner ? 'আপডেট করুন' : 'যোগ করুন'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Banners List */}
        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">লোড হচ্ছে...</CardContent>
            </Card>
          ) : banners.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">কোন ব্যানার নেই</CardContent>
            </Card>
          ) : (
            banners.map((banner) => (
              <Card key={banner.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <div className="w-32 h-20 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {banner.image_desktop ? (
                        <img
                          src={banner.image_desktop}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{banner.title}</p>
                      <p className="text-sm text-muted-foreground">
                        অর্ডার: {banner.sort_order}
                        {banner.link_url && ` • লিংক: ${banner.link_url}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {banner.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBanners;
