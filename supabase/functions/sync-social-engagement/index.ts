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

    const body = await req.json().catch(() => ({}));
    const postId = body.post_id; // optional: sync specific post only

    // Get post results that have external_post_id (successfully posted)
    let query = supabase.from('social_media_post_results')
      .select('id, post_id, platform, external_post_id, account_id')
      .eq('status', 'success')
      .not('external_post_id', 'is', null);

    if (postId) query = query.eq('post_id', postId);
    else query = query.order('posted_at', { ascending: false }).limit(50);

    const { data: results, error: resultsErr } = await query;
    if (resultsErr) throw resultsErr;

    const synced: string[] = [];

    for (const result of (results || [])) {
      try {
        // Get account for this result
        const { data: account } = await supabase
          .from('social_media_accounts')
          .select('*')
          .eq('platform', result.platform)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!account?.access_token) continue;

        let engagement: any = {};
        let comments: any[] = [];

        switch (result.platform) {
          case 'facebook': {
            // Fetch post insights
            const postId = result.external_post_id;
            const metricsRes = await fetch(
              `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true){id,message,from,created_time,like_count,comments{id,message,from,created_time,like_count}},shares&access_token=${account.access_token}`
            );
            const metricsData = await metricsRes.json();

            if (!metricsData.error) {
              engagement = {
                likes_count: metricsData.likes?.summary?.total_count || 0,
                comments_count: metricsData.comments?.summary?.total_count || 0,
                shares_count: metricsData.shares?.count || 0,
              };

              // Extract comments
              if (metricsData.comments?.data) {
                for (const c of metricsData.comments.data) {
                  comments.push({
                    external_comment_id: c.id,
                    author_name: c.from?.name || 'Unknown',
                    author_profile_url: c.from?.id ? `https://facebook.com/${c.from.id}` : null,
                    content: c.message,
                    likes_count: c.like_count || 0,
                    external_created_at: c.created_time,
                    is_reply: false,
                  });
                  // Sub-comments (replies)
                  if (c.comments?.data) {
                    for (const reply of c.comments.data) {
                      comments.push({
                        external_comment_id: reply.id,
                        parent_external_id: c.id,
                        author_name: reply.from?.name || 'Unknown',
                        author_profile_url: reply.from?.id ? `https://facebook.com/${reply.from.id}` : null,
                        content: reply.message,
                        likes_count: reply.like_count || 0,
                        external_created_at: reply.created_time,
                        is_reply: true,
                      });
                    }
                  }
                }
              }
            }
            break;
          }

          case 'twitter': {
            const tweetId = result.external_post_id;
            // Get tweet metrics
            const metricsRes = await fetch(
              `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
              { headers: { 'Authorization': `Bearer ${account.access_token}` } }
            );
            const metricsData = await metricsRes.json();

            if (metricsData.data?.public_metrics) {
              const m = metricsData.data.public_metrics;
              engagement = {
                likes_count: m.like_count || 0,
                comments_count: m.reply_count || 0,
                shares_count: m.retweet_count + (m.quote_count || 0),
                views_count: m.impression_count || 0,
              };
            }

            // Search for replies
            try {
              const repliesRes = await fetch(
                `https://api.x.com/2/tweets/search/recent?query=conversation_id:${tweetId}&tweet.fields=author_id,created_at,public_metrics&expansions=author_id&user.fields=name,profile_image_url`,
                { headers: { 'Authorization': `Bearer ${account.access_token}` } }
              );
              const repliesData = await repliesRes.json();
              if (repliesData.data) {
                const users = (repliesData.includes?.users || []).reduce((acc: any, u: any) => ({ ...acc, [u.id]: u }), {});
                for (const tweet of repliesData.data) {
                  if (tweet.id === tweetId) continue;
                  const author = users[tweet.author_id];
                  comments.push({
                    external_comment_id: tweet.id,
                    author_name: author?.name || 'Unknown',
                    author_avatar_url: author?.profile_image_url || null,
                    author_profile_url: author ? `https://x.com/${author.username}` : null,
                    content: tweet.text,
                    likes_count: tweet.public_metrics?.like_count || 0,
                    external_created_at: tweet.created_at,
                    is_reply: true,
                  });
                }
              }
            } catch (e) { console.error('Twitter replies fetch failed:', e); }
            break;
          }

          case 'telegram': {
            // Telegram doesn't have a public API for reading channel post comments easily
            // We can get view count using getMessages for channels
            try {
              // For channels, forward_count approximates shares
              // Telegram Bot API doesn't directly support engagement metrics for channel posts
              // but we can try getChatMemberCount as a proxy
              engagement = { views_count: 0 };
            } catch (e) { console.error('Telegram sync error:', e); }
            break;
          }

          case 'linkedin': {
            const postUrn = result.external_post_id;
            try {
              // Get social actions (likes, comments)
              const actionsRes = await fetch(
                `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}?count=50`,
                {
                  headers: {
                    'Authorization': `Bearer ${account.access_token}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                  }
                }
              );
              const actionsData = await actionsRes.json();
              if (actionsRes.ok) {
                engagement = {
                  likes_count: actionsData.likes?.paging?.total || 0,
                  comments_count: actionsData.comments?.paging?.total || 0,
                };

                // Extract comments
                if (actionsData.comments?.values) {
                  for (const c of actionsData.comments.values) {
                    comments.push({
                      external_comment_id: c['$URN'] || c.id,
                      author_name: c.actor?.name || 'LinkedIn User',
                      content: c.message?.text || '',
                      likes_count: c.likesSummary?.totalLikes || 0,
                      external_created_at: c.created?.time ? new Date(c.created.time).toISOString() : null,
                      is_reply: false,
                    });
                  }
                }
              }
            } catch (e) { console.error('LinkedIn sync error:', e); }
            break;
          }
        }

        // Update engagement metrics on post_results
        const updateData: any = { last_synced_at: new Date().toISOString() };
        if (engagement.likes_count !== undefined) updateData.likes_count = engagement.likes_count;
        if (engagement.comments_count !== undefined) updateData.comments_count = engagement.comments_count;
        if (engagement.shares_count !== undefined) updateData.shares_count = engagement.shares_count;
        if (engagement.views_count !== undefined) updateData.views_count = engagement.views_count;
        if (engagement.reach_count !== undefined) updateData.reach_count = engagement.reach_count;

        await supabase.from('social_media_post_results').update(updateData).eq('id', result.id);

        // Upsert comments
        for (const comment of comments) {
          // Check if comment already exists
          const { data: existing } = await supabase
            .from('social_media_comments')
            .select('id')
            .eq('external_comment_id', comment.external_comment_id)
            .eq('platform', result.platform)
            .limit(1)
            .single();

          if (existing) {
            await supabase.from('social_media_comments').update({
              content: comment.content,
              likes_count: comment.likes_count,
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id);
          } else {
            // Find parent comment id if it's a reply
            let parentId = null;
            if (comment.parent_external_id) {
              const { data: parent } = await supabase
                .from('social_media_comments')
                .select('id')
                .eq('external_comment_id', comment.parent_external_id)
                .eq('platform', result.platform)
                .limit(1)
                .single();
              parentId = parent?.id || null;
            }

            await supabase.from('social_media_comments').insert({
              post_result_id: result.id,
              post_id: result.post_id,
              platform: result.platform,
              external_comment_id: comment.external_comment_id,
              parent_comment_id: parentId,
              author_name: comment.author_name,
              author_profile_url: comment.author_profile_url || null,
              author_avatar_url: comment.author_avatar_url || null,
              content: comment.content,
              likes_count: comment.likes_count || 0,
              is_reply: comment.is_reply || false,
              external_created_at: comment.external_created_at || null,
            });
          }
        }

        synced.push(result.id);
      } catch (err) {
        console.error(`Sync error for result ${result.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, synced_count: synced.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
