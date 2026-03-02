import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Loader2, ArrowRight, ExternalLink, Link2, CheckCircle2, XCircle, AlertTriangle, Edit2 } from 'lucide-react';

// ─── Redirect Manager ───
export const RedirectManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRedirect, setNewRedirect] = useState({ source_path: '', destination_url: '', redirect_type: 301, notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: redirects = [], isLoading } = useQuery({
    queryKey: ['seo-redirects'],
    queryFn: async () => {
      const { data } = await supabase.from('seo_redirects').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const addMutation = useMutation({
    mutationFn: async (r: typeof newRedirect) => {
      const { error } = await supabase.from('seo_redirects').insert([r]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-redirects'] });
      setNewRedirect({ source_path: '', destination_url: '', redirect_type: 301, notes: '' });
      toast({ title: 'রিডাইরেক্ট যোগ হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' })
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('seo_redirects').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seo-redirects'] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seo_redirects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-redirects'] });
      toast({ title: 'রিডাইরেক্ট মুছে ফেলা হয়েছে' });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ArrowRight className="h-5 w-5" /> নতুন রিডাইরেক্ট যোগ করুন</CardTitle>
          <CardDescription>301 (স্থায়ী) বা 302 (অস্থায়ী) রিডাইরেক্ট সেটআপ করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">সোর্স পাথ</Label>
              <Input placeholder="/old-page" value={newRedirect.source_path}
                onChange={e => setNewRedirect(p => ({ ...p, source_path: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">ডেস্টিনেশন URL</Label>
              <Input placeholder="/new-page বা https://..." value={newRedirect.destination_url}
                onChange={e => setNewRedirect(p => ({ ...p, destination_url: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">টাইপ</Label>
              <Select value={String(newRedirect.redirect_type)} onValueChange={v => setNewRedirect(p => ({ ...p, redirect_type: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 (স্থায়ী)</SelectItem>
                  <SelectItem value="302">302 (অস্থায়ী)</SelectItem>
                  <SelectItem value="307">307 (টেম্পোরারি)</SelectItem>
                  <SelectItem value="308">308 (পার্মানেন্ট)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">নোট</Label>
              <Input placeholder="ঐচ্ছিক" value={newRedirect.notes}
                onChange={e => setNewRedirect(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={() => addMutation.mutate(newRedirect)} disabled={!newRedirect.source_path || !newRedirect.destination_url}>
              <Plus className="h-4 w-4 mr-1" /> যোগ করুন
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">রিডাইরেক্ট তালিকা ({redirects.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : redirects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">কোনো রিডাইরেক্ট নেই</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>সোর্স</TableHead>
                  <TableHead>ডেস্টিনেশন</TableHead>
                  <TableHead>টাইপ</TableHead>
                  <TableHead>হিট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redirects.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.source_path}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{r.destination_url}</TableCell>
                    <TableCell><Badge variant="outline">{r.redirect_type}</Badge></TableCell>
                    <TableCell>{r.hit_count}</TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={v => toggleMutation.mutate({ id: r.id, is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Bulk Meta Editor ───
export const BulkMetaEditor = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'missing_title' | 'missing_desc'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ meta_title: '', meta_description: '', meta_keywords: '' });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['bulk-meta-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, slug, meta_title, meta_description, meta_keywords, image_url').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const filtered = useMemo(() => {
    if (filter === 'missing_title') return products.filter((p: any) => !p.meta_title);
    if (filter === 'missing_desc') return products.filter((p: any) => !p.meta_description);
    return products;
  }, [products, filter]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; meta_title: string; meta_description: string; meta_keywords: string }) => {
      const { error } = await supabase.from('products').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-meta-products'] });
      queryClient.invalidateQueries({ queryKey: ['seo-products-audit'] });
      setEditingId(null);
      toast({ title: 'মেটা ডেটা সেভ হয়েছে' });
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">বাল্ক মেটা এডিটর</CardTitle>
            <CardDescription>সব প্রোডাক্টের মেটা টাইটেল, বর্ণনা ও কীওয়ার্ড একসাথে এডিট করুন</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('all')}>সব ({products.length})</Badge>
            <Badge variant={filter === 'missing_title' ? 'default' : 'outline'} className="cursor-pointer text-red-600" onClick={() => setFilter('missing_title')}>
              টাইটেল নেই ({products.filter((p: any) => !p.meta_title).length})
            </Badge>
            <Badge variant={filter === 'missing_desc' ? 'default' : 'outline'} className="cursor-pointer text-red-600" onClick={() => setFilter('missing_desc')}>
              বর্ণনা নেই ({products.filter((p: any) => !p.meta_description).length})
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.map((p: any) => (
              <div key={p.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground">/{p.slug}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.meta_title ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    {p.meta_description ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    {editingId !== p.id && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingId(p.id);
                        setEditValues({ meta_title: p.meta_title || '', meta_description: p.meta_description || '', meta_keywords: p.meta_keywords || '' });
                      }}><Edit2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </div>
                {editingId === p.id && (
                  <div className="space-y-2 mt-2 pt-2 border-t">
                    <div>
                      <Label className="text-xs">মেটা টাইটেল ({editValues.meta_title.length}/৬০)</Label>
                      <Input value={editValues.meta_title} onChange={e => setEditValues(v => ({ ...v, meta_title: e.target.value }))} placeholder={p.title} />
                    </div>
                    <div>
                      <Label className="text-xs">মেটা বর্ণনা ({editValues.meta_description.length}/১৬০)</Label>
                      <Textarea value={editValues.meta_description} onChange={e => setEditValues(v => ({ ...v, meta_description: e.target.value }))} rows={2} />
                    </div>
                    <div>
                      <Label className="text-xs">কীওয়ার্ড (কমা দিয়ে)</Label>
                      <Input value={editValues.meta_keywords} onChange={e => setEditValues(v => ({ ...v, meta_keywords: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveMutation.mutate({ id: p.id, ...editValues })} disabled={saveMutation.isPending}>
                        <Save className="h-3.5 w-3.5 mr-1" /> সেভ
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>বাতিল</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Internal Link Analyzer ───
export const InternalLinkAnalyzer = () => {
  const { data: products = [] } = useQuery({
    queryKey: ['seo-link-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, slug, description').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['seo-link-blogs'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('id, title_bn, slug, content_bn').order('created_at', { ascending: false }).limit(50);
      return data || [];
    }
  });

  const linkAnalysis = useMemo(() => {
    const pages = [
      ...products.map((p: any) => ({ name: p.title, slug: `/product/${p.slug}`, content: p.description || '' })),
      ...blogPosts.map((b: any) => ({ name: b.title_bn, slug: `/blog/${b.slug}`, content: b.content_bn || '' })),
    ];

    const orphans: typeof pages = [];
    const wellLinked: typeof pages = [];

    pages.forEach(page => {
      const isLinkedFrom = pages.some(other => other.slug !== page.slug && other.content.includes(page.slug));
      if (isLinkedFrom) {
        wellLinked.push(page);
      } else {
        orphans.push(page);
      }
    });

    return { total: pages.length, orphans, wellLinked };
  }, [products, blogPosts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> অরফান পেজ ({linkAnalysis.orphans.length})</CardTitle>
          <CardDescription>এই পেজগুলোতে কোনো ইন্টারনাল লিংক নেই — SEO ক্ষতিগ্রস্ত হচ্ছে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {linkAnalysis.orphans.slice(0, 50).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0">
                <span className="truncate max-w-[60%]">{p.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{p.slug}</span>
              </div>
            ))}
            {linkAnalysis.orphans.length === 0 && <p className="text-sm text-muted-foreground">কোনো অরফান পেজ নেই ✅</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> লিংকড পেজ ({linkAnalysis.wellLinked.length})</CardTitle>
          <CardDescription>এই পেজগুলোতে অন্তত একটি ইন্টারনাল লিংক আছে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {linkAnalysis.wellLinked.slice(0, 50).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0">
                <span className="truncate max-w-[60%]">{p.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{p.slug}</span>
              </div>
            ))}
            {linkAnalysis.wellLinked.length === 0 && <p className="text-sm text-muted-foreground">এখনো কোনো পেজ লিংকড নয়</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">💡 ইন্টারনাল লিংকিং টিপস</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">📝 ব্লগ → প্রোডাক্ট</h4>
              <p className="text-muted-foreground">প্রতিটি ব্লগ পোস্টে সংশ্লিষ্ট প্রোডাক্টের লিংক দিন। এতে প্রোডাক্ট পেজে অর্গানিক ট্রাফিক বাড়বে।</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">🔗 ক্যাটাগরি লিংকিং</h4>
              <p className="text-muted-foreground">প্রোডাক্ট বর্ণনায় সংশ্লিষ্ট ক্যাটাগরি ও অন্যান্য প্রোডাক্টের লিংক যোগ করুন।</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">⚡ অ্যাঙ্কর টেক্সট</h4>
              <p className="text-muted-foreground">লিংকের অ্যাঙ্কর টেক্সটে কীওয়ার্ড ব্যবহার করুন (যেমন "ইসলামি বই কিনুন")।</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Heading Structure Analyzer ───
export const HeadingAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [headings, setHeadings] = useState<{ tag: string; text: string; level: number }[]>([]);

  const analyzeHeadings = () => {
    const content = html || '';
    const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const found: typeof headings = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      found.push({ tag: `H${match[1]}`, text: match[2].replace(/<[^>]*>/g, ''), level: parseInt(match[1]) });
    }
    setHeadings(found);
  };

  const issues = useMemo(() => {
    const msgs: { type: 'good' | 'warning' | 'error'; message: string }[] = [];
    if (headings.length === 0) return msgs;
    
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) msgs.push({ type: 'error', message: 'H1 ট্যাগ পাওয়া যায়নি — প্রতিটি পেজে একটি H1 থাকা আবশ্যক' });
    else if (h1Count === 1) msgs.push({ type: 'good', message: 'একটি H1 ট্যাগ আছে ✅' });
    else msgs.push({ type: 'warning', message: `${h1Count}টি H1 ট্যাগ পাওয়া গেছে — প্রতি পেজে মাত্র ১টি থাকা উচিত` });

    // Check hierarchy
    let prevLevel = 0;
    let hierarchyOk = true;
    headings.forEach(h => {
      if (h.level > prevLevel + 1 && prevLevel > 0) hierarchyOk = false;
      prevLevel = h.level;
    });
    if (hierarchyOk) msgs.push({ type: 'good', message: 'হেডিং হায়ারার্কি সঠিক' });
    else msgs.push({ type: 'warning', message: 'হেডিং হায়ারার্কি ভুল — লেভেল স্কিপ করা হয়েছে (যেমন H2 ছাড়া H4)' });

    return msgs;
  }, [headings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">হেডিং স্ট্রাকচার অ্যানালাইজার</CardTitle>
          <CardDescription>পেজের HTML পেস্ট করুন, হেডিং হায়ারার্কি দেখুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="পেজের HTML কন্টেন্ট এখানে পেস্ট করুন..." value={html}
            onChange={e => setHtml(e.target.value)} rows={10} />
          <Button onClick={analyzeHeadings}>বিশ্লেষণ করুন</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ফলাফল</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {issue.type === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
              {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
              {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
              <span>{issue.message}</span>
            </div>
          ))}
          {headings.length > 0 && (
            <div className="mt-4 space-y-1">
              <h4 className="text-sm font-semibold mb-2">হেডিং ট্রি:</h4>
              {headings.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${(h.level - 1) * 20}px` }}>
                  <Badge variant={h.level === 1 ? 'default' : 'secondary'} className="text-xs">{h.tag}</Badge>
                  <span className="truncate">{h.text}</span>
                </div>
              ))}
            </div>
          )}
          {headings.length === 0 && <p className="text-sm text-muted-foreground">HTML পেস্ট করে বিশ্লেষণ করুন</p>}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Duplicate Content Detector ───
export const DuplicateDetector = () => {
  const { data: products = [] } = useQuery({
    queryKey: ['seo-dup-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, slug, meta_title, meta_description').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const duplicates = useMemo(() => {
    const titleMap = new Map<string, any[]>();
    const descMap = new Map<string, any[]>();
    const slugMap = new Map<string, any[]>();

    products.forEach((p: any) => {
      const t = (p.meta_title || p.title || '').toLowerCase().trim();
      if (t) { if (!titleMap.has(t)) titleMap.set(t, []); titleMap.get(t)!.push(p); }
      const d = (p.meta_description || '').toLowerCase().trim();
      if (d) { if (!descMap.has(d)) descMap.set(d, []); descMap.get(d)!.push(p); }
      const s = (p.slug || '').toLowerCase().trim();
      if (s) { if (!slugMap.has(s)) slugMap.set(s, []); slugMap.get(s)!.push(p); }
    });

    const dupTitles = Array.from(titleMap.entries()).filter(([, items]) => items.length > 1);
    const dupDescs = Array.from(descMap.entries()).filter(([, items]) => items.length > 1);
    const dupSlugs = Array.from(slugMap.entries()).filter(([, items]) => items.length > 1);

    return { dupTitles, dupDescs, dupSlugs };
  }, [products]);

  const DupCard = ({ title, icon, items, keyField }: { title: string; icon: string; items: [string, any[]][]; keyField: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{icon} {title}</CardTitle>
        <CardDescription>{items.length > 0 ? `${items.length}টি ডুপ্লিকেট পাওয়া গেছে` : 'কোনো ডুপ্লিকেট নেই ✅'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {items.map(([value, prods], i) => (
            <div key={i} className="border rounded p-2">
              <p className="text-xs font-mono text-muted-foreground mb-1 truncate">"{value}"</p>
              <div className="space-y-1">
                {prods.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                    <span className="truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground">/{p.slug}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <DupCard title="ডুপ্লিকেট টাইটেল" icon="📝" items={duplicates.dupTitles} keyField="title" />
      <DupCard title="ডুপ্লিকেট বর্ণনা" icon="📄" items={duplicates.dupDescs} keyField="description" />
      <DupCard title="ডুপ্লিকেট স্লাগ" icon="🔗" items={duplicates.dupSlugs} keyField="slug" />
    </div>
  );
};

// ─── Schema Markup Validator ───
export const SchemaValidator = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[]; type?: string } | null>(null);

  const validate = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const data = JSON.parse(jsonInput);
      
      if (!data['@context']) errors.push('@context ফিল্ড নেই (https://schema.org হওয়া উচিত)');
      else if (data['@context'] !== 'https://schema.org') warnings.push('@context "https://schema.org" হওয়া উচিত');
      
      if (!data['@type']) errors.push('@type ফিল্ড নেই');
      
      if (data['@type'] === 'Product' || data['@type'] === 'Book') {
        if (!data.name) errors.push('Product/Book এ "name" আবশ্যক');
        if (!data.offers) warnings.push('"offers" ফিল্ড যোগ করুন দাম দেখাতে');
        if (!data.image) warnings.push('"image" ফিল্ড যোগ করুন রিচ রেজাল্টে ছবি দেখাতে');
        if (data.offers && !data.offers.priceCurrency) warnings.push('offers.priceCurrency সেট করুন (BDT)');
      }
      
      if (data['@type'] === 'Article') {
        if (!data.headline) errors.push('Article এ "headline" আবশ্যক');
        if (!data.datePublished) warnings.push('"datePublished" যোগ করুন');
        if (!data.author) warnings.push('"author" যোগ করুন');
      }

      if (data['@type'] === 'BreadcrumbList') {
        if (!data.itemListElement || !Array.isArray(data.itemListElement)) errors.push('"itemListElement" অ্যারে আবশ্যক');
      }

      setValidationResult({ valid: errors.length === 0, errors, warnings, type: data['@type'] });
    } catch {
      setValidationResult({ valid: false, errors: ['অবৈধ JSON — সঠিক JSON-LD পেস্ট করুন'], warnings: [] });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schema Markup ভ্যালিডেটর</CardTitle>
          <CardDescription>JSON-LD স্ট্রাকচার্ড ডেটা পেস্ট করুন, যাচাই করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder='{"@context": "https://schema.org", "@type": "Product", ...}' value={jsonInput}
            onChange={e => setJsonInput(e.target.value)} rows={12} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button onClick={validate}>যাচাই করুন</Button>
            <Button variant="outline" onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1" /> Google Rich Results Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ফলাফল</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {validationResult ? (
            <>
              <div className={`p-3 rounded-lg ${validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <div className="flex items-center gap-2">
                  {validationResult.valid ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                  <span className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.valid ? 'Schema বৈধ!' : 'সমস্যা পাওয়া গেছে'}
                  </span>
                  {validationResult.type && <Badge variant="outline">{validationResult.type}</Badge>}
                </div>
              </div>
              {validationResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-red-600">ত্রুটি:</h4>
                  {validationResult.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm"><XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><span>{e}</span></div>
                  ))}
                </div>
              )}
              {validationResult.warnings.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-yellow-600">সতর্কতা:</h4>
                  {validationResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" /><span>{w}</span></div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">JSON-LD পেস্ট করে যাচাই করুন</p>
          )}

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-semibold mb-2">📋 সাপোর্টেড Schema টাইপ</h4>
            <div className="flex flex-wrap gap-1.5">
              {['Product', 'Book', 'Article', 'BreadcrumbList', 'Organization', 'WebSite', 'Store', 'FAQPage', 'HowTo', 'Review'].map(t => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Image SEO Checker ───
export const ImageSEOChecker = () => {
  const { data: products = [] } = useQuery({
    queryKey: ['seo-image-check'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, slug, image_url, additional_images').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const analysis = useMemo(() => {
    const noImage = products.filter((p: any) => !p.image_url);
    const hasImage = products.filter((p: any) => p.image_url);
    const noAdditional = products.filter((p: any) => !p.additional_images || (Array.isArray(p.additional_images) && p.additional_images.length === 0));
    
    return { total: products.length, noImage, hasImage, noAdditional };
  }, [products]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-600">❌ ইমেজ নেই ({analysis.noImage.length})</CardTitle>
          <CardDescription>এই প্রোডাক্টগুলোতে কোনো ইমেজ নেই</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {analysis.noImage.map((p: any) => (
              <div key={p.id} className="text-sm flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="truncate">{p.title}</span>
              </div>
            ))}
            {analysis.noImage.length === 0 && <p className="text-sm text-green-600">সব প্রোডাক্টে ইমেজ আছে ✅</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-yellow-600">⚠️ অতিরিক্ত ইমেজ নেই ({analysis.noAdditional.length})</CardTitle>
          <CardDescription>শুধু একটি ইমেজ আছে, আরও ইমেজ দরকার</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {analysis.noAdditional.slice(0, 30).map((p: any) => (
              <div key={p.id} className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <span className="truncate">{p.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🖼️ ইমেজ SEO টিপস</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-2 bg-muted rounded"><strong>Alt Text:</strong> প্রতিটি ইমেজে বর্ণনামূলক Alt Text দিন</div>
          <div className="p-2 bg-muted rounded"><strong>ফাইল নাম:</strong> ইমেজ নামে কীওয়ার্ড ব্যবহার করুন (book-name.jpg)</div>
          <div className="p-2 bg-muted rounded"><strong>সাইজ:</strong> ইমেজ 100KB-200KB রাখুন, WebP ফরম্যাট ব্যবহার করুন</div>
          <div className="p-2 bg-muted rounded"><strong>একাধিক ইমেজ:</strong> প্রোডাক্টে ৩-৫টি ইমেজ দিলে কনভার্শন বাড়ে</div>
          <div className="p-2 bg-muted rounded"><strong>OG Image:</strong> ১২০০×৬৩০ সাইজে OG ইমেজ রাখুন সোশ্যাল শেয়ারের জন্য</div>
        </CardContent>
      </Card>
    </div>
  );
};
