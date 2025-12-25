import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

interface Setting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  category: string;
  description: string | null;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      setSettings(data || []);
      
      const initialFormData: Record<string, string> = {};
      data?.forEach(setting => {
        initialFormData[setting.setting_key] = 
          typeof setting.setting_value === 'string' 
            ? setting.setting_value.replace(/^"|"$/g, '') 
            : String(setting.setting_value);
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
          : JSON.stringify(value);

        const { error } = await supabase
          .from('site_settings')
          .update({ setting_value: jsonValue })
          .eq('id', setting.id);

        if (error) throw error;
      }

      toast({ title: 'সফল', description: 'সেটিংস সেভ হয়েছে' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  const categoryLabels: Record<string, string> = {
    general: 'সাধারণ',
    contact: 'যোগাযোগ',
    social: 'সোশ্যাল মিডিয়া',
    seo: 'এসইও',
    shipping: 'শিপিং'
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">সেটিংস</h1>
            <p className="text-muted-foreground">সাইট সেটিংস ম্যানেজ করুন</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center">লোড হচ্ছে...</div>
        ) : (
          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              {Object.keys(groupedSettings).map(category => (
                <TabsTrigger key={category} value={category}>
                  {categoryLabels[category] || category}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(groupedSettings).map(([category, categorySettings]) => (
              <TabsContent key={category} value={category}>
                <Card>
                  <CardHeader>
                    <CardTitle>{categoryLabels[category] || category} সেটিংস</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {categorySettings.map(setting => (
                      <div key={setting.id}>
                        <Label htmlFor={setting.setting_key}>
                          {setting.description || setting.setting_key}
                        </Label>
                        <Input
                          id={setting.setting_key}
                          type={setting.setting_type === 'number' ? 'number' : 'text'}
                          value={formData[setting.setting_key] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            [setting.setting_key]: e.target.value
                          })}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
