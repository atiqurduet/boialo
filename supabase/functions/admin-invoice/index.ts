import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !userRole) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, type } = await req.json();
    
    if (!orderId || !type) {
      return new Response(JSON.stringify({ error: "Order ID and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating ${type} for order: ${orderId}, admin: ${user.id}`);

    // Fetch order (admin can access any order)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
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

    let html = "";
    let filename = "";

    if (type === "invoice") {
      html = generateInvoiceHtml(order, orderItems || []);
      filename = `invoice-${order.order_number}.html`;
    } else if (type === "delivery-slip") {
      html = generateDeliverySlipHtml(order, orderItems || []);
      filename = `delivery-slip-${order.order_number}.html`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`${type} generated successfully for order: ${order.order_number}`);

    return new Response(
      JSON.stringify({ 
        html,
        filename
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating document:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate document" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateInvoiceHtml(order: any, orderItems: any[]): string {
  const paymentMethods: Record<string, string> = {
    cod: "ক্যাশ অন ডেলিভারি",
    bkash: "বিকাশ",
    nagad: "নগদ",
    card: "কার্ড পেমেন্ট",
  };

  const statusLabels: Record<string, string> = {
    pending: "পেন্ডিং",
    processing: "প্রসেসিং",
    shipped: "শিপড",
    delivered: "ডেলিভার্ড",
    cancelled: "বাতিল",
  };

  const orderDate = new Date(order.created_at).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.order_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Bengali', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 30px;
    }
    
    .invoice { max-width: 800px; margin: 0 auto; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #059669;
    }
    
    .logo { font-size: 32px; font-weight: 700; color: #059669; }
    .logo-sub { font-size: 12px; color: #6b7280; }
    
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #059669; font-weight: 700; margin-bottom: 8px; }
    .invoice-meta { color: #6b7280; font-size: 13px; }
    .invoice-meta p { margin: 4px 0; }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 40px;
    }
    
    .info-block { flex: 1; }
    .info-block h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 10px;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .info-block p { margin: 4px 0; font-size: 13px; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .items-table th {
      background: #059669;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
    }
    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table td:nth-child(2),
    .items-table td:nth-child(3),
    .items-table td:nth-child(4) { text-align: center; }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-table tr td { padding: 8px 0; font-size: 13px; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-table .total-row { border-top: 2px solid #059669; font-size: 18px; font-weight: 700; }
    .totals-table .total-row td { padding-top: 12px; color: #059669; }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #e0e7ff; color: #3730a3; }
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    @media print {
      body { padding: 0; }
      .invoice { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">WafiLife</div>
        <div class="logo-sub">ইসলামিক বুক স্টোর</div>
      </div>
      <div class="invoice-title">
        <h1>ইনভয়েস</h1>
        <div class="invoice-meta">
          <p><strong>অর্ডার নং:</strong> ${order.order_number}</p>
          <p><strong>তারিখ:</strong> ${orderDate}</p>
          <p><span class="status-badge status-${order.status}">${statusLabels[order.status] || order.status}</span></p>
        </div>
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-block">
        <h3>গ্রাহক তথ্য</h3>
        <p><strong>${order.full_name}</strong></p>
        <p>📞 ${order.phone}</p>
        ${order.email ? `<p>✉️ ${order.email}</p>` : ''}
        <p>📍 ${order.address}</p>
        <p>🗺️ ${order.delivery_area}</p>
      </div>
      <div class="info-block" style="text-align: right;">
        <h3>পেমেন্ট তথ্য</h3>
        <p><strong>${paymentMethods[order.payment_method] || order.payment_method}</strong></p>
        ${order.transaction_id ? `<p>TXN: ${order.transaction_id}</p>` : ''}
        ${order.tracking_number ? `<p>ট্র্যাকিং: ${order.tracking_number}</p>` : ''}
        ${order.courier_provider ? `<p>কুরিয়ার: ${order.courier_provider}</p>` : ''}
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%">পণ্য</th>
          <th>পরিমাণ</th>
          <th>মূল্য</th>
          <th>মোট</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map((item: any, index: number) => `
          <tr>
            <td>${index + 1}. ${item.product_title}</td>
            <td>${item.quantity}</td>
            <td>৳${Number(item.price).toLocaleString()}</td>
            <td>৳${(Number(item.price) * item.quantity).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>সাবটোটাল</td>
          <td>৳${Number(order.subtotal).toLocaleString()}</td>
        </tr>
        <tr>
          <td>ডেলিভারি চার্জ</td>
          <td>৳${Number(order.delivery_charge).toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td>সর্বমোট</td>
          <td>৳${Number(order.total).toLocaleString()}</td>
        </tr>
      </table>
    </div>
    
    <div class="footer">
      <p>ধন্যবাদ আপনার অর্ডারের জন্য!</p>
      <p>WafiLife - আপনার বিশ্বস্ত ইসলামিক বুক স্টোর</p>
    </div>
  </div>
</body>
</html>`;
}

function generateDeliverySlipHtml(order: any, orderItems: any[]): string {
  const orderDate = new Date(order.created_at).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paymentMethods: Record<string, string> = {
    cod: "ক্যাশ অন ডেলিভারি",
    bkash: "বিকাশ",
    nagad: "নগদ",
    card: "কার্ড",
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Delivery Slip - ${order.order_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Bengali', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 20px;
    }
    
    .slip { max-width: 400px; margin: 0 auto; border: 2px dashed #059669; padding: 20px; }
    
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #059669; }
    .logo { font-size: 24px; font-weight: 700; color: #059669; }
    .slip-title { font-size: 16px; font-weight: 600; margin-top: 5px; color: #374151; }
    
    .order-info { 
      background: #f0fdf4; 
      padding: 12px; 
      border-radius: 8px; 
      margin-bottom: 15px;
      text-align: center;
    }
    .order-number { font-size: 18px; font-weight: 700; color: #059669; }
    .order-date { font-size: 11px; color: #6b7280; margin-top: 4px; }
    
    .section { margin-bottom: 15px; }
    .section-title { 
      font-size: 11px; 
      font-weight: 700; 
      color: #059669; 
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    
    .customer-info p { margin: 3px 0; font-size: 12px; }
    .customer-name { font-size: 16px; font-weight: 700; }
    .customer-phone { font-size: 14px; font-weight: 600; color: #059669; }
    
    .items-list { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .item { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 10px; 
      border-bottom: 1px solid #e5e7eb;
      font-size: 12px;
    }
    .item:last-child { border-bottom: none; }
    .item-name { flex: 1; }
    .item-qty { 
      background: #059669; 
      color: white; 
      padding: 2px 8px; 
      border-radius: 10px; 
      font-size: 11px;
      font-weight: 600;
    }
    
    .payment-box {
      background: ${order.payment_method === 'cod' ? '#fef3c7' : '#d1fae5'};
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 15px;
    }
    .payment-method { font-size: 11px; color: #6b7280; }
    .payment-amount { font-size: 22px; font-weight: 700; color: ${order.payment_method === 'cod' ? '#92400e' : '#059669'}; }
    .cod-badge { 
      display: inline-block; 
      background: #dc2626; 
      color: white; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 12px; 
      font-weight: 700;
      margin-top: 5px;
    }
    
    .courier-info {
      background: #f3f4f6;
      padding: 10px;
      border-radius: 6px;
      font-size: 11px;
    }
    .courier-info p { margin: 3px 0; }
    
    .footer { 
      text-align: center; 
      padding-top: 15px; 
      border-top: 1px dashed #d1d5db;
      font-size: 10px;
      color: #9ca3af;
    }
    
    .notes {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      padding: 8px;
      border-radius: 6px;
      font-size: 11px;
      margin-bottom: 15px;
    }
    .notes-title { font-weight: 600; color: #92400e; }
    
    @media print {
      body { padding: 0; }
      .slip { border: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <div class="logo">WafiLife</div>
      <div class="slip-title">ডেলিভারি স্লিপ</div>
    </div>
    
    <div class="order-info">
      <div class="order-number">#${order.order_number}</div>
      <div class="order-date">${orderDate}</div>
    </div>
    
    <div class="section">
      <div class="section-title">📦 প্রাপক</div>
      <div class="customer-info">
        <p class="customer-name">${order.full_name}</p>
        <p class="customer-phone">📞 ${order.phone}</p>
        <p>📍 ${order.address}</p>
        <p>🗺️ ${order.delivery_area}</p>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">📋 পণ্য তালিকা (${orderItems.length} আইটেম)</div>
      <div class="items-list">
        ${orderItems.map((item: any, index: number) => `
          <div class="item">
            <span class="item-name">${index + 1}. ${item.product_title}</span>
            <span class="item-qty">×${item.quantity}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="payment-box">
      <div class="payment-method">${paymentMethods[order.payment_method] || order.payment_method}</div>
      <div class="payment-amount">৳${Number(order.total).toLocaleString()}</div>
      ${order.payment_method === 'cod' ? '<div class="cod-badge">💵 ক্যাশ কালেক্ট করুন</div>' : '<div style="color: #059669; font-size: 12px; margin-top: 5px;">✅ পেমেন্ট সম্পন্ন</div>'}
    </div>
    
    ${order.notes ? `
    <div class="notes">
      <span class="notes-title">📝 নোট:</span> ${order.notes}
    </div>
    ` : ''}
    
    ${order.courier_provider || order.tracking_number ? `
    <div class="courier-info">
      ${order.courier_provider ? `<p><strong>কুরিয়ার:</strong> ${order.courier_provider}</p>` : ''}
      ${order.tracking_number ? `<p><strong>ট্র্যাকিং:</strong> ${order.tracking_number}</p>` : ''}
    </div>
    ` : ''}
    
    <div class="footer">
      <p>WafiLife - ইসলামিক বুক স্টোর</p>
      <p>ডেলিভারি সংক্রান্ত সমস্যায় যোগাযোগ করুন</p>
    </div>
  </div>
</body>
</html>`;
}
