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
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { ProductImageUpload } from '@/components/admin/ProductImageUpload';
import { ProductPreviewUpload } from '@/components/admin/ProductPreviewUpload';

interface Product {
  id: string;
  title_bn: string;
  title_en: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount_percent: number;
  author: string | null;
  publisher: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_preorder: boolean;
  is_featured: boolean;
  category_id: string | null;
  writer_id: string | null;
  publisher_id: string | null;
  brand_id: string | null;
  images: any;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  isbn: string | null;
  description_bn: string | null;
  description_en: string | null;
  preview_url: string | null;
}

interface Category {
  id: string;
  name_bn: string;
  parent_id: string | null;
}

interface Writer {
  id: string;
  name_bn: string;
  name_en: string;
}

interface Publisher {
  id: string;
  name_bn: string;
  name_en: string;
}

interface Brand {
  id: string;
  name_bn: string;
  name_en: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title_bn: '',
    title_en: '',
    slug: '',
    price: 0,
    original_price: 0,
    discount_percent: 0,
    author: '',
    publisher: '',
    stock_quantity: 0,
    is_active: true,
    is_preorder: false,
    is_featured: false,
    category_id: '',
    writer_id: '',
    publisher_id: '',
    brand_id: '',
    description_bn: '',
    description_en: '',
    images: [] as string[],
    meta_title: '',
    meta_description: '',
    tags: [] as string[],
    isbn: '',
    preview_url: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchWriters();
    fetchPublishers();
    fetchBrands();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
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
        .from('categories')
        .select('id, name_bn, parent_id')
        .eq('is_active', true)
        .order('name_bn');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWriters = async () => {
    try {
      const { data, error } = await supabase
        .from('writers')
        .select('id, name_bn, name_en')
        .eq('is_active', true)
        .order('name_bn');
      if (error) throw error;
      setWriters(data || []);
    } catch (error) {
      console.error('Error fetching writers:', error);
    }
  };

  const fetchPublishers = async () => {
    try {
      const { data, error } = await supabase
        .from('publishers')
        .select('id, name_bn, name_en')
        .eq('is_active', true)
        .order('name_bn');
      if (error) throw error;
      setPublishers(data || []);
    } catch (error) {
      console.error('Error fetching publishers:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name_bn, name_en')
        .eq('is_active', true)
        .order('name_bn');
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-|-$/g, '');
  };

  const getCategoryPath = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return '';
    if (cat.parent_id) {
      const parent = getCategoryPath(cat.parent_id);
      return parent ? `${parent} → ${cat.name_bn}` : cat.name_bn;
    }
    return cat.name_bn;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        title_bn: formData.title_bn,
        title_en: formData.title_en,
        slug: formData.slug || generateSlug(formData.title_en),
        price: formData.price,
        original_price: formData.original_price || null,
        discount_percent: formData.discount_percent,
        author: formData.author || null,
        publisher: formData.publisher || null,
        stock_quantity: formData.stock_quantity,
        is_active: formData.is_active,
        is_preorder: formData.is_preorder,
        is_featured: formData.is_featured,
        category_id: formData.category_id || null,
        writer_id: formData.writer_id || null,
        publisher_id: formData.publisher_id || null,
        brand_id: formData.brand_id || null,
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        images: formData.images,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        isbn: formData.isbn || null,
        preview_url: formData.preview_url || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'প্রোডাক্ট আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('products')
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title_bn: product.title_bn,
      title_en: product.title_en,
      slug: product.slug,
      price: product.price,
      original_price: product.original_price || 0,
      discount_percent: product.discount_percent,
      author: product.author || '',
      publisher: product.publisher || '',
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
      is_preorder: product.is_preorder,
      is_featured: product.is_featured,
      category_id: product.category_id || '',
      writer_id: product.writer_id || '',
      publisher_id: product.publisher_id || '',
      brand_id: product.brand_id || '',
      description_bn: product.description_bn || '',
      description_en: product.description_en || '',
      images: product.images || [],
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      tags: product.tags || [],
      isbn: product.isbn || '',
      preview_url: (product as any).preview_url || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই প্রোডাক্ট মুছতে চান?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
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
      title_bn: '',
      title_en: '',
      slug: '',
      price: 0,
      original_price: 0,
      discount_percent: 0,
      author: '',
      publisher: '',
      stock_quantity: 0,
      is_active: true,
      is_preorder: false,
      is_featured: false,
      category_id: '',
      writer_id: '',
      publisher_id: '',
      brand_id: '',
      description_bn: '',
      description_en: '',
      images: [],
      meta_title: '',
      meta_description: '',
      tags: [],
      isbn: '',
      preview_url: '',
    });
    setTagInput('');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const filteredProducts = products.filter(p =>
    p.title_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">প্রোডাক্ট</h1>
            <p className="text-muted-foreground">সকল প্রোডাক্ট ম্যানেজ করুন</p>
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">মূল তথ্য</TabsTrigger>
                    <TabsTrigger value="pricing">মূল্য ও স্টক</TabsTrigger>
                    <TabsTrigger value="relations">সম্পর্ক</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                  </TabsList>

                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>নাম (বাংলা) *</Label>
                        <Input value={formData.title_bn} onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })} required />
                      </div>
                      <div>
                        <Label>Name (English) *</Label>
                        <Input value={formData.title_en} onChange={(e) => setFormData({ ...formData, title_en: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Slug</Label>
                        <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                      </div>
                      <div>
                        <Label>ISBN</Label>
                        <Input value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} placeholder="978-..." />
                      </div>
                    </div>
                    <div>
                      <Label>বিবরণ (বাংলা)</Label>
                      <Textarea value={formData.description_bn} onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })} rows={3} />
                    </div>
                    <div>
                      <Label>Description (English)</Label>
                      <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} rows={3} />
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                        <Label>অ্যাক্টিভ</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.is_preorder} onCheckedChange={(checked) => setFormData({ ...formData, is_preorder: checked })} />
                        <Label>প্রি-অর্ডার</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={formData.is_featured} onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })} />
                        <Label>ফিচার্ড</Label>
                      </div>
                    </div>

                    {/* Product Images Upload */}
                    <div>
                      <Label className="text-base font-medium">প্রোডাক্ট ইমেজ</Label>
                      <p className="text-sm text-muted-foreground mb-2">প্রোডাক্টের ছবি আপলোড করুন। প্রথম ইমেজটি প্রধান ইমেজ হিসেবে দেখানো হবে।</p>
                      <ProductImageUpload
                        images={formData.images}
                        onImagesChange={(images) => setFormData({ ...formData, images })}
                        productId={editingProduct?.id}
                      />
                    </div>

                    {/* একটু পড়ুন (Read a bit) Upload */}
                    <div>
                      <Label className="text-base font-medium">একটু পড়ুন (প্রিভিউ)</Label>
                      <p className="text-sm text-muted-foreground mb-2">বইয়ের কিছু পৃষ্ঠা বা স্যাম্পল চ্যাপ্টার যোগ করুন (ইমেজ বা PDF)</p>
                      <ProductPreviewUpload
                        previewUrl={formData.preview_url}
                        onPreviewChange={(url) => setFormData({ ...formData, preview_url: url })}
                        productId={editingProduct?.id}
                      />
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
                        <Label>পূর্বের মূল্য (৳)</Label>
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

                  {/* Relations Tab */}
                  <TabsContent value="relations" className="space-y-4 mt-4">
                    <div>
                      <Label>ক্যাটাগরি</Label>
                      <Select value={formData.category_id || "none"} onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">কোন ক্যাটাগরি নেই</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{getCategoryPath(cat.id)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>লেখক (ডাটাবেস থেকে)</Label>
                      <Select value={formData.writer_id || "none"} onValueChange={(value) => setFormData({ ...formData, writer_id: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="লেখক নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">কোন লেখক নেই</SelectItem>
                          {writers.map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name_bn} ({w.name_en})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>প্রকাশনী (ডাটাবেস থেকে)</Label>
                      <Select value={formData.publisher_id || "none"} onValueChange={(value) => setFormData({ ...formData, publisher_id: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="প্রকাশনী নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">কোন প্রকাশনী নেই</SelectItem>
                          {publishers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name_bn} ({p.name_en})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>ব্র্যান্ড</Label>
                      <Select value={formData.brand_id || "none"} onValueChange={(value) => setFormData({ ...formData, brand_id: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="ব্র্যান্ড নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">কোন ব্র্যান্ড নেই</SelectItem>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name_bn} ({b.name_en})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>লেখক (টেক্সট)</Label>
                        <Input value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} placeholder="লেখকের নাম" />
                      </div>
                      <div>
                        <Label>প্রকাশক (টেক্সট)</Label>
                        <Input value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} placeholder="প্রকাশকের নাম" />
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEO Tab */}
                  <TabsContent value="seo" className="space-y-4 mt-4">
                    <div>
                      <Label>Meta Title</Label>
                      <Input value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} placeholder="SEO টাইটেল (৬০ অক্ষরের কম)" maxLength={60} />
                      <p className="text-xs text-muted-foreground mt-1">{formData.meta_title.length}/60</p>
                    </div>
                    <div>
                      <Label>Meta Description</Label>
                      <Textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} placeholder="SEO বিবরণ (১৬০ অক্ষরের কম)" maxLength={160} rows={3} />
                      <p className="text-xs text-muted-foreground mt-1">{formData.meta_description.length}/160</p>
                    </div>
                    <div>
                      <Label>Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="ট্যাগ লিখুন"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" onClick={addTag}>যোগ করুন</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button type="submit" className="w-full">{editingProduct ? 'আপডেট করুন' : 'যোগ করুন'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="প্রোডাক্ট খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন প্রোডাক্ট নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">প্রোডাক্ট</th>
                      <th className="text-left py-3 px-4 font-medium">মূল্য</th>
                      <th className="text-left py-3 px-4 font-medium">স্টক</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{product.title_bn}</p>
                            <p className="text-sm text-muted-foreground">{product.author}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">৳{product.price}</p>
                          {product.original_price && (
                            <p className="text-sm text-muted-foreground line-through">৳{product.original_price}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={product.stock_quantity < 10 ? 'text-destructive' : ''}>{product.stock_quantity}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {product.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">অ্যাক্টিভ</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">ইনঅ্যাক্টিভ</span>
                            )}
                            {product.is_preorder && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">প্রি-অর্ডার</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminProducts;
