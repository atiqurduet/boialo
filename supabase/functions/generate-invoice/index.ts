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

    const body = await req.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    
    // Validate orderId as UUID
    if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return new Response(JSON.stringify({ error: "Valid Order ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating invoice for order: ${orderId}, user: ${user.id}`);

    // Fetch invoice settings
    const settings = await fetchInvoiceSettings(supabase);

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

    // Generate QR code URL for order tracking
    const trackingUrl = `https://boialo.lovable.app/track/${order.order_number}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(trackingUrl)}`;

    const html = `<!DOCTYPE html>
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
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 30px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .invoice { max-width: 800px; margin: 0 auto; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 3px solid #059669;
    }
    
    .company-info { display: flex; flex-direction: column; gap: 3px; }
    .logo { font-size: 28px; font-weight: 700; color: #059669; }
    .logo-sub { font-size: 11px; color: #6b7280; }
    .company-contact { font-size: 10px; color: #6b7280; margin-top: 5px; }
    
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 24px; color: #059669; font-weight: 700; margin-bottom: 8px; }
    .invoice-meta { color: #6b7280; font-size: 12px; }
    .invoice-meta p { margin: 3px 0; }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 30px;
    }
    
    .info-block { flex: 1; }
    .info-block h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .info-block p { margin: 3px 0; font-size: 12px; }
    
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th {
      background: #059669;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    .items-table th:nth-child(1) { width: 8%; text-align: center; }
    .items-table th:nth-child(2) { width: 47%; }
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5) { width: 15%; text-align: right; }
    
    .items-table td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    .items-table td:nth-child(1) { text-align: center; }
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(5) { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 250px; }
    .totals-table tr td { padding: 6px 0; font-size: 12px; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-table .total-row { border-top: 2px solid #059669; }
    .totals-table .total-row td { padding-top: 10px; font-size: 16px; font-weight: 700; color: #059669; }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer-text { text-align: left; color: #6b7280; font-size: 11px; }
    
    .qr-section { text-align: center; }
    .qr-code img { width: 80px; height: 80px; }
    .qr-label { font-size: 9px; color: #6b7280; margin-top: 4px; }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-processing { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #e0e7ff; color: #3730a3; }
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    @media print {
      body { padding: 20px; }
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
        ${(orderItems || []).map((item: any, index: number) => `
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
      <div class="footer-text">
        <p>${settings.footer_text}</p>
        <p>${settings.company_name} - ${settings.company_tagline}</p>
      </div>
      <div class="qr-section">
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="Order Tracking QR" />
        </div>
        <div class="qr-label">অর্ডার ট্র্যাক করুন</div>
      </div>
    </div>
  </div>
</body>
</html>`;

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