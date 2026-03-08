import { useState, useEffect, useCallback, useRef } from "react";
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
import { Slider } from "@/components/ui/slider";
import {
  Plus, Eye, Code, Palette, ShoppingBag, Tag, Image, Type,
  LayoutGrid, Gift, Percent, Star, ArrowRight, X, Copy, Sparkles,
  GripVertical, Trash2, MoveUp, MoveDown, Settings, AlignCenter,
  AlignLeft, AlignRight, Square, Columns, Minus, ChevronDown, ChevronUp,
  ImagePlus, Link, Bold, Monitor, Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateBuilderProps {
  initialHtml?: string;
  initialSubject?: string;
  onHtmlChange: (html: string) => void;
  onSubjectChange?: (subject: string) => void;
}

// Block types
type BlockType = 
  | "header" | "text" | "image" | "button" | "divider" | "spacer" 
  | "product_grid" | "category_grid" | "columns" | "hero_banner"
  | "social_links" | "footer" | "coupon_box" | "countdown";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  settings: {
    padding?: string;
    backgroundColor?: string;
    textColor?: string;
    alignment?: "left" | "center" | "right";
    borderRadius?: string;
    [key: string]: any;
  };
}

const BLOCK_LIBRARY: { type: BlockType; label: string; icon: React.ReactNode; category: string }[] = [
  { type: "hero_banner", label: "হিরো ব্যানার", icon: <Monitor className="h-4 w-4" />, category: "layout" },
  { type: "header", label: "হেডিং", icon: <Type className="h-4 w-4" />, category: "basic" },
  { type: "text", label: "টেক্সট", icon: <AlignLeft className="h-4 w-4" />, category: "basic" },
  { type: "image", label: "ইমেজ", icon: <Image className="h-4 w-4" />, category: "basic" },
  { type: "button", label: "বাটন", icon: <Square className="h-4 w-4" />, category: "basic" },
  { type: "divider", label: "ডিভাইডার", icon: <Minus className="h-4 w-4" />, category: "basic" },
  { type: "spacer", label: "স্পেসার", icon: <MoveDown className="h-4 w-4" />, category: "basic" },
  { type: "columns", label: "কলাম লেআউট", icon: <Columns className="h-4 w-4" />, category: "layout" },
  { type: "product_grid", label: "প্রোডাক্ট গ্রিড", icon: <ShoppingBag className="h-4 w-4" />, category: "dynamic" },
  { type: "category_grid", label: "ক্যাটাগরি গ্রিড", icon: <LayoutGrid className="h-4 w-4" />, category: "dynamic" },
  { type: "coupon_box", label: "কুপন বক্স", icon: <Gift className="h-4 w-4" />, category: "dynamic" },
  { type: "social_links", label: "সোশ্যাল লিংক", icon: <Link className="h-4 w-4" />, category: "layout" },
  { type: "footer", label: "ফুটার", icon: <AlignCenter className="h-4 w-4" />, category: "layout" },
];

const PRESET_TEMPLATES = [
  {
    id: "modern-promo", name: "মডার্ন প্রোমো", icon: "🎯", description: "প্রোডাক্ট প্রোমোশন",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "{{shop_name}}", subtitle: "সেরা অফার এখানে!", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "40px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "আমাদের নতুন কালেকশন দেখুন এবং বিশেষ ছাড় উপভোগ করুন।" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "এখনই কিনুন", url: "#", bgColor: "#667eea" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}. সকল অধিকার সংরক্ষিত।" }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa" } },
    ]
  },
  {
    id: "flash-sale", name: "ফ্ল্যাশ সেল", icon: "⚡", description: "সীমিত অফার",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "⚡ ফ্ল্যাশ সেল ⚡", subtitle: "সীমিত সময়ের জন্য বিশাল ছাড়!", bgGradient: "linear-gradient(135deg,#ff4757 0%,#ff6b81 100%)" }, settings: { padding: "40px 30px", textColor: "#ffffff" } },
      { id: "2", type: "coupon_box" as BlockType, content: { code: "FLASH50", discount: "50%", description: "সব প্রোডাক্টে" }, settings: { padding: "15px 30px" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "অফার দেখুন →", url: "#", bgColor: "#ff4757" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}" }, settings: { padding: "20px 30px", backgroundColor: "#2f3542", textColor: "#999" } },
    ]
  },
  {
    id: "newsletter", name: "নিউজলেটার", icon: "📰", description: "সাপ্তাহিক আপডেট",
    blocks: [
      { id: "1", type: "header" as BlockType, content: { text: "{{shop_name}}", level: "h1" }, settings: { padding: "30px", alignment: "center" as const, borderBottom: "3px solid #333" } },
      { id: "2", type: "text" as BlockType, content: { text: "এই সপ্তাহের সেরা বই ও অফারগুলো দেখুন। আমাদের নতুন সংযোজন আপনার জন্য!" }, settings: { padding: "20px 30px" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "category_grid" as BlockType, content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
      { id: "5", type: "button" as BlockType, content: { text: "আরো দেখুন", url: "#", bgColor: "#333333" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "6", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}" }, settings: { padding: "20px 30px", borderTop: "3px solid #333" } },
    ]
  },
  {
    id: "new-arrival", name: "নতুন আগমন", icon: "🆕", description: "নতুন প্রোডাক্ট",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🆕 নতুন এসেছে!", subtitle: "একদম তাজা কালেকশন", bgGradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "আমাদের সর্বশেষ সংযোজন দেখুন - আপনার জন্য বিশেষভাবে বাছাই করা।" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "সব দেখুন", url: "#", bgColor: "#11998e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}" }, settings: { padding: "20px 30px", backgroundColor: "#f0fff4" } },
    ]
  },
  {
    id: "eid-offer", name: "ঈদ অফার", icon: "🌙", description: "ঈদ স্পেশাল",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🌙 ঈদ মোবারক!", subtitle: "ঈদ স্পেশাল ছাড়", bgGradient: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }, settings: { padding: "50px 30px", textColor: "#e2b714" } },
      { id: "2", type: "coupon_box" as BlockType, content: { code: "EID2026", discount: "25%", description: "সকল বইয়ে" }, settings: { padding: "15px 30px" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "ঈদ অফার দেখুন", url: "#", bgColor: "#e2b714", textColor: "#1a1a2e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "ঈদ মোবারক! © 2026 {{shop_name}}" }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "rgba(255,255,255,0.5)" } },
    ]
  },
  {
    id: "minimal", name: "মিনিমাল", icon: "✨", description: "সাধারণ ও পরিষ্কার",
    blocks: [
      { id: "1", type: "header" as BlockType, content: { text: "{{shop_name}}", level: "h1" }, settings: { padding: "30px", alignment: "center" as const } },
      { id: "2", type: "divider" as BlockType, content: {}, settings: { padding: "0 30px" } },
      { id: "3", type: "text" as BlockType, content: { text: "আপনার জন্য নতুন কিছু আছে।" }, settings: { padding: "20px 30px" } },
      { id: "4", type: "product_grid" as BlockType, content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "5", type: "button" as BlockType, content: { text: "দেখুন", url: "#", bgColor: "#333333" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "6", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}" }, settings: { padding: "15px 30px", borderTop: "1px solid #eee" } },
    ]
  },
];

const genId = () => Math.random().toString(36).slice(2, 10);

const createDefaultBlock = (type: BlockType): EmailBlock => {
  const defaults: Record<BlockType, Partial<EmailBlock>> = {
    hero_banner: { content: { title: "আপনার শিরোনাম", subtitle: "সাবটাইটেল এখানে", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "40px 30px", textColor: "#ffffff" } },
    header: { content: { text: "হেডিং টেক্সট", level: "h2" }, settings: { padding: "15px 30px", alignment: "center" } },
    text: { content: { text: "আপনার টেক্সট এখানে লিখুন..." }, settings: { padding: "10px 30px" } },
    image: { content: { url: "", alt: "Image", width: "100%" }, settings: { padding: "10px 30px", alignment: "center" } },
    button: { content: { text: "বাটন টেক্সট", url: "#", bgColor: "#667eea", textColor: "#ffffff" }, settings: { padding: "15px 30px", alignment: "center", borderRadius: "30px" } },
    divider: { content: { color: "#eeeeee", thickness: "1" }, settings: { padding: "10px 30px" } },
    spacer: { content: { height: "30" }, settings: {} },
    product_grid: { content: { productIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
    category_grid: { content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
    columns: { content: { left: "বাম কলাম", right: "ডান কলাম" }, settings: { padding: "10px 30px" } },
    social_links: { content: { facebook: "#", instagram: "#", youtube: "#" }, settings: { padding: "15px 30px", alignment: "center" } },
    footer: { content: { text: "© 2026 আপনার শপ। সকল অধিকার সংরক্ষিত।" }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa", alignment: "center" } },
    coupon_box: { content: { code: "SAVE20", discount: "20%", description: "সকল প্রোডাক্টে" }, settings: { padding: "15px 30px" } },
    countdown: { content: { endDate: "", label: "অফার শেষ" }, settings: { padding: "15px 30px", alignment: "center" } },
  };
  const d = defaults[type] || {};
  return { id: genId(), type, content: d.content || {}, settings: d.settings || {} };
};

export const EmailTemplateBuilder = ({
  initialHtml = "",
  initialSubject = "",
  onHtmlChange,
  onSubjectChange
}: TemplateBuilderProps) => {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"design" | "preview" | "code">("design");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const siteUrl = "https://boialo.lovable.app";

  // Fetch products
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

  // Convert blocks to HTML whenever blocks change
  useEffect(() => {
    const html = blocksToHtml(blocks);
    onHtmlChange(html);
  }, [blocks]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateBlockContent = (id: string, key: string, value: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b));
  };

  const updateBlockSetting = (id: string, key: string, value: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, settings: { ...b.settings, [key]: value } } : b));
  };

  const addBlock = (type: BlockType, index?: number) => {
    const newBlock = createDefaultBlock(type);
    setBlocks(prev => {
      const next = [...prev];
      if (index !== undefined) next.splice(index + 1, 0, newBlock);
      else next.push(newBlock);
      return next;
    });
    setSelectedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const idx = blocks.findIndex(b => b.id === id);
    const dup = { ...JSON.parse(JSON.stringify(block)), id: genId() };
    setBlocks(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  // Drag & drop handlers
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (draggedIdx !== null && draggedIdx !== idx) moveBlock(draggedIdx, idx);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

  // Sidebar block drag to canvas
  const handleSidebarDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("block-type", type);
  };
  const handleCanvasDrop = (e: React.DragEvent, idx?: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("block-type") as BlockType;
    if (type) addBlock(type, idx);
    setDragOverIdx(null);
  };

  const applyTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setBlocks(template.blocks.map(b => ({ ...b, id: genId() })));
    setSelectedBlockId(null);
    toast.success(`"${template.name}" টেমপ্লেট লোড হয়েছে`);
  };

  // --- HTML Generation ---
  const blockToHtml = (block: EmailBlock): string => {
    const { content: c, settings: s } = block;
    const pad = s.padding || "0";
    const bgCol = s.backgroundColor || "transparent";
    const txtCol = s.textColor || "#333333";
    const align = s.alignment || "left";

    switch (block.type) {
      case "hero_banner":
        return `<div style="background:${c.bgGradient || '#667eea'};padding:${pad};text-align:center;">
  <h1 style="color:${txtCol};font-size:28px;margin:0 0 10px;font-weight:700;">${c.title || ''}</h1>
  <p style="color:${txtCol};opacity:0.9;font-size:16px;margin:0;">${c.subtitle || ''}</p>
</div>`;
      case "header":
        const tag = c.level || "h2";
        const sizes: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};${s.borderBottom ? `border-bottom:${s.borderBottom};` : ''}">
  <${tag} style="color:${txtCol};font-size:${sizes[tag] || '22px'};margin:0;">${c.text || ''}</${tag}>
</div>`;
      case "text":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};">
  <p style="color:${txtCol};font-size:15px;line-height:1.7;margin:0;">${c.text || ''}</p>
</div>`;
      case "image":
        return `<div style="padding:${pad};text-align:${align};">
  <img src="${c.url || '/placeholder.svg'}" alt="${c.alt || ''}" style="max-width:${c.width || '100%'};border-radius:${s.borderRadius || '8px'};" />
</div>`;
      case "button": {
        const btnBg = c.bgColor || "#667eea";
        const btnTxt = c.textColor || "#ffffff";
        const radius = s.borderRadius || "30px";
        return `<div style="padding:${pad};text-align:${align};">
  <a href="${c.url || '#'}" style="display:inline-block;background:${btnBg};color:${btnTxt};padding:14px 40px;border-radius:${radius};text-decoration:none;font-weight:bold;font-size:16px;">${c.text || 'বাটন'}</a>
</div>`;
      }
      case "divider":
        return `<div style="padding:${pad};"><hr style="border:none;border-top:${c.thickness || '1'}px solid ${c.color || '#eeeeee'};margin:0;" /></div>`;
      case "spacer":
        return `<div style="height:${c.height || '30'}px;"></div>`;
      case "product_grid": {
        const selProds = products.filter(p => (c.productIds || []).includes(p.id));
        if (selProds.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;">প্রোডাক্ট সিলেক্ট করুন</div>`;
        return `<div style="padding:${pad};">
  <table style="width:100%;border-collapse:collapse;"><tr>${selProds.map((p, i) => {
    const card = `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border:1px solid #eee;border-radius:12px;overflow:hidden;">
      ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title_bn}" style="width:100%;height:160px;object-fit:cover;" />` : `<div style="height:160px;background:#f5f5f5;text-align:center;line-height:160px;font-size:36px;">📚</div>`}
      <div style="padding:10px;">
        <p style="font-size:13px;color:#333;margin:0 0 6px;font-weight:500;">${p.title_bn}</p>
        ${p.discountPrice ? `<span style="color:#e53e3e;font-weight:bold;font-size:14px;">৳${p.discountPrice}</span> <span style="color:#999;text-decoration:line-through;font-size:12px;">৳${p.price}</span>` : `<span style="color:#333;font-weight:bold;font-size:14px;">৳${p.price}</span>`}
        <br/><a href="${siteUrl}/product/${p.slug}" style="display:inline-block;margin-top:8px;background:#667eea;color:#fff;padding:6px 16px;border-radius:20px;text-decoration:none;font-size:12px;">কিনুন</a>
      </div>
    </div>
  </td>`;
    return card + ((i % 2 === 1 && i < selProds.length - 1) ? '</tr><tr>' : '');
  }).join('')}</tr></table>
</div>`;
      }
      case "category_grid": {
        const selCats = categories.filter(ct => (c.categoryIds || []).includes(ct.id));
        if (selCats.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;">ক্যাটাগরি সিলেক্ট করুন</div>`;
        const colW = Math.floor(100 / Math.min(selCats.length, 4));
        return `<div style="padding:${pad};">
  <table style="width:100%;border-collapse:collapse;"><tr>${selCats.map((ct, i) => {
    const card = `<td style="width:${colW}%;padding:8px;text-align:center;vertical-align:top;">
    <a href="${siteUrl}/category/${ct.slug}" style="text-decoration:none;">
      ${ct.image_url ? `<img src="${ct.image_url}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;" />` : `<div style="width:64px;height:64px;border-radius:50%;background:#f0f0f0;margin:0 auto;line-height:64px;font-size:24px;">📂</div>`}
      <p style="color:#333;font-size:13px;margin-top:6px;font-weight:500;">${ct.name_bn}</p>
    </a>
  </td>`;
    return card + ((i % 4 === 3 && i < selCats.length - 1) ? '</tr><tr>' : '');
  }).join('')}</tr></table>
</div>`;
      }
      case "coupon_box":
        return `<div style="padding:${pad};">
  <div style="border:2px dashed #667eea;border-radius:12px;padding:20px;text-align:center;background:#f8f9ff;">
    <p style="font-size:13px;color:#666;margin:0 0 8px;">${c.description || ''}</p>
    <div style="background:#667eea;color:#fff;display:inline-block;padding:10px 30px;border-radius:8px;font-size:20px;font-weight:bold;letter-spacing:3px;">${c.code || 'CODE'}</div>
    <p style="font-size:24px;font-weight:bold;color:#667eea;margin:10px 0 0;">${c.discount || ''}  ছাড়</p>
  </div>
</div>`;
      case "social_links":
        return `<div style="padding:${pad};text-align:${align};">
  ${c.facebook ? `<a href="${c.facebook}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="28" height="28" /></a>` : ''}
  ${c.instagram ? `<a href="${c.instagram}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="28" height="28" /></a>` : ''}
  ${c.youtube ? `<a href="${c.youtube}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="28" height="28" /></a>` : ''}
</div>`;
      case "footer":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};${s.borderTop ? `border-top:${s.borderTop};` : ''}">
  <p style="color:${txtCol};font-size:12px;margin:0;">${c.text || ''}</p>
</div>`;
      case "columns":
        return `<div style="padding:${pad};">
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td style="width:50%;padding:10px;vertical-align:top;">${c.left || ''}</td>
    <td style="width:50%;padding:10px;vertical-align:top;">${c.right || ''}</td>
  </tr></table>
</div>`;
      default:
        return '';
    }
  };

  const blocksToHtml = (blocks: EmailBlock[]): string => {
    if (blocks.length === 0) return '';
    return `<div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">\n${blocks.map(b => blockToHtml(b)).join('\n')}\n</div>`;
  };

  // Block label helper
  const blockLabel = (type: BlockType) => BLOCK_LIBRARY.find(b => b.type === type)?.label || type;
  const blockIcon = (type: BlockType) => BLOCK_LIBRARY.find(b => b.type === type)?.icon || <Square className="h-4 w-4" />;

  // --- Render ---
  return (
    <div className="flex flex-col gap-4">
      {/* Template Presets */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">🎨 প্রিসেট টেমপ্লেট</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PRESET_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className="flex flex-col items-center gap-1 p-3 border rounded-xl hover:bg-accent hover:border-primary/30 transition-all text-center group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
              <span className="text-xs font-medium">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["design", "preview", "code"] as const).map(mode => (
            <Button key={mode} size="sm" variant={viewMode === mode ? "default" : "outline"} onClick={() => setViewMode(mode)} className="gap-1 text-xs">
              {mode === "design" && <><LayoutGrid className="h-3.5 w-3.5" /> ডিজাইন</>}
              {mode === "preview" && <><Eye className="h-3.5 w-3.5" /> প্রিভিউ</>}
              {mode === "code" && <><Code className="h-3.5 w-3.5" /> কোড</>}
            </Button>
          ))}
        </div>
        {viewMode === "preview" && (
          <div className="flex gap-1">
            <Button size="sm" variant={devicePreview === "desktop" ? "default" : "ghost"} onClick={() => setDevicePreview("desktop")}><Monitor className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant={devicePreview === "mobile" ? "default" : "ghost"} onClick={() => setDevicePreview("mobile")}><Smartphone className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </div>

      {/* Design Mode */}
      {viewMode === "design" && (
        <div className="flex gap-4 min-h-[500px]">
          {/* Block Library Sidebar */}
          <div className="w-52 shrink-0">
            <Card className="sticky top-0">
              <CardHeader className="py-3 px-3">
                <CardTitle className="text-xs font-semibold">ব্লক লাইব্রেরি</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <ScrollArea className="h-[420px]">
                  {["basic", "layout", "dynamic"].map(cat => (
                    <div key={cat} className="mb-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 mb-1.5">
                        {cat === "basic" ? "বেসিক" : cat === "layout" ? "লেআউট" : "ডায়নামিক"}
                      </p>
                      <div className="space-y-1">
                        {BLOCK_LIBRARY.filter(b => b.category === cat).map(b => (
                          <div
                            key={b.type}
                            draggable
                            onDragStart={(e) => handleSidebarDragStart(e, b.type)}
                            onClick={() => addBlock(b.type)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-accent cursor-grab active:cursor-grabbing transition-all text-xs font-medium group"
                          >
                            <span className="text-muted-foreground group-hover:text-primary transition-colors">{b.icon}</span>
                            {b.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Canvas */}
          <div className="flex-1 min-w-0">
            <Card className="min-h-[500px] bg-muted/30">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <span className="text-[11px] text-muted-foreground ml-2">ক্যানভাস — ব্লক ড্র্যাগ করে সাজান</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{blocks.length} ব্লক</Badge>
              </div>

              <div
                className="p-4 space-y-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleCanvasDrop(e)}
              >
                {blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <LayoutGrid className="h-10 w-10 mb-3 opacity-40" />
                    <p className="font-medium">ব্লক ড্র্যাগ করুন অথবা ক্লিক করুন</p>
                    <p className="text-xs mt-1">বামের লাইব্রেরি থেকে ব্লক যোগ করুন</p>
                  </div>
                )}

                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={cn(
                      "group relative border-2 rounded-lg transition-all cursor-pointer",
                      selectedBlockId === block.id ? "border-primary shadow-md" : "border-transparent hover:border-primary/30",
                      dragOverIdx === idx && "border-primary/50 bg-primary/5",
                      draggedIdx === idx && "opacity-40"
                    )}
                  >
                    {/* Block toolbar */}
                    <div className={cn(
                      "absolute -top-3 left-2 z-10 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm",
                      selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      "transition-opacity"
                    )}>
                      <GripVertical className="h-3 w-3 cursor-grab" />
                      <span>{blockLabel(block.type)}</span>
                    </div>

                    {/* Block actions */}
                    <div className={cn(
                      "absolute -top-3 right-2 z-10 flex items-center gap-0.5",
                      selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      "transition-opacity"
                    )}>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, idx - 1); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><MoveUp className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, idx + 1); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><MoveDown className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><Copy className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                    </div>

                    {/* Block visual preview */}
                    <div className="pointer-events-none overflow-hidden rounded-md" dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="w-64 shrink-0">
            <Card className="sticky top-0">
              <CardHeader className="py-3 px-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  {selectedBlock ? blockLabel(selectedBlock.type) + " সেটিংস" : "ব্লক সিলেক্ট করুন"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {!selectedBlock ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">একটি ব্লকে ক্লিক করে সেটিংস দেখুন</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <BlockSettings
                      block={selectedBlock}
                      onContentChange={(key, val) => updateBlockContent(selectedBlock.id, key, val)}
                      onSettingChange={(key, val) => updateBlockSetting(selectedBlock.id, key, val)}
                      products={products}
                      categories={categories}
                      productSearch={productSearch}
                      categorySearch={categorySearch}
                      onProductSearchChange={setProductSearch}
                      onCategorySearchChange={setCategorySearch}
                    />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {viewMode === "preview" && (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <span className="text-xs text-muted-foreground ml-2">ইমেইল প্রিভিউ — {devicePreview === "desktop" ? "ডেস্কটপ" : "মোবাইল"}</span>
          </div>
          <div className="p-6 bg-[#e8e8e8] flex justify-center">
            <div
              className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all"
              style={{ maxWidth: devicePreview === "desktop" ? 620 : 375, width: "100%" }}
              dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) || '<p style="text-align:center;color:#999;padding:40px;">কোনো ব্লক নেই। ডিজাইন মোডে ব্লক যোগ করুন।</p>' }}
            />
          </div>
        </Card>
      )}

      {/* Code Mode */}
      {viewMode === "code" && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(blocksToHtml(blocks)); toast.success("HTML কপি হয়েছে"); }}>
              <Copy className="h-3 w-3" /> কপি
            </Button>
          </div>
          <Textarea value={blocksToHtml(blocks)} readOnly rows={18} className="font-mono text-xs" />
        </div>
      )}
    </div>
  );
};

// --- Block Settings Panel ---
interface BlockSettingsProps {
  block: EmailBlock;
  onContentChange: (key: string, value: any) => void;
  onSettingChange: (key: string, value: any) => void;
  products: any[];
  categories: any[];
  productSearch: string;
  categorySearch: string;
  onProductSearchChange: (v: string) => void;
  onCategorySearchChange: (v: string) => void;
}

const BlockSettings = ({
  block, onContentChange, onSettingChange,
  products, categories, productSearch, categorySearch,
  onProductSearchChange, onCategorySearchChange
}: BlockSettingsProps) => {
  const { type, content: c, settings: s } = block;

  const renderCommonSettings = () => (
    <div className="space-y-3 mt-4 pt-3 border-t">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">স্টাইল</p>
      <div>
        <Label className="text-xs">প্যাডিং</Label>
        <Input value={s.padding || ''} onChange={e => onSettingChange("padding", e.target.value)} placeholder="10px 30px" className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">ব্যাকগ্রাউন্ড কালার</Label>
        <div className="flex gap-2">
          <input type="color" value={s.backgroundColor || '#ffffff'} onChange={e => onSettingChange("backgroundColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
          <Input value={s.backgroundColor || ''} onChange={e => onSettingChange("backgroundColor", e.target.value)} placeholder="transparent" className="h-8 text-xs flex-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">টেক্সট কালার</Label>
        <div className="flex gap-2">
          <input type="color" value={s.textColor || '#333333'} onChange={e => onSettingChange("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
          <Input value={s.textColor || ''} onChange={e => onSettingChange("textColor", e.target.value)} placeholder="#333333" className="h-8 text-xs flex-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">অ্যালাইনমেন্ট</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map(a => (
            <Button key={a} size="sm" variant={s.alignment === a ? "default" : "outline"} onClick={() => onSettingChange("alignment", a)} className="h-7 w-7 p-0">
              {a === "left" && <AlignLeft className="h-3 w-3" />}
              {a === "center" && <AlignCenter className="h-3 w-3" />}
              {a === "right" && <AlignRight className="h-3 w-3" />}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  switch (type) {
    case "hero_banner":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">সাবটাইটেল</Label><Input value={c.subtitle || ''} onChange={e => onContentChange("subtitle", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">গ্র্যাডিয়েন্ট</Label><Input value={c.bgGradient || ''} onChange={e => onContentChange("bgGradient", e.target.value)} className="h-8 text-xs font-mono" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "header":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">টেক্সট</Label><Input value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">সাইজ</Label>
            <Select value={c.level || 'h2'} onValueChange={v => onContentChange("level", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1 - বড়</SelectItem>
                <SelectItem value="h2">H2 - মাঝারি</SelectItem>
                <SelectItem value="h3">H3 - ছোট</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderCommonSettings()}
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">টেক্সট</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={4} className="text-xs" /></div>
          <div className="flex flex-wrap gap-1">
            <p className="text-[10px] w-full text-muted-foreground mb-1">ভেরিয়েবল যোগ করুন:</p>
            {["{{name}}", "{{shop_name}}", "{{discount}}"].map(tag => (
              <button key={tag} onClick={() => onContentChange("text", (c.text || '') + ' ' + tag)} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-primary/10">{tag}</button>
            ))}
          </div>
          {renderCommonSettings()}
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ইমেজ URL</Label><Input value={c.url || ''} onChange={e => onContentChange("url", e.target.value)} placeholder="https://..." className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Alt টেক্সট</Label><Input value={c.alt || ''} onChange={e => onContentChange("alt", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">সর্বোচ্চ প্রস্থ</Label><Input value={c.width || '100%'} onChange={e => onContentChange("width", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বর্ডার রেডিয়াস</Label><Input value={s.borderRadius || '8px'} onChange={e => onSettingChange("borderRadius", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">বাটন টেক্সট</Label><Input value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">লিংক URL</Label><Input value={c.url || ''} onChange={e => onContentChange("url", e.target.value)} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">বাটন কালার</Label>
            <div className="flex gap-2">
              <input type="color" value={c.bgColor || '#667eea'} onChange={e => onContentChange("bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
              <Input value={c.bgColor || ''} onChange={e => onContentChange("bgColor", e.target.value)} className="h-8 text-xs flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">টেক্সট কালার</Label>
            <div className="flex gap-2">
              <input type="color" value={c.textColor || '#ffffff'} onChange={e => onContentChange("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
              <Input value={c.textColor || ''} onChange={e => onContentChange("textColor", e.target.value)} className="h-8 text-xs flex-1" />
            </div>
          </div>
          <div><Label className="text-xs">বর্ডার রেডিয়াস</Label><Input value={s.borderRadius || '30px'} onChange={e => onSettingChange("borderRadius", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">কালার</Label>
            <div className="flex gap-2">
              <input type="color" value={c.color || '#eeeeee'} onChange={e => onContentChange("color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
              <Input value={c.color || ''} onChange={e => onContentChange("color", e.target.value)} className="h-8 text-xs flex-1" />
            </div>
          </div>
          <div><Label className="text-xs">পুরুত্ব (px)</Label><Input type="number" value={c.thickness || '1'} onChange={e => onContentChange("thickness", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">উচ্চতা (px)</Label><Input type="number" value={c.height || '30'} onChange={e => onContentChange("height", e.target.value)} className="h-8 text-xs" /></div>
        </div>
      );
    case "product_grid":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">প্রোডাক্ট খুঁজুন</Label><Input value={productSearch} onChange={e => onProductSearchChange(e.target.value)} placeholder="প্রোডাক্ট খুঁজুন..." className="h-8 text-xs" /></div>
          <ScrollArea className="h-40 border rounded-lg p-1">
            {products.map(p => {
              const selected = (c.productIds || []).includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                  <input type="checkbox" checked={selected} onChange={e => {
                    const ids = c.productIds || [];
                    onContentChange("productIds", e.target.checked ? [...ids, p.id] : ids.filter((i: string) => i !== p.id));
                  }} className="rounded" />
                  {p.imageUrl && <img src={p.imageUrl} className="w-7 h-7 rounded object-cover" />}
                  <span className="truncate flex-1">{p.title_bn}</span>
                  <span className="text-muted-foreground">৳{p.discountPrice || p.price}</span>
                </label>
              );
            })}
          </ScrollArea>
          {(c.productIds || []).length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{(c.productIds || []).length}টি সিলেক্টেড</Badge>
          )}
          {renderCommonSettings()}
        </div>
      );
    case "category_grid":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ক্যাটাগরি খুঁজুন</Label><Input value={categorySearch} onChange={e => onCategorySearchChange(e.target.value)} placeholder="ক্যাটাগরি খুঁজুন..." className="h-8 text-xs" /></div>
          <ScrollArea className="h-40 border rounded-lg p-1">
            {categories.map(ct => {
              const selected = (c.categoryIds || []).includes(ct.id);
              return (
                <label key={ct.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                  <input type="checkbox" checked={selected} onChange={e => {
                    const ids = c.categoryIds || [];
                    onContentChange("categoryIds", e.target.checked ? [...ids, ct.id] : ids.filter((i: string) => i !== ct.id));
                  }} className="rounded" />
                  {ct.image_url && <img src={ct.image_url} className="w-7 h-7 rounded-full object-cover" />}
                  <span className="truncate">{ct.name_bn}</span>
                </label>
              );
            })}
          </ScrollArea>
          {(c.categoryIds || []).length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{(c.categoryIds || []).length}টি সিলেক্টেড</Badge>
          )}
          {renderCommonSettings()}
        </div>
      );
    case "coupon_box":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">কুপন কোড</Label><Input value={c.code || ''} onChange={e => onContentChange("code", e.target.value)} className="h-8 text-xs font-mono" /></div>
          <div><Label className="text-xs">ডিসকাউন্ট</Label><Input value={c.discount || ''} onChange={e => onContentChange("discount", e.target.value)} placeholder="20%" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বিবরণ</Label><Input value={c.description || ''} onChange={e => onContentChange("description", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "social_links":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Facebook URL</Label><Input value={c.facebook || ''} onChange={e => onContentChange("facebook", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Instagram URL</Label><Input value={c.instagram || ''} onChange={e => onContentChange("instagram", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">YouTube URL</Label><Input value={c.youtube || ''} onChange={e => onContentChange("youtube", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "footer":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ফুটার টেক্সট</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={3} className="text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "columns":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">বাম কলাম (HTML)</Label><Textarea value={c.left || ''} onChange={e => onContentChange("left", e.target.value)} rows={3} className="text-xs font-mono" /></div>
          <div><Label className="text-xs">ডান কলাম (HTML)</Label><Textarea value={c.right || ''} onChange={e => onContentChange("right", e.target.value)} rows={3} className="text-xs font-mono" /></div>
          {renderCommonSettings()}
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">কোনো সেটিংস নেই</p>;
  }
};
