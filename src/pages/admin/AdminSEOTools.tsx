import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search, AlertTriangle, CheckCircle2,
  XCircle, TrendingUp, Target,
  Zap, Hash, Loader2, Image as ImageIcon,
  AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { RedirectManager, BulkMetaEditor, InternalLinkAnalyzer, HeadingAnalyzer, DuplicateDetector, SchemaValidator, ImageSEOChecker } from '@/components/admin/seo/SEOAdvancedTools';

// ─── SEO Score Calculator ───
const calculateSEOScore = (data: {
  title?: string; description?: string; slug?: string;
  content?: string; image?: string; keywords?: string;
}) => {
  let score = 0;
  const issues: { type: 'good' | 'warning' | 'error'; message: string }[] = [];

  // Title
  if (data.title) {
    if (data.title.length >= 30 && data.title.length <= 60) {
      score += 15; issues.push({ type: 'good', message: `টাইটেল দৈর্ঘ্য ভালো (${data.title.length} অক্ষর)` });
    } else if (data.title.length > 0 && data.title.length < 30) {
      score += 5; issues.push({ type: 'warning', message: `টাইটেল খুব ছোট (${data.title.length}/৩০-৬০ অক্ষর)` });
    } else if (data.title.length > 60) {
      score += 8; issues.push({ type: 'warning', message: `টাইটেল খুব বড় (${data.title.length}/৬০ অক্ষর সীমা)` });
    }
  } else {
    issues.push({ type: 'error', message: 'টাইটেল নেই' });
  }

  // Description
  if (data.description) {
    if (data.description.length >= 120 && data.description.length <= 160) {
      score += 15; issues.push({ type: 'good', message: `মেটা বর্ণনা দৈর্ঘ্য আদর্শ (${data.description.length} অক্ষর)` });
    } else if (data.description.length > 0 && data.description.length < 120) {
      score += 5; issues.push({ type: 'warning', message: `মেটা বর্ণনা ছোট (${data.description.length}/১২০-১৬০ অক্ষর)` });
    } else if (data.description.length > 160) {
      score += 8; issues.push({ type: 'warning', message: `মেটা বর্ণনা বড় (${data.description.length}/১৬০ অক্ষর সীমা)` });
    }
  } else {
    issues.push({ type: 'error', message: 'মেটা বর্ণনা নেই' });
  }

  // Slug
  if (data.slug) {
    if (/^[a-z0-9-]+$/.test(data.slug)) {
      score += 10; issues.push({ type: 'good', message: 'URL স্লাগ SEO-ফ্রেন্ডলি' });
    } else {
      score += 3; issues.push({ type: 'warning', message: 'URL স্লাগে অবৈধ অক্ষর আছে' });
    }
    if (data.slug.length <= 75) {
      score += 5;
    } else {
      issues.push({ type: 'warning', message: 'URL স্লাগ খুব লম্বা' });
    }
  } else {
    issues.push({ type: 'error', message: 'URL স্লাগ নেই' });
  }

  // Image
  if (data.image) {
    score += 15; issues.push({ type: 'good', message: 'ফিচার্ড ইমেজ আছে' });
  } else {
    issues.push({ type: 'warning', message: 'ফিচার্ড ইমেজ নেই — সোশ্যাল শেয়ারিংয়ে সমস্যা হবে' });
  }

  // Content length
  if (data.content) {
    const wordCount = data.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) {
      score += 15; issues.push({ type: 'good', message: `কন্টেন্ট দৈর্ঘ্য ভালো (${wordCount} শব্দ)` });
    } else if (wordCount >= 100) {
      score += 8; issues.push({ type: 'warning', message: `কন্টেন্ট আরও বড় হলে ভালো (${wordCount}/৩০০+ শব্দ)` });
    } else {
      score += 3; issues.push({ type: 'warning', message: `কন্টেন্ট খুব ছোট (${wordCount} শব্দ)` });
    }

    // Keyword in content
    if (data.keywords) {
      const kws = data.keywords.split(',').map(k => k.trim().toLowerCase());
      const contentLower = data.content.toLowerCase();
      const found = kws.filter(k => contentLower.includes(k));
      if (found.length > 0) {
        score += 10; issues.push({ type: 'good', message: `কন্টেন্টে ${found.length}টি কীওয়ার্ড পাওয়া গেছে` });
      } else {
        issues.push({ type: 'warning', message: 'কন্টেন্টে কোনো ফোকাস কীওয়ার্ড পাওয়া যায়নি' });
      }

      // Keyword in title
      const titleLower = (data.title || '').toLowerCase();
      const kwInTitle = kws.some(k => titleLower.includes(k));
      if (kwInTitle) {
        score += 10; issues.push({ type: 'good', message: 'টাইটেলে ফোকাস কীওয়ার্ড আছে' });
      } else {
        issues.push({ type: 'warning', message: 'টাইটেলে ফোকাস কীওয়ার্ড নেই' });
      }

      // Keyword in description
      const descLower = (data.description || '').toLowerCase();
      const kwInDesc = kws.some(k => descLower.includes(k));
      if (kwInDesc) {
        score += 5; issues.push({ type: 'good', message: 'মেটা বর্ণনায় ফোকাস কীওয়ার্ড আছে' });
      } else {
        issues.push({ type: 'warning', message: 'মেটা বর্ণনায় ফোকাস কীওয়ার্ড নেই' });
      }
    } else {
      issues.push({ type: 'warning', message: 'কোনো ফোকাস কীওয়ার্ড সেট করা হয়নি' });
    }
  }

  return { score: Math.min(score, 100), issues };
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'ভালো';
  if (score >= 50) return 'মাঝামাঝি';
  return 'দুর্বল';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

// ─── Readability Calculator ───
const calculateReadability = (text: string) => {
  if (!text) return { score: 0, issues: [] as { type: 'good' | 'warning' | 'error'; message: string }[] };
  const clean = text.replace(/<[^>]*>/g, '');
  const sentences = clean.split(/[।.!?]+/).filter(s => s.trim().length > 0);
  const words = clean.split(/\s+/).filter(Boolean);
  const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 0);

  let score = 0;
  const issues: { type: 'good' | 'warning' | 'error'; message: string }[] = [];

  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  if (avgWordsPerSentence <= 20 && avgWordsPerSentence > 0) {
    score += 30; issues.push({ type: 'good', message: `বাক্যের গড় দৈর্ঘ্য ভালো (${avgWordsPerSentence.toFixed(1)} শব্দ)` });
  } else if (avgWordsPerSentence > 20 && avgWordsPerSentence <= 30) {
    score += 15; issues.push({ type: 'warning', message: `বাক্য কিছুটা লম্বা (গড় ${avgWordsPerSentence.toFixed(1)} শব্দ)` });
  } else if (avgWordsPerSentence > 30) {
    score += 5; issues.push({ type: 'error', message: `বাক্য অনেক লম্বা (গড় ${avgWordsPerSentence.toFixed(1)} শব্দ)` });
  }

  if (paragraphs.length >= 3) {
    score += 25; issues.push({ type: 'good', message: `${paragraphs.length}টি প্যারাগ্রাফ — ভালো স্ট্রাকচার` });
  } else if (paragraphs.length >= 1) {
    score += 10; issues.push({ type: 'warning', message: 'আরও প্যারাগ্রাফ ব্যবহার করুন' });
  }

  const hasHeadings = /<h[1-6]/i.test(text);
  if (hasHeadings) {
    score += 20; issues.push({ type: 'good', message: 'হেডিং ট্যাগ ব্যবহৃত হয়েছে' });
  } else if (words.length > 100) {
    issues.push({ type: 'warning', message: 'হেডিং ট্যাগ ব্যবহার করুন কন্টেন্ট সাজাতে' });
  }

  const hasList = /<(ul|ol|li)/i.test(text);
  if (hasList) {
    score += 15; issues.push({ type: 'good', message: 'লিস্ট ব্যবহৃত হয়েছে — পাঠযোগ্যতা বাড়ায়' });
  }

  const hasLinks = /<a\s/i.test(text);
  if (hasLinks) {
    score += 10; issues.push({ type: 'good', message: 'ইন্টারনাল/এক্সটার্নাল লিংক আছে' });
  } else {
    issues.push({ type: 'warning', message: 'কন্টেন্টে লিংক যোগ করুন' });
  }

  return { score: Math.min(score, 100), issues };
};

// ─── Google Search Preview ───
const GooglePreview = ({ title, description, url }: { title: string; description: string; url: string }) => (
  <div className="bg-card border rounded-lg p-4 space-y-1 max-w-[600px]">
    <p className="text-xs text-muted-foreground truncate">{url || 'https://boialo.com/...'}</p>
    <h3 className="text-[#1a0dab] text-lg font-medium leading-tight truncate hover:underline cursor-pointer">
      {title || 'পেজের টাইটেল এখানে দেখাবে'}
    </h3>
    <p className="text-sm text-muted-foreground line-clamp-2">
      {description || 'মেটা বর্ণনা এখানে দেখাবে। এটি সার্চ রেজাল্টে প্রদর্শিত হবে।'}
    </p>
  </div>
);

// ─── Social Preview ───
const SocialPreview = ({ title, description, image, url }: { title: string; description: string; image?: string; url: string }) => (
  <div className="border rounded-lg overflow-hidden max-w-[500px] bg-card">
    <div className="bg-muted h-[200px] flex items-center justify-center">
      {image ? (
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <ImageIcon className="h-10 w-10" />
          <span className="text-sm">OG ইমেজ নেই</span>
        </div>
      )}
    </div>
    <div className="p-3 space-y-1">
      <p className="text-xs text-muted-foreground uppercase">{url?.replace('https://', '').split('/')[0] || 'boialo.com'}</p>
      <h4 className="font-semibold text-sm line-clamp-2">{title || 'টাইটেল'}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">{description || 'বর্ণনা'}</p>
    </div>
  </div>
);

// ─── Score Circle ───
const ScoreCircle = ({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) => {
  const radius = size === 'lg' ? 54 : 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const dim = size === 'lg' ? 130 : 70;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={size === 'lg' ? 8 : 5} className="text-muted/30" />
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" strokeWidth={size === 'lg' ? 8 : 5}
          stroke={score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-lg'} ${getScoreColor(score)}`}>{score}</span>
        {size === 'lg' && <span className="text-xs text-muted-foreground">/১০০</span>}
      </div>
    </div>
  );
};

// ─── Main Component ───
const AdminSEOTools = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyzerInput, setAnalyzerInput] = useState({ title: '', description: '', slug: '', content: '', image: '', keywords: '' });
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Fetch all products for audit
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['seo-products-audit'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, slug, description, image_url, meta_title, meta_description, meta_keywords, price, discount_price, stock_quantity').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['seo-blog-audit'],
    queryFn: async () => {
      const { data } = await supabase.from('blog_posts').select('id, title_bn, slug, excerpt_bn, content_bn, featured_image, meta_title, meta_description, status').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['seo-categories-audit'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_bn, slug, meta_title, meta_description, image_url, is_active').order('sort_order');
      return data || [];
    }
  });

  const { data: universalProducts = [] } = useQuery({
    queryKey: ['seo-universal-audit'],
    queryFn: async () => {
      const { data } = await supabase.from('universal_products').select('id, name_bn, slug, description_bn, meta_title, meta_description, meta_keywords').order('created_at', { ascending: false });
      return data || [];
    }
  });

  // ─── Compute Site-Wide SEO Audit ───
  const siteAudit = useMemo(() => {
    const allItems: { type: string; id: string; name: string; score: number; issues: any[]; slug: string }[] = [];

    products.forEach((p: any) => {
      const { score, issues } = calculateSEOScore({
        title: p.meta_title || p.title, description: p.meta_description || p.description,
        slug: p.slug, image: p.image_url, keywords: p.meta_keywords,
      });
      allItems.push({ type: 'বই', id: p.id, name: p.title, score, issues, slug: p.slug });
    });

    blogPosts.forEach((b: any) => {
      const { score, issues } = calculateSEOScore({
        title: b.meta_title || b.title_bn, description: b.meta_description || b.excerpt_bn,
        slug: b.slug, content: b.content_bn, image: b.featured_image,
      });
      allItems.push({ type: 'ব্লগ', id: b.id, name: b.title_bn, score, issues, slug: b.slug });
    });

    categories.forEach((c: any) => {
      const { score, issues } = calculateSEOScore({
        title: c.meta_title || c.name_bn, description: c.meta_description,
        slug: c.slug, image: c.image_url,
      });
      allItems.push({ type: 'ক্যাটাগরি', id: c.id, name: c.name_bn, score, issues, slug: c.slug });
    });

    universalProducts.forEach((u: any) => {
      const { score, issues } = calculateSEOScore({
        title: u.meta_title || u.name_bn, description: u.meta_description || u.description_bn,
        slug: u.slug, keywords: u.meta_keywords,
      });
      allItems.push({ type: 'প্রোডাক্ট', id: u.id, name: u.name_bn, score, issues, slug: u.slug });
    });

    const total = allItems.length;
    const avgScore = total > 0 ? Math.round(allItems.reduce((s, i) => s + i.score, 0) / total) : 0;
    const good = allItems.filter(i => i.score >= 80).length;
    const warning = allItems.filter(i => i.score >= 50 && i.score < 80).length;
    const bad = allItems.filter(i => i.score < 50).length;

    const noTitle = allItems.filter(i => i.issues.some(is => is.message.includes('টাইটেল নেই'))).length;
    const noDesc = allItems.filter(i => i.issues.some(is => is.message.includes('মেটা বর্ণনা নেই'))).length;
    const noImg = allItems.filter(i => i.issues.some(is => is.message.includes('ইমেজ নেই'))).length;

    return { allItems, total, avgScore, good, warning, bad, noTitle, noDesc, noImg };
  }, [products, blogPosts, categories, universalProducts]);

  // ─── Keyword Density ───
  const keywordDensity = useMemo(() => {
    if (!analyzerInput.content || !analyzerInput.keywords) return [];
    const clean = analyzerInput.content.replace(/<[^>]*>/g, '').toLowerCase();
    const words = clean.split(/\s+/).filter(Boolean);
    const totalWords = words.length;
    return analyzerInput.keywords.split(',').map(kw => {
      const keyword = kw.trim().toLowerCase();
      if (!keyword) return null;
      const regex = new RegExp(keyword, 'gi');
      const matches = clean.match(regex) || [];
      const count = matches.length;
      const density = totalWords > 0 ? ((count / totalWords) * 100) : 0;
      return { keyword, count, density: density.toFixed(2), status: density >= 1 && density <= 3 ? 'good' : density > 3 ? 'warning' : 'low' };
    }).filter(Boolean);
  }, [analyzerInput.content, analyzerInput.keywords]);

  const analyzerSEO = useMemo(() => calculateSEOScore(analyzerInput), [analyzerInput]);
  const analyzerReadability = useMemo(() => calculateReadability(analyzerInput.content), [analyzerInput.content]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              SEO টুলস
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Yoast-স্টাইল SEO অ্যানালাইসিস, কীওয়ার্ড রিসার্চ ও সাইট অডিট</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full max-w-5xl">
            <TabsTrigger value="overview">📊 ওভারভিউ</TabsTrigger>
            <TabsTrigger value="analyzer">🔍 অ্যানালাইজার</TabsTrigger>
            <TabsTrigger value="audit">📋 সাইট অডিট</TabsTrigger>
            <TabsTrigger value="keywords">🎯 কীওয়ার্ড</TabsTrigger>
            <TabsTrigger value="bulk-meta">✏️ বাল্ক মেটা</TabsTrigger>
            <TabsTrigger value="redirects">↪️ রিডাইরেক্ট</TabsTrigger>
            <TabsTrigger value="links">🔗 লিংক ম্যাপ</TabsTrigger>
            <TabsTrigger value="duplicates">📑 ডুপ্লিকেট</TabsTrigger>
            <TabsTrigger value="images">🖼️ ইমেজ SEO</TabsTrigger>
            <TabsTrigger value="schema">📐 Schema</TabsTrigger>
            <TabsTrigger value="headings">📑 হেডিং</TabsTrigger>
            <TabsTrigger value="checklist">✅ চেকলিস্ট</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="col-span-1">
                <CardContent className="pt-6 flex flex-col items-center">
                  <ScoreCircle score={siteAudit.avgScore} />
                  <p className="text-sm font-medium mt-2">সাইট SEO স্কোর</p>
                  <Badge className={`mt-1 ${siteAudit.avgScore >= 80 ? 'bg-green-100 text-green-800' : siteAudit.avgScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {getScoreLabel(siteAudit.avgScore)}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট পেজ/আইটেম</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{siteAudit.total}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-green-600 border-green-300">{siteAudit.good} ভালো</Badge>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">{siteAudit.warning} মাঝামাঝি</Badge>
                    <Badge variant="outline" className="text-red-600 border-red-300">{siteAudit.bad} দুর্বল</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">সমস্যা সনাক্ত</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{siteAudit.noTitle} টাইটেল অনুপস্থিত</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{siteAudit.noDesc} মেটা বর্ণনা নেই</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{siteAudit.noImg} ইমেজ নেই</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">দ্রুত পরামর্শ</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {siteAudit.noTitle > 0 && (
                    <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>সব পেজে ইউনিক মেটা টাইটেল যোগ করুন</span></div>
                  )}
                  {siteAudit.noDesc > 0 && (
                    <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>সব পেজে মেটা বর্ণনা লিখুন (১২০-১৬০ অক্ষর)</span></div>
                  )}
                  {siteAudit.noImg > 0 && (
                    <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>সব প্রোডাক্টে ইমেজ যোগ করুন</span></div>
                  )}
                  <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>প্রতিটি পেজে ফোকাস কীওয়ার্ড সেট করুন</span></div>
                </CardContent>
              </Card>
            </div>

            {/* Score Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">SEO স্কোর ডিস্ট্রিবিউশন</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'ভালো (৮০+)', count: siteAudit.good, color: 'bg-green-500', pct: siteAudit.total > 0 ? (siteAudit.good / siteAudit.total) * 100 : 0 },
                    { label: 'মাঝামাঝি (৫০-৭৯)', count: siteAudit.warning, color: 'bg-yellow-500', pct: siteAudit.total > 0 ? (siteAudit.warning / siteAudit.total) * 100 : 0 },
                    { label: 'দুর্বল (<৫০)', count: siteAudit.bad, color: 'bg-red-500', pct: siteAudit.total > 0 ? (siteAudit.bad / siteAudit.total) * 100 : 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm w-32 shrink-0">{item.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ ANALYZER TAB ═══ */}
          <TabsContent value="analyzer" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Input Panel */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5" /> SEO অ্যানালাইজার</CardTitle>
                    <CardDescription>যেকোনো পেজের তথ্য দিন, SEO ও পাঠযোগ্যতা স্কোর দেখুন</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>ফোকাস কীওয়ার্ড (কমা দিয়ে আলাদা করুন)</Label>
                      <Input placeholder="বই, ইসলামি বই, অনলাইন বই" value={analyzerInput.keywords}
                        onChange={e => setAnalyzerInput(p => ({ ...p, keywords: e.target.value }))} />
                    </div>
                    <div>
                      <Label>SEO টাইটেল <span className="text-muted-foreground text-xs">({analyzerInput.title.length}/৬০)</span></Label>
                      <Input placeholder="পেজের টাইটেল লিখুন" value={analyzerInput.title}
                        onChange={e => setAnalyzerInput(p => ({ ...p, title: e.target.value }))} />
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${analyzerInput.title.length <= 60 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min((analyzerInput.title.length / 60) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <Label>URL স্লাগ</Label>
                      <Input placeholder="page-url-slug" value={analyzerInput.slug}
                        onChange={e => setAnalyzerInput(p => ({ ...p, slug: e.target.value }))} />
                    </div>
                    <div>
                      <Label>মেটা বর্ণনা <span className="text-muted-foreground text-xs">({analyzerInput.description.length}/১৬০)</span></Label>
                      <Textarea placeholder="পেজের মেটা বর্ণনা লিখুন" value={analyzerInput.description} rows={3}
                        onChange={e => setAnalyzerInput(p => ({ ...p, description: e.target.value }))} />
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${analyzerInput.description.length <= 160 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min((analyzerInput.description.length / 160) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <Label>OG ইমেজ URL</Label>
                      <Input placeholder="https://..." value={analyzerInput.image}
                        onChange={e => setAnalyzerInput(p => ({ ...p, image: e.target.value }))} />
                    </div>
                    <div>
                      <Label>কন্টেন্ট (HTML সাপোর্টেড)</Label>
                      <Textarea placeholder="পেজের মূল কন্টেন্ট পেস্ট করুন..." value={analyzerInput.content} rows={8}
                        onChange={e => setAnalyzerInput(p => ({ ...p, content: e.target.value }))} />
                    </div>
                  </CardContent>
                </Card>

                {/* Previews */}
                <Card>
                  <CardHeader><CardTitle className="text-base">🔎 Google সার্চ প্রিভিউ</CardTitle></CardHeader>
                  <CardContent>
                    <GooglePreview title={analyzerInput.title} description={analyzerInput.description}
                      url={`https://boialo.com/${analyzerInput.slug}`} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">📱 সোশ্যাল মিডিয়া প্রিভিউ</CardTitle></CardHeader>
                  <CardContent className="flex gap-4 flex-wrap">
                    <SocialPreview title={analyzerInput.title} description={analyzerInput.description}
                      image={analyzerInput.image} url={`https://boialo.com/${analyzerInput.slug}`} />
                  </CardContent>
                </Card>
              </div>

              {/* Score Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">SEO স্কোর</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <ScoreCircle score={analyzerSEO.score} />
                    <Badge className={`mt-2 ${analyzerSEO.score >= 80 ? 'bg-green-100 text-green-800' : analyzerSEO.score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {getScoreLabel(analyzerSEO.score)}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">পাঠযোগ্যতা স্কোর</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <ScoreCircle score={analyzerReadability.score} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">SEO বিশ্লেষণ</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analyzerSEO.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {issue.type === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                        {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                        {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">পাঠযোগ্যতা বিশ্লেষণ</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analyzerReadability.issues.length > 0 ? analyzerReadability.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {issue.type === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                        {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                        {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                        <span>{issue.message}</span>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">কন্টেন্ট যোগ করুন বিশ্লেষণ দেখতে</p>}
                  </CardContent>
                </Card>

                {/* Keyword Density */}
                {keywordDensity.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">কীওয়ার্ড ঘনত্ব</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {keywordDensity.map((kd: any, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{kd.keyword}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{kd.count}বার ({kd.density}%)</span>
                            {kd.status === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {kd.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {kd.status === 'low' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground mt-1">আদর্শ ঘনত্ব: ১-৩%</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ SITE AUDIT TAB ═══ */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">সাইট-ওয়াইড SEO অডিট</CardTitle>
                    <CardDescription>সব পেজ, প্রোডাক্ট ও ব্লগের SEO স্কোর</CardDescription>
                  </div>
                  <Badge variant="outline">{siteAudit.total}টি আইটেম</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {siteAudit.allItems.sort((a, b) => a.score - b.score).map(item => (
                      <div key={`${item.type}-${item.id}`}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedProduct(expandedProduct === item.id ? null : item.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <ScoreCircle score={item.score} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                                <span className="text-xs text-muted-foreground">/{item.slug}</span>
                              </div>
                            </div>
                          </div>
                          {expandedProduct === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                        {expandedProduct === item.id && (
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            {item.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                {issue.type === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                                {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                                {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                                <span>{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ KEYWORDS TAB ═══ */}
          <TabsContent value="keywords" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Hash className="h-5 w-5" /> কীওয়ার্ড সাজেশন</CardTitle>
                  <CardDescription>বইআলোর জন্য সেরা বাংলা কীওয়ার্ড</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: '📚 বই সম্পর্কিত', keywords: ['বই কিনুন অনলাইন', 'বাংলা বই', 'ইসলামি বই', 'শিশু কিশোরদের বই', 'একাডেমিক বই', 'বই অর্ডার করুন', 'বই হোম ডেলিভারি', 'সস্তায় বই', 'নতুন বই', 'বেস্ট সেলার বই'] },
                      { category: '🛒 ই-কমার্স', keywords: ['অনলাইন শপিং বাংলাদেশ', 'ক্যাশ অন ডেলিভারি বই', 'বই ফ্রি ডেলিভারি', 'বই ডিসকাউন্ট', 'বই অফার'] },
                      { category: '✍️ লেখক/প্রকাশনী', keywords: ['হুমায়ূন আহমেদ বই', 'রবীন্দ্রনাথ ঠাকুর বই', 'রকমারি বই', 'বই মেলা'] },
                      { category: '🌐 ইংরেজি', keywords: ['buy books online bangladesh', 'bangla books online', 'islamic books bd', 'online bookshop bangladesh', 'boialo'] },
                    ].map(group => (
                      <div key={group.category}>
                        <h4 className="font-medium text-sm mb-2">{group.category}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {group.keywords.map(kw => (
                            <Badge key={kw} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(kw);
                                toast({ title: 'কপি হয়েছে', description: kw });
                              }}>
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Long-Tail কীওয়ার্ড</CardTitle>
                  <CardDescription>র‍্যাঙ্কিং বাড়াতে লং-টেইল কীওয়ার্ড ব্যবহার করুন</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { kw: 'বাংলাদেশে অনলাইনে বই কিনুন ফ্রি ডেলিভারি', vol: 'মাঝারি', diff: 'সহজ' },
                      { kw: 'ইসলামি বই কিনুন ক্যাশ অন ডেলিভারি', vol: 'মাঝারি', diff: 'সহজ' },
                      { kw: 'শিশুদের জন্য সেরা বাংলা বই', vol: 'উচ্চ', diff: 'মাঝারি' },
                      { kw: 'একাডেমিক বই কিনুন সস্তায়', vol: 'উচ্চ', diff: 'মাঝারি' },
                      { kw: 'নতুন বই রিলিজ বাংলা ২০২৬', vol: 'কম', diff: 'সহজ' },
                      { kw: 'বই উপহার দিন অনলাইন অর্ডার', vol: 'কম', diff: 'সহজ' },
                      { kw: 'সেরা উপন্যাস বাংলা ভাষায়', vol: 'উচ্চ', diff: 'কঠিন' },
                      { kw: 'বই পড়ার অভ্যাস গড়ে তুলুন', vol: 'কম', diff: 'সহজ' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <span className="text-sm flex-1">{item.kw}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">{item.vol}</Badge>
                          <Badge className={`text-xs ${item.diff === 'সহজ' ? 'bg-green-100 text-green-800' : item.diff === 'মাঝারি' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {item.diff}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ BULK META EDITOR TAB ═══ */}
          <TabsContent value="bulk-meta" className="space-y-4">
            <BulkMetaEditor />
          </TabsContent>

          {/* ═══ REDIRECTS TAB ═══ */}
          <TabsContent value="redirects" className="space-y-4">
            <RedirectManager />
          </TabsContent>

          {/* ═══ INTERNAL LINKS TAB ═══ */}
          <TabsContent value="links" className="space-y-4">
            <InternalLinkAnalyzer />
          </TabsContent>

          {/* ═══ DUPLICATES TAB ═══ */}
          <TabsContent value="duplicates" className="space-y-4">
            <DuplicateDetector />
          </TabsContent>

          {/* ═══ IMAGE SEO TAB ═══ */}
          <TabsContent value="images" className="space-y-4">
            <ImageSEOChecker />
          </TabsContent>

          {/* ═══ SCHEMA TAB ═══ */}
          <TabsContent value="schema" className="space-y-4">
            <SchemaValidator />
          </TabsContent>

          {/* ═══ HEADINGS TAB ═══ */}
          <TabsContent value="headings" className="space-y-4">
            <HeadingAnalyzer />
          </TabsContent>

          {/* ═══ CHECKLIST TAB ═══ */}
          <TabsContent value="checklist" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                {
                  title: '🔧 টেকনিক্যাল SEO', items: [
                    { text: 'SSL সার্টিফিকেট (HTTPS) অ্যাক্টিভ', done: true },
                    { text: 'মোবাইল-ফ্রেন্ডলি ডিজাইন (Responsive)', done: true },
                    { text: 'robots.txt ফাইল কনফিগারড', done: true },
                    { text: 'XML Sitemap জেনারেটেড', done: true },
                    { text: 'Canonical URL সেট করা', done: true },
                    { text: 'Schema.org স্ট্রাকচার্ড ডেটা', done: true },
                    { text: 'Page Speed অপটিমাইজড (<3s)', done: true },
                    { text: 'Lazy Loading ইমেজ', done: true },
                    { text: 'Preconnect হেডার যোগ', done: true },
                    { text: 'hreflang ট্যাগ (বাংলা)', done: true },
                  ]
                },
                {
                  title: '📝 অন-পেজ SEO', items: [
                    { text: 'প্রতিটি পেজে ইউনিক টাইটেল', done: true },
                    { text: 'মেটা বর্ণনা (১২০-১৬০ অক্ষর)', done: true },
                    { text: 'H1 ট্যাগ প্রতি পেজে একটি', done: true },
                    { text: 'ইমেজে Alt Text', done: true },
                    { text: 'ইন্টারনাল লিংকিং', done: true },
                    { text: 'Breadcrumb নেভিগেশন', done: true },
                    { text: 'Open Graph ট্যাগ', done: true },
                    { text: 'Twitter Card ট্যাগ', done: true },
                    { text: 'কীওয়ার্ড অপটিমাইজেশন', done: true },
                    { text: 'URL স্ট্রাকচার SEO-ফ্রেন্ডলি', done: true },
                  ]
                },
                {
                  title: '📊 স্ট্রাকচার্ড ডেটা', items: [
                    { text: 'Organization Schema', done: true },
                    { text: 'WebSite Schema + SearchAction', done: true },
                    { text: 'Product/Book Schema', done: true },
                    { text: 'BreadcrumbList Schema', done: true },
                    { text: 'Article Schema (ব্লগ)', done: true },
                    { text: 'Store Schema', done: true },
                    { text: 'AggregateRating Schema', done: true },
                    { text: 'FAQ Schema যোগ করুন', done: false },
                    { text: 'HowTo Schema যোগ করুন', done: false },
                  ]
                },
                {
                  title: '🚀 অফ-পেজ ও এডভান্সড', items: [
                    { text: 'Google Search Console যোগ', done: false },
                    { text: 'Google Analytics সেটআপ', done: false },
                    { text: 'Bing Webmaster Tools', done: false },
                    { text: 'সোশ্যাল মিডিয়া প্রোফাইল লিংকিং', done: true },
                    { text: 'ব্যাকলিংক স্ট্র্যাটেজি', done: false },
                    { text: 'Google My Business', done: false },
                    { text: 'Core Web Vitals অপটিমাইজ', done: true },
                    { text: 'AMP পেজ (ঐচ্ছিক)', done: false },
                  ]
                },
              ].map(section => (
                <Card key={section.title}>
                  <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={item.done ? '' : 'text-muted-foreground'}>{item.text}</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>সম্পন্ন: {section.items.filter(i => i.done).length}/{section.items.length}</span>
                        <Progress value={(section.items.filter(i => i.done).length / section.items.length) * 100} className="w-24 h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSEOTools;
