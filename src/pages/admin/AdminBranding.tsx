import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Image as ImageIcon, 
  Type, 
  Bell, 
  ShoppingCart, 
  FileText,
  Save,
  Eye,
  EyeOff,
  Palette,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { LogoUpload } from "@/components/admin/LogoUpload";

interface BrandingSettings {
  // Logo & Identity
  header_logo: string;
  footer_logo: string;
  favicon: string;
  site_name: string;
  site_tagline: string;
  
  // Footer
  footer_description: string;
  copyright_text: string;
  
  // Pre-Header / Announcement Bar
  pre_header_text: string;
  pre_header_link: string;
  pre_header_enabled: boolean;
  pre_header_bg_color: string;
  pre_header_text_color: string;
  
  // Pre-Order
  preorder_message: string;
  preorder_badge_text: string;
  
  // Invoice
  invoice_company_name: string;
  invoice_company_tagline: string;
  invoice_company_address: string;
  invoice_company_phone: string;
  invoice_company_email: string;
  invoice_footer_text: string;
  invoice_logo: string;
  
  // Theme
  primary_color: string;
  secondary_color: string;
}

const defaultSettings: BrandingSettings = {
  header_logo: '',
  footer_logo: '',
  favicon: '',
  site_name: 'বইআলো',
  site_tagline: 'বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ',
  footer_description: 'বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ।',
  copyright_text: '© 2024 বইআলো. সর্বস্বত্ব সংরক্ষিত।',
  pre_header_text: '🎉 সকল বইয়ে ১৫% ছাড়! কোড: BOOK15',
  pre_header_link: '/offers',
  pre_header_enabled: true,
  pre_header_bg_color: '#1e293b',
  pre_header_text_color: '#ffffff',
  preorder_message: 'আমাদের জানিয়েছেন এই পণ্যটি {release_date} প্রকাশিত হতে পারে। প্রকাশিত হওয়ার সাথে সাথে পণ্যটি পেতে আগেই অর্ডার করে রাখুন।',
  preorder_badge_text: 'প্রি-অর্ডার',
  invoice_company_name: 'বইআলো',
  invoice_company_tagline: 'আপনার বিশ্বস্ত অনলাইন বই স্টোর',
  invoice_company_address: 'ঢাকা, বাংলাদেশ',
  invoice_company_phone: '+880 1XXX-XXXXXX',
  invoice_company_email: 'support@boialo.com',
  invoice_footer_text: 'ধন্যবাদ আপনার অর্ডারের জন্য!',
  invoice_logo: '',
  primary_color: '#2563eb',
  secondary_color: '#64748b',
};

export default function AdminBranding() {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .or('category.eq.branding,category.eq.invoice,setting_key.eq.preorder_message,setting_key.eq.preorder_badge_text');

      if (error) throw error;

      if (data) {
        const newSettings = { ...defaultSettings };
        data.forEach(item => {
          const value = item.setting_value;
          const key = item.setting_key as keyof BrandingSettings;
          if (key === 'pre_header_enabled') {
            newSettings.pre_header_enabled = value === true || value === 'true';
          } else if (key in newSettings) {
            (newSettings as Record<string, unknown>)[key] = typeof value === 'string' ? value.replace(/^"|"$/g, '') : String(value || '');
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('সেটিংস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: typeof value === 'boolean' ? value : value,
        category: key.startsWith('invoice_') ? 'invoice' : 'branding',
        setting_type: key === 'pre_header_enabled' ? 'boolean' : 'string',
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      setLastSaved(new Date());
      setHasChanges(false);
      toast.success('সেটিংস সংরক্ষিত হয়েছে');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('সেটিংস সংরক্ষণে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.info('ডিফল্ট সেটিংসে রিসেট করা হয়েছে');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">লোড হচ্ছে...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">ব্র্যান্ডিং ও ডিজাইন</h1>
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  অসংরক্ষিত
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              লোগো, থিম, ঘোষণা বার এবং ইনভয়েস কাস্টমাইজ করুন
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
              <RefreshCw className="w-4 h-4 mr-2" />
              রিসেট
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              সংরক্ষণ করুন
            </Button>
          </div>
        </div>

        {/* Last Saved Indicator */}
        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            সর্বশেষ সংরক্ষিত: {lastSaved.toLocaleTimeString('bn-BD')}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-1 p-1">
            <TabsTrigger value="identity" className="gap-2 py-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">পরিচয়</span>
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-2 py-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">ঘোষণা</span>
            </TabsTrigger>
            <TabsTrigger value="footer" className="gap-2 py-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">ফুটার</span>
            </TabsTrigger>
            <TabsTrigger value="preorder" className="gap-2 py-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">প্রি-অর্ডার</span>
            </TabsTrigger>
            <TabsTrigger value="invoice" className="gap-2 py-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">ইনভয়েস</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Logo Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    লোগো সেটিংস
                  </CardTitle>
                  <CardDescription>
                    হেডার এবং ফুটার লোগো আপডেট করুন
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="site_name">সাইটের নাম</Label>
                    <Input
                      id="site_name"
                      value={settings.site_name}
                      onChange={(e) => updateSetting('site_name', e.target.value)}
                      placeholder="বইআলো"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_tagline">ট্যাগলাইন</Label>
                    <Input
                      id="site_tagline"
                      value={settings.site_tagline}
                      onChange={(e) => updateSetting('site_tagline', e.target.value)}
                      placeholder="আপনার বিশ্বস্ত অনলাইন স্টোর"
                    />
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>হেডার লোগো</Label>
                      <LogoUpload
                        value={settings.header_logo}
                        onChange={(url) => updateSetting('header_logo', url)}
                        label="Header Logo"
                        folder="header"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ফুটার লোগো</Label>
                      <LogoUpload
                        value={settings.footer_logo}
                        onChange={(url) => updateSetting('footer_logo', url)}
                        label="Footer Logo"
                        folder="footer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ফেভিকন</Label>
                    <LogoUpload
                      value={settings.favicon}
                      onChange={(url) => updateSetting('favicon', url)}
                      label="Favicon"
                      folder="favicon"
                    />
                    <p className="text-xs text-muted-foreground">
                      ব্রাউজার ট্যাবে দেখানো আইকন (সাজেস্টেড: ৩২x৩২ বা ৬৪x৬৪ পিক্সেল)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Eye className="w-5 h-5 text-primary" />
                      লাইভ প্রিভিউ
                    </CardTitle>
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                      <Button
                        variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setPreviewMode('desktop')}
                      >
                        <Monitor className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setPreviewMode('mobile')}
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`border rounded-lg overflow-hidden bg-background ${previewMode === 'mobile' ? 'max-w-[320px] mx-auto' : ''}`}>
                    {/* Preview Announcement Bar */}
                    {settings.pre_header_enabled && (
                      <div 
                        className="px-4 py-2 text-center text-sm"
                        style={{ 
                          backgroundColor: settings.pre_header_bg_color,
                          color: settings.pre_header_text_color 
                        }}
                      >
                        {settings.pre_header_text || 'ঘোষণা বার'}
                      </div>
                    )}
                    {/* Preview Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                      <div className="flex items-center gap-2">
                        {settings.header_logo ? (
                          <img src={settings.header_logo} alt="Logo" className="h-8 w-auto" />
                        ) : (
                          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
                            {settings.site_name?.[0] || 'ব'}
                          </div>
                        )}
                        <span className="font-semibold">{settings.site_name || 'সাইটের নাম'}</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 bg-muted rounded" />
                        <div className="w-6 h-6 bg-muted rounded" />
                      </div>
                    </div>
                    {/* Preview Content */}
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-1/2 bg-muted rounded" />
                    </div>
                    {/* Preview Footer */}
                    <div className="px-4 py-3 border-t bg-muted/30 text-center text-xs text-muted-foreground">
                      {settings.copyright_text || '© কপিরাইট টেক্সট'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Announcement Tab */}
          <TabsContent value="announcement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  ঘোষণা বার (প্রি-হেডার)
                </CardTitle>
                <CardDescription>
                  হেডারের উপরে প্রমোশনাল ঘোষণা বার কাস্টমাইজ করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {settings.pre_header_enabled ? (
                      <Eye className="w-5 h-5 text-green-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <Label htmlFor="pre_header_enabled" className="font-medium">ঘোষণা বার দেখান</Label>
                      <p className="text-sm text-muted-foreground">সাইটের শীর্ষে ঘোষণা বার প্রদর্শন করুন</p>
                    </div>
                  </div>
                  <Switch
                    id="pre_header_enabled"
                    checked={settings.pre_header_enabled}
                    onCheckedChange={(checked) => updateSetting('pre_header_enabled', checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pre_header_text">ঘোষণা টেক্সট</Label>
                    <Input
                      id="pre_header_text"
                      value={settings.pre_header_text}
                      onChange={(e) => updateSetting('pre_header_text', e.target.value)}
                      placeholder="🎉 বিশেষ অফার!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pre_header_link">ঘোষণা লিংক</Label>
                    <Input
                      id="pre_header_link"
                      value={settings.pre_header_link}
                      onChange={(e) => updateSetting('pre_header_link', e.target.value)}
                      placeholder="/offers"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    রঙ কাস্টমাইজ
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pre_header_bg_color">ব্যাকগ্রাউন্ড রঙ</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="pre_header_bg_color"
                          value={settings.pre_header_bg_color}
                          onChange={(e) => updateSetting('pre_header_bg_color', e.target.value)}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.pre_header_bg_color}
                          onChange={(e) => updateSetting('pre_header_bg_color', e.target.value)}
                          placeholder="#1e293b"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pre_header_text_color">টেক্সট রঙ</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="pre_header_text_color"
                          value={settings.pre_header_text_color}
                          onChange={(e) => updateSetting('pre_header_text_color', e.target.value)}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.pre_header_text_color}
                          onChange={(e) => updateSetting('pre_header_text_color', e.target.value)}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>প্রিভিউ</Label>
                  <div 
                    className="px-4 py-3 rounded-lg text-center"
                    style={{ 
                      backgroundColor: settings.pre_header_bg_color,
                      color: settings.pre_header_text_color 
                    }}
                  >
                    {settings.pre_header_text || 'ঘোষণা বার প্রিভিউ'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Footer Tab */}
          <TabsContent value="footer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-primary" />
                  ফুটার সেটিংস
                </CardTitle>
                <CardDescription>
                  ফুটার বিবরণ এবং কপিরাইট টেক্সট আপডেট করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="footer_description">ফুটার বিবরণ</Label>
                  <Textarea
                    id="footer_description"
                    value={settings.footer_description}
                    onChange={(e) => updateSetting('footer_description', e.target.value)}
                    placeholder="আপনার সাইটের বিবরণ..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copyright_text">কপিরাইট টেক্সট</Label>
                  <Input
                    id="copyright_text"
                    value={settings.copyright_text}
                    onChange={(e) => updateSetting('copyright_text', e.target.value)}
                    placeholder="© 2024 YourSite. সর্বস্বত্ব সংরক্ষিত।"
                  />
                  <p className="text-xs text-muted-foreground">
                    টিপ: বর্তমান বছর স্বয়ংক্রিয়ভাবে আপডেট হতে {'{year}'} ব্যবহার করুন
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pre-Order Tab */}
          <TabsContent value="preorder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  প্রি-অর্ডার সেটিংস
                </CardTitle>
                <CardDescription>
                  প্রি-অর্ডার পণ্যের জন্য কাস্টম মেসেজ এবং ব্যাজ সেট করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preorder_badge_text">প্রি-অর্ডার ব্যাজ টেক্সট</Label>
                  <Input
                    id="preorder_badge_text"
                    value={settings.preorder_badge_text}
                    onChange={(e) => updateSetting('preorder_badge_text', e.target.value)}
                    placeholder="প্রি-অর্ডার"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">প্রিভিউ:</span>
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      {settings.preorder_badge_text || 'প্রি-অর্ডার'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preorder_message">প্রি-অর্ডার মেসেজ</Label>
                  <Textarea
                    id="preorder_message"
                    value={settings.preorder_message}
                    onChange={(e) => updateSetting('preorder_message', e.target.value)}
                    placeholder="আমাদের জানিয়েছেন এই পণ্যটি {release_date} প্রকাশিত হতে পারে..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {'{release_date}'} স্বয়ংক্রিয়ভাবে পণ্যের প্রকাশের তারিখ দিয়ে প্রতিস্থাপিত হবে
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  ইনভয়েস সেটিংস
                </CardTitle>
                <CardDescription>
                  ইনভয়েস এবং ডেলিভারি স্লিপে কোম্পানির তথ্য কাস্টমাইজ করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>ইনভয়েস লোগো</Label>
                  <LogoUpload
                    value={settings.invoice_logo}
                    onChange={(url) => updateSetting('invoice_logo', url)}
                    label="Invoice Logo"
                    folder="invoice"
                  />
                  <p className="text-xs text-muted-foreground">
                    ইনভয়েস/ডেলিভারি স্লিপে ব্যবহৃত হবে। খালি রাখলে হেডার লোগো ব্যবহার হবে।
                  </p>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_company_name">কোম্পানির নাম</Label>
                    <Input
                      id="invoice_company_name"
                      value={settings.invoice_company_name}
                      onChange={(e) => updateSetting('invoice_company_name', e.target.value)}
                      placeholder="বইআলো"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_company_tagline">ট্যাগলাইন</Label>
                    <Input
                      id="invoice_company_tagline"
                      value={settings.invoice_company_tagline}
                      onChange={(e) => updateSetting('invoice_company_tagline', e.target.value)}
                      placeholder="আপনার বিশ্বস্ত অনলাইন বই স্টোর"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_company_address">ঠিকানা</Label>
                  <Textarea
                    id="invoice_company_address"
                    value={settings.invoice_company_address}
                    onChange={(e) => updateSetting('invoice_company_address', e.target.value)}
                    placeholder="ঢাকা, বাংলাদেশ"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_company_phone">ফোন নম্বর</Label>
                    <Input
                      id="invoice_company_phone"
                      value={settings.invoice_company_phone}
                      onChange={(e) => updateSetting('invoice_company_phone', e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_company_email">ইমেইল</Label>
                    <Input
                      id="invoice_company_email"
                      value={settings.invoice_company_email}
                      onChange={(e) => updateSetting('invoice_company_email', e.target.value)}
                      placeholder="support@boialo.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_footer_text">ফুটার মেসেজ</Label>
                  <Input
                    id="invoice_footer_text"
                    value={settings.invoice_footer_text}
                    onChange={(e) => updateSetting('invoice_footer_text', e.target.value)}
                    placeholder="ধন্যবাদ আপনার অর্ডারের জন্য!"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
