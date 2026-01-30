import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Share2, 
  Search, 
  Truck, 
  BarChart3,
  Facebook,
  Youtube,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Setting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  category: string;
  description: string | null;
}

interface SettingGroup {
  icon: any;
  title: string;
  description: string;
  settings: Setting[];
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .not('category', 'in', '("branding","invoice")')
        .order('category', { ascending: true });

      if (error) throw error;
      
      setSettings(data || []);
      
      const initialFormData: Record<string, string> = {};
      data?.forEach(setting => {
        initialFormData[setting.setting_key] = 
          typeof setting.setting_value === 'string' 
            ? setting.setting_value.replace(/^"|"$/g, '') 
            : String(setting.setting_value || '');
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: 'Error', description: 'সেটিংস লোড করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        const value = formData[setting.setting_key];
        const jsonValue = setting.setting_type === 'number' 
          ? Number(value) 
          : value;

        const { error } = await supabase
          .from('site_settings')
          .update({ setting_value: jsonValue })
          .eq('id', setting.id);

        if (error) throw error;
      }

      setLastSaved(new Date());
      setHasChanges(false);
      toast({ title: 'সফল', description: 'সেটিংস সেভ হয়েছে' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  const categoryConfig: Record<string, { icon: any; title: string; description: string }> = {
    general: { 
      icon: Globe, 
      title: 'সাধারণ সেটিংস', 
      description: 'সাইটের বেসিক তথ্য' 
    },
    contact: { 
      icon: Phone, 
      title: 'যোগাযোগ তথ্য', 
      description: 'ফোন, ইমেইল এবং ঠিকানা' 
    },
    social: { 
      icon: Share2, 
      title: 'সোশ্যাল মিডিয়া', 
      description: 'সোশ্যাল মিডিয়া লিংক' 
    },
    seo: { 
      icon: Search, 
      title: 'এসইও সেটিংস', 
      description: 'সার্চ ইঞ্জিন অপ্টিমাইজেশন' 
    },
    shipping: { 
      icon: Truck, 
      title: 'শিপিং সেটিংস', 
      description: 'ডেলিভারি চার্জ এবং নিয়ম' 
    },
    analytics: { 
      icon: BarChart3, 
      title: 'অ্যানালিটিক্স ও পিক্সেল', 
      description: 'Google Analytics, Facebook Pixel' 
    },
  };

  const renderSettingInput = (setting: Setting) => {
    const value = formData[setting.setting_key] || '';
    const isTextArea = setting.setting_key.includes('description') || 
                       setting.setting_key.includes('address') ||
                       setting.setting_key.includes('script');
    const isUrl = setting.setting_key.includes('url') || 
                  setting.setting_key.includes('link') ||
                  setting.setting_key.includes('facebook') ||
                  setting.setting_key.includes('youtube') ||
                  setting.setting_key.includes('instagram');

    if (isTextArea) {
      return (
        <Textarea
          id={setting.setting_key}
          value={value}
          onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
          className="mt-1"
          rows={3}
          placeholder={setting.description || ''}
        />
      );
    }

    return (
      <div className="relative">
        <Input
          id={setting.setting_key}
          type={setting.setting_type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
          className={`mt-1 ${isUrl ? 'pr-10' : ''}`}
          placeholder={setting.description || ''}
        />
        {isUrl && value && (
          <a 
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 p-1 hover:bg-muted rounded"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        )}
      </div>
    );
  };

  const getSettingLabel = (setting: Setting) => {
    // Friendly labels for common settings
    const labels: Record<string, string> = {
      contact_phone: 'ফোন নম্বর',
      contact_email: 'ইমেইল',
      contact_address: 'ঠিকানা',
      contact_whatsapp: 'হোয়াটসঅ্যাপ',
      facebook_url: 'ফেসবুক লিংক',
      youtube_url: 'ইউটিউব লিংক',
      instagram_url: 'ইনস্টাগ্রাম লিংক',
      twitter_url: 'টুইটার/এক্স লিংক',
      meta_title: 'মেটা টাইটেল',
      meta_description: 'মেটা ডেসক্রিপশন',
      google_analytics_id: 'Google Analytics ID',
      facebook_pixel_id: 'Facebook Pixel ID',
      shipping_dhaka: 'ঢাকার ভেতর ডেলিভারি চার্জ',
      shipping_outside: 'ঢাকার বাইরে ডেলিভারি চার্জ',
      free_shipping_min: 'ফ্রি শিপিং মিনিমাম অর্ডার',
    };
    return labels[setting.setting_key] || setting.description || setting.setting_key;
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('phone') || key.includes('whatsapp')) return Phone;
    if (key.includes('email')) return Mail;
    if (key.includes('address')) return MapPin;
    if (key.includes('facebook')) return Facebook;
    if (key.includes('youtube')) return Youtube;
    return null;
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

  const categories = Object.keys(groupedSettings);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">সাইট সেটিংস</h1>
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  অসংরক্ষিত
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">যোগাযোগ, সোশ্যাল মিডিয়া, এসইও এবং শিপিং সেটিংস</p>
          </div>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            সেভ করুন
          </Button>
        </div>

        {/* Last Saved Indicator */}
        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            সর্বশেষ সংরক্ষিত: {lastSaved.toLocaleTimeString('bn-BD')}
          </div>
        )}

        {/* Settings Tabs */}
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">কোনো সেটিংস পাওয়া যায়নি</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={categories[0]} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              {categories.map(category => {
                const config = categoryConfig[category];
                const Icon = config?.icon || Globe;
                return (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="gap-2 py-2 px-3"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config?.title || category}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(groupedSettings).map(([category, categorySettings]) => {
              const config = categoryConfig[category];
              const Icon = config?.icon || Globe;
              
              return (
                <TabsContent key={category} value={category}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        {config?.title || category}
                      </CardTitle>
                      <CardDescription>
                        {config?.description || `${category} সেটিংস`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        {categorySettings.map(setting => {
                          const SettingIcon = getSettingIcon(setting.setting_key);
                          return (
                            <div key={setting.id} className="space-y-2">
                              <Label 
                                htmlFor={setting.setting_key}
                                className="flex items-center gap-2"
                              >
                                {SettingIcon && <SettingIcon className="w-4 h-4 text-muted-foreground" />}
                                {getSettingLabel(setting)}
                              </Label>
                              {renderSettingInput(setting)}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Quick Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">টিপস:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>লোগো ও ব্র্যান্ডিং সেটিংসের জন্য <a href="/admin/branding" className="text-primary hover:underline">ব্র্যান্ডিং পেজ</a> দেখুন</li>
                  <li>সোশ্যাল মিডিয়া লিংক সম্পূর্ণ URL দিন (https:// সহ)</li>
                  <li>Google Analytics ID ফরম্যাট: G-XXXXXXXXXX</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
