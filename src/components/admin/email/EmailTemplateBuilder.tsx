import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Eye, Code, Palette, ShoppingBag, Tag, Image, Type,
  LayoutGrid, Gift, Percent, Star, ArrowRight, X, Copy, Sparkles,
  GripVertical, Trash2, MoveUp, MoveDown, Settings, AlignCenter,
  AlignLeft, AlignRight, Square, Columns, Minus, ChevronDown, ChevronUp,
  ImagePlus, Link, Bold, Monitor, Smartphone, BookOpen, Package, FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateBuilderProps {
  initialHtml?: string;
  initialSubject?: string;
  onHtmlChange: (html: string) => void;
  onSubjectChange?: (subject: string) => void;
}

type BlockType =
  | "header" | "text" | "image" | "button" | "divider" | "spacer"
  | "product_grid" | "ebook_grid" | "universal_grid" | "category_grid"
  | "columns" | "hero_banner" | "social_links" | "footer" | "coupon_box"
  | "testimonial" | "feature_list";

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
  { type: "product_grid", label: "📚 বই গ্রিড", icon: <BookOpen className="h-4 w-4" />, category: "products" },
  { type: "ebook_grid", label: "📱 ইবুক গ্রিড", icon: <FileText className="h-4 w-4" />, category: "products" },
  { type: "universal_grid", label: "🛍️ ইউনিভার্সাল গ্রিড", icon: <Package className="h-4 w-4" />, category: "products" },
  { type: "category_grid", label: "ক্যাটাগরি গ্রিড", icon: <LayoutGrid className="h-4 w-4" />, category: "products" },
  { type: "coupon_box", label: "কুপন বক্স", icon: <Gift className="h-4 w-4" />, category: "dynamic" },
  { type: "testimonial", label: "টেস্টিমোনিয়াল", icon: <Star className="h-4 w-4" />, category: "dynamic" },
  { type: "feature_list", label: "ফিচার লিস্ট", icon: <Tag className="h-4 w-4" />, category: "dynamic" },
  { type: "social_links", label: "সোশ্যাল লিংক", icon: <Link className="h-4 w-4" />, category: "layout" },
  { type: "footer", label: "ফুটার", icon: <AlignCenter className="h-4 w-4" />, category: "layout" },
];

const PRESET_TEMPLATES = [
  {
    id: "modern-promo", name: "মডার্ন প্রোমো", icon: "🎯", description: "সব প্রোডাক্ট",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "{{shop_name}}", subtitle: "সেরা অফার এখানে!", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "আমাদের নতুন কালেকশন দেখুন এবং বিশেষ ছাড় উপভোগ করুন।" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "2b", type: "header" as BlockType, content: { text: "📚 সেরা বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "3b", type: "header" as BlockType, content: { text: "📱 ই-বুক কালেকশন", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "3c", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "এখনই কিনুন →", url: "#", bgColor: "#667eea" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "social_links" as BlockType, content: { facebook: "#", instagram: "#", youtube: "#" }, settings: { padding: "15px 30px", alignment: "center" as const } },
      { id: "6", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}. সকল অধিকার সংরক্ষিত।", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa" } },
    ]
  },
  {
    id: "flash-sale", name: "ফ্ল্যাশ সেল", icon: "⚡", description: "সীমিত অফার",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "⚡ মেগা ফ্ল্যাশ সেল ⚡", subtitle: "সীমিত সময়ের বিশাল ছাড়!", bgGradient: "linear-gradient(135deg,#ff4757 0%,#ff6b81 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "coupon_box" as BlockType, content: { code: "FLASH50", discount: "50%", description: "সব প্রোডাক্টে" }, settings: { padding: "15px 30px" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "sale" }, settings: { padding: "10px 30px" } },
      { id: "3b", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "সব অফার দেখুন →", url: "#", bgColor: "#ff4757" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#2f3542", textColor: "#999" } },
    ]
  },
  {
    id: "ebook-special", name: "ইবুক স্পেশাল", icon: "📱", description: "ডিজিটাল প্রোডাক্ট",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "📱 ডিজিটাল লাইব্রেরি", subtitle: "সেরা ইবুক কালেকশন", bgGradient: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "যেকোনো সময়, যেকোনো জায়গায় পড়ুন। আমাদের ইবুক কালেকশন থেকে আপনার পছন্দের বই বেছে নিন।" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "feature_list" as BlockType, content: { items: ["তাৎক্ষণিক ডাউনলোড", "PDF, EPUB ফরম্যাট", "মোবাইল ফ্রেন্ডলি", "অফলাইনে পড়ুন"] }, settings: { padding: "10px 30px" } },
      { id: "4", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "5", type: "button" as BlockType, content: { text: "ইবুক শপ দেখুন →", url: "#", bgColor: "#2193b0" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "6", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f0f9ff" } },
    ]
  },
  {
    id: "newsletter", name: "নিউজলেটার", icon: "📰", description: "সাপ্তাহিক আপডেট",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "📰 সাপ্তাহিক আপডেট", subtitle: "এই সপ্তাহের সেরা বই ও অফার", bgGradient: "linear-gradient(135deg,#232526 0%,#414345 100%)" }, settings: { padding: "40px 30px", textColor: "#ffffff" } },
      { id: "2", type: "header" as BlockType, content: { text: "📚 নতুন বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "3b", type: "header" as BlockType, content: { text: "📱 নতুন ইবুক", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "3c", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "3d", type: "header" as BlockType, content: { text: "🛍️ লাইফস্টাইল প্রোডাক্ট", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "3e", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "category_grid" as BlockType, content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
      { id: "5", type: "button" as BlockType, content: { text: "সব দেখুন →", url: "#", bgColor: "#333" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "6", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa" } },
    ]
  },
  {
    id: "eid-offer", name: "ঈদ অফার", icon: "🌙", description: "ঈদ স্পেশাল",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🌙 ঈদ মোবারক!", subtitle: "ঈদ স্পেশাল ছাড় সকল প্রোডাক্টে", bgGradient: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }, settings: { padding: "50px 30px", textColor: "#e2b714" } },
      { id: "2", type: "coupon_box" as BlockType, content: { code: "EID2026", discount: "25%", description: "সকল বই ও প্রোডাক্টে" }, settings: { padding: "15px 30px" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "3b", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "ঈদ অফার দেখুন →", url: "#", bgColor: "#e2b714", textColor: "#1a1a2e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "ঈদ মোবারক! © 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "rgba(255,255,255,0.5)" } },
    ]
  },
  {
    id: "universal-showcase", name: "প্রোডাক্ট শোকেস", icon: "🛍️", description: "লাইফস্টাইল ও অন্যান্য",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🛍️ নতুন কালেকশন", subtitle: "স্টেশনারি, লাইফস্টাইল ও আরও অনেক কিছু", bgGradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "3", type: "testimonial" as BlockType, content: { name: "রহিম আহমেদ", text: "দারুণ প্রোডাক্ট! খুবই ভালো মানের।", avatar: "" }, settings: { padding: "15px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "শপে যান →", url: "#", bgColor: "#11998e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f0fff4" } },
    ]
  },
];

const genId = () => Math.random().toString(36).slice(2, 10);

const createDefaultBlock = (type: BlockType): EmailBlock => {
  const defaults: Record<BlockType, Partial<EmailBlock>> = {
    hero_banner: { content: { title: "আপনার শিরোনাম", subtitle: "সাবটাইটেল", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
    header: { content: { text: "হেডিং টেক্সট", level: "h2" }, settings: { padding: "15px 30px", alignment: "center" } },
    text: { content: { text: "আপনার টেক্সট এখানে লিখুন..." }, settings: { padding: "10px 30px" } },
    image: { content: { url: "", alt: "Image", width: "100%" }, settings: { padding: "10px 30px", alignment: "center" } },
    button: { content: { text: "বাটন টেক্সট", url: "#", bgColor: "#667eea", textColor: "#ffffff" }, settings: { padding: "15px 30px", alignment: "center", borderRadius: "30px" } },
    divider: { content: { color: "#eeeeee", thickness: "1" }, settings: { padding: "10px 30px" } },
    spacer: { content: { height: "30" }, settings: {} },
    product_grid: { content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
    ebook_grid: { content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
    universal_grid: { content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
    category_grid: { content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
    columns: { content: { left: "বাম কলাম", right: "ডান কলাম" }, settings: { padding: "10px 30px" } },
    social_links: { content: { facebook: "#", instagram: "#", youtube: "#", twitter: "" }, settings: { padding: "15px 30px", alignment: "center" } },
    footer: { content: { text: "© 2026 আপনার শপ। সকল অধিকার সংরক্ষিত।", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa", alignment: "center" } },
    coupon_box: { content: { code: "SAVE20", discount: "20%", description: "সকল প্রোডাক্টে" }, settings: { padding: "15px 30px" } },
    testimonial: { content: { name: "গ্রাহকের নাম", text: "দারুণ সার্ভিস!", avatar: "" }, settings: { padding: "15px 30px" } },
    feature_list: { content: { items: ["ফিচার ১", "ফিচার ২", "ফিচার ৩"] }, settings: { padding: "15px 30px" } },
  };
  const d = defaults[type] || {};
  return { id: genId(), type, content: d.content || {}, settings: d.settings || {} };
};

const siteUrl = "https://boialo.lovable.app";

// Professional product card HTML generator
const productCardHtml = (p: any, style: string = "modern") => {
  const img = p.imageUrl || '';
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const discountBadge = hasDiscount
    ? `<div style="position:absolute;top:8px;left:8px;background:#ff4757;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">-${p.discount_percent || Math.round((1 - p.discountPrice / p.price) * 100)}%</div>`
    : '';

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.08);position:relative;">
      ${discountBadge}
      ${img ? `<img src="${img}" alt="${p.title}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : `<div style="height:180px;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);text-align:center;line-height:180px;font-size:40px;">📚</div>`}
      <div style="padding:12px;">
        <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px;font-weight:600;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.title}</p>
        ${p.author ? `<p style="font-size:11px;color:#888;margin:0 0 8px;">${p.author}</p>` : ''}
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#e53e3e;font-weight:700;font-size:16px;">৳${hasDiscount ? p.discountPrice : p.price}</span>
          ${hasDiscount ? `<span style="color:#aaa;text-decoration:line-through;font-size:12px;">৳${p.price}</span>` : ''}
        </div>
        <a href="${p.link}" style="display:block;margin-top:10px;background:${style === 'sale' ? '#ff4757' : '#667eea'};color:#fff;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;text-align:center;">অর্ডার করুন</a>
      </div>
    </div>
  </td>`;
};

const ebookCardHtml = (eb: any) => {
  const hasDiscount = eb.discount_percent && eb.discount_percent > 0;
  const salePrice = hasDiscount ? Math.round(eb.price * (1 - eb.discount_percent / 100)) : null;
  const formatBadge = eb.file_format ? `<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;">${eb.file_format}</span>` : '';
  const discountBadge = hasDiscount ? `<span style="position:absolute;top:8px;left:8px;background:#ff4757;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">-${eb.discount_percent}%</span>` : '';
  const img = eb.cover_image || '';
  const isFree = eb.is_free;

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.08);position:relative;">
      ${discountBadge}${formatBadge}
      ${img ? `<img src="${img}" alt="${eb.title_bn}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : `<div style="height:180px;background:linear-gradient(135deg,#e0f2fe,#bae6fd);text-align:center;line-height:180px;font-size:40px;">📱</div>`}
      <div style="padding:12px;">
        <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px;font-weight:600;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${eb.title_bn}</p>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
          ${isFree ? `<span style="color:#11998e;font-weight:700;font-size:14px;">ফ্রি</span>` : `<span style="color:#2193b0;font-weight:700;font-size:16px;">৳${salePrice || eb.price}</span>${salePrice ? `<span style="color:#aaa;text-decoration:line-through;font-size:12px;">৳${eb.price}</span>` : ''}`}
        </div>
        <a href="${siteUrl}/ebooks/${eb.slug}" style="display:block;margin-top:10px;background:linear-gradient(135deg,#2193b0,#6dd5ed);color:#fff;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;text-align:center;">${isFree ? 'ফ্রিতে পড়ুন' : 'এখনই কিনুন'}</a>
      </div>
    </div>
  </td>`;
};

const universalCardHtml = (up: any) => {
  const hasDiscount = up.discount_percent && up.discount_percent > 0;
  const salePrice = hasDiscount ? Math.round(up.price * (1 - up.discount_percent / 100)) : null;
  const imgs = Array.isArray(up.images) ? up.images : [];
  const img = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
  const discountBadge = hasDiscount ? `<span style="position:absolute;top:8px;left:8px;background:#ff4757;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;">-${up.discount_percent}%</span>` : '';
  const typeBadge = up.product_type ? `<span style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;">${up.product_type}</span>` : '';

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.08);position:relative;">
      ${discountBadge}${typeBadge}
      ${img ? `<img src="${img}" alt="${up.name_bn}" style="width:100%;height:180px;object-fit:cover;display:block;" />` : `<div style="height:180px;background:linear-gradient(135deg,#ffecd2,#fcb69f);text-align:center;line-height:180px;font-size:40px;">🛍️</div>`}
      <div style="padding:12px;">
        <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px;font-weight:600;line-height:1.4;">${up.name_bn}</p>
        ${up.brand_name ? `<p style="font-size:11px;color:#888;margin:0 0 6px;">${up.brand_name}</p>` : ''}
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#11998e;font-weight:700;font-size:16px;">৳${salePrice || up.price}</span>
          ${salePrice ? `<span style="color:#aaa;text-decoration:line-through;font-size:12px;">৳${up.price}</span>` : ''}
        </div>
        <a href="${siteUrl}/universal-product/${up.slug}" style="display:block;margin-top:10px;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;text-align:center;">অর্ডার করুন</a>
      </div>
    </div>
  </td>`;
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
  const [ebookSearch, setEbookSearch] = useState("");
  const [universalSearch, setUniversalSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Fetch books
  const { data: products = [] } = useQuery({
    queryKey: ['email-builder-products', productSearch],
    queryFn: async () => {
      let query = supabase.from('products').select('id, title_bn, title_en, slug, price, discount_percent, original_price, images').eq('is_active', true).limit(20);
      if (productSearch) query = query.ilike('title_bn', `%${productSearch}%`);
      const { data } = await query;
      return (data || []).map(p => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const imageUrl = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
        const discountPrice = p.discount_percent ? Math.round(p.price * (1 - p.discount_percent / 100)) : null;
        return { ...p, imageUrl, discountPrice, title: p.title_bn, link: `${siteUrl}/product/${p.slug}` };
      });
    }
  });

  // Fetch ebooks
  const { data: ebooks = [] } = useQuery({
    queryKey: ['email-builder-ebooks', ebookSearch],
    queryFn: async () => {
      let query = supabase.from('digital_products').select('id, title_bn, slug, price, discount_percent, original_price, cover_image, file_format, is_free, product_type').eq('is_active', true).limit(20);
      if (ebookSearch) query = query.ilike('title_bn', `%${ebookSearch}%`);
      const { data } = await query;
      return data || [];
    }
  });

  // Fetch universal products
  const { data: universalProducts = [] } = useQuery({
    queryKey: ['email-builder-universal', universalSearch],
    queryFn: async () => {
      let query = supabase.from('universal_products').select('id, name_bn, slug, price, discount_percent, original_price, images, product_type').eq('is_active', true).limit(20);
      if (universalSearch) query = query.ilike('name_bn', `%${universalSearch}%`);
      const { data } = await query;
      return (data || []).map(p => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const img = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
        return { ...p, imageUrl: img };
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

  useEffect(() => {
    onHtmlChange(blocksToHtml(blocks));
  }, [blocks]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

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
    setBlocks(prev => { const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const idx = blocks.findIndex(b => b.id === id);
    const dup = { ...JSON.parse(JSON.stringify(block)), id: genId() };
    setBlocks(prev => { const n = [...prev]; n.splice(idx + 1, 0, dup); return n; });
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => { if (draggedIdx !== null && draggedIdx !== idx) moveBlock(draggedIdx, idx); setDraggedIdx(null); setDragOverIdx(null); };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };
  const handleSidebarDragStart = (e: React.DragEvent, type: BlockType) => { e.dataTransfer.setData("block-type", type); };
  const handleCanvasDrop = (e: React.DragEvent, idx?: number) => { e.preventDefault(); const type = e.dataTransfer.getData("block-type") as BlockType; if (type) addBlock(type, idx); setDragOverIdx(null); };

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
  <h1 style="color:${txtCol};font-size:30px;margin:0 0 10px;font-weight:800;letter-spacing:-0.5px;">${c.title || ''}</h1>
  <p style="color:${txtCol};opacity:0.9;font-size:16px;margin:0;font-weight:400;">${c.subtitle || ''}</p>
</div>`;
      case "header": {
        const tag = c.level || "h2";
        const sizes: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};"><${tag} style="color:${txtCol};font-size:${sizes[tag] || '22px'};margin:0;font-weight:700;">${c.text || ''}</${tag}></div>`;
      }
      case "text":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};"><p style="color:${txtCol};font-size:15px;line-height:1.7;margin:0;">${c.text || ''}</p></div>`;
      case "image":
        return `<div style="padding:${pad};text-align:${align};"><img src="${c.url || '/placeholder.svg'}" alt="${c.alt || ''}" style="max-width:${c.width || '100%'};border-radius:${s.borderRadius || '8px'};" /></div>`;
      case "button": {
        const btnBg = c.bgColor || "#667eea";
        const btnTxt = c.textColor || "#ffffff";
        return `<div style="padding:${pad};text-align:${align};"><a href="${c.url || '#'}" style="display:inline-block;background:${btnBg};color:${btnTxt};padding:14px 40px;border-radius:${s.borderRadius || '30px'};text-decoration:none;font-weight:700;font-size:15px;">${c.text || 'বাটন'}</a></div>`;
      }
      case "divider":
        return `<div style="padding:${pad};"><hr style="border:none;border-top:${c.thickness || '1'}px solid ${c.color || '#eeeeee'};margin:0;" /></div>`;
      case "spacer":
        return `<div style="height:${c.height || '30'}px;"></div>`;

      case "product_grid": {
        const sel = products.filter(p => (c.productIds || []).includes(p.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;">📚 বই সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${productCardHtml(sel[i], c.cardStyle)}${sel[i + 1] ? productCardHtml(sel[i + 1], c.cardStyle) : '<td></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "ebook_grid": {
        const sel = ebooks.filter(eb => (c.ebookIds || []).includes(eb.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;">📱 ইবুক সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${ebookCardHtml(sel[i])}${sel[i + 1] ? ebookCardHtml(sel[i + 1]) : '<td></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "universal_grid": {
        const sel = universalProducts.filter(up => (c.universalIds || []).includes(up.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;">🛍️ প্রোডাক্ট সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${universalCardHtml(sel[i])}${sel[i + 1] ? universalCardHtml(sel[i + 1]) : '<td></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "category_grid": {
        const sel = categories.filter(ct => (c.categoryIds || []).includes(ct.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;">ক্যাটাগরি সিলেক্ট করুন</div>`;
        const colW = Math.floor(100 / Math.min(sel.length, 4));
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr>${sel.map((ct, i) => {
          const card = `<td style="width:${colW}%;padding:8px;text-align:center;vertical-align:top;"><a href="${siteUrl}/category/${ct.slug}" style="text-decoration:none;">${ct.image_url ? `<img src="${ct.image_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;border:3px solid #f0f0f0;" />` : `<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);margin:0 auto;line-height:72px;font-size:28px;">📂</div>`}<p style="color:#333;font-size:13px;margin-top:8px;font-weight:600;">${ct.name_bn}</p></a></td>`;
          return card + ((i % 4 === 3 && i < sel.length - 1) ? '</tr><tr>' : '');
        }).join('')}</tr></table></div>`;
      }

      case "coupon_box":
        return `<div style="padding:${pad};"><div style="border:2px dashed #667eea;border-radius:16px;padding:24px;text-align:center;background:linear-gradient(135deg,#f8f9ff,#eef0ff);"><p style="font-size:13px;color:#666;margin:0 0 10px;">${c.description || ''}</p><div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:inline-block;padding:12px 36px;border-radius:10px;font-size:22px;font-weight:800;letter-spacing:4px;">${c.code || 'CODE'}</div><p style="font-size:28px;font-weight:800;color:#667eea;margin:12px 0 0;">${c.discount || ''} ছাড়</p></div></div>`;

      case "testimonial":
        return `<div style="padding:${pad};"><div style="background:#f8f9fa;border-radius:16px;padding:24px;text-align:center;border-left:4px solid #667eea;"><p style="font-size:15px;color:#555;margin:0 0 12px;font-style:italic;line-height:1.6;">"${c.text || ''}"</p><p style="font-size:14px;color:#333;margin:0;font-weight:600;">— ${c.name || ''}</p></div></div>`;

      case "feature_list": {
        const items = c.items || [];
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${items.map((item: string) => `<tr><td style="padding:6px 0;"><span style="display:inline-block;width:24px;height:24px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;margin-right:10px;">✓</span><span style="font-size:14px;color:#333;">${item}</span></td></tr>`).join('')}</table></div>`;
      }

      case "social_links":
        return `<div style="padding:${pad};text-align:${align};">
  ${c.facebook ? `<a href="${c.facebook}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="32" height="32" style="border-radius:8px;" /></a>` : ''}
  ${c.instagram ? `<a href="${c.instagram}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="32" height="32" style="border-radius:8px;" /></a>` : ''}
  ${c.youtube ? `<a href="${c.youtube}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="32" height="32" style="border-radius:8px;" /></a>` : ''}
  ${c.twitter ? `<a href="${c.twitter}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" width="32" height="32" style="border-radius:8px;" /></a>` : ''}
</div>`;

      case "footer":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};${s.borderTop ? `border-top:${s.borderTop};` : ''}"><p style="color:${txtCol};font-size:12px;margin:0;">${c.text || ''}</p>${c.unsubscribe ? `<p style="color:#999;font-size:11px;margin:8px 0 0;"><a href="#" style="color:#999;text-decoration:underline;">আনসাবস্ক্রাইব</a></p>` : ''}</div>`;

      case "columns":
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr><td style="width:50%;padding:10px;vertical-align:top;">${c.left || ''}</td><td style="width:50%;padding:10px;vertical-align:top;">${c.right || ''}</td></tr></table></div>`;

      default:
        return '';
    }
  };

  const blocksToHtml = (blocks: EmailBlock[]): string => {
    if (blocks.length === 0) return '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f0f0f0;"><div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#ffffff;">\n${blocks.map(b => blockToHtml(b)).join('\n')}\n</div></body></html>`;
  };

  const blockLabel = (type: BlockType) => BLOCK_LIBRARY.find(b => b.type === type)?.label || type;

  return (
    <div className="flex flex-col gap-4">
      {/* Presets */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">🎨 প্রিসেট টেমপ্লেট</Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PRESET_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className="flex flex-col items-center gap-1.5 p-3 border rounded-xl hover:bg-accent hover:border-primary/30 transition-all text-center group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
              <span className="text-xs font-medium leading-tight">{t.name}</span>
              <span className="text-[10px] text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* View Toggle */}
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
          {/* Block Library */}
          <div className="w-52 shrink-0">
            <Card className="sticky top-0">
              <CardHeader className="py-3 px-3"><CardTitle className="text-xs font-semibold">ব্লক লাইব্রেরি</CardTitle></CardHeader>
              <CardContent className="p-2 pt-0">
                <ScrollArea className="h-[450px]">
                  {["basic", "layout", "products", "dynamic"].map(cat => (
                    <div key={cat} className="mb-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 mb-1.5">
                        {cat === "basic" ? "বেসিক" : cat === "layout" ? "লেআউট" : cat === "products" ? "📦 প্রোডাক্ট" : "ডায়নামিক"}
                      </p>
                      <div className="space-y-1">
                        {BLOCK_LIBRARY.filter(b => b.category === cat).map(b => (
                          <div key={b.type} draggable onDragStart={(e) => handleSidebarDragStart(e, b.type)} onClick={() => addBlock(b.type)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-accent cursor-grab active:cursor-grabbing transition-all text-xs font-medium group">
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
              <div className="p-4 space-y-0" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleCanvasDrop(e)}>
                {blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <LayoutGrid className="h-10 w-10 mb-3 opacity-40" />
                    <p className="font-medium">ব্লক ড্র্যাগ করুন অথবা ক্লিক করুন</p>
                    <p className="text-xs mt-1">বামের লাইব্রেরি থেকে ব্লক যোগ করুন</p>
                  </div>
                )}
                {blocks.map((block, idx) => (
                  <div key={block.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd} onClick={() => setSelectedBlockId(block.id)}
                    className={cn("group relative border-2 rounded-lg transition-all cursor-pointer", selectedBlockId === block.id ? "border-primary shadow-md" : "border-transparent hover:border-primary/30", dragOverIdx === idx && "border-primary/50 bg-primary/5", draggedIdx === idx && "opacity-40")}>
                    <div className={cn("absolute -top-3 left-2 z-10 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm transition-opacity", selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                      <GripVertical className="h-3 w-3 cursor-grab" /><span>{blockLabel(block.type)}</span>
                    </div>
                    <div className={cn("absolute -top-3 right-2 z-10 flex items-center gap-0.5 transition-opacity", selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, idx - 1); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><MoveUp className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, idx + 1); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><MoveDown className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-accent"><Copy className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 bg-background border rounded shadow-sm hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    <div className="pointer-events-none overflow-hidden rounded-md" dangerouslySetInnerHTML={{ __html: blockToHtml(block) }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="w-72 shrink-0">
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
                  <ScrollArea className="h-[450px]">
                    <BlockSettings
                      block={selectedBlock}
                      onContentChange={(key, val) => updateBlockContent(selectedBlock.id, key, val)}
                      onSettingChange={(key, val) => updateBlockSetting(selectedBlock.id, key, val)}
                      products={products} ebooks={ebooks} universalProducts={universalProducts} categories={categories}
                      productSearch={productSearch} ebookSearch={ebookSearch} universalSearch={universalSearch} categorySearch={categorySearch}
                      onProductSearchChange={setProductSearch} onEbookSearchChange={setEbookSearch} onUniversalSearchChange={setUniversalSearch} onCategorySearchChange={setCategorySearch}
                    />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Preview */}
      {viewMode === "preview" && (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-destructive/60" /><div className="w-3 h-3 rounded-full bg-yellow-400/60" /><div className="w-3 h-3 rounded-full bg-green-400/60" /></div>
            <span className="text-xs text-muted-foreground ml-2">ইমেইল প্রিভিউ — {devicePreview === "desktop" ? "ডেস্কটপ" : "মোবাইল"}</span>
          </div>
          <div className="p-6 bg-[#e8e8e8] flex justify-center">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all" style={{ maxWidth: devicePreview === "desktop" ? 620 : 375, width: "100%" }}
              dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) || '<p style="text-align:center;color:#999;padding:40px;">কোনো ব্লক নেই।</p>' }} />
          </div>
        </Card>
      )}

      {/* Code */}
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
  products: any[]; ebooks: any[]; universalProducts: any[]; categories: any[];
  productSearch: string; ebookSearch: string; universalSearch: string; categorySearch: string;
  onProductSearchChange: (v: string) => void; onEbookSearchChange: (v: string) => void; onUniversalSearchChange: (v: string) => void; onCategorySearchChange: (v: string) => void;
}

const BlockSettings = ({
  block, onContentChange, onSettingChange,
  products, ebooks, universalProducts, categories,
  productSearch, ebookSearch, universalSearch, categorySearch,
  onProductSearchChange, onEbookSearchChange, onUniversalSearchChange, onCategorySearchChange
}: BlockSettingsProps) => {
  const { type, content: c, settings: s } = block;

  const renderCommonSettings = () => (
    <div className="space-y-3 mt-4 pt-3 border-t">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">স্টাইল</p>
      <div><Label className="text-xs">প্যাডিং</Label><Input value={s.padding || ''} onChange={e => onSettingChange("padding", e.target.value)} placeholder="10px 30px" className="h-8 text-xs" /></div>
      <div>
        <Label className="text-xs">ব্যাকগ্রাউন্ড</Label>
        <div className="flex gap-2">
          <input type="color" value={s.backgroundColor || '#ffffff'} onChange={e => onSettingChange("backgroundColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
          <Input value={s.backgroundColor || ''} onChange={e => onSettingChange("backgroundColor", e.target.value)} className="h-8 text-xs flex-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">টেক্সট কালার</Label>
        <div className="flex gap-2">
          <input type="color" value={s.textColor || '#333333'} onChange={e => onSettingChange("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" />
          <Input value={s.textColor || ''} onChange={e => onSettingChange("textColor", e.target.value)} className="h-8 text-xs flex-1" />
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

  const renderProductSelector = (ids: string[], key: string, items: any[], search: string, onSearch: (v: string) => void, labelKey: string, imgKey: string, priceField: string) => (
    <div className="space-y-3">
      <div><Label className="text-xs">খুঁজুন</Label><Input value={search} onChange={e => onSearch(e.target.value)} placeholder="নাম দিয়ে খুঁজুন..." className="h-8 text-xs" /></div>
      <ScrollArea className="h-44 border rounded-lg p-1">
        {items.map(item => {
          const selected = ids.includes(item.id);
          const img = item[imgKey];
          return (
            <label key={item.id} className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs", selected ? "bg-primary/10" : "hover:bg-accent")}>
              <input type="checkbox" checked={selected} onChange={e => {
                onContentChange(key, e.target.checked ? [...ids, item.id] : ids.filter((i: string) => i !== item.id));
              }} className="rounded" />
              {img && <img src={img} className="w-8 h-8 rounded object-cover" />}
              <span className="truncate flex-1">{item[labelKey]}</span>
              <span className="text-muted-foreground shrink-0">৳{item[priceField]}</span>
            </label>
          );
        })}
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">কোনো আইটেম পাওয়া যায়নি</p>}
      </ScrollArea>
      {ids.length > 0 && <Badge variant="secondary" className="text-[10px]">{ids.length}টি সিলেক্টেড</Badge>}
    </div>
  );

  switch (type) {
    case "hero_banner":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">সাবটাইটেল</Label><Input value={c.subtitle || ''} onChange={e => onContentChange("subtitle", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">গ্র্যাডিয়েন্ট</Label><Input value={c.bgGradient || ''} onChange={e => onContentChange("bgGradient", e.target.value)} className="h-8 text-xs font-mono" /></div>
          <div>
            <Label className="text-xs mb-1 block">প্রিসেট গ্র্যাডিয়েন্ট</Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
                "linear-gradient(135deg,#ff4757 0%,#ff6b81 100%)",
                "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)",
                "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)",
                "linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)",
                "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
                "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
                "linear-gradient(135deg,#232526 0%,#414345 100%)",
              ].map(g => (
                <button key={g} onClick={() => onContentChange("bgGradient", g)} className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-primary transition-all" style={{ background: g }} />
              ))}
            </div>
          </div>
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
            <p className="text-[10px] w-full text-muted-foreground mb-1">ভেরিয়েবল:</p>
            {["{{name}}", "{{shop_name}}", "{{discount}}", "{{order_number}}"].map(tag => (
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
          {renderCommonSettings()}
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">বাটন টেক্সট</Label><Input value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">লিংক URL</Label><Input value={c.url || ''} onChange={e => onContentChange("url", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বাটন কালার</Label>
            <div className="flex gap-2"><input type="color" value={c.bgColor || '#667eea'} onChange={e => onContentChange("bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" /><Input value={c.bgColor || ''} onChange={e => onContentChange("bgColor", e.target.value)} className="h-8 text-xs flex-1" /></div>
          </div>
          <div><Label className="text-xs">টেক্সট কালার</Label>
            <div className="flex gap-2"><input type="color" value={c.textColor || '#ffffff'} onChange={e => onContentChange("textColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" /><Input value={c.textColor || ''} onChange={e => onContentChange("textColor", e.target.value)} className="h-8 text-xs flex-1" /></div>
          </div>
          <div><Label className="text-xs">রেডিয়াস</Label><Input value={s.borderRadius || '30px'} onChange={e => onSettingChange("borderRadius", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">কালার</Label><div className="flex gap-2"><input type="color" value={c.color || '#eeeeee'} onChange={e => onContentChange("color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" /><Input value={c.color || ''} onChange={e => onContentChange("color", e.target.value)} className="h-8 text-xs flex-1" /></div></div>
          <div><Label className="text-xs">পুরুত্ব (px)</Label><Input type="number" value={c.thickness || '1'} onChange={e => onContentChange("thickness", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );
    case "spacer":
      return <div className="space-y-3"><div><Label className="text-xs">উচ্চতা (px)</Label><Input type="number" value={c.height || '30'} onChange={e => onContentChange("height", e.target.value)} className="h-8 text-xs" /></div></div>;

    case "product_grid":
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1">📚 বই সিলেক্ট করুন</p>
          {renderProductSelector(c.productIds || [], "productIds", products, productSearch, onProductSearchChange, "title", "imageUrl", "price")}
          <div>
            <Label className="text-xs">কার্ড স্টাইল</Label>
            <Select value={c.cardStyle || 'modern'} onValueChange={v => onContentChange("cardStyle", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">মডার্ন</SelectItem>
                <SelectItem value="sale">সেল স্টাইল</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case "ebook_grid":
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1">📱 ইবুক সিলেক্ট করুন</p>
          {renderProductSelector(c.ebookIds || [], "ebookIds", ebooks, ebookSearch, onEbookSearchChange, "title_bn", "cover_image", "price")}
          {renderCommonSettings()}
        </div>
      );

    case "universal_grid":
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1">🛍️ ইউনিভার্সাল প্রোডাক্ট সিলেক্ট করুন</p>
          {renderProductSelector(c.universalIds || [], "universalIds", universalProducts, universalSearch, onUniversalSearchChange, "name_bn", "imageUrl", "price")}
          {renderCommonSettings()}
        </div>
      );

    case "category_grid":
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold">ক্যাটাগরি সিলেক্ট করুন</p>
          <div><Input value={categorySearch} onChange={e => onCategorySearchChange(e.target.value)} placeholder="ক্যাটাগরি খুঁজুন..." className="h-8 text-xs" /></div>
          <ScrollArea className="h-40 border rounded-lg p-1">
            {categories.map(ct => {
              const selected = (c.categoryIds || []).includes(ct.id);
              return (
                <label key={ct.id} className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs", selected ? "bg-primary/10" : "hover:bg-accent")}>
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
          {(c.categoryIds || []).length > 0 && <Badge variant="secondary" className="text-[10px]">{(c.categoryIds || []).length}টি সিলেক্টেড</Badge>}
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

    case "testimonial":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">গ্রাহকের নাম</Label><Input value={c.name || ''} onChange={e => onContentChange("name", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">মন্তব্য</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={3} className="text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "feature_list": {
      const items: string[] = c.items || [];
      return (
        <div className="space-y-3">
          <Label className="text-xs">ফিচার আইটেম</Label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1">
              <Input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onContentChange("items", n); }} className="h-8 text-xs" />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => onContentChange("items", items.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("items", [...items, "নতুন ফিচার"])}><Plus className="h-3 w-3 mr-1" /> যোগ করুন</Button>
          {renderCommonSettings()}
        </div>
      );
    }

    case "social_links":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">Facebook</Label><Input value={c.facebook || ''} onChange={e => onContentChange("facebook", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Instagram</Label><Input value={c.instagram || ''} onChange={e => onContentChange("instagram", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">YouTube</Label><Input value={c.youtube || ''} onChange={e => onContentChange("youtube", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Twitter/X</Label><Input value={c.twitter || ''} onChange={e => onContentChange("twitter", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ফুটার টেক্সট</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={3} className="text-xs" /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={c.unsubscribe || false} onChange={e => onContentChange("unsubscribe", e.target.checked)} />
            <Label className="text-xs">আনসাবস্ক্রাইব লিংক দেখান</Label>
          </div>
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
