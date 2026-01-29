import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Tag, Gift, Clock, Users, Eye, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { OfferBannerUpload } from '@/components/admin/OfferBannerUpload';

interface Offer {
  id: string;
  name_bn: string;
  name_en: string | null;
  slug: string;
  description_bn: string | null;
  offer_type: string;
  discount_value: number;
  buy_quantity: number;
  get_quantity: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_per_customer: number;
  used_count: number;
  applies_to: string;
  product_ids: string[];
  category_ids: string[];
  start_date: string | null;
  end_date: string | null;
  new_customers_only: boolean;
  is_active: boolean;
  is_featured: boolean;
  banner_image: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name_bn: string;
  slug: string;
}

interface Product {
  id: string;
  title_bn: string;
  slug: string;
}

const AdminOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name_bn: '',
    name_en: '',
    slug: '',
    description_bn: '',
    offer_type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping',
    discount_value: 0,
    buy_quantity: 2,
    get_quantity: 1,
    min_order_amount: 0,
    max_discount_amount: '',
    usage_limit: '',
    usage_per_customer: 1,
    applies_to: 'all_products' as 'all_products' | 'specific_products' | 'specific_categories',
    product_ids: [] as string[],
    category_ids: [] as string[],
    start_date: '',
    end_date: '',
    new_customers_only: false,
    is_active: true,
    is_featured: false,
    banner_image: '',
    meta_title: '',
    meta_description: ''
  });

  useEffect(() => {
    fetchOffers();
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({ title: 'Error', description: 'অফার লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name_bn, slug')
      .eq('is_active', true);
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, title_bn, slug')
      .eq('is_active', true)
      .limit(100);
    setProducts(data || []);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const offerData = {
        name_bn: formData.name_bn,
        name_en: formData.name_en || null,
        slug: formData.slug || generateSlug(formData.name_bn),
        description_bn: formData.description_bn || null,
        offer_type: formData.offer_type,
        discount_value: formData.offer_type === 'buy_x_get_y' || formData.offer_type === 'free_shipping' 
          ? 0 
          : formData.discount_value,
        buy_quantity: formData.offer_type === 'buy_x_get_y' ? formData.buy_quantity : 0,
        get_quantity: formData.offer_type === 'buy_x_get_y' ? formData.get_quantity : 0,
        min_order_amount: formData.min_order_amount,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        usage_per_customer: formData.usage_per_customer,
        applies_to: formData.applies_to,
        product_ids: formData.applies_to === 'specific_products' ? formData.product_ids : [],
        category_ids: formData.applies_to === 'specific_categories' ? formData.category_ids : [],
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        new_customers_only: formData.new_customers_only,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        banner_image: formData.banner_image || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        toast({ title: 'সফল', description: 'অফার আপডেট হয়েছে' });
      } else {
        const { error } = await supabase
          .from('offers')
          .insert([offerData]);

        if (error) throw error;
        toast({ title: 'সফল', description: 'অফার যোগ হয়েছে' });
      }

      setDialogOpen(false);
      resetForm();
      fetchOffers();
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      name_bn: offer.name_bn,
      name_en: offer.name_en || '',
      slug: offer.slug,
      description_bn: offer.description_bn || '',
      offer_type: offer.offer_type as any,
      discount_value: offer.discount_value,
      buy_quantity: offer.buy_quantity || 2,
      get_quantity: offer.get_quantity || 1,
      min_order_amount: offer.min_order_amount,
      max_discount_amount: offer.max_discount_amount?.toString() || '',
      usage_limit: offer.usage_limit?.toString() || '',
      usage_per_customer: offer.usage_per_customer,
      applies_to: offer.applies_to as any,
      product_ids: offer.product_ids || [],
      category_ids: offer.category_ids || [],
      start_date: offer.start_date?.split('T')[0] || '',
      end_date: offer.end_date?.split('T')[0] || '',
      new_customers_only: offer.new_customers_only,
      is_active: offer.is_active,
      is_featured: offer.is_featured,
      banner_image: offer.banner_image || '',
      meta_title: '',
      meta_description: ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই অফার মুছতে চান?')) return;

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'সফল', description: 'অফার মুছে ফেলা হয়েছে' });
      fetchOffers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'সফল', description: `অফার ${isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করা হয়েছে` });
      fetchOffers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(`/offers/${slug}`);
    toast({ title: 'কপি হয়েছে', description: 'অফার লিংক কপি হয়েছে' });
  };

  const resetForm = () => {
    setEditingOffer(null);
    setFormData({
      name_bn: '',
      name_en: '',
      slug: '',
      description_bn: '',
      offer_type: 'percentage',
      discount_value: 0,
      buy_quantity: 2,
      get_quantity: 1,
      min_order_amount: 0,
      max_discount_amount: '',
      usage_limit: '',
      usage_per_customer: 1,
      applies_to: 'all_products',
      product_ids: [],
      category_ids: [],
      start_date: '',
      end_date: '',
      new_customers_only: false,
      is_active: true,
      is_featured: false,
      banner_image: '',
      meta_title: '',
      meta_description: ''
    });
  };

  const getOfferTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'শতাংশ ছাড়';
      case 'fixed_amount': return 'নির্দিষ্ট ছাড়';
      case 'buy_x_get_y': return 'বাই X গেট Y';
      case 'free_shipping': return 'ফ্রি শিপিং';
      default: return type;
    }
  };

  const getOfferValue = (offer: Offer) => {
    switch (offer.offer_type) {
      case 'percentage': return `${offer.discount_value}% ছাড়`;
      case 'fixed_amount': return `৳${offer.discount_value} ছাড়`;
      case 'buy_x_get_y': return `${offer.buy_quantity}টা কিনলে ${offer.get_quantity}টা ফ্রি`;
      case 'free_shipping': return 'ফ্রি ডেলিভারি';
      default: return '';
    }
  };

  const isOfferActive = (offer: Offer) => {
    if (!offer.is_active) return false;
    const now = new Date();
    if (offer.start_date && new Date(offer.start_date) > now) return false;
    if (offer.end_date && new Date(offer.end_date) < now) return false;
    return true;
  };

  const filteredOffers = offers.filter(offer => {
    switch (activeTab) {
      case 'active': return isOfferActive(offer);
      case 'inactive': return !isOfferActive(offer);
      case 'featured': return offer.is_featured;
      default: return true;
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">অফার ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground">সব ধরনের অফার ও প্রমোশন ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                নতুন অফার
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOffer ? 'অফার এডিট' : 'নতুন অফার'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">বেসিক</TabsTrigger>
                    <TabsTrigger value="conditions">শর্তাবলী</TabsTrigger>
                    <TabsTrigger value="targeting">টার্গেটিং</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>অফারের নাম (বাংলা) *</Label>
                        <Input
                          value={formData.name_bn}
                          onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                          placeholder="বিশেষ ঈদ অফার"
                          required
                        />
                      </div>
                      <div>
                        <Label>অফারের নাম (English)</Label>
                        <Input
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          placeholder="Special Eid Offer"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="special-eid-offer"
                      />
                    </div>

                    <div>
                      <Label>বিবরণ</Label>
                      <Textarea
                        value={formData.description_bn}
                        onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })}
                        placeholder="অফারের বিস্তারিত বিবরণ..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>অফার টাইপ *</Label>
                      <Select
                        value={formData.offer_type}
                        onValueChange={(v) => setFormData({ ...formData, offer_type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">শতাংশ ছাড় (%)</SelectItem>
                          <SelectItem value="fixed_amount">নির্দিষ্ট পরিমাণ ছাড় (৳)</SelectItem>
                          <SelectItem value="buy_x_get_y">বাই X গেট Y</SelectItem>
                          <SelectItem value="free_shipping">ফ্রি শিপিং</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.offer_type === 'percentage' || formData.offer_type === 'fixed_amount') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>ছাড়ের পরিমাণ *</Label>
                          <Input
                            type="number"
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                            placeholder={formData.offer_type === 'percentage' ? '20' : '100'}
                            required
                          />
                        </div>
                        {formData.offer_type === 'percentage' && (
                          <div>
                            <Label>সর্বোচ্চ ছাড় (৳)</Label>
                            <Input
                              type="number"
                              value={formData.max_discount_amount}
                              onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                              placeholder="500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {formData.offer_type === 'buy_x_get_y' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>কতটা কিনতে হবে (X)</Label>
                          <Input
                            type="number"
                            value={formData.buy_quantity}
                            onChange={(e) => setFormData({ ...formData, buy_quantity: Number(e.target.value) })}
                            min={1}
                          />
                        </div>
                        <div>
                          <Label>কতটা ফ্রি পাবে (Y)</Label>
                          <Input
                            type="number"
                            value={formData.get_quantity}
                            onChange={(e) => setFormData({ ...formData, get_quantity: Number(e.target.value) })}
                            min={1}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label>অ্যাক্টিভ</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                        />
                        <Label>ফিচার্ড</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="conditions" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>মিনিমাম অর্ডার (৳)</Label>
                        <Input
                          type="number"
                          value={formData.min_order_amount}
                          onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <Label>প্রতি গ্রাহক ব্যবহার সীমা</Label>
                        <Input
                          type="number"
                          value={formData.usage_per_customer}
                          onChange={(e) => setFormData({ ...formData, usage_per_customer: Number(e.target.value) })}
                          min={1}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>মোট ব্যবহার সীমা</Label>
                      <Input
                        type="number"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                        placeholder="সীমাহীন"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>শুরুর তারিখ</Label>
                        <Input
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>শেষ তারিখ</Label>
                        <Input
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.new_customers_only}
                        onCheckedChange={(checked) => setFormData({ ...formData, new_customers_only: checked })}
                      />
                      <Label>শুধু নতুন গ্রাহকদের জন্য</Label>
                    </div>
                  </TabsContent>

                  <TabsContent value="targeting" className="space-y-4 mt-4">
                    <div>
                      <Label>কোথায় প্রযোজ্য *</Label>
                      <Select
                        value={formData.applies_to}
                        onValueChange={(v) => setFormData({ ...formData, applies_to: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_products">সব পণ্যে</SelectItem>
                          <SelectItem value="specific_categories">নির্দিষ্ট ক্যাটাগরিতে</SelectItem>
                          <SelectItem value="specific_products">নির্দিষ্ট পণ্যে</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.applies_to === 'specific_categories' && (
                      <div>
                        <Label>ক্যাটাগরি নির্বাচন করুন</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-2">
                          {categories.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.category_ids.includes(cat.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, category_ids: [...formData.category_ids, cat.id] });
                                  } else {
                                    setFormData({ ...formData, category_ids: formData.category_ids.filter(id => id !== cat.id) });
                                  }
                                }}
                              />
                              {cat.name_bn}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.applies_to === 'specific_products' && (
                      <div>
                        <Label>পণ্য নির্বাচন করুন</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-2">
                          {products.map((prod) => (
                            <label key={prod.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.product_ids.includes(prod.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, product_ids: [...formData.product_ids, prod.id] });
                                  } else {
                                    setFormData({ ...formData, product_ids: formData.product_ids.filter(id => id !== prod.id) });
                                  }
                                }}
                              />
                              {prod.title_bn}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <OfferBannerUpload
                      value={formData.banner_image}
                      onChange={(url) => setFormData({ ...formData, banner_image: url })}
                      label="ব্যানার ইমেজ"
                    />
                  </TabsContent>
                </Tabs>

                <Button type="submit" className="w-full">
                  {editingOffer ? 'আপডেট করুন' : 'যোগ করুন'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Tag className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{offers.length}</div>
              <div className="text-sm text-muted-foreground">মোট অফার</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Gift className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{offers.filter(o => isOfferActive(o)).length}</div>
              <div className="text-sm text-muted-foreground">সক্রিয় অফার</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <div className="text-2xl font-bold">
                {offers.filter(o => o.end_date && new Date(o.end_date) > new Date()).length}
              </div>
              <div className="text-sm text-muted-foreground">চলমান</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{offers.reduce((acc, o) => acc + o.used_count, 0)}</div>
              <div className="text-sm text-muted-foreground">মোট ব্যবহার</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Filter */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">সব ({offers.length})</TabsTrigger>
            <TabsTrigger value="active">সক্রিয় ({offers.filter(o => isOfferActive(o)).length})</TabsTrigger>
            <TabsTrigger value="inactive">নিষ্ক্রিয় ({offers.filter(o => !isOfferActive(o)).length})</TabsTrigger>
            <TabsTrigger value="featured">ফিচার্ড ({offers.filter(o => o.is_featured).length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Offers List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">লোড হচ্ছে...</div>
            ) : filteredOffers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">কোন অফার নেই</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">অফার</th>
                      <th className="text-left py-3 px-4 font-medium">টাইপ</th>
                      <th className="text-left py-3 px-4 font-medium">ছাড়</th>
                      <th className="text-left py-3 px-4 font-medium">শর্ত</th>
                      <th className="text-left py-3 px-4 font-medium">মেয়াদ</th>
                      <th className="text-left py-3 px-4 font-medium">ব্যবহার</th>
                      <th className="text-left py-3 px-4 font-medium">স্ট্যাটাস</th>
                      <th className="text-right py-3 px-4 font-medium">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffers.map((offer) => (
                      <tr key={offer.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{offer.name_bn}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                /{offer.slug}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => copySlug(offer.slug)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {offer.is_featured && (
                              <Badge variant="secondary" className="text-xs">ফিচার্ড</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{getOfferTypeLabel(offer.offer_type)}</Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-primary">
                          {getOfferValue(offer)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {offer.min_order_amount > 0 && (
                            <div>৳{offer.min_order_amount}+ অর্ডারে</div>
                          )}
                          {offer.new_customers_only && (
                            <div className="text-orange-600">নতুন গ্রাহক</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {offer.start_date && offer.end_date ? (
                            <div>
                              <div>{format(new Date(offer.start_date), 'dd/MM/yy')}</div>
                              <div className="text-muted-foreground">থেকে {format(new Date(offer.end_date), 'dd/MM/yy')}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">সীমাহীন</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {offer.used_count}/{offer.usage_limit || '∞'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            isOfferActive(offer) 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {isOfferActive(offer) ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => window.open(`/offers?offer=${offer.slug}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(offer)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => toggleActive(offer.id, offer.is_active)}
                            >
                              <Tag className={`h-4 w-4 ${offer.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(offer.id)}>
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

export default AdminOffers;