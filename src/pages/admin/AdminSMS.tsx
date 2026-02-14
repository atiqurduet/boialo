import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Settings, Save, Star, TestTube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SMSProvider {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  config: Record<string, string>;
  sort_order: number;
}

const AdminSMS = () => {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<SMSProvider | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-sms-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_providers")
        .select("id, name, provider, is_active, is_default, sort_order");
      if (error) throw error;
      return data as SMSProvider[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SMSProvider> }) => {
      const { error } = await supabase
        .from("sms_providers")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sms-providers"] });
      toast.success("SMS provider updated");
      setEditingProvider(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const toggleActive = (provider: SMSProvider) => {
    updateMutation.mutate({
      id: provider.id,
      updates: { is_active: !provider.is_active },
    });
  };

  const setAsDefault = async (provider: SMSProvider) => {
    // First, unset all defaults
    for (const p of providers || []) {
      if (p.is_default && p.id !== provider.id) {
        await supabase
          .from("sms_providers")
          .update({ is_default: false })
          .eq("id", p.id);
      }
    }
    
    // Set this one as default
    updateMutation.mutate({
      id: provider.id,
      updates: { is_default: true, is_active: true },
    });
  };

  const saveConfig = async () => {
    if (!editingProvider) return;
    try {
      const response = await supabase.functions.invoke("update-provider-config", {
        body: {
          action: "update",
          provider_table: "sms_providers",
          provider_id: editingProvider.id,
          provider_type: editingProvider.provider,
          config,
        },
      });
      if (response.error || !response.data?.success) {
        toast.error("Failed to save: " + (response.data?.error || response.error?.message));
        return;
      }
      toast.success("SMS provider configured");
      setEditingProvider(null);
      setConfig({});
    } catch (err) {
      toast.error("Failed to save configuration");
    }
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case "twilio":
        return ["account_sid", "auth_token", "from_number"];
      case "msg91":
        return ["auth_key", "sender_id", "template_id", "route"];
      case "ssl_wireless":
        return ["api_token", "sid"];
      case "bulksmsbd":
        return ["api_key", "sender_id"];
      default:
        return [];
    }
  };

  const openConfigDialog = async (provider: SMSProvider) => {
    setEditingProvider(provider);
    setConfig({});
    setConfigStatus({});
    // Fetch config status (which fields are configured) without values
    try {
      const response = await supabase.functions.invoke("update-provider-config", {
        body: {
          action: "get_status",
          provider_table: "sms_providers",
          provider_id: provider.id,
        },
      });
      if (response.data?.success) {
        setConfigStatus(response.data.config_status || {});
      }
    } catch (err) {
      // Ignore - just show empty status
    }
  };

  const testSMS = async () => {
    if (!testPhone) {
      toast.error("Enter a phone number to test");
      return;
    }

    setTestLoading(true);
    try {
      const response = await supabase.functions.invoke("send-otp", {
        body: { phone: testPhone, action: "send" },
      });

      if (response.error) {
        toast.error("Test failed: " + response.error.message);
      } else if (response.data?.success) {
        if (response.data.warning) {
          toast.warning(response.data.warning);
          if (response.data.debug_otp) {
            toast.info(`Test OTP: ${response.data.debug_otp}`);
          }
        } else {
          toast.success(`SMS sent via ${response.data.provider}`);
        }
      } else {
        toast.error("Test failed: " + (response.data?.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Test failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Providers
          </h1>
        </div>

        {/* Test SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="+8801XXXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={testSMS} disabled={testLoading}>
                {testLoading ? "Sending..." : "Send Test OTP"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Provider Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {providers?.map((provider) => (
            <Card key={provider.id} className={provider.is_default ? "ring-2 ring-primary" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {provider.name}
                  {provider.is_default && (
                    <Badge className="bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <Badge variant={provider.is_active ? "default" : "secondary"}>
                  {provider.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={provider.is_active}
                      onCheckedChange={() => toggleActive(provider)}
                    />
                    <span className="text-sm">
                      {provider.is_active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {!provider.is_default && provider.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsDefault(provider)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set Default
                    </Button>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openConfigDialog(provider)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure API Credentials
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure {provider.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {getProviderConfig(provider.provider).map((field) => (
                        <div key={field} className="space-y-2">
                          <Label htmlFor={field} className="capitalize">
                            {field.replace(/_/g, " ")}
                          </Label>
                          <Input
                            id={field}
                            type={field.includes("token") || field.includes("secret") || field.includes("key") || field.includes("password") ? "password" : "text"}
                            value={config[field] || ""}
                            onChange={(e) =>
                              setConfig({ ...config, [field]: e.target.value })
                            }
                            placeholder={configStatus[field] ? "••••••• (configured - enter new value to change)" : `Enter ${field.replace(/_/g, " ")}`}
                          />
                        </div>
                      ))}
                      <Button onClick={saveConfig} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Integration Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium text-foreground">Twilio</p>
              <p>1. Sign up at twilio.com</p>
              <p>2. Get Account SID, Auth Token from Console</p>
              <p>3. Buy a phone number for sending SMS</p>
            </div>
            <div>
              <p className="font-medium text-foreground">MSG91</p>
              <p>1. Sign up at msg91.com</p>
              <p>2. Create a DLT template for OTP</p>
              <p>3. Get Auth Key and Sender ID</p>
            </div>
            <div>
              <p className="font-medium text-foreground">SSL Wireless (Bangladesh)</p>
              <p>1. Contact sslwireless.com for merchant account</p>
              <p>2. Get API Token and SID</p>
            </div>
            <div>
              <p className="font-medium text-foreground">BulkSMSBD</p>
              <p>1. Register at bulksmsbd.net</p>
              <p>2. Get API Key and Sender ID</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSMS;
