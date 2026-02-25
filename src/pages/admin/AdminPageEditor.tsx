import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Eye, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PageSectionEditor } from '@/components/admin/page/PageSectionEditor';
import { PageSectionList } from '@/components/admin/page/PageSectionList';
import { SectionImageUpload } from '@/components/admin/page/SectionImageUpload';
import type { Json } from '@/integrations/supabase/types';

interface PageData {
  id?: string;
  title_bn: string;
  title_en: string;
  slug: string;
  description_bn: string;
  description_en: string;
  meta_title: string;
  meta_description: string;
  featured_image: string;
  status: string;
  is_homepage: boolean;
  // New fields for private/coupon pages
  page_type: string;
  is_private: boolean;
  access_code: string;
  max_usage: number | null;
  usage_per_user: number;
  start_date: string;
  end_date: string;
  linked_offer_id: string;
  linked_coupon_id: string;
  // Product/Category selection for coupon pages
  selected_product_ids: string[];
  selected_category_ids: string[];
  show_in_offers_page: boolean;
}

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

const defaultPageData: PageData = {
  title_bn: '',
  title_en: '',
  slug: '',
  description_bn: '',
  description_en: '',
  meta_title: '',
  meta_description: '',
  featured_image: '',
  status: 'draft',
  is_homepage: false,
  page_type: 'landing',
  is_private: false,
  access_code: '',
  max_usage: null,
  usage_per_user: 1,
  start_date: '',
  end_date: '',
  linked_offer_id: '',
  linked_coupon_id: '',
  selected_product_ids: [],
  selected_category_ids: [],
  show_in_offers_page: false,
};

const AdminPageEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [pageData, setPageData] = useState<PageData>(defaultPageData);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [showSectionEditor, setShowSectionEditor] = useState(false);

  // Fetch existing page data
  const { data: existingPage, isLoading } = useQuery({
    queryKey: ['admin-page', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Fetch page sections
  const { data: existingSections } = useQuery({
    queryKey: ['admin-page-sections', id],
    queryFn: async () => {
      if (isNew) return [];
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PageSection[];
    },
    enabled: !isNew,
  });

  // Fetch categories for coupon page selection
  const { data: allCategories } = useQuery({
    queryKey: ['all-categories-for-pages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_bn')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch products for coupon page selection
  const { data: allProducts } = useQuery({
    queryKey: ['all-products-for-pages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title_bn, slug')
        .eq('is_active', true)
        .order('title_bn')
        .limit(500);
      return data || [];
    },
  });

  useEffect(() => {
    if (existingPage) {
      setPageData({
        id: existingPage.id,
        title_bn: existingPage.title_bn || '',
        title_en: existingPage.title_en || '',
        slug: existingPage.slug || '',
        description_bn: existingPage.description_bn || '',
        description_en: existingPage.description_en || '',
        meta_title: existingPage.meta_title || '',
        meta_description: existingPage.meta_description || '',
        featured_image: existingPage.featured_image || '',
        status: existingPage.status || 'draft',
        is_homepage: existingPage.is_homepage || false,
        page_type: (existingPage as any).page_type || 'landing',
        is_private: (existingPage as any).is_private || false,
        access_code: (existingPage as any).access_code || '',
        max_usage: (existingPage as any).max_usage || null,
        usage_per_user: (existingPage as any).usage_per_user || 1,
        start_date: (existingPage as any).start_date ? new Date((existingPage as any).start_date).toISOString().slice(0, 16) : '',
        end_date: (existingPage as any).end_date ? new Date((existingPage as any).end_date).toISOString().slice(0, 16) : '',
        linked_offer_id: (existingPage as any).linked_offer_id || '',
        linked_coupon_id: (existingPage as any).linked_coupon_id || '',
        selected_product_ids: (existingPage as any).selected_product_ids || [],
        selected_category_ids: (existingPage as any).selected_category_ids || [],
        show_in_offers_page: (existingPage as any).show_in_offers_page ?? false,
      });
    }
  }, [existingPage]);

  useEffect(() => {
    if (existingSections) {
      setSections(existingSections);
    }
  }, [existingSections]);

  // Auto-generate slug from Bengali title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\u0980-\u09FF\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Save page mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pageData.title_bn || !pageData.slug) {
        throw new Error('শিরোনাম এবং স্লাগ আবশ্যক');
      }

      const pagePayload = {
        title_bn: pageData.title_bn,
        title_en: pageData.title_en || null,
        slug: pageData.slug,
        description_bn: pageData.description_bn || null,
        description_en: pageData.description_en || null,
        meta_title: pageData.meta_title || null,
        meta_description: pageData.meta_description || null,
        featured_image: pageData.featured_image || null,
        status: pageData.status,
        is_homepage: pageData.is_homepage,
        page_type: pageData.page_type,
        is_private: pageData.is_private,
        access_code: pageData.access_code || null,
        max_usage: pageData.max_usage,
        usage_per_user: pageData.usage_per_user,
        start_date: pageData.start_date ? new Date(pageData.start_date).toISOString() : null,
        end_date: pageData.end_date ? new Date(pageData.end_date).toISOString() : null,
        linked_offer_id: pageData.linked_offer_id || null,
        linked_coupon_id: pageData.linked_coupon_id || null,
        selected_product_ids: pageData.selected_product_ids,
        selected_category_ids: pageData.selected_category_ids,
        show_in_offers_page: pageData.show_in_offers_page,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('pages')
          .insert(pagePayload)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from('pages')
          .update(pagePayload)
          .eq('id', id);

        if (error) throw error;
        return { id };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('পেজ সেভ হয়েছে');
      if (isNew && data) {
        navigate(`/admin/pages/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'সেভ করতে সমস্যা হয়েছে');
    },
  });

  // Save sections mutation
  const saveSectionMutation = useMutation({
    mutationFn: async (section: Partial<PageSection>) => {
      if (section.id) {
        const { error } = await supabase
          .from('page_sections')
          .update({
            section_type: section.section_type,
            title_bn: section.title_bn,
            title_en: section.title_en,
            subtitle_bn: section.subtitle_bn,
            subtitle_en: section.subtitle_en,
            content: section.content as unknown as Json,
            settings: section.settings as unknown as Json,
            sort_order: section.sort_order,
            is_active: section.is_active,
          })
          .eq('id', section.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('page_sections').insert([{
          page_id: id as string,
          section_type: section.section_type || 'text_content',
          title_bn: section.title_bn || null,
          title_en: section.title_en || null,
          subtitle_bn: section.subtitle_bn || null,
          subtitle_en: section.subtitle_en || null,
          content: (section.content || {}) as unknown as Json,
          settings: (section.settings || {}) as unknown as Json,
          sort_order: sections.length,
          is_active: section.is_active ?? true,
        }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-page-sections', id] });
      toast.success('সেকশন সেভ হয়েছে');
      setShowSectionEditor(false);
      setEditingSection(null);
    },
    onError: () => {
      toast.error('সেকশন সেভ করতে সমস্যা হয়েছে');
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase.from('page_sections').delete().eq('id', sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-page-sections', id] });
      toast.success('সেকশন ডিলিট হয়েছে');
    },
  });

  // Reorder sections mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedSections: PageSection[]) => {
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('page_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-page-sections', id] });
    },
  });

  const handleAddSection = () => {
    setEditingSection(null);
    setShowSectionEditor(true);
  };

  const handleEditSection = (section: PageSection) => {
    setEditingSection(section);
    setShowSectionEditor(true);
  };

  const handleSaveSection = (sectionData: Partial<PageSection>) => {
    saveSectionMutation.mutate(sectionData);
  };

  const handleReorderSections = (newOrder: PageSection[]) => {
    setSections(newOrder);
    reorderMutation.mutate(newOrder);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">লোড হচ্ছে...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pages')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? 'নতুন পেজ তৈরি করুন' : 'পেজ এডিট করুন'}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? 'একটি নতুন পেজ তৈরি করুন' : pageData.title_bn}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button variant="outline" onClick={() => window.open(`/${pageData.slug}`, '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                প্রিভিউ
              </Button>
            )}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content">কন্টেন্ট</TabsTrigger>
            <TabsTrigger value="sections" disabled={isNew}>সেকশনস</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="settings">সেটিংস</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>পেজ তথ্য</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title_bn">শিরোনাম (বাংলা) *</Label>
                        <Input
                          id="title_bn"
                          value={pageData.title_bn}
                          onChange={(e) => {
                            setPageData({ ...pageData, title_bn: e.target.value });
                            if (isNew && !pageData.slug) {
                              setPageData((prev) => ({
                                ...prev,
                                title_bn: e.target.value,
                                slug: generateSlug(e.target.value),
                              }));
                            }
                          }}
                          placeholder="পেজের শিরোনাম"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title_en">শিরোনাম (ইংরেজি)</Label>
                        <Input
                          id="title_en"
                          value={pageData.title_en}
                          onChange={(e) => setPageData({ ...pageData, title_en: e.target.value })}
                          placeholder="Page Title"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">স্লাগ (URL) *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">/</span>
                        <Input
                          id="slug"
                          value={pageData.slug}
                          onChange={(e) =>
                            setPageData({ ...pageData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                          }
                          placeholder="page-slug"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description_bn">বিবরণ (বাংলা)</Label>
                        <Textarea
                          id="description_bn"
                          value={pageData.description_bn}
                          onChange={(e) => setPageData({ ...pageData, description_bn: e.target.value })}
                          placeholder="পেজের বিবরণ..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description_en">বিবরণ (ইংরেজি)</Label>
                        <Textarea
                          id="description_en"
                          value={pageData.description_en}
                          onChange={(e) => setPageData({ ...pageData, description_en: e.target.value })}
                          placeholder="Page description..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>স্ট্যাটাস</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>পাবলিশ স্ট্যাটাস</Label>
                      <Select
                        value={pageData.status}
                        onValueChange={(value) => setPageData({ ...pageData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">ড্রাফট</SelectItem>
                          <SelectItem value="published">প্রকাশিত</SelectItem>
                          <SelectItem value="archived">আর্কাইভ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_homepage">হোমপেজ হিসেবে সেট করুন</Label>
                      <Switch
                        id="is_homepage"
                        checked={pageData.is_homepage}
                        onCheckedChange={(checked) => setPageData({ ...pageData, is_homepage: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ফিচার্ড ইমেজ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SectionImageUpload
                      value={pageData.featured_image}
                      onChange={(url) => setPageData({ ...pageData, featured_image: url })}
                      label=""
                      folder="page-featured"
                      aspectRatio="16/9"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            {!isNew && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>পেজ সেকশনস</CardTitle>
                    <CardDescription>পেজে বিভিন্ন সেকশন যোগ করুন</CardDescription>
                  </div>
                  <Button onClick={handleAddSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    সেকশন যোগ করুন
                  </Button>
                </CardHeader>
                <CardContent>
                  <PageSectionList
                    sections={sections}
                    onEdit={handleEditSection}
                    onDelete={(id) => deleteSectionMutation.mutate(id)}
                    onReorder={handleReorderSections}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO সেটিংস</CardTitle>
                <CardDescription>সার্চ ইঞ্জিন অপ্টিমাইজেশন সেটিংস</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">মেটা টাইটেল</Label>
                  <Input
                    id="meta_title"
                    value={pageData.meta_title}
                    onChange={(e) => setPageData({ ...pageData, meta_title: e.target.value })}
                    placeholder="SEO টাইটেল"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    {pageData.meta_title.length}/60 অক্ষর
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_description">মেটা ডেসক্রিপশন</Label>
                  <Textarea
                    id="meta_description"
                    value={pageData.meta_description}
                    onChange={(e) => setPageData({ ...pageData, meta_description: e.target.value })}
                    placeholder="SEO ডেসক্রিপশন"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">
                    {pageData.meta_description.length}/160 অক্ষর
                  </p>
                </div>

                {/* Preview */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    {pageData.meta_title || pageData.title_bn || 'পেজ টাইটেল'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {window.location.origin}/{pageData.slug || 'page-slug'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pageData.meta_description || pageData.description_bn || 'পেজের বিবরণ এখানে দেখাবে...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>পেজ টাইপ</CardTitle>
                <CardDescription>পেজের ধরণ এবং অ্যাক্সেস কন্ট্রোল সেটিংস</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>পেজ টাইপ</Label>
                    <Select
                      value={pageData.page_type}
                      onValueChange={(value) => setPageData({ ...pageData, page_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landing">ল্যান্ডিং পেজ</SelectItem>
                        <SelectItem value="offer">অফার পেজ</SelectItem>
                        <SelectItem value="coupon">কুপন পেজ</SelectItem>
                        <SelectItem value="campaign">ক্যাম্পেইন পেজ</SelectItem>
                        <SelectItem value="promo">প্রোমো পেজ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>স্ট্যাটাস</Label>
                    <Select
                      value={pageData.status}
                      onValueChange={(value) => setPageData({ ...pageData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">ড্রাফট</SelectItem>
                        <SelectItem value="published">প্রকাশিত</SelectItem>
                        <SelectItem value="archived">আর্কাইভ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>প্রাইভেট পেজ</Label>
                    <p className="text-sm text-muted-foreground">
                      শুধুমাত্র কোড সহ অ্যাক্সেস যোগ্য (সার্চে দেখাবে না)
                    </p>
                  </div>
                  <Switch
                    checked={pageData.is_private}
                    onCheckedChange={(checked) => setPageData({ ...pageData, is_private: checked })}
                  />
                </div>

                {pageData.is_private && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <Label>অ্যাক্সেস কোড</Label>
                    <Input
                      value={pageData.access_code}
                      onChange={(e) => setPageData({ ...pageData, access_code: e.target.value.toUpperCase() })}
                      placeholder="PROMO2024"
                    />
                    <p className="text-xs text-muted-foreground">
                      ইউজারদের এই কোড দিয়ে পেজে প্রবেশ করতে হবে
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ব্যবহার সীমা</CardTitle>
                <CardDescription>পেজের ব্যবহার সীমাবদ্ধতা সেট করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>সর্বোচ্চ ব্যবহার (মোট)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={pageData.max_usage || ''}
                      onChange={(e) => setPageData({ ...pageData, max_usage: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="সীমাহীন"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>প্রতি ইউজার ব্যবহার</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pageData.usage_per_user}
                      onChange={(e) => setPageData({ ...pageData, usage_per_user: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>শুরুর তারিখ</Label>
                    <Input
                      type="datetime-local"
                      value={pageData.start_date}
                      onChange={(e) => setPageData({ ...pageData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>শেষ তারিখ</Label>
                    <Input
                      type="datetime-local"
                      value={pageData.end_date}
                      onChange={(e) => setPageData({ ...pageData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>অন্যান্য সেটিংস</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>হোমপেজ হিসেবে সেট করুন</Label>
                    <p className="text-sm text-muted-foreground">
                      এই পেজ সাইটের হোমপেজ হিসেবে দেখাবে
                    </p>
                  </div>
                  <Switch
                    checked={pageData.is_homepage}
                    onCheckedChange={(checked) => setPageData({ ...pageData, is_homepage: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>অফার পেজে দেখাবে না</Label>
                    <p className="text-sm text-muted-foreground">
                      কুপন পেজ পাবলিক অফার লিস্টে দেখাবে না
                    </p>
                  </div>
                  <Switch
                    checked={!pageData.show_in_offers_page}
                    onCheckedChange={(checked) => setPageData({ ...pageData, show_in_offers_page: !checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coupon Page - Product/Category Selection */}
            {(pageData.page_type === 'coupon' || pageData.page_type === 'promo') && (
              <Card>
                <CardHeader>
                  <CardTitle>প্রোডাক্ট/ক্যাটাগরি সিলেকশন</CardTitle>
                  <CardDescription>
                    এই কুপন পেজ শুধুমাত্র সিলেক্টেড প্রোডাক্ট বা ক্যাটাগরিতে প্রযোজ্য হবে
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Category Selection */}
                  <div className="space-y-3">
                    <Label>ক্যাটাগরি সিলেক্ট করুন (ঐচ্ছিক)</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pageData.selected_category_ids.map((catId) => {
                        const cat = allCategories?.find(c => c.id === catId);
                        return cat ? (
                          <Badge 
                            key={catId} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => setPageData({
                              ...pageData,
                              selected_category_ids: pageData.selected_category_ids.filter(id => id !== catId)
                            })}
                          >
                            {cat.name_bn} ✕
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <ScrollArea className="h-40 border rounded-md p-3">
                      <div className="space-y-2">
                        {allCategories?.map((cat) => (
                          <div key={cat.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`cat-${cat.id}`}
                              checked={pageData.selected_category_ids.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPageData({
                                    ...pageData,
                                    selected_category_ids: [...pageData.selected_category_ids, cat.id]
                                  });
                                } else {
                                  setPageData({
                                    ...pageData,
                                    selected_category_ids: pageData.selected_category_ids.filter(id => id !== cat.id)
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                              {cat.name_bn}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-3">
                    <Label>প্রোডাক্ট সিলেক্ট করুন (ঐচ্ছিক)</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pageData.selected_product_ids.slice(0, 10).map((prodId) => {
                        const prod = allProducts?.find(p => p.id === prodId);
                        return prod ? (
                          <Badge 
                            key={prodId} 
                            variant="outline" 
                            className="cursor-pointer"
                            onClick={() => setPageData({
                              ...pageData,
                              selected_product_ids: pageData.selected_product_ids.filter(id => id !== prodId)
                            })}
                          >
                            {prod.title_bn.substring(0, 30)}... ✕
                          </Badge>
                        ) : null;
                      })}
                      {pageData.selected_product_ids.length > 10 && (
                        <Badge variant="secondary">
                          +{pageData.selected_product_ids.length - 10} টি আরও
                        </Badge>
                      )}
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-3">
                      <div className="space-y-2">
                        {allProducts?.map((prod) => (
                          <div key={prod.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`prod-${prod.id}`}
                              checked={pageData.selected_product_ids.includes(prod.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPageData({
                                    ...pageData,
                                    selected_product_ids: [...pageData.selected_product_ids, prod.id]
                                  });
                                } else {
                                  setPageData({
                                    ...pageData,
                                    selected_product_ids: pageData.selected_product_ids.filter(id => id !== prod.id)
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`prod-${prod.id}`} className="text-sm cursor-pointer line-clamp-1">
                              {prod.title_bn}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      কোনো সিলেকশন না থাকলে সব প্রোডাক্টে প্রযোজ্য হবে
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Section Editor Modal */}
        {showSectionEditor && (
          <PageSectionEditor
            section={editingSection}
            onSave={handleSaveSection}
            onClose={() => {
              setShowSectionEditor(false);
              setEditingSection(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPageEditor;
