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
    const { product_id, product_type, product_name, product_slug } = await req.json();
    if (!product_id) throw new Error('product_id required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const siteUrl = Deno.env.get('SITE_URL') || 'https://boialo.lovable.app';

    // Fetch full product details
    let product: any = null;
    if (product_type === 'book') {
      const { data } = await supabase.from('products').select('*').eq('id', product_id).single();
      product = data;
    } else {
      const { data } = await supabase.from('universal_products').select('*').eq('id', product_id).single();
      product = data;
    }

    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any = { social_media: [], email: null };

    // ===== 1. AUTO SOCIAL MEDIA POST =====
    const { data: smSetting } = await supabase
      .from('auto_post_settings')
      .select('*')
      .eq('setting_key', 'social_media_auto_post')
      .single();

    if (smSetting?.is_active && smSetting?.setting_value?.enabled) {
      const config = smSetting.setting_value as any;
      const platforms = config.platforms || [];
      const name = product_type === 'book' ? product.title_bn : product.name_bn;
      const author = product.author || '';
      const price = product.price || 0;
      const link = product_type === 'book'
        ? `${siteUrl}/product/${product.slug}`
        : `${siteUrl}/universal-product/${product.slug}`;
      const images = Array.isArray(product.images) ? product.images : [];
      const hashtags = (config.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`);

      // Build content from template
      let content = (config.template_bn || '{{product_name}} - ৳{{price}}')
        .replace(/\{\{product_name\}\}/g, name)
        .replace(/\{\{author\}\}/g, author)
        .replace(/\{\{price\}\}/g, String(price))
        .replace(/\{\{link\}\}/g, link);

      const hashtagStr = hashtags.join(' ');
      const fullContent = `${content}${hashtagStr ? '\n\n' + hashtagStr : ''}`;

      if (platforms.length > 0) {
        // Create social media post record
        const { data: post } = await supabase.from('social_media_posts').insert({
          content: fullContent,
          content_bn: fullContent,
          platforms,
          hashtags: config.hashtags || [],
          link_url: link,
          media_urls: config.include_image && images.length > 0 ? [images[0]] : [],
          status: 'draft',
          post_type: 'auto',
        }).select().single();

        if (post) {
          // Create result entries
          for (const platform of platforms) {
            await supabase.from('social_media_post_results').insert({
              post_id: post.id,
              platform,
              status: 'pending',
            });
          }

          // Invoke the social-media-post function to actually publish
          try {
            const postRes = await fetch(`${supabaseUrl}/functions/v1/social-media-post`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ post_id: post.id }),
            });
            const postData = await postRes.json();
            results.social_media = postData.results || [];
          } catch (e: any) {
            results.social_media = [{ error: e.message }];
          }
        }
      }
    }

    // ===== 2. AUTO EMAIL NOTIFICATION =====
    const { data: emailSetting } = await supabase
      .from('auto_post_settings')
      .select('*')
      .eq('setting_key', 'email_new_product')
      .single();

    if (emailSetting?.is_active && emailSetting?.setting_value?.enabled) {
      const emailConfig = emailSetting.setting_value as any;
      const name = product_type === 'book' ? product.title_bn : product.name_bn;
      const price = product.price || 0;
      const link = product_type === 'book'
        ? `${siteUrl}/product/${product.slug}`
        : `${siteUrl}/universal-product/${product.slug}`;
      const images = Array.isArray(product.images) ? product.images : [];
      const imageHtml = images.length > 0
        ? `<div style="text-align:center;margin:20px 0"><img src="${images[0]}" alt="${name}" style="max-width:300px;border-radius:8px;"/></div>`
        : '';

      // Get email template
      const { data: template } = await supabase.from('email_templates')
        .select('*')
        .eq('template_type', 'new_product')
        .eq('is_active', true)
        .single();

      // Get subscribers
      const { data: subscribers } = await supabase.from('email_subscribers')
        .select('id, email')
        .eq('status', 'active');

      if (subscribers && subscribers.length > 0) {
        const subject = (emailConfig.template_subject || '🆕 নতুন পণ্য: {{product_name}}')
          .replace(/\{\{product_name\}\}/g, name);

        let html = '';
        if (template) {
          html = template.html_content
            .replace(/\{\{product_name\}\}/g, name)
            .replace(/\{\{price\}\}/g, String(price))
            .replace(/\{\{product_url\}\}/g, link)
            .replace(/\{\{product_image\}\}/g, imageHtml);
        } else {
          // Default email template
          html = `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;color:#fff">
                <h1 style="margin:0;font-size:24px">🆕 নতুন পণ্য এসেছে!</h1>
              </div>
              ${imageHtml}
              <div style="padding:24px 32px">
                <h2 style="margin:0 0 8px;color:#1f2937;font-size:20px">${name}</h2>
                ${product.author ? `<p style="color:#6b7280;margin:0 0 12px">✍️ ${product.author}</p>` : ''}
                <p style="font-size:22px;font-weight:700;color:#6366f1;margin:0 0 20px">৳${price}</p>
                <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
                  এখনই দেখুন →
                </a>
              </div>
              <div style="padding:16px 32px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:12px">
                বইআলো - আপনার প্রিয় বইয়ের ঠিকানা
              </div>
            </div>
          `;
        }

        // Create campaign
        const { data: campaign } = await supabase.from('email_campaigns').insert({
          name: `Auto: নতুন পণ্য - ${name}`,
          subject,
          content: html,
          campaign_type: 'new_product',
          status: 'sending',
          total_recipients: subscribers.length,
        }).select().single();

        // Send in batches
        const batchSize = 50;
        let totalSent = 0;
        let totalFailed = 0;

        for (let i = 0; i < subscribers.length; i += batchSize) {
          const batch = subscribers.slice(i, i + batchSize);
          const emails = batch.map(s => s.email);
          const subscriberIds = batch.map(s => s.id);

          try {
            const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                to: emails,
                subject,
                html,
                campaign_id: campaign?.id,
                subscriber_ids: subscriberIds,
              }),
            });
            const emailData = await emailRes.json();
            if (emailData?.results) {
              totalSent += emailData.results.filter((r: any) => r.success).length;
              totalFailed += emailData.results.filter((r: any) => !r.success).length;
            }
          } catch (e: any) {
            totalFailed += batch.length;
          }
        }

        if (campaign) {
          await supabase.from('email_campaigns').update({
            status: 'sent',
            sent_count: totalSent,
            sent_at: new Date().toISOString(),
          }).eq('id', campaign.id);
        }

        results.email = { sent: totalSent, failed: totalFailed, campaign_id: campaign?.id };
      }
    }

    // ===== 3. LOG THE AUTO-NOTIFICATION =====
    await supabase.from('admin_audit_logs').insert({
      action: 'auto_product_notify',
      table_name: product_type === 'book' ? 'products' : 'universal_products',
      record_id: product_id,
      new_values: results,
    });

    return new Response(JSON.stringify({ success: true, product_name, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Auto product notify error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
