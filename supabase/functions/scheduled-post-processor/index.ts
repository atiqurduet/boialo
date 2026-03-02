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

    // Find all scheduled posts whose scheduled_at has passed
    const now = new Date().toISOString();
    const { data: duePosts, error } = await supabase
      .from('social_media_posts')
      .select('id, platforms')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (error) throw error;

    const processed: string[] = [];

    for (const post of (duePosts || [])) {
      try {
        // Ensure post_results exist for each platform
        const { data: existingResults } = await supabase
          .from('social_media_post_results')
          .select('platform')
          .eq('post_id', post.id);

        const existingPlatforms = (existingResults || []).map((r: any) => r.platform);
        const missingPlatforms = (post.platforms || []).filter((p: string) => !existingPlatforms.includes(p));

        if (missingPlatforms.length > 0) {
          const { data: accounts } = await supabase
            .from('social_media_accounts')
            .select('id, platform')
            .eq('is_active', true);

          const newResults = missingPlatforms.map((platform: string) => ({
            post_id: post.id,
            platform,
            status: 'pending',
            account_id: (accounts || []).find((a: any) => a.platform === platform)?.id || null,
          }));
          await supabase.from('social_media_post_results').insert(newResults);
        }

        // Call the social-media-post function to actually publish
        const response = await fetch(`${supabaseUrl}/functions/v1/social-media-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ post_id: post.id }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error(`Failed to process post ${post.id}:`, errData);
        }

        processed.push(post.id);
      } catch (postErr) {
        console.error(`Error processing scheduled post ${post.id}:`, postErr);
        // Mark as failed so it doesn't retry forever
        await supabase.from('social_media_posts')
          .update({ status: 'failed' })
          .eq('id', post.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_count: processed.length,
      processed_ids: processed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Scheduled post processor error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
