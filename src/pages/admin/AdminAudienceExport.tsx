import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Users, Target, TrendingUp, Facebook, BarChart3, Loader2, Filter } from 'lucide-react';

type AudienceType = 'purchasers' | 'cart_abandoners' | 'high_value' | 'engaged' | 'at_risk' | 'all_visitors';

const audienceTypes: { value: AudienceType; label: string; desc: string; icon: any }[] = [
  { value: 'purchasers', label: 'ক্রেতা (Purchasers)', desc: 'যারা কেনাকাটা করেছেন', icon: TrendingUp },
  { value: 'cart_abandoners', label: 'কার্ট পরিত্যাগ (Cart Abandoners)', desc: 'কার্টে পণ্য রেখে চলে গেছেন', icon: Target },
  { value: 'high_value', label: 'হাই ভ্যালু কাস্টমার', desc: '৫০০০+ টাকার অর্ডার', icon: TrendingUp },
  { value: 'engaged', label: 'এনগেজড ভিজিটর', desc: 'বেশি সময় কাটিয়েছেন', icon: Users },
  { value: 'at_risk', label: 'অ্যাট রিস্ক কাস্টমার', desc: 'চার্ন হওয়ার সম্ভাবনা', icon: Target },
  { value: 'all_visitors', label: 'সকল ভিজিটর', desc: 'সব ট্র্যাকড ভিজিটর', icon: Users },
];

const AdminAudienceExport = () => {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('purchasers');
  const [days, setDays] = useState('30');
  const [exporting, setExporting] = useState(false);

  const { data: audienceData, isLoading } = useQuery({
    queryKey: ['audience-data', selectedAudience, days],
    queryFn: async () => {
      const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();

      switch (selectedAudience) {
        case 'purchasers': {
          const { data } = await supabase.from('orders').select('user_id, total_amount, created_at, customer_email, customer_phone')
            .gte('created_at', since).eq('status', 'delivered');
          return data || [];
        }
        case 'cart_abandoners': {
          const { data } = await supabase.from('abandoned_checkouts').select('user_id, email, phone, subtotal, created_at')
            .gte('created_at', since).eq('recovered', false);
          return data || [];
        }
        case 'high_value': {
          const { data } = await supabase.from('orders').select('user_id, total_amount, customer_email, customer_phone, created_at')
            .gte('created_at', since).gte('total_amount', 5000);
          return data || [];
        }
        case 'engaged': {
          const { data } = await supabase.from('engagement_scores' as any).select('*')
            .gte('created_at', since).gte('engagement_score', 60).limit(500);
          return data || [];
        }
        case 'at_risk': {
          const { data } = await supabase.from('predictive_scores' as any).select('*')
            .gte('created_at', since).gte('churn_risk', 0.6).limit(500);
          return data || [];
        }
        case 'all_visitors': {
          const { data } = await supabase.from('visitor_analytics').select('session_id, user_id, device_type, browser, os, created_at')
            .gte('created_at', since).limit(1000);
          return data || [];
        }
        default: return [];
      }
    },
  });

  const exportCSV = (format: 'facebook' | 'tiktok' | 'google' | 'raw') => {
    if (!audienceData || audienceData.length === 0) {
      toast.error('কোন ডেটা পাওয়া যায়নি');
      return;
    }
    setExporting(true);

    try {
      let csvContent = '';
      const rows = audienceData as any[];

      if (format === 'facebook') {
        // Facebook Custom Audience CSV format
        csvContent = 'email,phone,fn,ln,country\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = r.customer_email || r.email || '';
          const phone = r.customer_phone || r.phone || '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `${email},${phone},,,BD\n`;
          }
        });
      } else if (format === 'tiktok') {
        // TikTok Audience CSV
        csvContent = 'IDFA_SHA256,GAID_SHA256,EMAIL_SHA256,PHONE_SHA256\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = r.customer_email || r.email || '';
          const phone = r.customer_phone || r.phone || '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `,,${email},${phone}\n`;
          }
        });
      } else if (format === 'google') {
        // Google Ads Customer Match CSV
        csvContent = 'Email,Phone,Country\n';
        const seen = new Set<string>();
        rows.forEach(r => {
          const email = r.customer_email || r.email || '';
          const phone = r.customer_phone || r.phone || '';
          const key = email || phone;
          if (key && !seen.has(key)) {
            seen.add(key);
            csvContent += `${email},${phone},BD\n`;
          }
        });
      } else {
        // Raw export
        const headers = Object.keys(rows[0] || {});
        csvContent = headers.join(',') + '\n';
        rows.forEach(r => {
          csvContent += headers.map(h => JSON.stringify(r[h] ?? '')).join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audience_${selectedAudience}_${format}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} ফরম্যাটে এক্সপোর্ট হয়েছে`);
    } catch (e) {
      toast.error('এক্সপোর্ট ব্যর্থ');
    } finally {
      setExporting(false);
    }
  };

  const currentAudience = audienceTypes.find(a => a.value === selectedAudience);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">অডিয়েন্স এক্সপোর্ট</h1>
          <p className="text-muted-foreground">Facebook, TikTok, Google Ads এ Custom Audience আপলোড করুন</p>
        </div>

        {/* Platform Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4 flex items-start gap-3">
              <Facebook className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-700 dark:text-blue-400">Facebook Ads</h3>
                <p className="text-xs text-muted-foreground">Ads Manager → Audiences → Create Custom Audience → Customer List → Upload CSV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-pink-500/30 bg-pink-50/50 dark:bg-pink-950/20">
            <CardContent className="pt-4 flex items-start gap-3">
              <Target className="w-8 h-8 text-pink-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-pink-700 dark:text-pink-400">TikTok Ads</h3>
                <p className="text-xs text-muted-foreground">Assets → Audiences → Create Audience → Customer File → Upload CSV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4 flex items-start gap-3">
              <BarChart3 className="w-8 h-8 text-green-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">Google Ads</h3>
                <p className="text-xs text-muted-foreground">Tools → Audience Manager → + → Customer List → Upload CSV</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> অডিয়েন্স সিলেক্ট করুন</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedAudience} onValueChange={(v) => setSelectedAudience(v as AudienceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audienceTypes.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">গত ৭ দিন</SelectItem>
                    <SelectItem value="30">গত ৩০ দিন</SelectItem>
                    <SelectItem value="90">গত ৯০ দিন</SelectItem>
                    <SelectItem value="180">গত ৬ মাস</SelectItem>
                    <SelectItem value="365">গত ১ বছর</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentAudience && (
              <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{currentAudience.label}</h3>
                  <p className="text-sm text-muted-foreground">{currentAudience.desc}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (audienceData?.length || 0)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" /> এক্সপোর্ট করুন</CardTitle>
            <CardDescription>প্ল্যাটফর্ম অনুযায়ী সঠিক CSV ফরম্যাটে ডাউনলোড করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button onClick={() => exportCSV('facebook')} disabled={exporting || !audienceData?.length} className="bg-blue-600 hover:bg-blue-700">
                <Facebook className="w-4 h-4 mr-2" /> Facebook CSV
              </Button>
              <Button onClick={() => exportCSV('tiktok')} disabled={exporting || !audienceData?.length} className="bg-pink-600 hover:bg-pink-700">
                <Target className="w-4 h-4 mr-2" /> TikTok CSV
              </Button>
              <Button onClick={() => exportCSV('google')} disabled={exporting || !audienceData?.length} className="bg-green-600 hover:bg-green-700">
                <BarChart3 className="w-4 h-4 mr-2" /> Google Ads CSV
              </Button>
              <Button variant="outline" onClick={() => exportCSV('raw')} disabled={exporting || !audienceData?.length}>
                <Download className="w-4 h-4 mr-2" /> Raw CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {audienceData && audienceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>প্রিভিউ (প্রথম ১০টি)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(audienceData[0] as any).slice(0, 6).map(k => (
                        <th key={k} className="text-left p-2 font-medium">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(audienceData as any[]).slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50">
                        {Object.values(row).slice(0, 6).map((val: any, j) => (
                          <td key={j} className="p-2 truncate max-w-[200px]">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAudienceExport;
