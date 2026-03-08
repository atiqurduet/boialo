import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_TABLES = ["sms_providers", "payment_methods", "courier_providers"] as const;
type ProviderTable = typeof VALID_TABLES[number];

// Whitelist of allowed config fields per provider type
const ALLOWED_FIELDS: Record<string, Record<string, string[]>> = {
  sms_providers: {
    twilio: ["account_sid", "auth_token", "from_number"],
    msg91: ["auth_key", "sender_id", "template_id", "route"],
    ssl_wireless: ["api_token", "sid"],
    bulksmsbd: ["api_key", "sender_id"],
  },
  payment_methods: {
    bkash: ["app_key", "app_secret", "username", "password", "sandbox"],
    nagad: ["merchant_id", "public_key", "private_key", "sandbox"],
    sslcommerz: ["store_id", "store_password", "sandbox"],
    cod: [],
  },
  courier_providers: {
    pathao: ["client_id", "client_secret", "username", "password", "sandbox", "sandbox_client_id", "sandbox_client_secret", "sandbox_username", "sandbox_password"],
    steadfast: ["api_key", "secret_key", "sandbox", "sandbox_api_key", "sandbox_secret_key"],
    redx: ["api_token", "sandbox", "sandbox_api_token"],
    manual: [],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, provider_table, provider_id, config, provider_type } = await req.json();

    // Validate table name
    if (!VALID_TABLES.includes(provider_table)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid provider table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate provider_id is UUID-like
    if (!provider_id || typeof provider_id !== "string" || provider_id.length < 10) {
      return new Response(JSON.stringify({ success: false, error: "Invalid provider ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_status") {
      // Return which config fields are configured (non-empty) without returning values
      const { data, error } = await supabaseService
        .from(provider_table)
        .select("config")
        .eq("id", provider_id)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ success: false, error: "Provider not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingConfig = (data.config as Record<string, string>) || {};
      const configStatus: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(existingConfig)) {
        configStatus[key] = !!value && value.length > 0;
      }

      return new Response(JSON.stringify({ success: true, config_status: configStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!config || typeof config !== "object") {
        return new Response(JSON.stringify({ success: false, error: "Invalid config" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate fields against whitelist
      const allowedFields = ALLOWED_FIELDS[provider_table]?.[provider_type] || [];
      const sanitizedConfig: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        if (allowedFields.includes(key) && typeof value === "string") {
          sanitizedConfig[key] = value.trim();
        }
      }

      const { error } = await supabaseService
        .from(provider_table)
        .update({ config: sanitizedConfig })
        .eq("id", provider_id);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: "Failed to update config" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Provider config error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
