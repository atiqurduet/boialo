import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { post_id } = await req.json();
    if (!post_id) throw new Error('post_id required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get post
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('id', post_id)
      .single();

    if (postError || !post) throw new Error('Post not found');

    // Update status to publishing
    await supabase.from('social_media_posts').update({ status: 'publishing' }).eq('id', post_id);

    const platforms = post.platforms || [];
    const results: any[] = [];

    for (const platform of platforms) {
      // Get active account for this platform
      const { data: account } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!account || !account.access_token) {
        // Update result as failed
        await supabase.from('social_media_post_results')
          .update({ status: 'failed', error_message: 'No active account or token' })
          .eq('post_id', post_id)
          .eq('platform', platform);
        results.push({ platform, status: 'failed', error: 'No account' });
        continue;
      }

      const content = post.content_bn || post.content;
      const hashtags = (post.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ');
      const fullContent = `${content}${hashtags ? '\n\n' + hashtags : ''}${post.link_url ? '\n\n' + post.link_url : ''}`;

      try {
        let postResult: any = { status: 'success', external_post_id: null, external_url: null };

        switch (platform) {
          case 'telegram': {
            let chatId = account.channel_id || account.page_id;
            if (!chatId) throw new Error('No channel_id configured');
            // Telegram channels/supergroups need -100 prefix
            const numericId = String(chatId).replace(/^-100/, '').replace(/^-/, '');
            if (!String(chatId).startsWith('-') && !String(chatId).startsWith('@')) {
              chatId = `-100${numericId}`;
            }
            const res = await fetch(`https://api.telegram.org/bot${account.access_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: fullContent,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
              }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.description || 'Telegram API error');
            postResult.external_post_id = String(data.result?.message_id);
            break;
          }

          case 'facebook': {
            const pageId = account.page_id;
            if (!pageId) throw new Error('No page_id configured');
            const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: fullContent,
                access_token: account.access_token,
                ...(post.link_url ? { link: post.link_url } : {}),
              }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            postResult.external_post_id = data.id;
            postResult.external_url = `https://facebook.com/${data.id}`;
            break;
          }

          case 'twitter': {
            const res = await fetch('https://api.x.com/2/tweets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${account.access_token}`,
              },
              body: JSON.stringify({ text: fullContent.substring(0, 280) }),
            });
            const data = await res.json();
            if (data.errors) throw new Error(data.errors[0]?.message || 'Twitter API error');
            postResult.external_post_id = data.data?.id;
            postResult.external_url = `https://x.com/i/web/status/${data.data?.id}`;
            break;
          }

          case 'linkedin': {
            // LinkedIn requires Organization URN
            const orgId = account.page_id || account.channel_id;
            const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${account.access_token}`,
                'X-Restli-Protocol-Version': '2.0.0',
              },
              body: JSON.stringify({
                author: `urn:li:organization:${orgId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                  'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: fullContent },
                    shareMediaCategory: 'NONE',
                  },
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
              }),
            });
            const data = await res.json();
            if (res.status >= 400) throw new Error(JSON.stringify(data));
            postResult.external_post_id = data.id;
            break;
          }

          default: {
            // For platforms without direct API support, mark as pending manual
            postResult.status = 'pending';
            postResult.error_message = `${platform} API integration pending - post content saved`;
            break;
          }
        }

        await supabase.from('social_media_post_results')
          .update({
            status: postResult.status,
            external_post_id: postResult.external_post_id,
            external_url: postResult.external_url,
            error_message: postResult.error_message || null,
            posted_at: postResult.status === 'success' ? new Date().toISOString() : null,
          })
          .eq('post_id', post_id)
          .eq('platform', platform);

        results.push({ platform, ...postResult });
      } catch (err: any) {
        await supabase.from('social_media_post_results')
          .update({ status: 'failed', error_message: err.message })
          .eq('post_id', post_id)
          .eq('platform', platform);
        results.push({ platform, status: 'failed', error: err.message });
      }
    }

    // Update post status
    const anySuccess = results.some(r => r.status === 'success');
    const allFailed = results.every(r => r.status === 'failed');
    await supabase.from('social_media_posts').update({
      status: allFailed ? 'failed' : 'published',
      published_at: anySuccess ? new Date().toISOString() : null,
    }).eq('id', post_id);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
