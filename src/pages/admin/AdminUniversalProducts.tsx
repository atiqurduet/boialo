import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, X, Package, Utensils, Pencil as PencilIcon } from 'lucide-react';
import { ProductImageUpload } from '@/components/admin/ProductImageUpload';

type ProductType = 'lifestyle' | 'stationery' | 'food';

interface UniversalProduct {
  id: string;
  product_type: ProductType;
  name_bn: string;
  name_en: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number;
  stock_quantity: number;
  images: any;
  video_url: string | null;
  short_description_bn: string | null;
  short_description_en: string | null;
  long_description_bn: string | null;
  long_description_en: string | null;
  brand: string | null;
  manufacturer: string | null;
  weight: string | null;
  dimensions: string | null;
  ingredients: string | null;
  warranty: string | null;
  delivery_time: string | null;
  return_policy: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  is_active: boolean;
  is_featured: boolean;
}

interface UniversalCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  product_type: ProductType;
  parent_id: string | null;
}

const PRODUCT_TYPES: { value: ProductType; label: string; icon: any }[] = [
  { value: 'lifestyle', label: 'লাইফস্টাইল', icon: Package },
  { value: 'stationery', label: 'স্টেশনারী', icon: PencilIcon },
  { value: 'food', label: 'ফুড', icon: Utensils },
];

const AdminUniversalProducts = () => {
  const [products, setProducts] = useState<UniversalProduct[]>([]);
  const [categories, setCategories] = useState<UniversalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ProductType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UniversalProduct | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    product_type: 'lifestyle' as ProductType,
    name_bn: '',
    name_en: '',
    slug: '',
    sku: '',
    category_id: '',
    price: 0,
    original_price: 0,
    discount_percent: 0,
    stock_quantity: 0,
    images: [] as string[],
    video_url: '',
    short_description_bn: '',
    short_description_en: '',
    long_description_bn: '',
    long_description_en: '',
    brand: '',
    manufacturer: '',
    weight: '',
    dimensions: '',
    ingredients: '',
    warranty: '',
    delivery_time: '',
    return_policy: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: [] as string[],
    canonical_url: '',
    og_title: '',
    og_description: '',
    og_image: '',
    is_active: true,
    is_featured: false,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('universal_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'Error', description: 'প্রোডাক্ট লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('universal_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        product_type: formData.product_type,
        name_bn: formData.name_bn,
        name_en: formData.name_en,
        slug: formData.slug || generateSlug(formData.name_en),
        sku: formData.sku || null,
        category_id: formData.category_id || null,
        price: formData.price,
        original_price: formData.original_price || null,
        discount_percent: formData.discount_percent,
        stock_quantity: formData.stock_quantity,
        images: formData.images,
        video_url: formData.video_url || null,
        short_description_bn: formData.short_description_bn || null,
        short_description_en: formData.short_description_en || null,
        long_description_bn: formData.long_description_bn || null,
        long_description_en: formData.long_description_en || null,
        brand: formData.brand || null,
        manufacturer: formData.manufacturer || null,
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        ingredients: formData.ingredients || null,
        warranty: formData.warranty || null,
        delivery_time: formData.delivery_time || null,
        return_policy: formData.return_policy || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        meta_keywords: formData.meta_keywords.length > 0 ? formData.meta_keywords : null,
        canonical_url: formData.canonical_url || null,
        og_title: formData.og_title || null,
        og_description: formData.og_description || null,
        og_image: formData.og_image || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('universal_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রোডাক্ট আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('universal_products')
          .insert([productData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রোডাক্ট যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (product: UniversalProduct) => {
    setEditingProduct(product);
    setFormData({
      product_type: product.product_type,
      name_bn: product.name_bn,
      name_en: product.name_en,
      slug: product.slug,
      sku: product.sku || '',
      category_id: product.category_id || '',
      price: product.price,
      original_price: product.original_price || 0,
      discount_percent: product.discount_percent || 0,
      stock_quantity: product.stock_quantity || 0,
      images: product.images || [],
      video_url: product.video_url || '',
      short_description_bn: product.short_description_bn || '',
      short_description_en: product.short_description_en || '',
      long_description_bn: product.long_description_bn || '',
      long_description_en: product.long_description_en || '',
      brand: product.brand || '',
      manufacturer: product.manufacturer || '',
      weight: product.weight || '',
      dimensions: product.dimensions || '',
      ingredients: product.ingredients || '',
      warranty: product.warranty || '',
      delivery_time: product.delivery_time || '',
      return_policy: product.return_policy || '',
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      meta_keywords: product.meta_keywords || [],
      canonical_url: product.canonical_url || '',
      og_title: product.og_title || '',
      og_description: product.og_description || '',
      og_image: product.og_image || '',
      is_active: product.is_active,
      is_featured: product.is_featured,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই প্রোডাক্ট মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('universal_products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'সফল', description: 'প্রোডাক্ট মুছে ফেলা হয়েছে' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      product_type: 'lifestyle',
      name_bn: '',
      name_en: '',
      slug: '',
      sku: '',
      category_id: '',
      price: 0,
      original_price: 0,
      discount_percent: 0,
      stock_quantity: 0,
      images: [],
      video_url: '',
      short_description_bn: '',
      short_description_en: '',
      long_description_bn: '',
      long_description_en: '',
      brand: '',
      manufacturer: '',
      weight: '',
      dimensions: '',
      ingredients: '',
      warranty: '',
      delivery_time: '',
      return_policy: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: [],
      canonical_url: '',
      og_title: '',
      og_description: '',
      og_image: '',
      is_active: true,
      is_featured: false,
    });
    setKeywordInput('');
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.meta_keywords.includes(keywordInput.trim())) {
      setFormData({ ...formData, meta_keywords: [...formData.meta_keywords, keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({ ...formData, meta_keywords: formData.meta_keywords.filter(k => k !== keyword) });
  };

  const filteredCategories = categories.filter(c => c.product_type === formData.product_type);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.product_type === filterType;
    return matchesSearch && matchesType;
  });

  const getProductTypeLabel = (type: ProductType) => {
    return PRODUCT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ইউনিভার্সাল প্রোডাক্ট</h1>
            <p className="text-muted-foreground">লাইফস্টাইল, স্টেশনারী ও ফুড প্রোডাক্ট ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />নতুন প্রোডাক্ট</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic">মূল তথ্য</TabsTrigger>
                    <TabsTrigger value="pricing">মূল্য ও স্টক</TabsTrigger>
                    <TabsTrigger value="details">বিস্তারিত</TabsTrigger>
                    <TabsTrigger value="optional">অপশনাল</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                  </TabsList>

                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div>
                      <Label>প্রোডাক্ট টাইপ *</Label>
                      <Select 
                        value={formData.product_type} 
                        onValueChange={(value: ProductType) => setFormData({ ...formData, product_type: value, category_id: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>নাম (বাংলা) *</Label>
                        <Input value={formData.name_bn} onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Name (English) *</Label>
                        <Input value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Slug (SEO URL)</Label>
                        <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                      </div>
                      <div>
                        <Label>SKU / প্রোডাক্ট কোড</Label>
                        <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>ক্যাটাগরি</Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">কোনো ক্যাটাগরি নেই</SelectItem>
                          {filteredCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                        <Label>অ্যাক্টিভ</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.is_featured} onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })} />
                        <Label>ফিচার্ড</Label>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Pricing Tab */}
                  <TabsContent value="pricing" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>মূল্য (৳) *</Label>
                        <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required />
                      </div>
                      <div>
                        <Label>আসল মূল্য (৳)</Label>
                        <Input type="number" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>ডিসকাউন্ট (%)</Label>
                        <Input type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>স্টক পরিমাণ</Label>
                      <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })} />
                    </div>
                  </TabsContent>

                  {/* Details Tab */}
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div>
                      <Label>সংক্ষিপ্ত বিবরণ (বাংলা)</Label>
                      <Textarea value={formData.short_description_bn} onChange={(e) => setFormData({ ...formData, short_description_bn: e.target.value })} rows={2} />
                    </div>
                    <div>
                      <Label>Short Description (English)</Label>
                      <Textarea value={formData.short_description_en} onChange={(e) => setFormData({ ...formData, short_description_en: e.target.value })} rows={2} />
                    </div>
                    <div>
                      <Label>বিস্তারিত বিবরণ (বাংলা)</Label>
                      <Textarea value={formData.long_description_bn} onChange={(e) => setFormData({ ...formData, long_description_bn: e.target.value })} rows={5} placeholder="রিচ টেক্সট সাপোর্ট - হেডিং, বুলেট পয়েন্ট, টেবিল ইত্যাদি" />
                    </div>
                    <div>
                      <Label>Long Description (English)</Label>
                      <Textarea value={formData.long_description_en} onChange={(e) => setFormData({ ...formData, long_description_en: e.target.value })} rows={5} />
                    </div>
                    <div>
                      <Label>প্রোডাক্ট ছবি</Label>
                      <ProductImageUpload
                        images={formData.images}
                        onImagesChange={(images) => setFormData({ ...formData, images })}
                      />
                    </div>
                    <div>
                      <Label>ভিডিও URL (YouTube)</Label>
                      <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://youtube.com/..." />
                    </div>
                  </TabsContent>

                  {/* Optional Fields Tab */}
                  <TabsContent value="optional" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ব্র্যান্ড</Label>
                        <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                      </div>
                      <div>
                        <Label>প্রস্তুতকারক</Label>
                        <Input value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ওজন</Label>
                        <Input value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g., 500g" />
                      </div>
                      <div>
                        <Label>আকার / মাপ</Label>
                        <Input value={formData.dimensions} onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })} placeholder="e.g., 10x5x2 cm" />
                      </div>
                    </div>
                    {formData.product_type === 'food' && (
                      <div>
                        <Label>উপকরণ (Ingredients)</Label>
                        <Textarea value={formData.ingredients} onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })} rows={3} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ওয়ারেন্টি</Label>
                        <Input value={formData.warranty} onChange={(e) => setFormData({ ...formData, warranty: e.target.value })} placeholder="e.g., 1 বছর" />
                      </div>
                      <div>
                        <Label>ডেলিভারি সময়</Label>
                        <Input value={formData.delivery_time} onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })} placeholder="e.g., 3-5 দিন" />
                      </div>
                    </div>
                    <div>
                      <Label>রিটার্ন পলিসি</Label>
                      <Textarea value={formData.return_policy} onChange={(e) => setFormData({ ...formData, return_policy: e.target.value })} rows={2} />
                    </div>
                  </TabsContent>

                  {/* SEO Tab */}
                  <TabsContent value="seo" className="space-y-4 mt-4">
                    <div>
                      <Label>SEO Title</Label>
                      <Input value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} placeholder="৬০ অক্ষরের মধ্যে রাখুন" />
                    </div>
                    <div>
                      <Label>Meta Description</Label>
                      <Textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={2} placeholder="১৬০ অক্ষরের মধ্যে রাখুন" />
                    </div>
                    <div>
                      <Label>Meta Keywords</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={keywordInput} 
                          onChange={(e) => setKeywordInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          placeholder="কীওয়ার্ড লিখুন" 
                        />
                        <Button type="button" variant="outline" onClick={addKeyword}>যোগ করুন</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.meta_keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="gap-1">
                            {keyword}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(keyword)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Canonical URL</Label>
                      <Input value={formData.canonical_url} onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Open Graph (Social Share)</h4>
                      <div className="space-y-3">
                        <div>
                          <Label>OG Title</Label>
                          <Input value={formData.og_title} onChange={(e) => setFormData({ ...formData, og_title: e.target.value })} />
                        </div>
                        <div>
                          <Label>OG Description</Label>
                          <Textarea value={formData.og_description} onChange={(e) => setFormData({ ...formData, og_description: e.target.value })} rows={2} />
                        </div>
                        <div>
                          <Label>OG Image URL</Label>
                          <Input value={formData.og_image} onChange={(e) => setFormData({ ...formData, og_image: e.target.value })} placeholder="https://..." />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
                  <Button type="submit">{editingProduct ? 'আপডেট করুন' : 'সেভ করুন'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="প্রোডাক্ট খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(value: ProductType | 'all') => setFilterType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="সব টাইপ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব টাইপ</SelectItem>
              {PRODUCT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4">ছবি</th>
                      <th className="text-left p-4">নাম</th>
                      <th className="text-left p-4">টাইপ</th>
                      <th className="text-left p-4">মূল্য</th>
                      <th className="text-left p-4">স্টক</th>
                      <th className="text-left p-4">স্ট্যাটাস</th>
                      <th className="text-right p-4">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="p-4">
                          <img
                            src={product.images?.[0] || '/placeholder.svg'}
                            alt={product.name_bn}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{product.name_bn}</div>
                          <div className="text-sm text-muted-foreground">{product.name_en}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{getProductTypeLabel(product.product_type)}</Badge>
                        </td>
                        <td className="p-4">৳{product.price}</td>
                        <td className="p-4">{product.stock_quantity}</td>
                        <td className="p-4">
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'অ্যাক্টিভ' : 'ইনঅ্যাক্টিভ'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUniversalProducts;
