import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Mail, 
  Users, 
  FileText, 
  Settings, 
  Send, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface EmailSubscriber {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  source: string;
  subscribed_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  campaign_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  template_type: string;
  variables: string[];
  is_active: boolean;
}

interface EmailProvider {
  id: string;
  name: string;
  provider: string;
  config: Record<string, string>;
  is_active: boolean;
  is_default: boolean;
}

const AdminEmailMarketing = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingProvider, setEditingProvider] = useState<EmailProvider | null>(null);
  
  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    content: "",
    campaign_type: "promotional",
    scheduled_at: ""
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    template_type: "custom",
    is_active: true
  });

  // Fetch subscribers
  const { data: subscribers = [], isLoading: loadingSubscribers } = useQuery({
    queryKey: ['email-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailSubscriber[];
    }
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    }
  });

  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : []
      })) as EmailTemplate[];
    }
  });

  // Fetch providers
  const { data: providers = [], isLoading: loadingProviders } = useQuery({
    queryKey: ['email-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_providers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data.map(p => ({
        ...p,
        config: p.config as Record<string, string> || {}
      })) as EmailProvider[];
    }
  });

  // Save campaign mutation
  const saveCampaignMutation = useMutation({
    mutationFn: async (campaign: typeof campaignForm & { id?: string }) => {
      const payload = {
        ...campaign,
        scheduled_at: campaign.scheduled_at || null,
      };
      if (campaign.id) {
        const { error } = await supabase
          .from('email_campaigns')
          .update(payload)
          .eq('id', campaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_campaigns')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      setCampaignDialogOpen(false);
      setEditingCampaign(null);
      setCampaignForm({ name: "", subject: "", content: "", campaign_type: "promotional", scheduled_at: "" });
      toast.success("ক্যাম্পেইন সেভ হয়েছে!");
    },
    onError: () => toast.error("ক্যাম্পেইন সেভ করতে সমস্যা হয়েছে")
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: typeof templateForm & { id?: string }) => {
      if (template.id) {
        const { error } = await supabase
          .from('email_templates')
          .update(template)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(template);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: "", subject: "", html_content: "", template_type: "custom", is_active: true });
      toast.success("টেমপ্লেট সেভ হয়েছে!");
    },
    onError: () => toast.error("টেমপ্লেট সেভ করতে সমস্যা হয়েছে")
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailProvider> }) => {
      const { error } = await supabase
        .from('email_providers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success("প্রোভাইডার আপডেট হয়েছে!");
    },
    onError: () => toast.error("প্রোভাইডার আপডেট করতে সমস্যা হয়েছে")
  });

  // Send campaign
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaign: EmailCampaign) => {
      // Get active subscribers
      const { data: subs, error: subsError } = await supabase
        .from('email_subscribers')
        .select('id, email')
        .eq('status', 'active');
      if (subsError) throw subsError;
      if (!subs || subs.length === 0) throw new Error("কোনো সক্রিয় সাবস্ক্রাইবার নেই");

      // Update campaign status to sending
      await supabase.from('email_campaigns').update({ 
        status: 'sending', 
        total_recipients: subs.length 
      }).eq('id', campaign.id);

      // Call send-email edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: subs.map(s => s.email),
          subject: campaign.subject,
          html: campaign.content,
          campaign_id: campaign.id,
          subscriber_ids: subs.map(s => s.id),
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success("ক্যাম্পেইন সফলভাবে পাঠানো হয়েছে!");
    },
    onError: (err: any) => toast.error(err?.message || "ক্যাম্পেইন পাঠাতে সমস্যা হয়েছে")
  });

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success("ক্যাম্পেইন ডিলিট হয়েছে!");
    }
  });

  // Delete subscriber
  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_subscribers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      toast.success("সাবস্ক্রাইবার ডিলিট হয়েছে!");
    }
  });

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content,
      campaign_type: campaign.campaign_type,
      scheduled_at: campaign.scheduled_at || ""
    });
    setCampaignDialogOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      template_type: template.template_type,
      is_active: template.is_active
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveCampaign = () => {
    saveCampaignMutation.mutate({
      ...campaignForm,
      id: editingCampaign?.id
    });
  };

  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate({
      ...templateForm,
      id: editingTemplate?.id
    });
  };

  const toggleProviderActive = (provider: EmailProvider) => {
    updateProviderMutation.mutate({
      id: provider.id,
      updates: { is_active: !provider.is_active }
    });
  };

  const setDefaultProvider = (provider: EmailProvider) => {
    // First, unset all defaults
    providers.forEach(p => {
      if (p.is_default) {
        updateProviderMutation.mutate({
          id: p.id,
          updates: { is_default: false }
        });
      }
    });
    // Then set the new default
    updateProviderMutation.mutate({
      id: provider.id,
      updates: { is_default: true, is_active: true }
    });
  };

  const saveProviderConfig = (provider: EmailProvider, config: Record<string, string>) => {
    updateProviderMutation.mutate({
      id: provider.id,
      updates: { config }
    });
    setProviderDialogOpen(false);
    setEditingProvider(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { variant: "outline", icon: <Edit className="h-3 w-3" /> },
      scheduled: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      sending: { variant: "default", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      sent: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      active: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      unsubscribed: { variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
      bounced: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> }
    };
    const config = variants[status] || { variant: "outline" as const, icon: null };
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case 'mailchimp':
        return ['api_key', 'server_prefix', 'audience_id'];
      case 'resend':
        return ['api_key', 'from_email'];
      case 'sendgrid':
        return ['api_key', 'from_email'];
      case 'ses':
        return ['access_key', 'secret_key', 'region', 'from_email'];
      default:
        return [];
    }
  };

  // Stats
  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ইমেইল মার্কেটিং</h1>
            <p className="text-muted-foreground">ক্যাম্পেইন, সাবস্ক্রাইবার এবং টেমপ্লেট ম্যানেজ করুন</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">সাবস্ক্রাইবার</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscribers}</div>
              <p className="text-xs text-muted-foreground">মোট: {subscribers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ক্যাম্পেইন</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sentCampaigns}</div>
              <p className="text-xs text-muted-foreground">পাঠানো হয়েছে</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ওপেন</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpens}</div>
              <p className="text-xs text-muted-foreground">মোট ওপেন</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ক্লিক</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks}</div>
              <p className="text-xs text-muted-foreground">মোট ক্লিক</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-[600px]">
            <TabsTrigger value="campaigns" className="gap-2">
              <Mail className="h-4 w-4" />
              ক্যাম্পেইন
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="gap-2">
              <Users className="h-4 w-4" />
              সাবস্ক্রাইবার
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              টেমপ্লেট
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              সেটিংস
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingCampaign(null);
                    setCampaignForm({ name: "", subject: "", content: "", campaign_type: "promotional", scheduled_at: "" });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন ক্যাম্পেইন
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCampaign ? "ক্যাম্পেইন এডিট করুন" : "নতুন ক্যাম্পেইন"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>নাম</Label>
                        <Input 
                          value={campaignForm.name}
                          onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="ক্যাম্পেইনের নাম"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>টাইপ</Label>
                        <Select 
                          value={campaignForm.campaign_type}
                          onValueChange={v => setCampaignForm(f => ({ ...f, campaign_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="promotional">প্রোমোশনাল</SelectItem>
                            <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                            <SelectItem value="order_update">অর্ডার আপডেট</SelectItem>
                            <SelectItem value="newsletter">নিউজলেটার</SelectItem>
                            <SelectItem value="offer">অফার</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>সাবজেক্ট</Label>
                      <Input 
                        value={campaignForm.subject}
                        onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="ইমেইল সাবজেক্ট"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>কনটেন্ট (HTML)</Label>
                      <Textarea 
                        value={campaignForm.content}
                        onChange={e => setCampaignForm(f => ({ ...f, content: e.target.value }))}
                        placeholder="ইমেইল কনটেন্ট..."
                        rows={8}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>শিডিউল (অপশনাল)</Label>
                      <Input 
                        type="datetime-local"
                        value={campaignForm.scheduled_at}
                        onChange={e => setCampaignForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>বাতিল</Button>
                    <Button onClick={handleSaveCampaign} disabled={saveCampaignMutation.isPending}>
                      {saveCampaignMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>টাইপ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>প্রাপক</TableHead>
                    <TableHead>ওপেন/ক্লিক</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(campaign => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.campaign_type}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.sent_count}/{campaign.total_recipients}</TableCell>
                      <TableCell>{campaign.open_count}/{campaign.click_count}</TableCell>
                      <TableCell>{format(new Date(campaign.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          {campaign.status === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => sendCampaignMutation.mutate(campaign)}
                              disabled={sendCampaignMutation.isPending}
                              className="gap-1"
                            >
                              <Send className="h-4 w-4" />
                              পাঠান
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEditCampaign(campaign)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        কোন ক্যাম্পেইন নেই
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ইমেইল</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>ফোন</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>সোর্স</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map(subscriber => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>{subscriber.full_name || '-'}</TableCell>
                      <TableCell>{subscriber.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                      <TableCell>{subscriber.source}</TableCell>
                      <TableCell>{format(new Date(subscriber.subscribed_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteSubscriberMutation.mutate(subscriber.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscribers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        কোন সাবস্ক্রাইবার নেই
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: "", subject: "", html_content: "", template_type: "custom", is_active: true });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন টেমপ্লেট
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "টেমপ্লেট এডিট করুন" : "নতুন টেমপ্লেট"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>নাম</Label>
                        <Input 
                          value={templateForm.name}
                          onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="টেমপ্লেটের নাম"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>টাইপ</Label>
                        <Select 
                          value={templateForm.template_type}
                          onValueChange={v => setTemplateForm(f => ({ ...f, template_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                            <SelectItem value="order_confirmation">অর্ডার কনফার্মেশন</SelectItem>
                            <SelectItem value="order_shipped">অর্ডার শিপড</SelectItem>
                            <SelectItem value="new_offer">নতুন অফার</SelectItem>
                            <SelectItem value="welcome">স্বাগতম</SelectItem>
                            <SelectItem value="custom">কাস্টম</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>সাবজেক্ট</Label>
                      <Input 
                        value={templateForm.subject}
                        onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="ইমেইল সাবজেক্ট"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HTML কনটেন্ট</Label>
                      <Textarea 
                        value={templateForm.html_content}
                        onChange={e => setTemplateForm(f => ({ ...f, html_content: e.target.value }))}
                        placeholder="HTML কনটেন্ট... {{variable_name}} ব্যবহার করুন"
                        rows={10}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={templateForm.is_active}
                        onCheckedChange={v => setTemplateForm(f => ({ ...f, is_active: v }))}
                      />
                      <Label>সক্রিয়</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>বাতিল</Button>
                    <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                      {saveTemplateMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </Badge>
                    </div>
                    <CardDescription>{template.template_type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.subject}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                        <Edit className="h-4 w-4 mr-1" />
                        এডিট
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ইমেইল প্রোভাইডার</CardTitle>
                <CardDescription>ইমেইল পাঠানোর জন্য প্রোভাইডার কনফিগার করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {providers.map(provider => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">{provider.provider}</p>
                      </div>
                      {provider.is_default && (
                        <Badge>ডিফল্ট</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={provider.is_active}
                          onCheckedChange={() => toggleProviderActive(provider)}
                        />
                        <span className="text-sm">{provider.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                      </div>
                      {!provider.is_default && provider.is_active && (
                        <Button size="sm" variant="outline" onClick={() => setDefaultProvider(provider)}>
                          ডিফল্ট করুন
                        </Button>
                      )}
                      <Dialog open={providerDialogOpen && editingProvider?.id === provider.id} onOpenChange={(open) => {
                        setProviderDialogOpen(open);
                        if (!open) setEditingProvider(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setEditingProvider(provider)}>
                            <Settings className="h-4 w-4 mr-1" />
                            কনফিগার
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{provider.name} কনফিগারেশন</DialogTitle>
                            <DialogDescription>API credentials সেট করুন</DialogDescription>
                          </DialogHeader>
                          <ProviderConfigForm 
                            provider={provider}
                            configFields={getProviderConfig(provider.provider)}
                            onSave={(config) => saveProviderConfig(provider, config)}
                            onCancel={() => {
                              setProviderDialogOpen(false);
                              setEditingProvider(null);
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>সেটআপ গাইড</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Mailchimp</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>mailchimp.com এ যান এবং অ্যাকাউন্ট তৈরি করুন</li>
                    <li>Account → Extras → API Keys থেকে API key তৈরি করুন</li>
                    <li>Audience থেকে Audience ID কপি করুন</li>
                    <li>Server prefix আপনার API key এর শেষে আছে (যেমন: us1)</li>
                  </ol>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Resend</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>resend.com এ যান এবং অ্যাকাউন্ট তৈরি করুন</li>
                    <li>API Keys থেকে নতুন key তৈরি করুন</li>
                    <li>Domains থেকে আপনার ডোমেইন ভেরিফাই করুন</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Provider Config Form Component
const ProviderConfigForm = ({ 
  provider, 
  configFields, 
  onSave, 
  onCancel 
}: { 
  provider: EmailProvider; 
  configFields: string[]; 
  onSave: (config: Record<string, string>) => void;
  onCancel: () => void;
}) => {
  const [config, setConfig] = useState<Record<string, string>>(provider.config || {});

  const fieldLabels: Record<string, string> = {
    api_key: 'API Key',
    server_prefix: 'Server Prefix',
    audience_id: 'Audience ID',
    from_email: 'From Email',
    access_key: 'Access Key',
    secret_key: 'Secret Key',
    region: 'Region'
  };

  return (
    <div className="space-y-4">
      {configFields.map(field => (
        <div key={field} className="space-y-2">
          <Label>{fieldLabels[field] || field}</Label>
          <Input
            type={field.includes('key') || field.includes('secret') ? 'password' : 'text'}
            value={config[field] || ''}
            onChange={e => setConfig(c => ({ ...c, [field]: e.target.value }))}
            placeholder={fieldLabels[field]}
          />
        </div>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>বাতিল</Button>
        <Button onClick={() => onSave(config)}>সেভ করুন</Button>
      </DialogFooter>
    </div>
  );
};

export default AdminEmailMarketing;
