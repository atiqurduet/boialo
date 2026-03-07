import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  ShoppingCart, 
  Truck, 
  CreditCard, 
  RefreshCw, 
  Gift,
  UserPlus,
  Key,
  AlertCircle,
  CheckCircle2,
  Settings,
  Send,
  Eye,
  Loader2,
  Package,
  XCircle,
  Clock,
  MessageSquare
} from "lucide-react";

interface NotificationSetting {
  id: string;
  event_type: string;
  event_name_bn: string;
  event_name_en: string;
  description: string | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  is_active: boolean;
  sms_template: string | null;
  sort_order: number;
}

const eventIcons: Record<string, any> = {
  order_placed: ShoppingCart,
  order_processing: Package,
  order_shipped: Truck,
  order_delivered: CheckCircle2,
  order_cancelled: XCircle,
  payment_success: CreditCard,
  payment_failed: AlertCircle,
  refund_initiated: RefreshCw,
  refund_completed: CheckCircle2,
  abandoned_cart: Clock,
  new_offer: Gift,
  preorder_available: Package,
  otp_verification: Key,
  password_reset: Key,
  welcome: UserPlus,
};

const eventCategories = {
  order: ['order_placed', 'order_processing', 'order_shipped', 'order_delivered', 'order_cancelled'],
  payment: ['payment_success', 'payment_failed', 'refund_initiated', 'refund_completed'],
  marketing: ['abandoned_cart', 'new_offer', 'preorder_available'],
  auth: ['otp_verification', 'password_reset', 'welcome'],
};

const AdminNotifications = () => {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<NotificationSetting | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [smsTemplate, setSmsTemplate] = useState("");
  
  // Push notification state
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushType, setPushType] = useState("general");
  const [pushLink, setPushLink] = useState("");
  const [pushSending, setPushSending] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as NotificationSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotificationSetting> }) => {
      const { error } = await supabase
        .from("notification_settings")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("সেটিংস আপডেট হয়েছে");
    },
    onError: (error) => {
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    },
  });

  const toggleChannel = (id: string, channel: 'email_enabled' | 'sms_enabled', currentValue: boolean) => {
    updateMutation.mutate({ id, updates: { [channel]: !currentValue } });
  };

  const toggleActive = (id: string, currentValue: boolean) => {
    updateMutation.mutate({ id, updates: { is_active: !currentValue } });
  };

  const saveSmsTemplate = (id: string) => {
    updateMutation.mutate({ id, updates: { sms_template: smsTemplate } });
    setSelectedEvent(null);
  };

  // Recent push notifications
  const { data: recentPushNotifs, refetch: refetchPush } = useQuery({
    queryKey: ["admin-push-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || []) as any[];
    },
  });

  const sendPushNotification = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast.error("টাইটেল ও মেসেজ দিন");
      return;
    }
    setPushSending(true);
    try {
      const { data: users } = await supabase.from("profiles").select("id");
      if (!users?.length) { toast.error("কোনো ইউজার নেই"); return; }

      const notifs = users.map((u: any) => ({
        user_id: u.id,
        title: pushTitle.trim(),
        message: pushMessage.trim(),
        type: pushType,
        link: pushLink.trim() || null,
      }));

      for (let i = 0; i < notifs.length; i += 100) {
        const { error } = await supabase.from("user_notifications").insert(notifs.slice(i, i + 100) as any);
        if (error) throw error;
      }

      toast.success(`${users.length} জনকে পুশ নোটিফিকেশন পাঠানো হয়েছে`);
      setPushTitle(""); setPushMessage(""); setPushLink("");
      refetchPush();
    } catch (err: any) {
      toast.error("ত্রুটি: " + err.message);
    } finally {
      setPushSending(false);
    }
  };

  const getSettingsByCategory = (category: string) => {
    const eventTypes = eventCategories[category as keyof typeof eventCategories] || [];
    return settings?.filter(s => eventTypes.includes(s.event_type)) || [];
  };

  const activeCount = settings?.filter(s => s.is_active).length ?? 0;
  const emailActiveCount = settings?.filter(s => s.email_enabled && s.is_active).length ?? 0;
  const smsActiveCount = settings?.filter(s => s.sms_enabled && s.is_active).length ?? 0;

  const renderNotificationCard = (setting: NotificationSetting) => {
    const Icon = eventIcons[setting.event_type] || Bell;
    
    return (
      <Card 
        key={setting.id}
        className={`transition-all duration-200 ${setting.is_active ? 'border-primary/30' : 'opacity-60'}`}
      >
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${setting.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
              <Icon className={`h-5 w-5 ${setting.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{setting.event_name_bn}</h3>
                {!setting.is_active && (
                  <Badge variant="secondary" className="text-xs">নিষ্ক্রিয়</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{setting.description}</p>
              
              {/* Channel Toggles */}
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`email-${setting.id}`}
                    checked={setting.email_enabled}
                    onCheckedChange={() => toggleChannel(setting.id, 'email_enabled', setting.email_enabled)}
                    disabled={updateMutation.isPending || !setting.is_active}
                    className="data-[state=checked]:bg-blue-500"
                  />
                  <Label htmlFor={`email-${setting.id}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id={`sms-${setting.id}`}
                    checked={setting.sms_enabled}
                    onCheckedChange={() => toggleChannel(setting.id, 'sms_enabled', setting.sms_enabled)}
                    disabled={updateMutation.isPending || !setting.is_active}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor={`sms-${setting.id}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    SMS
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Edit Template Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedEvent(setting);
                      setSmsTemplate(setting.sms_template || "");
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {setting.event_name_bn} - টেমপ্লেট
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>SMS টেমপ্লেট</Label>
                      <Textarea
                        value={smsTemplate}
                        onChange={(e) => setSmsTemplate(e.target.value)}
                        placeholder="SMS মেসেজ টেমপ্লেট লিখুন... ভ্যারিয়েবল: {{order_number}}, {{customer_name}}, {{total}}"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        ভ্যারিয়েবল: {"{{order_number}}, {{customer_name}}, {{total}}, {{tracking_number}}"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>টেস্ট SMS পাঠান</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="01XXXXXXXXX"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                        />
                        <Button variant="outline" size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={() => saveSmsTemplate(setting.id)}>
                      সেভ করুন
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Active Toggle */}
              <Switch
                checked={setting.is_active}
                onCheckedChange={() => toggleActive(setting.id, setting.is_active)}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              নোটিফিকেশন সেটিংস
            </h1>
            <p className="text-muted-foreground mt-1">
              কাস্টমার কখন Email/SMS পাবে সেটা নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">সক্রিয় নোটিফিকেশন</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{emailActiveCount}</p>
                  <p className="text-sm text-muted-foreground">Email সক্রিয়</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{smsActiveCount}</p>
                  <p className="text-sm text-muted-foreground">SMS সক্রিয়</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Status */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">SMS: Twilio সক্রিয়</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Email: প্রোভাইডার সেটআপ করুন</span>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <a href="/admin/email-marketing">সেটআপ →</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings Tabs */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-muted-foreground">লোড হচ্ছে...</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="order" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
              <TabsTrigger value="order" className="gap-2 py-2.5 px-4">
                <ShoppingCart className="w-4 h-4" />
                অর্ডার ({getSettingsByCategory('order').length})
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-2 py-2.5 px-4">
                <CreditCard className="w-4 h-4" />
                পেমেন্ট ({getSettingsByCategory('payment').length})
              </TabsTrigger>
              <TabsTrigger value="marketing" className="gap-2 py-2.5 px-4">
                <Gift className="w-4 h-4" />
                মার্কেটিং ({getSettingsByCategory('marketing').length})
              </TabsTrigger>
              <TabsTrigger value="auth" className="gap-2 py-2.5 px-4">
                <Key className="w-4 h-4" />
                অথেনটিকেশন ({getSettingsByCategory('auth').length})
              </TabsTrigger>
              <TabsTrigger value="push" className="gap-2 py-2.5 px-4">
                <Send className="w-4 h-4" />
                পুশ নোটিফিকেশন
              </TabsTrigger>
            </TabsList>

            <TabsContent value="order" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">অর্ডার নোটিফিকেশন</h2>
                  <p className="text-sm text-muted-foreground">অর্ডারের বিভিন্ন স্টেজে কাস্টমারকে জানানো</p>
                </div>
              </div>
              <div className="grid gap-4">
                {getSettingsByCategory('order').map(renderNotificationCard)}
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">পেমেন্ট নোটিফিকেশন</h2>
                  <p className="text-sm text-muted-foreground">পেমেন্ট ও রিফান্ড সম্পর্কিত আপডেট</p>
                </div>
              </div>
              <div className="grid gap-4">
                {getSettingsByCategory('payment').map(renderNotificationCard)}
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">মার্কেটিং নোটিফিকেশন</h2>
                  <p className="text-sm text-muted-foreground">অফার, প্রমোশন ও রিমাইন্ডার</p>
                </div>
              </div>
              <div className="grid gap-4">
                {getSettingsByCategory('marketing').map(renderNotificationCard)}
              </div>
            </TabsContent>

            <TabsContent value="auth" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">অথেনটিকেশন নোটিফিকেশন</h2>
                  <p className="text-sm text-muted-foreground">লগইন, পাসওয়ার্ড ও ভেরিফিকেশন</p>
                </div>
              </div>
              <div className="grid gap-4">
                {getSettingsByCategory('auth').map(renderNotificationCard)}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              নোটিফিকেশন কীভাবে কাজ করে?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Email/SMS টগল অন করলে সেই ইভেন্টে মেসেজ পাঠানো হবে</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>সম্পূর্ণ বন্ধ করতে ডান পাশের সুইচ অফ করুন</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>SMS টেমপ্লেট কাস্টমাইজ করতে সেটিংস বাটনে ক্লিক করুন</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Email টেমপ্লেট ইমেইল মার্কেটিং থেকে ম্যানেজ করুন</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
