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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, Utensils, Pencil as PencilIcon } from 'lucide-react';

type ProductType = 'lifestyle' | 'stationery' | 'food';

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  product_type: ProductType;
  parent_id: string | null;
  image_url: string | null;
  description_bn: string | null;
  description_en: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  is_active: boolean;
}

const PRODUCT_TYPES: { value: ProductType; label: string; icon: any }[] = [
  { value: 'lifestyle', label: 'লাইফস্টাইল', icon: Package },
  { value: 'stationery', label: 'স্টেশনারী', icon: PencilIcon },
  { value: 'food', label: 'ফুড', icon: Utensils },
];

const AdminUniversalCategories = () => {
  const [categories, setCategories] = useState<UniversalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UniversalCategory | null>(null);
  const [filterType, setFilterType] = useState<ProductType | 'all'>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    product_type: 'lifestyle' as ProductType,
    parent_id: '',
    image_url: '',
    description_bn: '',
    description_en: '',
    meta_title: '',
    meta_description: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('universal_categories')
        .select('*')
        .order('product_type')
        .order('sort_order');

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
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const categoryData = {
        name_bn: formData.name_bn,
        name_en: formData.name_en,
        slug: formData.slug || generateSlug(formData.name_en),
        product_type: formData.product_type,
        parent_id: formData.parent_id || null,
        image_url: formData.image_url || null,
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('universal_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'ক্যাটাগরি আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('universal_categories')
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

  const handleEdit = (category: UniversalCategory) => {
    setEditingCategory(category);
    setFormData({
      name_bn: category.name_bn,
      name_en: category.name_en,
      slug: category.slug,
      product_type: category.product_type,
      parent_id: category.parent_id || '',
      image_url: category.image_url || '',
      description_bn: category.description_bn || '',
      description_en: category.description_en || '',
      meta_title: category.meta_title || '',
      meta_description: category.meta_description || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ক্যাটাগরি মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('universal_categories').delete().eq('id', id);
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
      product_type: 'lifestyle',
      parent_id: '',
      image_url: '',
      description_bn: '',
      description_en: '',
      meta_title: '',
      meta_description: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const getProductTypeLabel = (type: ProductType) => {
    return PRODUCT_TYPES.find(t => t.value === type)?.label || type;
  };

  const parentCategories = categories.filter(c => 
    c.product_type === formData.product_type && !c.parent_id && c.id !== editingCategory?.id
  );

  const filteredCategories = categories.filter(c => 
    filterType === 'all' || c.product_type === filterType
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ইউনিভার্সাল ক্যাটাগরি</h1>
            <p className="text-muted-foreground">লাইফস্টাইল, স্টেশনারী ও ফুড ক্যাটাগরি ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন ক্যাটাগরি</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>প্রোডাক্ট টাইপ *</Label>
                  <Select 
                    value={formData.product_type} 
                    onValueChange={(value: ProductType) => setFormData({ ...formData, product_type: value, parent_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <Label>Slug (SEO URL)</Label>
                    <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                  </div>
                  <div>
                    <Label>প্যারেন্ট ক্যাটাগরি</Label>
                    <Select value={formData.parent_id || "none"} onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="কোনো প্যারেন্ট নেই" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোনো প্যারেন্ট নেই</SelectItem>
                        {parentCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>ছবি URL</Label>
                  <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea value={formData.description_bn} onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>Description (English)</Label>
                  <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meta Title</Label>
                    <Input value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label>অ্যাক্টিভ</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
                  <Button type="submit">{editingCategory ? 'আপডেট করুন' : 'সেভ করুন'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex gap-4">
          <Select value={filterType} onValueChange={(value: ProductType | 'all') => setFilterType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="সব টাইপ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব টাইপ</SelectItem>
              {PRODUCT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোনো ক্যাটাগরি পাওয়া যায়নি</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4">নাম</th>
                      <th className="text-left p-4">টাইপ</th>
                      <th className="text-left p-4">Slug</th>
                      <th className="text-left p-4">সর্ট</th>
                      <th className="text-left p-4">স্ট্যাটাস</th>
                      <th className="text-right p-4">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="border-t">
                        <td className="p-4">
                          <div className="font-medium">{category.parent_id ? '↳ ' : ''}{category.name_bn}</div>
                          <div className="text-sm text-muted-foreground">{category.name_en}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{getProductTypeLabel(category.product_type)}</Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{category.slug}</td>
                        <td className="p-4">{category.sort_order}</td>
                        <td className="p-4">
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(category.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

export default AdminUniversalCategories;
