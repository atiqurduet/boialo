import { supabase } from "@/integrations/supabase/client";

// Cache IP to avoid multiple API calls per session
let cachedIp: string | null = null;

const getClientIp = async (): Promise<string | null> => {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    cachedIp = data.ip || null;
    return cachedIp;
  } catch {
    return null;
  }
};

interface AuditLogParams {
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
}

export const logAuditAction = async ({
  action,
  tableName,
  recordId,
  oldValues,
  newValues,
}: AuditLogParams) => {
  try {
    const [{ data: { user } }, ip] = await Promise.all([
      supabase.auth.getUser(),
      getClientIp(),
    ]);
    if (!user) return;

    await supabase.from('admin_audit_logs').insert({
      action,
      table_name: tableName || null,
      record_id: recordId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
      user_id: user.id,
      ip_address: ip,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

export const logLoginEvent = async (email: string, success: boolean, eventType: string = 'login') => {
  try {
    const [{ data: { user } }, ip] = await Promise.all([
      supabase.auth.getUser(),
      getClientIp(),
    ]);

    await supabase.from('login_logs').insert({
      user_id: user?.id || null,
      email,
      event_type: eventType,
      success,
      user_agent: navigator.userAgent,
      ip_address: ip,
    });
  } catch (err) {
    console.error('Login log error:', err);
  }
};
