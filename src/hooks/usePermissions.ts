import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Permission {
  id: string;
  module: string;
  action: string;
  name_bn: string;
  name_en: string;
  description: string | null;
}

interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: Permission[];
  hasPermission: (module: string, action: string) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canUpdate: (module: string) => boolean;
  canDelete: (module: string) => boolean;
}

export function usePermissions(): UserPermissions & { isLoading: boolean } {
  const { user } = useAuth();

  type AppRole = string;
  
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any).rpc("get_my_admin_role");
      
      if (error) throw error;
      return data as AppRole | null;
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = userRole === "super_admin";

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions", user?.id, userRole],
    queryFn: async () => {
      if (!user?.id || !userRole) return [];
      
      // If super_admin, get all permissions
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("permissions")
          .select("*")
          .order("sort_order");
        
        if (error) throw error;
        return data as Permission[];
      }

      // Otherwise, get role-specific permissions
      const { data, error } = await supabase
        .from("role_permissions")
        .select(`
          permission_id,
          permissions (
            id,
            module,
            action,
            name_bn,
            name_en,
            description
          )
        `)
        .eq("role", userRole);

      if (error) throw error;
      return data
        .filter(rp => rp.permissions)
        .map(rp => rp.permissions as unknown as Permission);
    },
    enabled: !!user?.id && !!userRole,
  });

  const hasPermission = (module: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some(p => p.module === module && p.action === action);
  };

  const canView = (module: string): boolean => hasPermission(module, "view");
  const canCreate = (module: string): boolean => hasPermission(module, "create");
  const canUpdate = (module: string): boolean => hasPermission(module, "update");
  const canDelete = (module: string): boolean => hasPermission(module, "delete");

  return {
    isAdmin: isSuperAdmin || !!userRole,
    isSuperAdmin,
    permissions,
    hasPermission,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    isLoading,
  };
}
