import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Eye, Code, Palette, ShoppingBag, Tag, Image, Type, 
  LayoutGrid, Gift, Percent, Star, ArrowRight, X, Copy, Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface TemplateBuilderProps {
  initialHtml?: string;
  initialSubject?: string;
  onHtmlChange: (html: string) => void;
  onSubjectChange?: (subject: string) => void;
}

// Professional pre-built template designs
const PRESET_TEMPLATES = [
  {
    id: "modern-promo",
    name: "মডার্ন প্রোমো",
    icon: "🎯",
    description: "প্রোডাক্ট প্রোমোশনের জন্য",
    html: `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;border-radius:0 0 30px 30px;">
    <h1 style="color:#ffffff;font-size:28px;margin:0 0 10px;">{{shop_name}}</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">{{headline}}</p>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#333;font-size:22px;text-align:center;margin-bottom:20px;">{{title}}</h2>
    <p style="color:#666;font-size:15px;line-height:1.6;text-align:center;">{{message}}</p>
    {{product_grid}}
    <div style="text-align:center;margin-top:30px;">
      <a href="{{cta_link}}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 40px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">{{cta_text}}</a>
    </div>
  </div>
  <div style="background:#f8f9fa;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#999;font-size:12px;margin:0;">{{footer_text}}</p>
  </div>
</div>`
  },
  {
    id: "flash-sale",
    name: "ফ্ল্যাশ সেল",
    icon: "⚡",
    description: "সীমিত সময়ের অফার",
    html: `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">
  <div style="background:#ff4757;padding:20px;text-align:center;">
    <h1 style="color:#fff;font-size:32px;margin:0;">⚡ ফ্ল্যাশ সেল ⚡</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:18px;margin:10px 0 0;">সীমিত সময়ের জন্য {{discount}}% ছাড়!</p>
  </div>
  <div style="background:#fff3cd;padding:15px;text-align:center;">
    <p style="color:#856404;font-size:16px;margin:0;font-weight:bold;">⏰ অফার শেষ: {{end_date}}</p>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#333;text-align:center;margin-bottom:20px;">{{title}}</h2>
    {{product_grid}}
    <div style="text-align:center;margin-top:30px;">
      <a href="{{cta_link}}" style="display:inline-block;background:#ff4757;color:#fff;padding:16px 50px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:18px;text-transform:uppercase;">{{cta_text}}</a>
    </div>
  </div>
  <div style="background:#2f3542;padding:20px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">{{footer_text}}</p>
  </div>
</div>`
  },
  {
    id: "newsletter",
    name: "নিউজলেটার",
    icon: "📰",
    description: "সাপ্তাহিক আপডেট",
    html: `<div style="max-width:600px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;background:#ffffff;">
  <div style="padding:40px 30px;text-align:center;border-bottom:3px solid #333;">
    <h1 style="color:#333;font-size:36px;margin:0;letter-spacing:2px;">{{shop_name}}</h1>
    <p style="color:#999;font-size:14px;margin:10px 0 0;text-transform:uppercase;letter-spacing:3px;">{{headline}}</p>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#333;font-size:24px;border-bottom:1px solid #eee;padding-bottom:15px;">{{title}}</h2>
    <p style="color:#555;font-size:16px;line-height:1.8;">{{message}}</p>
    {{product_grid}}
    {{category_section}}
    <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #eee;">
      <a href="{{cta_link}}" style="display:inline-block;background:#333;color:#fff;padding:12px 35px;text-decoration:none;font-size:14px;text-transform:uppercase;letter-spacing:1px;">{{cta_text}}</a>
    </div>
  </div>
  <div style="padding:20px 30px;text-align:center;border-top:3px solid #333;">
    <p style="color:#999;font-size:12px;margin:0;">{{footer_text}}</p>
  </div>
</div>`
  },
  {
    id: "new-arrival",
    name: "নতুন আগমন",
    icon: "🆕",
    description: "নতুন প্রোডাক্ট ঘোষণা",
    html: `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);padding:40px 30px;text-align:center;">
    <span style="font-size:48px;">🆕</span>
    <h1 style="color:#fff;font-size:28px;margin:10px 0 5px;">নতুন এসেছে!</h1>
    <p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">{{headline}}</p>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#333;text-align:center;">{{title}}</h2>
    <p style="color:#666;text-align:center;line-height:1.6;">{{message}}</p>
    {{product_grid}}
    <div style="text-align:center;margin-top:30px;">
      <a href="{{cta_link}}" style="display:inline-block;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;padding:14px 40px;border-radius:30px;text-decoration:none;font-weight:bold;">{{cta_text}}</a>
    </div>
  </div>
  <div style="background:#f0fff4;padding:20px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">{{footer_text}}</p>
  </div>
</div>`
  },
  {
    id: "minimal",
    name: "মিনিমাল",
    icon: "✨",
    description: "সাধারণ ও পরিষ্কার",
    html: `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;border:1px solid #eee;">
  <div style="padding:30px;text-align:center;">
    <h1 style="color:#333;font-size:24px;margin:0;">{{shop_name}}</h1>
  </div>
  <div style="padding:0 30px 30px;">
    <h2 style="color:#333;font-size:20px;">{{title}}</h2>
    <p style="color:#666;font-size:15px;line-height:1.7;">{{message}}</p>
    {{product_grid}}
    {{category_section}}
    <div style="margin-top:25px;">
      <a href="{{cta_link}}" style="display:inline-block;background:#333;color:#fff;padding:12px 30px;text-decoration:none;font-size:14px;">{{cta_text}}</a>
    </div>
  </div>
  <div style="padding:15px 30px;border-top:1px solid #eee;">
    <p style="color:#999;font-size:11px;margin:0;text-align:center;">{{footer_text}}</p>
  </div>
</div>`
  },
  {
    id: "eid-offer",
    name: "ঈদ অফার",
    icon: "🌙",
    description: "ঈদ স্পেশাল ক্যাম্পেইন",
    html: `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:50px 30px;text-align:center;">
    <span style="font-size:60px;">🌙</span>
    <h1 style="color:#e2b714;font-size:32px;margin:10px 0 5px;">ঈদ মোবারক!</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:16px;margin:0;">{{headline}}</p>
    <div style="margin-top:15px;background:rgba(226,183,20,0.2);display:inline-block;padding:8px 25px;border-radius:20px;border:1px solid rgba(226,183,20,0.3);">
      <span style="color:#e2b714;font-size:20px;font-weight:bold;">{{discount}}% ছাড়</span>
    </div>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#333;text-align:center;">{{title}}</h2>
    <p style="color:#666;text-align:center;line-height:1.6;">{{message}}</p>
    {{product_grid}}
    <div style="text-align:center;margin-top:30px;">
      <a href="{{cta_link}}" style="display:inline-block;background:linear-gradient(135deg,#e2b714,#f0c929);color:#1a1a2e;padding:14px 40px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">{{cta_text}}</a>
    </div>
  </div>
  <div style="background:#1a1a2e;padding:20px;text-align:center;">
    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">{{footer_text}}</p>
  </div>
</div>`
  }
];

// Dynamic variable tags
const VARIABLE_TAGS = [
  { tag: "{{shop_name}}", label: "শপের নাম", icon: <Tag className="h-3 w-3" /> },
  { tag: "{{headline}}", label: "হেডলাইন", icon: <Type className="h-3 w-3" /> },
  { tag: "{{title}}", label: "শিরোনাম", icon: <Type className="h-3 w-3" /> },
  { tag: "{{message}}", label: "মেসেজ", icon: <Type className="h-3 w-3" /> },
  { tag: "{{discount}}", label: "ডিসকাউন্ট %", icon: <Percent className="h-3 w-3" /> },
  { tag: "{{cta_text}}", label: "বাটন টেক্সট", icon: <ArrowRight className="h-3 w-3" /> },
  { tag: "{{cta_link}}", label: "বাটন লিংক", icon: <ArrowRight className="h-3 w-3" /> },
  { tag: "{{footer_text}}", label: "ফুটার", icon: <Type className="h-3 w-3" /> },
  { tag: "{{end_date}}", label: "শেষ তারিখ", icon: <Type className="h-3 w-3" /> },
  { tag: "{{name}}", label: "গ্রাহকের নাম", icon: <Type className="h-3 w-3" /> },
  { tag: "{{product_grid}}", label: "প্রোডাক্ট গ্রিড", icon: <LayoutGrid className="h-3 w-3" /> },
  { tag: "{{category_section}}", label: "ক্যাটাগরি সেকশন", icon: <ShoppingBag className="h-3 w-3" /> },
];

export const EmailTemplateBuilder = ({ 
  initialHtml = "", 
  initialSubject = "",
  onHtmlChange,
  onSubjectChange 
}: TemplateBuilderProps) => {
  const [html, setHtml] = useState(initialHtml);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    setHtml(initialHtml);
  }, [initialHtml]);

  // Fetch products for dynamic insertion
  const { data: products = [] } = useQuery({
    queryKey: ['email-builder-products', productSearch],
    queryFn: async () => {
      let query = supabase.from('products').select('id, title_bn, slug, price, discount_percent, original_price, images').eq('is_active', true).limit(20);
      if (productSearch) query = query.ilike('title_bn', `%${productSearch}%`);
      const { data } = await query;
      return (data || []).map(p => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const imageUrl = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
        const discountPrice = p.discount_percent ? Math.round(p.price * (1 - p.discount_percent / 100)) : null;
        return { ...p, imageUrl, discountPrice };
      });
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['email-builder-categories', categorySearch],
    queryFn: async () => {
      let query = supabase.from('categories').select('id, name_bn, slug, image_url').eq('is_active', true).limit(20);
      if (categorySearch) query = query.ilike('name_bn', `%${categorySearch}%`);
      const { data } = await query;
      return data || [];
    }
  });

  const handleHtmlChange = (newHtml: string) => {
    setHtml(newHtml);
    onHtmlChange(newHtml);
  };

  const insertVariable = (tag: string) => {
    handleHtmlChange(html + tag);
  };

  const applyTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    handleHtmlChange(template.html);
    toast.success(`"${template.name}" টেমপ্লেট প্রয়োগ হয়েছে`);
  };

  const generateProductGridHtml = () => {
    const selected = products.filter(p => selectedProducts.includes(p.id));
    if (selected.length === 0) { toast.error("প্রোডাক্ট সিলেক্ট করুন"); return; }

    const siteUrl = "https://boialo.lovable.app";
    const gridHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr>${selected.map((p, idx) => {
      const card = `<td style="width:50%;padding:10px;vertical-align:top;">
      <div style="border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title_bn}" style="width:100%;height:180px;object-fit:cover;" />` : `<div style="width:100%;height:180px;background:#f0f0f0;text-align:center;line-height:180px;font-size:40px;">📚</div>`}
        <div style="padding:12px;">
          <h3 style="font-size:14px;color:#333;margin:0 0 8px;line-height:1.4;">${p.title_bn}</h3>
          ${p.discountPrice ? `<span style="color:#e53e3e;font-weight:bold;">৳${p.discountPrice}</span> <span style="color:#999;text-decoration:line-through;font-size:13px;">৳${p.price}</span>` : `<span style="color:#333;font-weight:bold;">৳${p.price}</span>`}
          <br/><a href="${siteUrl}/product/${p.slug}" style="display:inline-block;margin-top:10px;background:#667eea;color:#fff;padding:8px 20px;border-radius:20px;text-decoration:none;font-size:13px;">কিনুন</a>
        </div>
      </div>
    </td>`;
      return card + ((idx % 2 === 1 && idx < selected.length - 1) ? '</tr><tr>' : '');
    }).join("")}</tr></table>`;

    if (html.includes("{{product_grid}}")) {
      handleHtmlChange(html.replace("{{product_grid}}", gridHtml));
    } else {
      handleHtmlChange(html + gridHtml);
    }
    setShowProductPicker(false);
    setSelectedProducts([]);
    toast.success(`${selected.length}টি প্রোডাক্ট যোগ হয়েছে`);
  };

  const generateCategoryHtml = () => {
    const selected = categories.filter(c => selectedCategories.includes(c.id));
    if (selected.length === 0) { toast.error("ক্যাটাগরি সিলেক্ট করুন"); return; }

    const siteUrl = "https://boialo.lovable.app";
    const catHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr>${selected.map((c, idx) => {
      const card = `<td style="width:${Math.floor(100 / Math.min(selected.length, 3))}%;padding:8px;text-align:center;vertical-align:top;">
      <a href="${siteUrl}/category/${c.slug}" style="text-decoration:none;">
        ${c.image_url ? `<img src="${c.image_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto;display:block;" />` : `<div style="width:80px;height:80px;border-radius:50%;background:#f0f0f0;margin:0 auto;line-height:80px;font-size:30px;">📂</div>`}
        <p style="color:#333;font-size:14px;margin-top:8px;font-weight:500;">${c.name_bn}</p>
      </a>
    </td>`;
      return card + ((idx % 3 === 2 && idx < selected.length - 1) ? '</tr><tr>' : '');
    }).join("")}</tr></table>`;

    if (html.includes("{{category_section}}")) {
      handleHtmlChange(html.replace("{{category_section}}", catHtml));
    } else {
      handleHtmlChange(html + catHtml);
    }
    setShowCategoryPicker(false);
    setSelectedCategories([]);
    toast.success(`${selected.length}টি ক্যাটাগরি যোগ হয়েছে`);
  };

  const insertImageBlock = () => {
    const imageHtml = `\n<div style="text-align:center;margin:20px 0;"><img src="IMAGE_URL_HERE" alt="Banner" style="width:100%;max-width:560px;border-radius:12px;" /></div>\n`;
    handleHtmlChange(html + imageHtml);
    toast.info("ইমেজ ব্লক যোগ হয়েছে - URL পরিবর্তন করুন");
  };

  const insertDivider = () => {
    handleHtmlChange(html + `\n<hr style="border:none;border-top:1px solid #eee;margin:25px 0;" />\n`);
  };

  const insertButton = () => {
    handleHtmlChange(html + `\n<div style="text-align:center;margin:25px 0;"><a href="#" style="display:inline-block;background:#667eea;color:#fff;padding:14px 40px;border-radius:30px;text-decoration:none;font-weight:bold;font-size:16px;">বাটন টেক্সট</a></div>\n`);
  };

  const insertSpacer = () => {
    handleHtmlChange(html + `\n<div style="height:30px;"></div>\n`);
  };

  return (
    <div className="space-y-4">
      {/* Template Presets */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">🎨 প্রিসেট টেমপ্লেট</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PRESET_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="flex flex-col items-center gap-1 p-3 border rounded-xl hover:bg-accent hover:border-primary/30 transition-all text-center group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
              <span className="text-xs font-medium">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowProductPicker(!showProductPicker)}>
          <ShoppingBag className="h-3.5 w-3.5" /> প্রোডাক্ট যোগ
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowCategoryPicker(!showCategoryPicker)}>
          <LayoutGrid className="h-3.5 w-3.5" /> ক্যাটাগরি যোগ
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={insertImageBlock}>
          <Image className="h-3.5 w-3.5" /> ইমেজ
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={insertButton}>
          <ArrowRight className="h-3.5 w-3.5" /> বাটন
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={insertDivider}>
          ─ ডিভাইডার
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={insertSpacer}>
          ↕ স্পেসার
        </Button>
      </div>

      {/* Product Picker */}
      {showProductPicker && (
        <Card className="border-primary/30">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">প্রোডাক্ট সিলেক্ট করুন</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowProductPicker(false)}><X className="h-4 w-4" /></Button>
            </div>
            <Input placeholder="প্রোডাক্ট খুঁজুন..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="mt-2" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedProducts(prev => [...prev, p.id]);
                        else setSelectedProducts(prev => prev.filter(id => id !== p.id));
                      }}
                      className="rounded"
                    />
                    {p.imageUrl && <img src={p.imageUrl} className="w-10 h-10 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title_bn}</p>
                      <p className="text-xs text-muted-foreground">৳{p.discountPrice || p.price}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
            {selectedProducts.length > 0 && (
              <Button size="sm" className="mt-3 w-full gap-1" onClick={generateProductGridHtml}>
                <Plus className="h-3 w-3" /> {selectedProducts.length}টি প্রোডাক্ট যোগ করুন
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Picker */}
      {showCategoryPicker && (
        <Card className="border-primary/30">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">ক্যাটাগরি সিলেক্ট করুন</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowCategoryPicker(false)}><X className="h-4 w-4" /></Button>
            </div>
            <Input placeholder="ক্যাটাগরি খুঁজুন..." value={categorySearch} onChange={e => setCategorySearch(e.target.value)} className="mt-2" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {categories.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedCategories(prev => [...prev, c.id]);
                        else setSelectedCategories(prev => prev.filter(id => id !== c.id));
                      }}
                      className="rounded"
                    />
                    {c.image_url && <img src={c.image_url} className="w-10 h-10 rounded-full object-cover" />}
                    <span className="text-sm font-medium">{c.name_bn}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            {selectedCategories.length > 0 && (
              <Button size="sm" className="mt-3 w-full gap-1" onClick={generateCategoryHtml}>
                <Plus className="h-3 w-3" /> {selectedCategories.length}টি ক্যাটাগরি যোগ করুন
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dynamic Variables */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">ডায়নামিক ভেরিয়েবল (ক্লিক করে যোগ করুন)</Label>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_TAGS.map(v => (
            <button
              key={v.tag}
              onClick={() => insertVariable(v.tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Preview Toggle */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant={viewMode === "edit" ? "default" : "outline"} 
          onClick={() => setViewMode("edit")}
          className="gap-1"
        >
          <Code className="h-3.5 w-3.5" /> কোড
        </Button>
        <Button 
          size="sm" 
          variant={viewMode === "preview" ? "default" : "outline"} 
          onClick={() => setViewMode("preview")}
          className="gap-1"
        >
          <Eye className="h-3.5 w-3.5" /> প্রিভিউ
        </Button>
      </div>

      {viewMode === "edit" ? (
        <Textarea
          value={html}
          onChange={e => handleHtmlChange(e.target.value)}
          placeholder="HTML কনটেন্ট এখানে লিখুন অথবা উপরে থেকে টেমপ্লেট সিলেক্ট করুন..."
          rows={16}
          className="font-mono text-sm"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-muted-foreground ml-2">ইমেইল প্রিভিউ</span>
          </div>
          <div className="p-4 bg-[#f5f5f5]">
            <div 
              className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
              style={{ maxWidth: 620 }}
              dangerouslySetInnerHTML={{ __html: html || '<p style="text-align:center;color:#999;padding:40px;">কোনো কনটেন্ট নেই</p>' }} 
            />
          </div>
        </Card>
      )}
    </div>
  );
};
