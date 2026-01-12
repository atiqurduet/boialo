import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { CategoryBulkActions } from '@/components/admin/CategoryBulkActions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    parent_id: '',
    image_url: '',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'ক্যাটাগরি লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const categoryData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name_en),
        parent_id: formData.parent_id || null,
        image_url: formData.image_url || null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ক্যাটাগরি আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ক্যাটাগরি যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name_bn: category.name_bn,
      name_en: category.name_en,
      slug: category.slug,
      parent_id: category.parent_id || '',
      image_url: category.image_url || '',
      sort_order: category.sort_order,
      is_active: category.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ক্যাটাগরি মুছতে চান?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'সফল', description: 'ক্যাটাগরি মুছে ফেলা হয়েছে' });
      fetchCategories();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name_bn: '',
      name_en: '',
      slug: '',
      parent_id: '',
      image_url: '',
      sort_order: 0,
      is_active: true
    });
  };

  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ক্যাটাগরি</h1>
            <p className="text-muted-foreground">প্রোডাক্ট ক্যাটাগরি ম্যানেজ করুন</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <CategoryBulkActions categories={categories} onImportComplete={fetchCategories} />
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  নতুন ক্যাটাগরি
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>নাম (বাংলা)</Label>
                      <Input
                        value={formData.name_bn}
                        onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Name (English)</Label>
                      <Input
                        value={formData.name_en}
                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-generated from English name"
                    />
                  </div>

                  <div>
                    <Label>প্যারেন্ট ক্যাটাগরি</Label>
                    <Select
                      value={formData.parent_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="প্যারেন্ট নির্বাচন করুন (ঐচ্ছিক)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোন প্যারেন্ট নেই (মূল ক্যাটাগরি)</SelectItem>
                        {parentCategories
                          .filter(c => c.id !== editingCategory?.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>ইমেজ</Label>
                    <LogoUpload
                      value={formData.image_url}
                      onChange={(url) => setFormData({ ...formData, image_url: url })}
                      label="ক্যাটাগরি ইমেজ"
                      folder="categories"
                    />
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
                    {editingCategory ? 'আপডেট করুন' : 'যোগ করুন'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন ক্যাটাগরি নেই</div>
            ) : (
              <div className="divide-y">
                {parentCategories.map((category) => {
                  const subCategories = categories.filter(c => c.parent_id === category.id);
                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                          <div>
                            <p className="font-medium">{category.name_bn}</p>
                            <p className="text-sm text-muted-foreground">{category.name_en}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {category.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {subCategories.length > 0 && (
                        <div className="pl-12 bg-muted/30">
                          {subCategories.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between p-3 border-t">
                              <div>
                                <p className="font-medium text-sm">{sub.name_bn}</p>
                                <p className="text-xs text-muted-foreground">{sub.name_en}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${sub.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {sub.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
