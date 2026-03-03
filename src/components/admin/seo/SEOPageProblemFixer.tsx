import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  XCircle, AlertTriangle, CheckCircle2, ImageIcon, Search,
  Save, Loader2, ChevronDown, ChevronUp, Upload, Sparkles, X, Plus, Globe,
  FileText, Eye
} from 'lucide-react';

interface PageProblem {
  type: string;
  id: string;
  name: string;
  slug: string;
  table: string;
  problems: { type: 'error' | 'warning' | 'info'; message: string; field: string }[];
  image_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  description?: string;
  status?: string;
  isStatic?: boolean;
}

const KEYWORD_SUGGESTIONS: Record<string, string[]> = {
  'বই': ['বই', 'বাংলা বই', 'অনলাইন বই', 'বই কিনুন', 'book', 'bangla book', 'buy book online'],
  'ক্যাটাগরি': ['বই ক্যাটাগরি', 'বিষয়ভিত্তিক বই', 'category', 'book category'],
  'ব্লগ': ['ব্লগ', 'আর্টিকেল', 'পড়ুন', 'blog', 'article', 'reading'],
  'প্রোডাক্ট': ['পণ্য', 'কিনুন', 'অর্ডার', 'product', 'buy online', 'order'],
  'লেখক': ['লেখক', 'বই লেখক', 'author', 'writer', 'bangla writer'],
  'প্রকাশনী': ['প্রকাশনী', 'পাবলিশার', 'publisher', 'book publisher'],
  'পেজ': ['বইআলো', 'boialo', 'অনলাইন বইয়ের দোকান', 'online bookshop'],
  'স্ট্যাটিক পেজ': ['বইআলো', 'boialo', 'অনলাইন বই', 'বাংলা বই'],
};

const STATIC_PAGES: PageProblem[] = [
  { type: 'স্ট্যাটিক পেজ', id: 'static-home', name: 'হোম পেজ', slug: '', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-shop', name: 'শপ', slug: 'shop', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-categories', name: 'ক্যাটাগরি সমূহ', slug: 'categories', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-authors', name: 'লেখক সমূহ', slug: 'authors', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-publishers', name: 'প্রকাশনী সমূহ', slug: 'publishers', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-blog', name: 'ব্লগ', slug: 'blog', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-about', name: 'আমাদের সম্পর্কে', slug: 'about', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-contact', name: 'যোগাযোগ', slug: 'contact', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-faq', name: 'FAQ', slug: 'faq', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-terms', name: 'শর্তাবলী', slug: 'terms', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-privacy', name: 'প্রাইভেসি পলিসি', slug: 'privacy', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-refund', name: 'রিফান্ড পলিসি', slug: 'refund-policy', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-offers', name: 'অফার সমূহ', slug: 'offers', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-preorder', name: 'প্রি-অর্ডার', slug: 'preorder', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-bundles', name: 'বান্ডেল', slug: 'bundles', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-giftcards', name: 'গিফট কার্ড', slug: 'gift-cards', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-digital', name: 'ডিজিটাল লাইব্রেরি', slug: 'digital-library', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-compare', name: 'তুলনা', slug: 'compare', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-cart', name: 'কার্ট', slug: 'cart', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-checkout', name: 'চেকআউট', slug: 'checkout', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-signin', name: 'সাইন ইন', slug: 'signin', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-track', name: 'অর্ডার ট্র্যাকিং', slug: 'track', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-wishlist', name: 'উইশলিস্ট', slug: 'wishlist', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-profile', name: 'প্রোফাইল', slug: 'profile', table: '_static', problems: [], isStatic: true },
  { type: 'স্ট্যাটিক পেজ', id: 'static-orders', name: 'অর্ডার হিস্ট্রি', slug: 'orders', table: '_static', problems: [], isStatic: true },
];

export const PageProblemFixer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterProblem, setFilterProblem] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [newKeyword, setNewKeyword] = useState('');
  const [showAll, setShowAll] = useState(false);

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

  const { data: dynamicPages = [] } = useQuery({
    queryKey: ['page-problems-pages'],
    queryFn: async () => {
      const { data } = await supabase.from('pages').select('id, title_bn, title_en, slug, status, meta_title, meta_description, featured_image, description_bn').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const allPages = useMemo(() => {
    const pages: PageProblem[] = [];

    // Static pages (always shown when showAll)
    if (showAll) {
      STATIC_PAGES.forEach(sp => {
        pages.push({ ...sp, problems: [{ type: 'info', message: 'বিল্ট-ইন পেজ', field: 'info' }] });
      });
    }

    // Dynamic pages from DB
    dynamicPages.forEach((dp: any) => {
      const problems: PageProblem['problems'] = [];
      if (!dp.featured_image) problems.push({ type: 'warning', message: 'ফিচার্ড ইমেজ নেই', field: 'image' });
      if (!dp.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!dp.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!dp.description_bn) problems.push({ type: 'warning', message: 'বর্ণনা নেই', field: 'description' });
      if (showAll || problems.length > 0) {
        pages.push({
          type: 'পেজ', id: dp.id, name: dp.title_bn, slug: dp.slug, table: 'pages',
          problems, image_url: dp.featured_image, meta_title: dp.meta_title,
          meta_description: dp.meta_description, status: dp.status,
        });
      }
    });

    products.forEach((p: any) => {
      const problems: PageProblem['problems'] = [];
      if (!p.image_url && (!p.images || (Array.isArray(p.images) && p.images.length === 0))) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!p.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!p.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!p.meta_keywords) problems.push({ type: 'warning', message: 'কীওয়ার্ড নেই', field: 'meta_keywords' });
      if (!p.description) problems.push({ type: 'warning', message: 'বর্ণনা নেই', field: 'description' });
      if (showAll || problems.length > 0) {
        pages.push({
          type: 'বই', id: p.id, name: p.title || p.title_bn, slug: p.slug, table: 'products',
          problems, image_url: p.image_url, meta_title: p.meta_title, meta_description: p.meta_description,
          meta_keywords: p.meta_keywords, description: p.description,
        });
      }
    });

    categories.forEach((c: any) => {
      const problems: PageProblem['problems'] = [];
      if (!c.image_url) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!c.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!c.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (showAll || problems.length > 0) {
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
      if (showAll || problems.length > 0) {
        pages.push({
          type: 'ব্লগ', id: b.id, name: b.title_bn, slug: b.slug, table: 'blog_posts',
          problems, image_url: b.featured_image, meta_title: b.meta_title, meta_description: b.meta_description,
          status: b.status,
        });
      }
    });

    universalProducts.forEach((u: any) => {
      const problems: PageProblem['problems'] = [];
      if (!u.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!u.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!u.meta_keywords) problems.push({ type: 'warning', message: 'কীওয়ার্ড নেই', field: 'meta_keywords' });
      if (!u.description_bn) problems.push({ type: 'warning', message: 'বর্ণনা নেই', field: 'description' });
      if (showAll || problems.length > 0) {
        pages.push({
          type: 'প্রোডাক্ট', id: u.id, name: u.name_bn, slug: u.slug, table: 'universal_products',
          problems, meta_title: u.meta_title, meta_description: u.meta_description,
          meta_keywords: u.meta_keywords, description: u.description_bn,
        });
      }
    });

    writers.forEach((w: any) => {
      const problems: PageProblem['problems'] = [];
      if (!w.image_url) problems.push({ type: 'error', message: 'ইমেজ নেই', field: 'image' });
      if (!w.meta_title) problems.push({ type: 'warning', message: 'মেটা টাইটেল নেই', field: 'meta_title' });
      if (!w.meta_description) problems.push({ type: 'warning', message: 'মেটা বর্ণনা নেই', field: 'meta_description' });
      if (!w.bio_bn) problems.push({ type: 'warning', message: 'বায়ো নেই', field: 'bio' });
      if (showAll || problems.length > 0) {
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
      if (showAll || problems.length > 0) {
        pages.push({
          type: 'প্রকাশনী', id: pub.id, name: pub.name_bn, slug: pub.slug, table: 'publishers',
          problems, image_url: pub.logo_url, meta_title: pub.meta_title, meta_description: pub.meta_description,
        });
      }
    });

    return pages;
  }, [products, categories, blogPosts, universalProducts, writers, publishers, dynamicPages, showAll]);

  const filtered = useMemo(() => {
    let result = allPages;
    if (filterType !== 'all') result = result.filter(p => p.type === filterType);
    if (filterProblem === 'image') result = result.filter(p => p.problems.some(pr => pr.field === 'image'));
    else if (filterProblem === 'meta') result = result.filter(p => p.problems.some(pr => pr.field === 'meta_title' || pr.field === 'meta_description'));
    else if (filterProblem === 'content') result = result.filter(p => p.problems.some(pr => pr.field === 'content' || pr.field === 'description'));
    else if (filterProblem === 'keywords') result = result.filter(p => p.problems.some(pr => pr.field === 'meta_keywords'));
    else if (filterProblem === 'ok') result = result.filter(p => p.problems.length === 0 || p.problems.every(pr => pr.type === 'info'));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.slug?.includes(q));
    }
    return result;
  }, [allPages, filterType, filterProblem, searchQuery]);

  // Count stats from problematic items only
  const problemPages = useMemo(() => allPages.filter(p => p.problems.some(pr => pr.type === 'error' || pr.type === 'warning')), [allPages]);

  const stats = useMemo(() => ({
    total: allPages.length,
    problems: problemPages.length,
    noImage: problemPages.filter(p => p.problems.some(pr => pr.field === 'image')).length,
    noMeta: problemPages.filter(p => p.problems.some(pr => pr.field === 'meta_title' || pr.field === 'meta_description')).length,
    noContent: problemPages.filter(p => p.problems.some(pr => pr.field === 'content' || pr.field === 'description')).length,
    noKeywords: problemPages.filter(p => p.problems.some(pr => pr.field === 'meta_keywords')).length,
  }), [allPages, problemPages]);

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
      queryClient.invalidateQueries({ queryKey: ['page-problems-pages'] });
      setExpandedId(null);
      toast({ title: '✅ সেভ হয়েছে!' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const handleExpand = (page: PageProblem) => {
    if (page.isStatic) return; // Static pages can't be edited here
    if (expandedId === page.id) { setExpandedId(null); return; }
    setExpandedId(page.id);
    const keywords = page.meta_keywords ? page.meta_keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    setEditValues({
      image_url: page.image_url || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      slug: page.slug || '',
      keywords,
    });
    setNewKeyword('');
  };

  const handleSaveImage = (page: PageProblem, url: string) => {
    const imageField = page.table === 'publishers' ? 'logo_url' : page.table === 'blog_posts' ? 'featured_image' : page.table === 'pages' ? 'featured_image' : 'image_url';
    saveMutation.mutate({ table: page.table, id: page.id, values: { [imageField]: url } });
  };

  const handleSaveMeta = (page: PageProblem) => {
    if (page.isStatic) return;
    const values: Record<string, any> = {};
    if (editValues.meta_title) values.meta_title = editValues.meta_title;
    if (editValues.meta_description) values.meta_description = editValues.meta_description;
    if (editValues.slug && editValues.slug !== page.slug) values.slug = editValues.slug;
    if (editValues.keywords?.length > 0 && (page.table === 'products' || page.table === 'universal_products')) {
      values.meta_keywords = editValues.keywords.join(', ');
    }
    if (Object.keys(values).length === 0) {
      toast({ title: 'কিছু পরিবর্তন করুন', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ table: page.table, id: page.id, values });
  };

  const autoGenerateMeta = (page: PageProblem) => {
    const name = page.name || '';
    let title = '';
    let desc = '';
    const suggestions = KEYWORD_SUGGESTIONS[page.type] || [];

    switch (page.type) {
      case 'বই':
        title = `${name} - বই কিনুন | বইআলো`;
        desc = `${name} বইটি অনলাইনে সেরা দামে কিনুন বইআলো থেকে। দ্রুত ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।`;
        break;
      case 'ক্যাটাগরি':
        title = `${name} বই - সেরা সংগ্রহ | বইআলো`;
        desc = `${name} বিভাগের সেরা বই সংগ্রহ। বইআলো থেকে ${name} ক্যাটাগরির সব বই কিনুন সেরা দামে।`;
        break;
      case 'ব্লগ':
        title = `${name} | বইআলো ব্লগ`;
        desc = `${name} - বিস্তারিত পড়ুন বইআলো ব্লগে। বই সম্পর্কিত আর্টিকেল ও রিভিউ।`;
        break;
      case 'লেখক':
        title = `${name} এর বই সমূহ | বইআলো`;
        desc = `${name} এর সকল বই একসাথে পেয়ে যান বইআলোতে। জনপ্রিয় লেখকের বই অর্ডার করুন।`;
        break;
      case 'প্রকাশনী':
        title = `${name} প্রকাশনী - সকল বই | বইআলো`;
        desc = `${name} প্রকাশনীর সকল বই কিনুন বইআলো থেকে। সেরা দাম ও দ্রুত ডেলিভারি।`;
        break;
      case 'পেজ':
        title = `${name} | বইআলো`;
        desc = `${name} - বইআলোর বিস্তারিত তথ্য দেখুন।`;
        break;
      default:
        title = `${name} | বইআলো`;
        desc = `${name} - বিস্তারিত দেখুন বইআলোতে।`;
    }

    const existingKw = editValues.keywords || [];
    const merged = [...new Set([...existingKw, ...suggestions])];

    setEditValues(prev => ({
      ...prev,
      meta_title: prev.meta_title || title,
      meta_description: prev.meta_description || desc,
      keywords: merged,
    }));
    toast({ title: '✨ অটো-জেনারেট হয়েছে!' });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const current = editValues.keywords || [];
    if (current.includes(kw)) { toast({ title: 'কীওয়ার্ড আগে থেকেই আছে' }); return; }
    setEditValues(prev => ({ ...prev, keywords: [...current, kw] }));
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setEditValues(prev => ({ ...prev, keywords: (prev.keywords || []).filter((k: string) => k !== kw) }));
  };

  const addSuggestedKeyword = (kw: string) => {
    const current = editValues.keywords || [];
    if (current.includes(kw)) return;
    setEditValues(prev => ({ ...prev, keywords: [...current, kw] }));
  };

  const metaTitleLen = (editValues.meta_title || '').length;
  const metaDescLen = (editValues.meta_description || '').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => { setShowAll(true); setFilterProblem('all'); }}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">📄 মোট পেজ</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => { setShowAll(false); setFilterProblem('all'); }}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-destructive">{stats.problems}</p>
            <p className="text-xs text-muted-foreground">⚠️ সমস্যা আছে</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('image')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-destructive">{stats.noImage}</p>
            <p className="text-xs text-muted-foreground">🖼️ ইমেজ নেই</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('meta')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.noMeta}</p>
            <p className="text-xs text-muted-foreground">📝 মেটা নেই</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterProblem('keywords')}>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{stats.noKeywords}</p>
            <p className="text-xs text-muted-foreground">🔑 কীওয়ার্ড নেই</p>
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
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা স্লাগ দিয়ে খুঁজুন..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
              <SelectItem value="keywords">🔑 কীওয়ার্ড নেই</SelectItem>
              <SelectItem value="content">📄 কন্টেন্ট নেই</SelectItem>
              <SelectItem value="ok">✅ সমস্যা নেই</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={showAll} onCheckedChange={setShowAll} />
            <span className="text-sm text-muted-foreground">সব পেজ দেখান</span>
          </div>
          <Badge variant="outline">{filtered.length}টি পেজ</Badge>
        </div>
      </CardContent></Card>

      {/* Pages List */}
      <div className="space-y-2 max-h-[700px] overflow-y-auto">
        {filtered.map(page => {
          const isExpanded = expandedId === page.id;
          const hasImageProblem = page.problems.some(p => p.field === 'image');
          const hasRealProblems = page.problems.some(p => p.type === 'error' || p.type === 'warning');
          const errorCount = page.problems.filter(p => p.type === 'error').length;
          const warningCount = page.problems.filter(p => p.type === 'warning').length;
          const suggestions = KEYWORD_SUGGESTIONS[page.type] || [];

          return (
            <div key={`${page.type}-${page.id}`}
              className={`border rounded-lg transition-all ${
                !hasRealProblems ? 'border-green-200' : hasImageProblem ? 'border-destructive/30' : 'border-yellow-300/50'
              } ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
              <div className="p-3 cursor-pointer flex items-center justify-between gap-3" onClick={() => handleExpand(page)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {page.isStatic ? (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    ) : page.image_url ? (
                      <img src={page.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{page.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{page.type}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">/{page.slug || '(home)'}</span>
                      {page.status && (
                        <Badge variant={page.status === 'published' ? 'default' : 'outline'} className="text-xs">
                          {page.status === 'published' ? 'প্রকাশিত' : page.status === 'draft' ? 'ড্রাফট' : page.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasRealProblems && <Badge className="text-xs bg-green-100 text-green-800">✅ ঠিক আছে</Badge>}
                  {errorCount > 0 && <Badge variant="destructive" className="text-xs">{errorCount} ত্রুটি</Badge>}
                  {warningCount > 0 && <Badge className="text-xs bg-yellow-100 text-yellow-800">{warningCount} সতর্কতা</Badge>}
                  {!page.isStatic && (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  {page.isStatic && (
                    <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
              </div>

              {isExpanded && !page.isStatic && (
                <div className="px-3 pb-4 border-t space-y-4">
                  {/* Problems */}
                  {hasRealProblems && (
                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {page.problems.filter(p => p.type !== 'info').map((problem, i) => (
                        <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${problem.type === 'error' ? 'bg-destructive/10' : 'bg-yellow-50'}`}>
                          {problem.type === 'error' ? <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                          <span>{problem.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Auto Generate Button */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => autoGenerateMeta(page)}>
                      <Sparkles className="h-4 w-4 mr-1" /> অটো-জেনারেট মেটা ও কীওয়ার্ড
                    </Button>
                    <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4 mr-1" /> প্রিভিউ</Button>
                    </a>
                  </div>

                  {/* Meta Title */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">মেটা টাইটেল</label>
                      <span className={`text-xs ${metaTitleLen > 60 ? 'text-destructive' : metaTitleLen > 50 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {metaTitleLen}/60
                      </span>
                    </div>
                    <Input
                      value={editValues.meta_title || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder="মেটা টাইটেল লিখুন..."
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">মেটা বর্ণনা</label>
                      <span className={`text-xs ${metaDescLen > 160 ? 'text-destructive' : metaDescLen > 140 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {metaDescLen}/160
                      </span>
                    </div>
                    <Textarea
                      value={editValues.meta_description || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="মেটা বর্ণনা লিখুন..."
                      rows={3}
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> স্লাগ (URL)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">/</span>
                      <Input
                        value={editValues.slug || ''}
                        onChange={e => setEditValues(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') }))}
                        placeholder="slug-here"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Keywords */}
                  {(page.table === 'products' || page.table === 'universal_products') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">🔑 কীওয়ার্ড</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(editValues.keywords || []).map((kw: string) => (
                          <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                            {kw}
                            <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newKeyword}
                          onChange={e => setNewKeyword(e.target.value)}
                          placeholder="নতুন কীওয়ার্ড লিখুন..."
                          className="flex-1"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                        />
                        <Button size="sm" variant="outline" onClick={addKeyword}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {suggestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">💡 সাজেস্টেড কীওয়ার্ড (ক্লিক করে যোগ করুন):</p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestions.filter(s => !(editValues.keywords || []).includes(s)).map(kw => (
                              <Badge key={kw} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors"
                                onClick={() => addSuggestedKeyword(kw)}>
                                <Plus className="h-3 w-3 mr-0.5" /> {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Google Preview */}
                  {(editValues.meta_title || editValues.meta_description) && (
                    <div className="border rounded-lg p-3 bg-background">
                      <p className="text-xs text-muted-foreground mb-2">🔍 Google প্রিভিউ</p>
                      <div className="space-y-0.5">
                        <p className="text-blue-700 text-base font-medium truncate">{editValues.meta_title || page.name}</p>
                        <p className="text-green-700 text-xs font-mono">boialo.com/{editValues.slug || page.slug}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{editValues.meta_description || 'মেটা বর্ণনা এখানে দেখাবে...'}</p>
                      </div>
                    </div>
                  )}

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
                        label={page.type === 'প্রকাশনী' ? 'লোগো আপলোড' : page.type === 'ব্লগ' || page.type === 'পেজ' ? 'ফিচার্ড ইমেজ' : 'ইমেজ আপলোড'}
                        folder={page.table === 'categories' ? 'categories' : page.table === 'publishers' ? 'branding' : 'product-images'}
                      />
                    </div>
                  )}

                  {/* Save Button */}
                  <Button onClick={() => handleSaveMeta(page)} disabled={saveMutation.isPending} className="w-full">
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    সব পরিবর্তন সেভ করুন
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
          <p className="font-medium">কোনো পেজ পাওয়া যায়নি</p>
          <p className="text-sm">ফিল্টার পরিবর্তন করে দেখুন।</p>
        </div>
      )}
    </div>
  );
};
