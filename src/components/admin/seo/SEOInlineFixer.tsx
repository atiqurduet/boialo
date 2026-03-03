import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Save, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Wand2, Plus, X, Sparkles,
  Eye, Filter, ArrowUpDown, Search
} from 'lucide-react';

interface AuditItem {
  type: string;
  id: string;
  name: string;
  score: number;
  issues: { type: 'good' | 'warning' | 'error'; message: string }[];
  slug: string;
  table?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  description?: string;
  image?: string;
}

// ─── Keyword Suggestions based on content/title ───
const generateKeywordSuggestions = (title: string, type: string, existingKeywords: string[] = []): string[] => {
  const suggestions: string[] = [];
  const titleLower = (title || '').toLowerCase();

  // Common book-related keywords
  const bookKeywords = [
    'বই কিনুন', 'অনলাইন বই', 'বাংলা বই', 'বই অর্ডার', 'বই ডেলিভারি',
    'সস্তায় বই', 'বই ডিসকাউন্ট', 'নতুন বই', 'বেস্ট সেলার',
    'ইসলামি বই', 'শিশুদের বই', 'একাডেমিক বই', 'উপন্যাস', 'গল্পের বই',
    'কবিতার বই', 'রান্নার বই', 'সায়েন্স ফিকশন', 'ইতিহাস বই',
    'আত্মউন্নয়ন বই', 'অনুবাদ বই', 'ইংরেজি বই', 'পাঠ্যবই',
    'বই উপহার', 'বই সংগ্রহ', 'পকেট বই', 'হার্ডকভার বই',
  ];

  // Category-specific suggestions
  const categoryKeywords = [
    'ক্যাটাগরি', 'বিভাগ', 'বই সংগ্রহ', 'বই তালিকা', 'সেরা বই',
  ];

  // Blog-specific suggestions
  const blogKeywords = [
    'পড়ার অভ্যাস', 'বই রিভিউ', 'বই সমালোচনা', 'বই পড়ুন',
    'সাহিত্য', 'লেখক', 'প্রকাশনী', 'বই মেলা',
  ];

  // Universal product keywords
  const productKeywords = [
    'অনলাইন শপিং', 'কিনুন', 'অর্ডার করুন', 'হোম ডেলিভারি',
    'ক্যাশ অন ডেলিভারি', 'ফ্রি ডেলিভারি', 'বাংলাদেশ',
  ];

  const pool = type === 'বই' ? bookKeywords
    : type === 'ক্যাটাগরি' ? categoryKeywords
    : type === 'ব্লগ' ? blogKeywords
    : productKeywords;

  // Title-based suggestions
  if (title) {
    suggestions.push(title);
    const words = title.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      suggestions.push(`${words.slice(0, 3).join(' ')} কিনুন`);
      suggestions.push(`${words[0]} বই`);
    }
  }

  // Add from pool, excluding existing
  const existingSet = new Set(existingKeywords.map(k => k.toLowerCase()));
  pool.forEach(kw => {
    if (!existingSet.has(kw.toLowerCase()) && !suggestions.some(s => s.toLowerCase() === kw.toLowerCase())) {
      suggestions.push(kw);
    }
  });

  return suggestions.filter(s => !existingSet.has(s.toLowerCase())).slice(0, 15);
};

// ─── Auto-generate meta title ───
const autoGenerateMetaTitle = (name: string, type: string): string => {
  if (!name) return '';
  const suffixes: Record<string, string> = {
    'বই': 'বই কিনুন | বইআলো',
    'ক্যাটাগরি': 'বই সংগ্রহ | বইআলো',
    'ব্লগ': 'বইআলো ব্লগ',
    'প্রোডাক্ট': 'কিনুন | বইআলো',
  };
  const suffix = suffixes[type] || 'বইআলো';
  const title = `${name} - ${suffix}`;
  return title.length > 60 ? `${name} | বইআলো` : title;
};

// ─── Auto-generate meta description ───
const autoGenerateMetaDesc = (name: string, type: string, description?: string): string => {
  if (description && description.length >= 50) {
    const clean = description.replace(/<[^>]*>/g, '').substring(0, 155);
    return clean + (description.length > 155 ? '...' : '');
  }
  const templates: Record<string, string> = {
    'বই': `${name} — বইআলো থেকে সেরা দামে কিনুন। ফ্রি ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা। বাংলাদেশের সবচেয়ে বিশ্বস্ত অনলাইন বইয়ের দোকান।`,
    'ক্যাটাগরি': `${name} ক্যাটাগরির সেরা বই কিনুন বইআলো থেকে। বিশাল সংগ্রহ, সেরা দাম ও দ্রুত ডেলিভারি।`,
    'ব্লগ': `${name} — বইআলো ব্লগে পড়ুন। বই, সাহিত্য ও পড়ার সংস্কৃতি নিয়ে সেরা কন্টেন্ট।`,
    'প্রোডাক্ট': `${name} কিনুন বইআলো থেকে। সেরা মূল্য, দ্রুত ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।`,
  };
  const desc = templates[type] || `${name} — বইআলো থেকে কিনুন।`;
  return desc.substring(0, 160);
};

// ─── Inline Fixer Component ───
export const SEOInlineFixer = ({ items, productsRaw, blogPostsRaw, categoriesRaw, universalProductsRaw }: {
  items: AuditItem[];
  productsRaw: any[];
  blogPostsRaw: any[];
  categoriesRaw: any[];
  universalProductsRaw: any[];
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [filterScore, setFilterScore] = useState<'all' | 'bad' | 'warning' | 'good'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score-asc' | 'score-desc' | 'name'>('score-asc');
  const [keywordInput, setKeywordInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  // Enrich items with raw data
  const enrichedItems = useMemo(() => {
    return items.map(item => {
      let raw: any = null;
      let table = '';
      if (item.type === 'বই') {
        raw = productsRaw.find((p: any) => p.id === item.id);
        table = 'products';
      } else if (item.type === 'ব্লগ') {
        raw = blogPostsRaw.find((b: any) => b.id === item.id);
        table = 'blog_posts';
      } else if (item.type === 'ক্যাটাগরি') {
        raw = categoriesRaw.find((c: any) => c.id === item.id);
        table = 'categories';
      } else if (item.type === 'প্রোডাক্ট') {
        raw = universalProductsRaw.find((u: any) => u.id === item.id);
        table = 'universal_products';
      }
      return {
        ...item,
        table,
        meta_title: raw?.meta_title || '',
        meta_description: raw?.meta_description || '',
        meta_keywords: raw?.meta_keywords || '',
        description: raw?.description || raw?.description_bn || raw?.excerpt_bn || '',
        image: raw?.image_url || raw?.featured_image || '',
      };
    });
  }, [items, productsRaw, blogPostsRaw, categoriesRaw, universalProductsRaw]);

  // Filtered & sorted
  const filteredItems = useMemo(() => {
    let result = enrichedItems;
    if (filterScore === 'bad') result = result.filter(i => i.score < 50);
    else if (filterScore === 'warning') result = result.filter(i => i.score >= 50 && i.score < 80);
    else if (filterScore === 'good') result = result.filter(i => i.score >= 80);
    if (filterType !== 'all') result = result.filter(i => i.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.slug.includes(q));
    }
    if (sortBy === 'score-asc') result = [...result].sort((a, b) => a.score - b.score);
    else if (sortBy === 'score-desc') result = [...result].sort((a, b) => b.score - a.score);
    else result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [enrichedItems, filterScore, filterType, searchQuery, sortBy]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ table, id, values }: { table: string; id: string; values: any }) => {
      const { error } = await supabase.from(table as any).update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-products-audit'] });
      queryClient.invalidateQueries({ queryKey: ['seo-blog-audit'] });
      queryClient.invalidateQueries({ queryKey: ['seo-categories-audit'] });
      queryClient.invalidateQueries({ queryKey: ['seo-universal-audit'] });
      toast({ title: '✅ SEO ডেটা সেভ হয়েছে!' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const handleExpand = (item: AuditItem & { table: string; meta_title?: string; meta_description?: string; meta_keywords?: string }) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setEditValues({
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
    });
    setKeywordInput('');
    setShowSuggestions(null);
  };

  const handleAutoGenerate = (item: any) => {
    const title = autoGenerateMetaTitle(item.name, item.type);
    const desc = autoGenerateMetaDesc(item.name, item.type, item.description);
    setEditValues(prev => ({
      ...prev,
      meta_title: prev.meta_title || title,
      meta_description: prev.meta_description || desc,
    }));
    toast({ title: '✨ অটো-জেনারেট সম্পন্ন' });
  };

  const handleAddKeyword = (keyword: string) => {
    const current = editValues.meta_keywords ? editValues.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
    if (!current.includes(keyword.trim())) {
      current.push(keyword.trim());
      setEditValues(prev => ({ ...prev, meta_keywords: current.join(', ') }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    const current = editValues.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    const updated = current.filter((k: string) => k !== keyword);
    setEditValues(prev => ({ ...prev, meta_keywords: updated.join(', ') }));
  };

  const handleSave = (item: any) => {
    const updateData: any = {};
    if (item.table === 'products' || item.table === 'universal_products') {
      updateData.meta_title = editValues.meta_title;
      updateData.meta_description = editValues.meta_description;
      updateData.meta_keywords = editValues.meta_keywords;
    } else if (item.table === 'blog_posts') {
      updateData.meta_title = editValues.meta_title;
      updateData.meta_description = editValues.meta_description;
    } else if (item.table === 'categories') {
      updateData.meta_title = editValues.meta_title;
      updateData.meta_description = editValues.meta_description;
    }
    saveMutation.mutate({ table: item.table, id: item.id, values: updateData });
  };

  const getScoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const getScoreBorder = (score: number) => score >= 80 ? 'border-green-200' : score >= 50 ? 'border-yellow-200' : 'border-red-200';

  const types = [...new Set(enrichedItems.map(i => i.type))];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="নাম বা স্লাগ দিয়ে খুঁজুন..." className="pl-9"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterScore} onValueChange={(v: any) => setFilterScore(v)}>
              <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্কোর</SelectItem>
                <SelectItem value="bad">🔴 দুর্বল (&lt;50)</SelectItem>
                <SelectItem value="warning">🟡 মাঝামাঝি (50-79)</SelectItem>
                <SelectItem value="good">🟢 ভালো (80+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px]"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score-asc">স্কোর (কম → বেশি)</SelectItem>
                <SelectItem value="score-desc">স্কোর (বেশি → কম)</SelectItem>
                <SelectItem value="name">নাম অনুসারে</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filteredItems.length}টি আইটেম</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="space-y-2 max-h-[700px] overflow-y-auto">
        {filteredItems.map(item => {
          const isExpanded = expandedId === item.id;
          const currentKeywords = isExpanded
            ? (editValues.meta_keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean)
            : (item.meta_keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean);
          const suggestions = isExpanded ? generateKeywordSuggestions(item.name, item.type, currentKeywords) : [];
          const errorCount = item.issues.filter(i => i.type === 'error').length;
          const warningCount = item.issues.filter(i => i.type === 'warning').length;

          return (
            <div key={`${item.type}-${item.id}`}
              className={`border rounded-lg transition-all ${getScoreBorder(item.score)} ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
              {/* Header Row */}
              <div className="p-3 cursor-pointer flex items-center justify-between gap-3"
                onClick={() => handleExpand(item)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Score badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                    item.score >= 80 ? 'border-green-400 bg-green-50 text-green-700' :
                    item.score >= 50 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                    'border-red-400 bg-red-50 text-red-700'
                  }`}>
                    {item.score}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">/{item.slug}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {errorCount > 0 && <Badge variant="destructive" className="text-xs">{errorCount} ত্রুটি</Badge>}
                  {warningCount > 0 && <Badge className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{warningCount} সতর্কতা</Badge>}
                  {item.score >= 80 && <Badge className="text-xs bg-green-100 text-green-800">✅ ভালো</Badge>}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Expanded Editor */}
              {isExpanded && (
                <div className="px-3 pb-4 border-t space-y-4">
                  {/* Issues Summary */}
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.issues.map((issue, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                        issue.type === 'error' ? 'bg-red-50' : issue.type === 'warning' ? 'bg-yellow-50' : 'bg-green-50'
                      }`}>
                        {issue.type === 'good' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                        {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                        {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>

                  {/* Auto Generate Button */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAutoGenerate(item)}>
                      <Wand2 className="h-4 w-4 mr-1" /> অটো-জেনারেট মেটা
                    </Button>
                    <span className="text-xs text-muted-foreground">খালি ফিল্ডগুলো স্বয়ংক্রিয়ভাবে পূরণ হবে</span>
                  </div>

                  {/* Editable Fields */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs flex items-center justify-between">
                        মেটা টাইটেল
                        <span className={`${(editValues.meta_title?.length || 0) > 60 ? 'text-red-500' : (editValues.meta_title?.length || 0) >= 30 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {editValues.meta_title?.length || 0}/৬০
                        </span>
                      </Label>
                      <Input value={editValues.meta_title || ''}
                        onChange={e => setEditValues(p => ({ ...p, meta_title: e.target.value }))}
                        placeholder={item.name} />
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(editValues.meta_title?.length || 0) <= 60 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(((editValues.meta_title?.length || 0) / 60) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs flex items-center justify-between">
                        মেটা বর্ণনা
                        <span className={`${(editValues.meta_description?.length || 0) > 160 ? 'text-red-500' : (editValues.meta_description?.length || 0) >= 120 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {editValues.meta_description?.length || 0}/১৬০
                        </span>
                      </Label>
                      <Textarea value={editValues.meta_description || ''} rows={3}
                        onChange={e => setEditValues(p => ({ ...p, meta_description: e.target.value }))}
                        placeholder="মেটা বর্ণনা লিখুন..." />
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(editValues.meta_description?.length || 0) <= 160 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(((editValues.meta_description?.length || 0) / 160) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Keywords Section */}
                  <div>
                    <Label className="text-xs flex items-center gap-1 mb-2">
                      <Sparkles className="h-3.5 w-3.5" /> কীওয়ার্ড ম্যানেজার
                    </Label>

                    {/* Current Keywords */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {currentKeywords.map((kw, i) => (
                        <Badge key={i} variant="default" className="text-xs gap-1 pr-1">
                          {kw}
                          <button onClick={() => handleRemoveKeyword(kw)} className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {currentKeywords.length === 0 && (
                        <span className="text-xs text-muted-foreground">কোনো কীওয়ার্ড নেই — নিচে থেকে যোগ করুন</span>
                      )}
                    </div>

                    {/* Add Keyword Input */}
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="নতুন কীওয়ার্ড লিখুন..." className="flex-1" value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && keywordInput.trim()) { handleAddKeyword(keywordInput); } }} />
                      <Button size="sm" variant="outline" onClick={() => keywordInput.trim() && handleAddKeyword(keywordInput)}
                        disabled={!keywordInput.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> যোগ
                      </Button>
                    </div>

                    {/* Keyword Suggestions */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">💡 সাজেস্টেড কীওয়ার্ড (ক্লিক করে যোগ করুন)</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs"
                          onClick={() => setShowSuggestions(showSuggestions === item.id ? null : item.id)}>
                          {showSuggestions === item.id ? 'লুকান' : 'দেখান'}
                        </Button>
                      </div>
                      {(showSuggestions === item.id || suggestions.length <= 8) && (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((kw, i) => (
                            <Badge key={i} variant="outline"
                              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleAddKeyword(kw)}>
                              <Plus className="h-3 w-3 mr-0.5" /> {kw}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Google Preview */}
                  <div>
                    <Label className="text-xs flex items-center gap-1 mb-1.5"><Eye className="h-3.5 w-3.5" /> Google সার্চ প্রিভিউ</Label>
                    <div className="bg-card border rounded-lg p-3 space-y-0.5 max-w-[550px]">
                      <p className="text-xs text-muted-foreground truncate">https://boialo.com/{item.slug}</p>
                      <h3 className="text-[#1a0dab] text-base font-medium leading-tight truncate hover:underline">
                        {editValues.meta_title || item.name || 'টাইটেল'}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {editValues.meta_description || 'মেটা বর্ণনা এখানে দেখাবে...'}
                      </p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <Button onClick={() => handleSave(item)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      সেভ করুন
                    </Button>
                    <Button variant="outline" onClick={() => setExpandedId(null)}>বাতিল</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>কোনো আইটেম পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
};

// ─── Keyword Tracking Dashboard ───
export const KeywordTracker = ({ products, blogPosts, categories, universalProducts }: {
  products: any[]; blogPosts: any[]; categories: any[]; universalProducts: any[];
}) => {
  const allKeywords = useMemo(() => {
    const kwMap = new Map<string, { count: number; pages: string[] }>();

    const processItem = (item: any, name: string) => {
      const keywords = (item.meta_keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean);
      keywords.forEach((kw: string) => {
        const lower = kw.toLowerCase();
        if (!kwMap.has(lower)) kwMap.set(lower, { count: 0, pages: [] });
        const entry = kwMap.get(lower)!;
        entry.count++;
        entry.pages.push(name);
      });
    };

    products.forEach((p: any) => processItem(p, p.title || p.title_bn));
    blogPosts.forEach((b: any) => processItem(b, b.title_bn));
    universalProducts.forEach((u: any) => processItem(u, u.name_bn));

    return Array.from(kwMap.entries())
      .map(([keyword, data]) => ({ keyword, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [products, blogPosts, universalProducts]);

  const totalPages = products.length + blogPosts.length + categories.length + universalProducts.length;
  const pagesWithKeywords = [...products, ...universalProducts].filter((p: any) => p.meta_keywords).length;
  const pagesWithoutKeywords = totalPages - pagesWithKeywords;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 কীওয়ার্ড পরিসংখ্যান</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>মোট ইউনিক কীওয়ার্ড</span>
            <Badge>{allKeywords.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600">কীওয়ার্ড সহ পেজ</span>
            <Badge variant="outline" className="text-green-600">{pagesWithKeywords}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-600">কীওয়ার্ড ছাড়া পেজ</span>
            <Badge variant="outline" className="text-red-600">{pagesWithoutKeywords}</Badge>
          </div>
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground">কীওয়ার্ড কভারেজ</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${totalPages > 0 ? (pagesWithKeywords / totalPages) * 100 : 0}%` }} />
              </div>
              <span className="text-sm font-medium">{totalPages > 0 ? Math.round((pagesWithKeywords / totalPages) * 100) : 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Used Keywords */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">🏷️ সবচেয়ে বেশি ব্যবহৃত কীওয়ার্ড</CardTitle>
          <CardDescription>কোন কীওয়ার্ড কতগুলো পেজে ব্যবহৃত হয়েছে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">কোনো কীওয়ার্ড পাওয়া যায়নি। অডিট ট্যাব থেকে কীওয়ার্ড যোগ করুন।</p>
            ) : (
              allKeywords.slice(0, 30).map((item, i) => (
                <div key={i} className="flex items-center gap-3 border-b pb-2 last:border-0">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                  <Badge variant="outline" className="text-xs">{item.keyword}</Badge>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((item.count / (allKeywords[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.count}টি পেজ</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cannibalization Warning */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            কীওয়ার্ড ক্যানিবালাইজেশন সতর্কতা
          </CardTitle>
          <CardDescription>একই কীওয়ার্ড একাধিক পেজে ব্যবহার হলে তারা পরস্পরের সাথে প্রতিযোগিতা করে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {allKeywords.filter(k => k.count > 2).length === 0 ? (
              <p className="text-sm text-green-600">✅ কোনো ক্যানিবালাইজেশন সমস্যা নেই</p>
            ) : (
              allKeywords.filter(k => k.count > 2).map((item, i) => (
                <div key={i} className="border rounded-lg p-3 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="destructive" className="text-xs">{item.count}টি পেজ</Badge>
                    <span className="font-medium text-sm">"{item.keyword}"</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.pages.slice(0, 5).map((p, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                    {item.pages.length > 5 && <Badge variant="outline" className="text-xs">+{item.pages.length - 5} আরও</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
