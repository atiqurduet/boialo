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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  Package, Plus, Search, Edit, Trash2, Eye, Download, Upload, Key,
  Filter, BarChart3, Tag, Shield, Settings, RefreshCw, Layers,
  ChevronLeft, ChevronRight, Monitor, Music, Video, FileArchive, Cpu, Copy,
  TrendingUp, Star, MessageSquare, CheckCircle, Clock, GitBranch, Award, AlertTriangle
} from "lucide-react";

const PRODUCT_TYPES = [
  { value: 'software', label: 'সফটওয়্যার', icon: Monitor },
  { value: 'audio', label: 'অডিও', icon: Music },
  { value: 'video', label: 'ভিডিও', icon: Video },
  { value: 'template', label: 'টেমপ্লেট', icon: FileArchive },
  { value: 'course', label: 'কোর্স', icon: Cpu },
  { value: 'graphics', label: 'গ্রাফিক্স', icon: Layers },
];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedVersionProductId, setSelectedVersionProductId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newVersion, setNewVersion] = useState({ version: '', changelog_bn: '', changelog_en: '', file_url: '', file_size_mb: 0, is_current: true });
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

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-eproducts-analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_products')
        .select('id, title_bn, is_active, product_type, total_sales, total_downloads, price, avg_rating, review_count, category, created_at')
        .neq('product_type', 'ebook');
      return data || [];
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
    queryKey: ['product-versions', selectedVersionProductId],
    queryFn: async () => {
      if (!selectedVersionProductId) return [];
      const { data } = await supabase.from('digital_product_versions').select('*').eq('digital_product_id', selectedVersionProductId).order('release_date', { ascending: false });
      return data || [];
    },
    enabled: !!selectedVersionProductId
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['all-eproduct-reviews'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_product_reviews')
        .select('*, digital_products!inner(product_type, title_bn)')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []).filter((r: any) => r.digital_products?.product_type !== 'ebook');
    }
  });

  const stats = {
    total: allProducts.length,
    active: allProducts.filter(i => i.is_active).length,
    totalSales: allProducts.reduce((s, i) => s + (i.total_sales || 0), 0),
    totalDownloads: allProducts.reduce((s, i) => s + (i.total_downloads || 0), 0),
    revenue: allProducts.reduce((s, i) => s + ((i.total_sales || 0) * (i.price || 0)), 0),
    byType: PRODUCT_TYPES.map(t => ({ ...t, count: allProducts.filter(i => i.product_type === t.value).length, sales: allProducts.filter(i => i.product_type === t.value).reduce((s, x) => s + (x.total_sales || 0), 0), revenue: allProducts.filter(i => i.product_type === t.value).reduce((s, x) => s + ((x.total_sales || 0) * (x.price || 0)), 0) })),
    totalReviews: allProducts.reduce((s, i) => s + (i.review_count || 0), 0),
  };

  const topSelling = [...allProducts].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 10);

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
      queryClient.invalidateQueries({ queryKey: ['all-eproducts-analytics'] });
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

  const addVersionMutation = useMutation({
    mutationFn: async () => {
      if (newVersion.is_current) {
        await supabase.from('digital_product_versions').update({ is_current: false }).eq('digital_product_id', selectedVersionProductId!);
      }
      const { error } = await supabase.from('digital_product_versions').insert({
        digital_product_id: selectedVersionProductId!,
        ...newVersion,
        release_date: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-versions'] });
      setNewVersion({ version: '', changelog_bn: '', changelog_en: '', file_url: '', file_size_mb: 0, is_current: true });
      toast.success("ভার্সন যোগ হয়েছে");
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('digital_products').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] })
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      if (action === 'activate') await supabase.from('digital_products').update({ is_active: true }).in('id', ids);
      else if (action === 'deactivate') await supabase.from('digital_products').update({ is_active: false }).in('id', ids);
      else if (action === 'delete') await supabase.from('digital_products').delete().in('id', ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] });
      setSelectedIds(new Set());
      toast.success("বাল্ক অপারেশন সম্পন্ন");
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      await supabase.from('digital_product_reviews').update({ is_approved: approved }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-eproduct-reviews'] });
      toast.success("রিভিউ আপডেট হয়েছে");
    }
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
  const getTypeIcon = (type: string) => PRODUCT_TYPES.find(t => t.value === type)?.icon || Package;
  const getTypeLabel = (type: string) => PRODUCT_TYPES.find(t => t.value === type)?.label || type;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const statCards = [
    { label: 'মোট প্রোডাক্ট', value: stats.total, icon: Package, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950' },
    { label: 'সক্রিয়', value: stats.active, icon: Eye, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'মোট বিক্রি', value: stats.totalSales, icon: TrendingUp, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950' },
    { label: 'ডাউনলোড', value: stats.totalDownloads, icon: Download, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950' },
    { label: 'রেভিনিউ', value: `৳${stats.revenue.toLocaleString()}`, icon: BarChart3, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950' },
    { label: 'রিভিউ', value: stats.totalReviews, icon: MessageSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950' },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-primary" /> ই-প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">ডিজিটাল প্রোডাক্ট, লাইসেন্স, ভার্সন ও রিভিউ পরিচালনা</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border shadow-sm">
            <div className={`p-2 rounded-lg w-fit ${s.color} mb-2`}><s.icon className="w-4 h-4" /></div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stats.byType.map((t: any) => (
          <Badge key={t.value} variant={filterType === t.value ? 'default' : 'outline'} className="gap-1 py-1.5 px-3 cursor-pointer hover:bg-accent" onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </Badge>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="list"><Package className="w-4 h-4 mr-1" /> তালিকা</TabsTrigger>
            <TabsTrigger value="licenses"><Key className="w-4 h-4 mr-1" /> লাইসেন্স</TabsTrigger>
            <TabsTrigger value="versions"><GitBranch className="w-4 h-4 mr-1" /> ভার্সন</TabsTrigger>
            <TabsTrigger value="reviews"><MessageSquare className="w-4 h-4 mr-1" /> রিভিউ</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
          </TabsList>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> নতুন প্রোডাক্ট</Button>
        </div>

        <TabsContent value="list">
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4 flex-wrap">
              <span className="font-medium text-sm">{selectedIds.size}টি সিলেক্টেড</span>
              <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ action: 'activate', ids: Array.from(selectedIds) })}>সক্রিয়</Button>
              <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ action: 'deactivate', ids: Array.from(selectedIds) })}>নিষ্ক্রিয়</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm(`${selectedIds.size}টি মুছতে চান?`)) bulkMutation.mutate({ action: 'delete', ids: Array.from(selectedIds) }); }}>মুছুন</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>বাতিল</Button>
            </div>
          )}

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
                      <TableHead className="w-10">
                        <input type="checkbox" checked={selectedIds.size === products.length && products.length > 0} onChange={() => selectedIds.size === products.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(products.map((p: any) => p.id)))} className="rounded" />
                      </TableHead>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead>রেটিং</TableHead>
                      <TableHead>বিক্রি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item: any) => {
                      const TypeIcon = getTypeIcon(item.product_type);
                      return (
                        <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-primary/5' : ''}>
                          <TableCell><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></TableCell>
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
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span className="text-sm">{(item.avg_rating || 0).toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{item.total_sales || 0}</TableCell>
                          <TableCell><Switch checked={item.is_active} onCheckedChange={v => toggleActive.mutate({ id: item.id, active: v })} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="ভার্সন" onClick={() => { setSelectedVersionProductId(item.id); setShowVersionDialog(true); }}><GitBranch className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" title="লাইসেন্স" onClick={() => { setSelectedProductId(item.id); setShowLicenseDialog(true); }}><Key className="w-4 h-4" /></Button>
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
                <p className="text-sm text-muted-foreground">পেজ {currentPage} • মোট {stats.total}টি</p>
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
              {products.slice(0, 9).map((p: any) => (
                <div key={p.id} className="border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition" onClick={() => { setSelectedProductId(p.id); setShowLicenseDialog(true); }}>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{p.title_bn}</p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(p.product_type)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><GitBranch className="w-5 h-5" /> ভার্সন ম্যানেজমেন্ট</h3>
            <p className="text-sm text-muted-foreground mb-4">প্রোডাক্টের পাশে <GitBranch className="w-3 h-3 inline" /> আইকনে ক্লিক করে ভার্সন ম্যানেজ করুন</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.filter((p: any) => ['software', 'template', 'course'].includes(p.product_type)).slice(0, 9).map((p: any) => (
                <div key={p.id} className="border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition" onClick={() => { setSelectedVersionProductId(p.id); setShowVersionDialog(true); }}>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{p.title_bn}</p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(p.product_type)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 mx-auto mb-1 text-blue-500" /><p className="text-2xl font-bold">{stats.totalReviews}</p><p className="text-xs text-muted-foreground">মোট রিভিউ</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-500" /><p className="text-2xl font-bold">{allReviews.filter((r: any) => r.is_approved).length}</p><p className="text-xs text-muted-foreground">অনুমোদিত</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><Clock className="w-6 h-6 mx-auto mb-1 text-orange-500" /><p className="text-2xl font-bold">{allReviews.filter((r: any) => !r.is_approved).length}</p><p className="text-xs text-muted-foreground">পেন্ডিং</p></CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-4">
                {allReviews.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">কোনো রিভিউ নেই</p>
                ) : (
                  <div className="space-y-3">
                    {allReviews.map((review: any) => (
                      <div key={review.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />)}</div>
                            <span className="text-xs font-medium">{review.digital_products?.title_bn}</span>
                            <Badge variant={review.is_approved ? 'default' : 'outline'} className="text-[10px]">{review.is_approved ? 'অনুমোদিত' : 'পেন্ডিং'}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => approveReviewMutation.mutate({ id: review.id, approved: !review.is_approved })}>
                              {review.is_approved ? 'বাতিল' : <><CheckCircle className="w-3 h-3 mr-1" />অনুমোদন</>}
                            </Button>
                          </div>
                        </div>
                        {review.review_text && <p className="text-sm text-muted-foreground">{review.review_text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">মোট রেভিনিউ</p>
                  <p className="text-3xl font-bold text-primary">৳{stats.revenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">কনভার্সন রেট</p>
                  <p className="text-3xl font-bold">{stats.totalDownloads > 0 ? ((stats.totalSales / stats.totalDownloads) * 100).toFixed(1) : 0}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">গড় প্রোডাক্ট মূল্য</p>
                  <p className="text-3xl font-bold">৳{allProducts.length > 0 ? Math.round(allProducts.reduce((s, i) => s + (i.price || 0), 0) / allProducts.length) : 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">টাইপ অনুযায়ী বিক্রি ও রেভিনিউ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.byType.filter(t => t.count > 0)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      <Bar dataKey="sales" name="বিক্রি" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="count" name="প্রোডাক্ট" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">প্রোডাক্ট টাইপ ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={stats.byType.filter(t => t.count > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="label" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                        {stats.byType.filter(t => t.count > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Selling */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> সর্বোচ্চ বিক্রিত</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topSelling.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title_bn}</p>
                        <p className="text-xs text-muted-foreground">{getTypeLabel(item.product_type)} • {item.total_sales || 0} বিক্রি</p>
                      </div>
                      <span className="font-semibold text-sm">৳{((item.total_sales || 0) * (item.price || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                  {topSelling.length === 0 && <p className="text-center text-muted-foreground py-4">ডাটা নেই</p>}
                </div>
              </CardContent>
            </Card>
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
              <div><Label>বিবরণ (বাংলা)</Label><Textarea value={form.description_bn} onChange={e => setForm({ ...form, description_bn: e.target.value })} rows={3} /></div>
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
              <div><Label>মেটা ডেসক্রিপশন</Label><Textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} rows={2} /></div>
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
              <Textarea className="font-mono" value={newLicenseKeys} onChange={e => setNewLicenseKeys(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" rows={4} />
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

      {/* Version Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" /> ভার্সন ম্যানেজমেন্ট</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">নতুন ভার্সন যোগ করুন</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ভার্সন নম্বর *</Label><Input value={newVersion.version} onChange={e => setNewVersion({ ...newVersion, version: e.target.value })} placeholder="1.0.0" /></div>
                <div><Label>ফাইল সাইজ (MB)</Label><Input type="number" value={newVersion.file_size_mb} onChange={e => setNewVersion({ ...newVersion, file_size_mb: Number(e.target.value) })} /></div>
              </div>
              <div><Label>ফাইল URL</Label><Input value={newVersion.file_url} onChange={e => setNewVersion({ ...newVersion, file_url: e.target.value })} /></div>
              <div><Label>চেঞ্জলগ (বাংলা)</Label><Textarea value={newVersion.changelog_bn} onChange={e => setNewVersion({ ...newVersion, changelog_bn: e.target.value })} rows={2} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={newVersion.is_current} onCheckedChange={v => setNewVersion({ ...newVersion, is_current: v })} />
                <Label>বর্তমান ভার্সন হিসেবে সেট করুন</Label>
              </div>
              <Button size="sm" onClick={() => addVersionMutation.mutate()} disabled={!newVersion.version || addVersionMutation.isPending}>
                {addVersionMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-1" />}
                <Plus className="w-4 h-4 mr-1" /> যোগ করুন
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">ভার্সন হিস্টোরি ({versions.length})</h4>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">কোনো ভার্সন নেই</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v: any) => (
                    <div key={v.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={v.is_current ? 'default' : 'outline'}>v{v.version}</Badge>
                          {v.is_current && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">বর্তমান</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{v.release_date ? new Date(v.release_date).toLocaleDateString('bn-BD') : ''}</span>
                      </div>
                      {v.changelog_bn && <p className="text-sm text-muted-foreground mt-1">{v.changelog_bn}</p>}
                      {v.file_size_mb > 0 && <p className="text-xs text-muted-foreground mt-1">{v.file_size_mb} MB</p>}
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