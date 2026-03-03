import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { BannerImageUpload } from '@/components/admin/BannerImageUpload';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Copy, Eye, EyeOff, Megaphone } from 'lucide-react';

interface PopupBanner {
  id: string;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  badge_text: string | null;
  image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  overlay_color: string | null;
  popup_type: string;
  position: string | null;
  width: number | null;
  height: number | null;
  border_radius: number | null;
  padding: number | null;
  text_align: string | null;
  title_size: string | null;
  animation: string | null;
  trigger_type: string | null;
  trigger_delay: number | null;
  trigger_scroll_percent: number | null;
  show_frequency: string | null;
  show_close_button: boolean | null;
  close_on_overlay_click: boolean | null;
  auto_close_seconds: number | null;
  show_on_pages: string[] | null;
  exclude_pages: string[] | null;
  show_to_logged_in: boolean | null;
  show_to_guests: boolean | null;
  device_target: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
}

const defaultForm: Partial<PopupBanner> = {
  title: '',
  description: '',
  button_text: '',
  button_link: '',
  badge_text: '',
  image_url: '',
  background_color: '#ffffff',
  text_color: '#000000',
  popup_type: 'modal',
  position: 'center',
  width: 500,
  height: undefined,
  border_radius: 16,
  padding: 32,
  text_align: 'center',
  title_size: 'lg',
  animation: 'fade',
  trigger_type: 'on_load',
  trigger_delay: 0,
  trigger_scroll_percent: 50,
  show_frequency: 'every_visit',
  show_close_button: true,
  close_on_overlay_click: true,
  auto_close_seconds: undefined,
  show_on_pages: [],
  exclude_pages: [],
  show_to_logged_in: true,
  show_to_guests: true,
  device_target: 'all',
  start_date: '',
  end_date: '',
  is_active: true,
  sort_order: 0,
};

const AdminPopupBanners = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PopupBanner>>(defaultForm);
  const [pagesInput, setPagesInput] = useState('');
  const [excludePagesInput, setExcludePagesInput] = useState('');

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ['admin-popup-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PopupBanner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PopupBanner>) => {
      const payload = {
        ...data,
        show_on_pages: pagesInput ? pagesInput.split(',').map(s => s.trim()).filter(Boolean) : [],
        exclude_pages: excludePagesInput ? excludePagesInput.split(',').map(s => s.trim()).filter(Boolean) : [],
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        auto_close_seconds: data.auto_close_seconds || null,
        height: data.height || null,
      };
      if (editingId) {
        const { error } = await supabase.from('popup_banners').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('popup_banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popup-banners'] });
      toast.success(editingId ? 'পপআপ আপডেট হয়েছে' : 'পপআপ তৈরি হয়েছে');
      closeDialog();
    },
    onError: () => toast.error('সংরক্ষণে সমস্যা হয়েছে'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('popup_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popup-banners'] });
      toast.success('পপআপ মুছে ফেলা হয়েছে');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('popup_banners').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-popup-banners'] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setPagesInput('');
    setExcludePagesInput('');
  };

  const openEdit = (p: PopupBanner) => {
    setEditingId(p.id);
    setForm(p);
    setPagesInput(p.show_on_pages?.join(', ') || '');
    setExcludePagesInput(p.exclude_pages?.join(', ') || '');
    setDialogOpen(true);
  };

  const duplicatePopup = (p: PopupBanner) => {
    const { id, created_at, ...rest } = p;
    setEditingId(null);
    setForm({ ...rest, title: `${rest.title} (কপি)` });
    setPagesInput(rest.show_on_pages?.join(', ') || '');
    setExcludePagesInput(rest.exclude_pages?.join(', ') || '');
    setDialogOpen(true);
  };

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const popupTypeLabels: Record<string, string> = {
    modal: 'মডাল', fullscreen: 'ফুলস্ক্রিন', bottom_bar: 'বটম বার', slide_in: 'স্লাইড ইন', top_bar: 'টপ বার',
  };
  const triggerLabels: Record<string, string> = {
    on_load: 'পেজ লোডে', on_scroll: 'স্ক্রলে', on_exit: 'এক্সিট ইন্টেন্ট', after_delay: 'বিলম্বের পর', on_click: 'ক্লিকে',
  };
  const freqLabels: Record<string, string> = {
    once: 'একবার', once_per_session: 'প্রতি সেশনে একবার', every_visit: 'প্রতি ভিজিটে', once_per_day: 'দিনে একবার', once_per_week: 'সপ্তাহে একবার',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" /> পপআপ ব্যানার</h1>
            <p className="text-muted-foreground">সাইটে দেখানোর জন্য পপআপ ব্যানার তৈরি ও পরিচালনা করুন</p>
          </div>
          <Button onClick={() => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> নতুন পপআপ
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">লোড হচ্ছে...</div>
        ) : popups.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">কোনো পপআপ ব্যানার নেই। নতুন তৈরি করুন।</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {popups.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {p.image_url && (
                      <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.title || '(শিরোনাম নেই)'}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline">{popupTypeLabels[p.popup_type] || p.popup_type}</Badge>
                        <Badge variant="outline">{triggerLabels[p.trigger_type || 'on_load']}</Badge>
                        <Badge variant="outline">{freqLabels[p.show_frequency || 'every_visit']}</Badge>
                        <Badge variant={p.device_target === 'all' ? 'secondary' : 'outline'}>{p.device_target === 'all' ? 'সব ডিভাইস' : p.device_target}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={p.is_active ?? true} onCheckedChange={(v) => toggleMutation.mutate({ id: p.id, active: v })} />
                    <Button variant="ghost" size="icon" onClick={() => duplicatePopup(p)} title="ডুপ্লিকেট"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'পপআপ সম্পাদনা' : 'নতুন পপআপ তৈরি'}</DialogTitle></DialogHeader>
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="content">কন্টেন্ট</TabsTrigger>
              <TabsTrigger value="design">ডিজাইন</TabsTrigger>
              <TabsTrigger value="trigger">ট্রিগার</TabsTrigger>
              <TabsTrigger value="targeting">টার্গেটিং</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div><Label>শিরোনাম</Label><Input value={form.title || ''} onChange={e => updateForm('title', e.target.value)} placeholder="পপআপ শিরোনাম" /></div>
              <div><Label>বিবরণ</Label><Textarea value={form.description || ''} onChange={e => updateForm('description', e.target.value)} placeholder="পপআপ বিবরণ" rows={3} /></div>
              <div><Label>ব্যাজ টেক্সট</Label><Input value={form.badge_text || ''} onChange={e => updateForm('badge_text', e.target.value)} placeholder="যেমন: সীমিত অফার" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>বাটন টেক্সট</Label><Input value={form.button_text || ''} onChange={e => updateForm('button_text', e.target.value)} placeholder="এখনই কিনুন" /></div>
                <div><Label>বাটন লিংক</Label><Input value={form.button_link || ''} onChange={e => updateForm('button_link', e.target.value)} placeholder="/shop" /></div>
              </div>
              <div>
                <Label>ইমেজ</Label>
                <BannerImageUpload value={form.image_url || ''} onChange={v => updateForm('image_url', v)} label="পপআপ ইমেজ আপলোড করুন" />
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>পপআপ টাইপ</Label>
                  <Select value={form.popup_type || 'modal'} onValueChange={v => updateForm('popup_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modal">মডাল</SelectItem>
                      <SelectItem value="fullscreen">ফুলস্ক্রিন</SelectItem>
                      <SelectItem value="bottom_bar">বটম বার</SelectItem>
                      <SelectItem value="slide_in">স্লাইড ইন</SelectItem>
                      <SelectItem value="top_bar">টপ বার</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>পজিশন</Label>
                  <Select value={form.position || 'center'} onValueChange={v => updateForm('position', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">সেন্টার</SelectItem>
                      <SelectItem value="top">উপরে</SelectItem>
                      <SelectItem value="bottom">নিচে</SelectItem>
                      <SelectItem value="left">বামে</SelectItem>
                      <SelectItem value="right">ডানে</SelectItem>
                      <SelectItem value="top_left">উপর-বামে</SelectItem>
                      <SelectItem value="top_right">উপর-ডানে</SelectItem>
                      <SelectItem value="bottom_left">নিচে-বামে</SelectItem>
                      <SelectItem value="bottom_right">নিচে-ডানে</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>অ্যানিমেশন</Label>
                  <Select value={form.animation || 'fade'} onValueChange={v => updateForm('animation', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">ফেড</SelectItem>
                      <SelectItem value="slide_up">স্লাইড আপ</SelectItem>
                      <SelectItem value="slide_down">স্লাইড ডাউন</SelectItem>
                      <SelectItem value="slide_left">স্লাইড লেফট</SelectItem>
                      <SelectItem value="slide_right">স্লাইড রাইট</SelectItem>
                      <SelectItem value="zoom">জুম</SelectItem>
                      <SelectItem value="bounce">বাউন্স</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>টেক্সট সাইজ</Label>
                  <Select value={form.title_size || 'lg'} onValueChange={v => updateForm('title_size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">ছোট</SelectItem>
                      <SelectItem value="md">মাঝারি</SelectItem>
                      <SelectItem value="lg">বড়</SelectItem>
                      <SelectItem value="xl">অনেক বড়</SelectItem>
                      <SelectItem value="2xl">সবচেয়ে বড়</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>টেক্সট অ্যালাইন</Label>
                  <Select value={form.text_align || 'center'} onValueChange={v => updateForm('text_align', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">বামে</SelectItem>
                      <SelectItem value="center">মাঝে</SelectItem>
                      <SelectItem value="right">ডানে</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>ব্যাকগ্রাউন্ড কালার</Label><Input type="color" value={form.background_color || '#ffffff'} onChange={e => updateForm('background_color', e.target.value)} /></div>
                <div><Label>টেক্সট কালার</Label><Input type="color" value={form.text_color || '#000000'} onChange={e => updateForm('text_color', e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><Label>প্রস্থ (px)</Label><Input type="number" value={form.width || 500} onChange={e => updateForm('width', parseInt(e.target.value) || 500)} /></div>
                <div><Label>উচ্চতা (px, খালি = অটো)</Label><Input type="number" value={form.height || ''} onChange={e => updateForm('height', parseInt(e.target.value) || undefined)} /></div>
                <div><Label>বর্ডার রেডিয়াস</Label><Input type="number" value={form.border_radius ?? 16} onChange={e => updateForm('border_radius', parseInt(e.target.value) || 0)} /></div>
              </div>

              <div><Label>প্যাডিং (px)</Label>
                <Slider value={[form.padding ?? 32]} onValueChange={v => updateForm('padding', v[0])} min={0} max={80} step={4} />
                <span className="text-xs text-muted-foreground">{form.padding ?? 32}px</span>
              </div>
            </TabsContent>

            <TabsContent value="trigger" className="space-y-4 mt-4">
              <div>
                <Label>ট্রিগার টাইপ</Label>
                <Select value={form.trigger_type || 'on_load'} onValueChange={v => updateForm('trigger_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_load">পেজ লোডে</SelectItem>
                    <SelectItem value="after_delay">নির্দিষ্ট সময় পর</SelectItem>
                    <SelectItem value="on_scroll">স্ক্রলে</SelectItem>
                    <SelectItem value="on_exit">এক্সিট ইন্টেন্ট</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.trigger_type === 'after_delay' && (
                <div><Label>বিলম্ব (সেকেন্ড)</Label><Input type="number" value={form.trigger_delay || 0} onChange={e => updateForm('trigger_delay', parseInt(e.target.value) || 0)} /></div>
              )}
              {form.trigger_type === 'on_scroll' && (
                <div><Label>স্ক্রল শতাংশ (%)</Label>
                  <Slider value={[form.trigger_scroll_percent ?? 50]} onValueChange={v => updateForm('trigger_scroll_percent', v[0])} min={10} max={100} step={5} />
                  <span className="text-xs text-muted-foreground">{form.trigger_scroll_percent ?? 50}%</span>
                </div>
              )}

              <div>
                <Label>দেখানোর ফ্রিকোয়েন্সি</Label>
                <Select value={form.show_frequency || 'every_visit'} onValueChange={v => updateForm('show_frequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="every_visit">প্রতি ভিজিটে</SelectItem>
                    <SelectItem value="once_per_session">সেশনে একবার</SelectItem>
                    <SelectItem value="once_per_day">দিনে একবার</SelectItem>
                    <SelectItem value="once_per_week">সপ্তাহে একবার</SelectItem>
                    <SelectItem value="once">শুধুমাত্র একবার</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div><Label>অটো ক্লোজ (সেকেন্ড, খালি = নেই)</Label><Input type="number" value={form.auto_close_seconds || ''} onChange={e => updateForm('auto_close_seconds', parseInt(e.target.value) || undefined)} /></div>

              <div className="flex items-center justify-between"><Label>ক্লোজ বাটন দেখান</Label><Switch checked={form.show_close_button ?? true} onCheckedChange={v => updateForm('show_close_button', v)} /></div>
              <div className="flex items-center justify-between"><Label>ওভারলে ক্লিকে বন্ধ</Label><Switch checked={form.close_on_overlay_click ?? true} onCheckedChange={v => updateForm('close_on_overlay_click', v)} /></div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>শুরুর তারিখ</Label><Input type="datetime-local" value={form.start_date || ''} onChange={e => updateForm('start_date', e.target.value)} /></div>
                <div><Label>শেষ তারিখ</Label><Input type="datetime-local" value={form.end_date || ''} onChange={e => updateForm('end_date', e.target.value)} /></div>
              </div>
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4 mt-4">
              <div>
                <Label>ডিভাইস টার্গেট</Label>
                <Select value={form.device_target || 'all'} onValueChange={v => updateForm('device_target', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব ডিভাইস</SelectItem>
                    <SelectItem value="desktop">ডেস্কটপ</SelectItem>
                    <SelectItem value="mobile">মোবাইল</SelectItem>
                    <SelectItem value="tablet">ট্যাবলেট</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between"><Label>লগড ইন ইউজারদের দেখান</Label><Switch checked={form.show_to_logged_in ?? true} onCheckedChange={v => updateForm('show_to_logged_in', v)} /></div>
              <div className="flex items-center justify-between"><Label>গেস্ট ইউজারদের দেখান</Label><Switch checked={form.show_to_guests ?? true} onCheckedChange={v => updateForm('show_to_guests', v)} /></div>

              <div><Label>নির্দিষ্ট পেজে দেখান (কমা দিয়ে আলাদা, যেমন: /, /shop)</Label><Input value={pagesInput} onChange={e => setPagesInput(e.target.value)} placeholder="খালি রাখলে সব পেজে দেখাবে" /></div>
              <div><Label>এই পেজগুলোতে দেখাবে না</Label><Input value={excludePagesInput} onChange={e => setExcludePagesInput(e.target.value)} placeholder="/admin, /checkout" /></div>

              <div><Label>সর্ট অর্ডার</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => updateForm('sort_order', parseInt(e.target.value) || 0)} /></div>
              <div className="flex items-center justify-between"><Label>সক্রিয়</Label><Switch checked={form.is_active ?? true} onCheckedChange={v => updateForm('is_active', v)} /></div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'আপডেট করুন' : 'তৈরি করুন'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPopupBanners;
