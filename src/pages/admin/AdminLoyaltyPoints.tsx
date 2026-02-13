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
import { Star, Settings, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminLoyaltyPoints = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [settingsRes, transactionsRes] = await Promise.all([
      supabase.from('loyalty_settings').select('*'),
      supabase.from('loyalty_points').select('*').order('created_at', { ascending: false }).limit(100),
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
            <Star className="w-6 h-6" />
            লয়্যালটি পয়েন্ট
          </h1>
          <p className="text-muted-foreground">পয়েন্ট সিস্টেম সেটিংস ও ট্র্যাকিং</p>
        </div>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />সেটিংস</TabsTrigger>
            <TabsTrigger value="transactions"><Users className="w-4 h-4 mr-1" />লেনদেন</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            {/* Enable/Disable */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">পয়েন্ট সিস্টেম সক্রিয়</Label>
                    <p className="text-sm text-muted-foreground">পয়েন্ট সিস্টেম চালু/বন্ধ করুন</p>
                  </div>
                  <Switch
                    checked={settings.is_enabled}
                    onCheckedChange={(val) => saveSetting('is_enabled', val)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Points Config */}
            <Card>
              <CardHeader><CardTitle className="text-lg">পয়েন্ট কনফিগারেশন</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>প্রতি টাকায় পয়েন্ট</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={settings.points_per_taka || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, points_per_taka: Number(e.target.value) }))}
                      />
                      <Button size="sm" onClick={() => saveSetting('points_per_taka', settings.points_per_taka)} disabled={saving}>সেভ</Button>
                    </div>
                  </div>
                  <div>
                    <Label>প্রতি পয়েন্টের মূল্য (৳)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.points_value_taka || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, points_value_taka: Number(e.target.value) }))}
                      />
                      <Button size="sm" onClick={() => saveSetting('points_value_taka', settings.points_value_taka)} disabled={saving}>সেভ</Button>
                    </div>
                  </div>
                  <div>
                    <Label>ন্যূনতম রিডিম পয়েন্ট</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={settings.min_redeem_points || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, min_redeem_points: Number(e.target.value) }))}
                      />
                      <Button size="sm" onClick={() => saveSetting('min_redeem_points', settings.min_redeem_points)} disabled={saving}>সেভ</Button>
                    </div>
                  </div>
                  <div>
                    <Label>সাইনআপ বোনাস পয়েন্ট</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={settings.signup_bonus || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, signup_bonus: Number(e.target.value) }))}
                      />
                      <Button size="sm" onClick={() => saveSetting('signup_bonus', settings.signup_bonus)} disabled={saving}>সেভ</Button>
                    </div>
                  </div>
                  <div>
                    <Label>রিভিউ বোনাস পয়েন্ট</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        value={settings.review_bonus || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, review_bonus: Number(e.target.value) }))}
                      />
                      <Button size="sm" onClick={() => saveSetting('review_bonus', settings.review_bonus)} disabled={saving}>সেভ</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
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
                    {transactions.map(tx => (
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
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          কোনো লেনদেন নেই
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLoyaltyPoints;
