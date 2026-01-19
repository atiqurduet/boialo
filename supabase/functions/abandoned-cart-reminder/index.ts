import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting abandoned cart reminder process...");

    // Get abandoned carts from the last 24 hours that haven't been recovered
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: abandonedCarts, error: cartsError } = await supabase
      .from("abandoned_checkouts")
      .select("*")
      .eq("recovered", false)
      .lt("last_activity_at", oneHourAgo)
      .gt("last_activity_at", twentyFourHoursAgo)
      .not("email", "is", null);

    if (cartsError) {
      console.error("Error fetching abandoned carts:", cartsError);
      throw cartsError;
    }

    console.log(`Found ${abandonedCarts?.length || 0} abandoned carts`);

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No abandoned carts to process" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the abandoned cart email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", "abandoned_cart")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("No active abandoned cart template found");
      return new Response(
        JSON.stringify({ error: "No abandoned cart email template found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];
    const siteUrl = Deno.env.get("SITE_URL") || "https://boialo.lovable.app";

    for (const cart of abandonedCarts) {
      try {
        const cartItems = cart.cart_items as Array<{ quantity: number }> || [];
        const itemCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

        // Replace template variables
        let html = template.html_content
          .replace(/\{\{name\}\}/g, cart.full_name || "প্রিয় গ্রাহক")
          .replace(/\{\{item_count\}\}/g, itemCount.toString())
          .replace(/\{\{total\}\}/g, (cart.subtotal || 0).toString())
          .replace(/\{\{cart_url\}\}/g, `${siteUrl}/cart`);

        let subject = template.subject
          .replace(/\{\{name\}\}/g, cart.full_name || "প্রিয় গ্রাহক")
          .replace(/\{\{item_count\}\}/g, itemCount.toString());

        // Send email using the send-email function
        const emailResponse = await supabase.functions.invoke("send-email", {
          body: {
            to: cart.email,
            subject,
            html,
          },
        });

        if (emailResponse.error) {
          console.error(`Error sending to ${cart.email}:`, emailResponse.error);
          results.push({ email: cart.email, success: false, error: emailResponse.error.message });
        } else {
          console.log(`Sent reminder to ${cart.email}`);
          results.push({ email: cart.email, success: true });

          // Check if this email is a subscriber
          const { data: existingSubscriber } = await supabase
            .from("email_subscribers")
            .select("id")
            .eq("email", cart.email)
            .single();

          // If not a subscriber, add them
          if (!existingSubscriber) {
            await supabase.from("email_subscribers").insert({
              email: cart.email,
              full_name: cart.full_name,
              phone: cart.phone,
              user_id: cart.user_id,
              source: "abandoned_cart",
            });
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error processing cart for ${cart.email}:`, error);
        results.push({ email: cart.email, success: false, error: errMsg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${results.length} emails sent`);

    return new Response(
      JSON.stringify({
        message: "Abandoned cart reminders processed",
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in abandoned-cart-reminder function:", error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
