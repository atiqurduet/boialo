import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
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
  ExternalLink,
  Shield,
  UserCheck,
  Settings,
  Lock,
  Smartphone,
  Eye,
  EyeOff
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

interface OTPSetting {
  id: string;
  setting_key: string;
  setting_value: boolean;
  description: string | null;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch OTP settings
  const { data: otpSettings, isLoading: otpLoading } = useQuery({
    queryKey: ["otp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("category", "security")
        .in("setting_key", ["otp_enabled", "otp_required_for_cod", "otp_required_for_new_customers", "otp_only_for_cod"]);
      
      if (error) throw error;
      
      return data.map(setting => ({
        ...setting,
        setting_value: setting.setting_value === true || setting.setting_value === "true"
      })) as OTPSetting[];
    },
  });

  const updateOTPMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-settings"] });
      sonnerToast.success("সিকিউরিটি সেটিংস আপডেট হয়েছে");
    },
    onError: (error) => {
      sonnerToast.error("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    },
  });

  const getOTPSetting = (key: string) => {
    return otpSettings?.find(s => s.setting_key === key)?.setting_value ?? false;
  };

  const toggleOTPSetting = (key: string, currentValue: boolean) => {
    updateOTPMutation.mutate({ key, value: !currentValue });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .not('category', 'in', '("branding","invoice","security")')
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

  const toggleShowSensitive = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
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

  const otpSettingConfig = [
    {
      key: "otp_enabled",
      title: "OTP ভেরিফিকেশন সক্রিয়",
      description: "সমস্ত অর্ডারের জন্য ফোন নম্বর OTP ভেরিফিকেশন সক্রিয় করুন",
      icon: Shield,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "otp_only_for_cod",
      title: "শুধুমাত্র COD অর্ডারে OTP",
      description: "OTP শুধুমাত্র ক্যাশ অন ডেলিভারি অর্ডারের জন্য প্রযোজ্য",
      icon: Smartphone,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      key: "otp_required_for_cod",
      title: "COD অর্ডারে OTP বাধ্যতামূলক",
      description: "ক্যাশ অন ডেলিভারি অর্ডারের জন্য OTP ভেরিফিকেশন প্রয়োজন",
      icon: Lock,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      key: "otp_required_for_new_customers",
      title: "নতুন কাস্টমারদের জন্য OTP",
      description: "শুধুমাত্র নতুন কাস্টমারদের জন্য OTP ভেরিফিকেশন প্রয়োজন",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  const activeOTPCount = otpSettings?.filter(s => s.setting_value).length ?? 0;

  const isSensitiveField = (key: string) => {
    return key.includes('api_key') || key.includes('secret') || key.includes('pixel_id') || key.includes('analytics_id');
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
    const isSensitive = isSensitiveField(setting.setting_key);
    const showValue = showSensitive[setting.setting_key];

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
          type={isSensitive && !showValue ? 'password' : (setting.setting_type === 'number' ? 'number' : 'text')}
          value={value}
          onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
          className={`mt-1 ${isUrl || isSensitive ? 'pr-10' : ''}`}
          placeholder={setting.description || ''}
        />
        {isSensitive && (
          <button 
            type="button"
            onClick={() => toggleShowSensitive(setting.setting_key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 p-1 hover:bg-muted rounded"
          >
            {showValue ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        {isUrl && value && !isSensitive && (
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
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">সাইট সেটিংস</h1>
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  অসংরক্ষিত
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">সাইটের সকল সেটিংস এক জায়গায়</p>
          </div>
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="lg">
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

        {/* Main Tabs */}
        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="security" className="gap-2 py-2.5 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4" />
              <span>সিকিউরিটি</span>
              {activeOTPCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{activeOTPCount}</Badge>
              )}
            </TabsTrigger>
            {categories.map(category => {
              const config = categoryConfig[category];
              const Icon = config?.icon || Globe;
              return (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="gap-2 py-2.5 px-4"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config?.title || category}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Security/OTP Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Status Alert */}
              <Card className={activeOTPCount > 0 ? "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800" : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800"}>
                <CardContent className="flex items-center gap-3 py-4">
                  {activeOTPCount > 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-800 dark:text-green-300 font-medium">
                        OTP সুরক্ষা সক্রিয় ({activeOTPCount} সেটিং)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <span className="text-orange-800 dark:text-orange-300 font-medium">
                        OTP সুরক্ষা নিষ্ক্রিয় - ফ্রড অর্ডার বাড়তে পারে
                      </span>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* OTP Settings Grid */}
              {otpLoading ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    লোড হচ্ছে...
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {otpSettingConfig.map((config) => {
                    const isEnabled = getOTPSetting(config.key);
                    const Icon = config.icon;
                    
                    return (
                      <Card 
                        key={config.key}
                        className={`transition-all duration-200 hover:shadow-md ${isEnabled ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-muted-foreground/30'}`}
                      >
                        <CardContent className="py-5">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${config.bgColor}`}>
                              <Icon className={`h-5 w-5 ${config.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{config.title}</h3>
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">{config.description}</p>
                            </div>
                            
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleOTPSetting(config.key, isEnabled)}
                              disabled={updateOTPMutation.isPending}
                              className="data-[state=checked]:bg-primary"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Info Section */}
              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    OTP কীভাবে কাজ করে?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground pt-0">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>কাস্টমার চেকআউটে ৬ সংখ্যার OTP পাবেন</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>OTP ৫ মিনিটের মধ্যে ভেরিফাই করতে হবে</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>ভেরিফাইড কাস্টমার দ্রুত চেকআউট করতে পারবেন</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>SMS প্রোভাইডার সক্রিয় থাকতে হবে</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Other Settings Tabs */}
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
