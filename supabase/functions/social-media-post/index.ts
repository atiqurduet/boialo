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
      const { data: account } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!account || !account.access_token) {
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
            const numericId = String(chatId).replace(/^-100/, '').replace(/^-/, '');
            if (!String(chatId).startsWith('-') && !String(chatId).startsWith('@')) {
              chatId = `-100${numericId}`;
            }

            // Fetch product details if product_id exists
            let productData: any = null;
            if (post.product_id) {
              if (post.post_type === 'book' || !post.post_type || post.post_type === 'null') {
                const { data: prod } = await supabase.from('products').select('title_bn, title_en, price, original_price, discount, images, slug').eq('id', post.product_id).single();
                if (prod) productData = { title: prod.title_bn || prod.title_en, price: prod.price, originalPrice: prod.original_price, discount: prod.discount, image: prod.images?.[0] };
                // Also try to get author/publisher
                const { data: authorRel } = await supabase.from('product_writers').select('writers(name_bn)').eq('product_id', post.product_id).limit(1);
                if (authorRel?.[0]?.writers) productData = { ...productData, author: (authorRel[0].writers as any).name_bn };
                const { data: pubRel } = await supabase.from('product_publishers').select('publishers(name_bn)').eq('product_id', post.product_id).limit(1);
                if (pubRel?.[0]?.publishers) productData = { ...productData, publisher: (pubRel[0].publishers as any).name_bn };
              } else if (post.post_type === 'universal') {
                const { data: prod } = await supabase.from('universal_products').select('name_bn, name_en, price, original_price, discount, images, slug').eq('id', post.product_id).single();
                if (prod) productData = { title: prod.name_bn || prod.name_en, price: prod.price, originalPrice: prod.original_price, discount: prod.discount, image: prod.images?.[0] };
              }
            }

            // Build modern formatted caption
            const pTitle = productData?.title || '';
            const pPrice = productData?.price ? `৳${productData.price}` : '';
            const pOrigPrice = productData?.originalPrice ? `৳${productData.originalPrice}` : '';
            const pDiscount = productData?.discount;
            const pAuthor = productData?.author || '';
            const pPublisher = productData?.publisher || '';
            const productUrl = post.link_url || '';

            let caption = '';
            
            if (pTitle) {
              // Product-style post
              caption += `📚 <b>${pTitle}</b>\n`;
              caption += `━━━━━━━━━━━━━━━\n`;
              
              if (pPrice) {
                if (pDiscount && Number(pDiscount) > 0) {
                  caption += `\n💰 মূল্য: <s>${pOrigPrice}</s> → <b>${pPrice}</b>\n`;
                  caption += `🏷️ ছাড়: <b>${pDiscount}% OFF</b>\n`;
                } else {
                  caption += `\n💰 মূল্য: <b>${pPrice}</b>\n`;
                }
              }
              
              if (pAuthor) caption += `✍️ ${pAuthor}\n`;
              if (pPublisher) caption += `🏢 ${pPublisher}\n`;
              
              caption += `\n━━━━━━━━━━━━━━━\n`;
              if (hashtags) caption += `${hashtags}\n\n`;
              if (productUrl) caption += `🛒 <b>এখনই অর্ডার করুন!</b>`;
            } else {
              // Generic post - use content as-is
              caption = content;
              if (hashtags) caption += `\n\n${hashtags}`;
              if (productUrl) caption += `\n\n🔗 ${productUrl}`;
            }

            // Inline keyboard button
            const inlineKeyboard = productUrl ? {
              inline_keyboard: [[
                { text: '🛒 এখনই অর্ডার করুন', url: productUrl },
              ]]
            } : undefined;

            // Product image or first media url
            const imageUrl = post.media_urls?.[0] || productData?.image;

            let data;
            if (imageUrl) {
              const res = await fetch(`https://api.telegram.org/bot${account.access_token}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  photo: imageUrl,
                  caption: caption.substring(0, 1024),
                  parse_mode: 'HTML',
                  ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
                }),
              });
              data = await res.json();
            } else {
              const res = await fetch(`https://api.telegram.org/bot${account.access_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: caption || fullContent,
                  parse_mode: 'HTML',
                  disable_web_page_preview: false,
                  ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
                }),
              });
              data = await res.json();
            }
            
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
              body: JSON.stringify({ message: fullContent, access_token: account.access_token, ...(post.link_url ? { link: post.link_url } : {}) }),
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
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${account.access_token}` },
              body: JSON.stringify({ text: fullContent.substring(0, 280) }),
            });
            const data = await res.json();
            if (data.errors) throw new Error(data.errors[0]?.message || 'Twitter API error');
            postResult.external_post_id = data.data?.id;
            postResult.external_url = `https://x.com/i/web/status/${data.data?.id}`;
            break;
          }
          case 'linkedin': {
            const orgId = account.page_id || account.channel_id;
            const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${account.access_token}`, 'X-Restli-Protocol-Version': '2.0.0' },
              body: JSON.stringify({
                author: `urn:li:organization:${orgId}`, lifecycleState: 'PUBLISHED',
                specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: fullContent }, shareMediaCategory: 'NONE' } },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
              }),
            });
            const data = await res.json();
            if (res.status >= 400) throw new Error(JSON.stringify(data));
            postResult.external_post_id = data.id;
            break;
          }
          default: {
            postResult.status = 'pending';
            postResult.error_message = `${platform} API integration pending - post content saved`;
            break;
          }
        }

        await supabase.from('social_media_post_results')
          .update({
            status: postResult.status, external_post_id: postResult.external_post_id,
            external_url: postResult.external_url, error_message: postResult.error_message || null,
            posted_at: postResult.status === 'success' ? new Date().toISOString() : null,
          })
          .eq('post_id', post_id).eq('platform', platform);

        results.push({ platform, ...postResult });
      } catch (err: any) {
        await supabase.from('social_media_post_results')
          .update({ status: 'failed', error_message: err.message })
          .eq('post_id', post_id).eq('platform', platform);
        results.push({ platform, status: 'failed', error: err.message });
      }
    }

    // Update post status & publish count
    const anySuccess = results.some(r => r.status === 'success');
    const allFailed = results.every(r => r.status === 'failed');
    const currentCount = post.publish_count || 0;
    
    await supabase.from('social_media_posts').update({
      status: allFailed ? 'failed' : 'published',
      published_at: anySuccess ? new Date().toISOString() : null,
      publish_count: currentCount + 1,
    }).eq('id', post_id);

    // Record publish history
    await supabase.from('social_media_publish_history').insert({
      post_id,
      platforms,
      results: JSON.parse(JSON.stringify(results)),
      trigger_type: post.status === 'scheduled' ? 'scheduled' : 'manual',
    });

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
