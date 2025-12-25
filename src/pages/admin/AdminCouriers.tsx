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
import { Truck, Settings, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CourierProvider {
  id: string;
  name_bn: string;
  name_en: string;
  provider: string;
  is_active: boolean;
  config: Record<string, string>;
  api_endpoint: string | null;
  sort_order: number;
}

const AdminCouriers = () => {
  const queryClient = useQueryClient();
  const [editingCourier, setEditingCourier] = useState<CourierProvider | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});

  const { data: couriers, isLoading } = useQuery({
    queryKey: ["admin-courier-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_providers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as CourierProvider[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CourierProvider> }) => {
      const { error } = await supabase
        .from("courier_providers")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courier-providers"] });
      toast.success("Courier provider updated");
      setEditingCourier(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const toggleActive = (courier: CourierProvider) => {
    updateMutation.mutate({
      id: courier.id,
      updates: { is_active: !courier.is_active },
    });
  };

  const saveConfig = () => {
    if (!editingCourier) return;
    updateMutation.mutate({
      id: editingCourier.id,
      updates: { config },
    });
  };

  const getProviderConfig = (provider: string) => {
    switch (provider) {
      case "pathao":
        return ["client_id", "client_secret", "username", "password", "sandbox"];
      case "steadfast":
        return ["api_key", "secret_key", "sandbox"];
      case "redx":
        return ["api_token", "sandbox"];
      case "manual":
        return [];
      default:
        return [];
    }
  };

  const openConfigDialog = (courier: CourierProvider) => {
    setEditingCourier(courier);
    setConfig((courier.config as Record<string, string>) || {});
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
          <h1 className="text-2xl font-bold">Courier Providers</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {couriers?.map((courier) => (
            <Card key={courier.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  {courier.name_en}
                </CardTitle>
                <Badge variant={courier.is_active ? "default" : "secondary"}>
                  {courier.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{courier.name_bn}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={courier.is_active}
                      onCheckedChange={() => toggleActive(courier)}
                    />
                    <span className="text-sm">
                      {courier.is_active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {courier.provider !== "manual" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfigDialog(courier)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure {courier.name_en}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {getProviderConfig(courier.provider).map((field) => (
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
                                  type={field.includes("secret") || field.includes("password") || field.includes("token") || field.includes("key") ? "password" : "text"}
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
            <p><strong>Pathao:</strong> Register at merchant.pathao.com for API access</p>
            <p><strong>Steadfast:</strong> Apply at steadfast.com.bd for merchant account</p>
            <p><strong>RedX:</strong> Contact redx.com.bd for API integration</p>
            <p><strong>Manual:</strong> Enter tracking numbers manually - no API needed</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCouriers;
