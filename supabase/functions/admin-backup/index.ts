import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALL_TABLES = [
  // Settings & Config
  'site_settings', 'notification_settings', 'loyalty_settings', 'referral_settings',
  'auto_post_settings', 'auto_logout_settings', 'checkout_form_fields',
  // Products & Categories
  'products', 'categories', 'writers', 'publishers', 'brands',
  'universal_products', 'universal_categories', 'universal_product_attributes', 'universal_product_variants',
  'product_bundles', 'bundle_items', 'product_variants', 'product_types', 'product_type_attribute_templates',
  // Digital Products
  'digital_products', 'ebook_metadata', 'digital_product_versions',
  // Orders & Commerce
  'orders', 'order_items', 'order_status_history', 'order_tasks',
  'coupons', 'offers', 'offer_products',
  'gift_cards', 'gift_card_transactions',
  'payment_methods', 'payment_audits',
  'delivery_zones', 'courier_providers', 'courier_bookings',
  'dynamic_pricing_rules',
  // Users & Auth
  'profiles', 'user_roles', 'permissions', 'role_permissions',
  'address_book', 'customer_risk_profiles',
  'loyalty_points', 'referral_codes', 'referral_rewards',
  'daily_checkins', 'user_badges', 'achievement_badges',
  // Content & Marketing
  'banners', 'homepage_sections', 'pages', 'page_sections',
  'footer_sections', 'footer_links',
  'navigation_menus', 'menu_items',
  'blog_posts', 'popup_banners',
  'email_templates', 'email_campaigns', 'email_subscribers', 'email_providers',
  'marketing_automations', 'automation_logs', 'automation_schedules', 'automation_ab_results',
  // Reviews & Engagement
  'reviews', 'product_qa', 'digital_product_reviews',
  'wishlist_items', 'cart_items',
  'back_in_stock_alerts', 'price_drop_alerts',
  'contact_messages',
  // Analytics & Logs
  'search_analytics', 'visitor_analytics',
  'admin_audit_logs', 'login_logs',
  'sms_logs', 'email_logs',
  'backup_history',
  // Social
  'social_accounts', 'social_posts', 'social_engagement',
  // Misc
  'refund_policies', 'refund_requests',
  'digital_purchases', 'push_subscriptions',
  'task_auto_assign_rules',
  'abandoned_checkouts', 'active_sessions',
  'user_notifications',
];

// Group definitions for selective backup
const TABLE_GROUPS: Record<string, string[]> = {
  settings: ['site_settings', 'notification_settings', 'loyalty_settings', 'referral_settings', 'auto_post_settings', 'auto_logout_settings', 'checkout_form_fields'],
  products: ['products', 'categories', 'writers', 'publishers', 'brands', 'product_bundles', 'bundle_items', 'product_variants', 'product_types', 'product_type_attribute_templates'],
  universal_products: ['universal_products', 'universal_categories', 'universal_product_attributes', 'universal_product_variants'],
  digital: ['digital_products', 'ebook_metadata', 'digital_product_versions', 'digital_purchases'],
  orders: ['orders', 'order_items', 'order_status_history', 'order_tasks', 'payment_methods', 'payment_audits', 'delivery_zones', 'courier_providers', 'courier_bookings'],
  users: ['profiles', 'user_roles', 'permissions', 'role_permissions', 'address_book', 'customer_risk_profiles'],
  content: ['banners', 'homepage_sections', 'pages', 'page_sections', 'footer_sections', 'footer_links', 'navigation_menus', 'menu_items', 'blog_posts', 'popup_banners'],
  marketing: ['email_templates', 'email_campaigns', 'email_subscribers', 'email_providers', 'marketing_automations', 'coupons', 'offers', 'offer_products', 'gift_cards'],
  reviews: ['reviews', 'product_qa', 'digital_product_reviews', 'wishlist_items', 'cart_items'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check admin role
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roleData?.some(r => ['super_admin', 'admin'].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action, tables, group, format } = body;

    if (action === 'get_table_list') {
      // Return available tables and groups
      return new Response(JSON.stringify({ tables: ALL_TABLES, groups: TABLE_GROUPS }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_table_counts') {
      const counts: Record<string, number> = {};
      for (const table of ALL_TABLES) {
        try {
          const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
          counts[table] = count || 0;
        } catch { counts[table] = 0; }
      }
      return new Response(JSON.stringify({ counts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'export') {
      let targetTables: string[] = [];
      
      if (group && TABLE_GROUPS[group]) {
        targetTables = TABLE_GROUPS[group];
      } else if (tables && Array.isArray(tables)) {
        targetTables = tables.filter((t: string) => ALL_TABLES.includes(t));
      } else {
        targetTables = ALL_TABLES;
      }

      const backupData: Record<string, any> = {};
      const tableCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const table of targetTables) {
        try {
          // Fetch all rows (paginated to bypass 1000 limit)
          let allRows: any[] = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (error) {
              console.error(`Error fetching ${table}:`, error.message);
              break;
            }
            
            if (data && data.length > 0) {
              allRows = [...allRows, ...data];
              page++;
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }

          backupData[table] = allRows;
          tableCounts[table] = allRows.length;
          totalRows += allRows.length;
        } catch (e) {
          console.error(`Failed to backup ${table}:`, e);
          backupData[table] = [];
          tableCounts[table] = 0;
        }
      }

      const backup = {
        version: '2.0',
        system: 'boialo-complete-backup',
        created_at: new Date().toISOString(),
        type: group || (tables ? 'selective' : 'full'),
        tables_count: targetTables.length,
        total_rows: totalRows,
        table_counts: tableCounts,
        data: backupData
      };

      // Log backup
      await supabase.from('backup_history').insert({
        backup_type: group || (tables ? 'selective' : 'full'),
        file_name: `backup-${group || 'full'}-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.json`,
        created_by: user.id,
        status: 'completed',
        file_size: JSON.stringify(backup).length,
        notes: `${targetTables.length} tables, ${totalRows} rows`
      });

      return new Response(JSON.stringify(backup), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'restore') {
      const { data: restoreData, restore_tables } = body;
      
      if (!restoreData) {
        return new Response(JSON.stringify({ error: 'No data provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const results: Record<string, { success: boolean; rows: number; error?: string }> = {};
      const tablesToRestore = restore_tables || Object.keys(restoreData);

      for (const table of tablesToRestore) {
        if (!restoreData[table] || !Array.isArray(restoreData[table])) {
          results[table] = { success: false, rows: 0, error: 'No data' };
          continue;
        }

        try {
          const rows = restoreData[table];
          if (rows.length === 0) {
            results[table] = { success: true, rows: 0 };
            continue;
          }

          // Upsert in batches
          const batchSize = 100;
          let totalUpserted = 0;

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              results[table] = { success: false, rows: totalUpserted, error: error.message };
              break;
            }
            totalUpserted += batch.length;
          }

          if (!results[table]) {
            results[table] = { success: true, rows: totalUpserted };
          }
        } catch (e) {
          results[table] = { success: false, rows: 0, error: String(e) };
        }
      }

      // Log restore
      await supabase.from('backup_history').insert({
        backup_type: 'restore',
        file_name: `restore-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`,
        created_by: user.id,
        status: 'completed',
        notes: JSON.stringify(results)
      });

      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
