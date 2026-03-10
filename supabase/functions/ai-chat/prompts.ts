export function buildCustomerPrompt(data: any) {
  const { settings, products, categories, coupons, delivery, bundles, searchResults, orderTracking, universalProducts, ebooks, intent, priceRange, categoryResults, publisherResults, writerResults } = data;
  const siteName = settings.site_name || "বইআলো";

  const bestSellers = (products || []).slice(0, 10).map((p: any) =>
    `• ${p.title_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | স্টক: ${p.stock_quantity || 0} | /product/${p.slug}`
  ).join("\n");

  const categoryList = (categories || []).map((c: any) => `${c.name_bn} (/category/${c.slug})`).join(", ");
  const activeCoupons = (coupons || []).map((c: any) =>
    `• কোড: ${c.code} - ${c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`} ছাড়${c.min_order_amount ? ` (সর্বনিম্ন ৳${c.min_order_amount})` : ""}`
  ).join("\n");
  const deliveryInfo = (delivery || []).map((d: any) =>
    `• ${d.zone_name_bn}: ৳${d.delivery_charge} (${d.estimated_days_min || 1}-${d.estimated_days_max || 3} দিন)`
  ).join("\n");
  const bundleInfo = (bundles || []).map((b: any) =>
    `• ${b.name_bn}: ৳${b.bundle_price} (আসল ৳${b.original_price})`
  ).join("\n");

  let searchSection = "";
  if (searchResults && searchResults.length > 0) {
    searchSection = `\n\n🔍 গ্রাহকের প্রশ্ন অনুযায়ী পাওয়া প্রোডাক্ট:\n` +
      searchResults.map((p: any) => {
        const type = p._type || "book";
        const link = type === "book" ? `/product/${p.slug}` : type === "universal" ? `/universal-product/${p.slug}` : `/ebook/${p.slug}`;
        const name = p.title_bn || p.name_bn || "প্রোডাক্ট";
        const stock = p.stock_quantity !== undefined ? ` | স্টক: ${p.stock_quantity}` : "";
        const discount = p.discount_percent;
        const writer = p.writer_name ? ` | লেখক: ${p.writer_name}` : "";
        const publisher = p.publisher_name ? ` | প্রকাশনী: ${p.publisher_name}` : "";
        return `• ${name} - ৳${p.price}${discount ? ` (${discount}% ছাড়)` : ""}${stock}${writer}${publisher} | [${link}]`;
      }).join("\n");
  }

  let extras = "";
  if (universalProducts && universalProducts.length > 0) {
    extras += `\n\n🛍️ ইউনিভার্সাল প্রোডাক্ট:\n` +
      universalProducts.slice(0, 8).map((p: any) => `• ${p.name_bn} - ৳${p.price}${p.discount_percent ? ` (${p.discount_percent}% ছাড়)` : ""} | /universal-product/${p.slug}`).join("\n");
  }
  if (ebooks && ebooks.length > 0) {
    extras += `\n\n📱 ই-বুক:\n` +
      ebooks.slice(0, 8).map((e: any) => `• ${e.title_bn} - ${e.is_free ? "ফ্রি" : `৳${e.price}`} | /ebook/${e.slug}`).join("\n");
  }

  let orderSection = "";
  if (orderTracking) {
    const statusMap: Record<string, string> = {
      pending: "⏳ পেন্ডিং", confirmed: "✅ কনফার্মড", processing: "🔄 প্রসেসিং",
      shipped: "🚚 শিপড", delivered: "📦 ডেলিভারড", cancelled: "❌ বাতিল", returned: "↩️ রিটার্ন"
    };
    orderSection = `\n\n📦 অর্ডার #${orderTracking.order_number} তথ্য:\n- স্ট্যাটাস: ${statusMap[orderTracking.status] || orderTracking.status}\n- কুরিয়ার: ${orderTracking.courier_provider || "নির্ধারিত হয়নি"}\n- ট্র্যাকিং: ${orderTracking.tracking_number || "এখনো পাওয়া যায়নি"}\n- তারিখ: ${orderTracking.created_at ? new Date(orderTracking.created_at).toLocaleDateString('bn-BD') : "N/A"}\n- এলাকা: ${orderTracking.delivery_area || "N/A"}`;
    if (orderTracking.history && Array.isArray(orderTracking.history)) {
      orderSection += `\n- ইতিহাস: ${orderTracking.history.map((h: any) => `${h.status}(${new Date(h.created_at).toLocaleDateString('bn-BD')})`).join(" → ")}`;
    }
  }

  let contextSections = "";
  if (categoryResults?.length > 0) contextSections += `\n\n📂 ক্যাটাগরি অনুযায়ী:\n` + categoryResults.map((p: any) => `• ${p.title_bn} - ৳${p.price} | /product/${p.slug}`).join("\n");
  if (publisherResults?.length > 0) contextSections += `\n\n🏢 প্রকাশনী অনুযায়ী:\n` + publisherResults.map((p: any) => `• ${p.title_bn} - ৳${p.price} | ${p.publisher_name || ""} | /product/${p.slug}`).join("\n");
  if (writerResults?.length > 0) contextSections += `\n\n✍️ লেখক অনুযায়ী:\n` + writerResults.map((p: any) => `• ${p.title_bn} - ৳${p.price} | ${p.writer_name || ""} | /product/${p.slug}`).join("\n");

  let priceHint = "";
  if (priceRange?.min || priceRange?.max) priceHint = `\n💰 রেঞ্জ: ${priceRange.min ? `৳${priceRange.min}` : ""}${priceRange.min && priceRange.max ? "-" : ""}${priceRange.max ? `৳${priceRange.max}` : ""}`;

  return `তুমি "${siteName}" অনলাইন শপের AI সহকারী "বই বন্ধু"। সবসময় বাংলায় উত্তর দাও।
🏪 ${siteName} | ফোন: ${settings.contact_phone || "N/A"} | ইমেইল: ${settings.contact_email || "N/A"}
📚 বেস্ট সেলার:\n${bestSellers || "তথ্য নেই"}
📂 ক্যাটাগরি: ${categoryList || "N/A"}
🎁 অফার:\n${activeCoupons || "বর্তমানে কোনো অফার নেই"}
🚚 ডেলিভারি:\n${deliveryInfo || "ঢাকায় ৳60, বাইরে ৳120"}
📦 বান্ডেল:\n${bundleInfo || "নেই"}${searchSection}${contextSections}${extras}${orderSection}${priceHint}
🎯 ইন্টেন্ট: ${intent}

⭐ নিয়ম:
1. ফ্রেন্ডলি, সংক্ষিপ্ত কিন্তু তথ্যপূর্ণ
2. প্রোডাক্ট রিকমেন্ডে নাম, মূল্য ও মার্কডাউন লিংক [নাম](path) দাও
3. অর্ডার ট্র্যাকিং এ অর্ডার নম্বর (BOI-XXXX) জিজ্ঞেস করো
4. রিফান্ড/জটিল সমস্যায় 👤 লাইভ চ্যাট ও ফোন দাও
5. পেমেন্ট: বিকাশ, নগদ, SSLCommerz, ক্যাশ অন ডেলিভারি
6. ইমোজি ব্যবহার করো, ফলো-আপ করো
7. 🔍 সার্চ রেজাল্ট অগ্রাধিকার দাও
8. না পেলে "দুঃখিত" বলো ও বিকল্প সাজেস্ট করো
9. লেখক/প্রকাশনী দিলে সংশ্লিষ্ট বই দেখাও
10. দামের রেঞ্জ বললে ফিল্টার করো
11. complaint-এ সমবেদনা দেখাও ও ফোন দাও
12. কখনো "নমস্কার" বলবে না। "আসসালামু আলাইকুম"/"হ্যালো" বা সরাসরি উত্তর দাও`;
}

export function buildAdminPrompt(data: any, context?: string) {
  const { revenue30, revenue7, totalOrders30, totalOrders7, totalOrders90, aov,
    statusBreakdown, paymentBreakdown, areaBreakdown, totalProducts,
    outOfStock, lowStock, totalCustomers, newCustomers30,
    abandonedCount, abandonedValue, topProducts, lowStockItems, avgRating, couponsCount } = data;

  return `তুমি প্রফেশনাল AI বিজনেস অ্যানালিস্ট। "বইআলো" বাংলাদেশি অনলাইন শপ। বাংলায় উত্তর দাও।
📊 ড্যাশবোর্ড:
💰 ৭দিন: ৳${revenue7.toLocaleString()} (${totalOrders7}টি) | ৩০দিন: ৳${revenue30.toLocaleString()} (${totalOrders30}টি) | ৯০দিন: ${totalOrders90}টি | AOV: ৳${aov}
📋 স্ট্যাটাস: ${Object.entries(statusBreakdown).map(([k, v]) => `${k}:${v}`).join(", ")}
💳 পেমেন্ট: ${Object.entries(paymentBreakdown).map(([k, v]) => `${k}:${v}`).join(", ")}
🗺️ এলাকা: ${Object.entries(areaBreakdown).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(", ")}
👥 কাস্টমার: ${totalCustomers} (নতুন: ${newCustomers30})
📦 প্রোডাক্ট: ${totalProducts} | আউট: ${outOfStock} | লো(<৫): ${lowStock}
🔝 টপ: ${topProducts}
⚠️ লো স্টক: ${lowStockItems || "নেই"}
🛒 অসম্পূর্ণ: ${abandonedCount}টি (৳${abandonedValue.toLocaleString()})
⭐ রেটিং: ${avgRating} | কুপন: ${couponsCount}
${context ? `\n📌 প্রসঙ্গ: ${context}` : ""}
নিয়ম: ডেটা-ড্রিভেন পরামর্শ, মেট্রিক্স ব্যবহার, সমস্যা+সমাধান, মার্কডাউন ফরম্যাট, বাংলাদেশ কনটেক্সট।`;
}
