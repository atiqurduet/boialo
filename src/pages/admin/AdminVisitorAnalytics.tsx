import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, FunnelChart, Funnel, LabelList } from "recharts";
import { Globe, Monitor, Search, Eye, Users, Clock, TrendingUp, Printer, MapPin, Smartphone, Zap, ShoppingCart, CreditCard, MousePointer } from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

const AdminVisitorAnalytics = () => {
  const [days, setDays] = useState("7");
  const since = subDays(new Date(), parseInt(days)).toISOString();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['visitor-analytics', days],
    queryFn: async () => {
      const { data } = await supabase
        .from('visitor_analytics')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      return data || [];
    }
  });

  // Server-side events data
  const { data: serverEvents = [] } = useQuery({
    queryKey: ['server-side-events', days],
    queryFn: async () => {
      const { data } = await supabase
        .from('server_side_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      return (data || []) as any[];
    }
  });

  const totalVisits = analytics.length;
  const uniqueSessions = new Set(analytics.map(a => a.session_id)).size;
  const searchQueries = analytics.filter(a => a.search_query);
  const avgDuration = analytics.length > 0
    ? Math.round(analytics.reduce((s, a) => s + (a.duration_seconds || 0), 0) / analytics.length)
    : 0;
  const bounceRate = analytics.length > 0
    ? Math.round((analytics.filter(a => a.is_bounce).length / analytics.length) * 100)
    : 0;

  // Group by country
  const countryMap: Record<string, number> = {};
  analytics.forEach(a => {
    const c = a.country || 'Unknown';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const countryData = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // Group by page
  const pageMap: Record<string, number> = {};
  analytics.filter(a => !a.search_query).forEach(a => {
    pageMap[a.page_path] = (pageMap[a.page_path] || 0) + 1;
  });
  const pageData = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([page, views]) => ({ page, views }));

  // Group by device
  const deviceMap: Record<string, number> = {};
  analytics.forEach(a => {
    const d = a.device_type || 'unknown';
    deviceMap[d] = (deviceMap[d] || 0) + 1;
  });
  const deviceData = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));

  // Group by browser
  const browserMap: Record<string, number> = {};
  analytics.forEach(a => {
    const b = a.browser || 'unknown';
    browserMap[b] = (browserMap[b] || 0) + 1;
  });
  const browserData = Object.entries(browserMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Group by OS
  const osMap: Record<string, number> = {};
  analytics.forEach(a => {
    const o = a.os || 'unknown';
    osMap[o] = (osMap[o] || 0) + 1;
  });
  const osData = Object.entries(osMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Daily trend
  const dailyMap: Record<string, { visits: number; sessions: Set<string> }> = {};
  analytics.forEach(a => {
    const day = format(new Date(a.created_at), 'MM/dd');
    if (!dailyMap[day]) dailyMap[day] = { visits: 0, sessions: new Set() };
    dailyMap[day].visits++;
    dailyMap[day].sessions.add(a.session_id);
  });
  const dailyData = Object.entries(dailyMap)
    .map(([date, d]) => ({ date, visits: d.visits, visitors: d.sessions.size }))
    .reverse();

  // Search queries
  const searchMap: Record<string, number> = {};
  searchQueries.forEach(a => {
    const q = (a.search_query || '').toLowerCase().trim();
    if (q) searchMap[q] = (searchMap[q] || 0) + 1;
  });
  const searchData = Object.entries(searchMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Referrer
  const refMap: Record<string, number> = {};
  analytics.forEach(a => {
    if (a.referrer) {
      try {
        const host = new URL(a.referrer).hostname;
        refMap[host] = (refMap[host] || 0) + 1;
      } catch {
        refMap[a.referrer] = (refMap[a.referrer] || 0) + 1;
      }
    }
  });
  const refData = Object.entries(refMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, visits]) => ({ source, visits }));

  // UTM data
  const utmMap: Record<string, number> = {};
  analytics.forEach(a => {
    if (a.utm_source) {
      const key = `${a.utm_source}/${a.utm_medium || '-'}/${a.utm_campaign || '-'}`;
      utmMap[key] = (utmMap[key] || 0) + 1;
    }
  });
  const utmData = Object.entries(utmMap)
    .sort((a, b) => b[1] - a[1])
    .map(([campaign, visits]) => ({ campaign, visits }));

  const printReport = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<html><head><title>Visitor Analytics Report</title>
      <style>
        body{font-family:'Hind Siliguri',sans-serif;padding:30px;color:#333}
        h1{text-align:center;margin-bottom:8px}
        .date{text-align:center;color:#666;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        .stat{background:#f9f9f9;padding:16px;border-radius:8px;text-align:center}
        .stat .val{font-size:28px;font-weight:700;color:#e53e3e}
        .stat .lbl{font-size:12px;color:#666}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
        th{background:#f5f5f5}
        h2{margin-top:24px;margin-bottom:8px;font-size:18px}
        @media print{body{padding:15px}}
      </style></head><body>
      <h1>📊 ভিজিটর অ্যানালিটিক্স রিপোর্ট</h1>
      <p class="date">সময়কাল: গত ${days} দিন | তারিখ: ${format(new Date(), 'dd/MM/yyyy')}</p>
      <div class="grid">
        <div class="stat"><div class="val">${totalVisits}</div><div class="lbl">মোট পেজভিউ</div></div>
        <div class="stat"><div class="val">${uniqueSessions}</div><div class="lbl">ইউনিক ভিজিটর</div></div>
        <div class="stat"><div class="val">${avgDuration}s</div><div class="lbl">গড় সময়</div></div>
        <div class="stat"><div class="val">${bounceRate}%</div><div class="lbl">বাউন্স রেট</div></div>
      </div>
      <h2>🌍 দেশ অনুযায়ী ভিজিটর</h2>
      <table><tr><th>দেশ</th><th>ভিজিট</th></tr>
      ${countryData.map(c => `<tr><td>${c.name}</td><td>${c.value}</td></tr>`).join('')}
      </table>
      <h2>📱 ডিভাইস</h2>
      <table><tr><th>ডিভাইস</th><th>ভিজিট</th></tr>
      ${deviceData.map(d => `<tr><td>${d.name}</td><td>${d.value}</td></tr>`).join('')}
      </table>
      <h2>📄 জনপ্রিয় পেজ</h2>
      <table><tr><th>পেজ</th><th>ভিউ</th></tr>
      ${pageData.slice(0, 10).map(p => `<tr><td>${p.page}</td><td>${p.views}</td></tr>`).join('')}
      </table>
      <h2>🔍 সার্চ কোয়েরি</h2>
      <table><tr><th>কোয়েরি</th><th>সংখ্যা</th></tr>
      ${searchData.slice(0, 15).map(s => `<tr><td>${s.query}</td><td>${s.count}</td></tr>`).join('')}
      </table>
      </body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ভিজিটর অ্যানালিটিক্স</h1>
            <p className="text-muted-foreground text-sm">সাইটে কে, কোথা থেকে, কী দেখছে — সব ডেটা এক জায়গায়</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">আজ</SelectItem>
                <SelectItem value="7">৭ দিন</SelectItem>
                <SelectItem value="30">৩০ দিন</SelectItem>
                <SelectItem value="90">৯০ দিন</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={printReport}><Printer className="w-4 h-4 mr-2" /> প্রিন্ট</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Eye, label: 'মোট পেজভিউ', value: totalVisits, color: 'text-primary' },
            { icon: Users, label: 'ইউনিক ভিজিটর', value: uniqueSessions, color: 'text-accent' },
            { icon: Search, label: 'সার্চ কোয়েরি', value: searchQueries.length, color: 'text-orange-500' },
            { icon: Clock, label: 'গড় সময় (সেকেন্ড)', value: avgDuration, color: 'text-purple-500' },
            { icon: TrendingUp, label: 'বাউন্স রেট', value: `${bounceRate}%`, color: 'text-red-500' },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">📈 দৈনিক ভিজিটর ট্রেন্ড</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="পেজভিউ" />
                  <Area type="monotone" dataKey="visitors" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} name="ইউনিক ভিজিটর" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="location" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="funnel"><ShoppingCart className="w-4 h-4 mr-1" /> ফানেল</TabsTrigger>
            <TabsTrigger value="server"><Zap className="w-4 h-4 mr-1" /> সার্ভার ইভেন্ট</TabsTrigger>
            <TabsTrigger value="location"><Globe className="w-4 h-4 mr-1" /> লোকেশন</TabsTrigger>
            <TabsTrigger value="pages"><Eye className="w-4 h-4 mr-1" /> পেজ</TabsTrigger>
            <TabsTrigger value="search"><Search className="w-4 h-4 mr-1" /> সার্চ</TabsTrigger>
            <TabsTrigger value="devices"><Smartphone className="w-4 h-4 mr-1" /> ডিভাইস</TabsTrigger>
            <TabsTrigger value="sources"><TrendingUp className="w-4 h-4 mr-1" /> সোর্স</TabsTrigger>
          </TabsList>

          {/* Conversion Funnel */}
          <TabsContent value="funnel">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">🔄 কনভার্শন ফানেল</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const funnelSteps = [
                      { name: 'পেজভিউ', key: 'PageView' },
                      { name: 'প্রোডাক্ট দেখা', key: 'ViewContent' },
                      { name: 'কার্টে যোগ', key: 'AddToCart' },
                      { name: 'চেকআউট শুরু', key: 'InitiateCheckout' },
                      { name: 'পারচেজ', key: 'Purchase' },
                    ];
                    const funnelData = funnelSteps.map(step => ({
                      name: step.name,
                      value: serverEvents.filter(e => e.event_name === step.key).length || (step.key === 'PageView' ? analytics.length : 0),
                    }));
                    const maxVal = Math.max(...funnelData.map(d => d.value), 1);
                    return (
                      <div className="space-y-3">
                        {funnelData.map((step, i) => {
                          const pct = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0;
                          const prevVal = i > 0 ? funnelData[i - 1].value : step.value;
                          const dropoff = prevVal > 0 ? Math.round(((prevVal - step.value) / prevVal) * 100) : 0;
                          return (
                            <div key={step.name}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium">{step.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{step.value}</span>
                                  {i > 0 && dropoff > 0 && (
                                    <Badge variant="secondary" className="text-[10px]">-{dropoff}%</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="h-8 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-primary/80 rounded transition-all flex items-center justify-end pr-2"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                >
                                  <span className="text-[10px] text-primary-foreground font-bold">{pct}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {funnelData.every(d => d.value === 0) && (
                          <p className="text-center text-muted-foreground py-6">এখনো কোনো ফানেল ডেটা নেই</p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">📊 ইভেন্ট সামারি</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const eventCounts: Record<string, number> = {};
                    serverEvents.forEach(e => {
                      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
                    });
                    const eventData = Object.entries(eventCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 15);
                    return (
                      <Table>
                        <TableHeader><TableRow><TableHead>ইভেন্ট</TableHead><TableHead className="text-right">সংখ্যা</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {eventData.map(([name, count]) => (
                            <TableRow key={name}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MousePointer className="w-3 h-3 text-muted-foreground" />
                                  {name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold">{count}</TableCell>
                            </TableRow>
                          ))}
                          {eventData.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">কোনো সার্ভার-সাইড ইভেন্ট নেই</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Server-Side Events Tab */}
          <TabsContent value="server">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">⚡ সার্ভার-সাইড ইভেন্ট ট্রেন্ড (Ad-blocker প্রুফ)</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const dailyEvents: Record<string, Record<string, number>> = {};
                    serverEvents.forEach(e => {
                      const day = format(new Date(e.created_at), 'MM/dd');
                      if (!dailyEvents[day]) dailyEvents[day] = {};
                      dailyEvents[day][e.event_name] = (dailyEvents[day][e.event_name] || 0) + 1;
                    });
                    const chartData = Object.entries(dailyEvents)
                      .map(([date, events]) => ({ date, PageView: events.PageView || 0, ViewContent: events.ViewContent || 0, AddToCart: events.AddToCart || 0, Purchase: events.Purchase || 0 }))
                      .reverse();
                    return (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Line type="monotone" dataKey="PageView" stroke="hsl(var(--primary))" strokeWidth={2} name="পেজভিউ" dot={false} />
                            <Line type="monotone" dataKey="ViewContent" stroke="#8b5cf6" strokeWidth={2} name="প্রোডাক্ট ভিউ" dot={false} />
                            <Line type="monotone" dataKey="AddToCart" stroke="#f59e0b" strokeWidth={2} name="কার্টে যোগ" dot={false} />
                            <Line type="monotone" dataKey="Purchase" stroke="#10b981" strokeWidth={2} name="পারচেজ" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">📱 ডিভাইস (সার্ভার)</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const devMap: Record<string, number> = {};
                    serverEvents.forEach(e => { devMap[e.device_type || 'unknown'] = (devMap[e.device_type || 'unknown'] || 0) + 1; });
                    const devData = Object.entries(devMap).map(([name, value]) => ({ name, value }));
                    return (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={devData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {devData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">🌍 লোকেশন (সার্ভার)</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const locMap: Record<string, number> = {};
                    serverEvents.forEach(e => { if (e.country) locMap[e.country] = (locMap[e.country] || 0) + 1; });
                    const locData = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
                    return (
                      <Table>
                        <TableHeader><TableRow><TableHead>দেশ</TableHead><TableHead className="text-right">ইভেন্ট</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {locData.map(([country, count]) => (
                            <TableRow key={country}><TableCell>{country}</TableCell><TableCell className="text-right font-medium">{count}</TableCell></TableRow>
                          ))}
                          {locData.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">ডেটা নেই</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">🌍 দেশ অনুযায়ী</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" name="ভিজিট" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">🏙️ শহর/এলাকা</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const cityMap: Record<string, number> = {};
                    analytics.forEach(a => { if (a.city) cityMap[a.city] = (cityMap[a.city] || 0) + 1; });
                    const cities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
                    return (
                      <Table>
                        <TableHeader><TableRow><TableHead>শহর</TableHead><TableHead className="text-right">ভিজিট</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {cities.map(([city, count]) => (
                            <TableRow key={city}><TableCell>{city}</TableCell><TableCell className="text-right font-medium">{count}</TableCell></TableRow>
                          ))}
                          {cities.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">ডেটা নেই</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages">
            <Card>
              <CardHeader><CardTitle className="text-base">📄 জনপ্রিয় পেজ</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="page" type="category" fontSize={11} width={200} />
                      <Tooltip />
                      <Bar dataKey="views" fill="hsl(var(--accent))" name="ভিউ" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <Card>
              <CardHeader><CardTitle className="text-base">🔍 সার্চ কোয়েরি (গত {days} দিন)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>সার্চ কোয়েরি</TableHead>
                      <TableHead className="text-right">সংখ্যা</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchData.map((s, i) => (
                      <TableRow key={s.query}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.query}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                      </TableRow>
                    ))}
                    {searchData.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">কোনো সার্চ ডেটা নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">📱 ডিভাইস</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">🌐 ব্রাউজার</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={browserData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {browserData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">💻 অপারেটিং সিস্টেম</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={osData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {osData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">🔗 রেফারার সোর্স</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>সোর্স</TableHead><TableHead className="text-right">ভিজিট</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {refData.map(r => (
                        <TableRow key={r.source}><TableCell>{r.source}</TableCell><TableCell className="text-right font-medium">{r.visits}</TableCell></TableRow>
                      ))}
                      {refData.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">ডেটা নেই</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">📢 UTM ক্যাম্পেইন</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>ক্যাম্পেইন</TableHead><TableHead className="text-right">ভিজিট</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {utmData.map(u => (
                        <TableRow key={u.campaign}><TableCell className="text-sm">{u.campaign}</TableCell><TableCell className="text-right font-medium">{u.visits}</TableCell></TableRow>
                      ))}
                      {utmData.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">কোনো UTM ডেটা নেই</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminVisitorAnalytics;
