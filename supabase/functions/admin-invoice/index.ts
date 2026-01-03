import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceSettings {
  company_name: string;
  company_tagline: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  footer_text: string;
  logo_url: string;
}

async function fetchInvoiceSettings(supabase: any): Promise<InvoiceSettings> {
  const defaultSettings: InvoiceSettings = {
    company_name: "বইআলো",
    company_tagline: "আপনার বিশ্বস্ত অনলাইন বই স্টোর",
    company_address: "ঢাকা, বাংলাদেশ",
    company_phone: "+880 1XXX-XXXXXX",
    company_email: "support@boialo.com",
    footer_text: "ধন্যবাদ আপনার অর্ডারের জন্য!",
    logo_url: "",
  };

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .or("category.eq.invoice,setting_key.eq.header_logo");

    if (error || !data) {
      console.log("Error fetching settings, using defaults:", error);
      return defaultSettings;
    }

    data.forEach((item: any) => {
      const value = typeof item.setting_value === 'string' 
        ? item.setting_value.replace(/^"|"$/g, '') 
        : String(item.setting_value || '');
      
      switch (item.setting_key) {
        case 'invoice_company_name':
          defaultSettings.company_name = value;
          break;
        case 'invoice_company_tagline':
          defaultSettings.company_tagline = value;
          break;
        case 'invoice_company_address':
          defaultSettings.company_address = value;
          break;
        case 'invoice_company_phone':
          defaultSettings.company_phone = value;
          break;
        case 'invoice_company_email':
          defaultSettings.company_email = value;
          break;
        case 'invoice_footer_text':
          defaultSettings.footer_text = value;
          break;
        case 'header_logo':
          defaultSettings.logo_url = value;
          break;
      }
    });

    return defaultSettings;
  } catch (err) {
    console.log("Exception fetching settings:", err);
    return defaultSettings;
  }
}

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

    // Fetch invoice settings
    const settings = await fetchInvoiceSettings(supabase);

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
      html = generateInvoiceHtml(order, orderItems || [], settings);
      filename = `invoice-${order.order_number}.html`;
    } else if (type === "delivery-slip") {
      html = generateDeliverySlipHtml(order, orderItems || [], settings);
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

function generateInvoiceHtml(order: any, orderItems: any[], settings: InvoiceSettings): string {
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

  const logoHtml = settings.logo_url 
    ? `<img src="${settings.logo_url}" alt="${settings.company_name}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />`
    : `<div class="logo">${settings.company_name}</div>`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${order.order_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Bengali', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .invoice { max-width: 100%; margin: 0 auto; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #059669;
    }
    
    .company-info { display: flex; flex-direction: column; gap: 2px; }
    .logo { font-size: 22px; font-weight: 700; color: #059669; }
    .logo-sub { font-size: 10px; color: #6b7280; }
    .company-contact { font-size: 9px; color: #6b7280; margin-top: 3px; }
    
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 20px; color: #059669; font-weight: 700; margin-bottom: 5px; }
    .invoice-meta { color: #6b7280; font-size: 11px; }
    .invoice-meta p { margin: 2px 0; }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      gap: 20px;
    }
    
    .info-block { flex: 1; }
    .info-block h3 {
      font-size: 10px;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    .info-block p { margin: 2px 0; font-size: 11px; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .items-table th {
      background: #059669;
      color: white;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
    }
    .items-table th:nth-child(1) { width: 8%; text-align: center; }
    .items-table th:nth-child(2) { width: 47%; }
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5) { width: 15%; text-align: right; }
    
    .items-table td { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    .items-table td:nth-child(1) { text-align: center; }
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5) { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 200px; }
    .totals-table tr td { padding: 4px 0; font-size: 11px; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-table .total-row { border-top: 2px solid #059669; }
    .totals-table .total-row td { padding-top: 8px; font-size: 14px; font-weight: 700; color: #059669; }
    
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #e0e7ff; color: #3730a3; }
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    @media print {
      body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .invoice { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company-info">
        ${logoHtml}
        <div class="logo-sub">${settings.company_tagline}</div>
        <div class="company-contact">
          📍 ${settings.company_address} | 📞 ${settings.company_phone} | ✉️ ${settings.company_email}
        </div>
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
          <th>নং</th>
          <th>পণ্য</th>
          <th>পরিমাণ</th>
          <th>মূল্য</th>
          <th>মোট</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map((item: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.product_title}</td>
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
      <p>${settings.footer_text}</p>
      <p>${settings.company_name} - ${settings.company_tagline}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateDeliverySlipHtml(order: any, orderItems: any[], settings: InvoiceSettings): string {
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

  const logoHtml = settings.logo_url 
    ? `<img src="${settings.logo_url}" alt="${settings.company_name}" style="max-height: 40px; max-width: 120px; object-fit: contain;" />`
    : `<div class="logo">${settings.company_name}</div>`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Slip - ${order.order_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Bengali', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
      padding: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .slip { max-width: 350px; margin: 0 auto; border: 2px dashed #059669; padding: 12px; }
    
    .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #059669; }
    .logo { font-size: 18px; font-weight: 700; color: #059669; }
    .slip-title { font-size: 12px; font-weight: 600; margin-top: 3px; color: #374151; }
    
    .order-info { 
      background: #f0fdf4; 
      padding: 8px; 
      border-radius: 6px; 
      margin-bottom: 10px;
      text-align: center;
    }
    .order-number { font-size: 14px; font-weight: 700; color: #059669; }
    .order-date { font-size: 9px; color: #6b7280; margin-top: 2px; }
    
    .section { margin-bottom: 10px; }
    .section-title { 
      font-size: 9px; 
      font-weight: 700; 
      color: #059669; 
      text-transform: uppercase;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    
    .customer-info p { margin: 2px 0; font-size: 10px; }
    .customer-name { font-size: 13px; font-weight: 700; }
    .customer-phone { font-size: 12px; font-weight: 600; color: #059669; }
    
    .items-list { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
    .item { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 8px; 
      border-bottom: 1px solid #e5e7eb;
      font-size: 10px;
    }
    .item:last-child { border-bottom: none; }
    .item-name { flex: 1; }
    .item-qty { 
      background: #059669; 
      color: white; 
      padding: 1px 6px; 
      border-radius: 8px; 
      font-size: 9px;
      font-weight: 600;
    }
    
    .payment-box {
      background: ${order.payment_method === 'cod' ? '#fef3c7' : '#d1fae5'};
      padding: 8px;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 10px;
    }
    .payment-method { font-size: 9px; color: #6b7280; }
    .payment-amount { font-size: 16px; font-weight: 700; color: ${order.payment_method === 'cod' ? '#92400e' : '#059669'}; }
    .cod-badge { 
      display: inline-block; 
      background: #dc2626; 
      color: white; 
      padding: 2px 8px; 
      border-radius: 3px; 
      font-size: 10px; 
      font-weight: 700;
      margin-top: 3px;
    }
    
    .courier-info {
      background: #f3f4f6;
      padding: 6px;
      border-radius: 4px;
      font-size: 9px;
    }
    .courier-info p { margin: 2px 0; }
    
    .footer { 
      text-align: center; 
      padding-top: 8px; 
      border-top: 1px dashed #d1d5db;
      font-size: 8px;
      color: #9ca3af;
    }
    
    .notes {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      padding: 5px;
      border-radius: 4px;
      font-size: 9px;
      margin-bottom: 10px;
    }
    .notes-title { font-weight: 600; color: #92400e; }
    
    @media print {
      body { padding: 5px; }
      .slip { border: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      ${logoHtml}
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
      <div class="section-title">📋 পণ্য তালিকা (${orderItems.length}টি)</div>
      <div class="items-list">
        ${orderItems.map((item: any) => `
          <div class="item">
            <span class="item-name">${item.product_title}</span>
            <span class="item-qty">×${item.quantity}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="payment-box">
      <div class="payment-method">${paymentMethods[order.payment_method] || order.payment_method}</div>
      <div class="payment-amount">৳${Number(order.total).toLocaleString()}</div>
      ${order.payment_method === 'cod' ? '<div class="cod-badge">টাকা আদায় করুন</div>' : ''}
    </div>
    
    ${order.notes ? `
      <div class="notes">
        <span class="notes-title">📝 নোট:</span> ${order.notes}
      </div>
    ` : ''}
    
    ${(order.courier_provider || order.tracking_number) ? `
      <div class="courier-info">
        ${order.courier_provider ? `<p><strong>কুরিয়ার:</strong> ${order.courier_provider}</p>` : ''}
        ${order.tracking_number ? `<p><strong>ট্র্যাকিং:</strong> ${order.tracking_number}</p>` : ''}
      </div>
    ` : ''}
    
    <div class="footer">
      <p>${settings.company_name} | ${settings.company_phone}</p>
    </div>
  </div>
</body>
</html>`;
}