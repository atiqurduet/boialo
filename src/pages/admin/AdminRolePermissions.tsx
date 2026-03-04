import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Shield, Save, Check, X, Search, Copy, ToggleLeft,
  ToggleRight, ArrowLeftRight, Eye, ShoppingCart, Package,
  Users, Megaphone, Home, Settings, BarChart3, Info,
  CheckCircle2, XCircle, Minus
} from "lucide-react";

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

const MODULE_GROUPS: { key: string; label: string; icon: typeof Shield; modules: string[] }[] = [
  { key: "analytics", label: "ড্যাশবোর্ড ও অ্যানালিটিক্স", icon: BarChart3, modules: ["dashboard", "reports", "visitor_analytics", "checkout_analytics"] },
  { key: "orders", label: "অর্ডার ম্যানেজমেন্ট", icon: ShoppingCart, modules: ["orders", "tasks", "abandoned_carts", "cart_wishlist", "refunds", "fraud_review", "chat", "contact_messages"] },
  { key: "books", label: "বই ক্যাটালগ", icon: Package, modules: ["products", "categories", "writers", "publishers", "bundles", "inventory"] },
  { key: "universal", label: "সাধারণ প্রোডাক্ট", icon: Package, modules: ["universal_products", "universal_categories", "product_types", "brands"] },
  { key: "marketing", label: "মার্কেটিং", icon: Megaphone, modules: ["offers", "coupons", "gift_cards", "loyalty_points", "email_marketing", "sms_marketing", "notifications", "marketing_automation", "social_media", "dynamic_pricing", "blog", "referral"] },
  { key: "design", label: "সাইট ডিজাইন", icon: Home, modules: ["homepage", "pages", "popup_banners", "appearance", "branding", "banners", "menu", "footer", "seo_tools"] },
  { key: "users", label: "ইউজার ম্যানেজমেন্ট", icon: Users, modules: ["customers", "staff", "roles"] },
  { key: "settings", label: "সেটিংস", icon: Settings, modules: ["settings", "payments", "couriers", "delivery_zones", "auto_assign", "refund_policy", "backup", "audit_log"] },
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: "ড্যাশবোর্ড", reports: "রিপোর্ট", visitor_analytics: "ভিজিটর অ্যানালিটিক্স",
  checkout_analytics: "চেকআউট অ্যানালিটিক্স", orders: "অর্ডার", tasks: "টাস্ক",
  abandoned_carts: "অসম্পূর্ণ অর্ডার", cart_wishlist: "কার্ট/উইশলিস্ট",
  refunds: "রিফান্ড", fraud_review: "ফ্রড রিভিউ", chat: "লাইভ চ্যাট",
  contact_messages: "কন্টাক্ট বার্তা", products: "বই", categories: "ক্যাটাগরি",
  writers: "লেখক", publishers: "প্রকাশনী", bundles: "বান্ডেল", inventory: "ইনভেন্টরি",
  universal_products: "সাধারণ প্রোডাক্ট", universal_categories: "সাধারণ ক্যাটাগরি",
  product_types: "প্রোডাক্ট টাইপ", brands: "ব্র্যান্ড", offers: "অফার", coupons: "কুপন",
  gift_cards: "গিফট কার্ড", loyalty_points: "লয়্যালটি পয়েন্ট", email_marketing: "ইমেইল মার্কেটিং",
  sms_marketing: "SMS মার্কেটিং", notifications: "নোটিফিকেশন",
  marketing_automation: "অটো মার্কেটিং", social_media: "সোশ্যাল মিডিয়া",
  dynamic_pricing: "ডায়নামিক প্রাইসিং", blog: "ব্লগ", referral: "রেফারাল",
  homepage: "হোমপেজ", pages: "পেজ", popup_banners: "পপআপ ব্যানার",
  appearance: "অ্যাপিয়ারেন্স", branding: "ব্র্যান্ডিং", banners: "ব্যানার",
  menu: "মেনু", footer: "ফুটার", seo_tools: "SEO টুলস", customers: "কাস্টমার",
  staff: "স্টাফ", roles: "রোল", settings: "সেটিংস", payments: "পেমেন্ট",
  couriers: "কুরিয়ার", delivery_zones: "ডেলিভারি জোন", auto_assign: "অটো-অ্যাসাইন",
  refund_policy: "রিফান্ড পলিসি", backup: "ব্যাকআপ", audit_log: "অডিট লগ",
};

const ACTION_LABELS: Record<string, string> = {
  view: "দেখা", create: "তৈরি", update: "আপডেট", delete: "মুছা",
  reply: "রিপ্লাই", restore: "রিস্টোর",
};

const ROLE_COLORS = [
  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
];

const AdminRolePermissions = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceRole, setCopySourceRole] = useState("");
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareRoleA, setCompareRoleA] = useState("");
  const [compareRoleB, setCompareRoleB] = useState("");

  // Fetch dynamic roles
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

  // Fetch role permissions for selected role
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

  // Fetch ALL role permissions for stats and comparison
  const { data: allRolePermissions = [] } = useQuery({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_id");
      if (error) throw error;
      return data as unknown as RolePermission[];
    },
  });

  const permissionsByModule = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  // Filter modules by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_GROUPS;
    const q = searchQuery.toLowerCase();
    return MODULE_GROUPS.map(group => ({
      ...group,
      modules: group.modules.filter(mod => {
        const label = MODULE_LABELS[mod] || mod;
        const modulePerms = permissionsByModule[mod] || [];
        return label.toLowerCase().includes(q) ||
          mod.toLowerCase().includes(q) ||
          modulePerms.some(p => p.name_bn.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q));
      }),
    })).filter(g => g.modules.length > 0);
  }, [searchQuery, permissionsByModule]);

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

  const toggleAllPermissions = (enabled: boolean) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      permissions.forEach(perm => next.set(perm.id, enabled));
      return next;
    });
  };

  const isModuleFullyEnabled = (module: string): boolean => {
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.length > 0 && modulePerms.every(perm => hasPermission(perm.id));
  };

  const isModulePartiallyEnabled = (module: string): boolean => {
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.some(perm => hasPermission(perm.id)) && !isModuleFullyEnabled(module);
  };

  // Stats for each role
  const getRoleStats = (roleKey: string) => {
    if (roleKey === 'super_admin') {
      return { count: permissions.length, total: permissions.length };
    }
    const perms = allRolePermissions.filter(rp => rp.role === roleKey);
    return { count: perms.length, total: permissions.length };
  };

  // Save mutation
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
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      setPendingChanges(new Map());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Copy permissions from another role
  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!copySourceRole || !effectiveSelectedRole) return;
      // Get source permissions
      const { data: sourcePerms, error: fetchErr } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role", copySourceRole as any);
      if (fetchErr) throw fetchErr;

      // Delete current permissions
      await supabase
        .from("role_permissions")
        .delete()
        .eq("role", effectiveSelectedRole as any);

      // Insert copied permissions
      if (sourcePerms && sourcePerms.length > 0) {
        const { error } = await supabase
          .from("role_permissions")
          .insert(sourcePerms.map((sp: any) => ({
            role: effectiveSelectedRole as any,
            permission_id: sp.permission_id,
          })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("পার্মিশন কপি হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      setPendingChanges(new Map());
      setShowCopyDialog(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isAdmin = effectiveSelectedRole === "admin";
  const isLoading = permissionsLoading || rolePermissionsLoading || rolesLoading;
  const hasPendingChanges = pendingChanges.size > 0;
  const currentRoleConfig = rolesConfig.find(r => r.role_key === effectiveSelectedRole);

  // Count enabled permissions including pending
  const enabledCount = useMemo(() => {
    return permissions.filter(p => hasPermission(p.id)).length;
  }, [permissions, rolePermissions, pendingChanges]);

  // Compare data
  const compareData = useMemo(() => {
    if (!compareRoleA || !compareRoleB) return [];
    const aPerms = new Set(allRolePermissions.filter(rp => rp.role === compareRoleA).map(rp => rp.permission_id));
    const bPerms = new Set(allRolePermissions.filter(rp => rp.role === compareRoleB).map(rp => rp.permission_id));

    return permissions.map(p => ({
      ...p,
      inA: aPerms.has(p.id),
      inB: bPerms.has(p.id),
    }));
  }, [compareRoleA, compareRoleB, allRolePermissions, permissions]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              রোল ও পার্মিশন
            </h1>
            <p className="text-muted-foreground">প্রতিটি রোলের জন্য সিস্টেম অ্যাক্সেস কন্ট্রোল করুন</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowCompareDialog(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> তুলনা করুন
            </Button>
            {!isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)}>
                <Copy className="h-4 w-4 mr-1" /> কপি করুন
              </Button>
            )}
            {hasPendingChanges && (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                সেভ করুন ({pendingChanges.size})
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">মোট রোল</p>
              <p className="text-2xl font-bold">{rolesConfig.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">মোট পার্মিশন</p>
              <p className="text-2xl font-bold">{permissions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">মোট মডিউল</p>
              <p className="text-2xl font-bold">{Object.keys(permissionsByModule).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">সিলেক্টেড রোলে সক্রিয়</p>
              <p className="text-2xl font-bold">{isAdmin ? "সব" : `${enabledCount}/${permissions.length}`}</p>
            </CardContent>
          </Card>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rolesConfig.map((role, idx) => {
            const stats = getRoleStats(role.role_key);
            const isSelected = effectiveSelectedRole === role.role_key;
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
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
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                      <Shield className={`h-5 w-5 ${isSelected ? "text-primary" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={ROLE_COLORS[idx % ROLE_COLORS.length]}>{role.label_bn}</Badge>
                        {role.is_system && <Badge variant="outline" className="text-[10px] h-4">সিস্টেম</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">
                        {role.description_bn || role.label_en}
                      </p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">পার্মিশন</span>
                          <span className="font-medium">
                            {role.role_key === "admin" ? "সব" : `${stats.count}/${stats.total}`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: role.role_key === "admin" ? "100%" : `${stats.total > 0 ? (stats.count / stats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Permission Matrix */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {currentRoleConfig?.label_bn || effectiveSelectedRole} — পার্মিশন ম্যাট্রিক্স
                </CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "এডমিন রোলের সব পার্মিশন আছে (পরিবর্তন করা যাবে না)"
                    : "যেসব মডিউলে অ্যাক্সেস দিতে চান সেগুলো সিলেক্ট করুন"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="মডিউল খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {!isAdmin && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => toggleAllPermissions(true)}>
                          <ToggleRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>সব সিলেক্ট</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => toggleAllPermissions(false)}>
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>সব ডিসিলেক্ট</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={filteredGroups.map(g => g.key)}>
                {filteredGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const groupTotalPerms = group.modules.reduce((c, m) => c + (permissionsByModule[m]?.length || 0), 0);
                  const groupEnabledPerms = group.modules.reduce((c, m) =>
                    c + (permissionsByModule[m]?.filter(p => hasPermission(p.id)).length || 0), 0);

                  return (
                    <AccordionItem key={group.key} value={group.key}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <GroupIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{group.label}</span>
                          <Badge variant={groupEnabledPerms === groupTotalPerms ? "default" : "outline"} className="ml-2">
                            {isAdmin ? "সব" : `${groupEnabledPerms}/${groupTotalPerms}`}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {group.modules.map((module) => {
                            const modulePerms = permissionsByModule[module] || [];
                            if (modulePerms.length === 0) return null;
                            const fullyEnabled = isModuleFullyEnabled(module);
                            const partiallyEnabled = isModulePartiallyEnabled(module);

                            return (
                              <div key={module} className={`border rounded-lg p-3 transition-colors ${fullyEnabled ? "border-primary/30 bg-primary/5" : ""}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={fullyEnabled}
                                      onCheckedChange={(checked) => toggleModule(module, checked)}
                                      disabled={isAdmin}
                                    />
                                    <span className="font-medium text-sm">{MODULE_LABELS[module] || module}</span>
                                    {partiallyEnabled && (
                                      <Badge variant="secondary" className="text-[10px] h-4">আংশিক</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {modulePerms.filter(p => hasPermission(p.id)).length}/{modulePerms.length}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 ml-1">
                                  {modulePerms.map((perm) => {
                                    const enabled = isAdmin || hasPermission(perm.id);
                                    return (
                                      <TooltipProvider key={perm.id}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <label
                                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-all ${
                                                enabled
                                                  ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                                  : "hover:bg-muted border-border"
                                              } ${isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                                            >
                                              <Checkbox
                                                checked={enabled}
                                                onCheckedChange={() => togglePermission(perm.id)}
                                                disabled={isAdmin}
                                                className="h-3.5 w-3.5"
                                              />
                                              <span>{ACTION_LABELS[perm.action] || perm.action}</span>
                                            </label>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium">{perm.name_bn}</p>
                                            <p className="text-xs opacity-80">{perm.description || perm.name_en}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Sticky save bar */}
        {hasPendingChanges && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <span className="text-sm font-medium">{pendingChanges.size}টি পরিবর্তন অসেভড</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPendingChanges(new Map())}
            >
              বাতিল
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              সেভ করুন
            </Button>
          </div>
        )}
      </div>

      {/* Copy Permissions Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>পার্মিশন কপি করুন</DialogTitle>
            <DialogDescription>
              অন্য একটি রোল থেকে পার্মিশন কপি করে "{currentRoleConfig?.label_bn}" রোলে প্রয়োগ করুন।
              বর্তমান পার্মিশন রিপ্লেস হবে।
            </DialogDescription>
          </DialogHeader>
          <Select value={copySourceRole} onValueChange={setCopySourceRole}>
            <SelectTrigger>
              <SelectValue placeholder="সোর্স রোল সিলেক্ট করুন" />
            </SelectTrigger>
            <SelectContent>
              {rolesConfig
                .filter(r => r.role_key !== effectiveSelectedRole && r.role_key !== "admin")
                .map(r => (
                  <SelectItem key={r.role_key} value={r.role_key}>{r.label_bn}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>বাতিল</Button>
            <Button
              onClick={() => copyMutation.mutate()}
              disabled={!copySourceRole || copyMutation.isPending}
            >
              {copyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              কপি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Roles Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>রোল তুলনা</DialogTitle>
            <DialogDescription>দুটি রোলের পার্মিশন পাশাপাশি দেখুন</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Select value={compareRoleA} onValueChange={setCompareRoleA}>
              <SelectTrigger>
                <SelectValue placeholder="রোল A" />
              </SelectTrigger>
              <SelectContent>
                {rolesConfig.map(r => (
                  <SelectItem key={r.role_key} value={r.role_key}>{r.label_bn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={compareRoleB} onValueChange={setCompareRoleB}>
              <SelectTrigger>
                <SelectValue placeholder="রোল B" />
              </SelectTrigger>
              <SelectContent>
                {rolesConfig.map(r => (
                  <SelectItem key={r.role_key} value={r.role_key}>{r.label_bn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {compareRoleA && compareRoleB && (
            <div className="space-y-3">
              {MODULE_GROUPS.map(group => {
                const groupPerms = compareData.filter(p => group.modules.includes(p.module));
                if (groupPerms.length === 0) return null;
                const hasDiff = groupPerms.some(p => p.inA !== p.inB);
                return (
                  <div key={group.key} className="border rounded-lg overflow-hidden">
                    <div className={`px-3 py-2 font-medium text-sm flex items-center justify-between ${hasDiff ? "bg-yellow-50 dark:bg-yellow-900/10" : "bg-muted"}`}>
                      <span>{group.label}</span>
                      {hasDiff && <Badge variant="secondary" className="text-[10px]">পার্থক্য আছে</Badge>}
                    </div>
                    <div className="divide-y">
                      {groupPerms.map(perm => {
                        const same = perm.inA === perm.inB;
                        return (
                          <div key={perm.id} className={`grid grid-cols-[1fr_60px_60px] gap-2 px-3 py-1.5 text-xs items-center ${!same ? "bg-yellow-50/50 dark:bg-yellow-900/5" : ""}`}>
                            <span className="truncate">{MODULE_LABELS[perm.module] || perm.module} → {ACTION_LABELS[perm.action] || perm.action}</span>
                            <div className="text-center">
                              {perm.inA ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                            </div>
                            <div className="text-center">
                              {perm.inB ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRolePermissions;
