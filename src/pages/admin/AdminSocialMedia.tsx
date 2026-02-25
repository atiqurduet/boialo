import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send, Plus, Calendar, Clock, Hash, Trash2, Edit, Eye, RefreshCw,
  Facebook, Instagram, Twitter, MessageCircle, Linkedin, Youtube, Globe, Printer,
  TrendingUp, Heart, MessageSquare, Share2, BarChart3, Settings, Smartphone,
  Search, Copy, Link2, Package, X, Check, AlertCircle, RotateCcw, Filter
} from "lucide-react";

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: '#1DA1F2' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088cc' },
  { id: 'tiktok', name: 'TikTok', icon: Smartphone, color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'pinterest', name: 'Pinterest', icon: Globe, color: '#E60023' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  publishing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<string, string> = {
  draft: 'ড্রাফট', scheduled: 'শিডিউল', publishing: 'পোস্ট হচ্ছে',
  published: 'পাবলিশড', failed: 'ব্যর্থ', pending: 'পেন্ডিং', success: 'সফল',
};

const AdminSocialMedia = () => {
  const queryClient = useQueryClient();
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postContentBn, setPostContentBn] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postHashtags, setPostHashtags] = useState('');
  const [postLink, setPostLink] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Product selector
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState('all');

  // Post detail dialog
  const [viewingPost, setViewingPost] = useState<any>(null);

  // Account form
  const [accPlatform, setAccPlatform] = useState('');
  const [accName, setAccName] = useState('');
  const [accToken, setAccToken] = useState('');
  const [accPageId, setAccPageId] = useState('');
  const [accChannelId, setAccChannelId] = useState('');

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_accounts').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_posts').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    }
  });

  const { data: postResults = [] } = useQuery({
    queryKey: ['social-post-results'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_post_results').select('*').order('created_at', { ascending: false }).limit(500);
      return data || [];
    }
  });

  // Products query for selector
  const { data: products = [] } = useQuery({
    queryKey: ['social-products', productSearch],
    queryFn: async () => {
      // @ts-ignore - deep chain type
      const base = supabase.from('products').select('id, title_bn, title_en, slug, images, price, discount_price').eq('status', 'published').order('created_at', { ascending: false }).limit(20);
      const final = productSearch ? base.or(`title_bn.ilike.%${productSearch}%,title_en.ilike.%${productSearch}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  const { data: universalProducts = [] } = useQuery({
    queryKey: ['social-universal-products', productSearch],
    queryFn: async () => {
      // @ts-ignore - deep chain type
      const base = supabase.from('universal_products').select('id, name_bn, name_en, slug, images, price, discount_price').eq('status', 'published').order('created_at', { ascending: false }).limit(20);
      const final = productSearch ? base.or(`name_bn.ilike.%${productSearch}%,name_en.ilike.%${productSearch}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  // Filtered history
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (historyStatusFilter !== 'all' && p.status !== historyStatusFilter) return false;
      if (historyPlatformFilter !== 'all' && !(p.platforms || []).includes(historyPlatformFilter)) return false;
      if (historySearch) {
        const s = historySearch.toLowerCase();
        if (!(p.content || '').toLowerCase().includes(s) && !(p.content_bn || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [posts, historyStatusFilter, historyPlatformFilter, historySearch]);

  // Mutations
  const saveAccount = useMutation({
    mutationFn: async () => {
      if (editingAccount) {
        const updateData: any = { platform: accPlatform, account_name: accName, page_id: accPageId || null, channel_id: accChannelId || null };
        if (accToken) updateData.access_token = accToken;
        const { error } = await supabase.from('social_media_accounts').update(updateData).eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('social_media_accounts').insert({ platform: accPlatform, account_name: accName, access_token: accToken || null, page_id: accPageId || null, channel_id: accChannelId || null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editingAccount ? 'অ্যাকাউন্ট আপডেট হয়েছে' : 'অ্যাকাউন্ট যোগ হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); setShowAccountDialog(false); resetAccountForm(); },
    onError: () => toast.error('অ্যাকাউন্ট সেভ করতে ব্যর্থ'),
  });

  const toggleAccount = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('social_media_accounts').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('social_media_accounts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('অ্যাকাউন্ট মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); },
  });

  const savePost = useMutation({
    mutationFn: async (status: string) => {
      const postData: any = {
        content: postContent,
        content_bn: postContentBn || null,
        platforms: selectedPlatforms,
        hashtags: postHashtags ? postHashtags.split(',').map(h => h.trim()) : [],
        link_url: postLink || null,
        status,
        scheduled_at: status === 'scheduled' && scheduleDate ? new Date(scheduleDate).toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase.from('social_media_posts').update(postData).eq('id', editingPost.id);
        if (error) throw error;

        // If re-publishing an edited post
        if (status === 'published') {
          // Delete old results and create new ones
          await supabase.from('social_media_post_results').delete().eq('post_id', editingPost.id);
          const results = selectedPlatforms.map(platform => ({
            post_id: editingPost.id,
            platform,
            status: 'pending',
            account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null,
          }));
          await supabase.from('social_media_post_results').insert(results);
          try { await supabase.functions.invoke('social-media-post', { body: { post_id: editingPost.id } }); } catch (e) { console.error(e); }
        }
      } else {
        const { data, error } = await supabase.from('social_media_posts').insert(postData).select().single();
        if (error) throw error;
        if (data && (status === 'published' || status === 'scheduled')) {
          const results = selectedPlatforms.map(platform => ({
            post_id: data.id, platform, status: 'pending',
            account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null,
          }));
          await supabase.from('social_media_post_results').insert(results);
        }
        if (status === 'published' && data) {
          try { await supabase.functions.invoke('social-media-post', { body: { post_id: data.id } }); } catch (e) { console.error(e); }
        }
      }
    },
    onSuccess: (_, status) => {
      toast.success(status === 'draft' ? 'ড্রাফট সেভ হয়েছে' : status === 'scheduled' ? 'শিডিউল সেট হয়েছে' : 'পোস্ট পাবলিশ হচ্ছে');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post-results'] });
      resetComposer();
    },
    onError: () => toast.error('পোস্ট সেভ করতে ব্যর্থ'),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('social_media_post_results').delete().eq('post_id', id);
      const { error } = await supabase.from('social_media_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('পোস্ট মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-posts'] }); queryClient.invalidateQueries({ queryKey: ['social-post-results'] }); },
  });

  const retryPost = useMutation({
    mutationFn: async (postId: string) => {
      // Reset failed results to pending
      await supabase.from('social_media_post_results').update({ status: 'pending', error_message: null }).eq('post_id', postId).eq('status', 'failed');
      await supabase.from('social_media_posts').update({ status: 'published' }).eq('id', postId);
      await supabase.functions.invoke('social-media-post', { body: { post_id: postId } });
    },
    onSuccess: () => {
      toast.success('পুনরায় পোস্ট হচ্ছে');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post-results'] });
    },
    onError: () => toast.error('রিট্রাই করতে ব্যর্থ'),
  });

  const resetComposer = () => {
    setPostContent(''); setPostContentBn(''); setSelectedPlatforms([]);
    setPostHashtags(''); setPostLink(''); setScheduleDate(''); setEditingPost(null);
    setSelectedProduct(null);
  };

  const resetAccountForm = () => {
    setAccPlatform(''); setAccName(''); setAccToken(''); setAccPageId(''); setAccChannelId('');
    setEditingAccount(null);
  };

  const editAccount = (acc: any) => {
    setEditingAccount(acc);
    setAccPlatform(acc.platform); setAccName(acc.account_name || '');
    setAccToken(''); setAccPageId(acc.page_id || ''); setAccChannelId(acc.channel_id || '');
    setShowAccountDialog(true);
  };

  const editPost = (post: any) => {
    setEditingPost(post);
    setPostContent(post.content || '');
    setPostContentBn(post.content_bn || '');
    setSelectedPlatforms(post.platforms || []);
    setPostHashtags((post.hashtags || []).join(', '));
    setPostLink(post.link_url || '');
    setScheduleDate(post.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '');
    setSelectedProduct(null);
  };

  const duplicatePost = (post: any) => {
    setEditingPost(null);
    setPostContent(post.content || '');
    setPostContentBn(post.content_bn || '');
    setSelectedPlatforms(post.platforms || []);
    setPostHashtags((post.hashtags || []).join(', '));
    setPostLink(post.link_url || '');
    setScheduleDate('');
    setSelectedProduct(null);
    toast.info('পোস্ট কপি করা হয়েছে - এডিট করে পোস্ট করুন');
  };

  const selectProduct = (product: any, type: 'book' | 'universal') => {
    const imgUrl = product.images?.[0] || null;
    setSelectedProduct({ ...product, type, image_url: imgUrl });
    const baseUrl = 'https://boialo.lovable.app';
    const url = type === 'book' ? `${baseUrl}/product/${product.slug}` : `${baseUrl}/universal-product/${product.slug}`;
    setPostLink(url);
    const name = type === 'book' ? (product.title_bn || product.title_en) : (product.name_bn || product.name_en);
    if (!postContent && !postContentBn) {
      const price = product.discount_price || product.price;
      setPostContentBn(`📚 ${name}\n💰 মূল্য: ৳${price}\n\n🛒 এখনই অর্ডার করুন!`);
      setPostContent(`📚 ${name}\n💰 Price: ৳${price}\n\n🛒 Order now!`);
    }
    setShowProductSelector(false);
  };

  // Analytics
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const scheduledPosts = posts.filter(p => p.status === 'scheduled').length;
  const totalLikes = postResults.reduce((s, r) => s + (r.likes_count || 0), 0);
  const totalComments = postResults.reduce((s, r) => s + (r.comments_count || 0), 0);
  const totalShares = postResults.reduce((s, r) => s + (r.shares_count || 0), 0);
  const totalViews = postResults.reduce((s, r) => s + (r.views_count || 0), 0);

  const platformPostCount = PLATFORMS.map(p => ({
    name: p.name, count: postResults.filter(r => r.platform === p.id).length, color: p.color,
  })).filter(p => p.count > 0);

  const getResultsForPost = (postId: string) => postResults.filter(r => r.post_id === postId);

  const printReport = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<html><head><title>Social Media Report</title>
      <style>body{font-family:'Hind Siliguri',sans-serif;padding:30px}h1{text-align:center}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
      .stat{background:#f5f5f5;padding:14px;border-radius:8px;text-align:center}
      .stat .v{font-size:24px;font-weight:700;color:#e53e3e}.stat .l{font-size:11px;color:#666}
      table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f5f5f5}
      @media print{body{padding:10px}}</style></head><body>
      <h1>📱 সোশ্যাল মিডিয়া রিপোর্ট</h1>
      <p style="text-align:center;color:#666">${format(new Date(), 'dd/MM/yyyy')}</p>
      <div class="grid">
        <div class="stat"><div class="v">${totalPosts}</div><div class="l">মোট পোস্ট</div></div>
        <div class="stat"><div class="v">${publishedPosts}</div><div class="l">পাবলিশড</div></div>
        <div class="stat"><div class="v">${totalViews}</div><div class="l">মোট ভিউ</div></div>
        <div class="stat"><div class="v">${totalLikes}</div><div class="l">মোট লাইক</div></div>
      </div>
      <h3>সাম্প্রতিক পোস্ট</h3>
      <table><tr><th>তারিখ</th><th>কন্টেন্ট</th><th>প্ল্যাটফর্ম</th><th>স্ট্যাটাস</th></tr>
      ${posts.slice(0, 30).map(p => `<tr><td>${format(new Date(p.created_at), 'dd/MM/yy')}</td><td>${(p.content || '').substring(0, 80)}...</td><td>${(p.platforms || []).join(', ')}</td><td>${statusLabels[p.status] || p.status}</td></tr>`).join('')}
      </table></body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">সোশ্যাল মিডিয়া ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground text-sm">এক জায়গা থেকে সব সোশ্যাল মিডিয়া কন্ট্রোল করুন</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printReport}><Printer className="w-4 h-4 mr-2" /> রিপোর্ট</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: Send, label: 'মোট পোস্ট', value: totalPosts },
            { icon: Eye, label: 'পাবলিশড', value: publishedPosts },
            { icon: Calendar, label: 'শিডিউল', value: scheduledPosts },
            { icon: Eye, label: 'মোট ভিউ', value: totalViews },
            { icon: Heart, label: 'লাইক', value: totalLikes },
            { icon: MessageSquare, label: 'কমেন্ট', value: totalComments },
            { icon: Share2, label: 'শেয়ার', value: totalShares },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <kpi.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="compose"><Send className="w-4 h-4 mr-1" /> পোস্ট</TabsTrigger>
            <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" /> হিস্ট্রি</TabsTrigger>
            <TabsTrigger value="accounts"><Settings className="w-4 h-4 mr-1" /> অ্যাকাউন্ট</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
          </TabsList>

          {/* COMPOSE TAB */}
          <TabsContent value="compose">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Composer */}
              <div className="md:col-span-2 space-y-4">
                {editingPost && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Edit className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">পোস্ট এডিট মোড</span>
                    <Badge variant="outline" className="ml-auto">{statusLabels[editingPost.status] || editingPost.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={resetComposer}><X className="w-4 h-4" /></Button>
                  </div>
                )}

                <Card>
                  <CardHeader><CardTitle className="text-base">✍️ পোস্ট কম্পোজার</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {/* Product Selector */}
                    <div>
                      <Label className="flex items-center gap-1 mb-2"><Package className="w-3 h-3" /> প্রোডাক্ট সিলেক্ট করুন (ঐচ্ছিক)</Label>
                      {selectedProduct ? (
                        <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30">
                          {selectedProduct.image_url && (
                            <img src={selectedProduct.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {selectedProduct.type === 'book' ? (selectedProduct.title_bn || selectedProduct.title_en) : (selectedProduct.name_bn || selectedProduct.name_en)}
                            </p>
                            <p className="text-xs text-muted-foreground">৳{selectedProduct.discount_price || selectedProduct.price}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(null); setPostLink(''); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => { setShowProductSelector(true); setProductSearch(''); }}>
                          <Search className="w-4 h-4 mr-2" /> প্রোডাক্ট খুঁজুন ও সিলেক্ট করুন
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>পোস্ট কন্টেন্ট (English)</Label>
                      <Textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Write your post content..." rows={4} />
                      <p className="text-xs text-muted-foreground mt-1">{postContent.length}/2200 characters</p>
                    </div>
                    <div>
                      <Label>পোস্ট কন্টেন্ট (বাংলা) - ঐচ্ছিক</Label>
                      <Textarea value={postContentBn} onChange={e => setPostContentBn(e.target.value)} placeholder="বাংলায় পোস্ট লিখুন..." rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1"><Hash className="w-3 h-3" /> হ্যাশট্যাগ</Label>
                        <Input value={postHashtags} onChange={e => setPostHashtags(e.target.value)} placeholder="#books, #reading, #বই" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Link2 className="w-3 h-3" /> লিংক</Label>
                        <Input value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="https://boialo.lovable.app/product/..." />
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> শিডিউল (ঐচ্ছিক)</Label>
                      <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform selector + Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">📱 চ্যানেল নির্বাচন</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PLATFORMS.map(p => {
                      const activeAccounts = accounts.filter(a => a.platform === p.id && a.is_active);
                      const hasAccount = activeAccounts.length > 0;
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'} ${!hasAccount ? 'opacity-50' : ''}`}>
                          <Checkbox
                            checked={isSelected}
                            disabled={!hasAccount}
                            onCheckedChange={checked => {
                              setSelectedPlatforms(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                            }}
                          />
                          <p.icon className="w-5 h-5" style={{ color: p.color }} />
                          <span className="text-sm font-medium flex-1">{p.name}</span>
                          {hasAccount ? (
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              <Check className="w-3 h-3 mr-0.5" />{activeAccounts.length}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">সেটআপ</Badge>
                          )}
                        </label>
                      );
                    })}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedPlatforms(accounts.filter(a => a.is_active).map(a => a.platform).filter((v, i, arr) => arr.indexOf(v) === i))}>
                        সব সিলেক্ট
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedPlatforms([])}>
                        সব বাদ
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Button className="w-full" disabled={!postContent || selectedPlatforms.length === 0 || savePost.isPending} onClick={() => savePost.mutate('published')}>
                      <Send className="w-4 h-4 mr-2" /> {editingPost ? 'আপডেট ও পোস্ট করুন' : 'এখনই পোস্ট করুন'}
                    </Button>
                    {scheduleDate && (
                      <Button variant="outline" className="w-full" disabled={!postContent || selectedPlatforms.length === 0} onClick={() => savePost.mutate('scheduled')}>
                        <Calendar className="w-4 h-4 mr-2" /> শিডিউল করুন
                      </Button>
                    )}
                    <Button variant="secondary" className="w-full" disabled={!postContent} onClick={() => savePost.mutate('draft')}>
                      {editingPost ? 'ড্রাফট হিসেবে আপডেট' : 'ড্রাফট সেভ করুন'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview */}
                {postContent && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">👁️ প্রিভিউ</CardTitle></CardHeader>
                    <CardContent>
                      <div className="bg-muted rounded-lg p-3 text-sm space-y-2">
                        <p className="whitespace-pre-line">{postContentBn || postContent}</p>
                        {postHashtags && <p className="text-primary text-xs">{postHashtags.split(',').map(h => h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`).join(' ')}</p>}
                        {postLink && <p className="text-xs text-blue-600 truncate">{postLink}</p>}
                        {selectedProduct?.image_url && <img src={selectedProduct.image_url} alt="" className="w-full h-32 object-cover rounded mt-2" />}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle className="text-base">📋 পোস্ট হিস্ট্রি ({filteredPosts.length})</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="খুঁজুন..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-8 w-40" />
                    </div>
                    <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                        <SelectItem value="draft">ড্রাফট</SelectItem>
                        <SelectItem value="scheduled">শিডিউল</SelectItem>
                        <SelectItem value="published">পাবলিশড</SelectItem>
                        <SelectItem value="failed">ব্যর্থ</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={historyPlatformFilter} onValueChange={setHistoryPlatformFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব প্ল্যাটফর্ম</SelectItem>
                        {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>কন্টেন্ট</TableHead>
                      <TableHead>চ্যানেল</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>রেজাল্ট</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.map(post => {
                      const results = getResultsForPost(post.id);
                      const hasFailed = results.some(r => r.status === 'failed');
                      return (
                        <TableRow key={post.id} className="group">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(post.created_at), 'dd/MM/yy HH:mm')}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate text-sm">{post.content_bn || post.content}</p>
                            {post.link_url && <p className="text-[10px] text-blue-500 truncate">{post.link_url}</p>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(post.platforms || []).map((p: string) => {
                                const plat = PLATFORMS.find(x => x.id === p);
                                const result = results.find(r => r.platform === p);
                                return plat ? (
                                  <div key={p} className="relative" title={`${plat.name}: ${result ? statusLabels[result.status] || result.status : 'N/A'}`}>
                                    <plat.icon className="w-4 h-4" style={{ color: plat.color }} />
                                    {result?.status === 'success' && <Check className="w-2.5 h-2.5 text-green-600 absolute -bottom-1 -right-1" />}
                                    {result?.status === 'failed' && <X className="w-2.5 h-2.5 text-red-600 absolute -bottom-1 -right-1" />}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[post.status] || ''} variant="outline">
                              {statusLabels[post.status] || post.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 text-xs">
                              {results.length > 0 && (
                                <>
                                  <span className="text-green-600">{results.filter(r => r.status === 'success').length} ✓</span>
                                  {results.some(r => r.status === 'failed') && (
                                    <span className="text-red-600">{results.filter(r => r.status === 'failed').length} ✗</span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button variant="ghost" size="icon" title="বিস্তারিত দেখুন" onClick={() => setViewingPost(post)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="এডিট করুন" onClick={() => editPost(post)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="ডুপ্লিকেট" onClick={() => duplicatePost(post)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                              {hasFailed && (
                                <Button variant="ghost" size="icon" title="পুনরায় চেষ্টা" onClick={() => retryPost.mutate(post.id)}>
                                  <RotateCcw className="w-4 h-4 text-orange-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="মুছে ফেলুন" onClick={() => { if (confirm('পোস্টটি মুছে ফেলতে চান?')) deletePost.mutate(post.id); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPosts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো পোস্ট নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCOUNTS TAB */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">🔗 কানেক্টেড অ্যাকাউন্ট</CardTitle>
                <Dialog open={showAccountDialog} onOpenChange={(open) => { setShowAccountDialog(open); if (!open) resetAccountForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => resetAccountForm()}><Plus className="w-4 h-4 mr-1" /> অ্যাকাউন্ট যোগ</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingAccount ? 'অ্যাকাউন্ট আপডেট করুন' : 'নতুন সোশ্যাল মিডিয়া অ্যাকাউন্ট'}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>প্ল্যাটফর্ম</Label>
                        <Select value={accPlatform} onValueChange={setAccPlatform}>
                          <SelectTrigger><SelectValue placeholder="প্ল্যাটফর্ম নির্বাচন করুন" /></SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="flex items-center gap-2"><p.icon className="w-4 h-4" style={{ color: p.color }} /> {p.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>অ্যাকাউন্টের নাম</Label>
                        <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="যেমন: Boialo Official" />
                      </div>
                      <div>
                        <Label>API Token / Access Token</Label>
                        <Input type="password" value={accToken} onChange={e => setAccToken(e.target.value)} placeholder={editingAccount ? "নতুন টোকেন দিন (খালি রাখলে আগেরটা থাকবে)" : "API টোকেন দিন"} />
                      </div>
                      {(accPlatform === 'facebook' || accPlatform === 'instagram') && (
                        <div>
                          <Label>Page ID</Label>
                          <Input value={accPageId} onChange={e => setAccPageId(e.target.value)} placeholder="Facebook/Instagram Page ID" />
                        </div>
                      )}
                      {(accPlatform === 'telegram' || accPlatform === 'whatsapp' || accPlatform === 'youtube') && (
                        <div>
                          <Label>Channel/Chat ID</Label>
                          <Input value={accChannelId} onChange={e => setAccChannelId(e.target.value)} placeholder="Channel বা Chat ID" />
                          {accPlatform === 'telegram' && <p className="text-xs text-muted-foreground mt-1">@channel_username অথবা -100xxxxxxx ফরম্যাটে দিন</p>}
                        </div>
                      )}
                      <Button className="w-full" disabled={!accPlatform || !accName} onClick={() => saveAccount.mutate()}>
                        {editingAccount ? 'আপডেট করুন' : 'সেভ করুন'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্ল্যাটফর্ম</TableHead>
                      <TableHead>অ্যাকাউন্ট</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>যোগ করা হয়েছে</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(acc => {
                      const plat = PLATFORMS.find(p => p.id === acc.platform);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {plat && <plat.icon className="w-5 h-5" style={{ color: plat.color }} />}
                              <span className="font-medium">{plat?.name || acc.platform}</span>
                            </div>
                          </TableCell>
                          <TableCell>{acc.account_name}</TableCell>
                          <TableCell><Switch checked={acc.is_active} onCheckedChange={checked => toggleAccount.mutate({ id: acc.id, active: checked })} /></TableCell>
                          <TableCell className="text-xs">{format(new Date(acc.created_at), 'dd/MM/yy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => editAccount(acc)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deleteAccount.mutate(acc.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {accounts.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো অ্যাকাউন্ট কানেক্ট করা নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm">📖 সেটআপ গাইড</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Facebook/Instagram:</p>
                      <p>→ Meta Developer Portal থেকে Page Access Token নিন</p>
                      <p>→ Page ID: পেজের About সেকশন থেকে পাবেন</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Telegram:</p>
                      <p>→ @BotFather থেকে Bot Token নিন</p>
                      <p>→ Channel ID: @channel_username বা -100xxxxxxx</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Twitter/X:</p>
                      <p>→ Twitter Developer Portal থেকে Bearer Token নিন</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">LinkedIn:</p>
                      <p>→ LinkedIn Developer Portal থেকে Access Token নিন</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">📊 প্ল্যাটফর্ম অনুযায়ী পোস্ট</CardTitle></CardHeader>
                <CardContent>
                  {platformPostCount.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={platformPostCount} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {platformPostCount.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">ডেটা নেই</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">📈 এনগেজমেন্ট সামারি</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'মোট ভিউ', value: totalViews, icon: Eye, color: 'text-blue-500' },
                      { label: 'মোট লাইক', value: totalLikes, icon: Heart, color: 'text-red-500' },
                      { label: 'মোট কমেন্ট', value: totalComments, icon: MessageSquare, color: 'text-green-500' },
                      { label: 'মোট শেয়ার', value: totalShares, icon: Share2, color: 'text-purple-500' },
                      { label: 'মোট রিচ', value: postResults.reduce((s, r) => s + (r.reach_count || 0), 0), icon: TrendingUp, color: 'text-orange-500' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          <span className="text-sm">{stat.label}</span>
                        </div>
                        <span className="text-lg font-bold">{stat.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">📋 প্ল্যাটফর্ম বিস্তারিত</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>প্ল্যাটফর্ম</TableHead>
                        <TableHead className="text-right">পোস্ট</TableHead>
                        <TableHead className="text-right">সফল</TableHead>
                        <TableHead className="text-right">ব্যর্থ</TableHead>
                        <TableHead className="text-right">ভিউ</TableHead>
                        <TableHead className="text-right">লাইক</TableHead>
                        <TableHead className="text-right">কমেন্ট</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PLATFORMS.map(p => {
                        const pResults = postResults.filter(r => r.platform === p.id);
                        if (pResults.length === 0) return null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="flex items-center gap-2"><p.icon className="w-4 h-4" style={{ color: p.color }} />{p.name}</TableCell>
                            <TableCell className="text-right">{pResults.length}</TableCell>
                            <TableCell className="text-right text-green-600">{pResults.filter(r => r.status === 'success').length}</TableCell>
                            <TableCell className="text-right text-red-600">{pResults.filter(r => r.status === 'failed').length}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.views_count || 0), 0)}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.likes_count || 0), 0)}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.comments_count || 0), 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Selector Dialog */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>📦 প্রোডাক্ট সিলেক্ট করুন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="প্রোডাক্ট খুঁজুন..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-8" />
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-1">
                {products.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">📚 বই</p>
                    {products.map(p => (
                      <button key={p.id} className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-muted/50 transition-colors" onClick={() => selectProduct(p, 'book')}>
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title_bn || p.title_en}</p>
                          <p className="text-xs text-muted-foreground">৳{p.discount_price || p.price}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {universalProducts.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground px-2 pt-3">🛍️ ইউনিভার্সাল প্রোডাক্ট</p>
                    {universalProducts.map(p => (
                      <button key={p.id} className="flex items-center gap-3 p-2 w-full text-left rounded-lg hover:bg-muted/50 transition-colors" onClick={() => selectProduct(p, 'universal')}>
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 bg-muted rounded flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name_bn || p.name_en}</p>
                          <p className="text-xs text-muted-foreground">৳{p.discount_price || p.price}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {products.length === 0 && universalProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-6 text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <Dialog open={!!viewingPost} onOpenChange={open => { if (!open) setViewingPost(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>📝 পোস্ট বিস্তারিত</DialogTitle></DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[viewingPost.status] || ''} variant="outline">{statusLabels[viewingPost.status] || viewingPost.status}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(viewingPost.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>

              {viewingPost.content && (
                <div>
                  <Label className="text-xs">English</Label>
                  <p className="text-sm bg-muted p-2 rounded whitespace-pre-line">{viewingPost.content}</p>
                </div>
              )}
              {viewingPost.content_bn && (
                <div>
                  <Label className="text-xs">বাংলা</Label>
                  <p className="text-sm bg-muted p-2 rounded whitespace-pre-line">{viewingPost.content_bn}</p>
                </div>
              )}
              {viewingPost.hashtags?.length > 0 && <p className="text-xs text-primary">{viewingPost.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>}
              {viewingPost.link_url && <p className="text-xs text-blue-600 truncate">{viewingPost.link_url}</p>}

              <div>
                <Label className="text-xs mb-2 block">চ্যানেল রেজাল্ট</Label>
                <div className="space-y-2">
                  {getResultsForPost(viewingPost.id).map((r, i) => {
                    const plat = PLATFORMS.find(p => p.id === r.platform);
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
                        {plat && <plat.icon className="w-4 h-4" style={{ color: plat.color }} />}
                        <span className="flex-1">{plat?.name || r.platform}</span>
                        <Badge className={statusColors[r.status] || ''} variant="outline">{statusLabels[r.status] || r.status}</Badge>
                        {r.error_message && <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={r.error_message}>{r.error_message}</span>}
                      </div>
                    );
                  })}
                  {getResultsForPost(viewingPost.id).length === 0 && <p className="text-xs text-muted-foreground">রেজাল্ট নেই</p>}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { editPost(viewingPost); setViewingPost(null); }}>
                  <Edit className="w-4 h-4 mr-1" /> এডিট করুন
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { duplicatePost(viewingPost); setViewingPost(null); }}>
                  <Copy className="w-4 h-4 mr-1" /> ডুপ্লিকেট
                </Button>
                {getResultsForPost(viewingPost.id).some(r => r.status === 'failed') && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { retryPost.mutate(viewingPost.id); setViewingPost(null); }}>
                    <RotateCcw className="w-4 h-4 mr-1" /> রিট্রাই
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSocialMedia;
