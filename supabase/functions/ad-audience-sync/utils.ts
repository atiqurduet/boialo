export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getCredentials(supabase: any, platform: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('ad_platform_credentials')
    .select('credential_key, credential_value')
    .eq('platform', platform)
    .eq('is_active', true);
  const creds: Record<string, string> = {};
  (data || []).forEach((r: any) => { creds[r.credential_key] = r.credential_value; });
  return creds;
}

export type AudienceUser = { email?: string; phone?: string };
