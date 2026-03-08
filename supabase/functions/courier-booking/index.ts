import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CourierProvider {
  id: string;
  name_en: string;
  provider: string;
  config: Record<string, string>;
  api_endpoint: string | null;
}

interface Order {
  id: string;
  order_number: string;
  full_name: string;
  phone: string;
  address: string;
  delivery_area: string;
  total: number;
  payment_method: string;
}

interface BookingResult {
  success: boolean;
  consignment_id?: string;
  tracking_code?: string;
  message?: string;
  raw_response?: unknown;
}

async function bookPathao(order: Order, config: Record<string, string>): Promise<BookingResult> {
  const isSandbox = config.sandbox === "true";
  const client_id = isSandbox ? (config.sandbox_client_id || config.client_id) : config.client_id;
  const client_secret = isSandbox ? (config.sandbox_client_secret || config.client_secret) : config.client_secret;
  const username = isSandbox ? (config.sandbox_username || config.username) : config.username;
  const password = isSandbox ? (config.sandbox_password || config.password) : config.password;

  if (!client_id || !client_secret || !username || !password) {
    return { success: false, message: "Pathao credentials not configured" };
  }

  const baseUrl = isSandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com";

  try {
    const tokenResponse = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return { success: false, message: "Failed to authenticate with Pathao", raw_response: error };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let selectedStoreIdRaw = isSandbox
      ? (config.sandbox_store_id || config.store_id)
      : config.store_id;

    if (!selectedStoreIdRaw) {
      const storesResponse = await fetch(`${baseUrl}/aladdin/api/v1/stores`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (storesResponse.ok) {
        const storesJson = await storesResponse.json();
        const stores = Array.isArray(storesJson?.data)
          ? storesJson.data
          : Array.isArray(storesJson?.data?.data)
            ? storesJson.data.data
            : Array.isArray(storesJson?.stores)
              ? storesJson.stores
              : [];

        const firstStore = stores[0];
        selectedStoreIdRaw = firstStore?.store_id ?? firstStore?.id ?? null;
      }
    }

    const selectedStoreId = selectedStoreIdRaw ? Number(selectedStoreIdRaw) : null;
    if (!selectedStoreId || !Number.isFinite(selectedStoreId)) {
      return {
        success: false,
        message: "Pathao store_id missing বা invalid। Courier settings এ store_id দিন।",
      };
    }

    const orderPayload: Record<string, unknown> = {
      store_id: selectedStoreId,
      merchant_order_id: order.order_number,
      recipient_name: order.full_name,
      recipient_phone: order.phone.replace("+88", ""),
      recipient_address: order.address,
      recipient_city: 1,
      recipient_zone: 1,
      delivery_type: 48,
      item_type: 2,
      special_instruction: "",
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: order.payment_method === "cod" ? order.total : 0,
      item_description: `Order #${order.order_number}`,
    };

    const orderResponse = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderResult = await orderResponse.json();
    if (orderResponse.ok && orderResult.data) {
      return {
        success: true,
        consignment_id: orderResult.data.consignment_id,
        tracking_code: orderResult.data.consignment_id,
        raw_response: orderResult,
      };
    }

    const firstPathaoError = orderResult?.errors
      ? Object.values(orderResult.errors)?.flat()?.[0]
      : null;

    return {
      success: false,
      message: firstPathaoError || orderResult.message || "Pathao booking failed",
      raw_response: orderResult,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Pathao API error: ${errorMessage}` };
  }
}

async function bookSteadfast(order: Order, config: Record<string, string>): Promise<BookingResult> {
  const { api_key, secret_key, sandbox } = config;
  if (!api_key || !secret_key) return { success: false, message: "Steadfast credentials not configured" };
  const baseUrl = sandbox === "true" ? "https://portal.packzy.com/api/v1" : "https://portal.steadfast.com.bd/api/v1";
  try {
    const orderPayload = { invoice: order.order_number, recipient_name: order.full_name, recipient_phone: order.phone.replace("+88", ""), recipient_address: order.address, cod_amount: order.payment_method === "cod" ? order.total : 0, note: `Order from BoiAlo - ${order.delivery_area}` };
    const response = await fetch(`${baseUrl}/create_order`, { method: "POST", headers: { "Api-Key": api_key, "Secret-Key": secret_key, "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
    const result = await response.json();
    if (result.status === 200 && result.consignment) return { success: true, consignment_id: result.consignment.consignment_id, tracking_code: result.consignment.tracking_code, raw_response: result };
    return { success: false, message: result.message || "Steadfast booking failed", raw_response: result };
  } catch (error: unknown) { const errorMessage = error instanceof Error ? error.message : "Unknown error"; return { success: false, message: `Steadfast API error: ${errorMessage}` }; }
}

async function bookRedX(order: Order, config: Record<string, string>): Promise<BookingResult> {
  const { api_token, sandbox } = config;
  if (!api_token) return { success: false, message: "RedX API token not configured" };
  const baseUrl = sandbox === "true" ? "https://sandbox.redx.com.bd" : "https://openapi.redx.com.bd";
  try {
    const orderPayload = { customer_name: order.full_name, customer_phone: order.phone.replace("+88", ""), delivery_area: order.delivery_area, delivery_area_id: 1, customer_address: order.address, merchant_invoice_id: order.order_number, cash_collection_amount: order.payment_method === "cod" ? order.total.toString() : "0", parcel_weight: 500, instruction: "", value: order.total.toString() };
    const response = await fetch(`${baseUrl}/v1.0.0-beta/parcel`, { method: "POST", headers: { "API-ACCESS-TOKEN": `Bearer ${api_token}`, "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
    const result = await response.json();
    if (response.ok && result.tracking_id) return { success: true, consignment_id: result.tracking_id, tracking_code: result.tracking_id, raw_response: result };
    return { success: false, message: result.message || "RedX booking failed", raw_response: result };
  } catch (error: unknown) { const errorMessage = error instanceof Error ? error.message : "Unknown error"; return { success: false, message: `RedX API error: ${errorMessage}` }; }
}

async function bookECourier(order: Order, config: Record<string, string>): Promise<BookingResult> {
  const { api_key, api_secret, user_id, sandbox } = config;
  if (!api_key || !api_secret || !user_id) return { success: false, message: "eCourier credentials not configured (api_key, api_secret, user_id required)" };
  const baseUrl = sandbox === "true" ? "https://staging.ecourier.com.bd/api" : "https://backoffice.ecourier.com.bd/api";
  try {
    const orderPayload = {
      recipient_name: order.full_name,
      recipient_mobile: order.phone.replace("+88", ""),
      recipient_city: order.delivery_area || "Dhaka",
      recipient_area: order.delivery_area || "",
      recipient_thana: "",
      recipient_address: order.address,
      package_code: "#" + order.order_number,
      product_price: order.total.toString(),
      payment_method: order.payment_method === "cod" ? "COD" : "MPAY",
      product_id: order.order_number,
      parcel_type: "BOX",
      requested_delivery_time: "any",
      delivery_hour: "any",
      pick_hub: "0",
      comments: `Order #${order.order_number}`,
      number_of_item: "1",
      actual_product_price: order.total.toString(),
    };
    console.log("eCourier payload:", JSON.stringify(orderPayload));
    const response = await fetch(`${baseUrl}/order-place`, {
      method: "POST",
      headers: {
        "API-KEY": api_key,
        "API-SECRET": api_secret,
        "USER-ID": user_id,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });
    const result = await response.json();
    console.log("eCourier response:", JSON.stringify(result));
    if (response.ok && result.ID) {
      return { success: true, consignment_id: result.ID, tracking_code: result.ID, raw_response: result };
    }
    return { success: false, message: result.message || result.errors?.toString() || "eCourier booking failed", raw_response: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `eCourier API error: ${errorMessage}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("courier-booking: Request received");
    
    // --- AUTH CHECK: Require admin/manager role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("courier-booking: No auth header");
      return new Response(JSON.stringify({ error: "Unauthorized - no auth header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData.user) {
      console.log("courier-booking: Auth failed", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized - invalid session", details: userError?.message }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    console.log("courier-booking: Authenticated user", userId);
    
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    console.log("courier-booking: User role", roleData?.role);
    
    if (!roleData || !["super_admin", "admin", "manager", "support"].includes(roleData.role)) {
      console.log("courier-booking: Forbidden - role:", roleData?.role);
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- END AUTH CHECK ---

    const { order_id, courier_provider } = await req.json();
    console.log("courier-booking: order_id=", order_id, "provider=", courier_provider);

    if (!order_id || !courier_provider) {
      return new Response(JSON.stringify({ error: "order_id and courier_provider are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", order_id).single();
    if (orderError || !order) {
      console.log("courier-booking: Order not found", orderError?.message);
      return new Response(JSON.stringify({ error: "Order not found", details: orderError?.message }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("courier-booking: Order found", order.order_number);

    const { data: provider, error: providerError } = await supabase.from("courier_providers").select("*").eq("provider", courier_provider).eq("is_active", true).single();
    if (providerError || !provider) {
      console.log("courier-booking: Provider not found", providerError?.message);
      return new Response(JSON.stringify({ error: "Courier provider not found or inactive" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("courier-booking: Provider found", provider.name_en, "config keys:", Object.keys(provider.config || {}));

    let bookingResult: BookingResult;
    switch (courier_provider) {
      case "pathao": bookingResult = await bookPathao(order, provider.config); break;
      case "steadfast": bookingResult = await bookSteadfast(order, provider.config); break;
      case "redx": bookingResult = await bookRedX(order, provider.config); break;
      case "manual": bookingResult = { success: true, message: "Manual tracking - no API booking needed" }; break;
      default: return new Response(JSON.stringify({ error: `Unsupported courier provider: ${courier_provider}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("courier-booking: Result", JSON.stringify(bookingResult));

    if (bookingResult.success) {
      await supabase.from("courier_bookings").upsert({ order_id: order.id, courier_provider, consignment_id: bookingResult.consignment_id, tracking_code: bookingResult.tracking_code, booking_status: "booked", api_response: bookingResult.raw_response || {}, cod_amount: order.payment_method === "cod" ? order.total : 0 }, { onConflict: "order_id" });
      await supabase.from("orders").update({ courier_provider, tracking_number: bookingResult.tracking_code || bookingResult.consignment_id, courier_status: "booked", status: "processing" }).eq("id", order.id);
      await supabase.from("order_status_history").insert({ order_id: order.id, status: "courier_booked", notes: `Booked with ${provider.name_en}. Tracking: ${bookingResult.tracking_code || bookingResult.consignment_id}`, metadata: { courier_provider, booking_result: bookingResult } });
      return new Response(JSON.stringify({ success: true, message: `Successfully booked with ${provider.name_en}`, tracking_code: bookingResult.tracking_code || bookingResult.consignment_id, consignment_id: bookingResult.consignment_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: false, error: bookingResult.message, details: bookingResult.raw_response }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Courier booking error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
