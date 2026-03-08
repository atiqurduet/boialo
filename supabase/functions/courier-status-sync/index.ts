import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourierBooking {
  id: string;
  order_id: string;
  courier_provider: string;
  consignment_id: string | null;
  tracking_code: string | null;
  booking_status: string;
}

// Pathao status mapping
const pathaoStatusMap: Record<string, string> = {
  "Pending": "pending",
  "Pickup_Requested": "pickup_requested",
  "Pickup_Assigned": "pickup_assigned",
  "Picked": "picked",
  "In_Transit": "in_transit",
  "At_Delivery_Hub": "at_delivery_hub",
  "Delivered": "delivered",
  "Partial_Delivered": "partial_delivered",
  "Return": "returned",
  "Return_In_Transit": "return_in_transit",
  "Returned": "returned",
  "Cancelled": "cancelled",
  "Hold": "on_hold",
};

// Steadfast status mapping
const steadfastStatusMap: Record<number, string> = {
  0: "pending",
  1: "delivered",
  2: "partial_delivered",
  3: "cancelled",
  4: "hold",
};

async function getPathaoToken(config: Record<string, string>, isSandbox: boolean): Promise<string | null> {
  const client_id = isSandbox ? (config.sandbox_client_id || config.client_id) : config.client_id;
  const client_secret = isSandbox ? (config.sandbox_client_secret || config.client_secret) : config.client_secret;
  const username = isSandbox ? (config.sandbox_username || config.username) : config.username;
  const password = isSandbox ? (config.sandbox_password || config.password) : config.password;
  
  const baseUrl = isSandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com";
  
  try {
    const response = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch (e) {
    console.error("Failed to get Pathao token:", e);
  }
  return null;
}

async function syncPathaoStatus(
  booking: CourierBooking,
  config: Record<string, string>,
  supabase: ReturnType<typeof createClient>
): Promise<{ updated: boolean; status?: string; error?: string }> {
  if (!booking.consignment_id) return { updated: false, error: "No consignment_id" };
  
  const isSandbox = config.sandbox === "true";
  const token = await getPathaoToken(config, isSandbox);
  if (!token) return { updated: false, error: "Failed to authenticate with Pathao" };
  
  const baseUrl = isSandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com";
  
  try {
    // Try order info endpoint first
    console.log(`Pathao sync: fetching status for consignment ${booking.consignment_id}`);
    
    const response = await fetch(`${baseUrl}/aladdin/api/v1/orders/${booking.consignment_id}/info`, {
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    let result;
    if (!response.ok) {
      // Fallback to basic order endpoint
      console.log(`Pathao: /info failed (${response.status}), trying basic endpoint`);
      const fallbackResponse = await fetch(`${baseUrl}/aladdin/api/v1/orders/${booking.consignment_id}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error(`Pathao API error: ${fallbackResponse.status}`, errorText);
        return { updated: false, error: `Pathao API error: ${fallbackResponse.status}` };
      }
      result = await fallbackResponse.json();
    } else {
      result = await response.json();
    }
    
    console.log(`Pathao response:`, JSON.stringify(result));
    
    // Pathao returns status in different fields depending on endpoint
    const rawStatus = result.data?.order_status || result.data?.status || result.order_status || result.status;
    console.log(`Pathao raw status: ${rawStatus}`);
    
    if (!rawStatus) {
      return { updated: false, error: "No status in Pathao response", status: booking.booking_status };
    }
    
    const mappedStatus = pathaoStatusMap[rawStatus] || rawStatus?.toLowerCase().replace(/ /g, "_") || booking.booking_status;
    console.log(`Pathao mapped status: ${mappedStatus} (was: ${booking.booking_status})`);
    
    if (mappedStatus !== booking.booking_status) {
      // Update courier_bookings
      await supabase.from("courier_bookings").update({
        booking_status: mappedStatus,
        api_response: result,
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);
      
      // Update orders table
      const orderUpdate: Record<string, unknown> = { courier_status: mappedStatus };
      if (mappedStatus === "delivered") {
        orderUpdate.status = "delivered";
        orderUpdate.delivered_at = new Date().toISOString();
      } else if (mappedStatus === "cancelled") {
        orderUpdate.status = "cancelled";
      } else if (mappedStatus === "returned") {
        orderUpdate.status = "returned";
      }
      
      await supabase.from("orders").update(orderUpdate).eq("id", booking.order_id);
      
      // Add status history
      await supabase.from("order_status_history").insert({
        order_id: booking.order_id,
        status: `courier_${mappedStatus}`,
        notes: `Pathao status updated to: ${rawStatus}`,
        metadata: { provider: "pathao", raw_status: rawStatus, mapped_status: mappedStatus },
      });
      
      return { updated: true, status: mappedStatus };
    }
    
    return { updated: false, status: mappedStatus };
  } catch (e) {
    console.error("Pathao sync error:", e);
    return { updated: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function syncSteadfastStatus(
  booking: CourierBooking,
  config: Record<string, string>,
  supabase: ReturnType<typeof createClient>
): Promise<{ updated: boolean; status?: string; error?: string }> {
  if (!booking.consignment_id) return { updated: false, error: "No consignment_id" };
  
  const { api_key, secret_key, sandbox } = config;
  if (!api_key || !secret_key) return { updated: false, error: "Credentials not configured" };
  
  const baseUrl = sandbox === "true" ? "https://portal.packzy.com/api/v1" : "https://portal.steadfast.com.bd/api/v1";
  
  try {
    const response = await fetch(`${baseUrl}/status_by_cid/${booking.consignment_id}`, {
      headers: { "Api-Key": api_key, "Secret-Key": secret_key },
    });
    
    if (!response.ok) {
      return { updated: false, error: `API error: ${response.status}` };
    }
    
    const result = await response.json();
    const deliveryStatus = result.delivery_status;
    const mappedStatus = steadfastStatusMap[deliveryStatus] || booking.booking_status;
    
    if (mappedStatus !== booking.booking_status) {
      await supabase.from("courier_bookings").update({
        booking_status: mappedStatus,
        api_response: result,
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);
      
      await supabase.from("orders").update({
        courier_status: mappedStatus,
        ...(mappedStatus === "delivered" ? { status: "delivered", delivered_at: new Date().toISOString() } : {}),
        ...(mappedStatus === "cancelled" ? { status: "cancelled" } : {}),
      }).eq("id", booking.order_id);
      
      await supabase.from("order_status_history").insert({
        order_id: booking.order_id,
        status: `courier_${mappedStatus}`,
        notes: `Steadfast status updated to: ${mappedStatus}`,
        metadata: { provider: "steadfast", delivery_status: deliveryStatus },
      });
      
      return { updated: true, status: mappedStatus };
    }
    
    return { updated: false, status: mappedStatus };
  } catch (e) {
    console.error("Steadfast sync error:", e);
    return { updated: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function syncRedXStatus(
  booking: CourierBooking,
  config: Record<string, string>,
  supabase: ReturnType<typeof createClient>
): Promise<{ updated: boolean; status?: string; error?: string }> {
  if (!booking.tracking_code) return { updated: false, error: "No tracking_code" };
  
  const { api_token, sandbox } = config;
  if (!api_token) return { updated: false, error: "API token not configured" };
  
  const baseUrl = sandbox === "true" ? "https://sandbox.redx.com.bd" : "https://openapi.redx.com.bd";
  
  try {
    const response = await fetch(`${baseUrl}/v1.0.0-beta/parcel/track/${booking.tracking_code}`, {
      headers: { "API-ACCESS-TOKEN": `Bearer ${api_token}` },
    });
    
    if (!response.ok) {
      return { updated: false, error: `API error: ${response.status}` };
    }
    
    const result = await response.json();
    const rawStatus = result.parcel?.status || result.status;
    const mappedStatus = rawStatus?.toLowerCase().replace(/ /g, "_") || booking.booking_status;
    
    if (mappedStatus !== booking.booking_status) {
      await supabase.from("courier_bookings").update({
        booking_status: mappedStatus,
        api_response: result,
        updated_at: new Date().toISOString(),
      }).eq("id", booking.id);
      
      await supabase.from("orders").update({
        courier_status: mappedStatus,
        ...(mappedStatus === "delivered" ? { status: "delivered", delivered_at: new Date().toISOString() } : {}),
        ...(mappedStatus === "cancelled" ? { status: "cancelled" } : {}),
        ...(mappedStatus === "returned" ? { status: "returned" } : {}),
      }).eq("id", booking.order_id);
      
      await supabase.from("order_status_history").insert({
        order_id: booking.order_id,
        status: `courier_${mappedStatus}`,
        notes: `RedX status updated to: ${rawStatus}`,
        metadata: { provider: "redx", raw_status: rawStatus },
      });
      
      return { updated: true, status: mappedStatus };
    }
    
    return { updated: false, status: mappedStatus };
  } catch (e) {
    console.error("RedX sync error:", e);
    return { updated: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, sync_all } = await req.json().catch(() => ({}));
    
    let bookingsQuery = supabase
      .from("courier_bookings")
      .select("*")
      .not("booking_status", "in", '("delivered","cancelled","returned")');
    
    if (order_id) {
      bookingsQuery = bookingsQuery.eq("order_id", order_id);
    } else if (!sync_all) {
      // Default: sync bookings from last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      bookingsQuery = bookingsQuery.gte("created_at", weekAgo);
    }
    
    const { data: bookings, error: bookingsError } = await bookingsQuery;
    
    if (bookingsError) {
      return new Response(JSON.stringify({ error: "Failed to fetch bookings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ message: "No bookings to sync", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Get provider configs
    const { data: providers } = await supabase
      .from("courier_providers")
      .select("provider, config")
      .eq("is_active", true);
    
    const providerConfigs: Record<string, Record<string, string>> = {};
    providers?.forEach((p) => {
      providerConfigs[p.provider] = p.config || {};
    });
    
    const results: Array<{ order_id: string; provider: string; result: { updated: boolean; status?: string; error?: string } }> = [];
    
    for (const booking of bookings) {
      const config = providerConfigs[booking.courier_provider];
      if (!config) {
        results.push({ order_id: booking.order_id, provider: booking.courier_provider, result: { updated: false, error: "Provider not configured" } });
        continue;
      }
      
      let result: { updated: boolean; status?: string; error?: string };
      
      switch (booking.courier_provider) {
        case "pathao":
          result = await syncPathaoStatus(booking, config, supabase);
          break;
        case "steadfast":
          result = await syncSteadfastStatus(booking, config, supabase);
          break;
        case "redx":
          result = await syncRedXStatus(booking, config, supabase);
          break;
        default:
          result = { updated: false, error: "Unsupported provider" };
      }
      
      results.push({ order_id: booking.order_id, provider: booking.courier_provider, result });
    }
    
    const updatedCount = results.filter((r) => r.result.updated).length;
    
    return new Response(JSON.stringify({
      message: `Synced ${updatedCount} of ${bookings.length} bookings`,
      synced: updatedCount,
      total: bookings.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Courier status sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
