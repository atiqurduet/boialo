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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Type, Layout, Moon, Layers, Save, RotateCcw, Eye, MousePointerClick, PanelTop, PanelBottom, Link2 } from 'lucide-react';

interface ThemeSettings {
  [key: string]: string;
}

const defaultTheme: ThemeSettings = {
  primary_h: '4', primary_s: '82', primary_l: '56',
  accent_h: '174', accent_s: '60', accent_l: '45',
  background_h: '0', background_s: '0', background_l: '97',
  foreground_h: '0', foreground_s: '0', foreground_l: '15',
  secondary_h: '0', secondary_s: '0', secondary_l: '96',
  destructive_h: '0', destructive_s: '84', destructive_l: '60',
  muted_h: '0', muted_s: '0', muted_l: '94',
  header_bg_h: '0', header_bg_s: '0', header_bg_l: '100',
  header_text_h: '0', header_text_s: '0', header_text_l: '15',
  footer_bg_h: '0', footer_bg_s: '0', footer_bg_l: '100',
  footer_text_h: '0', footer_text_s: '0', footer_text_l: '15',
  nav_bg_h: '0', nav_bg_s: '0', nav_bg_l: '100',
  nav_text_h: '0', nav_text_s: '0', nav_text_l: '45',
  nav_active_style: 'highlight',
  link_color_h: '4', link_color_s: '82', link_color_l: '56',
  link_hover_style: 'underline',
  button_radius: '0.5',
  button_size: 'default',
  border_radius: '0.5',
  font_family: 'Hind Siliguri',
  font_size_base: '16',
  heading_font: 'Hind Siliguri',
  dark_mode_enabled: 'false',
  section_border_style: 'none',
  section_bg_style: 'transparent',
  section_spacing: 'normal',
  product_grid_columns: '4',
  header_style: 'default',
  footer_style: 'default',
  card_shadow: 'md',
  card_border: 'subtle',
  maintenance_mode: 'false',
  maintenance_message: 'সাইট রক্ষণাবেক্ষণ চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
  custom_css: '',
};

const fontOptions = [
  'Hind Siliguri', 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi',
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Nunito', 'Raleway', 'Playfair Display', 'Merriweather', 'Source Sans Pro',
];

const presetThemes = [
  { name: 'ডিফল্ট (লাল)', primary: { h: '4', s: '82', l: '56' }, accent: { h: '174', s: '60', l: '45' } },
  { name: 'নীল', primary: { h: '217', s: '91', l: '60' }, accent: { h: '280', s: '65', l: '60' } },
  { name: 'সবুজ', primary: { h: '142', s: '71', l: '45' }, accent: { h: '47', s: '96', l: '53' } },
  { name: 'বেগুনি', primary: { h: '262', s: '83', l: '58' }, accent: { h: '330', s: '81', l: '60' } },
  { name: 'কমলা', primary: { h: '25', s: '95', l: '53' }, accent: { h: '43', s: '96', l: '56' } },
  { name: 'গোল্ডেন', primary: { h: '43', s: '74', l: '49' }, accent: { h: '24', s: '76', l: '50' } },
];

const AdminAppearance = () => {
  const [theme, setTheme] = useState<ThemeSettings>({ ...defaultTheme });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    fetchThemeSettings();
  }, []);

  // Live preview: apply to document as user changes
  useEffect(() => {
    if (previewMode) {
      applyPreview(theme);
    }
  }, [theme, previewMode]);

  const applyPreview = (t: ThemeSettings) => {
    const root = document.documentElement;
    const set = (prop: string, val: string) => root.style.setProperty(prop, val);
    set('--primary', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
    set('--accent', `${t.accent_h} ${t.accent_s}% ${t.accent_l}%`);
    set('--background', `${t.background_h} ${t.background_s}% ${t.background_l}%`);
    set('--foreground', `${t.foreground_h} ${t.foreground_s}% ${t.foreground_l}%`);
    set('--secondary', `${t.secondary_h} ${t.secondary_s}% ${t.secondary_l}%`);
    set('--destructive', `${t.destructive_h} ${t.destructive_s}% ${t.destructive_l}%`);
    set('--muted', `${t.muted_h} ${t.muted_s}% ${t.muted_l}%`);
    set('--ring', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
    set('--wafilife-red', `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
    set('--wafilife-dark-red', `${t.primary_h} ${t.primary_s}% ${Math.max(Number(t.primary_l) - 11, 0)}%`);
    set('--card', `${t.background_h} ${t.background_s}% ${Math.min(Number(t.background_l) + 3, 100)}%`);
    set('--radius', `${t.border_radius}rem`);
    set('--header-bg', `${t.header_bg_h} ${t.header_bg_s}% ${t.header_bg_l}%`);
    set('--header-text', `${t.header_text_h} ${t.header_text_s}% ${t.header_text_l}%`);
    set('--footer-bg', `${t.footer_bg_h} ${t.footer_bg_s}% ${t.footer_bg_l}%`);
    set('--footer-text', `${t.footer_text_h} ${t.footer_text_s}% ${t.footer_text_l}%`);
    set('--nav-bg', `${t.nav_bg_h} ${t.nav_bg_s}% ${t.nav_bg_l}%`);
    set('--nav-text', `${t.nav_text_h} ${t.nav_text_s}% ${t.nav_text_l}%`);
    set('--button-radius', `${t.button_radius}rem`);
    if (t.font_family) root.style.fontFamily = `'${t.font_family}', sans-serif`;
  };

  const fetchThemeSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'theme_%');

    if (data) {
      const loaded = { ...defaultTheme };
      data.forEach(item => {
        const key = item.setting_key.replace('theme_', '');
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
      toast.success('থিম সেটিংস সেভ হয়েছে! পেজ রিফ্রেশ করলে সবখানে প্রয়োগ হবে।');
    } catch {
      toast.error('সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setTheme({ ...defaultTheme });
    toast.info('ডিফল্ট থিমে রিসেট হয়েছে');
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setTheme(prev => ({
      ...prev,
      primary_h: preset.primary.h, primary_s: preset.primary.s, primary_l: preset.primary.l,
      accent_h: preset.accent.h, accent_s: preset.accent.s, accent_l: preset.accent.l,
    }));
    toast.info(`${preset.name} থিম প্রয়োগ হয়েছে`);
  };

  const updateTheme = (key: string, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const ColorPicker = ({ label, hKey, sKey, lKey }: { label: string; hKey: string; sKey: string; lKey: string }) => (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hslToHex(Number(theme[hKey]), Number(theme[sKey]), Number(theme[lKey]))}
            onChange={(e) => {
              const { h, s, l } = hexToHsl(e.target.value);
              updateTheme(hKey, String(h));
              updateTheme(sKey, String(s));
              updateTheme(lKey, String(l));
            }}
            className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer"
          />
          <div
            className="w-10 h-10 rounded-lg border-2 border-border shadow-sm"
            style={{ backgroundColor: `hsl(${theme[hKey]}, ${theme[sKey]}%, ${theme[lKey]}%)` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: 'H', key: hKey, max: 360 },
          { label: 'S', key: sKey, max: 100 },
          { label: 'L', key: lKey, max: 100 },
        ].map(({ label: l, key, max }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">{l}</span>
            <Slider min={0} max={max} step={1} value={[Number(theme[key])]} onValueChange={v => updateTheme(key, String(v[0]))} className="flex-1" />
            <Input className="w-16 h-7 text-xs" value={theme[key]} onChange={e => updateTheme(key, e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6 text-primary" /> অ্যাপিয়ারেন্স ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground mt-1">থিম, কালার, ফন্ট, হেডার, ফুটার, বাটন এবং সম্পূর্ণ ডিজাইন কাস্টমাইজ করুন</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}><RotateCcw className="h-4 w-4 mr-1" /> রিসেট</Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="h-4 w-4 mr-1" /> {previewMode ? 'লাইভ প্রিভিউ বন্ধ' : 'লাইভ প্রিভিউ'}
            </Button>
            <Button size="sm" onClick={saveThemeSettings} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</Button>
          </div>
        </div>

        {/* Preset Themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">প্রিসেট থিম</CardTitle>
            <CardDescription>দ্রুত থিম পরিবর্তন করতে একটি প্রিসেট বেছে নিন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {presetThemes.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex -space-x-1">
                    <div className="w-5 h-5 rounded-full border border-background" style={{ backgroundColor: `hsl(${preset.primary.h}, ${preset.primary.s}%, ${preset.primary.l}%)` }} />
                    <div className="w-5 h-5 rounded-full border border-background" style={{ backgroundColor: `hsl(${preset.accent.h}, ${preset.accent.s}%, ${preset.accent.l}%)` }} />
                  </div>
                  <span className="text-sm font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inline Preview */}
        {previewMode && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">লাইভ প্রিভিউ</CardTitle>
                <div className="flex gap-1">
                  <Button variant={previewDevice === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('desktop')}>ডেস্কটপ</Button>
                  <Button variant={previewDevice === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('mobile')}>মোবাইল</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`mx-auto rounded-lg overflow-hidden border border-border ${previewDevice === 'mobile' ? 'max-w-[375px]' : ''}`}>
                {/* Preview Header */}
                <div className="p-3 border-b" style={{ backgroundColor: `hsl(${theme.header_bg_h}, ${theme.header_bg_s}%, ${theme.header_bg_l}%)`, color: `hsl(${theme.header_text_h}, ${theme.header_text_s}%, ${theme.header_text_l}%)` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ fontFamily: theme.heading_font }}>সাইট নাম</span>
                    <div className="flex gap-2 text-xs">
                      <span>🔍</span><span>❤️</span><span>🛒</span>
                    </div>
                  </div>
                </div>
                {/* Preview Nav */}
                <div className="p-2 border-b flex gap-2 text-xs" style={{ backgroundColor: `hsl(${theme.nav_bg_h}, ${theme.nav_bg_s}%, ${theme.nav_bg_l}%)`, color: `hsl(${theme.nav_text_h}, ${theme.nav_text_s}%, ${theme.nav_text_l}%)` }}>
                  <span className="px-2 py-1 rounded" style={{ backgroundColor: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%, 0.1)`, color: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)` }}>হোম</span>
                  <span className="px-2 py-1">বই</span>
                  <span className="px-2 py-1">অফার</span>
                </div>
                {/* Preview Body */}
                <div className="p-4" style={{ backgroundColor: `hsl(${theme.background_h}, ${theme.background_s}%, ${theme.background_l}%)`, color: `hsl(${theme.foreground_h}, ${theme.foreground_s}%, ${theme.foreground_l}%)`, fontFamily: theme.font_family, fontSize: `${theme.font_size_base}px` }}>
                  <h2 style={{ fontFamily: theme.heading_font }} className="text-lg font-bold mb-2">প্রিভিউ শিরোনাম</h2>
                  <p className="text-sm mb-3 opacity-70">এটি একটি প্রিভিউ টেক্সট।</p>
                  <div className="flex gap-2 mb-4">
                    <button style={{ backgroundColor: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)`, color: 'white', padding: '6px 16px', borderRadius: `${theme.button_radius}rem`, fontSize: '13px' }}>প্রাইমারি</button>
                    <button style={{ backgroundColor: `hsl(${theme.accent_h}, ${theme.accent_s}%, ${theme.accent_l}%)`, color: 'white', padding: '6px 16px', borderRadius: `${theme.button_radius}rem`, fontSize: '13px' }}>অ্যাকসেন্ট</button>
                    <button style={{ border: `2px solid hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)`, color: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)`, padding: '6px 16px', borderRadius: `${theme.button_radius}rem`, fontSize: '13px', background: 'transparent' }}>আউটলাইন</button>
                  </div>
                  <div className={`grid ${previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: `hsl(${theme.background_h}, ${theme.background_s}%, ${Math.min(Number(theme.background_l) + 3, 100)}%)`, borderRadius: `${theme.border_radius}rem` }}>
                        <div className="w-full h-12 rounded mb-2" style={{ backgroundColor: `hsl(${theme.muted_h}, ${theme.muted_s}%, ${theme.muted_l}%)` }} />
                        <div className="text-xs font-medium">প্রোডাক্ট {i}</div>
                        <div style={{ color: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)` }} className="text-sm font-bold">৳ {i * 150}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Preview Footer */}
                <div className="p-3 border-t text-xs" style={{ backgroundColor: `hsl(${theme.footer_bg_h}, ${theme.footer_bg_s}%, ${theme.footer_bg_l}%)`, color: `hsl(${theme.footer_text_h}, ${theme.footer_text_s}%, ${theme.footer_text_l}%)` }}>
                  <span className="opacity-70">© 2025 সাইট নাম - ফুটার প্রিভিউ</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="colors">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-1" /> কালার</TabsTrigger>
            <TabsTrigger value="header"><PanelTop className="h-4 w-4 mr-1" /> হেডার</TabsTrigger>
            <TabsTrigger value="footer"><PanelBottom className="h-4 w-4 mr-1" /> ফুটার</TabsTrigger>
            <TabsTrigger value="buttons"><MousePointerClick className="h-4 w-4 mr-1" /> বাটন</TabsTrigger>
            <TabsTrigger value="fonts"><Type className="h-4 w-4 mr-1" /> ফন্ট</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="h-4 w-4 mr-1" /> লেআউট</TabsTrigger>
            <TabsTrigger value="sections"><Layers className="h-4 w-4 mr-1" /> সেকশন</TabsTrigger>
            <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1" /> লিংক</TabsTrigger>
            <TabsTrigger value="advanced"><Moon className="h-4 w-4 mr-1" /> অ্যাডভান্সড</TabsTrigger>
          </TabsList>

          {/* COLORS TAB */}
          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker label="প্রাইমারি কালার" hKey="primary_h" sKey="primary_s" lKey="primary_l" />
              <ColorPicker label="অ্যাকসেন্ট কালার" hKey="accent_h" sKey="accent_s" lKey="accent_l" />
              <ColorPicker label="ব্যাকগ্রাউন্ড" hKey="background_h" sKey="background_s" lKey="background_l" />
              <ColorPicker label="টেক্সট কালার" hKey="foreground_h" sKey="foreground_s" lKey="foreground_l" />
              <ColorPicker label="সেকেন্ডারি কালার" hKey="secondary_h" sKey="secondary_s" lKey="secondary_l" />
              <ColorPicker label="ডেসট্রাকটিভ কালার" hKey="destructive_h" sKey="destructive_s" lKey="destructive_l" />
              <ColorPicker label="মিউটেড কালার" hKey="muted_h" sKey="muted_s" lKey="muted_l" />
            </div>
            <Card>
              <CardContent className="pt-6">
                <Label>বর্ডার রেডিয়াস (rem)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider min={0} max={2} step={0.125} value={[Number(theme.border_radius)]} onValueChange={v => updateTheme('border_radius', String(v[0]))} />
                  <span className="text-sm font-mono w-16">{theme.border_radius}rem</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {['0', '0.25', '0.5', '0.75', '1', '1.5'].map(v => (
                    <button key={v} onClick={() => updateTheme('border_radius', v)}
                      className={`px-3 py-1 text-xs rounded border ${theme.border_radius === v ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HEADER TAB */}
          <TabsContent value="header" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker label="হেডার ব্যাকগ্রাউন্ড" hKey="header_bg_h" sKey="header_bg_s" lKey="header_bg_l" />
              <ColorPicker label="হেডার টেক্সট কালার" hKey="header_text_h" sKey="header_text_s" lKey="header_text_l" />
              <ColorPicker label="নেভিগেশন ব্যাকগ্রাউন্ড" hKey="nav_bg_h" sKey="nav_bg_s" lKey="nav_bg_l" />
              <ColorPicker label="নেভিগেশন টেক্সট কালার" hKey="nav_text_h" sKey="nav_text_s" lKey="nav_text_l" />
            </div>
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
              <CardHeader><CardTitle className="text-base">নেভ অ্যাক্টিভ স্টাইল</CardTitle></CardHeader>
              <CardContent>
                <Select value={theme.nav_active_style} onValueChange={v => updateTheme('nav_active_style', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight">হাইলাইট</SelectItem>
                    <SelectItem value="underline">আন্ডারলাইন</SelectItem>
                    <SelectItem value="bold">বোল্ড</SelectItem>
                    <SelectItem value="pill">পিল</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FOOTER TAB */}
          <TabsContent value="footer" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker label="ফুটার ব্যাকগ্রাউন্ড" hKey="footer_bg_h" sKey="footer_bg_s" lKey="footer_bg_l" />
              <ColorPicker label="ফুটার টেক্সট কালার" hKey="footer_text_h" sKey="footer_text_s" lKey="footer_text_l" />
            </div>
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
                    <SelectItem value="gradient">গ্রেডিয়েন্ট</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BUTTONS TAB */}
          <TabsContent value="buttons" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">বাটন বর্ডার রেডিয়াস</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Slider min={0} max={2} step={0.125} value={[Number(theme.button_radius)]} onValueChange={v => updateTheme('button_radius', String(v[0]))} />
                  <span className="text-sm font-mono w-16">{theme.button_radius}rem</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['0', '0.25', '0.375', '0.5', '1', '9999'].map(v => (
                    <button key={v} onClick={() => updateTheme('button_radius', v)}
                      className="px-4 py-2 text-sm text-primary-foreground"
                      style={{ backgroundColor: `hsl(${theme.primary_h}, ${theme.primary_s}%, ${theme.primary_l}%)`, borderRadius: `${v === '9999' ? '9999px' : v + 'rem'}` }}>
                      {v === '9999' ? 'ফুল রাউন্ড' : `${v}rem`}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">বাটন সাইজ</CardTitle></CardHeader>
              <CardContent>
                <Select value={theme.button_size} onValueChange={v => updateTheme('button_size', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">ছোট</SelectItem>
                    <SelectItem value="default">ডিফল্ট</SelectItem>
                    <SelectItem value="lg">বড়</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FONTS TAB */}
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
              <CardHeader><CardTitle className="text-base">ফন্ট সাইজ (বেস)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Slider min={12} max={20} step={1} value={[Number(theme.font_size_base)]} onValueChange={v => updateTheme('font_size_base', String(v[0]))} />
                  <span className="text-sm font-mono w-12">{theme.font_size_base}px</span>
                </div>
                <p className="mt-2" style={{ fontSize: `${theme.font_size_base}px` }}>এই সাইজে টেক্সট দেখাবে ({theme.font_size_base}px)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">কাস্টম গুগল ফন্ট</CardTitle><CardDescription>গুগল ফন্টস থেকে যেকোনো ফন্ট নাম লিখুন</CardDescription></CardHeader>
              <CardContent>
                <Input placeholder="যেমন: Tiro Bangla" onChange={e => {
                  const name = e.target.value.trim();
                  if (name) {
                    // Dynamically load Google Font
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&display=swap`;
                    document.head.appendChild(link);
                  }
                }} />
                <p className="text-xs text-muted-foreground mt-2">ফন্ট লোড হলে উপরের বডি/হেডিং ড্রপডাউনে নাম লিখে সিলেক্ট করুন।</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LAYOUT TAB */}
          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">প্রোডাক্ট গ্রিড কলাম</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.product_grid_columns} onValueChange={v => updateTheme('product_grid_columns', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['2', '3', '4', '5', '6'].map(v => <SelectItem key={v} value={v}>{v} কলাম</SelectItem>)}
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
                      {[['none', 'কোন শ্যাডো নেই'], ['sm', 'ছোট'], ['md', 'মাঝারি'], ['lg', 'বড়'], ['xl', 'অতিরিক্ত বড়']].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
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
                      {[['none', 'কোন বর্ডার নেই'], ['subtle', 'হালকা'], ['solid', 'সলিড'], ['thick', 'মোটা']].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SECTIONS TAB */}
          <TabsContent value="sections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">সেকশন বর্ডার</CardTitle><CardDescription>প্রতিটি সেকশনের মধ্যে ডিভাইডার</CardDescription></CardHeader>
                <CardContent>
                  <Select value={theme.section_border_style} onValueChange={v => updateTheme('section_border_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[['none', 'কোন বর্ডার নেই'], ['line', 'সরু লাইন'], ['dashed', 'ড্যাশড'], ['dotted', 'ডটেড'], ['gradient', 'গ্রেডিয়েন্ট']].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">সেকশন ব্যাকগ্রাউন্ড</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.section_bg_style} onValueChange={v => updateTheme('section_bg_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[['transparent', 'স্বচ্ছ'], ['alternate', 'বিকল্প রঙ'], ['subtle', 'হালকা টিন্ট'], ['gradient', 'গ্রেডিয়েন্ট']].map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">সেকশন স্পেসিং</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.section_spacing} onValueChange={v => updateTheme('section_spacing', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">কমপ্যাক্ট</SelectItem>
                      <SelectItem value="normal">নরমাল</SelectItem>
                      <SelectItem value="spacious">স্পেসিয়াস</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LINKS TAB */}
          <TabsContent value="links" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorPicker label="লিংক কালার" hKey="link_color_h" sKey="link_color_s" lKey="link_color_l" />
              <Card>
                <CardHeader><CardTitle className="text-base">লিংক হোভার স্টাইল</CardTitle></CardHeader>
                <CardContent>
                  <Select value={theme.link_hover_style} onValueChange={v => updateTheme('link_hover_style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="underline">আন্ডারলাইন</SelectItem>
                      <SelectItem value="color">কালার চেঞ্জ</SelectItem>
                      <SelectItem value="bold">বোল্ড</SelectItem>
                      <SelectItem value="none">কিছু নয়</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ডার্ক মোড</CardTitle>
                <CardDescription>ব্যবহারকারীদের জন্য ডার্ক মোড সুইচ সক্রিয় করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>ডার্ক মোড টগল দেখান</Label>
                  <Switch checked={theme.dark_mode_enabled === 'true'} onCheckedChange={v => updateTheme('dark_mode_enabled', String(v))} />
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
                  <Switch checked={theme.maintenance_mode === 'true'} onCheckedChange={v => updateTheme('maintenance_mode', String(v))} />
                </div>
                {theme.maintenance_mode === 'true' && (
                  <div>
                    <Label>মেইনটেন্যান্স মেসেজ</Label>
                    <Input className="mt-1" value={theme.maintenance_message} onChange={e => updateTheme('maintenance_message', e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">কাস্টম CSS</CardTitle>
                <CardDescription>অতিরিক্ত CSS যুক্ত করুন সাইটে প্রয়োগ করতে</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={`/* কাস্টম CSS এখানে লিখুন */\n.my-class { color: red; }`}
                  rows={6}
                  className="font-mono text-sm"
                  value={theme.custom_css || ''}
                  onChange={e => updateTheme('custom_css', e.target.value)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Utility: HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Utility: Hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default AdminAppearance;
