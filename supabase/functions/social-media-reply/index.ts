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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token && token === supabaseKey;
    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: u } = await supabase.auth.getUser(token);
      if (!u?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id);
      const ok = (roles || []).some((r: any) => ['super_admin','admin','manager','support'].includes(r.role));
      if (!ok) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const { post_result_id, comment_id, reply_text } = await req.json();
    if (!reply_text) throw new Error('reply_text required');
    if (!post_result_id && !comment_id) throw new Error('post_result_id or comment_id required');

    let postResult: any;
    let parentComment: any;

    if (comment_id) {
      // Replying to a specific comment
      const { data: comment } = await supabase
        .from('social_media_comments')
        .select('*, post_result_id')
        .eq('id', comment_id)
        .single();
      if (!comment) throw new Error('Comment not found');
      parentComment = comment;

      const { data: pr } = await supabase
        .from('social_media_post_results')
        .select('*')
        .eq('id', comment.post_result_id)
        .single();
      postResult = pr;
    } else {
      const { data: pr } = await supabase
        .from('social_media_post_results')
        .select('*')
        .eq('id', post_result_id)
        .single();
      postResult = pr;
    }

    if (!postResult) throw new Error('Post result not found');

    // Get account
    const { data: account } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('platform', postResult.platform)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!account?.access_token) throw new Error('No active account for this platform');

    let externalReplyId: string | null = null;

    switch (postResult.platform) {
      case 'facebook': {
        // Reply to a comment or comment on a post
        const targetId = parentComment?.external_comment_id || postResult.external_post_id;
        const res = await fetch(`https://graph.facebook.com/v18.0/${targetId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply_text, access_token: account.access_token }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        externalReplyId = data.id;
        break;
      }

      case 'twitter': {
        const replyToId = parentComment?.external_comment_id || postResult.external_post_id;
        const res = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
          },
          body: JSON.stringify({
            text: reply_text.substring(0, 280),
            reply: { in_reply_to_tweet_id: replyToId },
          }),
        });
        const data = await res.json();
        if (data.errors) throw new Error(data.errors[0]?.message || 'Twitter API error');
        externalReplyId = data.data?.id;
        break;
      }

      case 'telegram': {
        let chatId = account.channel_id || account.page_id;
        if (!chatId) throw new Error('No channel_id configured');
        const numericId = String(chatId).replace(/^-100/, '').replace(/^-/, '');
        if (!String(chatId).startsWith('-') && !String(chatId).startsWith('@')) {
          chatId = `-100${numericId}`;
        }
        const replyToMsgId = parentComment?.external_comment_id || postResult.external_post_id;
        const res = await fetch(`https://api.telegram.org/bot${account.access_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: reply_text,
            reply_to_message_id: parseInt(replyToMsgId) || undefined,
            parse_mode: 'HTML',
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.description || 'Telegram API error');
        externalReplyId = String(data.result?.message_id);
        break;
      }

      case 'linkedin': {
        const postUrn = postResult.external_post_id;
        const parentUrn = parentComment?.external_comment_id;
        const commentBody: any = {
          actor: `urn:li:organization:${account.page_id || account.channel_id}`,
          message: { text: reply_text },
        };
        if (parentUrn) {
          commentBody.parentComment = parentUrn;
        }
        const url = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${account.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(commentBody),
        });
        const data = await res.json();
        if (res.status >= 400) throw new Error(JSON.stringify(data));
        externalReplyId = data['$URN'] || data.id;
        break;
      }

      default:
        throw new Error(`Reply not supported for ${postResult.platform}`);
    }

    // Save reply in our database
    await supabase.from('social_media_comments').insert({
      post_result_id: postResult.id,
      post_id: postResult.post_id,
      platform: postResult.platform,
      external_comment_id: externalReplyId,
      parent_comment_id: parentComment?.id || null,
      author_name: 'Admin',
      content: reply_text,
      is_reply: !!parentComment,
      is_from_admin: true,
      external_created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, external_reply_id: externalReplyId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Reply error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
