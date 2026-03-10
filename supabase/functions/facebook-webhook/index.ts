import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getChatbotSettings(supabase: any) {
  const { data } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [
      "chatbot_fb_enabled", "chatbot_fb_page_token", "chatbot_fb_verify_token",
      "chatbot_name", "chatbot_tone", "chatbot_faq",
      "chatbot_custom_instructions", "chatbot_restricted_topics", "chatbot_fallback_message",
    ]);
  const cs: Record<string, any> = {};
  (data || []).forEach((s: any) => {
    try { cs[s.setting_key] = typeof s.setting_value === "string" ? JSON.parse(s.setting_value) : s.setting_value; } catch { cs[s.setting_key] = s.setting_value; }
  });
  return cs;
}

// Get or create conversation & return conversation_id
async function getOrCreateConversation(supabase: any, visitorId: string, visitorName: string) {
  // Try to find existing open conversation
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("visitor_id", visitorId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing?.id) return existing.id;

  // Create new conversation
  const { data: newConv } = await supabase
    .from("chat_conversations")
    .insert({
      visitor_id: visitorId,
      visitor_name: visitorName,
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return newConv?.id;
}

// Save message to chat_messages
async function saveMessage(supabase: any, conversationId: string, senderType: string, senderName: string, message: string) {
  await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    sender_type: senderType,
    sender_name: senderName,
    message,
    message_type: "text",
  });
  // Update last_message_at
  await supabase.from("chat_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
}

// Get recent conversation history as AI messages
async function getConversationHistory(supabase: any, conversationId: string, limit = 10): Promise<{ role: string; content: string }[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("sender_type, message")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // Reverse to get chronological order, map to AI message format
  return data.reverse().map((m: any) => ({
    role: m.sender_type === "visitor" ? "user" : "assistant",
    content: m.message,
  }));
}

// Build system prompt with product data + admin settings
async function buildSystemPrompt(supabase: any, userMessage: string, cs: Record<string, any>) {
  const searchTerms = userMessage.replace(/[।,?!।?\-]/g, " ").trim();
  const botName = cs.chatbot_name || "বই বন্ধু";

  const [productsRes, categoriesRes, settingsRes, offersRes, deliveryRes] = await Promise.all([
    supabase.from("products").select("title_bn, price, slug, stock_quantity, discount_percent").eq("is_active", true).order("sales_count", { ascending: false }).limit(10),
    supabase.from("categories").select("name_bn, slug").eq("is_active", true).limit(15),
    supabase.from("site_settings").select("setting_key, setting_value").in("setting_key", ["site_name", "contact_phone", "contact_email", "site_url"]),
    supabase.from("coupons").select("code, discount_type, discount_value, min_order_amount").eq("is_active", true).limit(5),
    supabase.from("delivery_zones").select("zone_name_bn, delivery_charge, estimated_days_min, estimated_days_max").eq("is_active", true).limit(8),
  ]);

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
    if (searchResults.length === 0) {
      const [booksEn, universalEn] = await Promise.all([
        supabase.from("products").select("title_bn, price, slug, discount_percent").eq("is_active", true).ilike("title_en", `%${searchTerms}%`).limit(8),
        supabase.from("universal_products").select("name_bn, price, slug, discount_percent").eq("is_active", true).ilike("name_en", `%${searchTerms}%`).limit(8),
      ]);
      searchResults = [
        ...(booksEn.data || []).map((p: any) => `📚 ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""}`),
        ...(universalEn.data || []).map((p: any) => `🛍️ ${p.name_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""}`),
      ];
    }
  }

  let orderInfo = "";
  const orderMatch = userMessage.match(/(?:BOI|ORD|#)[\-]?(\d{4,})/i) || userMessage.match(/(\d{6,})/);
  if (orderMatch) {
    const orderNum = orderMatch[0].replace('#', '');
    const { data: od } = await supabase.rpc("get_order_tracking", { p_order_number: orderNum });
    if (od && !od.error) {
      const statusMap: Record<string, string> = { pending: "⏳ পেন্ডিং", confirmed: "✅ কনফার্মড", processing: "🔄 প্রসেসিং", shipped: "🚚 শিপড", delivered: "📦 ডেলিভারড", cancelled: "❌ বাতিল" };
      orderInfo = `\n📦 অর্ডার #${od.order_number}: ${statusMap[od.status] || od.status} | কুরিয়ার: ${od.courier_provider || "N/A"} | ট্র্যাকিং: ${od.tracking_number || "শীঘ্রই"}`;
    }
  }

  const settingsMap: Record<string, string> = {};
  (settingsRes.data || []).forEach((s: any) => { settingsMap[s.setting_key] = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value); });

  const siteName = settingsMap.site_name || "বইআলো";
  const siteUrl = settingsMap.site_url || "https://boialo.lovable.app";
  const bestSellers = (productsRes.data || []).slice(0, 8).map((p: any) => `• ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | ${siteUrl}/product/${p.slug}`).join("\n");
  const categoryList = (categoriesRes.data || []).map((c: any) => c.name_bn).join(", ");
  const activeCoupons = (offersRes.data || []).map((c: any) => `• কোড: ${c.code} - ${c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`} ছাড়`).join("\n");
  const deliveryInfo = (deliveryRes.data || []).map((d: any) => `• ${d.zone_name_bn}: ৳${d.delivery_charge}`).join("\n");

  const toneMap: Record<string, string> = { friendly: "বন্ধুসুলভ ও আন্তরিক ভাবে কথা বলো", professional: "প্রফেশনাল ও সংক্ষিপ্ত ভাবে উত্তর দাও", casual: "ক্যাজুয়াল ও মজাদার ভাবে কথা বলো", formal: "ফর্মাল ও সম্মানজনক ভাবে আপনি সম্বোধন ব্যবহার করো" };
  const toneInstruction = toneMap[cs.chatbot_tone] || toneMap.friendly;

  const faqItems = Array.isArray(cs.chatbot_faq) ? cs.chatbot_faq : [];
  let faqSection = "";
  if (faqItems.length > 0) {
    faqSection = `\n\n📋 FAQ:\n` + faqItems.filter((f: any) => f.question && f.answer).map((f: any) => `প্রশ্ন: "${f.question}"\nউত্তর: ${f.answer}`).join("\n\n");
  }

  const restricted = Array.isArray(cs.chatbot_restricted_topics) ? cs.chatbot_restricted_topics : [];
  let restrictedSection = "";
  if (restricted.length > 0) {
    const fallback = cs.chatbot_fallback_message || "দুঃখিত, এই বিষয়ে আমি সাহায্য করতে পারছি না।";
    restrictedSection = `\n\n🚫 নিষিদ্ধ (এগুলো বললে বলবে: "${fallback}"):\n${restricted.map((t: string) => `- ${t}`).join("\n")}`;
  }

  const customInstructions = cs.chatbot_custom_instructions;
  let customSection = "";
  if (customInstructions && typeof customInstructions === "string" && customInstructions.trim()) {
    customSection = `\n\n📝 বিশেষ নির্দেশনা:\n${customInstructions}`;
  }

  return `তুমি "${siteName}" এর Facebook Messenger AI সহকারী "${botName}"। সবসময় বাংলায় উত্তর দাও।
তুমি কথোপকথনের ইতিহাস মনে রাখো — আগের মেসেজ context হিসেবে পাবে। ধারাবাহিকভাবে উত্তর দাও।

🌐 ওয়েবসাইট: ${siteUrl}
📞 ফোন: ${settingsMap.contact_phone || "N/A"} | ইমেইল: ${settingsMap.contact_email || "N/A"}

📚 বেস্ট সেলার:\n${bestSellers || "তথ্য নেই"}
📂 ক্যাটাগরি: ${categoryList || "N/A"}
🎁 অফার:\n${activeCoupons || "বর্তমানে কোনো অফার নেই"}
🚚 ডেলিভারি:\n${deliveryInfo || "ঢাকায় ৳60, বাইরে ৳120"}
${searchResults.length > 0 ? `\n🔍 সার্চ রেজাল্ট:\n${searchResults.join("\n")}` : ""}${orderInfo}${faqSection}${restrictedSection}${customSection}

⭐ নিয়ম:
1. ${toneInstruction}
2. প্রোডাক্ট রিকমেন্ড করলে সম্পূর্ণ URL সহ দাও (মেসেঞ্জারে মার্কডাউন কাজ করে না)
3. অর্ডার ট্র্যাকিং এ অর্ডার নম্বর জিজ্ঞেস করো
4. রিফান্ড/জটিল সমস্যায় ফোনে যোগাযোগ করতে বলো
5. পেমেন্ট: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
6. ইমোজি ব্যবহার করো
7. সার্চ রেজাল্ট ও FAQ থাকলে সেগুলো অগ্রাধিকার দাও
8. কখনো "নমস্কার" বলবে না। "আসসালামু আলাইকুম"/"হ্যালো" ব্যবহার করো
9. আগের কথোপকথনের সাথে consistent থাকো — যা আগে বলেছো সেটা মনে রাখো`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // ===== Facebook Webhook Verification (GET) =====
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const cs = await getChatbotSettings(supabase);
    const FB_VERIFY_TOKEN = cs.chatbot_fb_verify_token || Deno.env.get("FB_VERIFY_TOKEN");

    if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
      console.log("Facebook webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ===== Incoming Messages (POST) =====
  try {
    const body = await req.json();
    console.log("FB webhook event:", JSON.stringify(body).slice(0, 500));

    const cs = await getChatbotSettings(supabase);

    if (cs.chatbot_fb_enabled === false || cs.chatbot_fb_enabled === "false") {
      console.log("FB chatbot disabled via admin settings");
      return new Response("OK", { status: 200 });
    }

    const FB_PAGE_ACCESS_TOKEN = cs.chatbot_fb_page_token || Deno.env.get("FB_PAGE_ACCESS_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FB_PAGE_ACCESS_TOKEN || !LOVABLE_API_KEY) {
      console.error("Missing FB_PAGE_ACCESS_TOKEN or LOVABLE_API_KEY");
      return new Response("OK", { status: 200 });
    }

    if (body.object === "page") {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          const messageText = event.message?.text;
          if (!senderId || !messageText) continue;
          if (event.message?.is_echo) continue;

          const visitorId = `fb_${senderId}`;

          // Get or create conversation
          const conversationId = await getOrCreateConversation(supabase, visitorId, "Facebook User");
          if (!conversationId) {
            console.error("Failed to get/create conversation");
            continue;
          }

          // Save incoming user message
          await saveMessage(supabase, conversationId, "visitor", "Facebook User", messageText);

          await sendFBAction(senderId, "typing_on", FB_PAGE_ACCESS_TOKEN);

          // Build system prompt with product context
          const systemPrompt = await buildSystemPrompt(supabase, messageText, cs);

          // Get conversation history (last 10 messages)
          const history = await getConversationHistory(supabase, conversationId, 10);

          // Build messages array: system + history (history already includes current message)
          const aiMessages = [
            { role: "system", content: systemPrompt },
            ...history,
          ];

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: aiMessages,
              stream: false,
            }),
          });

          if (!aiResponse.ok) {
            console.error("AI gateway error:", aiResponse.status);
            const errMsg = "দুঃখিত, এই মুহূর্তে সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন। 🙏";
            await sendFBMessage(senderId, errMsg, FB_PAGE_ACCESS_TOKEN);
            await saveMessage(supabase, conversationId, "bot", cs.chatbot_name || "বই বন্ধু", errMsg);
            continue;
          }

          const aiData = await aiResponse.json();
          const reply = aiData.choices?.[0]?.message?.content || "দুঃখিত, উত্তর দিতে পারছি না। 🙏";

          // Save bot reply
          await saveMessage(supabase, conversationId, "bot", cs.chatbot_name || "বই বন্ধু", reply);

          // Send reply in chunks
          const chunks = splitMessage(reply, 2000);
          for (const chunk of chunks) {
            await sendFBMessage(senderId, chunk, FB_PAGE_ACCESS_TOKEN);
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Facebook webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

async function sendFBMessage(recipientId: string, text: string, token: string) {
  const resp = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!resp.ok) console.error("FB Send API error:", await resp.text());
}

async function sendFBAction(recipientId: string, action: string, token: string) {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, sender_action: action }),
  });
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) { chunks.push(remaining); break; }
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt === -1 || splitAt < maxLength / 2) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}
