import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageSection {
  id: string;
  page_id: string;
  section_type: string;
  title_bn: string | null;
  title_en: string | null;
  subtitle_bn: string | null;
  subtitle_en: string | null;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

interface PageSectionEditorProps {
  section: PageSection | null;
  onSave: (section: Partial<PageSection>) => void;
  onClose: () => void;
}

const sectionTypes = [
  { value: 'hero_banner', label: 'হিরো ব্যানার', description: 'বড় ইমেজ/ভিডিও সহ হেডার সেকশন' },
  { value: 'text_content', label: 'টেক্সট কন্টেন্ট', description: 'রিচ টেক্সট এডিটর কন্টেন্ট' },
  { value: 'image_gallery', label: 'ইমেজ গ্যালারি', description: 'মাল্টিপল ইমেজ গ্রিড/স্লাইডার' },
  { value: 'product_grid', label: 'প্রোডাক্ট গ্রিড', description: 'প্রোডাক্ট লিস্ট/গ্রিড' },
  { value: 'category_grid', label: 'ক্যাটাগরি গ্রিড', description: 'ক্যাটাগরি কার্ড গ্রিড' },
  { value: 'video_embed', label: 'ভিডিও এম্বেড', description: 'YouTube/Vimeo ভিডিও' },
  { value: 'testimonials', label: 'টেস্টিমোনিয়াল', description: 'কাস্টমার রিভিউ/ফিডব্যাক' },
  { value: 'faq', label: 'FAQ', description: 'প্রশ্ন ও উত্তর অ্যাকর্ডিয়ন' },
  { value: 'contact_form', label: 'কন্টাক্ট ফর্ম', description: 'যোগাযোগ ফর্ম' },
  { value: 'newsletter', label: 'নিউজলেটার', description: 'ইমেইল সাবস্ক্রিপশন' },
  { value: 'feature_cards', label: 'ফিচার কার্ড', description: 'আইকন সহ ফিচার লিস্ট' },
  { value: 'cta_banner', label: 'CTA ব্যানার', description: 'কল টু অ্যাকশন সেকশন' },
  { value: 'html_embed', label: 'HTML এম্বেড', description: 'কাস্টম HTML কোড' },
  { value: 'flash_sale', label: 'ফ্ল্যাশ সেল', description: 'টাইমার সহ সেল সেকশন' },
  { value: 'trust_badges', label: 'ট্রাস্ট ব্যাজ', description: 'ট্রাস্ট সিম্বল/ব্যাজ' },
  { value: 'divider', label: 'ডিভাইডার', description: 'সেকশন বিভাজক' },
  { value: 'spacer', label: 'স্পেসার', description: 'ভার্টিকাল স্পেস' },
];

export const PageSectionEditor = ({ section, onSave, onClose }: PageSectionEditorProps) => {
  const [sectionData, setSectionData] = useState<Partial<PageSection>>({
    section_type: 'text_content',
    title_bn: '',
    title_en: '',
    subtitle_bn: '',
    subtitle_en: '',
    content: {},
    settings: {},
    is_active: true,
  });

  // Fetch categories for product/category grid
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_bn, name_en').eq('is_active', true);
      return data || [];
    },
  });

  useEffect(() => {
    if (section) {
      setSectionData({
        id: section.id,
        section_type: section.section_type,
        title_bn: section.title_bn || '',
        title_en: section.title_en || '',
        subtitle_bn: section.subtitle_bn || '',
        subtitle_en: section.subtitle_en || '',
        content: section.content || {},
        settings: section.settings || {},
        is_active: section.is_active,
      });
    }
  }, [section]);

  const updateContent = (key: string, value: unknown) => {
    setSectionData((prev) => ({
      ...prev,
      content: { ...prev.content, [key]: value },
    }));
  };

  const updateSettings = (key: string, value: unknown) => {
    setSectionData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  const renderContentEditor = () => {
    const type = sectionData.section_type;

    switch (type) {
      case 'hero_banner':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ব্যাকগ্রাউন্ড ইমেজ URL</Label>
              <Input
                value={(sectionData.content?.background_image as string) || ''}
                onChange={(e) => updateContent('background_image', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>হেডিং (বাংলা)</Label>
              <Input
                value={(sectionData.content?.heading_bn as string) || ''}
                onChange={(e) => updateContent('heading_bn', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>বাটন টেক্সট</Label>
              <Input
                value={(sectionData.content?.button_text as string) || ''}
                onChange={(e) => updateContent('button_text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>বাটন লিংক</Label>
              <Input
                value={(sectionData.content?.button_link as string) || ''}
                onChange={(e) => updateContent('button_link', e.target.value)}
              />
            </div>
          </div>
        );

      case 'text_content':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>কন্টেন্ট (বাংলা)</Label>
              <Textarea
                value={(sectionData.content?.content_bn as string) || ''}
                onChange={(e) => updateContent('content_bn', e.target.value)}
                rows={8}
                placeholder="HTML সাপোর্টেড..."
              />
            </div>
            <div className="space-y-2">
              <Label>কন্টেন্ট (ইংরেজি)</Label>
              <Textarea
                value={(sectionData.content?.content_en as string) || ''}
                onChange={(e) => updateContent('content_en', e.target.value)}
                rows={8}
              />
            </div>
          </div>
        );

      case 'image_gallery':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ইমেজ URLs (প্রতি লাইনে একটি)</Label>
              <Textarea
                value={((sectionData.content?.images as string[]) || []).join('\n')}
                onChange={(e) => updateContent('images', e.target.value.split('\n').filter(Boolean))}
                rows={6}
                placeholder="https://image1.jpg&#10;https://image2.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>কলাম সংখ্যা</Label>
              <Select
                value={String((sectionData.settings?.columns as number) || 3)}
                onValueChange={(v) => updateSettings('columns', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">২ কলাম</SelectItem>
                  <SelectItem value="3">৩ কলাম</SelectItem>
                  <SelectItem value="4">৪ কলাম</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'product_grid':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ক্যাটাগরি</Label>
              <Select
                value={(sectionData.settings?.category_id as string) || ''}
                onValueChange={(v) => updateSettings('category_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ক্যাটাগরি বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">সব প্রোডাক্ট</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>প্রোডাক্ট সংখ্যা</Label>
              <Input
                type="number"
                value={(sectionData.settings?.limit as number) || 8}
                onChange={(e) => updateSettings('limit', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>কলাম সংখ্যা</Label>
              <Select
                value={String((sectionData.settings?.columns as number) || 4)}
                onValueChange={(v) => updateSettings('columns', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">৩ কলাম</SelectItem>
                  <SelectItem value="4">৪ কলাম</SelectItem>
                  <SelectItem value="5">৫ কলাম</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'video_embed':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ভিডিও URL (YouTube/Vimeo)</Label>
              <Input
                value={(sectionData.content?.video_url as string) || ''}
                onChange={(e) => updateContent('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(sectionData.settings?.autoplay as boolean) || false}
                onCheckedChange={(v) => updateSettings('autoplay', v)}
              />
              <Label>অটোপ্লে</Label>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>FAQ Items (JSON ফরম্যাট)</Label>
              <Textarea
                value={JSON.stringify((sectionData.content?.items as unknown[]) || [], null, 2)}
                onChange={(e) => {
                  try {
                    updateContent('items', JSON.parse(e.target.value));
                  } catch {
                    // ignore
                  }
                }}
                rows={10}
                placeholder={`[
  {"question_bn": "প্রশ্ন?", "answer_bn": "উত্তর"}
]`}
              />
            </div>
          </div>
        );

      case 'cta_banner':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>হেডিং</Label>
              <Input
                value={(sectionData.content?.heading as string) || ''}
                onChange={(e) => updateContent('heading', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>বিবরণ</Label>
              <Textarea
                value={(sectionData.content?.description as string) || ''}
                onChange={(e) => updateContent('description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>বাটন টেক্সট</Label>
                <Input
                  value={(sectionData.content?.button_text as string) || ''}
                  onChange={(e) => updateContent('button_text', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>বাটন লিংক</Label>
                <Input
                  value={(sectionData.content?.button_link as string) || ''}
                  onChange={(e) => updateContent('button_link', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ব্যাকগ্রাউন্ড কালার</Label>
              <Input
                type="color"
                value={(sectionData.settings?.bg_color as string) || '#3b82f6'}
                onChange={(e) => updateSettings('bg_color', e.target.value)}
              />
            </div>
          </div>
        );

      case 'html_embed':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>HTML কোড</Label>
              <Textarea
                value={(sectionData.content?.html as string) || ''}
                onChange={(e) => updateContent('html', e.target.value)}
                rows={12}
                placeholder="<div>...</div>"
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>উচ্চতা (px)</Label>
              <Input
                type="number"
                value={(sectionData.settings?.height as number) || 40}
                onChange={(e) => updateSettings('height', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            এই সেকশন টাইপের জন্য কন্টেন্ট এডিটর শীঘ্রই আসছে
          </div>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{section ? 'সেকশন এডিট করুন' : 'নতুন সেকশন যোগ করুন'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            <Tabs defaultValue="type">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="type">টাইপ</TabsTrigger>
                <TabsTrigger value="content">কন্টেন্ট</TabsTrigger>
                <TabsTrigger value="settings">সেটিংস</TabsTrigger>
              </TabsList>

              <TabsContent value="type" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sectionTypes.map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setSectionData({ ...sectionData, section_type: type.value })}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-all
                        ${sectionData.section_type === type.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                        }
                      `}
                    >
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>শিরোনাম (বাংলা)</Label>
                    <Input
                      value={sectionData.title_bn || ''}
                      onChange={(e) => setSectionData({ ...sectionData, title_bn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>শিরোনাম (ইংরেজি)</Label>
                    <Input
                      value={sectionData.title_en || ''}
                      onChange={(e) => setSectionData({ ...sectionData, title_en: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>সাবটাইটেল (বাংলা)</Label>
                    <Input
                      value={sectionData.subtitle_bn || ''}
                      onChange={(e) => setSectionData({ ...sectionData, subtitle_bn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>সাবটাইটেল (ইংরেজি)</Label>
                    <Input
                      value={sectionData.subtitle_en || ''}
                      onChange={(e) => setSectionData({ ...sectionData, subtitle_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">{renderContentEditor()}</div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>সেকশন একটিভ</Label>
                    <p className="text-sm text-muted-foreground">এই সেকশন পেজে দেখাবে</p>
                  </div>
                  <Switch
                    checked={sectionData.is_active}
                    onCheckedChange={(checked) => setSectionData({ ...sectionData, is_active: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ব্যাকগ্রাউন্ড কালার</Label>
                  <Input
                    value={(sectionData.settings?.background as string) || ''}
                    onChange={(e) => updateSettings('background', e.target.value)}
                    placeholder="transparent, #ffffff, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label>প্যাডিং (উপর-নীচ)</Label>
                  <Select
                    value={String((sectionData.settings?.padding as string) || 'normal')}
                    onValueChange={(v) => updateSettings('padding', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোনো প্যাডিং নেই</SelectItem>
                      <SelectItem value="small">ছোট</SelectItem>
                      <SelectItem value="normal">স্বাভাবিক</SelectItem>
                      <SelectItem value="large">বড়</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button onClick={() => onSave(sectionData)}>সেভ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
