import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Settings, Users, Loader2, TrendingUp, Award, Gift, Crown, Zap, Target, ArrowUpRight, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const LOYALTY_TIERS = [
  { name: 'ব্রোঞ্জ', nameEn: 'Bronze', minPoints: 0, multiplier: 1, color: 'text-orange-700 bg-orange-100 dark:bg-orange-950', icon: Star },
  { name: 'সিলভার', nameEn: 'Silver', minPoints: 500, multiplier: 1.5, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900', icon: Award },
  { name: 'গোল্ড', nameEn: 'Gold', minPoints: 2000, multiplier: 2, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950', icon: Crown },
  { name: 'প্লাটিনাম', nameEn: 'Platinum', minPoints: 5000, multiplier: 3, color: 'text-purple-600 bg-purple-100 dark:bg-purple-950', icon: Zap },
];

const AdminLoyaltyPoints = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [txFilter, setTxFilter] = useState('all');
  const [txSearch, setTxSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settingsRes, transactionsRes] = await Promise.all([
      supabase.from('loyalty_settings').select('*'),
      supabase.from('loyalty_points').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    if (settingsRes.data) {
      const parsed: Record<string, any> = {};
      settingsRes.data.forEach(item => {
        parsed[item.setting_key] = (item.setting_value as any)?.value;
      });
      setSettings(parsed);
    }

    setTransactions(transactionsRes.data || []);
    setLoading(false);
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(true);
    const { error } = await supabase
      .from('loyalty_settings')
      .update({ setting_value: { value }, updated_at: new Date().toISOString() })
      .eq('setting_key', key);

    if (error) {
      toast.error('সেটিং সেভ করতে সমস্যা হয়েছে');
    } else {
      toast.success('সেটিং আপডেট হয়েছে');
      setSettings(prev => ({ ...prev, [key]: value }));
    }
    setSaving(false);
  };

  // Analytics
  const totalEarned = transactions.filter(t => t.type === 'earned').reduce((s, t) => s + (t.points || 0), 0);
  const totalRedeemed = transactions.filter(t => t.type === 'redeemed').reduce((s, t) => s + (t.points || 0), 0);
  const uniqueUsers = new Set(transactions.map(t => t.user_id)).size;
  
  const sourceBreakdown = transactions.reduce((acc: any, tx) => {
    const src = tx.source || 'অন্যান্য';
    if (!acc[src]) acc[src] = { name: src, earned: 0, redeemed: 0 };
    if (tx.type === 'earned') acc[src].earned += tx.points || 0;
    else acc[src].redeemed += tx.points || 0;
    return acc;
  }, {});
  const sourceData = Object.values(sourceBreakdown) as any[];

  const typeBreakdown = [
    { name: 'অর্জিত', value: totalEarned },
    { name: 'রিডিম', value: totalRedeemed },
  ].filter(d => d.value > 0);

  const filteredTransactions = transactions.filter(tx => {
    if (txFilter !== 'all' && tx.type !== txFilter) return false;
    if (txSearch && !tx.description?.toLowerCase().includes(txSearch.toLowerCase()) && !tx.source?.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            লয়্যালটি পয়েন্ট
          </h1>
          <p className="text-muted-foreground text-sm">পয়েন্ট সিস্টেম, টায়ার ম্যানেজমেন্ট ও অ্যানালিটিক্স</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /></div><p className="text-2xl font-bold text-emerald-600">+{totalEarned.toLocaleString()}</p><p className="text-xs text-muted-foreground">মোট অর্জিত পয়েন্ট</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Gift className="w-4 h-4 text-rose-500" /></div><p className="text-2xl font-bold text-rose-600">-{totalRedeemed.toLocaleString()}</p><p className="text-xs text-muted-foreground">মোট রিডিম পয়েন্ট</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-blue-500" /></div><p className="text-2xl font-bold">{(totalEarned - totalRedeemed).toLocaleString()}</p><p className="text-xs text-muted-foreground">নেট ব্যালেন্স</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-purple-500" /></div><p className="text-2xl font-bold">{uniqueUsers}</p><p className="text-xs text-muted-foreground">অংশগ্রহণকারী</p></CardContent></Card>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="flex-wrap">
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />সেটিংস</TabsTrigger>
            <TabsTrigger value="tiers"><Crown className="w-4 h-4 mr-1" />টায়ার</TabsTrigger>
            <TabsTrigger value="transactions"><Users className="w-4 h-4 mr-1" />লেনদেন</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="w-4 h-4 mr-1" />অ্যানালিটিক্স</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">পয়েন্ট সিস্টেম সক্রিয়</Label>
                    <p className="text-sm text-muted-foreground">পয়েন্ট সিস্টেম চালু/বন্ধ করুন</p>
                  </div>
                  <Switch checked={settings.is_enabled} onCheckedChange={(val) => saveSetting('is_enabled', val)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">পয়েন্ট কনফিগারেশন</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'points_per_taka', label: 'প্রতি টাকায় পয়েন্ট', type: 'number' },
                    { key: 'points_value_taka', label: 'প্রতি পয়েন্টের মূল্য (৳)', type: 'number', step: '0.1' },
                    { key: 'min_redeem_points', label: 'ন্যূনতম রিডিম পয়েন্ট', type: 'number' },
                    { key: 'signup_bonus', label: 'সাইনআপ বোনাস পয়েন্ট', type: 'number' },
                    { key: 'review_bonus', label: 'রিভিউ বোনাস পয়েন্ট', type: 'number' },
                    { key: 'referral_bonus', label: 'রেফারেল বোনাস পয়েন্ট', type: 'number' },
                    { key: 'birthday_bonus', label: 'জন্মদিন বোনাস পয়েন্ট', type: 'number' },
                    { key: 'points_expiry_days', label: 'পয়েন্ট এক্সপায়ারি (দিন)', type: 'number' },
                    { key: 'max_redeem_percent', label: 'সর্বোচ্চ রিডিম % (অর্ডারে)', type: 'number' },
                  ].map(({ key, label, ...rest }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          {...rest}
                          value={settings[key] || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        />
                        <Button size="sm" onClick={() => saveSetting(key, settings[key])} disabled={saving}>সেভ</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Earning Rules */}
            <Card>
              <CardHeader><CardTitle className="text-lg">পয়েন্ট অর্জনের নিয়ম</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'প্রথম অর্ডারে বোনাস', key: 'first_order_bonus', desc: 'প্রথমবার অর্ডার করলে অতিরিক্ত পয়েন্ট' },
                    { label: 'সোশ্যাল শেয়ার বোনাস', key: 'social_share_bonus', desc: 'প্রোডাক্ট শেয়ার করলে পয়েন্ট' },
                    { label: 'প্রোফাইল সম্পূর্ণ করলে', key: 'profile_complete_bonus', desc: 'সব তথ্য দিলে একবার' },
                  ].map(({ label, key, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="w-20" value={settings[key] || 0} onChange={e => setSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))} />
                        <Button size="sm" variant="outline" onClick={() => saveSetting(key, settings[key])} disabled={saving}>সেভ</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tiers">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Crown className="w-5 h-5" /> লয়্যালটি টায়ার সিস্টেম</CardTitle>
                <p className="text-sm text-muted-foreground">গ্রাহকদের পয়েন্ট অনুযায়ী টায়ার নির্ধারণ করুন</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {LOYALTY_TIERS.map((tier, i) => (
                    <div key={i} className="border rounded-xl p-5 text-center space-y-3 hover:shadow-md transition-shadow">
                      <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${tier.color}`}>
                        <tier.icon className="w-7 h-7" />
                      </div>
                      <h3 className="font-bold text-lg">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground">{tier.nameEn}</p>
                      <div className="space-y-1">
                        <p className="text-sm"><span className="font-medium">ন্যূনতম পয়েন্ট:</span> {tier.minPoints.toLocaleString()}</p>
                        <p className="text-sm"><span className="font-medium">মাল্টিপ্লায়ার:</span> {tier.multiplier}x</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        প্রতি ৳১০০ = {Math.round((settings.points_per_taka || 1) * 100 * tier.multiplier)} পয়েন্ট
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">টায়ার সুবিধাসমূহ</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>সুবিধা</TableHead>
                        {LOYALTY_TIERS.map(t => <TableHead key={t.nameEn} className="text-center">{t.name}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { feature: 'পয়েন্ট মাল্টিপ্লায়ার', values: LOYALTY_TIERS.map(t => `${t.multiplier}x`) },
                        { feature: 'ফ্রি ডেলিভারি', values: ['❌', '❌', '✅', '✅'] },
                        { feature: 'আর্লি অ্যাক্সেস', values: ['❌', '❌', '✅', '✅'] },
                        { feature: 'এক্সক্লুসিভ অফার', values: ['❌', '✅', '✅', '✅'] },
                        { feature: 'প্রায়োরিটি সাপোর্ট', values: ['❌', '❌', '❌', '✅'] },
                        { feature: 'জন্মদিন বোনাস', values: ['❌', '2x', '3x', '5x'] },
                      ].map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{row.feature}</TableCell>
                          {row.values.map((v, j) => <TableCell key={j} className="text-center text-sm">{v}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle className="text-lg">লেনদেন ইতিহাস</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-8 w-[200px]" placeholder="খুঁজুন..." value={txSearch} onChange={e => setTxSearch(e.target.value)} />
                    </div>
                    <Select value={txFilter} onValueChange={setTxFilter}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব</SelectItem>
                        <SelectItem value="earned">অর্জিত</SelectItem>
                        <SelectItem value="redeemed">রিডিম</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>ধরণ</TableHead>
                      <TableHead>পয়েন্ট</TableHead>
                      <TableHead>সোর্স</TableHead>
                      <TableHead>বিবরণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{new Date(tx.created_at).toLocaleDateString('bn-BD')}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'earned' ? 'default' : 'destructive'}>
                            {tx.type === 'earned' ? 'অর্জিত' : tx.type === 'redeemed' ? 'রিডিম' : tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${tx.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'earned' ? '+' : '-'}{tx.points}
                        </TableCell>
                        <TableCell className="text-sm">{tx.source}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                      </TableRow>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো লেনদেন নেই</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">সোর্স অনুযায়ী পয়েন্ট</CardTitle></CardHeader>
                  <CardContent>
                    {sourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={sourceData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                          <Bar dataKey="earned" name="অর্জিত" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="redeemed" name="রিডিম" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">অর্জিত vs রিডিম</CardTitle></CardHeader>
                  <CardContent>
                    {typeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 12 }}>
                            {typeBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground py-12">ডাটা নেই</p>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">রিডেম্পশন রেট</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={totalEarned > 0 ? (totalRedeemed / totalEarned) * 100 : 0} className="h-4" />
                    </div>
                    <span className="text-lg font-bold">{totalEarned > 0 ? ((totalRedeemed / totalEarned) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {totalEarned.toLocaleString()} পয়েন্ট অর্জিত → {totalRedeemed.toLocaleString()} পয়েন্ট রিডিম
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLoyaltyPoints;