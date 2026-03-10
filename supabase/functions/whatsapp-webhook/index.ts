import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build system prompt with dynamic product data
async function buildSystemPrompt(supabase: any, userMessage: string) {
  const searchTerms = userMessage.replace(/[।,?!।?\-]/g, " ").trim();

  const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes] = await Promise.all([
    supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).order("sales_count", { ascending: false }).limit(10),
    supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(15),
    supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email", "site_url"]),
    supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
    supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(8),
  ]);

  // Dynamic search
  let searchResults: any[] = [];
  if (searchTerms.length >= 2) {
    const [booksBn, universalBn, ebooksBn] = await Promise.all([
      supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("title_bn", `%${searchTerms}%`).limit(8),
      supabase.from("universal_products").select("name_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).ilike("name_bn", `%${searchTerms}%`).limit(8),
      supabase.from("digital_products").select("title_bn, price, slug, is_free").eq("is_active", true).ilike("title_bn", `%${searchTerms}%`).limit(8),
    ]);

    searchResults = [
      ...(booksBn.data || []).map((p: any) => `📚 ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""}`),
      ...(universalBn.data || []).map((p: any) => `🛍️ ${p.name_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""}`),
      ...(ebooksBn.data || []).map((p: any) => `📱 ${p.title_bn} - ${p.is_free ? "ফ্রি" : `৳${p.price}`}`),
    ];

    // English fallback
    if (searchResults.length === 0) {
      const [booksEn, universalEn] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, discount_percentage").eq("is_active", true).ilike("title_en", `%${searchTerms}%`).limit(8),
        supabase.from("universal_products").select("name_bn, price, slug, discount_percent").eq("is_active", true).ilike("name_en", `%${searchTerms}%`).limit(8),
      ]);
      searchResults = [
        ...(booksEn.data || []).map((p: any) => `📚 ${p.title_bn} - ৳${p.price}${p.discount_percentage ? ` (${p.discount_percentage}% ছাড়)` : ""}`),
        ...(universalEn.data || []).map((p: any) => `🛍️ ${p.name_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""}`),
      ];
    }
  }

  // Order tracking
  let orderInfo = "";
  const orderMatch = userMessage.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || userMessage.match(/(\d{6,})/);
  if (orderMatch) {
    const orderNum = orderMatch[0].replace('#', '');
    const { data: od } = await supabase.rpc("get_order_tracking", { p_order_number: orderNum });
    if (od && !od.error) {
      const statusMap: Record<string, string> = {
        pending: "⏳ পেন্ডিং", confirmed: "✅ কনফার্মড", processing: "🔄 প্রসেসিং",
        shipped: "🚚 শিপড", delivered: "📦 ডেলিভারড", cancelled: "❌ বাতিল"
      };
      orderInfo = `\n📦 অর্ডার #${od.order_number}: ${statusMap[od.status] || od.status} | কুরিয়ার: ${od.courier_provider || "N/A"} | ট্র্যাকিং: ${od.tracking_number || "শীঘ্রই"}`;
    }
  }

  const settingsMap: Record<string, string> = {};
  (settingsRes.data || []).forEach((s: any) => {
    settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
  });

  const siteName = settingsMap.site_name || "বইআলো";
  const siteUrl = settingsMap.site_url || "https://boialo.lovable.app";
  const bestSellers = (productsRes.data || []).slice(0, 8).map((p: any) =>
    `• ${p.title_bn} - ৳${p.price}${p.discount_percentage ? ` (${p.discount_percentage}% ছাড়)` : ""} | ${siteUrl}/product/${p.slug}`
  ).join("\n");
  const categoryList = (categoriesRes.data || []).map((c: any) => c.name_bn).join(", ");
  const activeCoupons = (offersRes.data || []).map((c: any) =>
    `• কোড: ${c.code} - ${c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`} ছাড়`
  ).join("\n");
  const deliveryInfo = (deliveryRes.data || []).map((d: any) =>
    `• ${d.zone_name_bn}: ৳${d.delivery_charge}`
  ).join("\n");

  return `তুমি "${siteName}" এর WhatsApp AI সহকারী "বই বন্ধু"। সবসময় বাংলায় উত্তর দাও।
🌐 ওয়েবসাইট: ${siteUrl}
📞 ফোন: ${settingsMap.contact_phone || "N/A"} | ইমেইল: ${settingsMap.contact_email || "N/A"}

📚 বেস্ট সেলার:\n${bestSellers || "তথ্য নেই"}
📂 ক্যাটাগরি: ${categoryList || "N/A"}
🎁 অফার:\n${activeCoupons || "বর্তমানে কোনো অফার নেই"}
🚚 ডেলিভারি:\n${deliveryInfo || "ঢাকায় ৳60, বাইরে ৳120"}
${searchResults.length > 0 ? `\n🔍 সার্চ রেজাল্ট:\n${searchResults.join("\n")}` : ""}${orderInfo}

⭐ নিয়ম:
1. ফ্রেন্ডলি, সংক্ষিপ্ত (২-৩ বাক্য) উত্তর দাও
2. প্রোডাক্ট রিকমেন্ড করলে সম্পূর্ণ URL সহ দাও
3. অর্ডার ট্র্যাকিং এ অর্ডার নম্বর জিজ্ঞেস করো
4. রিফান্ড/জটিল সমস্যায় ফোনে যোগাযোগ করতে বলো
5. পেমেন্ট: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
6. ইমোজি ব্যবহার করো
7. সার্চ রেজাল্ট থাকলে সেগুলো অগ্রাধিকার দাও
8. WhatsApp এ মার্কডাউন সাপোর্ট: *bold*, _italic_, ~strikethrough~ ব্যবহার করতে পারো`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ===== WhatsApp Webhook Verification (GET) =====
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const WA_VERIFY_TOKEN = Deno.env.get("FB_VERIFY_TOKEN"); // Same verify token for both

    if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ===== Incoming Messages (POST) =====
  try {
    const body = await req.json();
    console.log("WA webhook event:", JSON.stringify(body).slice(0, 500));

    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !LOVABLE_API_KEY) {
      console.error("Missing WhatsApp secrets");
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process WhatsApp Cloud API webhook
    const changes = body.entry?.[0]?.changes || [];
    for (const change of changes) {
      if (change.field !== "messages") continue;

      const messages = change.value?.messages || [];
      for (const msg of messages) {
        // Only handle text messages
        if (msg.type !== "text") continue;

        const senderPhone = msg.from;
        const messageText = msg.text?.body;
        if (!senderPhone || !messageText) continue;

        // Mark as read
        await markAsRead(msg.id, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN);

        // Build context and get AI response
        const systemPrompt = await buildSystemPrompt(supabase, messageText);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: messageText },
            ],
            stream: false,
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI gateway error:", aiResponse.status);
          await sendWAMessage(senderPhone, "দুঃখিত, এই মুহূর্তে সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন। 🙏", WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN);
          continue;
        }

        const aiData = await aiResponse.json();
        const reply = aiData.choices?.[0]?.message?.content || "দুঃখিত, উত্তর দিতে পারছি না। 🙏";

        // WhatsApp has 4096 char limit per message
        const chunks = splitMessage(reply, 4096);
        for (const chunk of chunks) {
          await sendWAMessage(senderPhone, chunk, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN);
        }

        // Log interaction
        const senderName = change.value?.contacts?.[0]?.profile?.name || "WhatsApp User";
        await supabase.from("chat_conversations").upsert({
          visitor_id: `wa_${senderPhone}`,
          visitor_name: senderName,
          visitor_phone: senderPhone,
          status: "open",
          last_message_at: new Date().toISOString(),
        }, { onConflict: "visitor_id" }).select().single();
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response("OK", { status: 200 }); // Always 200
  }
});

// Send text message via WhatsApp Cloud API
async function sendWAMessage(to: string, text: string, phoneNumberId: string, token: string) {
  const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("WA Send API error:", err);
  }
}

// Mark message as read
async function markAsRead(messageId: string, phoneNumberId: string, token: string) {
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// Split long messages
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt === -1 || splitAt < maxLength / 2) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}
