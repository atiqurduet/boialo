import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye, Download, Star, Upload,
  FileText, Filter, BarChart3, Tag, Globe, Shield, Settings, RefreshCw,
  ChevronDown, Copy, ExternalLink, Layers, BookMarked, Headphones, ChevronLeft, ChevronRight
} from "lucide-react";

const LANGUAGES = [
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'ur', label: 'اردو' },
  { value: 'hi', label: 'हिन्दी' },
];

const FORMATS = ['pdf', 'epub', 'mobi', 'djvu'];

const AdminEbooks = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const perPage = 20;

  // Form state
  const [form, setForm] = useState<any>({
    title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
    product_type: 'ebook', category: '', price: 0, original_price: 0, discount_percent: 0,
    cover_image: '', file_url: '', file_name: '', file_size_mb: 0, file_format: 'pdf',
    preview_url: '', preview_pages: 10, is_active: true, is_featured: false, is_free: false,
    max_downloads: 5, download_expiry_days: 365, drm_enabled: false, watermark_enabled: false,
    tags: [], meta_title: '', meta_description: '',
    // Ebook metadata
    isbn: '', language: 'bn', page_count: 0, publisher: '', author: '', translator: '',
    edition: '', publish_year: new Date().getFullYear(), format: 'pdf',
    has_audio: false, audio_url: '', audio_duration_minutes: 0, sample_chapter_url: '',
    table_of_contents: [],
  });

  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ['admin-ebooks', search, filterLang, filterStatus, currentPage],
    queryFn: async () => {
      let q = supabase
        .from('digital_products')
        .select('*, ebook_metadata(*)')
        .eq('product_type', 'ebook')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * perPage, currentPage * perPage - 1);

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%`);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);
      if (filterStatus === 'featured') q = q.eq('is_featured', true);
      if (filterStatus === 'free') q = q.eq('is_free', true);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['ebook-stats'],
    queryFn: async () => {
      const { data: all } = await supabase.from('digital_products').select('id, is_active, is_free, total_sales, total_downloads, price').eq('product_type', 'ebook');
      const items = all || [];
      return {
        total: items.length,
        active: items.filter(i => i.is_active).length,
        free: items.filter(i => i.is_free).length,
        totalSales: items.reduce((s, i) => s + (i.total_sales || 0), 0),
        totalDownloads: items.reduce((s, i) => s + (i.total_downloads || 0), 0),
        revenue: items.reduce((s, i) => s + ((i.total_sales || 0) * (i.price || 0)), 0),
      };
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { isbn, language, page_count, publisher, author, translator, edition, publish_year,
        format, has_audio, audio_url, audio_duration_minutes, sample_chapter_url, table_of_contents,
        ...productData } = data;

      const ebookMeta = { isbn, language, page_count, publisher, author, translator, edition,
        publish_year, format, has_audio, audio_url, audio_duration_minutes, sample_chapter_url, table_of_contents };

      if (editingId) {
        const { error } = await supabase.from('digital_products').update(productData).eq('id', editingId);
        if (error) throw error;
        // Update or insert metadata
        const { data: existingMeta } = await supabase.from('ebook_metadata').select('id').eq('digital_product_id', editingId).maybeSingle();
        if (existingMeta) {
          await supabase.from('ebook_metadata').update(ebookMeta).eq('digital_product_id', editingId);
        } else {
          await supabase.from('ebook_metadata').insert({ ...ebookMeta, digital_product_id: editingId });
        }
      } else {
        const { data: newProduct, error } = await supabase.from('digital_products').insert(productData).select().single();
        if (error) throw error;
        await supabase.from('ebook_metadata').insert({ ...ebookMeta, digital_product_id: newProduct.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] });
      queryClient.invalidateQueries({ queryKey: ['ebook-stats'] });
      setShowForm(false);
      setEditingId(null);
      toast.success(editingId ? "ই-বুক আপডেট হয়েছে" : "ই-বুক যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('digital_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] });
      toast.success("ই-বুক মুছে ফেলা হয়েছে");
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('digital_products').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] })
  });

  const openEdit = (item: any) => {
    const meta = item.ebook_metadata?.[0] || {};
    setForm({
      title_bn: item.title_bn || '', title_en: item.title_en || '', slug: item.slug || '',
      description_bn: item.description_bn || '', description_en: item.description_en || '',
      product_type: 'ebook', category: item.category || '', price: item.price || 0,
      original_price: item.original_price || 0, discount_percent: item.discount_percent || 0,
      cover_image: item.cover_image || '', file_url: item.file_url || '', file_name: item.file_name || '',
      file_size_mb: item.file_size_mb || 0, file_format: item.file_format || 'pdf',
      preview_url: item.preview_url || '', preview_pages: item.preview_pages || 10,
      is_active: item.is_active, is_featured: item.is_featured || false, is_free: item.is_free || false,
      max_downloads: item.max_downloads || 5, download_expiry_days: item.download_expiry_days || 365,
      drm_enabled: item.drm_enabled || false, watermark_enabled: item.watermark_enabled || false,
      tags: item.tags || [], meta_title: item.meta_title || '', meta_description: item.meta_description || '',
      isbn: meta.isbn || '', language: meta.language || 'bn', page_count: meta.page_count || 0,
      publisher: meta.publisher || '', author: meta.author || '', translator: meta.translator || '',
      edition: meta.edition || '', publish_year: meta.publish_year || new Date().getFullYear(),
      format: meta.format || 'pdf', has_audio: meta.has_audio || false, audio_url: meta.audio_url || '',
      audio_duration_minutes: meta.audio_duration_minutes || 0,
      sample_chapter_url: meta.sample_chapter_url || '', table_of_contents: meta.table_of_contents || [],
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({
      title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
      product_type: 'ebook', category: '', price: 0, original_price: 0, discount_percent: 0,
      cover_image: '', file_url: '', file_name: '', file_size_mb: 0, file_format: 'pdf',
      preview_url: '', preview_pages: 10, is_active: true, is_featured: false, is_free: false,
      max_downloads: 5, download_expiry_days: 365, drm_enabled: false, watermark_enabled: false,
      tags: [], meta_title: '', meta_description: '',
      isbn: '', language: 'bn', page_count: 0, publisher: '', author: '', translator: '',
      edition: '', publish_year: new Date().getFullYear(), format: 'pdf',
      has_audio: false, audio_url: '', audio_duration_minutes: 0, sample_chapter_url: '',
      table_of_contents: [],
    });
    setEditingId(null);
    setShowForm(true);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const statCards = [
    { label: 'মোট ই-বুক', value: stats?.total || 0, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950' },
    { label: 'সক্রিয়', value: stats?.active || 0, icon: Eye, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'ফ্রি ই-বুক', value: stats?.free || 0, icon: Tag, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950' },
    { label: 'মোট বিক্রি', value: stats?.totalSales || 0, icon: BarChart3, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950' },
    { label: 'মোট ডাউনলোড', value: stats?.totalDownloads || 0, icon: Download, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950' },
    { label: 'রেভিনিউ', value: `৳${(stats?.revenue || 0).toLocaleString()}`, icon: BarChart3, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950' },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> ই-বুক ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">ই-বুক পরিচালনা, মেটাডাটা ও প্রকাশনা</p>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list"><BookOpen className="w-4 h-4 mr-1" /> তালিকা</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> সেটিংস</TabsTrigger>
          </TabsList>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> নতুন ই-বুক</Button>
        </div>

        <TabsContent value="list">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="ই-বুক খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="active">সক্রিয়</SelectItem>
                <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                <SelectItem value="featured">ফিচার্ড</SelectItem>
                <SelectItem value="free">ফ্রি</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLang} onValueChange={setFilterLang}>
              <SelectTrigger className="w-[130px]"><Globe className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ভাষা</SelectItem>
                {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : ebooks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">কোনো ই-বুক পাওয়া যায়নি</p>
              <p className="text-sm">নতুন ই-বুক যোগ করতে উপরের বাটনে ক্লিক করুন</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ই-বুক</TableHead>
                      <TableHead>লেখক</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead>ফরম্যাট</TableHead>
                      <TableHead>বিক্রি</TableHead>
                      <TableHead>ডাউনলোড</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ebooks.map((item: any) => {
                      const meta = item.ebook_metadata?.[0] || {};
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img src={item.cover_image || '/placeholder.svg'} alt="" className="w-10 h-14 rounded object-cover bg-muted" />
                              <div>
                                <p className="font-medium line-clamp-1">{item.title_bn}</p>
                                <p className="text-xs text-muted-foreground">{item.title_en}</p>
                                {meta.isbn && <p className="text-[10px] text-muted-foreground">ISBN: {meta.isbn}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{meta.author || '—'}</TableCell>
                          <TableCell>
                            {item.is_free ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">ফ্রি</Badge>
                            ) : (
                              <span className="font-semibold">৳{item.price}</span>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs uppercase">{meta.format || item.file_format || 'pdf'}</Badge></TableCell>
                          <TableCell className="font-medium">{item.total_sales || 0}</TableCell>
                          <TableCell className="font-medium">{item.total_downloads || 0}</TableCell>
                          <TableCell>
                            <Switch checked={item.is_active} onCheckedChange={v => toggleActive.mutate({ id: item.id, active: v })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                                if (confirm("এই ই-বুক মুছে ফেলতে চান?")) deleteMutation.mutate(item.id);
                              }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">পেজ {currentPage}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" disabled={ebooks.length < perPage} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg mb-2">ই-বুক অ্যানালিটিক্স</p>
            <p className="text-sm">বিক্রি, ডাউনলোড, এবং রেটিং ট্রেন্ড দেখুন</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">সর্বোচ্চ বিক্রিত</p>
                <p className="text-xs text-muted-foreground mt-1">ডাটা আসছে...</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">সর্বোচ্চ ডাউনলোড</p>
                <p className="text-xs text-muted-foreground mt-1">ডাটা আসছে...</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">সর্বোচ্চ রেটিং</p>
                <p className="text-xs text-muted-foreground mt-1">ডাটা আসছে...</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> ই-বুক সেটিংস</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>ডিফল্ট ডাউনলোড লিমিট</Label>
                <Input type="number" defaultValue={5} />
              </div>
              <div className="space-y-3">
                <Label>ডিফল্ট এক্সপায়ারি (দিন)</Label>
                <Input type="number" defaultValue={365} />
              </div>
              <div className="flex items-center gap-3">
                <Switch defaultChecked={false} id="drm-default" />
                <Label htmlFor="drm-default">DRM ডিফল্ট সক্রিয়</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch defaultChecked={false} id="watermark-default" />
                <Label htmlFor="watermark-default">ওয়াটারমার্ক ডিফল্ট সক্রিয়</Label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {editingId ? 'ই-বুক এডিট করুন' : 'নতুন ই-বুক যোগ করুন'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="basic">বেসিক</TabsTrigger>
              <TabsTrigger value="metadata">মেটাডাটা</TabsTrigger>
              <TabsTrigger value="files">ফাইল</TabsTrigger>
              <TabsTrigger value="pricing">মূল্য</TabsTrigger>
              <TabsTrigger value="protection">সুরক্ষা</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>শিরোনাম (বাংলা) *</Label><Input value={form.title_bn} onChange={e => { setForm({ ...form, title_bn: e.target.value, slug: generateSlug(e.target.value) }); }} /></div>
                <div><Label>শিরোনাম (ইংরেজি)</Label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
                <div><Label>স্লাগ *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>ক্যাটাগরি</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              <div><Label>বিবরণ (বাংলা)</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[100px] bg-background" value={form.description_bn} onChange={e => setForm({ ...form, description_bn: e.target.value })} /></div>
              <div><Label>বিবরণ (ইংরেজি)</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background" value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} /></div>
              <div><Label>কভার ইমেজ URL</Label><Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." /></div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} /><Label>ফিচার্ড</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_free} onCheckedChange={v => setForm({ ...form, is_free: v })} /><Label>ফ্রি</Label></div>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>ISBN</Label><Input value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} /></div>
                <div><Label>ভাষা</Label>
                  <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>পৃষ্ঠা সংখ্যা</Label><Input type="number" value={form.page_count} onChange={e => setForm({ ...form, page_count: Number(e.target.value) })} /></div>
                <div><Label>ফরম্যাট</Label>
                  <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>লেখক</Label><Input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} /></div>
                <div><Label>প্রকাশনী</Label><Input value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} /></div>
                <div><Label>অনুবাদক</Label><Input value={form.translator} onChange={e => setForm({ ...form, translator: e.target.value })} /></div>
                <div><Label>সংস্করণ</Label><Input value={form.edition} onChange={e => setForm({ ...form, edition: e.target.value })} /></div>
                <div><Label>প্রকাশসাল</Label><Input type="number" value={form.publish_year} onChange={e => setForm({ ...form, publish_year: Number(e.target.value) })} /></div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2"><Headphones className="w-4 h-4" /> অডিওবুক</h4>
                <div className="flex items-center gap-2 mb-3"><Switch checked={form.has_audio} onCheckedChange={v => setForm({ ...form, has_audio: v })} /><Label>অডিও ভার্সন আছে</Label></div>
                {form.has_audio && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>অডিও URL</Label><Input value={form.audio_url} onChange={e => setForm({ ...form, audio_url: e.target.value })} /></div>
                    <div><Label>সময়কাল (মিনিট)</Label><Input type="number" value={form.audio_duration_minutes} onChange={e => setForm({ ...form, audio_duration_minutes: Number(e.target.value) })} /></div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>ফাইল URL *</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
                <div><Label>ফাইলের নাম</Label><Input value={form.file_name} onChange={e => setForm({ ...form, file_name: e.target.value })} /></div>
                <div><Label>ফাইল সাইজ (MB)</Label><Input type="number" value={form.file_size_mb} onChange={e => setForm({ ...form, file_size_mb: Number(e.target.value) })} /></div>
                <div><Label>ফাইল ফরম্যাট</Label>
                  <Select value={form.file_format} onValueChange={v => setForm({ ...form, file_format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="epub">EPUB</SelectItem>
                      <SelectItem value="mobi">MOBI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">প্রিভিউ সেটিংস</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>প্রিভিউ URL</Label><Input value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })} /></div>
                  <div><Label>প্রিভিউ পৃষ্ঠা সংখ্যা</Label><Input type="number" value={form.preview_pages} onChange={e => setForm({ ...form, preview_pages: Number(e.target.value) })} /></div>
                  <div><Label>স্যাম্পল চ্যাপ্টার URL</Label><Input value={form.sample_chapter_url} onChange={e => setForm({ ...form, sample_chapter_url: e.target.value })} /></div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>মূল্য (৳) *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>আসল মূল্য (৳)</Label><Input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: Number(e.target.value) })} /></div>
                <div><Label>ডিসকাউন্ট %</Label><Input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="protection" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>সর্বোচ্চ ডাউনলোড</Label><Input type="number" value={form.max_downloads} onChange={e => setForm({ ...form, max_downloads: Number(e.target.value) })} /></div>
                <div><Label>এক্সপায়ারি (দিন)</Label><Input type="number" value={form.download_expiry_days} onChange={e => setForm({ ...form, download_expiry_days: Number(e.target.value) })} /></div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.drm_enabled} onCheckedChange={v => setForm({ ...form, drm_enabled: v })} /><Label>DRM সুরক্ষা</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.watermark_enabled} onCheckedChange={v => setForm({ ...form, watermark_enabled: v })} /><Label>ওয়াটারমার্ক</Label></div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <div><Label>মেটা টাইটেল</Label><Input value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} /></div>
              <div><Label>মেটা ডেসক্রিপশন</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background" value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} /></div>
              <div><Label>ট্যাগ (কমা দিয়ে আলাদা)</Label><Input value={(form.tags || []).join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })} /></div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.title_bn || !form.slug}>
              {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEbooks;
