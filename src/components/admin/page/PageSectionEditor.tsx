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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { SectionImageUpload } from './SectionImageUpload';
import { DynamicLinkSelector } from './DynamicLinkSelector';
import { MultiImageUpload } from './MultiImageUpload';

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
  { value: 'product_grid', label: 'প্রোডাক্ট গ্রিড', description: 'বই প্রোডাক্ট লিস্ট' },
  { value: 'universal_product_grid', label: 'ইউনিভার্সাল প্রোডাক্ট', description: 'সাধারণ প্রোডাক্ট গ্রিড' },
  { value: 'category_grid', label: 'ক্যাটাগরি গ্রিড', description: 'ক্যাটাগরি কার্ড গ্রিড' },
  { value: 'video_embed', label: 'ভিডিও এম্বেড', description: 'YouTube/Vimeo ভিডিও' },
  { value: 'testimonials', label: 'টেস্টিমোনিয়াল', description: 'কাস্টমার রিভিউ/ফিডব্যাক' },
  { value: 'faq', label: 'FAQ', description: 'প্রশ্ন ও উত্তর অ্যাকর্ডিয়ন' },
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

  // Fetch universal categories
  const { data: universalCategories } = useQuery({
    queryKey: ['universal-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('universal_categories').select('id, name_bn, product_type').eq('is_active', true);
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

  // FAQ Items Management
  const getFaqItems = () => (sectionData.content?.items as Array<{ question_bn: string; answer_bn: string }>) || [];
  const addFaqItem = () => {
    updateContent('items', [...getFaqItems(), { question_bn: '', answer_bn: '' }]);
  };
  const updateFaqItem = (index: number, field: string, value: string) => {
    const items = [...getFaqItems()];
    items[index] = { ...items[index], [field]: value };
    updateContent('items', items);
  };
  const removeFaqItem = (index: number) => {
    const items = getFaqItems().filter((_, i) => i !== index);
    updateContent('items', items);
  };

  // Testimonial Items Management
  const getTestimonialItems = () => (sectionData.content?.items as Array<{ name: string; text: string; image?: string; role?: string }>) || [];
  const addTestimonialItem = () => {
    updateContent('items', [...getTestimonialItems(), { name: '', text: '', image: '', role: '' }]);
  };
  const updateTestimonialItem = (index: number, field: string, value: string) => {
    const items = [...getTestimonialItems()];
    items[index] = { ...items[index], [field]: value };
    updateContent('items', items);
  };
  const removeTestimonialItem = (index: number) => {
    const items = getTestimonialItems().filter((_, i) => i !== index);
    updateContent('items', items);
  };

  // Feature Cards Management
  const getFeatureItems = () => (sectionData.content?.items as Array<{ icon: string; title: string; description: string }>) || [];
  const addFeatureItem = () => {
    updateContent('items', [...getFeatureItems(), { icon: '📚', title: '', description: '' }]);
  };
  const updateFeatureItem = (index: number, field: string, value: string) => {
    const items = [...getFeatureItems()];
    items[index] = { ...items[index], [field]: value };
    updateContent('items', items);
  };
  const removeFeatureItem = (index: number) => {
    const items = getFeatureItems().filter((_, i) => i !== index);
    updateContent('items', items);
  };

  const renderContentEditor = () => {
    const type = sectionData.section_type;

    switch (type) {
      case 'hero_banner':
        return (
          <div className="space-y-4">
            <SectionImageUpload
              value={(sectionData.content?.background_image as string) || ''}
              onChange={(url) => updateContent('background_image', url)}
              label="ব্যাকগ্রাউন্ড ইমেজ"
              folder="page-hero"
              aspectRatio="21/9"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>হেডিং (বাংলা)</Label>
                <Input
                  value={(sectionData.content?.heading_bn as string) || ''}
                  onChange={(e) => updateContent('heading_bn', e.target.value)}
                  placeholder="স্বাগতম"
                />
              </div>
              <div className="space-y-2">
                <Label>হেডিং (ইংরেজি)</Label>
                <Input
                  value={(sectionData.content?.heading_en as string) || ''}
                  onChange={(e) => updateContent('heading_en', e.target.value)}
                  placeholder="Welcome"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>সাবহেডিং (বাংলা)</Label>
              <Textarea
                value={(sectionData.content?.subheading_bn as string) || ''}
                onChange={(e) => updateContent('subheading_bn', e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>বাটন টেক্সট</Label>
                <Input
                  value={(sectionData.content?.button_text as string) || ''}
                  onChange={(e) => updateContent('button_text', e.target.value)}
                  placeholder="এখনই দেখুন"
                />
              </div>
              <DynamicLinkSelector
                value={(sectionData.content?.button_link as string) || ''}
                onChange={(url) => updateContent('button_link', url)}
                label="বাটন লিংক"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(sectionData.settings?.overlay as boolean) !== false}
                onCheckedChange={(v) => updateSettings('overlay', v)}
              />
              <Label>ডার্ক ওভারলে</Label>
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
            <MultiImageUpload
              value={(sectionData.content?.images as string[]) || []}
              onChange={(urls) => updateContent('images', urls)}
              label="গ্যালারি ইমেজ"
              folder="page-gallery"
              maxImages={12}
            />
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="5">৫ কলাম</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>লেআউট</Label>
                <Select
                  value={(sectionData.settings?.layout as string) || 'grid'}
                  onValueChange={(v) => updateSettings('layout', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">গ্রিড</SelectItem>
                    <SelectItem value="masonry">ম্যাসনরি</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'product_grid':
        return (
          <div className="space-y-4">
            {/* Display Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ডিসপ্লে মোড</Label>
                <Select
                  value={(sectionData.settings?.display_mode as string) || 'grid'}
                  onValueChange={(v) => updateSettings('display_mode', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">গ্রিড</SelectItem>
                    <SelectItem value="carousel">ক্যারোসেল/স্লাইডার</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ক্যাটাগরি</Label>
                <Select
                  value={(sectionData.settings?.category_id as string) || ''}
                  onValueChange={(v) => updateSettings('category_id', v === 'all' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ক্যাটাগরি বাছুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব প্রোডাক্ট</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_bn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Grid Configuration */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>কলাম সংখ্যা (২-৮)</Label>
                <Select
                  value={String((sectionData.settings?.columns as number) || 4)}
                  onValueChange={(v) => updateSettings('columns', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">২ কলাম</SelectItem>
                    <SelectItem value="3">৩ কলাম</SelectItem>
                    <SelectItem value="4">৪ কলাম</SelectItem>
                    <SelectItem value="5">৫ কলাম</SelectItem>
                    <SelectItem value="6">৬ কলাম</SelectItem>
                    <SelectItem value="7">৭ কলাম</SelectItem>
                    <SelectItem value="8">৮ কলাম</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>রো সংখ্যা (২-৮)</Label>
                <Select
                  value={String((sectionData.settings?.rows as number) || 2)}
                  onValueChange={(v) => updateSettings('rows', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">১ রো</SelectItem>
                    <SelectItem value="2">২ রো</SelectItem>
                    <SelectItem value="3">৩ রো</SelectItem>
                    <SelectItem value="4">৪ রো</SelectItem>
                    <SelectItem value="5">৫ রো</SelectItem>
                    <SelectItem value="6">৬ রো</SelectItem>
                    <SelectItem value="7">৭ রো</SelectItem>
                    <SelectItem value="8">৮ রো</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>প্রোডাক্ট সংখ্যা</Label>
                <Input
                  type="number"
                  min={1}
                  max={64}
                  value={(sectionData.settings?.limit as number) || 8}
                  onChange={(e) => updateSettings('limit', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            {/* Sorting & Filtering */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>সর্টিং</Label>
                <Select
                  value={(sectionData.settings?.sort_by as string) || 'latest'}
                  onValueChange={(v) => updateSettings('sort_by', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">সর্বশেষ</SelectItem>
                    <SelectItem value="price_low">মূল্য (কম থেকে বেশি)</SelectItem>
                    <SelectItem value="price_high">মূল্য (বেশি থেকে কম)</SelectItem>
                    <SelectItem value="discount">সর্বোচ্চ ছাড়</SelectItem>
                    <SelectItem value="popular">জনপ্রিয়</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ফিল্টার</Label>
                <Select
                  value={(sectionData.settings?.filter as string) || 'all'}
                  onValueChange={(v) => updateSettings('filter', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব প্রোডাক্ট</SelectItem>
                    <SelectItem value="featured">ফিচার্ড</SelectItem>
                    <SelectItem value="discount">ছাড় আছে</SelectItem>
                    <SelectItem value="preorder">প্রি-অর্ডার</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DynamicLinkSelector
              value={(sectionData.settings?.view_all_link as string) || ''}
              onChange={(url) => updateSettings('view_all_link', url)}
              label="সব দেখুন লিংক"
            />
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={(sectionData.settings?.show_cart_button as boolean) !== false}
                  onCheckedChange={(v) => updateSettings('show_cart_button', v)}
                />
                <Label>কার্ট বাটন দেখান</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={(sectionData.settings?.show_wishlist_button as boolean) !== false}
                  onCheckedChange={(v) => updateSettings('show_wishlist_button', v)}
                />
                <Label>উইশলিস্ট বাটন দেখান</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(sectionData.settings?.show_discount as boolean) !== false}
                onCheckedChange={(v) => updateSettings('show_discount', v)}
              />
              <Label>ছাড় ব্যাজ দেখান</Label>
            </div>
          </div>
        );

      case 'universal_product_grid':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>প্রোডাক্ট টাইপ</Label>
              <Select
                value={(sectionData.settings?.product_type as string) || ''}
                onValueChange={(v) => updateSettings('product_type', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="টাইপ বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব টাইপ</SelectItem>
                  <SelectItem value="electronics">ইলেক্ট্রনিক্স</SelectItem>
                  <SelectItem value="clothing">পোশাক</SelectItem>
                  <SelectItem value="grocery">গ্রোসারি</SelectItem>
                  <SelectItem value="cosmetics">কসমেটিক্স</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ক্যাটাগরি</Label>
              <Select
                value={(sectionData.settings?.category_id as string) || ''}
                onValueChange={(v) => updateSettings('category_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ক্যাটাগরি বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                  {universalCategories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name_bn} ({cat.product_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>প্রোডাক্ট সংখ্যা</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
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
                    <SelectItem value="2">২ কলাম</SelectItem>
                    <SelectItem value="3">৩ কলাম</SelectItem>
                    <SelectItem value="4">৪ কলাম</SelectItem>
                    <SelectItem value="5">৫ কলাম</SelectItem>
                    <SelectItem value="6">৬ কলাম</SelectItem>
                    <SelectItem value="7">৭ কলাম</SelectItem>
                    <SelectItem value="8">৮ কলাম</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>রো সংখ্যা (২-৮)</Label>
                <Select
                  value={String((sectionData.settings?.rows as number) || 2)}
                  onValueChange={(v) => updateSettings('rows', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">১ রো</SelectItem>
                    <SelectItem value="2">২ রো</SelectItem>
                    <SelectItem value="3">৩ রো</SelectItem>
                    <SelectItem value="4">৪ রো</SelectItem>
                    <SelectItem value="5">৫ রো</SelectItem>
                    <SelectItem value="6">৬ রো</SelectItem>
                    <SelectItem value="7">৭ রো</SelectItem>
                    <SelectItem value="8">৮ রো</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Display Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ডিসপ্লে মোড</Label>
                <Select
                  value={(sectionData.settings?.display_mode as string) || 'grid'}
                  onValueChange={(v) => updateSettings('display_mode', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">গ্রিড</SelectItem>
                    <SelectItem value="carousel">ক্যারোসেল/স্লাইডার</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>সর্টিং</Label>
                <Select
                  value={(sectionData.settings?.sort_by as string) || 'latest'}
                  onValueChange={(v) => updateSettings('sort_by', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">সর্বশেষ</SelectItem>
                    <SelectItem value="price_low">মূল্য (কম থেকে বেশি)</SelectItem>
                    <SelectItem value="price_high">মূল্য (বেশি থেকে কম)</SelectItem>
                    <SelectItem value="discount">সর্বোচ্চ ছাড়</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DynamicLinkSelector
              value={(sectionData.settings?.view_all_link as string) || ''}
              onChange={(url) => updateSettings('view_all_link', url)}
              label="সব দেখুন লিংক"
            />
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={(sectionData.settings?.show_cart_button as boolean) !== false}
                  onCheckedChange={(v) => updateSettings('show_cart_button', v)}
                />
                <Label>কার্ট বাটন দেখান</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={(sectionData.settings?.show_wishlist_button as boolean) !== false}
                  onCheckedChange={(v) => updateSettings('show_wishlist_button', v)}
                />
                <Label>উইশলিস্ট বাটন দেখান</Label>
              </div>
            </div>
          </div>
        );

      case 'category_grid':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>কলাম সংখ্যা</Label>
              <Select
                value={String((sectionData.settings?.columns as number) || 6)}
                onValueChange={(v) => updateSettings('columns', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">৪ কলাম</SelectItem>
                  <SelectItem value="5">৫ কলাম</SelectItem>
                  <SelectItem value="6">৬ কলাম</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(sectionData.settings?.show_image as boolean) !== false}
                onCheckedChange={(v) => updateSettings('show_image', v)}
              />
              <Label>ক্যাটাগরি ইমেজ দেখান</Label>
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
            <SectionImageUpload
              value={(sectionData.content?.thumbnail as string) || ''}
              onChange={(url) => updateContent('thumbnail', url)}
              label="থাম্বনেইল (ঐচ্ছিক)"
              folder="page-video"
            />
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
            <div className="flex items-center justify-between">
              <Label>FAQ আইটেম</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFaqItem}>
                <Plus className="h-4 w-4 mr-1" />
                যোগ করুন
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {getFaqItems().map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.question_bn}
                          onChange={(e) => updateFaqItem(index, 'question_bn', e.target.value)}
                          placeholder="প্রশ্ন"
                        />
                        <Textarea
                          value={item.answer_bn}
                          onChange={(e) => updateFaqItem(index, 'answer_bn', e.target.value)}
                          placeholder="উত্তর"
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFaqItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFaqItems().length === 0 && (
                <p className="text-center text-muted-foreground py-4">কোনো FAQ নেই</p>
              )}
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>টেস্টিমোনিয়াল</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTestimonialItem}>
                <Plus className="h-4 w-4 mr-1" />
                যোগ করুন
              </Button>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {getTestimonialItems().map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex gap-3">
                      <div className="w-20">
                        <SectionImageUpload
                          value={item.image || ''}
                          onChange={(url) => updateTestimonialItem(index, 'image', url)}
                          label=""
                          folder="testimonials"
                          aspectRatio="1/1"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateTestimonialItem(index, 'name', e.target.value)}
                            placeholder="নাম"
                          />
                          <Input
                            value={item.role || ''}
                            onChange={(e) => updateTestimonialItem(index, 'role', e.target.value)}
                            placeholder="পদবি"
                          />
                        </div>
                        <Textarea
                          value={item.text}
                          onChange={(e) => updateTestimonialItem(index, 'text', e.target.value)}
                          placeholder="মন্তব্য"
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTestimonialItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getTestimonialItems().length === 0 && (
                <p className="text-center text-muted-foreground py-4">কোনো টেস্টিমোনিয়াল নেই</p>
              )}
            </div>
          </div>
        );

      case 'feature_cards':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>ফিচার কার্ড</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFeatureItem}>
                <Plus className="h-4 w-4 mr-1" />
                যোগ করুন
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {getFeatureItems().map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">আইকন</Label>
                        <Input
                          value={item.icon}
                          onChange={(e) => updateFeatureItem(index, 'icon', e.target.value)}
                          placeholder="📚"
                          className="w-16 text-center text-xl"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.title}
                          onChange={(e) => updateFeatureItem(index, 'title', e.target.value)}
                          placeholder="শিরোনাম"
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateFeatureItem(index, 'description', e.target.value)}
                          placeholder="বিবরণ"
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeatureItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFeatureItems().length === 0 && (
                <p className="text-center text-muted-foreground py-4">কোনো ফিচার নেই</p>
              )}
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

      case 'cta_banner':
        return (
          <div className="space-y-4">
            <SectionImageUpload
              value={(sectionData.content?.background_image as string) || ''}
              onChange={(url) => updateContent('background_image', url)}
              label="ব্যাকগ্রাউন্ড ইমেজ (ঐচ্ছিক)"
              folder="page-cta"
              aspectRatio="21/6"
            />
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
              <DynamicLinkSelector
                value={(sectionData.content?.button_link as string) || ''}
                onChange={(url) => updateContent('button_link', url)}
                label="বাটন লিংক"
              />
            </div>
            <div className="space-y-2">
              <Label>ব্যাকগ্রাউন্ড কালার</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={(sectionData.settings?.bg_color as string) || '#3b82f6'}
                  onChange={(e) => updateSettings('bg_color', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={(sectionData.settings?.bg_color as string) || '#3b82f6'}
                  onChange={(e) => updateSettings('bg_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        );

      case 'flash_sale':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>মিনিমাম ডিসকাউন্ট %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={(sectionData.settings?.min_discount as number) || 20}
                onChange={(e) => updateSettings('min_discount', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>প্রোডাক্ট সংখ্যা</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={(sectionData.settings?.limit as number) || 8}
                onChange={(e) => updateSettings('limit', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>শেষ তারিখ (কাউন্টডাউন)</Label>
              <Input
                type="datetime-local"
                value={(sectionData.settings?.end_date as string) || ''}
                onChange={(e) => updateSettings('end_date', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(sectionData.settings?.show_countdown as boolean) !== false}
                onCheckedChange={(v) => updateSettings('show_countdown', v)}
              />
              <Label>কাউন্টডাউন দেখান</Label>
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
                min={10}
                max={200}
                value={(sectionData.settings?.height as number) || 40}
                onChange={(e) => updateSettings('height', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'newsletter':
      case 'trust_badges':
      case 'divider':
        return (
          <div className="text-center py-8 text-muted-foreground">
            এই সেকশনের জন্য অতিরিক্ত কন্টেন্ট সেটিংস নেই
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

                <div className="space-y-2">
                  <Label>কন্টেইনার প্রস্থ</Label>
                  <Select
                    value={(sectionData.settings?.container as string) || 'default'}
                    onValueChange={(v) => updateSettings('container', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">ডিফল্ট</SelectItem>
                      <SelectItem value="full">ফুল উইডথ</SelectItem>
                      <SelectItem value="narrow">ন্যারো</SelectItem>
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
