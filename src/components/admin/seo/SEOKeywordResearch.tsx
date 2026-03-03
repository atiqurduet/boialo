import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search, TrendingUp, Target, Loader2, Copy, Globe, BarChart3,
  Lightbulb, ArrowRight, Zap, Star, RefreshCw, ChevronDown, ChevronUp,
  Download, Filter, Bookmark, BookmarkCheck, ArrowUpDown, Eye, Hash, Flame, Clock
} from 'lucide-react';

// ─── Competitor Analyzer ───
export const CompetitorAnalyzer = () => {
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState('rokomari.com, wafilife.com');
  const [niche, setNiche] = useState('Online bookstore, lifestyle products, Islamic books');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('competitor_keywords');

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          type: 'competitor_analysis',
          data: {
            competitors: competitors.split(',').map(c => c.trim()),
            siteUrl: 'boialo.com',
            niche,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast({ title: '✅ বিশ্লেষণ সম্পন্ন!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    toast({ title: 'কপি হয়েছে', description: kw });
  };

  const getDiffColor = (d: string) => d === 'easy' ? 'bg-green-100 text-green-800' : d === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  const getVolColor = (v: string) => v === 'high' ? 'text-green-600' : v === 'medium' ? 'text-yellow-600' : 'text-muted-foreground';
  const getPriorityColor = (p: string) => p === 'high' ? 'bg-red-100 text-red-800' : p === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-5 w-5" /> প্রতিযোগী বিশ্লেষণ</CardTitle>
          <CardDescription>rokomari.com, wafilife.com ও অন্যান্য প্রতিযোগীদের কীওয়ার্ড অ্যানালাইসিস</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input placeholder="প্রতিযোগী সাইট (কমা দিয়ে)" value={competitors}
                onChange={e => setCompetitors(e.target.value)} />
            </div>
            <Button onClick={analyze} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              বিশ্লেষণ করুন
            </Button>
          </div>
          <Input placeholder="নিশ/ক্যাটাগরি (যেমন: bookstore, islamic books)" value={niche}
            onChange={e => setNiche(e.target.value)} />
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {result.competitor_keywords?.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'competitor_keywords' ? null : 'competitor_keywords')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" /> প্রতিযোগীদের টপ কীওয়ার্ড ({result.competitor_keywords.length})
                  </CardTitle>
                  {expandedSection === 'competitor_keywords' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedSection === 'competitor_keywords' && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>কীওয়ার্ড</TableHead>
                          <TableHead>বাংলা</TableHead>
                          <TableHead>ভলিউম</TableHead>
                          <TableHead>ডিফিকাল্টি</TableHead>
                          <TableHead>প্রতিযোগী</TableHead>
                          <TableHead>অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.competitor_keywords.map((kw: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{kw.keyword}</TableCell>
                            <TableCell className="text-sm">{kw.keyword_bn}</TableCell>
                            <TableCell><span className={`text-xs font-medium ${getVolColor(kw.volume)}`}>{kw.volume === 'high' ? '🔥 উচ্চ' : kw.volume === 'medium' ? '📊 মাঝারি' : '📉 কম'}</span></TableCell>
                            <TableCell><Badge className={`text-xs ${getDiffColor(kw.difficulty)}`}>{kw.difficulty === 'easy' ? 'সহজ' : kw.difficulty === 'medium' ? 'মাঝারি' : 'কঠিন'}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{kw.competitor}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => copyKeyword(kw.keyword_bn || kw.keyword)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {result.keyword_gaps?.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'gaps' ? null : 'gaps')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" /> কীওয়ার্ড গ্যাপ — আপনি মিস করছেন ({result.keyword_gaps.length})
                  </CardTitle>
                  {expandedSection === 'gaps' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedSection === 'gaps' && (
                <CardContent>
                  <div className="space-y-2">
                    {result.keyword_gaps.map((gap: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{gap.keyword_bn || gap.keyword}</span>
                            <Badge className={`text-xs ${getPriorityColor(gap.priority)}`}>{gap.priority === 'high' ? '🔴 উচ্চ' : gap.priority === 'medium' ? '🟡 মাঝারি' : '🔵 নিম্ন'}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{gap.opportunity}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyKeyword(gap.keyword_bn || gap.keyword)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {result.content_ideas?.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'content' ? null : 'content')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" /> কন্টেন্ট আইডিয়া ({result.content_ideas.length})
                  </CardTitle>
                  {expandedSection === 'content' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedSection === 'content' && (
                <CardContent>
                  <div className="space-y-2">
                    {result.content_ideas.map((idea: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{idea.type}</Badge>
                          <span className="font-medium text-sm">{idea.title_bn}</span>
                        </div>
                        {idea.title_en && <p className="text-xs text-muted-foreground">{idea.title_en}</p>}
                        <p className="text-xs text-primary mt-1">টার্গেট: {idea.target_keyword}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {result.ranking_tips?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> র‍্যাঙ্কিং টিপস</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.ranking_tips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted rounded-lg">
                      <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Trending Keywords (Advanced) ───
export const TrendingKeywords = () => {
  const { toast } = useToast();
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [savedKeywords, setSavedKeywords] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('seo_saved_keywords') || '[]'); } catch { return []; }
  });
  const [sortBy, setSortBy] = useState<'default' | 'volume' | 'trend'>('default');
  const [activeSubTab, setActiveSubTab] = useState('daily');
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const [history, setHistory] = useState<{ date: string; category: string; count: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('seo_trend_history') || '[]'); } catch { return []; }
  });

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          type: 'trending_keywords',
          data: { category, date: new Date().toISOString().split('T')[0] },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const hasTrendData =
        Array.isArray(data?.daily_trends) ||
        Array.isArray(data?.seasonal_keywords) ||
        Array.isArray(data?.emerging_topics) ||
        Array.isArray(data?.google_trends_equivalent);

      if (!hasTrendData) {
        throw new Error('ট্রেন্ড ডেটা পাওয়া যায়নি, আবার চেষ্টা করুন');
      }

      setResult(data);
      const newEntry = { date: new Date().toISOString(), category, count: data?.daily_trends?.length || 0 };
      const updatedHistory = [newEntry, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('seo_trend_history', JSON.stringify(updatedHistory));
      toast({ title: '✅ ট্রেন্ড লোড হয়েছে!' });
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    toast({ title: 'কপি হয়েছে', description: kw });
  };

  const toggleSave = useCallback((kw: string) => {
    setSavedKeywords(prev => {
      const updated = prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw];
      localStorage.setItem('seo_saved_keywords', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exportCSV = useCallback(() => {
    if (!result) return;
    const rows = [['কীওয়ার্ড', 'বাংলা', 'ট্রেন্ড', 'ভলিউম', 'ক্যাটাগরি']];
    (result.daily_trends || []).forEach((t: any) => {
      rows.push([t.keyword, t.keyword_bn || '', t.trend || '', t.volume || '', t.category || '']);
    });
    (result.google_trends_equivalent || []).forEach((t: any) => {
      rows.push([t.keyword, t.keyword_bn || '', `interest:${t.search_interest}`, '', '']);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `trending-keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: '📥 CSV ডাউনলোড হয়েছে!' });
  }, [result, toast]);

  const exportAllSaved = useCallback(() => {
    if (savedKeywords.length === 0) return;
    navigator.clipboard.writeText(savedKeywords.join(', '));
    toast({ title: `${savedKeywords.length}টি সেভ করা কীওয়ার্ড কপি হয়েছে` });
  }, [savedKeywords, toast]);

  const filteredDailyTrends = useMemo(() => {
    if (!result?.daily_trends) return [];
    let items = [...result.daily_trends];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      items = items.filter((t: any) =>
        (t.keyword || '').toLowerCase().includes(q) ||
        (t.keyword_bn || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    if (showOnlySaved) {
      items = items.filter((t: any) => savedKeywords.includes(t.keyword_bn || t.keyword));
    }
    if (sortBy === 'volume') {
      const volOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      items.sort((a: any, b: any) => (volOrder[b.volume] || 0) - (volOrder[a.volume] || 0));
    } else if (sortBy === 'trend') {
      const trendOrder: Record<string, number> = { rising: 3, stable: 2, declining: 1 };
      items.sort((a: any, b: any) => (trendOrder[b.trend] || 0) - (trendOrder[a.trend] || 0));
    }
    return items;
  }, [result, searchFilter, sortBy, showOnlySaved, savedKeywords]);

  const filteredGoogleTrends = useMemo(() => {
    if (!result?.google_trends_equivalent) return [];
    let items = [...result.google_trends_equivalent];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      items = items.filter((t: any) =>
        (t.keyword || '').toLowerCase().includes(q) ||
        (t.keyword_bn || '').toLowerCase().includes(q)
      );
    }
    items.sort((a: any, b: any) => (b.search_interest || 0) - (a.search_interest || 0));
    return items;
  }, [result, searchFilter]);

  const stats = useMemo(() => {
    if (!result?.daily_trends) return null;
    const trends = result.daily_trends;
    const rising = trends.filter((t: any) => t.trend === 'rising').length;
    const highVol = trends.filter((t: any) => t.volume === 'high').length;
    const categories = [...new Set(trends.map((t: any) => t.category).filter(Boolean))];
    return { total: trends.length, rising, highVol, categories: categories.length };
  }, [result]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            ট্রেন্ডিং কীওয়ার্ড রিসার্চ
          </CardTitle>
          <CardDescription>Google Trends স্টাইল ডেটা — সার্চ ট্রেন্ড, সিজনাল কীওয়ার্ড, ইমার্জিং টপিক</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                <SelectItem value="books">📚 বই</SelectItem>
                <SelectItem value="islamic">🕌 ইসলামি</SelectItem>
                <SelectItem value="lifestyle">🛍️ লাইফস্টাইল</SelectItem>
                <SelectItem value="stationery">✏️ স্টেশনারি</SelectItem>
                <SelectItem value="food">🍔 খাবার</SelectItem>
                <SelectItem value="academic">🎓 একাডেমিক</SelectItem>
                <SelectItem value="electronics">📱 ইলেকট্রনিক্স</SelectItem>
                <SelectItem value="health">💊 স্বাস্থ্য</SelectItem>
                <SelectItem value="fashion">👗 ফ্যাশন</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchTrends} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              ট্রেন্ড দেখুন
            </Button>
            {result && (
              <>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" /> CSV এক্সপোর্ট
                </Button>
                {savedKeywords.length > 0 && (
                  <Button variant="outline" onClick={exportAllSaved}>
                    <BookmarkCheck className="h-4 w-4 mr-2" /> সেভ করা ({savedKeywords.length}) কপি
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3 text-center">
            <Hash className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">মোট কীওয়ার্ড</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-2xl font-bold text-orange-600">{stats.rising}</p>
            <p className="text-xs text-muted-foreground">রাইজিং ট্রেন্ড</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.highVol}</p>
            <p className="text-xs text-muted-foreground">উচ্চ ভলিউম</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-blue-600">{stats.categories}</p>
            <p className="text-xs text-muted-foreground">ক্যাটাগরি</p>
          </CardContent></Card>
        </div>
      )}

      {result && (
        <>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="কীওয়ার্ড খুঁজুন..." value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[160px]">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">ডিফল্ট সর্ট</SelectItem>
                    <SelectItem value="volume">ভলিউম অনুসারে</SelectItem>
                    <SelectItem value="trend">ট্রেন্ড অনুসারে</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch checked={showOnlySaved} onCheckedChange={setShowOnlySaved} id="show-saved" />
                  <label htmlFor="show-saved" className="text-sm cursor-pointer">শুধু সেভ করা</label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="w-full justify-start flex-wrap h-auto">
              <TabsTrigger value="daily" className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> আজকের ট্রেন্ড ({filteredDailyTrends.length})
              </TabsTrigger>
              <TabsTrigger value="google" className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> সার্চ ইন্টারেস্ট ({filteredGoogleTrends.length})
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> সিজনাল ({result.seasonal_keywords?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="emerging" className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" /> ইমার্জিং ({result.emerging_topics?.length || 0})
              </TabsTrigger>
              {savedKeywords.length > 0 && (
                <TabsTrigger value="saved" className="flex items-center gap-1">
                  <Bookmark className="h-3.5 w-3.5" /> সেভ করা ({savedKeywords.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Daily Trends Table */}
            <TabsContent value="daily">
              {filteredDailyTrends.length > 0 ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>কীওয়ার্ড</TableHead>
                            <TableHead>ইংরেজি</TableHead>
                            <TableHead>ক্যাটাগরি</TableHead>
                            <TableHead>ট্রেন্ড</TableHead>
                            <TableHead>ভলিউম</TableHead>
                            <TableHead className="text-right">অ্যাকশন</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDailyTrends.map((t: any, i: number) => {
                            const kw = t.keyword_bn || t.keyword;
                            const isSaved = savedKeywords.includes(kw);
                            return (
                              <TableRow key={i} className={isSaved ? 'bg-primary/5' : ''}>
                                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                <TableCell className="font-medium text-sm">{t.keyword_bn || '—'}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{t.keyword}</TableCell>
                                <TableCell>{t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-xs ${
                                    t.trend === 'rising' ? 'border-green-300 text-green-700 bg-green-50' :
                                    t.trend === 'stable' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                    'border-red-300 text-red-700 bg-red-50'
                                  }`}>
                                    {t.trend === 'rising' ? '📈 রাইজিং' : t.trend === 'stable' ? '➡️ স্থিতিশীল' : '📉 ক্ষয়িষ্ণু'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs ${
                                    t.volume === 'high' ? 'bg-green-100 text-green-800' :
                                    t.volume === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {t.volume === 'high' ? '🔥 উচ্চ' : t.volume === 'medium' ? '📊 মাঝারি' : '📉 কম'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleSave(kw)}>
                                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(kw)}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">কোনো ট্রেন্ড পাওয়া যায়নি</CardContent></Card>
              )}
            </TabsContent>

            {/* Google Trends Interest */}
            <TabsContent value="google">
              {filteredGoogleTrends.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Google সার্চ ইন্টারেস্ট (0-100)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredGoogleTrends.map((t: any, i: number) => {
                        const kw = t.keyword_bn || t.keyword;
                        const isSaved = savedKeywords.includes(kw);
                        const interest = t.search_interest || 0;
                        return (
                          <div key={i} className="space-y-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}</span>
                                <span className="font-medium text-sm">{kw}</span>
                                {t.keyword_bn && t.keyword !== t.keyword_bn && (
                                  <span className="text-xs text-muted-foreground">({t.keyword})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  interest >= 80 ? 'text-green-600' : interest >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>{interest}</span>
                                <span className="text-xs text-muted-foreground">/100</span>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleSave(kw)}>
                                  {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(kw)}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${
                                interest >= 80 ? 'bg-green-500' : interest >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                              }`} style={{ width: `${interest}%` }} />
                            </div>
                            {t.related_queries?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-xs text-muted-foreground mr-1">সম্পর্কিত:</span>
                                {t.related_queries.map((q: string, j: number) => (
                                  <Badge key={j} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => copyKeyword(q)}>{q}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">Google ট্রেন্ড ডেটা নেই</CardContent></Card>
              )}
            </TabsContent>

            {/* Seasonal */}
            <TabsContent value="seasonal">
              {result.seasonal_keywords?.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🗓️ সিজনাল কীওয়ার্ড — সময়মতো ব্যবহার করুন</CardTitle>
                    <CardDescription>নির্দিষ্ট সময়ে সবচেয়ে বেশি সার্চ হয়</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>কীওয়ার্ড</TableHead>
                            <TableHead>ইংরেজি</TableHead>
                            <TableHead>সিজন</TableHead>
                            <TableHead>পিক সময়</TableHead>
                            <TableHead className="text-right">অ্যাকশন</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.seasonal_keywords.map((s: any, i: number) => {
                            const kw = s.keyword_bn || s.keyword;
                            return (
                              <TableRow key={i}>
                                <TableCell className="font-medium text-sm">{s.keyword_bn || '—'}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{s.keyword}</TableCell>
                                <TableCell><Badge variant="secondary" className="text-xs">{s.season}</Badge></TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">📅 {s.peak_months}</Badge></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleSave(kw)}>
                                      {savedKeywords.includes(kw) ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(kw)}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">সিজনাল ডেটা নেই</CardContent></Card>
              )}
            </TabsContent>

            {/* Emerging Topics */}
            <TabsContent value="emerging">
              {result.emerging_topics?.length > 0 ? (
                <div className="space-y-3">
                  {result.emerging_topics.map((topic: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <h4 className="font-semibold text-sm">{topic.topic_bn || topic.topic}</h4>
                              {topic.topic_bn && topic.topic !== topic.topic_bn && (
                                <span className="text-xs text-muted-foreground">({topic.topic})</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{topic.relevance}</p>
                            {topic.keywords?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-xs text-muted-foreground">কীওয়ার্ড:</span>
                                {topic.keywords.map((kw: string, j: number) => (
                                  <Badge key={j} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => copyKeyword(kw)}>{kw}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => toggleSave(topic.topic_bn || topic.topic)}>
                            {savedKeywords.includes(topic.topic_bn || topic.topic)
                              ? <BookmarkCheck className="h-4 w-4 text-primary" />
                              : <Bookmark className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">ইমার্জিং টপিক নেই</CardContent></Card>
              )}
            </TabsContent>

            {/* Saved Keywords */}
            <TabsContent value="saved">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookmarkCheck className="h-5 w-5 text-primary" /> সেভ করা কীওয়ার্ড ({savedKeywords.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportAllSaved}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> সব কপি
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSavedKeywords([]);
                        localStorage.removeItem('seo_saved_keywords');
                        toast({ title: 'সব সেভ মুছে ফেলা হয়েছে' });
                      }}>সব মুছুন</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {savedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {savedKeywords.map((kw, i) => (
                        <Badge key={i} variant="default" className="text-sm py-1.5 px-3 cursor-pointer gap-1.5" onClick={() => toggleSave(kw)}>
                          {kw} <span className="text-xs opacity-70">✕</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">কোনো কীওয়ার্ড সেভ করা হয়নি। ⭐ আইকনে ক্লিক করে সেভ করুন।</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {history.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> সার্চ হিস্ট্রি</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 10).map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {h.category === 'all' ? 'সব' : h.category} — {new Date(h.date).toLocaleDateString('bn-BD')} ({h.count}টি)
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ─── AI Keyword Suggestions for specific page ───
export const AIKeywordSuggester = () => {
  const { toast } = useToast();
  const [pageTitle, setPageTitle] = useState('');
  const [pageType, setPageType] = useState('book');
  const [existingKw, setExistingKw] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const suggest = async () => {
    if (!pageTitle.trim()) return toast({ title: 'পেজের নাম লিখুন', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          type: 'keyword_suggestions',
          data: { page_title: pageTitle, page_type: pageType, existing_keywords: existingKw, description },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast({ title: '✅ কীওয়ার্ড সাজেশন প্রস্তুত!' });
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    toast({ title: 'কপি হয়েছে', description: kw });
  };

  const copyAll = (keywords: any[], field: string) => {
    const all = keywords.map(k => k[field] || k.keyword).join(', ');
    navigator.clipboard.writeText(all);
    toast({ title: 'সব কপি হয়েছে' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> AI কীওয়ার্ড সাজেশন</CardTitle>
          <CardDescription>যেকোনো পেজের জন্য AI-পাওয়ার্ড কীওয়ার্ড সাজেশন পান</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="পেজের নাম/টাইটেল" value={pageTitle} onChange={e => setPageTitle(e.target.value)} className="md:col-span-2" />
            <Select value={pageType} onValueChange={setPageType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="book">📚 বই</SelectItem>
                <SelectItem value="category">📁 ক্যাটাগরি</SelectItem>
                <SelectItem value="blog">📝 ব্লগ</SelectItem>
                <SelectItem value="product">🛍️ প্রোডাক্ট</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={suggest} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              সাজেশন পান
            </Button>
          </div>
          <Input placeholder="বিদ্যমান কীওয়ার্ড (ঐচ্ছিক, কমা দিয়ে)" value={existingKw} onChange={e => setExistingKw(e.target.value)} />
          <Input placeholder="সংক্ষিপ্ত বর্ণনা (ঐচ্ছিক)" value={description} onChange={e => setDescription(e.target.value)} />
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {result.primary_keywords?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">🎯 প্রাইমারি কীওয়ার্ড</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyAll(result.primary_keywords, 'keyword_bn')}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> সব কপি
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {result.primary_keywords.map((kw: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{kw.keyword_bn || kw.keyword}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-xs">{kw.search_volume === 'high' ? '🔥' : kw.search_volume === 'medium' ? '📊' : '📉'} {kw.search_volume}</Badge>
                          <Badge className={`text-xs ${kw.difficulty === 'easy' ? 'bg-green-100 text-green-800' : kw.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{kw.difficulty}</Badge>
                          {kw.relevance && <span className="text-xs text-muted-foreground">{kw.relevance}%</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(kw.keyword_bn || kw.keyword)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.long_tail_keywords?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">🔗 লং-টেইল কীওয়ার্ড</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyAll(result.long_tail_keywords, 'keyword_bn')}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> সব কপি
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {result.long_tail_keywords.map((kw: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{kw.keyword_bn || kw.keyword}</p>
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {kw.intent === 'transactional' ? '💰 ক্রয়' : kw.intent === 'informational' ? '📖 তথ্য' : '🔍 নেভিগেশন'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(kw.keyword_bn || kw.keyword)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.lsi_keywords?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">🧠 LSI কীওয়ার্ড (সেমান্টিক)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.lsi_keywords.map((kw: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => copyKeyword(kw.keyword_bn || kw.keyword)} title={kw.context}>
                      {kw.keyword_bn || kw.keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(result.meta_title_suggestions?.length > 0 || result.meta_description_suggestions?.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-base">📝 মেটা সাজেশন</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.meta_title_suggestions?.map((t: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                    <span className="flex-1">{t}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => copyKeyword(t)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {result.meta_description_suggestions?.map((d: string, i: number) => (
                  <div key={`d-${i}`} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-xs">
                    <span className="flex-1">{d}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => copyKeyword(d)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.secondary_keywords?.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">📌 সেকেন্ডারি কীওয়ার্ড</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyAll(result.secondary_keywords, 'keyword_bn')}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> সব কপি
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.secondary_keywords.map((kw: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => copyKeyword(kw.keyword_bn || kw.keyword)}>
                      {kw.keyword_bn || kw.keyword} {kw.relevance ? `(${kw.relevance}%)` : ''}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Site Ranking Analyzer ───
export const SiteRankingAnalyzer = ({ pages }: { pages: any[] }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          type: 'site_ranking_analysis',
          data: {
            pages: pages.slice(0, 20).map(p => ({
              name: p.name, type: p.type, score: p.score, slug: p.slug,
            })),
            site_url: 'boialo.com',
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast({ title: '✅ র‍্যাঙ্কিং বিশ্লেষণ সম্পন্ন!' });
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> সাইট র‍্যাঙ্কিং বিশ্লেষণ</CardTitle>
          <CardDescription>আপনার সাইটের প্রতিটি পেজের র‍্যাঙ্কিং উন্নতির জন্য AI-পাওয়ার্ড সাজেশন</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={analyze} disabled={loading || pages.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            {pages.length} পেজ বিশ্লেষণ করুন
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.quick_wins?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">⚡ Quick Wins — দ্রুত উন্নতি</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.quick_wins.map((qw: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm flex-1">{qw.action}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge className={`text-xs ${qw.impact === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          প্রভাব: {qw.impact === 'high' ? 'উচ্চ' : 'মাঝারি'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          চেষ্টা: {qw.effort === 'easy' ? 'সহজ' : qw.effort === 'medium' ? 'মাঝারি' : 'কঠিন'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.page_recommendations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">📋 পেজ-ভিত্তিক সাজেশন</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {result.page_recommendations.map((rec: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{rec.page}</span>
                        <Badge className={`text-xs ${rec.priority === 'high' ? 'bg-red-100 text-red-800' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                          {rec.priority === 'high' ? '🔴 উচ্চ' : rec.priority === 'medium' ? '🟡 মাঝারি' : '🔵 নিম্ন'}
                        </Badge>
                      </div>
                      {rec.target_keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.target_keywords.map((kw: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      )}
                      {rec.improvements?.length > 0 && (
                        <div className="space-y-1">
                          {rec.improvements.map((imp: string, j: number) => (
                            <div key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.site_wide_recommendations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">🌐 সাইট-ওয়াইড সাজেশন</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.site_wide_recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted rounded-lg">
                      <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
