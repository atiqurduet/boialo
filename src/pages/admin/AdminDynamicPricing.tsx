import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Zap, Settings, Tag, Clock, Users, ShoppingCart } from "lucide-react";

const ruleTypes = [
  { id: 'min_order', label: 'ন্যূনতম অর্ডার', icon: ShoppingCart, desc: 'নির্দিষ্ট পরিমাণের বেশি অর্ডারে ছাড়' },
  { id: 'bulk_discount', label: 'বাল্ক ডিসকাউন্ট', icon: Tag, desc: 'নির্দিষ্ট সংখ্যক পণ্য কিনলে ছাড়' },
  { id: 'time_based', label: 'সময়-ভিত্তিক', icon: Clock, desc: 'নির্দিষ্ট সময়ে স্পেশাল ছাড়' },
  { id: 'first_order', label: 'প্রথম অর্ডার', icon: Users, desc: 'নতুন কাস্টমারদের জন্য ছাড়' },
];

const AdminDynamicPricing = () => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name_bn: '', rule_type: 'min_order', discount_type: 'percentage', discount_value: 0,
    condition_min_amount: 0, condition_min_quantity: 0, starts_at: '', ends_at: '', priority: 0,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const { data } = await supabase.from('dynamic_pricing_rules').select('*').order('priority', { ascending: false });
      return data || [];
    }
  });

  const { data: checkoutFields = [] } = useQuery({
    queryKey: ['checkout-fields'],
    queryFn: async () => {
      const { data } = await supabase.from('checkout_form_fields').select('*').order('sort_order');
      return data || [];
    }
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      const config: any = {};
      if (form.rule_type === 'min_order') config.min_amount = form.condition_min_amount;
      if (form.rule_type === 'bulk_discount') config.min_quantity = form.condition_min_quantity;

      const { error } = await supabase.from('dynamic_pricing_rules').insert({
        name_bn: form.name_bn, rule_type: form.rule_type, discount_type: form.discount_type,
        discount_value: form.discount_value, condition_config: config, priority: form.priority,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('রুল যোগ হয়েছে');
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      setShowDialog(false);
      setForm({ name_bn: '', rule_type: 'min_order', discount_type: 'percentage', discount_value: 0, condition_min_amount: 0, condition_min_quantity: 0, starts_at: '', ends_at: '', priority: 0 });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('dynamic_pricing_rules').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('dynamic_pricing_rules').delete().eq('id', id);
    },
    onSuccess: () => { toast.success('মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['pricing-rules'] }); },
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('checkout_form_fields').update({ is_active: active }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checkout-fields'] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ডায়নামিক প্রাইসিং ও চেকআউট</h1>
            <p className="text-muted-foreground text-sm">অটোমেটিক ছাড়, চেকআউট ফর্ম কাস্টমাইজেশন</p>
          </div>
        </div>

        <Tabs defaultValue="pricing">
          <TabsList>
            <TabsTrigger value="pricing"><Zap className="w-4 h-4 mr-1" /> ডায়নামিক প্রাইসিং</TabsTrigger>
            <TabsTrigger value="checkout"><Settings className="w-4 h-4 mr-1" /> চেকআউট ফিল্ড</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> নতুন রুল</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>নতুন প্রাইসিং রুল</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>নাম (বাংলা)</Label>
                      <Input value={form.name_bn} onChange={e => setForm(p => ({ ...p, name_bn: e.target.value }))} placeholder="যেমন: ৫০০ টাকার বেশি অর্ডারে ১০% ছাড়" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>রুল টাইপ</Label>
                        <Select value={form.rule_type} onValueChange={v => setForm(p => ({ ...p, rule_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ruleTypes.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>ডিসকাউন্ট টাইপ</Label>
                        <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                            <SelectItem value="fixed">ফিক্সড (৳)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>ডিসকাউন্ট মান</Label>
                      <Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: Number(e.target.value) }))} />
                    </div>
                    {form.rule_type === 'min_order' && (
                      <div><Label>ন্যূনতম অর্ডার পরিমাণ (৳)</Label><Input type="number" value={form.condition_min_amount} onChange={e => setForm(p => ({ ...p, condition_min_amount: Number(e.target.value) }))} /></div>
                    )}
                    {form.rule_type === 'bulk_discount' && (
                      <div><Label>ন্যূনতম পণ্য সংখ্যা</Label><Input type="number" value={form.condition_min_quantity} onChange={e => setForm(p => ({ ...p, condition_min_quantity: Number(e.target.value) }))} /></div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>শুরু তারিখ</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} /></div>
                      <div><Label>শেষ তারিখ</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} /></div>
                    </div>
                    <div><Label>প্রায়োরিটি (বেশি = আগে)</Label><Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} /></div>
                    <Button className="w-full" disabled={!form.name_bn} onClick={() => saveRule.mutate()}>সেভ করুন</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Rule type cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ruleTypes.map(rt => {
                const count = rules.filter(r => r.rule_type === rt.id && r.is_active).length;
                return (
                  <Card key={rt.id}>
                    <CardContent className="p-4 text-center">
                      <rt.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">{rt.label}</p>
                      <p className="text-xs text-muted-foreground">{count} একটিভ</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>ডিসকাউন্ট</TableHead>
                      <TableHead>সময়</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name_bn}</TableCell>
                        <TableCell><Badge variant="outline">{ruleTypes.find(r => r.id === rule.rule_type)?.label}</Badge></TableCell>
                        <TableCell>{rule.discount_value}{rule.discount_type === 'percentage' ? '%' : '৳'}</TableCell>
                        <TableCell className="text-xs">
                          {rule.starts_at ? format(new Date(rule.starts_at), 'dd/MM/yy') : '—'} ~ {rule.ends_at ? format(new Date(rule.ends_at), 'dd/MM/yy') : '∞'}
                        </TableCell>
                        <TableCell><Switch checked={rule.is_active} onCheckedChange={checked => toggleRule.mutate({ id: rule.id, active: checked })} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো রুল নেই</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">চেকআউট ফর্ম ফিল্ড</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ফিল্ড</TableHead>
                      <TableHead>টাইপ</TableHead>
                      <TableHead>গ্রুপ</TableHead>
                      <TableHead>বাধ্যতামূলক</TableHead>
                      <TableHead>একটিভ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkoutFields.map(field => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.field_label_bn}</TableCell>
                        <TableCell><Badge variant="outline">{field.field_type}</Badge></TableCell>
                        <TableCell>{field.field_group}</TableCell>
                        <TableCell>{field.is_required ? '✓' : '—'}</TableCell>
                        <TableCell><Switch checked={field.is_active} onCheckedChange={checked => toggleField.mutate({ id: field.id, active: checked })} /></TableCell>
                      </TableRow>
                    ))}
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

export default AdminDynamicPricing;
