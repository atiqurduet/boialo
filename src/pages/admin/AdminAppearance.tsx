import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Type, Layout, Moon, Layers, Save, RotateCcw, Eye } from 'lucide-react';

interface ThemeSettings {
  primary_h: string; primary_s: string; primary_l: string;
  accent_h: string; accent_s: string; accent_l: string;
  background_h: string; background_s: string; background_l: string;
  foreground_h: string; foreground_s: string; foreground_l: string;
  border_radius: string;
  font_family: string;
  font_size_base: string;
  heading_font: string;
  dark_mode_enabled: string;
  section_border_style: string;
  section_bg_style: string;
  product_grid_columns: string;
  header_style: string;
  footer_style: string;
  card_shadow: string;
  card_border: string;
  maintenance_mode: string;
  maintenance_message: string;
}

const defaultTheme: ThemeSettings = {
  primary_h: '4', primary_s: '82', primary_l: '56',
  accent_h: '174', accent_s: '60', accent_l: '45',
  background_h: '0', background_s: '0', background_l: '97',
  foreground_h: '0', foreground_s: '0', foreground_l: '15',
  border_radius: '0.5',
  font_family: 'Hind Siliguri',
  font_size_base: '16',
  heading_font: 'Hind Siliguri',
  dark_mode_enabled: 'false',
  section_border_style: 'none',
  section_bg_style: 'transparent',
  product_grid_columns: '4',
  header_style: 'default',
  footer_style: 'default',
  card_shadow: 'md',
  card_border: 'subtle',
  maintenance_mode: 'false',
  maintenance_message: 'সাইট রক্ষণাবেক্ষণ চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
};

const fontOptions = [
  'Hind Siliguri', 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi',
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
];

const AdminAppearance = () => {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchThemeSettings();
  }, []);

  const fetchThemeSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'theme_%');

    if (data) {
      const loaded = { ...defaultTheme };
      data.forEach(item => {
        const key = item.setting_key.replace('theme_', '') as keyof ThemeSettings;
        if (key in loaded) {
          loaded[key] = typeof item.setting_value === 'string' ? item.setting_value : String(item.setting_value || '');
        }
      });
      setTheme(loaded);
    }
  };

  const saveThemeSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(theme)) {
        await supabase.from('site_settings').upsert(
          { setting_key: `theme_${key}`, setting_value: value },
          { onConflict: 'setting_key' }
        );
      }
      toast.success('থিম সেটিংস সেভ হয়েছে!');
    } catch (error) {
      toast.error('সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setTheme(defaultTheme);
    toast.info('ডিফল্ট থিমে রিসেট হয়েছে');
  };

  const updateTheme = (key: keyof ThemeSettings, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const ColorPicker = ({ label, hKey, sKey, lKey }: { label: string; hKey: keyof ThemeSettings; sKey: keyof ThemeSettings; lKey: keyof ThemeSettings }) => (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        <div
          className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
          style={{ backgroundColor: `hsl(${theme[hKey]}, ${theme[sKey]}%, ${theme[lKey]}%)` }}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">H</span>
          <Slider min={0} max={360} step={1} value={[Number(theme[hKey])]} onValueChange={v => updateTheme(hKey, String(v[0]))} />
          <Input className="w-16 h-8 text-xs" value={theme[hKey]} onChange={e => updateTheme(hKey, e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">S</span>
          <Slider min={0} max={100} step={1} value={[Number(theme[sKey])]} onValueChange={v => updateTheme(sKey, String(v[0]))} />
          <Input className="w-16 h-8 text-xs" value={theme[sKey]} onChange={e => updateTheme(sKey, e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">L</span>
          <Slider min={0} max={100} step={1} value={[Number(theme[lKey])]} onValueChange={v => updateTheme(lKey, String(v[0]))} />
          <Input className="w-16 h-8 text-xs" value={theme[lKey]} onChange={e => updateTheme(lKey, e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> অ্যাপিয়ারেন্স</h1>
            <p className="text-muted-foreground mt-1">থিম, ফন্ট, লেআউট এবং ডিজাইন কাস্টমাইজ করুন</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefault}><RotateCcw className="h-4 w-4 mr-2" /> রিসেট</Button>
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-2" /> {previewMode ? 'প্রিভিউ বন্ধ' : 'প্রিভিউ'}
            </Button>
            <Button onClick={saveThemeSettings} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</Button>
          </div>
        </div>

        {/* Live Preview */}
        {previewMode && (
          <Card className="border-2 border-primary/30">
            <CardHeader><CardTitle className="text-sm">লাইভ প্রিভিউ</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg p-6" style={{
                backgroundColor: `hsl(${theme.background_h}, ${theme.background_s}%, ${theme.background_l}%)`,
                color: `hsl(${theme.foreground_h}, ${theme.foreground_s}%, ${theme.foreground_l}%)`,
                fontFamily: theme.font_family,
                borderRadius: `${theme.border_radius}rem`,
              }}>
                <h2 style={{ fontFamily: theme.heading_font }} className="text-2xl font-bold mb-2">প্রিভিউ শিরোনাম</h2>
                <p className="mb-4" style={{ fontSize: `${theme.font_size_base}px` }}>এটি একটি প্রিভিউ টেক্সট যা দেখাচ্ছে কিভাবে আপনার থিম দেখাবে।</p>
                <div className="flex gap-3">
                  <button style={{
                    backgroundColor: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)`,
                    color: 'white', padding: '8px 20px', borderRadius: `${theme.border_radius}rem`,
                  }}>প্রাইমারি বাটন</button>
                  <button style={{
                    backgroundColor: `hsl(${theme.accent_h}, ${theme.accent_s}%, ${theme.accent_l}%)`,
                    color: 'white', padding: '8px 20px', borderRadius: `${theme.border_radius}rem`,
                  }}>অ্যাকসেন্ট বাটন</button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white/10 p-4 rounded-lg border" style={{ borderRadius: `${theme.border_radius}rem` }}>
                      <div className="w-full h-20 bg-muted rounded mb-2" />
                      <div className="text-sm font-medium">প্রোডাক্ট {i}</div>
                      <div style={{ color: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)` }} className="font-bold">৳ {i * 150}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="colors">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-1" /> কালার</TabsTrigger>
            <TabsTrigger value="fonts"><Type className="h-4 w-4 mr-1" /> ফন্ট</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="h-4 w-4 mr-1" /> লেআউট</TabsTrigger>
            <TabsTrigger value="sections"><Layers className="h-4 w-4 mr-1" /> সেকশন</TabsTrigger>
            <TabsTrigger value="darkmode"><Moon className="h-4 w-4 mr-1" /> ডার্ক মোড</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker label="প্রাইমারি কালার" hKey="primary_h" sKey="primary_s" lKey="primary_l" />
              <ColorPicker label="অ্যাকসেন্ট কালার" hKey="accent_h" sKey="accent_s" lKey="accent_l" />
              <ColorPicker label="ব্যাকগ্রাউন্ড" hKey="background_h" sKey="background_s" lKey="background_l" />
              <ColorPicker label="টেক্সট কালার" hKey="foreground_h" sKey="foreground_s" lKey="foreground_l" />
            </div>
            <Card>
              <CardContent className="pt-6">
                <Label>বর্ডার রেডিয়াস (rem)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider min={0} max={2} step={0.125} value={[Number(theme.border_radius)]} onValueChange={v => updateTheme('border_radius', String(v[0]))} />
                  <span className="text-sm font-mono w-12">{theme.border_radius}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">বডি ফন্ট</CardTitle><CardDescription>মূল টেক্সটের জন্য ফন্ট</CardDescription></CardHeader>
                <CardContent>
                  <Select value={theme.font_family} onValueChange={v => updateTheme('font_family', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-3 text-sm" style={{ fontFamily: theme.font_family }}>প্রিভিউ: এটি {theme.font_family} ফন্টে দেখাচ্ছে।</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">হেডিং ফন্ট</CardTitle><CardDescription>শিরোনামের জন্য ফন্ট</CardDescription></CardHeader>
                <CardContent>
                  <Select value={theme.heading_font} onValueChange={v => updateTheme('heading_font', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <h3 className="mt-3 text-xl font-bold" style={{ fontFamily: theme.heading_font }}>প্রিভিউ শিরোনাম</h3>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">ফন্ট সাইজ</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Slider min={12} max={20} step={1} value={[Number(theme.font_size_base)]} onValueChange={v => updateTheme('font_size_base', String(v[0]))} />
                  <span className="text-sm font-mono w-12">{theme.font_size_base}px</span>
                </div>
                <p className="mt-2" style={{ fontSize: `${theme.font_size_base}px` }}>এই সাইজে টেক্সট দেখাবে</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">প্রোডাক্ট গ্রিড কলাম</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.product_grid_columns} onValueChange={v => updateTheme('product_grid_columns', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">২ কলাম</SelectItem>
                      <SelectItem value="3">৩ কলাম</SelectItem>
                      <SelectItem value="4">৪ কলাম</SelectItem>
                      <SelectItem value="5">৫ কলাম</SelectItem>
                      <SelectItem value="6">৬ কলাম</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">হেডার স্টাইল</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.header_style} onValueChange={v => updateTheme('header_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">ডিফল্ট</SelectItem>
                      <SelectItem value="centered">সেন্টার্ড</SelectItem>
                      <SelectItem value="minimal">মিনিমাল</SelectItem>
                      <SelectItem value="mega">মেগা হেডার</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">কার্ড শ্যাডো</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.card_shadow} onValueChange={v => updateTheme('card_shadow', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোন শ্যাডো নেই</SelectItem>
                      <SelectItem value="sm">ছোট</SelectItem>
                      <SelectItem value="md">মাঝারি</SelectItem>
                      <SelectItem value="lg">বড়</SelectItem>
                      <SelectItem value="xl">অতিরিক্ত বড়</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">কার্ড বর্ডার</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.card_border} onValueChange={v => updateTheme('card_border', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোন বর্ডার নেই</SelectItem>
                      <SelectItem value="subtle">হালকা</SelectItem>
                      <SelectItem value="solid">সলিড</SelectItem>
                      <SelectItem value="thick">মোটা</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">সেকশন বর্ডার</CardTitle><CardDescription>প্রতিটি সেকশনের মধ্যে ডিভাইডার</CardDescription></CardHeader>
                <CardContent>
                  <Select value={theme.section_border_style} onValueChange={v => updateTheme('section_border_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোন বর্ডার নেই</SelectItem>
                      <SelectItem value="line">সরু লাইন</SelectItem>
                      <SelectItem value="dashed">ড্যাশড</SelectItem>
                      <SelectItem value="dotted">ডটেড</SelectItem>
                      <SelectItem value="gradient">গ্রেডিয়েন্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">সেকশন ব্যাকগ্রাউন্ড</CardTitle><CardDescription>বিকল্প সেকশনের ব্যাকগ্রাউন্ড</CardDescription></CardHeader>
                <CardContent>
                  <Select value={theme.section_bg_style} onValueChange={v => updateTheme('section_bg_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">স্বচ্ছ</SelectItem>
                      <SelectItem value="alternate">বিকল্প রঙ</SelectItem>
                      <SelectItem value="subtle">হালকা টিন্ট</SelectItem>
                      <SelectItem value="gradient">গ্রেডিয়েন্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">ফুটার স্টাইল</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.footer_style} onValueChange={v => updateTheme('footer_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">ডিফল্ট</SelectItem>
                      <SelectItem value="dark">ডার্ক</SelectItem>
                      <SelectItem value="minimal">মিনিমাল</SelectItem>
                      <SelectItem value="centered">সেন্টার্ড</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="darkmode" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ডার্ক মোড</CardTitle>
                <CardDescription>ব্যবহারকারীদের জন্য ডার্ক মোড সুইচ সক্রিয় করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>ডার্ক মোড টগল দেখান</Label>
                  <Switch
                    checked={theme.dark_mode_enabled === 'true'}
                    onCheckedChange={v => updateTheme('dark_mode_enabled', String(v))}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">মেইনটেন্যান্স মোড</CardTitle>
                <CardDescription>সাইট সাময়িক বন্ধ রাখুন রক্ষণাবেক্ষণের জন্য</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>মেইনটেন্যান্স মোড সক্রিয় করুন</Label>
                  <Switch
                    checked={theme.maintenance_mode === 'true'}
                    onCheckedChange={v => updateTheme('maintenance_mode', String(v))}
                  />
                </div>
                {theme.maintenance_mode === 'true' && (
                  <div>
                    <Label>মেইনটেন্যান্স মেসেজ</Label>
                    <Input
                      className="mt-1"
                      value={theme.maintenance_message}
                      onChange={e => updateTheme('maintenance_message', e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAppearance;
