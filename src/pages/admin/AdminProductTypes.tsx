import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package, GripVertical } from 'lucide-react';

interface ProductType {
  id: string;
  type_key: string;
  name_bn: string;
  name_en: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface AttributeTemplate {
  id: string;
  type_key: string;
  attribute_name_bn: string;
  attribute_name_en: string;
  is_required: boolean;
  sort_order: number;
}

const AdminProductTypes = () => {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<AttributeTemplate | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type_key: '',
    name_bn: '',
    name_en: '',
    icon: 'Package',
    sort_order: 0,
    is_active: true,
  });

  const [templateForm, setTemplateForm] = useState({
    attribute_name_bn: '',
    attribute_name_en: '',
    is_required: false,
    sort_order: 0,
  });

  useEffect(() => {
    fetchProductTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeKey) fetchTemplates(selectedTypeKey);
  }, [selectedTypeKey]);

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      setProductTypes(data || []);
      if (data && data.length > 0 && !selectedTypeKey) {
        setSelectedTypeKey(data[0].type_key);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async (typeKey: string) => {
    const { data } = await supabase
      .from('product_type_attribute_templates')
      .select('*')
      .eq('type_key', typeKey)
      .order('sort_order');
    setTemplates(data || []);
  };

  const generateKey = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        type_key: formData.type_key || generateKey(formData.name_en),
        name_bn: formData.name_bn,
        name_en: formData.name_en,
        icon: formData.icon || 'Package',
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      };

      if (editingType) {
        const { error } = await supabase.from('product_types').update(data).eq('id', editingType.id);
        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রোডাক্ট টাইপ আপডেট হয়েছে' });
      } else {
        const { error } = await supabase.from('product_types').insert([data]);
        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রোডাক্ট টাইপ যোগ হয়েছে' });
      }
      setDialogOpen(false);
      resetForm();
      fetchProductTypes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        type_key: selectedTypeKey,
        attribute_name_bn: templateForm.attribute_name_bn,
        attribute_name_en: templateForm.attribute_name_en,
        is_required: templateForm.is_required,
        sort_order: templateForm.sort_order,
      };

      if (editingTemplate) {
        const { error } = await supabase.from('product_type_attribute_templates').update(data).eq('id', editingTemplate.id);
        if (error) throw error;
        toast({ title: 'সফল', description: 'টেমপ্লেট আপডেট হয়েছে' });
      } else {
        const { error } = await supabase.from('product_type_attribute_templates').insert([data]);
        if (error) throw error;
        toast({ title: 'সফল', description: 'অ্যাট্রিবিউট টেমপ্লেট যোগ হয়েছে' });
      }
      setTemplateDialogOpen(false);
      resetTemplateForm();
      fetchTemplates(selectedTypeKey);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (type: ProductType) => {
    setEditingType(type);
    setFormData({ type_key: type.type_key, name_bn: type.name_bn, name_en: type.name_en, icon: type.icon, sort_order: type.sort_order, is_active: type.is_active });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('এই প্রোডাক্ট টাইপ মুছলে সকল সম্পর্কিত ক্যাটাগরি ও প্রোডাক্ট টাইপ হারিয়ে যাবে। নিশ্চিত?')) return;
    const { error } = await supabase.from('product_types').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'সফল', description: 'মুছে ফেলা হয়েছে' });
    fetchProductTypes();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('এই অ্যাট্রিবিউট টেমপ্লেট মুছবেন?')) return;
    await supabase.from('product_type_attribute_templates').delete().eq('id', id);
    fetchTemplates(selectedTypeKey);
  };

  const resetForm = () => {
    setEditingType(null);
    setFormData({ type_key: '', name_bn: '', name_en: '', icon: 'Package', sort_order: 0, is_active: true });
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateForm({ attribute_name_bn: '', attribute_name_en: '', is_required: false, sort_order: 0 });
  };

  const iconOptions = ['Package', 'ShoppingBag', 'Utensils', 'PenTool', 'Shirt', 'Home', 'Smartphone', 'Car', 'Heart', 'Star', 'Zap', 'Coffee', 'Book', 'Music', 'Camera', 'Dumbbell', 'Flower', 'Globe'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">প্রোডাক্ট টাইপ ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">আনলিমিটেড প্রোডাক্ট ধরন এবং অ্যাট্রিবিউট টেমপ্লেট ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন টাইপ</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingType ? 'টাইপ এডিট' : 'নতুন প্রোডাক্ট টাইপ'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label>Type Key (unique identifier)</Label>
                  <Input value={formData.type_key} onChange={(e) => setFormData({ ...formData, type_key: e.target.value })} placeholder="auto-generated from English name" disabled={!!editingType} />
                  <p className="text-xs text-muted-foreground mt-1">একবার সেট করলে পরিবর্তন করা যাবে না</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>আইকন</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} />
                  <Label>অ্যাক্টিভ</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
                  <Button type="submit">{editingType ? 'আপডেট' : 'সেভ'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Types List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h2 className="font-semibold">প্রোডাক্ট টাইপ ({productTypes.length})</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center">লোড হচ্ছে...</div>
              ) : productTypes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">কোনো টাইপ নেই</div>
              ) : (
                <div className="divide-y">
                  {productTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedTypeKey === type.type_key ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                      onClick={() => setSelectedTypeKey(type.type_key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{type.name_bn}</p>
                            <p className="text-xs text-muted-foreground">{type.name_en} · {type.type_key}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={type.is_active ? 'default' : 'secondary'} className="text-xs">
                            {type.is_active ? 'অ্যাক্টিভ' : 'বন্ধ'}
                          </Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(type); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(type.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attribute Templates */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">অ্যাট্রিবিউট টেমপ্লেট</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedTypeKey ? `"${productTypes.find(t => t.type_key === selectedTypeKey)?.name_bn}" এর জন্য ডিফল্ট অ্যাট্রিবিউট` : 'একটি টাইপ নির্বাচন করুন'}
                  </p>
                </div>
                {selectedTypeKey && (
                  <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) resetTemplateForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1" />অ্যাট্রিবিউট যোগ</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'অ্যাট্রিবিউট এডিট' : 'নতুন অ্যাট্রিবিউট টেমপ্লেট'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleTemplateSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>নাম (বাংলা) *</Label>
                            <Input value={templateForm.attribute_name_bn} onChange={(e) => setTemplateForm({ ...templateForm, attribute_name_bn: e.target.value })} required placeholder="যেমন: রং, সাইজ, উপাদান" />
                          </div>
                          <div>
                            <Label>Name (English)</Label>
                            <Input value={templateForm.attribute_name_en} onChange={(e) => setTemplateForm({ ...templateForm, attribute_name_en: e.target.value })} placeholder="e.g. Color, Size, Material" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Sort Order</Label>
                            <Input type="number" value={templateForm.sort_order} onChange={(e) => setTemplateForm({ ...templateForm, sort_order: Number(e.target.value) })} />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <Switch checked={templateForm.is_required} onCheckedChange={(c) => setTemplateForm({ ...templateForm, is_required: c })} />
                            <Label>বাধ্যতামূলক</Label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>বাতিল</Button>
                          <Button type="submit">{editingTemplate ? 'আপডেট' : 'সেভ'}</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {!selectedTypeKey ? (
                <div className="p-8 text-center text-muted-foreground">বাম দিক থেকে একটি প্রোডাক্ট টাইপ নির্বাচন করুন</div>
              ) : templates.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>কোনো অ্যাট্রিবিউট টেমপ্লেট নেই</p>
                  <p className="text-sm">এই প্রোডাক্ট টাইপের জন্য ডিফল্ট অ্যাট্রিবিউট যোগ করুন</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm">#</th>
                        <th className="text-left p-3 text-sm">অ্যাট্রিবিউট নাম (বাংলা)</th>
                        <th className="text-left p-3 text-sm">Name (English)</th>
                        <th className="text-left p-3 text-sm">বাধ্যতামূলক</th>
                        <th className="text-right p-3 text-sm">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((tmpl, idx) => (
                        <tr key={tmpl.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium">{tmpl.attribute_name_bn}</td>
                          <td className="p-3 text-muted-foreground">{tmpl.attribute_name_en || '-'}</td>
                          <td className="p-3">
                            <Badge variant={tmpl.is_required ? 'default' : 'secondary'}>
                              {tmpl.is_required ? 'হ্যাঁ' : 'না'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                setEditingTemplate(tmpl);
                                setTemplateForm({ attribute_name_bn: tmpl.attribute_name_bn, attribute_name_en: tmpl.attribute_name_en, is_required: tmpl.is_required, sort_order: tmpl.sort_order });
                                setTemplateDialogOpen(true);
                              }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteTemplate(tmpl.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
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
      </div>
    </AdminLayout>
  );
};

export default AdminProductTypes;
