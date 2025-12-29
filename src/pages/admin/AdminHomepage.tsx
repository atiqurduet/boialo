import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Eye, EyeOff, Settings2, Plus, Trash2, Search } from 'lucide-react';

interface HomepageSection {
  id: string;
  section_type: string;
  title_bn: string;
  title_en: string | null;
  subtitle_bn: string | null;
  sort_order: number;
  is_active: boolean;
  settings: any;
}

const sectionTypeLabels: Record<string, string> = {
  flash_sale: '⚡ ফ্ল্যাশ সেল',
  category_grid: '📚 ক্যাটাগরি গ্রিড',
  category_products: '📂 ক্যাটাগরি প্রোডাক্ট',
  writer_products: '✍️ লেখকের বই',
  new_releases: '🆕 নতুন প্রকাশিত',
  bestsellers: '🏆 বেস্টসেলার',
  promo_banner: '🎯 প্রমো ব্যানার',
  recommended: '💡 সুপারিশকৃত',
  featured_products: '⭐ ফিচার্ড প্রোডাক্ট',
  selected_products: '📌 সিলেক্টেড প্রোডাক্ট',
  trust_badges: '🛡️ ট্রাস্ট ব্যাজ',
  newsletter: '📧 নিউজলেটার',
};

const sectionTypes = Object.entries(sectionTypeLabels).map(([value, label]) => ({
  value,
  label
}));

const AdminHomepage = () => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Data for dropdowns
  const [categories, setCategories] = useState<Array<{ id: string; name_bn: string }>>([]);
  const [writers, setWriters] = useState<Array<{ id: string; name_bn: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; title_bn: string }>>([]);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState({
    section_type: '',
    title_bn: '',
    title_en: '',
    subtitle_bn: '',
    is_active: true,
    settings: {} as any,
  });

  useEffect(() => {
    fetchSections();
    fetchCategories();
    fetchWriters();
  }, []);

  useEffect(() => {
    if (productSearch.length >= 2) {
      fetchProducts(productSearch);
    }
  }, [productSearch]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name_bn')
      .eq('is_active', true)
      .order('name_bn');
    setCategories(data || []);
  };

  const fetchWriters = async () => {
    const { data } = await supabase
      .from('writers')
      .select('id, name_bn')
      .eq('is_active', true)
      .order('name_bn');
    setWriters(data || []);
  };

  const fetchProducts = async (search: string) => {
    const { data } = await supabase
      .from('products')
      .select('id, title_bn')
      .eq('is_active', true)
      .ilike('title_bn', `%${search}%`)
      .limit(20);
    setProducts(data || []);
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({ title: 'Error', description: 'সেকশন লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingSection(null);
    setFormData({
      section_type: 'new_releases',
      title_bn: '',
      title_en: '',
      subtitle_bn: '',
      is_active: true,
      settings: {},
    });
    setDialogOpen(true);
  };

  const handleEdit = (section: HomepageSection) => {
    setIsCreating(false);
    setEditingSection(section);
    setFormData({
      section_type: section.section_type,
      title_bn: section.title_bn,
      title_en: section.title_en || '',
      subtitle_bn: section.subtitle_bn || '',
      is_active: section.is_active,
      settings: section.settings || {},
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isCreating) {
        // Get max sort order
        const maxOrder = sections.length > 0 
          ? Math.max(...sections.map(s => s.sort_order)) + 1 
          : 0;

        const { error } = await supabase
          .from('homepage_sections')
          .insert({
            section_type: formData.section_type,
            title_bn: formData.title_bn,
            title_en: formData.title_en || null,
            subtitle_bn: formData.subtitle_bn || null,
            is_active: formData.is_active,
            settings: formData.settings,
            sort_order: maxOrder,
          });

        if (error) throw error;
        toast({ title: 'সফল', description: 'নতুন সেকশন যোগ হয়েছে' });
      } else if (editingSection) {
        const { error } = await supabase
          .from('homepage_sections')
          .update({
            section_type: formData.section_type,
            title_bn: formData.title_bn,
            title_en: formData.title_en || null,
            subtitle_bn: formData.subtitle_bn || null,
            is_active: formData.is_active,
            settings: formData.settings,
          })
          .eq('id', editingSection.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'সেকশন আপডেট হয়েছে' });
      }

      setDialogOpen(false);
      fetchSections();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই সেকশন মুছতে চান?')) return;

    try {
      const { error } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      toast({ title: 'সফল', description: 'সেকশন মুছে ফেলা হয়েছে' });
      fetchSections();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (section: HomepageSection) => {
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .update({ is_active: !section.is_active })
        .eq('id', section.id);

      if (error) throw error;

      toast({ 
        title: 'সফল', 
        description: `সেকশন ${!section.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'} হয়েছে` 
      });
      fetchSections();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateSortOrder = async (sectionId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .update({ sort_order: newOrder })
        .eq('id', sectionId);

      if (error) throw error;
      fetchSections();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentSection = sections[index];
    const targetSection = sections[newIndex];

    // Swap sort orders
    updateSortOrder(currentSection.id, targetSection.sort_order);
    updateSortOrder(targetSection.id, currentSection.sort_order);
  };

  const renderSettingsEditor = () => {
    const sectionType = isCreating ? formData.section_type : editingSection?.section_type;
    if (!sectionType) return null;

    switch (sectionType) {
      case 'promo_banner':
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">ব্যানার সেটিংস</h4>
            <div>
              <Label>ব্যানার টাইটেল</Label>
              <Input
                value={formData.settings.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea
                value={formData.settings.description || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, description: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>বাটন টেক্সট</Label>
                <Input
                  value={formData.settings.button_text || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, button_text: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>বাটন লিংক</Label>
                <Input
                  value={formData.settings.button_link || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, button_link: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <Label>ব্যাজ টেক্সট</Label>
              <Input
                value={formData.settings.badge_text || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, badge_text: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>ব্যাকগ্রাউন্ড ইমেজ URL</Label>
              <Input
                value={formData.settings.background_image || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, background_image: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'flash_sale':
      case 'new_releases':
      case 'bestsellers':
      case 'recommended':
      case 'featured_products':
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">সেকশন সেটিংস</h4>
            <div>
              <Label>প্রোডাক্ট সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.limit || 10}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, limit: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>কলাম সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.columns || 5}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, columns: Number(e.target.value) }
                })}
              />
            </div>
            {sectionType === 'flash_sale' && (
              <div>
                <Label>মিনিমাম ডিসকাউন্ট (%)</Label>
                <Input
                  type="number"
                  value={formData.settings.min_discount || 30}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, min_discount: Number(e.target.value) }
                  })}
                />
              </div>
            )}
            <div>
              <Label>View All লিংক</Label>
              <Input
                value={formData.settings.view_all_link || '/shop'}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, view_all_link: e.target.value }
                })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.settings.show_ranking || false}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, show_ranking: checked }
                })}
              />
              <Label>র‍্যাংকিং দেখান</Label>
            </div>
          </div>
        );

      case 'category_products':
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">ক্যাটাগরি প্রোডাক্ট সেটিংস</h4>
            <div>
              <Label>ক্যাটাগরি নির্বাচন করুন</Label>
              <Select
                value={formData.settings.category_id || ''}
                onValueChange={(value) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, category_id: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>প্রোডাক্ট সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.limit || 10}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, limit: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>View All লিংক</Label>
              <Input
                value={formData.settings.view_all_link || '/shop'}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, view_all_link: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'writer_products':
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">লেখকের বই সেটিংস</h4>
            <div>
              <Label>লেখক নির্বাচন করুন</Label>
              <Select
                value={formData.settings.writer_id || ''}
                onValueChange={(value) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, writer_id: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="লেখক নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {writers.map(writer => (
                    <SelectItem key={writer.id} value={writer.id}>{writer.name_bn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>প্রোডাক্ট সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.limit || 10}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, limit: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>View All লিংক</Label>
              <Input
                value={formData.settings.view_all_link || '/authors'}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, view_all_link: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case 'selected_products':
        const selectedProducts: string[] = formData.settings.product_ids || [];
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">সিলেক্টেড প্রোডাক্ট সেটিংস</h4>
            <div>
              <Label>প্রোডাক্ট খুঁজুন</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="প্রোডাক্টের নাম লিখুন..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {products.length > 0 && productSearch.length >= 2 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {products.map(product => (
                  <label 
                    key={product.id} 
                    className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => {
                        const newIds = checked 
                          ? [...selectedProducts, product.id]
                          : selectedProducts.filter(id => id !== product.id);
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, product_ids: newIds }
                        });
                      }}
                    />
                    <span className="text-sm">{product.title_bn}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedProducts.length > 0 && (
              <div>
                <Label>নির্বাচিত প্রোডাক্ট ({selectedProducts.length})</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedProducts.length}টি প্রোডাক্ট নির্বাচন করা হয়েছে
                </p>
              </div>
            )}
          </div>
        );

      case 'category_grid':
        return (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h4 className="font-medium">ক্যাটাগরি সেটিংস</h4>
            <div>
              <Label>কলাম সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.columns || 4}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, columns: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>সর্বোচ্চ ক্যাটাগরি সংখ্যা</Label>
              <Input
                type="number"
                value={formData.settings.max_categories || 8}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, max_categories: Number(e.target.value) }
                })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">হোমপেজ সেকশন</h1>
            <p className="text-muted-foreground">হোমপেজের সেকশনগুলো ম্যানেজ করুন - আনলিমিটেড সেকশন যোগ করুন</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            নতুন সেকশন
          </Button>
        </div>

        {/* Sections List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : sections.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                কোন সেকশন নেই। নতুন সেকশন যোগ করুন।
              </div>
            ) : (
              <div className="divide-y">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`flex items-center justify-between p-4 ${!section.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === sections.length - 1}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {sectionTypeLabels[section.section_type] || section.section_type}
                        </p>
                        <p className="text-sm text-muted-foreground">{section.title_bn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(section)}
                        title={section.is_active ? 'ইনঅ্যাক্টিভ করুন' : 'অ্যাক্টিভ করুন'}
                      >
                        {section.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(section)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(section.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isCreating ? 'নতুন সেকশন যোগ করুন' : `সেকশন এডিট: ${editingSection && sectionTypeLabels[editingSection.section_type]}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isCreating && (
                <div>
                  <Label>সেকশন টাইপ</Label>
                  <Select
                    value={formData.section_type}
                    onValueChange={(value) => setFormData({ ...formData, section_type: value, settings: {} })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="সেকশন টাইপ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>টাইটেল (বাংলা)</Label>
                <Input
                  value={formData.title_bn}
                  onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Title (English)</Label>
                <Input
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                />
              </div>
              <div>
                <Label>সাবটাইটেল (বাংলা)</Label>
                <Input
                  value={formData.subtitle_bn}
                  onChange={(e) => setFormData({ ...formData, subtitle_bn: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>অ্যাক্টিভ</Label>
              </div>

              {renderSettingsEditor()}

              <Button type="submit" className="w-full">
                {isCreating ? 'সেকশন যোগ করুন' : 'আপডেট করুন'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">💡 সেকশন গাইড</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>• <strong>ফ্ল্যাশ সেল:</strong> ডিসকাউন্ট থাকা প্রোডাক্ট দেখায়</p>
                <p>• <strong>ক্যাটাগরি গ্রিড:</strong> সব প্যারেন্ট ক্যাটাগরি দেখায়</p>
                <p>• <strong>নতুন প্রকাশিত:</strong> সাম্প্রতিক যোগ করা প্রোডাক্ট</p>
                <p>• <strong>বেস্টসেলার:</strong> ফিচার্ড মার্ক করা প্রোডাক্ট</p>
              </div>
              <div className="space-y-2">
                <p>• <strong>প্রমো ব্যানার:</strong> কাস্টম প্রমোশনাল ব্যানার</p>
                <p>• <strong>সুপারিশকৃত:</strong> সাধারণ প্রোডাক্ট সাজেশন</p>
                <p>• <strong>ফিচার্ড প্রোডাক্ট:</strong> বিশেষ প্রোডাক্ট হাইলাইট</p>
                <p>• <strong>কাস্টম গ্রিড:</strong> নিজের মতো প্রোডাক্ট সাজান</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHomepage;
