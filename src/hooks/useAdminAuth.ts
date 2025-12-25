import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'manager' | 'support';

interface AdminAuthState {
  isAdmin: boolean;
  role: AppRole | null;
  loading: boolean;
  hasPermission: (requiredRole: AppRole | AppRole[]) => boolean;
}

export const useAdminAuth = (): AdminAuthState => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (authLoading) return;
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  const hasPermission = useCallback((requiredRole: AppRole | AppRole[]): boolean => {
    if (!role) return false;
    
    const roleHierarchy: Record<AppRole, number> = {
      admin: 3,
      manager: 2,
      support: 1
    };

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userLevel = roleHierarchy[role];
    
    // Admin has all permissions
    if (role === 'admin') return true;
    
    // Check if user's role level is >= any of the required roles
    return roles.some(r => userLevel >= roleHierarchy[r]);
  }, [role]);

  return {
    isAdmin: role !== null,
    role,
    loading: loading || authLoading,
    hasPermission
  };
};
