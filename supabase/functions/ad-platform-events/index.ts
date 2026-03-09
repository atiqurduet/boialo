import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EventPayload {
  event_name: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    ip_address?: string;
    user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: string;
    content_name?: string;
    num_items?: number;
    order_id?: string;
  };
  event_source_url?: string;
  action_source?: string;
}

// Hash helper for Facebook/TikTok
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCredentials(supabase: any, platform: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('ad_platform_credentials')
    .select('credential_key, credential_value')
    .eq('platform', platform)
    .eq('is_active', true);
  
  const creds: Record<string, string> = {};
  (data || []).forEach((r: any) => { creds[r.credential_key] = r.credential_value; });
  return creds;
}

// ── Facebook Conversions API ─────────────────────────────
async function sendToFacebookCAPI(creds: Record<string, string>, event: EventPayload): Promise<any> {
  const pixelId = creds['pixel_id'];
  const accessToken = creds['access_token'];
  const testEventCode = creds['test_event_code'];

  if (!pixelId || !accessToken) throw new Error('Facebook credentials missing (pixel_id, access_token)');

  const userData: any = {};
  if (event.user_data?.email) userData.em = [await sha256(event.user_data.email)];
  if (event.user_data?.phone) userData.ph = [await sha256(event.user_data.phone)];
  if (event.user_data?.external_id) userData.external_id = [await sha256(event.user_data.external_id)];
  if (event.user_data?.ip_address) userData.client_ip_address = event.user_data.ip_address;
  if (event.user_data?.user_agent) userData.client_user_agent = event.user_data.user_agent;
  if (event.user_data?.fbc) userData.fbc = event.user_data.fbc;
  if (event.user_data?.fbp) userData.fbp = event.user_data.fbp;

  const fbEvent: any = {
    event_name: event.event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: event.action_source || 'website',
    event_source_url: event.event_source_url,
    user_data: userData,
  };

  if (event.custom_data) {
    fbEvent.custom_data = {
      currency: event.custom_data.currency || 'BDT',
      value: event.custom_data.value,
      content_ids: event.custom_data.content_ids,
      content_type: event.custom_data.content_type || 'product',
      content_name: event.custom_data.content_name,
      num_items: event.custom_data.num_items,
      order_id: event.custom_data.order_id,
    };
  }

  const body: any = { data: [fbEvent] };
  if (testEventCode) body.test_event_code = testEventCode;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const result = await res.json();
  if (result.error) throw new Error(`FB CAPI: ${result.error.message}`);
  return result;
}

// ── TikTok Events API ────────────────────────────────────
async function sendToTikTokEventsAPI(creds: Record<string, string>, event: EventPayload): Promise<any> {
  const pixelCode = creds['pixel_id'];
  const accessToken = creds['access_token'];

  if (!pixelCode || !accessToken) throw new Error('TikTok credentials missing (pixel_id, access_token)');

  const tiktokEventMap: Record<string, string> = {
    'Purchase': 'CompletePayment',
    'AddToCart': 'AddToCart',
    'ViewContent': 'ViewContent',
    'InitiateCheckout': 'InitiateCheckout',
    'AddToWishlist': 'AddToWishlist',
    'Search': 'Search',
    'CompleteRegistration': 'CompleteRegistration',
  };

  const userData: any = {};
  if (event.user_data?.email) userData.email = await sha256(event.user_data.email);
  if (event.user_data?.phone) userData.phone = await sha256(event.user_data.phone);
  if (event.user_data?.external_id) userData.external_id = await sha256(event.user_data.external_id);
  if (event.user_data?.ip_address) userData.ip = event.user_data.ip_address;
  if (event.user_data?.user_agent) userData.user_agent = event.user_data.user_agent;

  const properties: any = {};
  if (event.custom_data?.value) properties.value = event.custom_data.value;
  if (event.custom_data?.currency) properties.currency = event.custom_data.currency || 'BDT';
  if (event.custom_data?.content_ids) {
    properties.contents = event.custom_data.content_ids.map(id => ({
      content_id: id,
      content_type: 'product',
      quantity: 1,
    }));
  }
  if (event.custom_data?.content_name) properties.content_name = event.custom_data.content_name;

  const tiktokEvent = {
    pixel_code: pixelCode,
    event: tiktokEventMap[event.event_name] || event.event_name,
    timestamp: new Date().toISOString(),
    context: {
      user: userData,
      page: { url: event.event_source_url },
      user_agent: event.user_data?.user_agent,
      ip: event.user_data?.ip_address,
    },
    properties,
  };

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
    body: JSON.stringify({ event_source: 'web', event_source_id: pixelCode, data: [tiktokEvent] }),
  });

  const result = await res.json();
  if (result.code !== 0) throw new Error(`TikTok: ${result.message}`);
  return result;
}

// ── Google Analytics 4 Measurement Protocol ──────────────
async function sendToGA4(creds: Record<string, string>, event: EventPayload): Promise<any> {
  const measurementId = creds['measurement_id'];
  const apiSecret = creds['api_secret'];

  if (!measurementId || !apiSecret) throw new Error('GA4 credentials missing (measurement_id, api_secret)');

  const ga4EventMap: Record<string, string> = {
    'Purchase': 'purchase',
    'AddToCart': 'add_to_cart',
    'ViewContent': 'view_item',
    'InitiateCheckout': 'begin_checkout',
    'AddToWishlist': 'add_to_wishlist',
    'Search': 'search',
  };

  const params: any = {};
  if (event.custom_data?.value) params.value = event.custom_data.value;
  if (event.custom_data?.currency) params.currency = event.custom_data.currency || 'BDT';
  if (event.custom_data?.content_ids) {
    params.items = event.custom_data.content_ids.map(id => ({ item_id: id, item_name: event.custom_data?.content_name }));
  }
  if (event.custom_data?.order_id) params.transaction_id = event.custom_data.order_id;

  const clientId = event.user_data?.external_id || `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

  const body = {
    client_id: clientId,
    user_id: event.user_data?.external_id,
    events: [{ name: ga4EventMap[event.event_name] || event.event_name, params }],
  };

  const res = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) throw new Error(`GA4: HTTP ${res.status}`);
  return { status: 'sent', code: res.status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { events, platforms } = await req.json() as { events: EventPayload[]; platforms?: string[] };
    if (!events?.length) throw new Error('events array required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetPlatforms = platforms || ['facebook', 'tiktok', 'google'];
    const allCreds: Record<string, Record<string, string>> = {};

    for (const p of targetPlatforms) {
      allCreds[p] = await getCredentials(supabase, p);
    }

    const results: any[] = [];

    for (const event of events) {
      for (const platform of targetPlatforms) {
        const creds = allCreds[platform];
        if (!Object.keys(creds).length) continue;

        let status = 'success';
        let response = null;
        let errorMsg = null;

        try {
          switch (platform) {
            case 'facebook':
              response = await sendToFacebookCAPI(creds, event);
              break;
            case 'tiktok':
              response = await sendToTikTokEventsAPI(creds, event);
              break;
            case 'google':
              response = await sendToGA4(creds, event);
              break;
          }
        } catch (err: any) {
          status = 'failed';
          errorMsg = err.message;
        }

        await supabase.from('ad_platform_events').insert({
          platform,
          event_name: event.event_name,
          event_data: event as any,
          user_id: event.user_data?.external_id || event.user_data?.email,
          status,
          response: response as any,
          error_message: errorMsg,
        });

        results.push({ platform, event_name: event.event_name, status, error: errorMsg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
