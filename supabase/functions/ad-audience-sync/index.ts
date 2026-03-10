import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, getCredentials, type AudienceUser } from "./utils.ts";
import { syncToFacebookAudience, syncToGoogleAds, syncToTikTokAudience } from "./platforms.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { platform, audience_type, audience_name, job_id } = await req.json();
    if (!platform || !audience_type) throw new Error('platform and audience_type required');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (job_id) {
      await supabase.from('audience_sync_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job_id);
    }

    let users: AudienceUser[] = [];
    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    switch (audience_type) {
      case 'purchasers': {
        const { data } = await supabase.from('orders').select('customer_email, customer_phone').gte('created_at', since).in('status', ['delivered', 'confirmed']);
        users = (data || []).map((o: any) => ({ email: o.customer_email, phone: o.customer_phone }));
        break;
      }
      case 'high_value': {
        const { data } = await supabase.from('orders').select('customer_email, customer_phone').gte('total_amount', 5000).in('status', ['delivered', 'confirmed']);
        users = (data || []).map((o: any) => ({ email: o.customer_email, phone: o.customer_phone }));
        break;
      }
      case 'cart_abandoners': {
        const { data } = await supabase.from('abandoned_checkouts').select('email, phone').gte('created_at', since).eq('recovered', false);
        users = (data || []).map((o: any) => ({ email: o.email, phone: o.phone }));
        break;
      }
      case 'repeat_buyers': {
        const { data } = await supabase.from('orders').select('customer_email, customer_phone').in('status', ['delivered', 'confirmed']);
        const counts: Record<string, { email: string; phone?: string; count: number }> = {};
        (data || []).forEach((o: any) => {
          const k = o.customer_email || o.customer_phone;
          if (!k) return;
          if (!counts[k]) counts[k] = { email: o.customer_email, phone: o.customer_phone, count: 0 };
          counts[k].count++;
        });
        users = Object.values(counts).filter(u => u.count >= 2);
        break;
      }
      case 'wishlist_users': {
        const { data } = await supabase.from('wishlist_items').select('user_id').gte('created_at', since);
        const ids = [...new Set((data || []).map((w: any) => w.user_id))];
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('email, phone').in('id', ids.slice(0, 500));
          users = (profiles || []).map((p: any) => ({ email: p.email, phone: p.phone }));
        }
        break;
      }
      default: {
        const { data } = await supabase.from('orders').select('customer_email, customer_phone').in('status', ['delivered', 'confirmed']);
        users = (data || []).map((o: any) => ({ email: o.customer_email, phone: o.customer_phone }));
      }
    }

    const seen = new Set<string>();
    users = users.filter(u => { const k = u.email || u.phone || ''; if (!k || seen.has(k)) return false; seen.add(k); return true; });

    const name = audience_name || `Boialo - ${audience_type} - ${new Date().toLocaleDateString('bn-BD')}`;
    const creds = await getCredentials(supabase, platform);
    if (!Object.keys(creds).length) throw new Error(`No credentials for ${platform}`);

    let result: any;
    switch (platform) {
      case 'facebook': result = await syncToFacebookAudience(creds, users, name); break;
      case 'google': result = await syncToGoogleAds(creds, users, name); break;
      case 'tiktok': result = await syncToTikTokAudience(creds, users, name); break;
      default: throw new Error(`Unsupported platform: ${platform}`);
    }

    if (job_id) {
      await supabase.from('audience_sync_jobs').update({
        status: 'completed', total_users: users.length, synced_users: result.synced || users.length,
        external_audience_id: result.audience_id, completed_at: new Date().toISOString(),
      }).eq('id', job_id);
    }

    return new Response(JSON.stringify({ success: true, total_users: users.length, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
