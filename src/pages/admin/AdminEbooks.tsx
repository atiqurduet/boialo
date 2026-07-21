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
  BookOpen, Plus, Search, Edit, Trash2, Eye, Download, Star, Upload,
  FileText, Filter, BarChart3, Tag, Globe, Shield, Settings, RefreshCw,
  ChevronLeft, ChevronRight, Loader2, X, Image as ImageIcon,
  TrendingUp, Award, MessageSquare, Clock, CheckCircle,
  Headphones, Music, File, Copy, ExternalLink, AlertCircle,
  Layers, Hash,
} from "lucide-react";
import { EbookTOCEditor } from "@/components/admin/ebook/EbookTOCEditor";
import { EbookVersionManager } from "@/components/admin/ebook/EbookVersionManager";
import { SearchableWriterSelect } from "@/components/admin/ebook/SearchableWriterSelect";

const LANGUAGES = [
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'ur', label: 'اردو' },
  { value: 'hi', label: 'हिन्दी' },
];

const FORMATS = ['pdf', 'epub', 'mobi', 'djvu'];
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const defaultForm = {
  title_bn: '', title_en: '', slug: '', description_bn: '', description_en: '',
  product_type: 'ebook', category: '', subcategory: '', price: 0, original_price: 0, discount_percent: 0,
  cover_image: '', gallery_images: [] as string[], file_url: '', file_name: '', file_size_mb: 0, file_format: 'pdf',
  preview_url: '', preview_pages: 10, is_active: true, is_featured: false, is_free: false,
  max_downloads: 5, download_expiry_days: 365, drm_enabled: false, watermark_enabled: false,
  tags: [] as string[], meta_title: '', meta_description: '',
  isbn: '', language: 'bn', page_count: 0, publisher: '', publisher_id: 'none', author: '', author_id: 'none',
  translator: '', translator_id: 'none', edition: '', publish_year: new Date().getFullYear(), format: 'pdf',
  has_audio: false, audio_url: '', audio_duration_minutes: 0, sample_chapter_url: '',
  table_of_contents: [] as any[],
};

const AdminEbooks = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReviewProduct, setSelectedReviewProduct] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const perPage = 20;

  const [formTab, setFormTab] = useState("basic");
  const [form, setForm] = useState<any>({ ...defaultForm });
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // ========== DATA QUERIES ==========

  const { data: writers = [] } = useQuery({
    queryKey: ['admin-writers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('writers').select('id, name_bn, name_en').order('name_bn');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: publishers = [] } = useQuery({
    queryKey: ['admin-publishers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('publishers').select('id, name_bn, name_en').order('name_bn');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_bn, name_en, parent_id').eq('is_active', true).order('name_bn');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: ebooks = [], isLoading } = useQuery({
    queryKey: ['admin-ebooks', search, filterStatus, filterCategory, filterFormat, currentPage],
    queryFn: async () => {
      let q = supabase
        .from('digital_products')
        .select('*, ebook_metadata(*)')
        .eq('product_type', 'ebook')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * perPage, currentPage * perPage - 1);

      if (search) q = q.or(`title_bn.ilike.%${search}%,title_en.ilike.%${search}%,slug.ilike.%${search}%`);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);
      if (filterStatus === 'featured') q = q.eq('is_featured', true);
      if (filterStatus === 'free') q = q.eq('is_free', true);
      if (filterCategory !== 'all') q = q.eq('category', filterCategory);
      if (filterFormat !== 'all') q = q.eq('file_format', filterFormat);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: allEbooks = [] } = useQuery({
    queryKey: ['all-ebooks-analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_products')
        .select('id, title_bn, is_active, is_free, is_featured, total_sales, total_downloads, price, avg_rating, review_count, created_at, category, file_format')
        .eq('product_type', 'ebook');
      return data || [];
    }
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['ebook-reviews', selectedReviewProduct],
    queryFn: async () => {
      if (!selectedReviewProduct) return [];
      const { data } = await supabase.from('digital_product_reviews')
        .select('*')
        .eq('digital_product_id', selectedReviewProduct)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!selectedReviewProduct
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['all-ebook-reviews'],
    queryFn: async () => {
      const { data } = await supabase.from('digital_product_reviews')
        .select('*, digital_products!inner(product_type)')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []).filter((r: any) => r.digital_products?.product_type === 'ebook');
    }
  });

  // ========== UPLOAD HELPERS ==========

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<{ url: string; size: number }> => {
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
      const { url } = await uploadFile(file, 'product-images', 'ebook-covers');
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
        const { url } = await uploadFile(file, 'product-images', 'ebook-gallery');
        newUrls.push(url);
      }
      setForm((f: any) => ({ ...f, gallery_images: [...(f.gallery_images || []), ...newUrls] }));
      if (newUrls.length) toast.success(`${newUrls.length}টি ইমেজ আপলোড হয়েছে`);
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingGallery(false); if (galleryInputRef.current) galleryInputRef.current.value = ''; }
  };

  const handleEbookFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("ফাইল সাইজ ১০০MB এর বেশি"); return; }
    setUploadingFile(true);
    try {
      const { url, size } = await uploadFile(file, 'digital-files', 'ebooks');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setForm((f: any) => ({ ...f, file_url: url, file_name: file.name, file_size_mb: size, file_format: ext }));
      toast.success("ই-বুক ফাইল আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('audio/')) { toast.error("অডিও ফাইল দিন"); return; }
    if (file.size > 200 * 1024 * 1024) { toast.error("ফাইল সাইজ ২০০MB এর বেশি"); return; }
    setUploadingAudio(true);
    try {
      const { url } = await uploadFile(file, 'digital-files', 'audiobooks');
      setForm((f: any) => ({ ...f, audio_url: url, has_audio: true }));
      toast.success("অডিও ফাইল আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingAudio(false); if (audioInputRef.current) audioInputRef.current.value = ''; }
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("ফাইল সাইজ ১০MB এর বেশি"); return; }
    setUploadingPreview(true);
    try {
      const { url } = await uploadFile(file, 'product-previews', 'ebook-previews');
      setForm((f: any) => ({ ...f, preview_url: url }));
      toast.success("প্রিভিউ আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingPreview(false); if (previewInputRef.current) previewInputRef.current.value = ''; }
  };

  const handleSampleChapterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("ফাইল সাইজ ২০MB এর বেশি"); return; }
    setUploadingSample(true);
    try {
      const { url } = await uploadFile(file, 'product-previews', 'sample-chapters');
      setForm((f: any) => ({ ...f, sample_chapter_url: url }));
      toast.success("স্যাম্পল চ্যাপ্টার আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploadingSample(false); if (sampleInputRef.current) sampleInputRef.current.value = ''; }
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

  // ========== AUTO DISCOUNT CALC ==========
  const autoCalcDiscount = useCallback((price: number, originalPrice: number) => {
    if (originalPrice > 0 && price > 0 && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  }, []);

  // ========== STATS ==========

  const stats = useMemo(() => ({
    total: allEbooks.length,
    active: allEbooks.filter(i => i.is_active).length,
    featured: allEbooks.filter(i => i.is_featured).length,
    free: allEbooks.filter(i => i.is_free).length,
    totalSales: allEbooks.reduce((s, i) => s + (i.total_sales || 0), 0),
    totalDownloads: allEbooks.reduce((s, i) => s + (i.total_downloads || 0), 0),
    revenue: allEbooks.reduce((s, i) => s + ((i.total_sales || 0) * (i.price || 0)), 0),
    avgRating: allEbooks.length > 0 ? allEbooks.reduce((s, i) => s + (i.avg_rating || 0), 0) / (allEbooks.filter(i => i.avg_rating).length || 1) : 0,
    totalReviews: allEbooks.reduce((s, i) => s + (i.review_count || 0), 0),
    avgPrice: allEbooks.filter(i => !i.is_free).length > 0 ? allEbooks.filter(i => !i.is_free).reduce((s, i) => s + (i.price || 0), 0) / allEbooks.filter(i => !i.is_free).length : 0,
  }), [allEbooks]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(allEbooks.map(e => e.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [allEbooks]);

  const categoryBreakdown = useMemo(() => {
    const acc: any = {};
    allEbooks.forEach(item => {
      const cat = item.category || 'অন্যান্য';
      if (!acc[cat]) acc[cat] = { name: cat, count: 0, sales: 0, revenue: 0 };
      acc[cat].count++;
      acc[cat].sales += item.total_sales || 0;
      acc[cat].revenue += (item.total_sales || 0) * (item.price || 0);
    });
    return Object.values(acc) as any[];
  }, [allEbooks]);

  const formatBreakdown = useMemo(() => {
    const acc: any = {};
    allEbooks.forEach(item => {
      const fmt = item.file_format || 'pdf';
      if (!acc[fmt]) acc[fmt] = { name: fmt.toUpperCase(), value: 0 };
      acc[fmt].value++;
    });
    return Object.values(acc) as any[];
  }, [allEbooks]);

  const topSelling = useMemo(() => [...allEbooks].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 10), [allEbooks]);
  const topDownloaded = useMemo(() => [...allEbooks].sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0)).slice(0, 10), [allEbooks]);
  const topRated = useMemo(() => [...allEbooks].filter(i => i.avg_rating).sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10), [allEbooks]);

  // ========== MUTATIONS ==========

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { isbn, language, page_count, publisher, publisher_id, author, author_id, translator,
        translator_id, edition, publish_year, format, has_audio, audio_url, audio_duration_minutes,
        sample_chapter_url, table_of_contents, gallery_images, ...productData } = data;
      productData.gallery_images = gallery_images;
      const cleanStr = (v: any) => (v && String(v).trim() && String(v).trim() !== 'none') ? String(v).trim() : null;
      const cleanNum = (v: any) => (v && Number(v) > 0) ? Number(v) : null;
      const ebookMeta = {
        isbn: cleanStr(isbn), language: cleanStr(language) || 'bn', page_count: cleanNum(page_count),
        publisher: cleanStr(publisher), publisher_id: cleanStr(publisher_id),
        author: cleanStr(author), author_id: cleanStr(author_id),
        translator: cleanStr(translator), translator_id: cleanStr(translator_id),
        edition: cleanStr(edition), publish_year: cleanNum(publish_year),
        format: cleanStr(format) || 'pdf', has_audio: !!has_audio,
        audio_url: cleanStr(audio_url), audio_duration_minutes: cleanNum(audio_duration_minutes),
        sample_chapter_url: cleanStr(sample_chapter_url),
        table_of_contents: table_of_contents && Array.isArray(table_of_contents) && table_of_contents.length > 0 ? table_of_contents : null,
      };
      if (editingId) {
        const { error } = await supabase.from('digital_products').update(productData).eq('id', editingId);
        if (error) throw error;
        const { data: existingMeta } = await supabase.from('ebook_metadata').select('id').eq('digital_product_id', editingId).maybeSingle();
        if (existingMeta) {
          const { error: me } = await supabase.from('ebook_metadata').update(ebookMeta).eq('digital_product_id', editingId);
          if (me) throw new Error('মেটাডাটা আপডেট ব্যর্থ: ' + me.message);
        } else {
          const { error: me } = await supabase.from('ebook_metadata').insert({ ...ebookMeta, digital_product_id: editingId });
          if (me) throw new Error('মেটাডাটা সেভ ব্যর্থ: ' + me.message);
        }
      } else {
        const { data: newProduct, error } = await supabase.from('digital_products').insert(productData).select().single();
        if (error) throw error;
        const { error: me } = await supabase.from('ebook_metadata').insert({ ...ebookMeta, digital_product_id: newProduct.id });
        if (me) throw new Error('মেটাডাটা সেভ ব্যর্থ: ' + me.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] });
      queryClient.invalidateQueries({ queryKey: ['all-ebooks-analytics'] });
      setShowForm(false); setEditingId(null);
      toast.success(editingId ? "ই-বুক আপডেট হয়েছে" : "ই-বুক যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('digital_products').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] }); toast.success("ই-বুক মুছে ফেলা হয়েছে"); }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => { await supabase.from('digital_products').update({ is_active: active }).eq('id', id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] })
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
      queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] });
      queryClient.invalidateQueries({ queryKey: ['all-ebooks-analytics'] });
      setSelectedIds(new Set()); setShowBulkDialog(false); toast.success("বাল্ক অপারেশন সম্পন্ন");
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => { await supabase.from('digital_product_reviews').update({ is_approved: approved }).eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ebook-reviews'] }); queryClient.invalidateQueries({ queryKey: ['all-ebook-reviews'] }); toast.success("রিভিউ আপডেট হয়েছে"); }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from('digital_product_reviews').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ebook-reviews'] }); queryClient.invalidateQueries({ queryKey: ['all-ebook-reviews'] }); toast.success("রিভিউ মুছে ফেলা হয়েছে"); }
  });

  // ========== HELPERS ==========

  const openEdit = (item: any) => {
    const meta = item.ebook_metadata?.[0] || {};
    setForm({
      title_bn: item.title_bn || '', title_en: item.title_en || '', slug: item.slug || '',
      description_bn: item.description_bn || '', description_en: item.description_en || '',
      product_type: 'ebook', category: item.category || '', subcategory: item.subcategory || '',
      price: item.price || 0, original_price: item.original_price || 0, discount_percent: item.discount_percent || 0,
      cover_image: item.cover_image || '', gallery_images: item.gallery_images || [],
      file_url: item.file_url || '', file_name: item.file_name || '',
      file_size_mb: item.file_size_mb || 0, file_format: item.file_format || 'pdf',
      preview_url: item.preview_url || '', preview_pages: item.preview_pages || 10,
      is_active: item.is_active, is_featured: item.is_featured || false, is_free: item.is_free || false,
      max_downloads: item.max_downloads || 5, download_expiry_days: item.download_expiry_days || 365,
      drm_enabled: item.drm_enabled || false, watermark_enabled: item.watermark_enabled || false,
      tags: item.tags || [], meta_title: item.meta_title || '', meta_description: item.meta_description || '',
      isbn: meta.isbn || '', language: meta.language || 'bn', page_count: meta.page_count || 0,
      publisher: meta.publisher || '', publisher_id: meta.publisher_id || 'none',
      author: meta.author || '', author_id: meta.author_id || 'none',
      translator: meta.translator || '', translator_id: meta.translator_id || 'none',
      edition: meta.edition || '', publish_year: meta.publish_year || new Date().getFullYear(),
      format: meta.format || 'pdf', has_audio: meta.has_audio || false, audio_url: meta.audio_url || '',
      audio_duration_minutes: meta.audio_duration_minutes || 0,
      sample_chapter_url: meta.sample_chapter_url || '', table_of_contents: meta.table_of_contents || [],
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

  const toggleSelect = (id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { setSelectedIds(selectedIds.size === ebooks.length ? new Set() : new Set(ebooks.map((e: any) => e.id))); };

  const getWriterName = (id: string) => writers.find((w: any) => w.id === id)?.name_bn || '';
  const getPublisherName = (id: string) => publishers.find((p: any) => p.id === id)?.name_bn || '';

  const parentCategories = categories.filter((c: any) => !c.parent_id);
  const subCategories = categories.filter((c: any) => c.parent_id === form.category);

  // Form tab completion indicators
  const formTabStatus = useMemo(() => ({
    basic: !!(form.title_bn && form.slug),
    metadata: !!(form.author_id && form.author_id !== 'none'),
    files: !!form.file_url,
    pricing: form.price > 0 || form.is_free,
    protection: true,
    seo: !!(form.meta_title || form.meta_description),
  }), [form]);

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
      <input ref={fileInputRef} type="file" accept=".pdf,.epub,.mobi,.djvu" onChange={handleEbookFileUpload} className="hidden" />
      <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
      <input ref={previewInputRef} type="file" accept="image/*,.pdf" onChange={handlePreviewUpload} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
      <input ref={sampleInputRef} type="file" accept=".pdf,image/*" onChange={handleSampleChapterUpload} className="hidden" />
    </>
  );

  const statCards = [
    { label: 'মোট ই-বুক', value: stats.total, icon: BookOpen, color: 'text-primary bg-primary/10' },
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> ই-বুক ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ই-বুক পরিচালনা, মেটাডাটা, ভার্সন, রিভিউ ও অ্যানালিটিক্স</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-sm"><Plus className="w-4 h-4" /> নতুন ই-বুক</Button>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap mb-4">
          <TabsTrigger value="list"><BookOpen className="w-4 h-4 mr-1" /> তালিকা</TabsTrigger>
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

          {/* Enhanced Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="নাম, স্লাগ দিয়ে খুঁজুন..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="active">সক্রিয়</SelectItem>
                <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                <SelectItem value="featured">ফিচার্ড</SelectItem>
                <SelectItem value="free">ফ্রি</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]"><Layers className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterFormat} onValueChange={v => { setFilterFormat(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px]"><FileText className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ফরম্যাট</SelectItem>
                {FORMATS.map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : ebooks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">কোনো ই-বুক পাওয়া যায়নি</p>
              <p className="text-sm">ফিল্টার পরিবর্তন করুন অথবা নতুন ই-বুক যোগ করুন</p>
            </div>
          ) : (
            <>
              <Card className="shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><input type="checkbox" checked={selectedIds.size === ebooks.length && ebooks.length > 0} onChange={toggleSelectAll} className="rounded" /></TableHead>
                      <TableHead>ই-বুক</TableHead>
                      <TableHead>লেখক</TableHead>
                      <TableHead>প্রকাশনী</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead className="text-center">ফরম্যাট</TableHead>
                      <TableHead className="text-center">রেটিং</TableHead>
                      <TableHead className="text-center">বিক্রি</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ebooks.map((item: any) => {
                      const meta = item.ebook_metadata?.[0] || {};
                      const authorName = meta.author_id ? getWriterName(meta.author_id) : meta.author;
                      const publisherName = meta.publisher_id ? getPublisherName(meta.publisher_id) : meta.publisher;
                      return (
                        <TableRow key={item.id} className={`${selectedIds.has(item.id) ? 'bg-primary/5' : ''} hover:bg-muted/40 transition-colors`}>
                          <TableCell><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setDetailItem(item); setShowDetailDialog(true); }}>
                              <img src={item.cover_image || '/placeholder.svg'} alt="" className="w-10 h-14 rounded object-cover bg-muted shadow-sm" />
                              <div>
                                <p className="font-medium line-clamp-1 hover:text-primary transition-colors">{item.title_bn}</p>
                                {item.title_en && <p className="text-xs text-muted-foreground line-clamp-1">{item.title_en}</p>}
                                {meta.isbn && <p className="text-[10px] text-muted-foreground font-mono">ISBN: {meta.isbn}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{authorName || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm">{publisherName || <span className="text-muted-foreground">—</span>}</TableCell>
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
                            <Badge variant="outline" className="text-[10px] font-mono">{(item.file_format || 'pdf').toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span className="text-sm font-medium">{(item.avg_rating || 0).toFixed(1)}</span>
                              <span className="text-[10px] text-muted-foreground">({item.review_count || 0})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{item.total_sales || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Switch checked={item.is_active} onCheckedChange={v => toggleActive.mutate({ id: item.id, active: v })} />
                              {item.is_featured && <Badge variant="outline" className="text-[10px] py-0">★</Badge>}
                              {meta.has_audio && <Badge variant="outline" className="text-[10px] py-0">🎧</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <TooltipProvider>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedReviewProduct(item.id); setShowReviewDialog(true); }}><MessageSquare className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>রিভিউ</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(item)}><Copy className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>ডুপ্লিকেট</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                                </TooltipTrigger><TooltipContent>এডিট</TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("এই ই-বুক মুছে ফেলতে চান?")) deleteMutation.mutate(item.id); }}><Trash2 className="w-4 h-4" /></Button>
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
                  <Button variant="outline" size="sm" disabled={ebooks.length < perPage} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
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
                  <p className="text-xs text-muted-foreground mt-1">গড় মূল্য: ৳{Math.round(stats.avgPrice)}</p>
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
                    <p className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</p>
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(stats.avgRating) ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalReviews}টি রিভিউ থেকে</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">ক্যাটাগরি অনুযায়ী বিক্রি</CardTitle></CardHeader>
                <CardContent>
                  {categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={categoryBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="sales" name="বিক্রি" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="count" name="সংখ্যা" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">ফরম্যাট ডিস্ট্রিবিউশন</CardTitle></CardHeader>
                <CardContent>
                  {formatBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={formatBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                          {formatBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">ক্যাটাগরি রেভিনিউ বিশ্লেষণ</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>ক্যাটাগরি</TableHead><TableHead>সংখ্যা</TableHead><TableHead>বিক্রি</TableHead><TableHead>রেভিনিউ</TableHead><TableHead>শেয়ার</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {categoryBreakdown.sort((a: any, b: any) => b.revenue - a.revenue).map((cat: any, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>{cat.count}</TableCell>
                        <TableCell>{cat.sales}</TableCell>
                        <TableCell className="font-semibold">৳{cat.revenue.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={stats.revenue > 0 ? (cat.revenue / stats.revenue) * 100 : 0} className="h-2 w-20" />
                            <span className="text-xs">{stats.revenue > 0 ? ((cat.revenue / stats.revenue) * 100).toFixed(0) : 0}%</span>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <Card><CardContent className="p-4 text-center"><Star className="w-6 h-6 mx-auto mb-1 text-amber-500" /><p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p><p className="text-xs text-muted-foreground">গড় রেটিং</p></CardContent></Card>
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
                          {isRating ? (
                            <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="text-xs">{(item[field as keyof typeof item] as number || 0).toFixed(1)} ({item.review_count || 0})</span></div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{item[field as keyof typeof item] || 0}{suffix}</span>
                          )}
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
              <h3 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> ই-বুক সেটিংস</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3"><Label>ডিফল্ট ডাউনলোড লিমিট</Label><Input type="number" defaultValue={5} /></div>
                <div className="space-y-3"><Label>ডিফল্ট এক্সপায়ারি (দিন)</Label><Input type="number" defaultValue={365} /></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={false} id="drm-default" /><Label htmlFor="drm-default">DRM ডিফল্ট সক্রিয়</Label></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={false} id="watermark-default" /><Label htmlFor="watermark-default">ওয়াটারমার্ক ডিফল্ট সক্রিয়</Label></div>
                <div className="flex items-center gap-3"><Switch defaultChecked={true} id="auto-approve-reviews" /><Label htmlFor="auto-approve-reviews">রিভিউ অটো অনুমোদন</Label></div>
                <div className="space-y-3"><Label>ন্যূনতম রিভিউ দৈর্ঘ্য</Label><Input type="number" defaultValue={10} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent><DialogHeader><DialogTitle>বাল্ক অ্যাকশন নিশ্চিত করুন</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{selectedIds.size}টি ই-বুকে অ্যাকশন প্রয়োগ করতে চান?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>বাতিল</Button>
            <Button variant={bulkAction === 'delete' ? 'destructive' : 'default'} onClick={() => bulkMutation.mutate({ action: bulkAction, ids: Array.from(selectedIds) })}>
              {bulkMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-1" />} নিশ্চিত
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> প্রোডাক্ট রিভিউ</DialogTitle></DialogHeader>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">কোনো রিভিউ নেই</p>
          ) : (
            <div className="space-y-3">{reviews.map((r: any) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />)}</div>
                    <Badge variant={r.is_approved ? 'default' : 'outline'} className="text-[10px]">{r.is_approved ? 'অনুমোদিত' : 'পেন্ডিং'}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('bn-BD')}</span>
                </div>
                {r.review_text && <p className="text-sm mt-1">{r.review_text}</p>}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => approveReviewMutation.mutate({ id: r.id, approved: !r.is_approved })}>{r.is_approved ? 'বাতিল' : 'অনুমোদন'}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteReviewMutation.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailItem && (() => {
            const meta = detailItem.ebook_metadata?.[0] || {};
            const authorName = meta.author_id ? getWriterName(meta.author_id) : meta.author;
            const publisherName = meta.publisher_id ? getPublisherName(meta.publisher_id) : meta.publisher;
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> ই-বুক বিস্তারিত</DialogTitle></DialogHeader>
                <div className="flex gap-5">
                  <img src={detailItem.cover_image || '/placeholder.svg'} alt="" className="w-28 h-40 rounded-lg object-cover border shadow-sm" />
                  <div className="space-y-2 flex-1">
                    <h3 className="font-bold text-lg">{detailItem.title_bn}</h3>
                    {detailItem.title_en && <p className="text-sm text-muted-foreground">{detailItem.title_en}</p>}
                    <div className="flex flex-wrap gap-2 text-sm">
                      {authorName && <Badge variant="secondary">লেখক: {authorName}</Badge>}
                      {publisherName && <Badge variant="secondary">প্রকাশনী: {publisherName}</Badge>}
                      {meta.isbn && <Badge variant="outline" className="font-mono text-xs">ISBN: {meta.isbn}</Badge>}
                      {meta.language && <Badge variant="outline">{LANGUAGES.find(l => l.value === meta.language)?.label || meta.language}</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.is_free ? 'ফ্রি' : `৳${detailItem.price}`}</p><p className="text-[10px] text-muted-foreground">মূল্য</p></div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.total_sales || 0}</p><p className="text-[10px] text-muted-foreground">বিক্রি</p></div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{detailItem.total_downloads || 0}</p><p className="text-[10px] text-muted-foreground">ডাউনলোড</p></div>
                    </div>
                  </div>
                </div>
                {/* Version Manager for existing products */}
                <div className="mt-4 pt-4 border-t">
                  <EbookVersionManager digitalProductId={detailItem.id} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowDetailDialog(false); openEdit(detailItem); }}>
                    <Edit className="w-4 h-4 mr-1" /> এডিট করুন
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== FORM DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {editingId ? 'ই-বুক এডিট করুন' : 'নতুন ই-বুক যোগ করুন'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
            <TabsList className="w-full flex flex-wrap gap-0.5">
              {[
                { value: 'basic', label: 'বেসিক', icon: BookOpen },
                { value: 'metadata', label: 'মেটাডাটা', icon: Hash },
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
                  }} placeholder="বইয়ের নাম লিখুন" />
                </div>
                <div><Label>শিরোনাম (ইংরেজি)</Label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} placeholder="Book title" /></div>
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
              <div><Label>বিবরণ (বাংলা)</Label><Textarea value={form.description_bn} onChange={e => setForm({ ...form, description_bn: e.target.value })} rows={4} placeholder="বইয়ের বিস্তারিত বিবরণ..." /></div>
              <div><Label>বিবরণ (ইংরেজি)</Label><Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={3} /></div>

              {/* Cover Image */}
              <div>
                <Label className="mb-2 block">কভার ইমেজ</Label>
                <div className="flex items-start gap-4">
                  {form.cover_image ? (
                    <div className="relative group">
                      <img src={form.cover_image} alt="কভার" className="w-24 h-32 object-cover rounded-lg border shadow-sm" />
                      <button type="button" onClick={() => setForm({ ...form, cover_image: '' })} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="w-24 h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
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

            {/* METADATA TAB */}
            <TabsContent value="metadata" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>ISBN</Label><Input value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} placeholder="978-..." /></div>
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

                {/* Searchable Writer Select */}
                <SearchableWriterSelect
                  label="লেখক"
                  writers={writers}
                  selectedId={form.author_id || 'none'}
                  onSelect={(id, name) => setForm({ ...form, author_id: id, author: name })}
                  placeholder="লেখক খুঁজুন..."
                />

                {/* Searchable Publisher Select */}
                <SearchableWriterSelect
                  label="প্রকাশনী"
                  writers={publishers}
                  selectedId={form.publisher_id || 'none'}
                  onSelect={(id, name) => setForm({ ...form, publisher_id: id, publisher: name })}
                  placeholder="প্রকাশনী খুঁজুন..."
                />

                {/* Searchable Translator */}
                <SearchableWriterSelect
                  label="অনুবাদক"
                  writers={writers}
                  selectedId={form.translator_id || 'none'}
                  onSelect={(id, name) => setForm({ ...form, translator_id: id, translator: name })}
                  placeholder="অনুবাদক খুঁজুন..."
                />

                <div><Label>সংস্করণ</Label><Input value={form.edition} onChange={e => setForm({ ...form, edition: e.target.value })} placeholder="১ম, ২য়..." /></div>
                <div><Label>প্রকাশসাল</Label><Input type="number" value={form.publish_year} onChange={e => setForm({ ...form, publish_year: Number(e.target.value) })} /></div>
              </div>

              {/* Table of Contents Editor */}
              <div className="border rounded-lg p-4 mt-4">
                <EbookTOCEditor
                  items={form.table_of_contents || []}
                  onChange={(items) => setForm({ ...form, table_of_contents: items })}
                />
              </div>
            </TabsContent>

            {/* FILES & MEDIA TAB */}
            <TabsContent value="files" className="space-y-6 mt-4">
              {/* Ebook File Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> ই-বুক ফাইল</h4>
                {form.file_url ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <File className="w-8 h-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{form.file_name || 'ebook-file'}</p>
                      <p className="text-xs text-muted-foreground">{form.file_size_mb}MB • {(form.file_format || 'pdf').toUpperCase()}</p>
                    </div>
                    <a href={form.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" /></a>
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, file_url: '', file_name: '', file_size_mb: 0 })}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    {uploadingFile ? (
                      <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>আপলোড হচ্ছে...</span></div>
                    ) : (
                      <><Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm">PDF, EPUB, MOBI ফাইল আপলোড করুন</p><p className="text-xs text-muted-foreground">সর্বোচ্চ ১০০MB</p></>
                    )}
                  </div>
                )}
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

              {/* Preview File Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> প্রিভিউ / একটু পড়ুন</h4>
                {form.preview_url ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <FileText className="w-6 h-6 text-primary" />
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
                      <><p className="text-sm">প্রিভিউ PDF/ইমেজ আপলোড করুন</p><p className="text-xs text-muted-foreground">সর্বোচ্চ ১০MB</p></>
                    )}
                  </div>
                )}
                <div><Label>প্রিভিউ পৃষ্ঠা সংখ্যা</Label><Input type="number" value={form.preview_pages} onChange={e => setForm({ ...form, preview_pages: Number(e.target.value) })} /></div>
              </div>

              {/* Sample Chapter Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-600" /> স্যাম্পল চ্যাপ্টার</h4>
                {form.sample_chapter_url ? (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <FileText className="w-6 h-6 text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">স্যাম্পল চ্যাপ্টার আপলোড হয়েছে</p>
                      <a href={form.sample_chapter_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">দেখুন</a>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, sample_chapter_url: '' })}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => sampleInputRef.current?.click()}>
                    {uploadingSample ? (
                      <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>আপলোড হচ্ছে...</span></div>
                    ) : (
                      <><BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm">স্যাম্পল চ্যাপ্টার PDF/ইমেজ আপলোড করুন</p><p className="text-xs text-muted-foreground">সর্বোচ্চ ২০MB</p></>
                    )}
                  </div>
                )}
              </div>

              {/* Audio Upload */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2"><Headphones className="w-4 h-4 text-purple-600" /> অডিওবুক</h4>
                  <div className="flex items-center gap-2"><Switch checked={form.has_audio} onCheckedChange={v => setForm({ ...form, has_audio: v })} /><Label className="text-sm">অডিও আছে</Label></div>
                </div>
                {form.has_audio && (
                  <>
                    {form.audio_url ? (
                      <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                        <Music className="w-6 h-6 text-purple-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">অডিও আপলোড হয়েছে</p>
                          <audio src={form.audio_url} controls className="w-full mt-1 h-8" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, audio_url: '' })}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => audioInputRef.current?.click()}>
                        {uploadingAudio ? (
                          <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>আপলোড হচ্ছে...</span></div>
                        ) : (
                          <><Music className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm">অডিও ফাইল আপলোড করুন</p><p className="text-xs text-muted-foreground">MP3/WAV/M4A, সর্বোচ্চ ২০০MB</p></>
                        )}
                      </div>
                    )}
                    <div><Label>সময়কাল (মিনিট)</Label><Input type="number" value={form.audio_duration_minutes} onChange={e => setForm({ ...form, audio_duration_minutes: Number(e.target.value) })} /></div>
                  </>
                )}
              </div>

              {/* Gallery Images */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4 text-emerald-600" /> ইমেজ গ্যালারি</h4>
                {(form.gallery_images || []).length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {(form.gallery_images || []).map((url: string, i: number) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-lg border" />
                        <button type="button" onClick={() => removeGalleryImage(i)} className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}>
                  {uploadingGallery ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> আপলোড হচ্ছে...</> : <><Plus className="w-4 h-4 mr-1" /> ইমেজ যোগ করুন</>}
                </Button>
              </div>

              {/* Version Manager for existing ebooks */}
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
                  <span className="text-sm">এই ই-বুকটি ফ্রি হিসেবে সেট করা আছে। মূল্য প্রযোজ্য হবে না।</span>
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
              <div><Label>ট্যাগ (কমা দিয়ে আলাদা)</Label><Input value={(form.tags || []).join(', ')} onChange={e => setForm({ ...form, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })} placeholder="ইসলাম, ইতিহাস, উপন্যাস" /></div>
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
                  <p className="text-xs text-emerald-700 line-clamp-1">{typeof window !== 'undefined' ? window.location.host : 'boialo.lovable.app'}/ebooks/{form.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{form.meta_description || form.description_bn?.substring(0, 160)}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {Object.values(formTabStatus).filter(Boolean).length}/6 ট্যাব সম্পূর্ণ
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

export default AdminEbooks;
