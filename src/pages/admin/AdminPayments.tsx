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
import { CreditCard, Settings, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
  config: Record<string, string>;
  sort_order: number;
}

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentMethod> }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      toast.success("Payment method updated");
      setEditingMethod(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const toggleActive = (method: PaymentMethod) => {
    updateMutation.mutate({
      id: method.id,
      updates: { is_active: !method.is_active },
    });
  };

  const saveConfig = () => {
    if (!editingMethod) return;
    updateMutation.mutate({
      id: editingMethod.id,
      updates: { config },
    });
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case "bkash":
        return ["app_key", "app_secret", "username", "password", "sandbox"];
      case "nagad":
        return ["merchant_id", "public_key", "private_key", "sandbox"];
      case "sslcommerz":
        return ["store_id", "store_password", "sandbox"];
      case "cod":
        return [];
      default:
        return [];
    }
  };

  const openConfigDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setConfig((method.config as Record<string, string>) || {});
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
          <h1 className="text-2xl font-bold">Payment Methods</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {paymentMethods?.map((method) => (
            <Card key={method.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {method.name_en}
                </CardTitle>
                <Badge variant={method.is_active ? "default" : "secondary"}>
                  {method.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{method.name_bn}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => toggleActive(method)}
                    />
                    <span className="text-sm">
                      {method.is_active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {method.provider !== "cod" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfigDialog(method)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure {method.name_en}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {getProviderConfig(method.provider).map((field) => (
                            <div key={field} className="space-y-2">
                              <Label htmlFor={field} className="capitalize">
                                {field.replace(/_/g, " ")}
                              </Label>
                              {field === "sandbox" ? (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={field}
                                    checked={config[field] === "true"}
                                    onCheckedChange={(checked) =>
                                      setConfig({ ...config, [field]: checked.toString() })
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {config[field] === "true" ? "Test Mode" : "Live Mode"}
                                  </span>
                                </div>
                              ) : (
                                <Input
                                  id={field}
                                  type={field.includes("secret") || field.includes("password") || field.includes("key") ? "password" : "text"}
                                  value={config[field] || ""}
                                  onChange={(e) =>
                                    setConfig({ ...config, [field]: e.target.value })
                                  }
                                  placeholder={`Enter ${field.replace(/_/g, " ")}`}
                                />
                              )}
                            </div>
                          ))}
                          <Button onClick={saveConfig} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            Save Configuration
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>bKash:</strong> Get credentials from bKash Merchant Portal</p>
            <p><strong>Nagad:</strong> Apply for merchant account at nagad.com.bd</p>
            <p><strong>SSLCommerz:</strong> Register at sslcommerz.com for API access</p>
            <p><strong>COD:</strong> Cash on Delivery - no configuration needed</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
