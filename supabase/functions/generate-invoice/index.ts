import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating invoice for order: ${orderId}, user: ${user.id}`);

    // Fetch order with user verification
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Order items fetch error:", itemsError);
      return new Response(JSON.stringify({ error: "Failed to fetch order items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(33, 37, 41);
    doc.text("WafiLife", 20, 25);
    
    doc.setFontSize(12);
    doc.setTextColor(108, 117, 125);
    doc.text("Invoice", pageWidth - 20, 25, { align: "right" });

    // Order info
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    doc.text(`Order Number: ${order.order_number}`, 20, 45);
    doc.text(`Date: ${orderDate}`, 20, 52);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 59);

    // Customer info
    doc.setFontSize(11);
    doc.setTextColor(33, 37, 41);
    doc.text("Bill To:", 20, 75);
    doc.setFontSize(10);
    doc.text(order.full_name, 20, 82);
    doc.text(order.phone, 20, 89);
    if (order.email) {
      doc.text(order.email, 20, 96);
    }
    doc.setTextColor(108, 117, 125);
    const addressLines = doc.splitTextToSize(order.address, 80);
    let addressY = order.email ? 103 : 96;
    addressLines.forEach((line: string) => {
      doc.text(line, 20, addressY);
      addressY += 6;
    });

    // Table header
    let tableY = addressY + 15;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, tableY - 5, pageWidth - 40, 10, "F");
    
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    doc.text("Item", 22, tableY);
    doc.text("Qty", 120, tableY);
    doc.text("Price", 145, tableY);
    doc.text("Total", pageWidth - 22, tableY, { align: "right" });

    // Table rows
    tableY += 12;
    doc.setTextColor(73, 80, 87);
    
    (orderItems || []).forEach((item: any) => {
      const itemTotal = Number(item.price) * item.quantity;
      const titleLines = doc.splitTextToSize(item.product_title, 90);
      
      doc.text(titleLines[0], 22, tableY);
      doc.text(item.quantity.toString(), 120, tableY);
      doc.text(`${Number(item.price).toFixed(0)} BDT`, 145, tableY);
      doc.text(`${itemTotal.toFixed(0)} BDT`, pageWidth - 22, tableY, { align: "right" });
      
      tableY += titleLines.length > 1 ? 14 : 10;
    });

    // Separator line
    tableY += 5;
    doc.setDrawColor(222, 226, 230);
    doc.line(20, tableY, pageWidth - 20, tableY);

    // Totals
    tableY += 12;
    doc.setTextColor(108, 117, 125);
    doc.text("Subtotal:", 130, tableY);
    doc.setTextColor(33, 37, 41);
    doc.text(`${Number(order.subtotal).toFixed(0)} BDT`, pageWidth - 22, tableY, { align: "right" });

    tableY += 8;
    doc.setTextColor(108, 117, 125);
    doc.text("Delivery Charge:", 130, tableY);
    doc.setTextColor(33, 37, 41);
    doc.text(`${Number(order.delivery_charge).toFixed(0)} BDT`, pageWidth - 22, tableY, { align: "right" });

    tableY += 10;
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text("Total:", 130, tableY);
    doc.text(`${Number(order.total).toFixed(0)} BDT`, pageWidth - 22, tableY, { align: "right" });

    // Payment method
    tableY += 15;
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    const paymentMethods: Record<string, string> = {
      cod: "Cash on Delivery",
      bkash: "bKash",
      nagad: "Nagad",
      card: "Card Payment",
    };
    doc.text(`Payment Method: ${paymentMethods[order.payment_method] || order.payment_method}`, 20, tableY);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(9);
    doc.setTextColor(173, 181, 189);
    doc.text("Thank you for your order!", pageWidth / 2, footerY, { align: "center" });
    doc.text("WafiLife - Your trusted Islamic bookstore", pageWidth / 2, footerY + 6, { align: "center" });

    // Generate PDF as base64
    const pdfBase64 = doc.output("datauristring");

    console.log(`Invoice generated successfully for order: ${order.order_number}`);

    return new Response(
      JSON.stringify({ 
        pdf: pdfBase64,
        filename: `invoice-${order.order_number}.pdf`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating invoice:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate invoice" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
