import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Pencil, Trash2, Package, Search, X, GripVertical,
  Star, Eye, EyeOff, Copy, ArrowUpDown, ImagePlus, Loader2,
  ShoppingBag, TrendingUp, AlertCircle, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface BundleItemForm {
  id?: string;
  product_id: string;
  product_title: string;
  product_price: number;
  product_image: string;
  quantity: number;
  sort_order: number;
}

interface BundleForm {
  name_bn: string;
  name_en: string;
  slug: string;
  description_bn: string;
  description_en: string;
  bundle_price: string;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  items: BundleItemForm[];
}

const emptyForm: BundleForm = {
  name_bn: '', name_en: '', slug: '', description_bn: '', description_en: '',
  bundle_price: '', image_url: '', is_featured: false, is_active: true, items: [],
};

const AdminBundles = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [formData, setFormData] = useState<BundleForm>({ ...emptyForm });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [tab, setTab] = useState('details');

  // Fetch bundles with items
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result = [];
      for (const bundle of data || []) {
        const { data: items } = await supabase
          .from('bundle_items')
          .select('id, product_id, quantity, sort_order')
          .eq('bundle_id', bundle.id)
          .order('sort_order');

        const enrichedItems = [];
        for (const item of items || []) {
          const { data: product } = await supabase
            .from('products')
            .select('id, title_bn, price, images')
            .eq('id', item.product_id)
            .maybeSingle();
          enrichedItems.push({ ...item, product });
        }
        result.push({ ...bundle, items: enrichedItems });
      }
      return result;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_bn, name_en')
        .eq('is_active', true)
        .order('name_bn');
      return data || [];
    },
  });

  // Fetch products for picker
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-picker', selectedCategory, productSearch],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, title_bn, title_en, price, images, category_id, author, stock_quantity')
        .eq('is_active', true)
        .order('title_bn');

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }
      if (productSearch.trim()) {
        query = query.or(`title_bn.ilike.%${productSearch}%,title_en.ilike.%${productSearch}%`);
      }
      query = query.limit(50);

      const { data } = await query;
      return data || [];
    },
    enabled: showProductPicker,
  });

  // Auto-calculate pricing
  const originalTotal = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  }, [formData.items]);

  const discountPercent = useMemo(() => {
    const bundlePrice = parseFloat(formData.bundle_price) || 0;
    if (originalTotal <= 0 || bundlePrice <= 0) return 0;
    return Math.round(((originalTotal - bundlePrice) / originalTotal) * 100);
  }, [originalTotal, formData.bundle_price]);

  // Auto-generate slug
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || `bundle-${Date.now()}`;
  }, []);

  useEffect(() => {
    if (!editingBundle && formData.name_en) {
      setFormData(p => ({ ...p, slug: generateSlug(formData.name_en) }));
    }
  }, [formData.name_en, editingBundle, generateSlug]);

  // Save bundle
  const saveMutation = useMutation({
    mutationFn: async () => {
      const bundleData = {
        name_bn: formData.name_bn,
        name_en: formData.name_en || null,
        slug: formData.slug,
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        bundle_price: parseFloat(formData.bundle_price),
        original_total: originalTotal,
        discount_percent: discountPercent,
        image_url: formData.image_url || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
      };

      let bundleId: string;

      if (editingBundle) {
        const { error } = await supabase
          .from('product_bundles')
          .update(bundleData)
          .eq('id', editingBundle.id);
        if (error) throw error;
        bundleId = editingBundle.id;

        // Delete old items
        await supabase.from('bundle_items').delete().eq('bundle_id', bundleId);
      } else {
        const { data, error } = await supabase
          .from('product_bundles')
          .insert(bundleData)
          .select('id')
          .single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Insert items
      if (formData.items.length > 0) {
        const itemsData = formData.items.map((item, idx) => ({
          bundle_id: bundleId,
          product_id: item.product_id,
          quantity: item.quantity,
          sort_order: idx,
        }));
        const { error: itemsError } = await supabase.from('bundle_items').insert(itemsData);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success(editingBundle ? 'বান্ডেল আপডেট হয়েছে' : 'বান্ডেল তৈরি হয়েছে');
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'সমস্যা হয়েছে'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from('product_bundles').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('bundle_items').delete().eq('bundle_id', id);
      const { error } = await supabase.from('product_bundles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success('বান্ডেল মুছে ফেলা হয়েছে');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (bundle: any) => {
      const { data, error } = await supabase.from('product_bundles').insert({
        name_bn: bundle.name_bn + ' (কপি)',
        name_en: bundle.name_en ? bundle.name_en + ' (Copy)' : null,
        slug: bundle.slug + '-copy-' + Date.now(),
        description_bn: bundle.description_bn,
        bundle_price: bundle.bundle_price,
        original_total: bundle.original_total,
        discount_percent: bundle.discount_percent,
        image_url: bundle.image_url,
        is_active: false,
        is_featured: false,
      }).select('id').single();
      if (error) throw error;

      if (bundle.items?.length > 0) {
        const items = bundle.items.map((item: any, idx: number) => ({
          bundle_id: data.id,
          product_id: item.product_id,
          quantity: item.quantity,
          sort_order: idx,
        }));
        await supabase.from('bundle_items').insert(items);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast.success('বান্ডেল ডুপ্লিকেট হয়েছে');
    },
  });

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingBundle(null);
    setIsDialogOpen(false);
    setShowProductPicker(false);
    setProductSearch('');
    setSelectedCategory('all');
    setTab('details');
  };

  const handleEdit = (bundle: any) => {
    setEditingBundle(bundle);
    const items: BundleItemForm[] = (bundle.items || []).map((item: any, idx: number) => ({
      id: item.id,
      product_id: item.product_id,
      product_title: item.product?.title_bn || 'Unknown',
      product_price: item.product?.price || 0,
      product_image: getImage(item.product?.images),
      quantity: item.quantity,
      sort_order: idx,
    }));
    setFormData({
      name_bn: bundle.name_bn || '',
      name_en: bundle.name_en || '',
      slug: bundle.slug || '',
      description_bn: bundle.description_bn || '',
      description_en: bundle.description_en || '',
      bundle_price: String(bundle.bundle_price || ''),
      image_url: bundle.image_url || '',
      is_featured: bundle.is_featured || false,
      is_active: bundle.is_active ?? true,
      items,
    });
    setIsDialogOpen(true);
  };

  const addProduct = (product: any) => {
    if (formData.items.some(i => i.product_id === product.id)) {
      toast.error('এই পণ্যটি ইতিমধ্যে যুক্ত আছে');
      return;
    }
    const newItem: BundleItemForm = {
      product_id: product.id,
      product_title: product.title_bn,
      product_price: product.price,
      product_image: getImage(product.images),
      quantity: 1,
      sort_order: formData.items.length,
    };
    setFormData(p => ({ ...p, items: [...p.items, newItem] }));
    toast.success('পণ্য যোগ হয়েছে');
  };

  const removeProduct = (productId: string) => {
    setFormData(p => ({ ...p, items: p.items.filter(i => i.product_id !== productId) }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setFormData(p => ({
      ...p,
      items: p.items.map(i => i.product_id === productId ? { ...i, quantity } : i),
    }));
  };

  const handleSubmit = () => {
    if (!formData.name_bn || !formData.slug) {
      toast.error('বান্ডেলের নাম ও স্লাগ দিন');
      return;
    }
    if (!formData.bundle_price || parseFloat(formData.bundle_price) <= 0) {
      toast.error('সঠিক বান্ডেল মূল্য দিন');
      return;
    }
    if (formData.items.length < 2) {
      toast.error('কমপক্ষে ২টি পণ্য যোগ করুন');
      return;
    }
    saveMutation.mutate();
  };

  const getImage = (images: any): string => {
    if (!images) return '/placeholder.svg';
    if (Array.isArray(images) && images.length > 0) return images[0];
    return '/placeholder.svg';
  };

  // Filter bundles
  const filteredBundles = useMemo(() => {
    return bundles.filter((b: any) => {
      if (filterStatus === 'active' && !b.is_active) return false;
      if (filterStatus === 'inactive' && b.is_active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return b.name_bn?.toLowerCase().includes(q) || b.name_en?.toLowerCase().includes(q) || b.slug?.includes(q);
      }
      return true;
    });
  }, [bundles, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: bundles.length,
    active: bundles.filter((b: any) => b.is_active).length,
    featured: bundles.filter((b: any) => b.is_featured).length,
    avgDiscount: bundles.length > 0
      ? Math.round(bundles.reduce((s: number, b: any) => s + (b.discount_percent || 0), 0) / bundles.length)
      : 0,
  }), [bundles]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              বান্ডেল ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm mt-1">প্রোডাক্ট বান্ডেল তৈরি, সম্পাদনা ও পরিচালনা করুন</p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> নতুন বান্ডেল
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'মোট বান্ডেল', value: stats.total, icon: Package, color: 'text-primary' },
            { label: 'সক্রিয়', value: stats.active, icon: Eye, color: 'text-green-600' },
            { label: 'ফিচার্ড', value: stats.featured, icon: Star, color: 'text-yellow-500' },
            { label: 'গড় ছাড়', value: `${stats.avgDiscount}%`, icon: TrendingUp, color: 'text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="বান্ডেল খুঁজুন..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  <SelectItem value="active">সক্রিয়</SelectItem>
                  <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bundles Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">সকল বান্ডেল ({filteredBundles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBundles.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">কোনো বান্ডেল পাওয়া যায়নি</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ছবি</TableHead>
                      <TableHead>বান্ডেল</TableHead>
                      <TableHead>পণ্য</TableHead>
                      <TableHead>মূল্য</TableHead>
                      <TableHead>ছাড়</TableHead>
                      <TableHead>ফিচার্ড</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBundles.map((bundle: any) => (
                      <TableRow key={bundle.id} className="group">
                        <TableCell>
                          {bundle.image_url ? (
                            <img src={bundle.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm">{bundle.name_bn}</p>
                            {bundle.name_en && <p className="text-xs text-muted-foreground">{bundle.name_en}</p>}
                            <p className="text-xs text-muted-foreground/70 mt-0.5">/{bundle.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            {bundle.items?.length || 0} টি
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-primary">৳{bundle.bundle_price}</p>
                            {bundle.original_total > 0 && (
                              <p className="text-xs text-muted-foreground line-through">৳{bundle.original_total}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {bundle.discount_percent > 0 ? (
                            <Badge variant="destructive" className="text-xs">{bundle.discount_percent}%</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={bundle.is_featured}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: bundle.id, field: 'is_featured', value: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={bundle.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: bundle.id, field: 'is_active', value: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(bundle)} title="সম্পাদনা">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => duplicateMutation.mutate(bundle)} title="ডুপ্লিকেট">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                              if (confirm('এই বান্ডেলটি মুছে ফেলতে চান?')) deleteMutation.mutate(bundle.id);
                            }} title="মুছুন">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editingBundle ? 'বান্ডেল সম্পাদনা' : 'নতুন বান্ডেল তৈরি'}
              </DialogTitle>
              <DialogDescription>
                পণ্য নির্বাচন করে বান্ডেল তৈরি করুন। মূল্য স্বয়ংক্রিয়ভাবে হিসাব হবে।
              </DialogDescription>
            </DialogHeader>

            <Tabs value={tab} onValueChange={setTab} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">বিবরণ</TabsTrigger>
                <TabsTrigger value="products">
                  পণ্য নির্বাচন
                  {formData.items.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5">{formData.items.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pricing">মূল্য ও সেটিংস</TabsTrigger>
              </TabsList>

              {/* Tab 1: Details */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>বান্ডেলের নাম (বাংলা) <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.name_bn}
                      onChange={e => setFormData(p => ({ ...p, name_bn: e.target.value }))}
                      placeholder="যেমন: শীতের বই কালেকশন"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bundle Name (English)</Label>
                    <Input
                      value={formData.name_en}
                      onChange={e => setFormData(p => ({ ...p, name_en: e.target.value }))}
                      placeholder="e.g. Winter Book Collection"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.slug}
                    onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-muted-foreground">URL-friendly identifier. English নাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে।</p>
                </div>
                <div className="space-y-2">
                  <Label>বিবরণ (বাংলা)</Label>
                  <Textarea
                    value={formData.description_bn}
                    onChange={e => setFormData(p => ({ ...p, description_bn: e.target.value }))}
                    placeholder="বান্ডেলের বিবরণ লিখুন..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={formData.description_en}
                    onChange={e => setFormData(p => ({ ...p, description_en: e.target.value }))}
                    placeholder="Write bundle description..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ব্যানার ইমেজ URL</Label>
                  <Input
                    value={formData.image_url}
                    onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="w-full max-w-xs h-32 object-cover rounded-lg border mt-2" />
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Product Selection */}
              <TabsContent value="products" className="space-y-4 mt-4">
                {/* Selected Products */}
                {formData.items.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        নির্বাচিত পণ্য ({formData.items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={item.product_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
                          <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                          <img src={item.product_image} alt="" className="w-10 h-12 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_title}</p>
                            <p className="text-xs text-muted-foreground">৳{item.product_price} × {item.quantity} = ৳{item.product_price * item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>
                              <span className="text-lg leading-none">−</span>
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-center text-sm"
                              min={1}
                            />
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                              <span className="text-lg leading-none">+</span>
                            </Button>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeProduct(item.product_id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-sm font-semibold pt-1">
                        <span>মোট মূল মূল্য:</span>
                        <span className="text-primary">৳{originalTotal}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Product Picker */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">পণ্য যোগ করুন</CardTitle>
                    <CardDescription className="text-xs">ক্যাটাগরি ফিল্টার করে পণ্য নির্বাচন করুন</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={selectedCategory} onValueChange={v => { setSelectedCategory(v); setShowProductPicker(true); }}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="ক্যাটাগরি বাছুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="পণ্যের নাম লিখুন..."
                          value={productSearch}
                          onChange={e => { setProductSearch(e.target.value); setShowProductPicker(true); }}
                          onFocus={() => setShowProductPicker(true)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {showProductPicker && (
                      <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                        {productsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : products.length === 0 ? (
                          <p className="text-center py-6 text-sm text-muted-foreground">কোনো পণ্য পাওয়া যায়নি</p>
                        ) : (
                          <div className="divide-y">
                            {products.map((product: any) => {
                              const isAdded = formData.items.some(i => i.product_id === product.id);
                              return (
                                <div
                                  key={product.id}
                                  className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer ${isAdded ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                                  onClick={() => !isAdded && addProduct(product)}
                                >
                                  <img src={getImage(product.images)} alt="" className="w-9 h-12 object-cover rounded" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{product.title_bn}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-semibold text-primary">৳{product.price}</span>
                                      {product.author && (
                                        <span className="text-xs text-muted-foreground">• {product.author}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">• স্টক: {product.stock_quantity ?? '∞'}</span>
                                    </div>
                                  </div>
                                  {isAdded ? (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      <Check className="h-3 w-3 mr-1" /> যুক্ত
                                    </Badge>
                                  ) : (
                                    <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                                      <Plus className="h-3 w-3 mr-1" /> যোগ করুন
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {formData.items.length < 2 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>কমপক্ষে ২টি পণ্য যোগ করুন বান্ডেল তৈরি করতে।</span>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Pricing & Settings */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">মূল্য নির্ধারণ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>মূল মূল্য (স্বয়ংক্রিয়)</Label>
                        <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm font-semibold">
                          ৳{originalTotal}
                        </div>
                        <p className="text-xs text-muted-foreground">সকল পণ্যের মোট মূল্য</p>
                      </div>
                      <div className="space-y-2">
                        <Label>বান্ডেল মূল্য <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          value={formData.bundle_price}
                          onChange={e => setFormData(p => ({ ...p, bundle_price: e.target.value }))}
                          placeholder="0"
                          min={0}
                        />
                        <p className="text-xs text-muted-foreground">গ্রাহক এই মূল্য দেখবেন</p>
                      </div>
                      <div className="space-y-2">
                        <Label>ছাড় (স্বয়ংক্রিয়)</Label>
                        <div className={`h-10 px-3 flex items-center rounded-md border text-sm font-bold ${discountPercent > 0 ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-muted'}`}>
                          {discountPercent}% ছাড়
                        </div>
                        <p className="text-xs text-muted-foreground">মূল্য থেকে স্বয়ংক্রিয় হিসাব</p>
                      </div>
                    </div>

                    {discountPercent > 0 && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                        গ্রাহক সাশ্রয় করবেন: <strong>৳{originalTotal - (parseFloat(formData.bundle_price) || 0)}</strong> ({discountPercent}% ছাড়)
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">সেটিংস</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="font-medium">সক্রিয়</Label>
                        <p className="text-xs text-muted-foreground">বান্ডেলটি ওয়েবসাইটে দেখানো হবে</p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="font-medium">ফিচার্ড</Label>
                        <p className="text-xs text-muted-foreground">হোমপেজে হাইলাইট করা হবে</p>
                      </div>
                      <Switch
                        checked={formData.is_featured}
                        onCheckedChange={v => setFormData(p => ({ ...p, is_featured: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">বান্ডেল সারসংক্ষেপ</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">নাম:</span>
                      <span className="font-medium">{formData.name_bn || '—'}</span>
                      <span className="text-muted-foreground">পণ্য সংখ্যা:</span>
                      <span className="font-medium">{formData.items.length} টি</span>
                      <span className="text-muted-foreground">মূল মূল্য:</span>
                      <span>৳{originalTotal}</span>
                      <span className="text-muted-foreground">বান্ডেল মূল্য:</span>
                      <span className="font-bold text-primary">৳{formData.bundle_price || '0'}</span>
                      <span className="text-muted-foreground">ছাড়:</span>
                      <span className="font-bold text-green-600">{discountPercent}%</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Separator className="my-2" />

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={resetForm}>বাতিল</Button>
              <div className="flex items-center gap-2">
                {tab !== 'pricing' && (
                  <Button variant="outline" onClick={() => setTab(tab === 'details' ? 'products' : 'pricing')}>
                    পরবর্তী →
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingBundle ? 'আপডেট করুন' : 'বান্ডেল তৈরি করুন'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBundles;
