import { sha256, type AudienceUser } from "./utils.ts";

export async function syncToFacebookAudience(
  creds: Record<string, string>,
  users: AudienceUser[],
  audienceName: string,
  existingAudienceId?: string
): Promise<{ audience_id: string; synced: number }> {
  const accessToken = creds['access_token'];
  const adAccountId = creds['ad_account_id'];
  if (!accessToken || !adAccountId) throw new Error('Facebook credentials missing');

  let audienceId = existingAudienceId;
  if (!audienceId) {
    const res = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/customaudiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, name: audienceName, subtype: 'CUSTOM', description: `Auto-synced - ${audienceName}`, customer_file_source: 'USER_PROVIDED_ONLY' }),
    });
    const d = await res.json();
    if (d.error) throw new Error(`FB: ${d.error.message}`);
    audienceId = d.id;
  }

  let synced = 0;
  for (let i = 0; i < users.length; i += 10000) {
    const batch = users.slice(i, i + 10000);
    const dataRows: string[][] = [];
    for (const u of batch) {
      const row = [u.email ? await sha256(u.email) : '', u.phone ? await sha256(u.phone.replace(/[^0-9]/g, '')) : ''];
      if (row.some(v => v)) dataRows.push(row);
    }
    if (!dataRows.length) continue;
    const r = await fetch(`https://graph.facebook.com/v18.0/${audienceId}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, payload: { schema: ['EMAIL', 'PHONE'], data: dataRows } }),
    });
    const rd = await r.json();
    if (rd.error) throw new Error(`FB Upload: ${rd.error.message}`);
    synced += rd.num_received || dataRows.length;
  }
  return { audience_id: audienceId!, synced };
}

export async function syncToGoogleAds(
  creds: Record<string, string>,
  users: AudienceUser[],
  audienceName: string
): Promise<{ synced: number }> {
  const developerToken = creds['developer_token'];
  const customerId = creds['customer_id'];
  if (!developerToken || !customerId) throw new Error('Google Ads credentials missing');

  let accessToken = creds['access_token'];
  const { refresh_token: rt, client_id: ci, client_secret: cs } = creds;
  if (rt && ci && cs) {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: ci, client_secret: cs, refresh_token: rt, grant_type: 'refresh_token' }),
    });
    const d = await r.json();
    if (d.access_token) accessToken = d.access_token;
  }
  if (!accessToken) throw new Error('Google Ads: No access token');

  const cid = customerId.replace(/-/g, '');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'developer-token': developerToken };

  const cr = await fetch(`https://googleads.googleapis.com/v15/customers/${cid}/userLists:mutate`, {
    method: 'POST', headers,
    body: JSON.stringify({ operations: [{ create: { crmBasedUserList: { uploadKeyType: 'CONTACT_INFO', dataSourceType: 'FIRST_PARTY' }, name: audienceName, description: `Auto-synced - ${audienceName}`, membershipLifeSpan: 30 } }] }),
  });
  const cd = await cr.json();
  if (cd.error) throw new Error(`Google Ads: ${cd.error.message}`);
  const rn = cd.results?.[0]?.resourceName;

  const ids = [];
  for (const u of users) {
    if (u.email) ids.push({ hashedEmail: await sha256(u.email) });
    if (u.phone) ids.push({ hashedPhoneNumber: await sha256(u.phone.replace(/[^0-9+]/g, '')) });
  }
  if (ids.length && rn) {
    await fetch(`https://googleads.googleapis.com/v15/customers/${cid}/offlineUserDataJobs:create`, {
      method: 'POST', headers,
      body: JSON.stringify({ operations: [{ create: { userList: rn, userIdentifiers: ids.slice(0, 100000) } }] }),
    });
  }
  return { synced: ids.length };
}

export async function syncToTikTokAudience(
  creds: Record<string, string>,
  users: AudienceUser[],
  audienceName: string
): Promise<{ audience_id: string; synced: number }> {
  const accessToken = creds['access_token'];
  const advertiserId = creds['advertiser_id'];
  if (!accessToken || !advertiserId) throw new Error('TikTok credentials missing');

  const cr = await fetch('https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/create/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify({ advertiser_id: advertiserId, custom_audience_name: audienceName, file_type: 'EMAIL_SHA256', calculate_type: 'EVERY_TIME' }),
  });
  const cd = await cr.json();
  if (cd.code !== 0) throw new Error(`TikTok: ${cd.message}`);
  const audienceId = cd.data?.custom_audience_id;

  const hashed = [];
  for (const u of users) { if (u.email) hashed.push(await sha256(u.email)); }
  if (hashed.length) {
    await fetch('https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/update/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
      body: JSON.stringify({ advertiser_id: advertiserId, custom_audience_id: audienceId, action: 'APPEND', id_type: 'EMAIL_SHA256', id_list: hashed.slice(0, 100000) }),
    });
  }
  return { audience_id: audienceId, synced: hashed.length };
}
