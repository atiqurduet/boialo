import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Type, Bell, ShoppingCart, FileText } from "lucide-react";
import { LogoUpload } from "@/components/admin/LogoUpload";

interface BrandingSettings {
  header_logo: string;
  footer_logo: string;
  favicon: string;
  site_name: string;
  footer_description: string;
  copyright_text: string;
  pre_header_text: string;
  pre_header_link: string;
  pre_header_enabled: boolean;
  preorder_message: string;
  invoice_company_name: string;
  invoice_company_tagline: string;
  invoice_company_address: string;
  invoice_company_phone: string;
  invoice_company_email: string;
  invoice_footer_text: string;
}

const defaultSettings: BrandingSettings = {
  header_logo: '',
  footer_logo: '',
  favicon: '',
  site_name: 'বইআলো',
  footer_description: 'বাংলাদেশের সবচেয়ে বড় অনলাইন বই ও লাইফস্টাইল শপ।',
  copyright_text: '© 2024 বইআলো. সর্বস্বত্ব সংরক্ষিত।',
  pre_header_text: '🎉 সকল বইয়ে ১৫% ছাড়! কোড: BOOK15',
  pre_header_link: '/offers',
  pre_header_enabled: true,
  preorder_message: 'আমাদের জানিয়েছেন এই পণ্যটি {release_date} প্রকাশিত হতে পারে। প্রকাশিত হওয়ার সাথে সাথে পণ্যটি পেতে আগেই অর্ডার করে রাখুন।',
  invoice_company_name: 'বইআলো',
  invoice_company_tagline: 'আপনার বিশ্বস্ত অনলাইন বই স্টোর',
  invoice_company_address: 'ঢাকা, বাংলাদেশ',
  invoice_company_phone: '+880 1XXX-XXXXXX',
  invoice_company_email: 'support@boialo.com',
  invoice_footer_text: 'ধন্যবাদ আপনার অর্ডারের জন্য!',
};

export default function AdminBranding() {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .or('category.eq.branding,category.eq.invoice,setting_key.eq.preorder_message');

      if (error) throw error;

      if (data) {
        const newSettings = { ...defaultSettings };
        data.forEach(item => {
          const value = item.setting_value;
          const key = item.setting_key;
          if (key === 'pre_header_enabled') {
            newSettings.pre_header_enabled = value === true || value === 'true';
          } else if (key === 'preorder_message') {
            newSettings.preorder_message = typeof value === 'string' ? value.replace(/^"|"$/g, '') : String(value || '');
          } else if (key in newSettings) {
            (newSettings as Record<string, unknown>)[key] = typeof value === 'string' ? value : String(value || '');
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
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ব্র্যান্ডিং সেটিংস</h1>
            <p className="text-muted-foreground">
              হেডার, ফুটার এবং প্রি-হেডার কাস্টমাইজ করুন
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            সংরক্ষণ করুন
          </Button>
        </div>

        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              লোগো সেটিংস
            </CardTitle>
            <CardDescription>
              হেডার এবং ফুটার লোগো আপডেট করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_name">সাইটের নাম</Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => updateSetting('site_name', e.target.value)}
                  placeholder="WafiLife"
                />
              </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Pre-Header Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              প্রি-হেডার (ঘোষণা বার)
            </CardTitle>
            <CardDescription>
              হেডারের উপরে ঘোষণা বার কাস্টমাইজ করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pre_header_enabled">প্রি-হেডার দেখান</Label>
              <Switch
                id="pre_header_enabled"
                checked={settings.pre_header_enabled}
                onCheckedChange={(checked) => updateSetting('pre_header_enabled', checked)}
              />
            </div>
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
          </CardContent>
        </Card>

        {/* Footer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
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
            </div>
          </CardContent>
        </Card>

        {/* Pre-Order Message Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              প্রি-অর্ডার মেসেজ
            </CardTitle>
            <CardDescription>
              প্রি-অর্ডার পণ্যের জন্য কাস্টম মেসেজ সেট করুন। {'{release_date}'} প্লেসহোল্ডার ব্যবহার করুন।
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ইনভয়েস সেটিংস
            </CardTitle>
            <CardDescription>
              ইনভয়েস এবং ডেলিভারি স্লিপে কোম্পানির তথ্য কাস্টমাইজ করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Input
                id="invoice_company_address"
                value={settings.invoice_company_address}
                onChange={(e) => updateSetting('invoice_company_address', e.target.value)}
                placeholder="ঢাকা, বাংলাদেশ"
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
      </div>
    </AdminLayout>
  );
}
