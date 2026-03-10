import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

// ── Facebook Custom Audience ─────────────────────────────
async function syncToFacebookAudience(
  creds: Record<string, string>,
  users: { email?: string; phone?: string }[],
  audienceName: string,
  existingAudienceId?: string
): Promise<{ audience_id: string; synced: number }> {
  const accessToken = creds['access_token'];
  const adAccountId = creds['ad_account_id'];

  if (!accessToken || !adAccountId) throw new Error('Facebook credentials missing (access_token, ad_account_id)');

  let audienceId = existingAudienceId;

  // Create audience if not exists
  if (!audienceId) {
    const createRes = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/customaudiences`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          name: audienceName,
          subtype: 'CUSTOM',
          description: `Auto-synced from Boialo - ${audienceName}`,
          customer_file_source: 'USER_PROVIDED_ONLY',
        }),
      }
    );
    const createData = await createRes.json();
    if (createData.error) throw new Error(`FB Create Audience: ${createData.error.message}`);
    audienceId = createData.id;
  }

  // Prepare hashed user data in batches of 10000
  const batchSize = 10000;
  let synced = 0;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const schema = ['EMAIL', 'PHONE'];
    const dataRows: string[][] = [];

    for (const user of batch) {
      const row: string[] = [];
      row.push(user.email ? await sha256(user.email) : '');
      row.push(user.phone ? await sha256(user.phone.replace(/[^0-9]/g, '')) : '');
      if (row.some(v => v)) dataRows.push(row);
    }

    if (dataRows.length === 0) continue;

    const uploadRes = await fetch(
      `https://graph.facebook.com/v18.0/${audienceId}/users`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          payload: { schema, data: dataRows },
        }),
      }
    );

    const uploadData = await uploadRes.json();
    if (uploadData.error) throw new Error(`FB Upload: ${uploadData.error.message}`);
    synced += uploadData.num_received || dataRows.length;
  }

  return { audience_id: audienceId!, synced };
}

// ── Google Ads Customer Match ────────────────────────────
async function syncToGoogleAds(
  creds: Record<string, string>,
  users: { email?: string; phone?: string }[],
  audienceName: string
): Promise<{ synced: number }> {
  const developerToken = creds['developer_token'];
  const customerId = creds['customer_id'];
  const refreshToken = creds['refresh_token'];
  const clientId = creds['client_id'];
  const clientSecret = creds['client_secret'];

  if (!developerToken || !customerId) throw new Error('Google Ads credentials missing');

  // Get access token from refresh token
  let accessToken = creds['access_token'];
  if (refreshToken && clientId && clientSecret) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) accessToken = tokenData.access_token;
  }

  if (!accessToken) throw new Error('Google Ads: No access token available');

  const cleanCustomerId = customerId.replace(/-/g, '');

  // Create user list
  const createBody = {
    operations: [{
      create: {
        crmBasedUserList: {
          uploadKeyType: 'CONTACT_INFO',
          dataSourceType: 'FIRST_PARTY',
        },
        name: audienceName,
        description: `Auto-synced from Boialo - ${audienceName}`,
        membershipLifeSpan: 30,
      },
    }],
  };

  const createRes = await fetch(
    `https://googleads.googleapis.com/v15/customers/${cleanCustomerId}/userLists:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify(createBody),
    }
  );

  const createData = await createRes.json();
  if (createData.error) throw new Error(`Google Ads: ${createData.error.message}`);

  const userListResourceName = createData.results?.[0]?.resourceName;

  // Upload users
  const userIdentifiers = [];
  for (const user of users) {
    if (user.email) {
      userIdentifiers.push({ hashedEmail: await sha256(user.email) });
    }
    if (user.phone) {
      userIdentifiers.push({ hashedPhoneNumber: await sha256(user.phone.replace(/[^0-9+]/g, '')) });
    }
  }

  if (userIdentifiers.length > 0 && userListResourceName) {
    const offlineBody = {
      operations: [{
        create: {
          userList: userListResourceName,
          userIdentifiers: userIdentifiers.slice(0, 100000),
        },
      }],
    };

    await fetch(
      `https://googleads.googleapis.com/v15/customers/${cleanCustomerId}/offlineUserDataJobs:create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
        body: JSON.stringify(offlineBody),
      }
    );
  }

  return { synced: userIdentifiers.length };
}

// ── TikTok Custom Audience ───────────────────────────────
async function syncToTikTokAudience(
  creds: Record<string, string>,
  users: { email?: string; phone?: string }[],
  audienceName: string
): Promise<{ audience_id: string; synced: number }> {
  const accessToken = creds['access_token'];
  const advertiserId = creds['advertiser_id'];

  if (!accessToken || !advertiserId) throw new Error('TikTok credentials missing (access_token, advertiser_id)');

  // Create custom audience
  const createRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      custom_audience_name: audienceName,
      file_type: 'EMAIL_SHA256',
      calculate_type: 'EVERY_TIME',
    }),
  });

  const createData = await createRes.json();
  if (createData.code !== 0) throw new Error(`TikTok Create: ${createData.message}`);
  const audienceId = createData.data?.custom_audience_id;

  // Upload hashed emails
  const hashedEmails = [];
  for (const user of users) {
    if (user.email) hashedEmails.push(await sha256(user.email));
  }

  if (hashedEmails.length > 0) {
    await fetch('https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/update/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        custom_audience_id: audienceId,
        action: 'APPEND',
        id_type: 'EMAIL_SHA256',
        id_list: hashedEmails.slice(0, 100000),
      }),
    });
  }

  return { audience_id: audienceId, synced: hashedEmails.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { platform, audience_type, audience_name, job_id } = await req.json();
    if (!platform || !audience_type) throw new Error('platform and audience_type required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status
    if (job_id) {
      await supabase.from('audience_sync_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job_id);
    }

    // Fetch audience users based on type
    let users: { email?: string; phone?: string }[] = [];
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
        const emailCounts: Record<string, { email: string; phone?: string; count: number }> = {};
        (data || []).forEach((o: any) => {
          const key = o.customer_email || o.customer_phone;
          if (!key) return;
          if (!emailCounts[key]) emailCounts[key] = { email: o.customer_email, phone: o.customer_phone, count: 0 };
          emailCounts[key].count++;
        });
        users = Object.values(emailCounts).filter(u => u.count >= 2);
        break;
      }
      case 'wishlist_users': {
        const { data } = await supabase.from('wishlist_items').select('user_id').gte('created_at', since);
        const userIds = [...new Set((data || []).map((w: any) => w.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('email, phone').in('id', userIds.slice(0, 500));
          users = (profiles || []).map((p: any) => ({ email: p.email, phone: p.phone }));
        }
        break;
      }
      default: {
        // All customers
        const { data } = await supabase.from('orders').select('customer_email, customer_phone').in('status', ['delivered', 'confirmed']);
        users = (data || []).map((o: any) => ({ email: o.customer_email, phone: o.customer_phone }));
        break;
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    users = users.filter(u => {
      const key = u.email || u.phone || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const name = audience_name || `Boialo - ${audience_type} - ${new Date().toLocaleDateString('bn-BD')}`;

    // Get platform credentials
    const creds = await getCredentials(supabase, platform);
    if (!Object.keys(creds).length) throw new Error(`No credentials configured for ${platform}`);

    let result: any;
    switch (platform) {
      case 'facebook':
        result = await syncToFacebookAudience(creds, users, name);
        break;
      case 'google':
        result = await syncToGoogleAds(creds, users, name);
        break;
      case 'tiktok':
        result = await syncToTikTokAudience(creds, users, name);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Update job
    if (job_id) {
      await supabase.from('audience_sync_jobs').update({
        status: 'completed',
        total_users: users.length,
        synced_users: result.synced || users.length,
        external_audience_id: result.audience_id,
        completed_at: new Date().toISOString(),
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
