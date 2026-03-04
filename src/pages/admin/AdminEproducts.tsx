import { useState, useRef, useMemo, useCallback } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Package, Plus, Search, Edit, Trash2, Eye, Download, Upload, Key,
  Filter, BarChart3, Tag, Shield, Settings, RefreshCw, Layers,
  ChevronLeft, ChevronRight, Monitor, Music, Video, FileArchive, Cpu, Copy,
  TrendingUp, Star, MessageSquare, CheckCircle, Clock, GitBranch, Award,
  AlertCircle, Globe, X, Loader2, Image as ImageIcon, ExternalLink, File,
  Hash,
} from "lucide-react";
import { EbookVersionManager } from "@/components/admin/ebook/EbookVersionManager";

const PRODUCT_TYPES = [
  { value: 'software', label: 'সফটওয়্যার', icon: Monitor },
  { value: 'audio', label: 'অডিও', icon: Music },
  { value: 'video', label: 'ভিডিও', icon: Video },
  { value: 'template', label: 'টেমপ্লেট', icon: FileArchive },
  { value: 'course', label: 'কোর্স', icon: Cpu },
  { value: 'graphics', label: 'গ্রাফিক্স', icon: Layers },
];

const FILE_FORMATS = ['zip', 'exe', 'msi', 'dmg', 'apk', 'ipa', 'tar.gz', 'rar', 'mp3', 'mp4', 'avi', 'mkv', 'psd', 'ai', 'fig'];
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const defaultForm = {
  title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
  product_type: 'software', category: '', subcategory: '', price: 0, original_price: 0,
  discount_percent: 0, cover_image: '', gallery_images: [] as string[],
  file_url: '', file_name: '', file_size_mb: 0, file_format: 'zip',
  preview_url: '', is_active: true, is_featured: false, is_free: false,
  max_downloads: 3, download_expiry_days: 30, drm_enabled: false, watermark_enabled: false,
  tags: [] as string[], meta_title: '', meta_description: '',
};

const AdminEproducts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [formTab, setFormTab] = useState("basic");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [newLicenseKeys, setNewLicenseKeys] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const perPage = 20;

  const [form, setForm] = useState<any>({ ...defaultForm });
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // ========== QUERIES ==========

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_bn, name_en, parent_id').eq('is_active', true).order('name_bn');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
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

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%,slug.ilike.%${search}%`);
      if (filterType !== 'all') q = q.eq('product_type', filterType);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);
      if (filterStatus === 'featured') q = q.eq('is_featured', true);
      if (filterStatus === 'free') q = q.eq('is_free', true);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-eproducts-analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_products')
        .select('id, title_bn, is_active, is_free, is_featured, product_type, total_sales, total_downloads, price, avg_rating, review_count, category, created_at')
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

  // ========== UPLOAD HELPERS ==========

  const uploadToStorage = async (file: File, bucket: string, folder: string): Promise<{ url: string; size: number }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return { url: publicUrl, size: Math.round((file.size / 1024 / 1024) * 100) / 100 };
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ফাইল সাইজ ৫MB এর বেশি"); return; }
    setUploadingCover(true);
    try {
      const { url } = await uploadToStorage(file, 'product-images', 'eproduct-covers');
      setForm((f: any) => ({ ...f, cover_image: url }));
      toast.success("কভার ইমেজ আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingCover(false); if (coverInputRef.current) coverInputRef.current.value = ''; }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) continue;
        const { url } = await uploadToStorage(file, 'product-images', 'eproduct-gallery');
        newUrls.push(url);
      }
      setForm((f: any) => ({ ...f, gallery_images: [...(f.gallery_images || []), ...newUrls] }));
      if (newUrls.length) toast.success(`${newUrls.length}টি ইমেজ আপলোড হয়েছে`);
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingGallery(false); if (galleryInputRef.current) galleryInputRef.current.value = ''; }
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast.error("ফাইল সাইজ ৫০০MB এর বেশি"); return; }
    setUploadingFile(true);
    try {
      const { url, size } = await uploadToStorage(file, 'digital-files', 'eproducts');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'zip';
      setForm((f: any) => ({ ...f, file_url: url, file_name: file.name, file_size_mb: size, file_format: ext }));
      toast.success("ফাইল আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("ফাইল সাইজ ২০MB এর বেশি"); return; }
    setUploadingPreview(true);
    try {
      const { url } = await uploadToStorage(file, 'product-previews', 'eproduct-previews');
      setForm((f: any) => ({ ...f, preview_url: url }));
      toast.success("প্রিভিউ আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingPreview(false); if (previewInputRef.current) previewInputRef.current.value = ''; }
  };

  const removeGalleryImage = (index: number) => {
    setForm((f: any) => ({ ...f, gallery_images: (f.gallery_images || []).filter((_: any, i: number) => i !== index) }));
  };

  // ========== SLUG CHECK ==========
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    try {
      let q = supabase.from('digital_products').select('id').eq('slug', slug);
      if (editingId) q = q.neq('id', editingId);
      const { data } = await q;
      setSlugAvailable(!data || data.length === 0);
    } catch { setSlugAvailable(null); }
    finally { setSlugChecking(false); }
  }, [editingId]);

  const autoCalcDiscount = useCallback((price: number, originalPrice: number) => {
    if (originalPrice > 0 && price > 0 && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  }, []);

  // ========== STATS ==========

  const stats = useMemo(() => ({
    total: allProducts.length,
    active: allProducts.filter(i => i.is_active).length,
    featured: allProducts.filter(i => i.is_featured).length,
    free: allProducts.filter(i => i.is_free).length,
    totalSales: allProducts.reduce((s, i) => s + (i.total_sales || 0), 0),
    totalDownloads: allProducts.reduce((s, i) => s + (i.total_downloads || 0), 0),
    revenue: allProducts.reduce((s, i) => s + ((i.total_sales || 0) * (i.price || 0)), 0),
    totalReviews: allProducts.reduce((s, i) => s + (i.review_count || 0), 0),
    byType: PRODUCT_TYPES.map(t => ({
      ...t,
      count: allProducts.filter(i => i.product_type === t.value).length,
      sales: allProducts.filter(i => i.product_type === t.value).reduce((s, x) => s + (x.total_sales || 0), 0),
      revenue: allProducts.filter(i => i.product_type === t.value).reduce((s, x) => s + ((x.total_sales || 0) * (x.price || 0)), 0),
    })),
  }), [allProducts]);

  const topSelling = useMemo(() => [...allProducts].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 10), [allProducts]);
  const topDownloaded = useMemo(() => [...allProducts].sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0)).slice(0, 10), [allProducts]);
  const topRated = useMemo(() => [...allProducts].filter(i => i.avg_rating).sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10), [allProducts]);

  // ========== MUTATIONS ==========

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
      setShowForm(false); setEditingId(null);
      toast.success(editingId ? "প্রোডাক্ট আপডেট হয়েছে" : "প্রোডাক্ট যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('digital_products').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] }); toast.success("প্রোডাক্ট মুছে ফেলা হয়েছে"); }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => { await supabase.from('digital_products').update({ is_active: active }).eq('id', id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] })
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      if (action === 'activate') await supabase.from('digital_products').update({ is_active: true }).in('id', ids);
      else if (action === 'deactivate') await supabase.from('digital_products').update({ is_active: false }).in('id', ids);
      else if (action === 'feature') await supabase.from('digital_products').update({ is_featured: true }).in('id', ids);
      else if (action === 'unfeature') await supabase.from('digital_products').update({ is_featured: false }).in('id', ids);
      else if (action === 'delete') await supabase.from('digital_products').delete().in('id', ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eproducts'] });
      queryClient.invalidateQueries({ queryKey: ['all-eproducts-analytics'] });
      setSelectedIds(new Set()); setShowBulkDialog(false); toast.success("বাল্ক অপারেশন সম্পন্ন");
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
      setNewLicenseKeys(""); toast.success("লাইসেন্স কী যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const approveReviewMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => { await supabase.from('digital_product_reviews').update({ is_approved: approved }).eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-eproduct-reviews'] }); toast.success("রিভিউ আপডেট হয়েছে"); }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('digital_product_reviews').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-eproduct-reviews'] }); toast.success("রিভিউ মুছে ফেলা হয়েছে"); }
  });

  // ========== HELPERS ==========

  const openEdit = (item: any) => {
    setForm({
      title_bn: item.title_bn || '', title_en: item.title_en || '', slug: item.slug || '',
      description_bn: item.description_bn || '', description_en: item.description_en || '',
      product_type: item.product_type || 'software', category: item.category || '', subcategory: item.subcategory || '',
      price: item.price || 0, original_price: item.original_price || 0, discount_percent: item.discount_percent || 0,
      cover_image: item.cover_image || '', gallery_images: item.gallery_images || [],
      file_url: item.file_url || '', file_name: item.file_name || '',
      file_size_mb: item.file_size_mb || 0, file_format: item.file_format || 'zip',
      preview_url: item.preview_url || '', is_active: item.is_active, is_featured: item.is_featured || false,
      is_free: item.is_free || false, max_downloads: item.max_downloads || 3,
      download_expiry_days: item.download_expiry_days || 30, drm_enabled: item.drm_enabled || false,
      watermark_enabled: item.watermark_enabled || false,
      tags: item.tags || [], meta_title: item.meta_title || '', meta_description: item.meta_description || '',
    });
    setEditingId(item.id); setFormTab("basic"); setShowForm(true); setSlugAvailable(null);
  };

  const openNew = () => {
    setForm({ ...defaultForm }); setEditingId(null); setFormTab("basic"); setShowForm(true); setSlugAvailable(null);
  };

  const duplicateItem = (item: any) => {
    openEdit(item);
    setEditingId(null);
    setForm((f: any) => ({ ...f, title_bn: f.title_bn + ' (কপি)', slug: f.slug + '-copy' }));
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  const getTypeIcon = (type: string) => PRODUCT_TYPES.find(t => t.value === type)?.icon || Package;
  const getTypeLabel = (type: string) => PRODUCT_TYPES.find(t => t.value === type)?.label || type;

  const toggleSelect = (id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { setSelectedIds(selectedIds.size === products.length ? new Set() : new Set(products.map((e: any) => e.id))); };

  const parentCategories = categories.filter((c: any) => !c.parent_id);
  const subCategories = categories.filter((c: any) => c.parent_id === form.category);

  const formTabStatus = useMemo(() => ({
    basic: !!(form.title_bn && form.slug),
    files: !!form.file_url,
    pricing: form.price > 0 || form.is_free,
    protection: true,
    seo: !!(form.meta_title || form.meta_description),
  }), [form]);

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleProductFileUpload} className="hidden" />
      <input ref={previewInputRef} type="file" accept="image/*,.pdf,.mp4,.webm" onChange={handlePreviewUpload} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
    </>
  );

  const statCards = [
    { label: 'মোট প্রোডাক্ট', value: stats.total, icon: Package, color: 'text-primary bg-primary/10' },
    { label: 'সক্রিয়', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'ফিচার্ড', value: stats.featured, icon: Award, color: 'text-amber-600 bg-amber-500/10' },
    { label: 'ফ্রি', value: stats.free, icon: Tag, color: 'text-teal-600 bg-teal-500/10' },
    { label: 'মোট বিক্রি', value: stats.totalSales, icon: TrendingUp, color: 'text-purple-600 bg-purple-500/10' },
    { label: 'ডাউনলোড', value: stats.totalDownloads, icon: Download, color: 'text-cyan-600 bg-cyan-500/10' },
    { label: 'রেভিনিউ', value: `৳${stats.revenue.toLocaleString()}`, icon: BarChart3, color: 'text-rose-600 bg-rose-500/10' },
    { label: 'রিভিউ', value: stats.totalReviews, icon: MessageSquare, color: 'text-indigo-600 bg-indigo-500/10' },
  ];

  return (
    <AdminLayout>
      {hiddenInputs}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-primary" /> ই-প্রোডাক্ট ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-0.5">সফটওয়্যার, অডিও, ভিডিও, টেমপ্লেট ও ডিজিটাল প্রোডাক্ট পরিচালনা</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-sm"><Plus className="w-4 h-4" /> নতুন প্রোডাক্ট</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {statCards.map((s, i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className={`p-1.5 rounded-lg w-fit ${s.color} mb-1.5`}><s.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Type filter badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stats.byType.map((t: any) => (
          <Badge key={t.value} variant={filterType === t.value ? 'default' : 'outline'} className="gap-1 py-1.5 px-3 cursor-pointer hover:bg-accent transition-colors" onClick={() => { setFilterType(filterType === t.value ? 'all' : t.value); setCurrentPage(1); }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </Badge>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap mb-4">
          <TabsTrigger value="list"><Package className="w-4 h-4 mr-1" /> তালিকা</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
          <TabsTrigger value="reviews"><MessageSquare className="w-4 h-4 mr-1" /> রিভিউ</TabsTrigger>
          <TabsTrigger value="rankings"><Award className="w-4 h-4 mr-1" /> র‍্যাঙ্কিং</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> সেটিংস</TabsTrigger>
        </TabsList>

        {/* ===== LIST TAB ===== */}
        <TabsContent value="list">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4 flex-wrap">
              <span className="font-medium text-sm">{selectedIds.size}টি সিলেক্টেড</span>
              <Button size="sm" variant="outline" onClick={() => { setBulkAction('activate'); setShowBulkDialog(true); }}>সক্রিয়</Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkAction('deactivate'); setShowBulkDialog(true); }}>নিষ্ক্রিয়</Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkAction('feature'); setShowBulkDialog(true); }}>ফিচার্ড</Button>
              <Button size="sm" variant="destructive" onClick={() => { setBulkAction('delete'); setShowBulkDialog(true); }}>মুছুন</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>বাতিল</Button>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="নাম, স্লাগ দিয়ে খুঁজুন..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            <Select value={filterType} onValueChange={v => { setFilterType(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="active">সক্রিয়</SelectItem>
                <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                <SelectItem value="featured">ফিচার্ড</SelectItem>
                <SelectItem value="free">ফ্রি</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">কোনো ই-প্রোডাক্ট পাওয়া যায়নি</p>
              <p className="text-sm">ফিল্টার পরিবর্তন করুন অথবা নতুন প্রোডাক্ট যোগ করুন</p>
            </div>
          ) : (
            <>
              <Card className="shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><input type="checkbox" checked={selectedIds.size === products.length && products.length > 0} onChange={toggleSelectAll} className="rounded" /></TableHead>
                      <TableHead>প্রোডাক্ট</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead className="text-center">রেটিং</TableHead>
                      <TableHead className="text-center">বিক্রি</TableHead>
                      <TableHead className="text-center">ডাউনলোড</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item: any) => {
                      const TypeIcon = getTypeIcon(item.product_type);
                      return (
                        <TableRow key={item.id} className={`${selectedIds.has(item.id) ? 'bg-primary/5' : ''} hover:bg-muted/40 transition-colors`}>
                          <TableCell><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setDetailItem(item); setShowDetailDialog(true); }}>
                              <img src={item.cover_image || '/placeholder.svg'} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted shadow-sm" />
                              <div>
                                <p className="font-medium line-clamp-1 hover:text-primary transition-colors">{item.title_bn}</p>
                                {item.title_en && <p className="text-xs text-muted-foreground line-clamp-1">{item.title_en}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1 text-xs"><TypeIcon className="w-3 h-3" /> {getTypeLabel(item.product_type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.is_free ? (
                              <Badge variant="secondary" className="text-xs">ফ্রি</Badge>
                            ) : (
                              <div>
                                <span className="font-semibold">৳{item.price}</span>
                                {item.original_price > item.price && (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through ml-1">৳{item.original_price}</span>
                                    <Badge variant="outline" className="text-[9px] ml-1 py-0 text-destructive">
                                      -{Math.round(((item.original_price - item.price) / item.original_price) * 100)}%
                                    </Badge>
                                  </>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span className="text-sm font-medium">{(item.avg_rating || 0).toFixed(1)}</span>
                              <span className="text-[10px] text-muted-foreground">({item.review_count || 0})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{item.total_sales || 0}</TableCell>
                          <TableCell className="text-center font-medium">{item.total_downloads || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Switch checked={item.is_active} onCheckedChange={v => toggleActive.mutate({ id: item.id, active: v })} />
                              {item.is_featured && <Badge variant="outline" className="text-[10px] py-0">★</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <TooltipProvider>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedProductId(item.id); setShowLicenseDialog(true); }}><Key className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>লাইসেন্স</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(item)}><Copy className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>ডুপ্লিকেট</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>এডিট</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("এই প্রোডাক্ট মুছে ফেলতে চান?")) deleteMutation.mutate(item.id); }}><Trash2 className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>মুছুন</TooltipContent></Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
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

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">মোট রেভিনিউ</p>
                  <p className="text-3xl font-bold text-primary">৳{stats.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">গড় মূল্য: ৳{allProducts.length > 0 ? Math.round(allProducts.reduce((s, i) => s + (i.price || 0), 0) / allProducts.length) : 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">কনভার্সন রেট</p>
                  <p className="text-3xl font-bold">{stats.totalDownloads > 0 ? ((stats.totalSales / stats.totalDownloads) * 100).toFixed(1) : 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">ডাউনলোড → বিক্রি</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">গড় রেটিং</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold">{allProducts.length > 0 ? (allProducts.reduce((s, i) => s + (i.avg_rating || 0), 0) / (allProducts.filter(i => i.avg_rating).length || 1)).toFixed(1) : '0.0'}</p>
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= 4 ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalReviews}টি রিভিউ থেকে</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">টাইপ অনুযায়ী বিক্রি</CardTitle></CardHeader>
                <CardContent>
                  {stats.byType.filter(t => t.count > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.byType.filter(t => t.count > 0)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="sales" name="বিক্রি" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="count" name="প্রোডাক্ট" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">প্রোডাক্ট টাইপ ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                <CardContent>
                  {stats.byType.filter(t => t.count > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={stats.byType.filter(t => t.count > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="label" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                          {stats.byType.filter(t => t.count > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">টাইপ অনুযায়ী রেভিনিউ বিশ্লেষণ</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>টাইপ</TableHead><TableHead>সংখ্যা</TableHead><TableHead>বিক্রি</TableHead><TableHead>রেভিনিউ</TableHead><TableHead>শেয়ার</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stats.byType.filter(t => t.count > 0).sort((a, b) => b.revenue - a.revenue).map((t: any) => (
                      <TableRow key={t.value}>
                        <TableCell className="font-medium"><div className="flex items-center gap-2"><t.icon className="w-4 h-4 text-muted-foreground" />{t.label}</div></TableCell>
                        <TableCell>{t.count}</TableCell>
                        <TableCell>{t.sales}</TableCell>
                        <TableCell className="font-semibold">৳{t.revenue.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={stats.revenue > 0 ? (t.revenue / stats.revenue) * 100 : 0} className="h-2 w-20" />
                            <span className="text-xs">{stats.revenue > 0 ? ((t.revenue / stats.revenue) * 100).toFixed(0) : 0}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== REVIEWS TAB ===== */}
        <TabsContent value="reviews">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="p-4 text-center"><MessageSquare className="w-6 h-6 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{stats.totalReviews}</p><p className="text-xs text-muted-foreground">মোট রিভিউ</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-600" /><p className="text-2xl font-bold">{allReviews.filter((r: any) => r.is_approved).length}</p><p className="text-xs text-muted-foreground">অনুমোদিত</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><Clock className="w-6 h-6 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{allReviews.filter((r: any) => !r.is_approved).length}</p><p className="text-xs text-muted-foreground">পেন্ডিং</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">সাম্প্রতিক রিভিউ</CardTitle></CardHeader>
              <CardContent>
                {allReviews.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">কোনো রিভিউ নেই</p>
                ) : (
                  <div className="space-y-3">
                    {allReviews.map((review: any) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />)}</div>
                            <span className="text-xs font-medium">{review.digital_products?.title_bn}</span>
                            <Badge variant={review.is_approved ? 'default' : 'outline'} className="text-[10px]">{review.is_approved ? 'অনুমোদিত' : 'পেন্ডিং'}</Badge>
                            {review.is_verified_purchase && <Badge variant="secondary" className="text-[10px]">✓ ভেরিফাইড</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('bn-BD')}</span>
                        </div>
                        {review.review_text && <p className="text-sm">{review.review_text}</p>}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => approveReviewMutation.mutate({ id: review.id, approved: !review.is_approved })}>{review.is_approved ? 'বাতিল' : 'অনুমোদন'}</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteReviewMutation.mutate(review.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== RANKINGS TAB ===== */}
        <TabsContent value="rankings">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { title: 'সর্বাধিক বিক্রিত', data: topSelling, field: 'total_sales', suffix: ' বিক্রি' },
              { title: 'সর্বাধিক ডাউনলোডেড', data: topDownloaded, field: 'total_downloads', suffix: ' ডাউনলোড' },
              { title: 'সর্বোচ্চ রেটিং', data: topRated, field: 'avg_rating', suffix: '', isRating: true },
            ].map(({ title, data, field, suffix, isRating }) => (
              <Card key={title}>
                <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title_bn}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{getTypeLabel(item.product_type)}</Badge>
                            {isRating ? (
                              <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="text-xs">{(item[field as keyof typeof item] as number || 0).toFixed(1)}</span></div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{item[field as keyof typeof item] || 0}{suffix}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">ডাটা নেই</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> ই-প্রোডাক্ট সেটিংস</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3"><Label>ডিফল্ট ডাউনলোড লিমিট</Label><Input type="number" defaultValue={3} /></div>
                <div className="space-y-3"><Label>ডিফল্ট এক্সপায়ারি (দিন)</Label><Input type="number" defaultValue={30} /></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={false} id="drm-default-ep" /><Label htmlFor="drm-default-ep">DRM ডিফল্ট সক্রিয়</Label></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={false} id="watermark-default-ep" /><Label htmlFor="watermark-default-ep">ওয়াটারমার্ক ডিফল্ট সক্রিয়</Label></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={true} id="auto-approve-ep" /><Label htmlFor="auto-approve-ep">রিভিউ অটো অনুমোদন</Label></div>
                <div className="space-y-3"><Label>সর্বোচ্চ ফাইল সাইজ (MB)</Label><Input type="number" defaultValue={500} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent><DialogHeader><DialogTitle>বাল্ক অ্যাকশন নিশ্চিত করুন</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{selectedIds.size}টি প্রোডাক্টে অ্যাকশন প্রয়োগ করতে চান?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>বাতিল</Button>
            <Button variant={bulkAction === 'delete' ? 'destructive' : 'default'} onClick={() => bulkMutation.mutate({ action: bulkAction, ids: Array.from(selectedIds) })}>
              {bulkMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-1" />} নিশ্চিত
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailItem && (() => {
            const TypeIcon = getTypeIcon(detailItem.product_type);
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> প্রোডাক্ট বিস্তারিত</DialogTitle></DialogHeader>
                <div className="flex gap-5">
                  <img src={detailItem.cover_image || '/placeholder.svg'} alt="" className="w-28 h-28 rounded-xl object-cover border shadow-sm" />
                  <div className="space-y-2 flex-1">
                    <h3 className="font-bold text-lg">{detailItem.title_bn}</h3>
                    {detailItem.title_en && <p className="text-sm text-muted-foreground">{detailItem.title_en}</p>}
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary" className="gap-1"><TypeIcon className="w-3 h-3" /> {getTypeLabel(detailItem.product_type)}</Badge>
                      {detailItem.file_format && <Badge variant="outline" className="font-mono text-xs">{detailItem.file_format.toUpperCase()}</Badge>}
                      {detailItem.file_size_mb > 0 && <Badge variant="outline" className="text-xs">{detailItem.file_size_mb}MB</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.is_free ? 'ফ্রি' : `৳${detailItem.price}`}</p><p className="text-[10px] text-muted-foreground">মূল্য</p></div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.total_sales || 0}</p><p className="text-[10px] text-muted-foreground">বিক্রি</p></div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.total_downloads || 0}</p><p className="text-[10px] text-muted-foreground">ডাউনলোড</p></div>
                    </div>
                  </div>
                </div>
                {/* Version Manager */}
                <div className="mt-4 pt-4 border-t">
                  <EbookVersionManager digitalProductId={detailItem.id} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedProductId(detailItem.id); setShowLicenseDialog(true); }}>
                    <Key className="w-4 h-4 mr-1" /> লাইসেন্স
                  </Button>
                  <Button variant="outline" onClick={() => { setShowDetailDialog(false); openEdit(detailItem); }}>
                    <Edit className="w-4 h-4 mr-1" /> এডিট করুন
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* License Dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> লাইসেন্স কী ম্যানেজমেন্ট</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">নতুন লাইসেন্স কী যোগ করুন</h4>
              <Textarea className="font-mono text-sm" value={newLicenseKeys} onChange={e => setNewLicenseKeys(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY" rows={4} />
              <p className="text-xs text-muted-foreground">প্রতি লাইনে একটি লাইসেন্স কী লিখুন</p>
              <Button size="sm" onClick={() => addLicensesMutation.mutate()} disabled={!newLicenseKeys.trim() || addLicensesMutation.isPending}>
                {addLicensesMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <Plus className="w-4 h-4 mr-1" /> যোগ করুন
              </Button>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                বিদ্যমান লাইসেন্স
                <Badge variant="outline" className="text-[10px]">{licenses.length}টি</Badge>
              </h4>
              {licenses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">কোনো লাইসেন্স নেই</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {licenses.map((lic: any) => (
                    <div key={lic.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                      <div>
                        <code className="text-sm font-mono font-medium">{lic.license_key}</code>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={lic.status === 'available' ? 'secondary' : lic.status === 'assigned' ? 'default' : 'destructive'} className="text-[10px]">{lic.status || 'available'}</Badge>
                          <span className="text-[10px] text-muted-foreground">{lic.activation_count || 0}/{lic.max_activations || 1} activated</span>
                          {lic.expires_at && <span className="text-[10px] text-muted-foreground">মেয়াদ: {new Date(lic.expires_at).toLocaleDateString('bn-BD')}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(lic.license_key); toast.success("কপি হয়েছে"); }}><Copy className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FORM DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editingId ? 'প্রোডাক্ট এডিট করুন' : 'নতুন ই-প্রোডাক্ট যোগ করুন'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
            <TabsList className="w-full flex flex-wrap gap-0.5">
              {[
                { value: 'basic', label: 'বেসিক', icon: Package },
                { value: 'files', label: 'ফাইল ও মিডিয়া', icon: Upload },
                { value: 'pricing', label: 'মূল্য', icon: Tag },
                { value: 'protection', label: 'সুরক্ষা', icon: Shield },
                { value: 'seo', label: 'SEO', icon: Globe },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 relative">
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {formTabStatus[tab.value as keyof typeof formTabStatus] && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* BASIC TAB */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>শিরোনাম (বাংলা) *</Label>
                  <Input value={form.title_bn} onChange={e => {
                    const newSlug = generateSlug(e.target.value);
                    setForm({ ...form, title_bn: e.target.value, slug: newSlug });
                    checkSlug(newSlug);
                  }} placeholder="প্রোডাক্টের নাম লিখুন" />
                </div>
                <div><Label>শিরোনাম (ইংরেজি)</Label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} placeholder="Product title" /></div>
                <div>
                  <Label className="flex items-center gap-2">
                    স্লাগ *
                    {slugChecking && <Loader2 className="w-3 h-3 animate-spin" />}
                    {slugAvailable === true && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    {slugAvailable === false && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                  </Label>
                  <Input value={form.slug} onChange={e => { setForm({ ...form, slug: e.target.value }); checkSlug(e.target.value); }}
                    className={slugAvailable === false ? 'border-destructive' : slugAvailable === true ? 'border-emerald-500' : ''}
                  />
                  {slugAvailable === false && <p className="text-xs text-destructive mt-1">এই স্লাগটি ইতিমধ্যে ব্যবহৃত</p>}
                </div>
                <div>
                  <Label>প্রোডাক্ট টাইপ *</Label>
                  <Select value={form.product_type} onValueChange={v => setForm({ ...form, product_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ক্যাটাগরি</Label>
                  <Select value={form.category || 'none'} onValueChange={v => setForm({ ...form, category: v === 'none' ? '' : v, subcategory: '' })}>
                    <SelectTrigger><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">নির্বাচন করুন</SelectItem>
                      {parentCategories.map((c: any) => <SelectItem key={c.id} value={c.name_bn}>{c.name_bn}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {subCategories.length > 0 && (
                  <div>
                    <Label>সাব-ক্যাটাগরি</Label>
                    <Select value={form.subcategory || 'none'} onValueChange={v => setForm({ ...form, subcategory: v === 'none' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="সাব-ক্যাটাগরি" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">নির্বাচন করুন</SelectItem>
                        {subCategories.map((c: any) => <SelectItem key={c.id} value={c.name_bn}>{c.name_bn}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div><Label>বিবরণ (বাংলা)</Label><Textarea value={form.description_bn} onChange={e => setForm({ ...form, description_bn: e.target.value })} rows={4} placeholder="প্রোডাক্টের বিস্তারিত বিবরণ..." /></div>
              <div><Label>বিবরণ (ইংরেজি)</Label><Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3} /></div>

              {/* Cover Image */}
              <div>
                <Label className="mb-2 block">কভার ইমেজ</Label>
                <div className="flex items-start gap-4">
                  {form.cover_image ? (
                    <div className="relative group">
                      <img src={form.cover_image} alt="কভার" className="w-24 h-24 object-cover rounded-xl border shadow-sm" />
                      <button type="button" onClick={() => setForm({ ...form, cover_image: '' })} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                      {uploadingCover ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> আপলোড হচ্ছে...</> : <><Upload className="w-4 h-4 mr-1" /> আপলোড</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG/PNG/WEBP, সর্বোচ্চ ৫MB</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>সক্রিয়</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} /><Label>ফিচার্ড</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_free} onCheckedChange={v => setForm({ ...form, is_free: v })} /><Label>ফ্রি</Label></div>
              </div>
            </TabsContent>

            {/* FILES & MEDIA TAB */}
            <TabsContent value="files" className="space-y-6 mt-4">
              {/* Product File Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><File className="w-4 h-4 text-primary" /> প্রোডাক্ট ফাইল</h4>
                {form.file_url ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <File className="w-8 h-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{form.file_name || 'product-file'}</p>
                      <p className="text-xs text-muted-foreground">{form.file_size_mb}MB • {(form.file_format || 'zip').toUpperCase()}</p>
                    </div>
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" /></a>
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, file_url: '', file_name: '', file_size_mb: 0 })}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    {uploadingFile ? (
                      <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>আপলোড হচ্ছে...</span></div>
                    ) : (
                      <><Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm">যেকোনো ফাইল আপলোড করুন</p><p className="text-xs text-muted-foreground">ZIP, EXE, MSI, APK, DMG ইত্যাদি • সর্বোচ্চ ৫০০MB</p></>
                    )}
                  </div>
                )}
                <div><Label>ফাইল ফরম্যাট</Label>
                  <Select value={form.file_format || 'zip'} onValueChange={v => setForm({ ...form, file_format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILE_FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> প্রিভিউ / ডেমো</h4>
                {form.preview_url ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <Eye className="w-6 h-6 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">প্রিভিউ আপলোড হয়েছে</p>
                      <a href={form.preview_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">দেখুন</a>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, preview_url: '' })}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => previewInputRef.current?.click()}>
                    {uploadingPreview ? (
                      <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>আপলোড হচ্ছে...</span></div>
                    ) : (
                      <><p className="text-sm">প্রিভিউ/ডেমো ফাইল আপলোড করুন</p><p className="text-xs text-muted-foreground">ইমেজ, PDF, ভিডিও • সর্বোচ্চ ২০MB</p></>
                    )}
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4 text-emerald-600" /> স্ক্রিনশট গ্যালারি</h4>
                {(form.gallery_images || []).length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {(form.gallery_images || []).map((url: string, i: number) => (
                      <div key={i} className="relative group aspect-video">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-lg border" />
                        <button type="button" onClick={() => removeGalleryImage(i)} className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}>
                  {uploadingGallery ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> আপলোড হচ্ছে...</> : <><Plus className="w-4 h-4 mr-1" /> স্ক্রিনশট যোগ করুন</>}
                </Button>
              </div>

              {/* Version Manager for existing */}
              {editingId && (
                <div className="border rounded-lg p-4">
                  <EbookVersionManager digitalProductId={editingId} />
                </div>
              )}
            </TabsContent>

            {/* PRICING TAB */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>মূল্য (৳) *</Label>
                  <Input type="number" value={form.price} onChange={e => {
                    const price = Number(e.target.value);
                    setForm({ ...form, price, discount_percent: autoCalcDiscount(price, form.original_price) });
                  }} />
                </div>
                <div>
                  <Label>আসল মূল্য (৳)</Label>
                  <Input type="number" value={form.original_price} onChange={e => {
                    const originalPrice = Number(e.target.value);
                    setForm({ ...form, original_price: originalPrice, discount_percent: autoCalcDiscount(form.price, originalPrice) });
                  }} />
                </div>
                <div>
                  <Label>ডিসকাউন্ট %</Label>
                  <Input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} />
                  {form.discount_percent > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">সেভ: ৳{Math.round(form.original_price - form.price)}</p>
                  )}
                </div>
              </div>
              {form.is_free && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">এই প্রোডাক্টটি ফ্রি হিসেবে সেট করা আছে। মূল্য প্রযোজ্য হবে না।</span>
                </div>
              )}
            </TabsContent>

            {/* PROTECTION TAB */}
            <TabsContent value="protection" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>সর্বোচ্চ ডাউনলোড</Label><Input type="number" value={form.max_downloads} onChange={e => setForm({ ...form, max_downloads: Number(e.target.value) })} /></div>
                <div><Label>এক্সপায়ারি (দিন)</Label><Input type="number" value={form.download_expiry_days} onChange={e => setForm({ ...form, download_expiry_days: Number(e.target.value) })} /></div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.drm_enabled} onCheckedChange={v => setForm({ ...form, drm_enabled: v })} /><Label>DRM সুরক্ষা</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.watermark_enabled} onCheckedChange={v => setForm({ ...form, watermark_enabled: v })} /><Label>ওয়াটারমার্ক</Label></div>
              </div>
              {(form.drm_enabled || form.watermark_enabled) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 inline mr-1 text-primary" />
                  {form.drm_enabled && "DRM সুরক্ষা সক্রিয় — অননুমোদিত কপি রোধ করবে। "}
                  {form.watermark_enabled && "ওয়াটারমার্ক সক্রিয় — ক্রেতার তথ্য ফাইলে এম্বেড হবে।"}
                </div>
              )}
            </TabsContent>

            {/* SEO TAB */}
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div>
                <Label className="flex items-center justify-between">
                  মেটা টাইটেল
                  <span className={`text-xs ${(form.meta_title?.length || 0) > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.meta_title?.length || 0}/60
                  </span>
                </Label>
                <Input value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} placeholder="SEO টাইটেল" />
              </div>
              <div>
                <Label className="flex items-center justify-between">
                  মেটা ডেসক্রিপশন
                  <span className={`text-xs ${(form.meta_description?.length || 0) > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.meta_description?.length || 0}/160
                  </span>
                </Label>
                <Textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} rows={3} placeholder="SEO ডেসক্রিপশন" />
              </div>
              <div><Label>ট্যাগ (কমা দিয়ে আলাদা)</Label><Input value={(form.tags || []).join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })} placeholder="সফটওয়্যার, টুল, অ্যাপ" /></div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(form.tags || []).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((_: any, idx: number) => idx !== i) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* SEO Preview */}
              {(form.meta_title || form.title_bn) && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">গুগল প্রিভিউ</p>
                  <p className="text-primary text-base font-medium line-clamp-1">{form.meta_title || form.title_bn}</p>
                  <p className="text-xs text-emerald-700 line-clamp-1">boialo.lovable.app/eproducts/{form.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{form.meta_description || form.description_bn?.substring(0, 160)}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {Object.values(formTabStatus).filter(Boolean).length}/5 ট্যাব সম্পূর্ণ
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>বাতিল</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.title_bn || !form.slug || slugAvailable === false}>
                {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEproducts;
