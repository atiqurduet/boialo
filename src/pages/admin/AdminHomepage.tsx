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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Pencil, Eye, EyeOff, Settings2 } from 'lucide-react';

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
  new_releases: '🆕 নতুন প্রকাশিত',
  bestsellers: '🏆 বেস্টসেলার',
  promo_banner: '🎯 প্রমো ব্যানার',
  recommended: '💡 সুপারিশকৃত',
};

const AdminHomepage = () => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title_bn: '',
    title_en: '',
    subtitle_bn: '',
    is_active: true,
    settings: {} as any,
  });

  useEffect(() => {
    fetchSections();
  }, []);

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

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setFormData({
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
    if (!editingSection) return;

    try {
      const { error } = await supabase
        .from('homepage_sections')
        .update({
          title_bn: formData.title_bn,
          title_en: formData.title_en || null,
          subtitle_bn: formData.subtitle_bn || null,
          is_active: formData.is_active,
          settings: formData.settings,
        })
        .eq('id', editingSection.id);

      if (error) throw error;

      toast({ title: 'সফল', description: 'সেকশন আপডেট হয়েছে' });
      setDialogOpen(false);
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
    if (!editingSection) return null;

    switch (editingSection.section_type) {
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
          </div>
        );

      case 'flash_sale':
      case 'new_releases':
      case 'bestsellers':
      case 'recommended':
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
            {editingSection.section_type === 'flash_sale' && (
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">হোমপেজ সেকশন</h1>
          <p className="text-muted-foreground">হোমপেজের সেকশনগুলো ম্যানেজ করুন</p>
        </div>

        {/* Sections List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : sections.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন সেকশন নেই</div>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                সেকশন এডিট: {editingSection && sectionTypeLabels[editingSection.section_type]}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                আপডেট করুন
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">💡 সেকশন গাইড</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>ফ্ল্যাশ সেল:</strong> ডিসকাউন্ট থাকা প্রোডাক্ট দেখায়</p>
              <p>• <strong>ক্যাটাগরি গ্রিড:</strong> সব প্যারেন্ট ক্যাটাগরি দেখায়</p>
              <p>• <strong>নতুন প্রকাশিত:</strong> সাম্প্রতিক যোগ করা প্রোডাক্ট</p>
              <p>• <strong>বেস্টসেলার:</strong> ফিচার্ড মার্ক করা প্রোডাক্ট</p>
              <p>• <strong>প্রমো ব্যানার:</strong> কাস্টম প্রমোশনাল ব্যানার</p>
              <p>• <strong>সুপারিশকৃত:</strong> সাধারণ প্রোডাক্ট সাজেশন</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHomepage;
