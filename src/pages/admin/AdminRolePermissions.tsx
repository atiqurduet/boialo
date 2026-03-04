import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Shield, Save, Check, X } from "lucide-react";

interface Permission {
  id: string;
  module: string;
  action: string;
  name_bn: string;
  name_en: string;
  description: string | null;
  sort_order: number;
}

interface RolePermission {
  role: string;
  permission_id: string;
}

interface RoleConfig {
  id: string;
  role_key: string;
  label_bn: string;
  label_en: string;
  description_bn: string | null;
  is_system: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const MODULE_GROUPS: { key: string; label: string; modules: string[] }[] = [
  { key: "core", label: "মূল ফিচার", modules: ["dashboard", "orders", "tasks", "chat"] },
  { key: "products", label: "প্রোডাক্ট ম্যানেজমেন্ট", modules: ["products", "universal_products", "categories", "writers", "publishers"] },
  { key: "users", label: "ইউজার ম্যানেজমেন্ট", modules: ["customers", "staff", "roles"] },
  { key: "marketing", label: "মার্কেটিং", modules: ["coupons", "offers", "banners", "email_marketing"] },
  { key: "design", label: "সাইট ডিজাইন", modules: ["homepage", "menu", "footer", "branding"] },
  { key: "settings", label: "সেটিংস", modules: ["settings", "couriers", "payments", "refunds", "reports"] },
];

const ROLE_COLORS = [
  "bg-red-100 text-red-800",
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
  "bg-yellow-100 text-yellow-800",
];

const AdminRolePermissions = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  // Fetch dynamic roles from roles_config
  const { data: rolesConfig = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles-config-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles_config")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as RoleConfig[];
    },
  });

  // Auto-select first non-admin role
  const effectiveSelectedRole = selectedRole || rolesConfig.find(r => r.role_key !== "admin")?.role_key || "";

  // Fetch all permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch role permissions
  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ["role-permissions", effectiveSelectedRole],
    queryFn: async () => {
      if (!effectiveSelectedRole) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_id")
        .eq("role", effectiveSelectedRole as any);
      if (error) throw error;
      return data as unknown as RolePermission[];
    },
    enabled: !!effectiveSelectedRole,
  });

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const hasPermission = (permissionId: string): boolean => {
    if (pendingChanges.has(permissionId)) return pendingChanges.get(permissionId)!;
    return rolePermissions.some(rp => rp.permission_id === permissionId);
  };

  const togglePermission = (permissionId: string) => {
    const current = hasPermission(permissionId);
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(permissionId, !current);
      return next;
    });
  };

  const toggleModule = (module: string, enabled: boolean) => {
    const modulePerms = permissionsByModule[module] || [];
    setPendingChanges(prev => {
      const next = new Map(prev);
      modulePerms.forEach(perm => next.set(perm.id, enabled));
      return next;
    });
  };

  const isModuleFullyEnabled = (module: string): boolean => {
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.every(perm => hasPermission(perm.id));
  };

  const isModulePartiallyEnabled = (module: string): boolean => {
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.some(perm => hasPermission(perm.id)) && !isModuleFullyEnabled(module);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toAdd: string[] = [];
      const toRemove: string[] = [];

      pendingChanges.forEach((enabled, permissionId) => {
        const wasEnabled = rolePermissions.some(rp => rp.permission_id === permissionId);
        if (enabled && !wasEnabled) toAdd.push(permissionId);
        else if (!enabled && wasEnabled) toRemove.push(permissionId);
      });

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("role_permissions")
          .insert(toAdd.map(id => ({ role: effectiveSelectedRole as any, permission_id: id })));
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", effectiveSelectedRole as any)
          .in("permission_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("পার্মিশন সেভ হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["role-permissions", effectiveSelectedRole] });
      setPendingChanges(new Map());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isAdmin = effectiveSelectedRole === "admin";
  const isLoading = permissionsLoading || rolePermissionsLoading || rolesLoading;
  const hasPendingChanges = pendingChanges.size > 0;
  const currentRoleConfig = rolesConfig.find(r => r.role_key === effectiveSelectedRole);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">রোল ও পার্মিশন</h1>
            <p className="text-muted-foreground">প্রতিটি রোলের জন্য সিস্টেম অ্যাক্সেস কন্ট্রোল করুন</p>
          </div>
          {hasPendingChanges && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              পরিবর্তন সেভ করুন
            </Button>
          )}
        </div>

        {/* Dynamic Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rolesConfig.map((role, idx) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all ${
                effectiveSelectedRole === role.role_key ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              }`}
              onClick={() => {
                if (pendingChanges.size > 0) {
                  if (confirm("আনসেভড পরিবর্তন আছে। রোল পরিবর্তন করতে চান?")) {
                    setPendingChanges(new Map());
                    setSelectedRole(role.role_key);
                  }
                } else {
                  setSelectedRole(role.role_key);
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-muted">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge className={ROLE_COLORS[idx % ROLE_COLORS.length]}>{role.label_bn}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description_bn || role.label_en}
                    </p>
                    {role.is_system && (
                      <Badge variant="outline" className="text-xs mt-1">সিস্টেম</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Permission Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {currentRoleConfig?.label_bn || effectiveSelectedRole} পার্মিশন
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "এডমিন রোলের সব পার্মিশন আছে (পরিবর্তন করা যাবে না)"
                : "যেসব মডিউলে অ্যাক্সেস দিতে চান সেগুলো সিলেক্ট করুন"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={MODULE_GROUPS.map(g => g.key)}>
                {MODULE_GROUPS.map((group) => (
                  <AccordionItem key={group.key} value={group.key}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.label}</span>
                        <Badge variant="outline" className="ml-2">
                          {group.modules.reduce((count, mod) =>
                            count + (permissionsByModule[mod]?.filter(p => hasPermission(p.id)).length || 0), 0
                          )} / {group.modules.reduce((count, mod) =>
                            count + (permissionsByModule[mod]?.length || 0), 0
                          )}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {group.modules.map((module) => {
                          const modulePerms = permissionsByModule[module] || [];
                          if (modulePerms.length === 0) return null;
                          return (
                            <div key={module} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isModuleFullyEnabled(module)}
                                    onCheckedChange={(checked) => toggleModule(module, !!checked)}
                                    disabled={isAdmin}
                                  />
                                  <span className="font-medium capitalize">{module.replace(/_/g, " ")}</span>
                                  {isModulePartiallyEnabled(module) && (
                                    <Badge variant="secondary" className="text-xs">আংশিক</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-6">
                                {modulePerms.map((perm) => (
                                  <label
                                    key={perm.id}
                                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                      hasPermission(perm.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                                    } ${isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                                  >
                                    <Checkbox
                                      checked={hasPermission(perm.id)}
                                      onCheckedChange={() => togglePermission(perm.id)}
                                      disabled={isAdmin}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{perm.name_bn}</p>
                                      <p className="text-xs text-muted-foreground truncate">{perm.action}</p>
                                    </div>
                                    {hasPermission(perm.id) ? (
                                      <Check className="h-4 w-4 text-primary shrink-0" />
                                    ) : (
                                      <X className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRolePermissions;
