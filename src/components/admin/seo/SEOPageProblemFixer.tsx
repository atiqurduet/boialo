import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  XCircle, AlertTriangle, CheckCircle2, ImageIcon, Search,
  Save, Loader2, ChevronDown, ChevronUp, Upload, ExternalLink
} from 'lucide-react';

interface PageProblem {
  type: string;
  id: string;
  name: string;
  slug: string;
  table: string;
  problems: { type: 'error' | 'warning'; message: string; field: string }[];
  image_url?: string;
  meta_title?: string;
  meta_description?: string;
}

export const PageProblemFixer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterProblem, setFilterProblem] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const { data: products = [] } = useQuery({
    queryKey: ['page-problems-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, title_bn, slug, image_url, images, meta_title, meta_description, meta_keywords, description').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['page-problems-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_bn, name_en, slug, image_url, meta_title, meta_description, is_active').order('sort_order');
      return data || [];
    }
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['page-problems-blogs'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('id, title_bn, slug, featured_image, meta_title, meta_description, content_bn, excerpt_bn, status').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: universalProducts = [] } = useQuery({
    queryKey: ['page-problems-universal'],
    queryFn: async () => {
      const { data } = await supabase.from('universal_products').select('id, name_bn, slug, meta_title, meta_description, meta_keywords, description_bn').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: writers = [] } = useQuery({
    queryKey: ['page-problems-writers'],
    queryFn: async () => {
      const { data } = await supabase.from('writers').select('id, name_bn, slug, image_url, bio_bn, meta_title, meta_description').order('name_bn');
      return data || [];
    }
  });

  const { data: publishers = [] } = useQuery({
    queryKey: ['page-problems-publishers'],
    queryFn: async () => {
      const { data } = await supabase.from('publishers').select('id, name_bn, slug, logo_url, meta_title, meta_description').order('name_bn');
      return data || [];
    }
  });

  // Build comprehensive problem list
  const allPages = useMemo(() => {
    const pages: PageProblem[] = [];

    products.forEach((p: any) => {
      const problems: PageProblem['problems'] = [];
      if (!p.image_url && (!p.images || (Array.isArray(p.images) && p.images.length === 0))) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!p.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!p.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!p.meta_keywords) problems.push({ type: 'warning', message: 'কীওয়ার্ড নেই', field: 'meta_keywords' });
      if (!p.description) problems.push({ type: 'warning', message: 'বর্ণনা নেই', field: 'description' });
      if (problems.length > 0) {
        pages.push({
          type: 'বই', id: p.id, name: p.title || p.title_bn, slug: p.slug, table: 'products',
          problems, image_url: p.image_url, meta_title: p.meta_title, meta_description: p.meta_description,
        });
      }
    });

    categories.forEach((c: any) => {
      const problems: PageProblem['problems'] = [];
      if (!c.image_url) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!c.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!c.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (problems.length > 0) {
        pages.push({
          type: 'ক্যাটাগরি', id: c.id, name: c.name_bn, slug: c.slug, table: 'categories',
          problems, image_url: c.image_url, meta_title: c.meta_title, meta_description: c.meta_description,
        });
      }
    });

    blogPosts.forEach((b: any) => {
      const problems: PageProblem['problems'] = [];
      if (!b.featured_image) problems.push({ type: 'error', message: 'ফিচার্ড ইমেজ নেই', field: 'image' });
      if (!b.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!b.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!b.content_bn) problems.push({ type: 'error', message: 'কন্টেন্ট নেই', field: 'content' });
      if (problems.length > 0) {
        pages.push({
          type: 'ব্লগ', id: b.id, name: b.title_bn, slug: b.slug, table: 'blog_posts',
          problems, image_url: b.featured_image, meta_title: b.meta_title, meta_description: b.meta_description,
        });
      }
    });

    universalProducts.forEach((u: any) => {
      const problems: PageProblem['problems'] = [];
      if (!u.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!u.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!u.meta_keywords) problems.push({ type: 'warning', message: 'কীওয়ার্ড নেই', field: 'meta_keywords' });
      if (!u.description_bn) problems.push({ type: 'warning', message: 'বর্ণনা নেই', field: 'description' });
      if (problems.length > 0) {
        pages.push({
          type: 'প্রোডাক্ট', id: u.id, name: u.name_bn, slug: u.slug, table: 'universal_products',
          problems, meta_title: u.meta_title, meta_description: u.meta_description,
        });
      }
    });

    writers.forEach((w: any) => {
      const problems: PageProblem['problems'] = [];
      if (!w.image_url) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!w.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!w.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!w.bio_bn) problems.push({ type: 'warning', message: 'বায়ো নেই', field: 'bio' });
      if (problems.length > 0) {
        pages.push({
          type: 'লেখক', id: w.id, name: w.name_bn, slug: w.slug, table: 'writers',
          problems, image_url: w.image_url, meta_title: w.meta_title, meta_description: w.meta_description,
        });
      }
    });

    publishers.forEach((pub: any) => {
      const problems: PageProblem['problems'] = [];
      if (!pub.logo_url) problems.push({ type: 'error', message: 'লোগো নেই', field: 'image' });
      if (!pub.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!pub.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (problems.length > 0) {
        pages.push({
          type: 'প্রকাশনী', id: pub.id, name: pub.name_bn, slug: pub.slug, table: 'publishers',
          problems, image_url: pub.logo_url, meta_title: pub.meta_title, meta_description: pub.meta_description,
        });
      }
    });

    return pages;
  }, [products, categories, blogPosts, universalProducts, writers, publishers]);

  // Filter
  const filtered = useMemo(() => {
    let result = allPages;
    if (filterType !== 'all') result = result.filter(p => p.type === filterType);
    if (filterProblem === 'image') result = result.filter(p => p.problems.some(pr => pr.field === 'image'));
    else if (filterProblem === 'meta') result = result.filter(p => p.problems.some(pr => pr.field === 'meta_title' || pr.field === 'meta_description'));
    else if (filterProblem === 'content') result = result.filter(p => p.problems.some(pr => pr.field === 'content' || pr.field === 'description'));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.slug?.includes(q));
    }
    return result;
  }, [allPages, filterType, filterProblem, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: allPages.length,
    noImage: allPages.filter(p => p.problems.some(pr => pr.field === 'image')).length,
    noMeta: allPages.filter(p => p.problems.some(pr => pr.field === 'meta_title' || pr.field === 'meta_description')).length,
    noContent: allPages.filter(p => p.problems.some(pr => pr.field === 'content' || pr.field === 'description')).length,
  }), [allPages]);

  const types = [...new Set(allPages.map(p => p.type))];

  const saveMutation = useMutation({
    mutationFn: async ({ table, id, values }: { table: string; id: string; values: any }) => {
      const { error } = await supabase.from(table as any).update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-problems-products'] });
      queryClient.invalidateQueries({ queryKey: ['page-problems-categories'] });
      queryClient.invalidateQueries({ queryKey: ['page-problems-blogs'] });
      queryClient.invalidateQueries({ queryKey: ['page-problems-universal'] });
      queryClient.invalidateQueries({ queryKey: ['page-problems-writers'] });
      queryClient.invalidateQueries({ queryKey: ['page-problems-publishers'] });
      setExpandedId(null);
      toast({ title: '✅ সেভ হয়েছে!' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const handleExpand = (page: PageProblem) => {
    if (expandedId === page.id) { setExpandedId(null); return; }
    setExpandedId(page.id);
    setEditValues({ image_url: page.image_url || '' });
  };

  const handleSaveImage = (page: PageProblem, url: string) => {
    const imageField = page.table === 'publishers' ? 'logo_url' : page.table === 'blog_posts' ? 'featured_image' : 'image_url';
    saveMutation.mutate({ table: page.table, id: page.id, values: { [imageField]: url } });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.total}</p>
            <p className="text-xs text-muted-foreground">মোট সমস্যা সহ পেজ</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('image')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-500">{stats.noImage}</p>
            <p className="text-xs text-muted-foreground">🖼️ ইমেজ নেই</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('meta')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.noMeta}</p>
            <p className="text-xs text-muted-foreground">📝 মেটা নেই</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('content')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{stats.noContent}</p>
            <p className="text-xs text-muted-foreground">📄 কন্টেন্ট নেই</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="নাম বা স্লাগ দিয়ে খুঁজুন..." className="pl-9"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProblem} onValueChange={setFilterProblem}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব সমস্যা</SelectItem>
                <SelectItem value="image">🖼️ ইমেজ নেই</SelectItem>
                <SelectItem value="meta">📝 মেটা নেই</SelectItem>
                <SelectItem value="content">📄 কন্টেন্ট নেই</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length}টি পেজ</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pages List */}
      <div className="space-y-2 max-h-[700px] overflow-y-auto">
        {filtered.map(page => {
          const isExpanded = expandedId === page.id;
          const hasImageProblem = page.problems.some(p => p.field === 'image');
          const errorCount = page.problems.filter(p => p.type === 'error').length;
          const warningCount = page.problems.filter(p => p.type === 'warning').length;

          return (
            <div key={`${page.type}-${page.id}`}
              className={`border rounded-lg transition-all ${hasImageProblem ? 'border-red-200' : 'border-yellow-200'} ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
              <div className="p-3 cursor-pointer flex items-center justify-between gap-3"
                onClick={() => handleExpand(page)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Image preview or placeholder */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {page.image_url ? (
                      <img src={page.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{page.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{page.type}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">/{page.slug}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {errorCount > 0 && <Badge variant="destructive" className="text-xs">{errorCount} ত্রুটি</Badge>}
                  {warningCount > 0 && <Badge className="text-xs bg-yellow-100 text-yellow-800">{warningCount} সতর্কতা</Badge>}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-4 border-t space-y-4">
                  {/* Problems */}
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {page.problems.map((problem, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${problem.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        {problem.type === 'error' ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                        <span>{problem.message}</span>
                      </div>
                    ))}
                  </div>

                  {/* Image Upload Fix */}
                  {hasImageProblem && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Upload className="h-4 w-4" /> ইমেজ আপলোড করে ফিক্স করুন
                      </h4>
                      <LogoUpload
                        value={editValues.image_url || ''}
                        onChange={(url) => {
                          setEditValues(prev => ({ ...prev, image_url: url }));
                          if (url) handleSaveImage(page, url);
                        }}
                        label={page.type === 'প্রকাশনী' ? 'লোগো আপলোড' : page.type === 'ব্লগ' ? 'ফিচার্ড ইমেজ' : 'ইমেজ আপলোড'}
                        folder={page.table === 'categories' ? 'categories' : page.table === 'publishers' ? 'branding' : 'product-images'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
          <p className="font-medium">কোনো সমস্যা পাওয়া যায়নি! 🎉</p>
          <p className="text-sm">সব পেজ ঠিক আছে।</p>
        </div>
      )}
    </div>
  );
};
