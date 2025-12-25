import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

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
  images: any;
}

interface Category {
  id: string;
  name_bn: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    description_bn: '',
    description_en: '',
    images: [] as string[]
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
        .select('id, name_bn')
        .eq('is_active', true);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.title_en),
        original_price: formData.original_price || null,
        category_id: formData.category_id || null,
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
      description_bn: '',
      description_en: '',
      images: product.images || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই প্রোডাক্ট মুছতে চান?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

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
      description_bn: '',
      description_en: '',
      images: []
    });
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                নতুন প্রোডাক্ট
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>নাম (বাংলা)</Label>
                    <Input
                      value={formData.title_bn}
                      onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Name (English)</Label>
                    <Input
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>মূল্য (৳)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>পূর্বের মূল্য (৳)</Label>
                    <Input
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>ডিসকাউন্ট (%)</Label>
                    <Input
                      type="number"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>লেখক</Label>
                    <Input
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>প্রকাশক</Label>
                    <Input
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ক্যাটাগরি</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>স্টক পরিমাণ</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>অ্যাক্টিভ</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_preorder}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_preorder: checked })}
                    />
                    <Label>প্রি-অর্ডার</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label>ফিচার্ড</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingProduct ? 'আপডেট করুন' : 'যোগ করুন'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="প্রোডাক্ট খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Table */}
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
                            <p className="text-sm text-muted-foreground line-through">
                              ৳{product.original_price}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={product.stock_quantity < 10 ? 'text-destructive' : ''}>
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {product.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">অ্যাক্টিভ</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">ইনঅ্যাক্টিভ</span>
                            )}
                            {product.is_preorder && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">প্রি-অর্ডার</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
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

export default AdminProducts;
