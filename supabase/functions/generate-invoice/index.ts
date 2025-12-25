import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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

    const paymentMethods: Record<string, string> = {
      cod: "Cash on Delivery",
      bkash: "bKash",
      nagad: "Nagad",
      card: "Card Payment",
    };

    const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate HTML invoice with proper Unicode support
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Bengali', 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    
    .invoice {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #059669;
    }
    
    .invoice-title {
      text-align: right;
    }
    
    .invoice-title h1 {
      font-size: 24px;
      color: #6b7280;
      font-weight: 600;
    }
    
    .invoice-meta {
      margin-top: 10px;
      color: #6b7280;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .info-block h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    
    .info-block p {
      margin: 4px 0;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .totals {
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      width: 300px;
    }
    
    .totals-table tr td {
      padding: 8px 0;
    }
    
    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-table .total-row {
      border-top: 2px solid #e5e7eb;
      font-size: 18px;
      font-weight: 700;
    }
    
    .totals-table .total-row td {
      padding-top: 16px;
      color: #059669;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #e0e7ff; color: #3730a3; }
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">WafiLife</div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-meta">
          <p><strong>Order:</strong> ${order.order_number}</p>
          <p><strong>Date:</strong> ${orderDate}</p>
          <p><span class="status-badge status-${order.status}">${order.status}</span></p>
        </div>
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-block">
        <h3>Bill To</h3>
        <p><strong>${order.full_name}</strong></p>
        <p>${order.phone}</p>
        ${order.email ? `<p>${order.email}</p>` : ''}
        <p>${order.address}</p>
      </div>
      <div class="info-block" style="text-align: right;">
        <h3>Payment Method</h3>
        <p>${paymentMethods[order.payment_method] || order.payment_method}</p>
        ${order.transaction_id ? `<p>TXN: ${order.transaction_id}</p>` : ''}
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${(orderItems || []).map((item: any) => `
          <tr>
            <td>${item.product_title}</td>
            <td>${item.quantity}</td>
            <td>৳${Number(item.price).toFixed(0)}</td>
            <td>৳${(Number(item.price) * item.quantity).toFixed(0)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal</td>
          <td>৳${Number(order.subtotal).toFixed(0)}</td>
        </tr>
        <tr>
          <td>Delivery Charge</td>
          <td>৳${Number(order.delivery_charge).toFixed(0)}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td>৳${Number(order.total).toFixed(0)}</td>
        </tr>
      </table>
    </div>
    
    <div class="footer">
      <p>Thank you for your order! | ধন্যবাদ!</p>
      <p>WafiLife - Your trusted Islamic bookstore</p>
    </div>
  </div>
</body>
</html>
    `;

    // Convert HTML to base64 data URI for download
    const base64Html = btoa(unescape(encodeURIComponent(html)));
    const dataUri = `data:text/html;charset=utf-8;base64,${base64Html}`;

    console.log(`Invoice generated successfully for order: ${order.order_number}`);

    return new Response(
      JSON.stringify({ 
        html: dataUri,
        filename: `invoice-${order.order_number}.html`,
        rawHtml: html
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
