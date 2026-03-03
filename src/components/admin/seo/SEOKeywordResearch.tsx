import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search, TrendingUp, Target, Loader2, Copy, Globe, BarChart3,
  Lightbulb, ArrowRight, Zap, Star, RefreshCw, ChevronDown, ChevronUp
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
          {/* Competitor Keywords */}
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

          {/* Keyword Gaps */}
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

          {/* Content Ideas */}
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

          {/* Ranking Tips */}
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

// ─── Trending Keywords ───
export const TrendingKeywords = () => {
  const { toast } = useToast();
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> ট্রেন্ডিং কীওয়ার্ড (Google Trends স্টাইল)</CardTitle>
          <CardDescription>প্রতিদিনের জনপ্রিয় সার্চ কীওয়ার্ড ও ট্রেন্ড বিশ্লেষণ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
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
              </SelectContent>
            </Select>
            <Button onClick={fetchTrends} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              ট্রেন্ড দেখুন
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Trends */}
          {result.daily_trends?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📈 আজকের ট্রেন্ড</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {result.daily_trends.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.keyword_bn || t.keyword}</p>
                          {t.category && <span className="text-xs text-muted-foreground">{t.category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-xs ${t.trend === 'rising' ? 'border-green-300 text-green-600' : t.trend === 'stable' ? 'border-blue-300 text-blue-600' : 'border-red-300 text-red-600'}`}>
                          {t.trend === 'rising' ? '📈' : t.trend === 'stable' ? '➡️' : '📉'} {t.volume === 'high' ? 'উচ্চ' : t.volume === 'medium' ? 'মাঝারি' : 'কম'}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(t.keyword_bn || t.keyword)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Google Trends Equivalent */}
          {result.google_trends_equivalent?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> সার্চ ইন্টারেস্ট</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {result.google_trends_equivalent.map((t: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.keyword_bn || t.keyword}</span>
                        <span className="text-xs font-bold text-primary">{t.search_interest}/100</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${t.search_interest}%` }} />
                      </div>
                      {t.related_queries?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.related_queries.slice(0, 3).map((q: string, j: number) => (
                            <Badge key={j} variant="secondary" className="text-xs cursor-pointer" onClick={() => copyKeyword(q)}>{q}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seasonal Keywords */}
          {result.seasonal_keywords?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">🗓️ সিজনাল কীওয়ার্ড</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {result.seasonal_keywords.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{s.keyword_bn || s.keyword}</p>
                        <p className="text-xs text-muted-foreground">পিক: {s.peak_months} | সিজন: {s.season}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyKeyword(s.keyword_bn || s.keyword)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emerging Topics */}
          {result.emerging_topics?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">🚀 ইমার্জিং টপিক</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {result.emerging_topics.map((topic: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm">{topic.topic_bn || topic.topic}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{topic.relevance}</p>
                      {topic.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords.map((kw: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => copyKeyword(kw)}>{kw}</Badge>
                          ))}
                        </div>
                      )}
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
          {/* Primary Keywords */}
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

          {/* Long Tail Keywords */}
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

          {/* LSI Keywords */}
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

          {/* Meta Suggestions */}
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

          {/* Secondary Keywords */}
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
              name: p.name,
              type: p.type,
              score: p.score,
              slug: p.slug,
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
          {/* Quick Wins */}
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

          {/* Page Recommendations */}
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

          {/* Site-wide Recommendations */}
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
