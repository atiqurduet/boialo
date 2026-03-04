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
  Package, Plus, Search, Edit, Trash2, Eye, Download, Upload, Key,
  Filter, BarChart3, Tag, Shield, Settings, RefreshCw, Layers,
  ChevronLeft, ChevronRight, Monitor, Music, Video, FileArchive, Cpu, Copy
} from "lucide-react";

const PRODUCT_TYPES = [
  { value: 'software', label: 'সফটওয়্যার', icon: Monitor },
  { value: 'audio', label: 'অডিও', icon: Music },
  { value: 'video', label: 'ভিডিও', icon: Video },
  { value: 'template', label: 'টেমপ্লেট', icon: FileArchive },
  { value: 'course', label: 'কোর্স', icon: Cpu },
  { value: 'graphics', label: 'গ্রাফিক্স', icon: Layers },
];

const AdminEproducts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [newLicenseKeys, setNewLicenseKeys] = useState("");
  const perPage = 20;

  const [form, setForm] = useState<any>({
    title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
    product_type: 'software', category: '', subcategory: '', price: 0, original_price: 0,
    discount_percent: 0, cover_image: '', file_url: '', file_name: '', file_size_mb: 0,
    file_format: 'zip', preview_url: '', is_active: true, is_featured: false, is_free: false,
    max_downloads: 3, download_expiry_days: 30, drm_enabled: false, watermark_enabled: false,
    tags: [], meta_title: '', meta_description: '',
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-eproducts', search, filterType, filterStatus, currentPage],
    queryFn: async () => {
      let q = supabase
        .from('digital_products')
        .select('*')
        .neq('product_type', 'ebook')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * perPage, currentPage * perPage - 1);

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%`);
      if (filterType !== 'all') q = q.eq('product_type', filterType);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['eproduct-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_products').select('id, is_active, product_type, total_sales, total_downloads, price').neq('product_type', 'ebook');
      const items = data || [];
      return {
        total: items.length,
        active: items.filter(i => i.is_active).length,
        totalSales: items.reduce((s, i) => s + (i.total_sales || 0), 0),
        totalDownloads: items.reduce((s, i) => s + (i.total_downloads || 0), 0),
        revenue: items.reduce((s, i) => s + ((i.total_sales || 0) * (i.price || 0)), 0),
        byType: PRODUCT_TYPES.map(t => ({ ...t, count: items.filter(i => i.product_type === t.value).length })),
      };
    }
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['product-licenses', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data } = await supabase.from('product_licenses').select('*').eq('digital_product_id', selectedProductId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!selectedProductId
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['product-versions', editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data } = await supabase.from('digital_product_versions').select('*').eq('digital_product_id', editingId).order('release_date', { ascending: false });
      return data || [];
    },
    enabled: !!editingId
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        const { error } = await supabase.from('digital_products').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('digital_products').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] });
      queryClient.invalidateQueries({ queryKey: ['eproduct-stats'] });
      setShowForm(false);
      setEditingId(null);
      toast.success(editingId ? "প্রোডাক্ট আপডেট হয়েছে" : "প্রোডাক্ট যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('digital_products').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] });
      toast.success("প্রোডাক্ট মুছে ফেলা হয়েছে");
    }
  });

  const addLicensesMutation = useMutation({
    mutationFn: async () => {
      const keys = newLicenseKeys.split('\n').map(k => k.trim()).filter(Boolean);
      const inserts = keys.map(key => ({ digital_product_id: selectedProductId!, license_key: key }));
      const { error } = await supabase.from('product_licenses').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-licenses'] });
      setNewLicenseKeys("");
      toast.success("লাইসেন্স কী যোগ হয়েছে");
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('digital_products').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] })
  });

  const openEdit = (item: any) => {
    setForm({ ...item, tags: item.tags || [] });
    setEditingId(item.id);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({
      title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
      product_type: 'software', category: '', subcategory: '', price: 0, original_price: 0,
      discount_percent: 0, cover_image: '', file_url: '', file_name: '', file_size_mb: 0,
      file_format: 'zip', preview_url: '', is_active: true, is_featured: false, is_free: false,
      max_downloads: 3, download_expiry_days: 30, drm_enabled: false, watermark_enabled: false,
      tags: [], meta_title: '', meta_description: '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  const getTypeIcon = (type: string) => {
    const found = PRODUCT_TYPES.find(t => t.value === type);
    return found ? found.icon : Package;
  };

  const getTypeLabel = (type: string) => PRODUCT_TYPES.find(t => t.value === type)?.label || type;

  const statCards = [
    { label: 'মোট প্রোডাক্ট', value: stats?.total || 0, icon: Package, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950' },
    { label: 'সক্রিয়', value: stats?.active || 0, icon: Eye, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'মোট বিক্রি', value: stats?.totalSales || 0, icon: BarChart3, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950' },
    { label: 'ডাউনলোড', value: stats?.totalDownloads || 0, icon: Download, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950' },
    { label: 'রেভিনিউ', value: `৳${(stats?.revenue || 0).toLocaleString()}`, icon: BarChart3, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950' },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-primary" /> ই-প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">ডিজিটাল প্রোডাক্ট, লাইসেন্স ও ভার্সন পরিচালনা</p>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-4 h-4" /></div></div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(stats?.byType || []).map((t: any) => (
          <Badge key={t.value} variant="outline" className="gap-1 py-1.5 px-3 cursor-pointer hover:bg-accent" onClick={() => setFilterType(t.value)}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </Badge>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list"><Package className="w-4 h-4 mr-1" /> তালিকা</TabsTrigger>
            <TabsTrigger value="licenses"><Key className="w-4 h-4 mr-1" /> লাইসেন্স</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
          </TabsList>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> নতুন প্রোডাক্ট</Button>
        </div>

        <TabsContent value="list">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="প্রোডাক্ট খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="active">সক্রিয়</SelectItem>
                <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">কোনো ই-প্রোডাক্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead>ফরম্যাট</TableHead>
                      <TableHead>বিক্রি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item: any) => {
                      const TypeIcon = getTypeIcon(item.product_type);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img src={item.cover_image || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                              <div>
                                <p className="font-medium line-clamp-1">{item.title_bn}</p>
                                <p className="text-xs text-muted-foreground">{item.title_en}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1"><TypeIcon className="w-3 h-3" /> {getTypeLabel(item.product_type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.is_free ? <Badge className="bg-emerald-100 text-emerald-700">ফ্রি</Badge> : <span className="font-semibold">৳{item.price}</span>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs uppercase">{item.file_format || '—'}</Badge></TableCell>
                          <TableCell className="font-medium">{item.total_sales || 0}</TableCell>
                          <TableCell><Switch checked={item.is_active} onCheckedChange={v => toggleActive.mutate({ id: item.id, active: v })} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedProductId(item.id); setShowLicenseDialog(true); }}><Key className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(item.id); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">পেজ {currentPage}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" disabled={products.length < perPage} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="licenses">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5" /> লাইসেন্স কী ম্যানেজমেন্ট</h3>
            <p className="text-sm text-muted-foreground mb-4">প্রোডাক্টের পাশে <Key className="w-3 h-3 inline" /> আইকনে ক্লিক করে লাইসেন্স ম্যানেজ করুন</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.slice(0, 6).map((p: any) => (
                <div key={p.id} className="border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition" onClick={() => { setSelectedProductId(p.id); setShowLicenseDialog(true); }}>
                  <p className="font-medium text-sm line-clamp-1">{p.title_bn}</p>
                  <p className="text-xs text-muted-foreground">{getTypeLabel(p.product_type)}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">ই-প্রোডাক্ট অ্যানালিটিক্স</p>
            <p className="text-sm mt-1">বিক্রি ও ডাউনলোড ট্রেন্ড</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> {editingId ? 'প্রোডাক্ট এডিট' : 'নতুন ই-প্রোডাক্ট'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="basic">বেসিক</TabsTrigger>
              <TabsTrigger value="files">ফাইল</TabsTrigger>
              <TabsTrigger value="pricing">মূল্য</TabsTrigger>
              <TabsTrigger value="protection">সুরক্ষা</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>শিরোনাম (বাংলা) *</Label><Input value={form.title_bn} onChange={e => setForm({ ...form, title_bn: e.target.value, slug: generateSlug(e.target.value) })} /></div>
                <div><Label>শিরোনাম (ইংরেজি)</Label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
                <div><Label>স্লাগ *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>প্রোডাক্ট টাইপ *</Label>
                  <Select value={form.product_type} onValueChange={v => setForm({ ...form, product_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>ক্যাটাগরি</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>সাব-ক্যাটাগরি</Label><Input value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} /></div>
              </div>
              <div><Label>বিবরণ (বাংলা)</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background" value={form.description_bn} onChange={e => setForm({ ...form, description_bn: e.target.value })} /></div>
              <div><Label>কভার ইমেজ URL</Label><Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} /></div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} /><Label>ফিচার্ড</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_free} onCheckedChange={v => setForm({ ...form, is_free: v })} /><Label>ফ্রি</Label></div>
              </div>
            </TabsContent>
            <TabsContent value="files" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>ফাইল URL</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} /></div>
                <div><Label>ফাইলের নাম</Label><Input value={form.file_name} onChange={e => setForm({ ...form, file_name: e.target.value })} /></div>
                <div><Label>ফাইল সাইজ (MB)</Label><Input type="number" value={form.file_size_mb} onChange={e => setForm({ ...form, file_size_mb: Number(e.target.value) })} /></div>
                <div><Label>ফরম্যাট</Label><Input value={form.file_format} onChange={e => setForm({ ...form, file_format: e.target.value })} placeholder="zip, exe, mp3..." /></div>
              </div>
              <div><Label>প্রিভিউ URL</Label><Input value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })} /></div>
            </TabsContent>
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>মূল্য (৳)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><Label>আসল মূল্য</Label><Input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: Number(e.target.value) })} /></div>
                <div><Label>ডিসকাউন্ট %</Label><Input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="protection" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>সর্বোচ্চ ডাউনলোড</Label><Input type="number" value={form.max_downloads} onChange={e => setForm({ ...form, max_downloads: Number(e.target.value) })} /></div>
                <div><Label>এক্সপায়ারি (দিন)</Label><Input type="number" value={form.download_expiry_days} onChange={e => setForm({ ...form, download_expiry_days: Number(e.target.value) })} /></div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.drm_enabled} onCheckedChange={v => setForm({ ...form, drm_enabled: v })} /><Label>DRM</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.watermark_enabled} onCheckedChange={v => setForm({ ...form, watermark_enabled: v })} /><Label>ওয়াটারমার্ক</Label></div>
              </div>
            </TabsContent>
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div><Label>মেটা টাইটেল</Label><Input value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} /></div>
              <div><Label>মেটা ডেসক্রিপশন</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background" value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} /></div>
              <div><Label>ট্যাগ</Label><Input value={(form.tags || []).join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })} /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.title_bn || !form.slug}>
              {saveMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-1" />}
              {editingId ? 'আপডেট' : 'সেভ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* License Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> লাইসেন্স কী ম্যানেজমেন্ট</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>নতুন লাইসেন্স কী যোগ করুন (প্রতি লাইনে একটি)</Label>
              <textarea className="w-full border rounded-md p-2 text-sm min-h-[100px] bg-background font-mono" value={newLicenseKeys} onChange={e => setNewLicenseKeys(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
              <Button size="sm" className="mt-2" onClick={() => addLicensesMutation.mutate()} disabled={!newLicenseKeys.trim()}>
                <Plus className="w-4 h-4 mr-1" /> যোগ করুন
              </Button>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">বিদ্যমান লাইসেন্স ({licenses.length})</h4>
              {licenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">কোনো লাইসেন্স নেই</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {licenses.map((lic: any) => (
                    <div key={lic.id} className="flex items-center justify-between border rounded-lg p-2.5">
                      <div>
                        <code className="text-sm font-mono">{lic.license_key}</code>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={lic.status === 'available' ? 'secondary' : lic.status === 'assigned' ? 'default' : 'destructive'} className="text-[10px]">{lic.status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{lic.activation_count}/{lic.max_activations} activated</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(lic.license_key); toast.success("কপি হয়েছে"); }}><Copy className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEproducts;
