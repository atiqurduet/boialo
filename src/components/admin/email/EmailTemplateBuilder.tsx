import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus, Eye, Code, Palette, ShoppingBag, Tag, Image, Type,
  LayoutGrid, Gift, Percent, Star, ArrowRight, X, Copy, Sparkles,
  GripVertical, Trash2, MoveUp, MoveDown, Settings, AlignCenter,
  AlignLeft, AlignRight, Square, Columns, Minus, ChevronDown, ChevronUp,
  ImagePlus, Link, Bold, Monitor, Smartphone, BookOpen, Package, FileText,
  Clock, Play, Award, MessageSquare, Zap, Timer, MapPin, Phone,
  Mail, TrendingUp, Heart, Users, Undo2, Redo2, Layers
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
  | "testimonial" | "feature_list" | "countdown" | "video_embed"
  | "banner_strip" | "rating_block" | "stats_row" | "cta_section"
  | "image_text" | "price_table" | "faq_block" | "brand_showcase"
  | "trust_badges" | "urgency_bar" | "multi_banner" | "progress_bar"
  | "order_summary" | "personalized_header" | "deal_grid";

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
  // Basic
  { type: "hero_banner", label: "হিরো ব্যানার", icon: <Sparkles className="h-4 w-4" />, category: "basic" },
  { type: "header", label: "হেডিং", icon: <Type className="h-4 w-4" />, category: "basic" },
  { type: "text", label: "টেক্সট", icon: <AlignLeft className="h-4 w-4" />, category: "basic" },
  { type: "image", label: "ইমেজ", icon: <Image className="h-4 w-4" />, category: "basic" },
  { type: "button", label: "বাটন", icon: <Square className="h-4 w-4" />, category: "basic" },
  { type: "divider", label: "ডিভাইডার", icon: <Minus className="h-4 w-4" />, category: "basic" },
  { type: "spacer", label: "স্পেসার", icon: <MoveDown className="h-4 w-4" />, category: "basic" },
  // Layout
  { type: "columns", label: "কলাম লেআউট", icon: <Columns className="h-4 w-4" />, category: "layout" },
  { type: "image_text", label: "ইমেজ + টেক্সট", icon: <Layers className="h-4 w-4" />, category: "layout" },
  { type: "cta_section", label: "CTA সেকশন", icon: <Zap className="h-4 w-4" />, category: "layout" },
  { type: "banner_strip", label: "ব্যানার স্ট্রিপ", icon: <Award className="h-4 w-4" />, category: "layout" },
  { type: "social_links", label: "সোশ্যাল লিংক", icon: <Link className="h-4 w-4" />, category: "layout" },
  { type: "footer", label: "ফুটার", icon: <AlignCenter className="h-4 w-4" />, category: "layout" },
  // Products
  { type: "product_grid", label: "📚 বই গ্রিড", icon: <BookOpen className="h-4 w-4" />, category: "products" },
  { type: "ebook_grid", label: "📱 ইবুক গ্রিড", icon: <FileText className="h-4 w-4" />, category: "products" },
  { type: "universal_grid", label: "🛍️ ইউনিভার্সাল গ্রিড", icon: <Package className="h-4 w-4" />, category: "products" },
  { type: "category_grid", label: "ক্যাটাগরি গ্রিড", icon: <LayoutGrid className="h-4 w-4" />, category: "products" },
  { type: "brand_showcase", label: "ব্র্যান্ড শোকেস", icon: <Award className="h-4 w-4" />, category: "products" },
  // Dynamic
  { type: "coupon_box", label: "কুপন বক্স", icon: <Gift className="h-4 w-4" />, category: "dynamic" },
  { type: "countdown", label: "কাউন্টডাউন", icon: <Timer className="h-4 w-4" />, category: "dynamic" },
  { type: "testimonial", label: "টেস্টিমোনিয়াল", icon: <MessageSquare className="h-4 w-4" />, category: "dynamic" },
  { type: "rating_block", label: "রেটিং ব্লক", icon: <Star className="h-4 w-4" />, category: "dynamic" },
  { type: "stats_row", label: "পরিসংখ্যান", icon: <TrendingUp className="h-4 w-4" />, category: "dynamic" },
  { type: "feature_list", label: "ফিচার লিস্ট", icon: <Tag className="h-4 w-4" />, category: "dynamic" },
  { type: "video_embed", label: "ভিডিও থাম্বনেইল", icon: <Play className="h-4 w-4" />, category: "dynamic" },
  { type: "faq_block", label: "FAQ", icon: <MessageSquare className="h-4 w-4" />, category: "dynamic" },
  { type: "price_table", label: "প্রাইস টেবিল", icon: <Tag className="h-4 w-4" />, category: "dynamic" },
  // Alibaba/AliExpress Dynamic
  { type: "trust_badges", label: "🛡️ ট্রাস্ট ব্যাজ", icon: <Award className="h-4 w-4" />, category: "dynamic" },
  { type: "urgency_bar", label: "🔥 আর্জেন্সি বার", icon: <TrendingUp className="h-4 w-4" />, category: "dynamic" },
  { type: "multi_banner", label: "🎯 মাল্টি ব্যানার", icon: <LayoutGrid className="h-4 w-4" />, category: "layout" },
  { type: "progress_bar", label: "📊 প্রোগ্রেস বার", icon: <TrendingUp className="h-4 w-4" />, category: "dynamic" },
  { type: "order_summary", label: "📦 অর্ডার সামারি", icon: <Package className="h-4 w-4" />, category: "dynamic" },
  { type: "personalized_header", label: "👤 পার্সোনাল হেডার", icon: <Users className="h-4 w-4" />, category: "dynamic" },
  { type: "deal_grid", label: "💰 ডিল গ্রিড", icon: <Percent className="h-4 w-4" />, category: "dynamic" },
];

const GRADIENT_PRESETS = [
  { name: "ইন্ডিগো", value: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" },
  { name: "রেড ফায়ার", value: "linear-gradient(135deg,#ff4757 0%,#ff6b81 100%)" },
  { name: "গ্রিন", value: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)" },
  { name: "ওশান", value: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" },
  { name: "ডার্ক নাইট", value: "linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)" },
  { name: "পিংক", value: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)" },
  { name: "স্কাই ব্লু", value: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)" },
  { name: "ডার্ক গ্রে", value: "linear-gradient(135deg,#232526 0%,#414345 100%)" },
  { name: "সানসেট", value: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)" },
  { name: "গোল্ড", value: "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)" },
  { name: "রোজ", value: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)" },
  { name: "পার্পল ড্রিম", value: "linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)" },
];

const PRESET_TEMPLATES = [
  {
    id: "modern-promo", name: "মডার্ন প্রোমো", icon: "🎯", description: "সব প্রোডাক্ট", color: "#667eea",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "{{shop_name}}", subtitle: "সেরা অফার এখানে!", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", showLogo: true }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
      { id: "1b", type: "stats_row" as BlockType, content: { items: [{ value: "5000+", label: "প্রোডাক্ট" }, { value: "50K+", label: "হ্যাপি কাস্টমার" }, { value: "24/7", label: "সাপোর্ট" }] }, settings: { padding: "20px 30px", backgroundColor: "#f8f9ff" } },
      { id: "2", type: "header" as BlockType, content: { text: "📚 সেরা বই কালেকশন", level: "h2" }, settings: { padding: "30px 30px 10px", alignment: "center" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "4", type: "cta_section" as BlockType, content: { title: "আরও বই দেখুন", subtitle: "হাজারো বই থেকে বেছে নিন", buttonText: "শপে যান →", buttonUrl: "#", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "0" } },
      { id: "5", type: "header" as BlockType, content: { text: "📱 ই-বুক কালেকশন", level: "h2" }, settings: { padding: "30px 30px 10px", alignment: "center" as const } },
      { id: "6", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "7", type: "header" as BlockType, content: { text: "🛍️ লাইফস্টাইল প্রোডাক্ট", level: "h2" }, settings: { padding: "30px 30px 10px", alignment: "center" as const } },
      { id: "8", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "9", type: "testimonial" as BlockType, content: { name: "রহিম আহমেদ", text: "অসাধারণ সার্ভিস এবং প্রোডাক্ট কোয়ালিটি! বারবার কিনব।", rating: 5, avatar: "" }, settings: { padding: "20px 30px" } },
      { id: "10", type: "social_links" as BlockType, content: { facebook: "#", instagram: "#", youtube: "#" }, settings: { padding: "15px 30px", alignment: "center" as const } },
      { id: "11", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}. সকল অধিকার সংরক্ষিত।", address: "ঢাকা, বাংলাদেশ", phone: "01XXXXXXXXX", unsubscribe: true }, settings: { padding: "30px", backgroundColor: "#1a1a2e", textColor: "#999" } },
    ]
  },
  {
    id: "flash-sale", name: "ফ্ল্যাশ সেল", icon: "⚡", description: "সীমিত অফার", color: "#ff4757",
    blocks: [
      { id: "1", type: "banner_strip" as BlockType, content: { text: "⏰ সীমিত সময়ের অফার — মিস করবেন না!", bgColor: "#ff4757" }, settings: { padding: "12px 20px" } },
      { id: "2", type: "hero_banner" as BlockType, content: { title: "⚡ মেগা ফ্ল্যাশ সেল ⚡", subtitle: "৭০% পর্যন্ত ছাড়!", bgGradient: "linear-gradient(135deg,#ff4757 0%,#c44569 100%)" }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
      { id: "3", type: "countdown" as BlockType, content: { endDate: "2026-04-01", title: "অফার শেষ হচ্ছে" }, settings: { padding: "20px 30px", backgroundColor: "#fff8f8" } },
      { id: "4", type: "coupon_box" as BlockType, content: { code: "FLASH70", discount: "70%", description: "সকল বই ও প্রোডাক্টে", bgGradient: "linear-gradient(135deg,#ff4757,#c44569)" }, settings: { padding: "15px 30px" } },
      { id: "5", type: "header" as BlockType, content: { text: "🔥 হট ডিলস — বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "6", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "sale" }, settings: { padding: "10px 30px" } },
      { id: "7", type: "header" as BlockType, content: { text: "📱 ইবুক অফার", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "8", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "9", type: "header" as BlockType, content: { text: "🛍️ লাইফস্টাইল সেল", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "10", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "11", type: "button" as BlockType, content: { text: "সব অফার দেখুন →", url: "#", bgColor: "#ff4757" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "12", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#2f3542", textColor: "#999" } },
    ]
  },
  {
    id: "ebook-special", name: "ইবুক স্পেশাল", icon: "📱", description: "ডিজিটাল প্রোডাক্ট", color: "#2193b0",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "📱 ডিজিটাল লাইব্রেরি", subtitle: "হাজারো ইবুক — যেকোনো ডিভাইসে পড়ুন", bgGradient: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
      { id: "2", type: "feature_list" as BlockType, content: { items: ["📥 তাৎক্ষণিক ডাউনলোড", "📄 PDF, EPUB ফরম্যাট", "📱 মোবাইল ফ্রেন্ডলি", "🌐 অফলাইনে পড়ুন"], iconStyle: "emoji" }, settings: { padding: "20px 30px", backgroundColor: "#f0f9ff" } },
      { id: "3", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "4", type: "stats_row" as BlockType, content: { items: [{ value: "1000+", label: "ইবুক" }, { value: "50+", label: "ক্যাটাগরি" }, { value: "Free", label: "কিছু ফ্রি" }] }, settings: { padding: "20px 30px", backgroundColor: "#e0f7fa" } },
      { id: "5", type: "rating_block" as BlockType, content: { rating: 4.8, totalReviews: "2,500+", text: "আমাদের গ্রাহকদের গড় রেটিং" }, settings: { padding: "20px 30px" } },
      { id: "6", type: "cta_section" as BlockType, content: { title: "ইবুক শপে যান", subtitle: "নতুন ইবুক প্রতিদিন", buttonText: "ইবুক দেখুন →", buttonUrl: "#", bgGradient: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" }, settings: { padding: "0" } },
      { id: "7", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f0f9ff" } },
    ]
  },
  {
    id: "newsletter", name: "উইকলি নিউজলেটার", icon: "📰", description: "সাপ্তাহিক আপডেট", color: "#333",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "📰 সাপ্তাহিক আপডেট", subtitle: "এই সপ্তাহের সেরা বই, ইবুক ও অফার", bgGradient: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "image_text" as BlockType, content: { imageUrl: "", title: "📖 এডিটরস পিক", text: "এই সপ্তাহের সেরা বইটি পড়ে দেখুন — হাজারো পাঠকের পছন্দ।", buttonText: "দেখুন →", buttonUrl: "#" }, settings: { padding: "20px 30px" } },
      { id: "3", type: "header" as BlockType, content: { text: "📚 নতুন বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "4", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "5", type: "header" as BlockType, content: { text: "📱 নতুন ইবুক", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "6", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "7", type: "header" as BlockType, content: { text: "🛍️ ট্রেন্ডিং প্রোডাক্ট", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "8", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "9", type: "category_grid" as BlockType, content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
      { id: "10", type: "social_links" as BlockType, content: { facebook: "#", instagram: "#", youtube: "#" }, settings: { padding: "15px 30px", alignment: "center" as const } },
      { id: "11", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", address: "ঢাকা, বাংলাদেশ", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "#999" } },
    ]
  },
  {
    id: "eid-offer", name: "ঈদ অফার", icon: "🌙", description: "ঈদ স্পেশাল", color: "#e2b714",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🌙 ঈদ মোবারক!", subtitle: "ঈদ স্পেশাল ছাড় সকল প্রোডাক্টে", bgGradient: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }, settings: { padding: "60px 30px", textColor: "#e2b714" } },
      { id: "2", type: "countdown" as BlockType, content: { endDate: "2026-04-01", title: "ঈদ অফার শেষ হচ্ছে" }, settings: { padding: "20px 30px", backgroundColor: "#0f3460" } },
      { id: "3", type: "coupon_box" as BlockType, content: { code: "EID2026", discount: "30%", description: "সকল বই ও প্রোডাক্টে", bgGradient: "linear-gradient(135deg,#e2b714,#f7971e)" }, settings: { padding: "15px 30px" } },
      { id: "4", type: "header" as BlockType, content: { text: "📚 ঈদ স্পেশাল বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "5", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "6", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "7", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "8", type: "button" as BlockType, content: { text: "ঈদ অফার দেখুন →", url: "#", bgColor: "#e2b714", textColor: "#1a1a2e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "9", type: "footer" as BlockType, content: { text: "ঈদ মোবারক! © 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "rgba(255,255,255,0.5)" } },
    ]
  },
  {
    id: "universal-showcase", name: "প্রোডাক্ট শোকেস", icon: "🛍️", description: "সব প্রোডাক্ট", color: "#11998e",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🛍️ নতুন কালেকশন", subtitle: "বই, ইবুক, স্টেশনারি, লাইফস্টাইল ও আরও অনেক কিছু", bgGradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)" }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
      { id: "2", type: "brand_showcase" as BlockType, content: { title: "আমাদের বিশ্বস্ত ব্র্যান্ড", brands: ["ব্র্যান্ড ১", "ব্র্যান্ড ২", "ব্র্যান্ড ৩", "ব্র্যান্ড ৪"] }, settings: { padding: "20px 30px", backgroundColor: "#f0fff4" } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "4", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "5", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "6", type: "testimonial" as BlockType, content: { name: "রহিম আহমেদ", text: "দারুণ প্রোডাক্ট! খুবই ভালো মানের।", rating: 5, avatar: "" }, settings: { padding: "15px 30px" } },
      { id: "7", type: "cta_section" as BlockType, content: { title: "এখনই শপিং শুরু করুন", subtitle: "সীমিত স্টক — দ্রুত অর্ডার করুন", buttonText: "শপে যান →", buttonUrl: "#", bgGradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)" }, settings: { padding: "0" } },
      { id: "8", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", address: "ঢাকা, বাংলাদেশ", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "#999" } },
    ]
  },
  {
    id: "welcome-email", name: "ওয়েলকাম ইমেইল", icon: "👋", description: "নতুন কাস্টমার", color: "#6c5ce7",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "👋 স্বাগতম!", subtitle: "{{shop_name}}-এ আপনাকে পেয়ে আমরা আনন্দিত", bgGradient: "linear-gradient(135deg,#6c5ce7 0%,#a29bfe 100%)" }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "প্রিয় {{name}},\n\nআমাদের পরিবারে যোগ দেওয়ার জন্য ধন্যবাদ! আপনার প্রথম অর্ডারে বিশেষ ছাড় পাচ্ছেন।" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "coupon_box" as BlockType, content: { code: "WELCOME20", discount: "20%", description: "প্রথম অর্ডারে", bgGradient: "linear-gradient(135deg,#6c5ce7,#a29bfe)" }, settings: { padding: "15px 30px" } },
      { id: "4", type: "feature_list" as BlockType, content: { items: ["🚚 ফ্রি ডেলিভারি ঢাকায়", "🔄 ইজি রিটার্ন পলিসি", "💳 ক্যাশ অন ডেলিভারি", "📞 ২৪/৭ কাস্টমার সাপোর্ট"], iconStyle: "emoji" }, settings: { padding: "20px 30px", backgroundColor: "#f8f7ff" } },
      { id: "5", type: "header" as BlockType, content: { text: "🌟 আমাদের বেস্টসেলার", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "6", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "7", type: "button" as BlockType, content: { text: "শপিং শুরু করুন →", url: "#", bgColor: "#6c5ce7" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "8", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#f8f7ff" } },
    ]
  },
  {
    id: "abandoned-cart", name: "কার্ট রিমাইন্ডার", icon: "🛒", description: "পরিত্যক্ত কার্ট", color: "#e17055",
    blocks: [
      { id: "1", type: "hero_banner" as BlockType, content: { title: "🛒 আপনার কার্ট অপেক্ষায় আছে!", subtitle: "কিছু আইটেম রেখে গেছেন...", bgGradient: "linear-gradient(135deg,#e17055 0%,#d63031 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "প্রিয় {{name}}, আপনি কিছু দুর্দান্ত প্রোডাক্ট কার্টে রেখে গেছেন। স্টক সীমিত — এখনই অর্ডার করুন!" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "coupon_box" as BlockType, content: { code: "COMEBACK15", discount: "15%", description: "শুধু আপনার জন্য", bgGradient: "linear-gradient(135deg,#e17055,#d63031)" }, settings: { padding: "15px 30px" } },
      { id: "4", type: "button" as BlockType, content: { text: "কার্টে ফিরে যান →", url: "#", bgColor: "#e17055" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "5", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#fff5f5" } },
    ]
  },
  // ── Alibaba/AliExpress Inspired Professional Templates ──
  {
    id: "mega-sale-alibaba", name: "মেগা সেল", icon: "🔥", description: "Alibaba 11.11 স্টাইল", color: "#ff4500",
    blocks: [
      { id: "1", type: "urgency_bar" as BlockType, content: { text: "🔥 ২৪ ঘণ্টার মেগা সেল লাইভ!", subtext: "{{viewers}} জন এখন শপিং করছে", bgGradient: "linear-gradient(90deg,#ff4500,#ff6b35)", animated: true }, settings: { padding: "12px 20px" } },
      { id: "2", type: "hero_banner" as BlockType, content: { title: "🛒 মেগা সেল ফেস্টিভ্যাল", subtitle: "৮০% পর্যন্ত ছাড় — সব ক্যাটাগরিতে!", bgGradient: "linear-gradient(135deg,#ff4500 0%,#cc0000 50%,#8b0000 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "3", type: "countdown" as BlockType, content: { endDate: "2026-04-01", title: "সেল শেষ হচ্ছে" }, settings: { padding: "20px 30px", backgroundColor: "#1a1a1a" } },
      { id: "4", type: "multi_banner" as BlockType, content: { banners: [{ title: "📚 বই", subtitle: "৫০% ছাড়", bgGradient: "linear-gradient(135deg,#ff4500,#ff6b35)", url: "#" }, { title: "📱 ইবুক", subtitle: "BOGO ফ্রি", bgGradient: "linear-gradient(135deg,#e91e63,#f06292)", url: "#" }, { title: "🛍️ স্টেশনারি", subtitle: "৪০% ছাড়", bgGradient: "linear-gradient(135deg,#ff9800,#ffb74d)", url: "#" }, { title: "🎁 গিফট", subtitle: "ফ্রি শিপিং", bgGradient: "linear-gradient(135deg,#4caf50,#81c784)", url: "#" }] }, settings: { padding: "10px 20px" } },
      { id: "5", type: "deal_grid" as BlockType, content: { deals: [{ title: "সুপার ডিল #1", discount: "70%", originalPrice: "৳500", salePrice: "৳150", timeLeft: "2h 30m", sold: 85, total: 100 }, { title: "হট ডিল #2", discount: "60%", originalPrice: "৳800", salePrice: "৳320", timeLeft: "5h 15m", sold: 62, total: 100 }], style: "aliexpress" }, settings: { padding: "15px 20px" } },
      { id: "6", type: "header" as BlockType, content: { text: "⚡ ফ্ল্যাশ ডিলস — বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "7", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "sale" }, settings: { padding: "10px 30px" } },
      { id: "8", type: "progress_bar" as BlockType, content: { title: "🎯 সেল গোল", current: 78, target: 100, unit: "%", subtitle: "গোল পূর্ণ হলে সবার জন্য এক্সট্রা ১০% ছাড়!", bgColor: "#ff4500" }, settings: { padding: "20px 30px", backgroundColor: "#fff3e0" } },
      { id: "9", type: "trust_badges" as BlockType, content: { items: [{ icon: "🚚", title: "ফ্রি শিপিং", subtitle: "৳500+" }, { icon: "🔒", title: "সিকিউর", subtitle: "100%" }, { icon: "🔄", title: "ইজি রিটার্ন", subtitle: "7 দিন" }, { icon: "⭐", title: "রেটিং", subtitle: "4.9/5" }], style: "ali" }, settings: { padding: "16px 20px", backgroundColor: "#fff8f0" } },
      { id: "10", type: "coupon_box" as BlockType, content: { code: "MEGA80", discount: "৳200", description: "৳1000+ অর্ডারে", bgGradient: "linear-gradient(135deg,#ff4500,#cc0000)" }, settings: { padding: "15px 30px" } },
      { id: "11", type: "button" as BlockType, content: { text: "🛒 এখনই শপিং করুন →", url: "#", bgColor: "#ff4500" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "12", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}} | মেগা সেল ফেস্টিভ্যাল", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a1a", textColor: "#999" } },
    ]
  },
  {
    id: "daily-deals-ali", name: "ডেইলি ডিলস", icon: "💰", description: "AliExpress স্টাইল", color: "#e91e63",
    blocks: [
      { id: "1", type: "banner_strip" as BlockType, content: { text: "⏰ আজকের ডিল — মধ্যরাত পর্যন্ত!", bgColor: "#e91e63" }, settings: { padding: "12px 20px" } },
      { id: "2", type: "personalized_header" as BlockType, content: { greeting: "হ্যালো {{name}}! 👋", subtitle: "আজকের সেরা ডিলগুলো শুধু আপনার জন্য", avatar: "", bgGradient: "linear-gradient(135deg,#e91e63 0%,#f06292 100%)", showMemberBadge: true, memberLevel: "Gold" }, settings: { padding: "30px", textColor: "#ffffff" } },
      { id: "3", type: "deal_grid" as BlockType, content: { deals: [{ title: "ডিল অফ দ্য ডে", discount: "65%", originalPrice: "৳1200", salePrice: "৳420", timeLeft: "8h 45m", sold: 73, total: 100 }, { title: "লিমিটেড অফার", discount: "55%", originalPrice: "৳900", salePrice: "৳405", timeLeft: "4h 20m", sold: 55, total: 100 }], style: "aliexpress" }, settings: { padding: "15px 20px" } },
      { id: "4", type: "header" as BlockType, content: { text: "📚 আজকের বেস্ট বই ডিল", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "5", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "sale" }, settings: { padding: "10px 30px" } },
      { id: "6", type: "header" as BlockType, content: { text: "📱 ইবুক ডিলস", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "7", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "8", type: "urgency_bar" as BlockType, content: { text: "⚠️ স্টক সীমিত!", subtext: "দ্রুত অর্ডার করুন — প্রতিটি ডিলে সীমিত পরিমাণ", bgGradient: "linear-gradient(90deg,#ff6a00,#ee0979)", animated: true }, settings: { padding: "14px 20px" } },
      { id: "9", type: "trust_badges" as BlockType, content: { items: [{ icon: "✅", title: "অথেনটিক", subtitle: "100% আসল" }, { icon: "🚀", title: "ফাস্ট শিপিং", subtitle: "1-3 দিন" }, { icon: "💳", title: "COD", subtitle: "ক্যাশ অন ডেলিভারি" }, { icon: "🎁", title: "ফ্রি গিফট", subtitle: "৳1000+ এ" }], style: "ali" }, settings: { padding: "16px 20px", backgroundColor: "#fce4ec" } },
      { id: "10", type: "button" as BlockType, content: { text: "সব ডিল দেখুন →", url: "#", bgColor: "#e91e63" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "11", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "#999" } },
    ]
  },
  {
    id: "personalized-picks", name: "পার্সোনালাইজড", icon: "🎯", description: "AI রেকমেন্ডেশন", color: "#9c27b0",
    blocks: [
      { id: "1", type: "personalized_header" as BlockType, content: { greeting: "{{name}}, আপনার পছন্দের প্রোডাক্ট! 🎯", subtitle: "আপনার ব্রাউজিং হিস্ট্রি অনুযায়ী বাছাই করা", avatar: "", bgGradient: "linear-gradient(135deg,#9c27b0 0%,#e040fb 100%)", showMemberBadge: true, memberLevel: "Premium" }, settings: { padding: "30px", textColor: "#ffffff" } },
      { id: "2", type: "header" as BlockType, content: { text: "📚 আপনার জন্য বাছাই করা বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "3", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "4", type: "header" as BlockType, content: { text: "📱 আপনি এগুলো পছন্দ করবেন", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "5", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "6", type: "header" as BlockType, content: { text: "🛍️ ট্রেন্ডিং প্রোডাক্ট", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "left" as const } },
      { id: "7", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "8", type: "coupon_box" as BlockType, content: { code: "FORYOU25", discount: "25%", description: "শুধু আপনার জন্য — ৪৮ ঘণ্টা ভ্যালিড", bgGradient: "linear-gradient(135deg,#9c27b0,#e040fb)" }, settings: { padding: "15px 30px" } },
      { id: "9", type: "stats_row" as BlockType, content: { items: [{ value: "25%", label: "ডিসকাউন্ট" }, { value: "48h", label: "ভ্যালিড" }, { value: "∞", label: "ব্যবহার" }] }, settings: { padding: "20px 30px", backgroundColor: "#f3e5f5" } },
      { id: "10", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}} — AI-Powered রেকমেন্ডেশন", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "#999" } },
    ]
  },
  {
    id: "reengagement", name: "রি-এনগেজমেন্ট", icon: "💌", description: "Win-back ইমেইল", color: "#ff6f00",
    blocks: [
      { id: "1", type: "personalized_header" as BlockType, content: { greeting: "{{name}}, আমরা আপনাকে মিস করছি! 😢", subtitle: "অনেকদিন দেখা হয়নি — স্পেশাল অফার নিয়ে ফিরে আসুন", avatar: "", bgGradient: "linear-gradient(135deg,#ff6f00 0%,#ffab40 100%)", showMemberBadge: false, memberLevel: "" }, settings: { padding: "30px", textColor: "#ffffff" } },
      { id: "2", type: "text" as BlockType, content: { text: "প্রিয় {{name}},\n\nআপনি শেষবার কেনাকাটা করেছিলেন অনেকদিন আগে। আপনার জন্য একটি স্পেশাল ডিসকাউন্ট কোড রাখা হয়েছে!" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "3", type: "coupon_box" as BlockType, content: { code: "MISSYOU30", discount: "30%", description: "আপনার পরবর্তী অর্ডারে — ৭২ ঘণ্টা ভ্যালিড", bgGradient: "linear-gradient(135deg,#ff6f00,#ffab40)" }, settings: { padding: "15px 30px" } },
      { id: "4", type: "countdown" as BlockType, content: { endDate: "2026-03-12", title: "অফার এক্সপায়ার হচ্ছে" }, settings: { padding: "20px 30px", backgroundColor: "#fff8e1" } },
      { id: "5", type: "header" as BlockType, content: { text: "🔥 আপনি যা মিস করেছেন", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "6", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "7", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "8", type: "trust_badges" as BlockType, content: { items: [{ icon: "🚚", title: "ফ্রি শিপিং", subtitle: "আপনার অর্ডারে" }, { icon: "🎁", title: "ফ্রি গিফট", subtitle: "৳500+ এ" }, { icon: "🔄", title: "ইজি রিটার্ন", subtitle: "7 দিন" }, { icon: "💯", title: "গ্যারান্টি", subtitle: "মানি ব্যাক" }], style: "ali" }, settings: { padding: "16px 20px", backgroundColor: "#fff8e1" } },
      { id: "9", type: "button" as BlockType, content: { text: "এখনই ফিরে আসুন →", url: "#", bgColor: "#ff6f00" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "10", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}}", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#fff8e1" } },
    ]
  },
  {
    id: "new-arrivals-ali", name: "নতুন আগমন", icon: "✨", description: "New Arrivals শোকেস", color: "#00bcd4",
    blocks: [
      { id: "1", type: "banner_strip" as BlockType, content: { text: "✨ নতুন কালেকশন এসেছে — সবার আগে দেখুন!", bgColor: "#00bcd4" }, settings: { padding: "12px 20px" } },
      { id: "2", type: "hero_banner" as BlockType, content: { title: "✨ নতুন আগমন", subtitle: "এই সপ্তাহের ফ্রেশ কালেকশন", bgGradient: "linear-gradient(135deg,#00bcd4 0%,#00838f 100%)" }, settings: { padding: "50px 30px", textColor: "#ffffff" } },
      { id: "3", type: "multi_banner" as BlockType, content: { banners: [{ title: "📚 নতুন বই", subtitle: "এই সপ্তাহে", bgGradient: "linear-gradient(135deg,#00bcd4,#4dd0e1)", url: "#" }, { title: "📱 নতুন ইবুক", subtitle: "জাস্ট আপলোড", bgGradient: "linear-gradient(135deg,#009688,#4db6ac)", url: "#" }, { title: "🎨 স্টেশনারি", subtitle: "ফ্রেশ স্টক", bgGradient: "linear-gradient(135deg,#26c6da,#80deea)", url: "#" }, { title: "🎁 গিফট আইডিয়া", subtitle: "নতুন কালেকশন", bgGradient: "linear-gradient(135deg,#0097a7,#00bcd4)", url: "#" }] }, settings: { padding: "10px 20px" } },
      { id: "4", type: "header" as BlockType, content: { text: "📚 সদ্য প্রকাশিত বই", level: "h2" }, settings: { padding: "20px 30px 5px", alignment: "center" as const } },
      { id: "5", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
      { id: "6", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "7", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "8", type: "cta_section" as BlockType, content: { title: "সবার আগে পেতে চান?", subtitle: "আমাদের নোটিফিকেশন অন করুন!", buttonText: "শপে যান →", buttonUrl: "#", bgGradient: "linear-gradient(135deg,#00bcd4,#00838f)" }, settings: { padding: "0" } },
      { id: "9", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}} | নতুন আগমন", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#e0f7fa" } },
    ]
  },
  {
    id: "super-deal-ali", name: "সুপার ডিল", icon: "💎", description: "প্রিমিয়াম অফার", color: "#ffd700",
    blocks: [
      { id: "1", type: "urgency_bar" as BlockType, content: { text: "💎 VIP এক্সক্লুসিভ — শুধুমাত্র আজ!", subtext: "সীমিত সংখ্যক — দ্রুত গ্র্যাব করুন", bgGradient: "linear-gradient(90deg,#ffd700,#ff8c00)", animated: true }, settings: { padding: "14px 20px" } },
      { id: "2", type: "hero_banner" as BlockType, content: { title: "💎 সুপার ডিল ফেস্ট", subtitle: "এক্সক্লুসিভ প্রাইস — শুধু আজকের জন্য", bgGradient: "linear-gradient(135deg,#1a1a2e 0%,#2d1b69 50%,#44337a 100%)" }, settings: { padding: "50px 30px", textColor: "#ffd700" } },
      { id: "3", type: "deal_grid" as BlockType, content: { deals: [{ title: "💎 প্রিমিয়াম #1", discount: "75%", originalPrice: "৳2000", salePrice: "৳500", timeLeft: "3h 45m", sold: 92, total: 100 }, { title: "💎 প্রিমিয়াম #2", discount: "65%", originalPrice: "৳1500", salePrice: "৳525", timeLeft: "6h 10m", sold: 68, total: 100 }], style: "aliexpress" }, settings: { padding: "15px 20px" } },
      { id: "4", type: "product_grid" as BlockType, content: { productIds: [], columns: 2, cardStyle: "sale" }, settings: { padding: "10px 30px" } },
      { id: "5", type: "ebook_grid" as BlockType, content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "6", type: "universal_grid" as BlockType, content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
      { id: "7", type: "progress_bar" as BlockType, content: { title: "⏰ ডিল স্টক", current: 92, target: 100, unit: "%", subtitle: "৯২% বিক্রি হয়ে গেছে!", bgColor: "#ffd700" }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e" } },
      { id: "8", type: "coupon_box" as BlockType, content: { code: "SUPERDEAL", discount: "৳500", description: "৳2000+ অর্ডারে — VIP কাস্টমারদের জন্য", bgGradient: "linear-gradient(135deg,#ffd700,#ff8c00)" }, settings: { padding: "15px 30px" } },
      { id: "9", type: "trust_badges" as BlockType, content: { items: [{ icon: "👑", title: "VIP", subtitle: "এক্সক্লুসিভ" }, { icon: "🏆", title: "বেস্ট প্রাইস", subtitle: "গ্যারান্টি" }, { icon: "🚀", title: "এক্সপ্রেস", subtitle: "ডেলিভারি" }, { icon: "💎", title: "প্রিমিয়াম", subtitle: "কোয়ালিটি" }], style: "ali" }, settings: { padding: "16px 20px", backgroundColor: "#fff8e1" } },
      { id: "10", type: "button" as BlockType, content: { text: "💎 সুপার ডিল গ্র্যাব করুন →", url: "#", bgColor: "#ffd700", textColor: "#1a1a2e" }, settings: { padding: "20px 30px", alignment: "center" as const } },
      { id: "11", type: "footer" as BlockType, content: { text: "© 2026 {{shop_name}} | VIP সুপার ডিল", unsubscribe: true }, settings: { padding: "20px 30px", backgroundColor: "#1a1a2e", textColor: "#666" } },
    ]
  },
];

const genId = () => Math.random().toString(36).slice(2, 10);

const createDefaultBlock = (type: BlockType): EmailBlock => {
  const defaults: Record<BlockType, Partial<EmailBlock>> = {
    hero_banner: { content: { title: "আপনার শিরোনাম", subtitle: "সাবটাইটেল", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "60px 30px", textColor: "#ffffff" } },
    header: { content: { text: "হেডিং টেক্সট", level: "h2" }, settings: { padding: "15px 30px", alignment: "center" } },
    text: { content: { text: "আপনার টেক্সট এখানে লিখুন..." }, settings: { padding: "10px 30px" } },
    image: { content: { url: "", alt: "Image", width: "100%" }, settings: { padding: "10px 30px", alignment: "center" } },
    button: { content: { text: "বাটন টেক্সট", url: "#", bgColor: "#667eea", textColor: "#ffffff" }, settings: { padding: "15px 30px", alignment: "center", borderRadius: "30px" } },
    divider: { content: { color: "#eeeeee", thickness: "1", style: "solid" }, settings: { padding: "10px 30px" } },
    spacer: { content: { height: "30" }, settings: {} },
    product_grid: { content: { productIds: [], columns: 2, cardStyle: "modern" }, settings: { padding: "10px 30px" } },
    ebook_grid: { content: { ebookIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
    universal_grid: { content: { universalIds: [], columns: 2 }, settings: { padding: "10px 30px" } },
    category_grid: { content: { categoryIds: [] }, settings: { padding: "10px 30px" } },
    columns: { content: { left: "বাম কলাম", right: "ডান কলাম" }, settings: { padding: "10px 30px" } },
    social_links: { content: { facebook: "#", instagram: "#", youtube: "#", twitter: "", whatsapp: "" }, settings: { padding: "15px 30px", alignment: "center" } },
    footer: { content: { text: "© 2026 আপনার শপ। সকল অধিকার সংরক্ষিত।", address: "", phone: "", unsubscribe: true }, settings: { padding: "30px", backgroundColor: "#1a1a2e", textColor: "#999", alignment: "center" } },
    coupon_box: { content: { code: "SAVE20", discount: "20%", description: "সকল প্রোডাক্টে", bgGradient: "linear-gradient(135deg,#667eea,#764ba2)" }, settings: { padding: "15px 30px" } },
    testimonial: { content: { name: "গ্রাহকের নাম", text: "দারুণ সার্ভিস!", rating: 5, avatar: "" }, settings: { padding: "15px 30px" } },
    feature_list: { content: { items: ["ফিচার ১", "ফিচার ২", "ফিচার ৩"], iconStyle: "check" }, settings: { padding: "15px 30px" } },
    countdown: { content: { endDate: "2026-04-01", title: "অফার শেষ হচ্ছে" }, settings: { padding: "20px 30px", backgroundColor: "#fff8f8" } },
    video_embed: { content: { thumbnailUrl: "", videoUrl: "#", title: "ভিডিও দেখুন" }, settings: { padding: "15px 30px" } },
    banner_strip: { content: { text: "🔥 বিশেষ অফার চলছে!", bgColor: "#ff4757" }, settings: { padding: "12px 20px" } },
    rating_block: { content: { rating: 4.8, totalReviews: "2,500+", text: "গ্রাহকদের গড় রেটিং" }, settings: { padding: "20px 30px" } },
    stats_row: { content: { items: [{ value: "5000+", label: "প্রোডাক্ট" }, { value: "50K+", label: "কাস্টমার" }, { value: "24/7", label: "সাপোর্ট" }] }, settings: { padding: "20px 30px", backgroundColor: "#f8f9ff" } },
    cta_section: { content: { title: "এখনই শপিং শুরু করুন", subtitle: "হাজারো প্রোডাক্ট", buttonText: "শপে যান →", buttonUrl: "#", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }, settings: { padding: "0" } },
    image_text: { content: { imageUrl: "", title: "শিরোনাম", text: "বিবরণ লিখুন...", buttonText: "আরও দেখুন", buttonUrl: "#" }, settings: { padding: "20px 30px" } },
    price_table: { content: { plans: [{ name: "বেসিক", price: "৳199", features: ["5 বই", "1 মাস ভ্যালিড"] }, { name: "প্রিমিয়াম", price: "৳499", features: ["20 বই", "6 মাস ভ্যালিড"], highlighted: true }] }, settings: { padding: "20px 30px" } },
    faq_block: { content: { items: [{ q: "ডেলিভারি চার্জ কত?", a: "ঢাকায় ৳60, ঢাকার বাইরে ৳120" }, { q: "রিটার্ন পলিসি কী?", a: "7 দিনের মধ্যে রিটার্ন করতে পারবেন" }] }, settings: { padding: "20px 30px" } },
    brand_showcase: { content: { title: "বিশ্বস্ত ব্র্যান্ড", brands: ["ব্র্যান্ড ১", "ব্র্যান্ড ২", "ব্র্যান্ড ৩", "ব্র্যান্ড ৪"] }, settings: { padding: "20px 30px", backgroundColor: "#f8f9fa" } },
    trust_badges: { content: { items: [{ icon: "🚚", title: "ফ্রি শিপিং", subtitle: "৳500+ অর্ডারে" }, { icon: "🔒", title: "সিকিউর পেমেন্ট", subtitle: "100% নিরাপদ" }, { icon: "🔄", title: "ইজি রিটার্ন", subtitle: "7 দিনের মধ্যে" }, { icon: "💬", title: "24/7 সাপোর্ট", subtitle: "লাইভ চ্যাট" }], style: "ali" }, settings: { padding: "16px 20px", backgroundColor: "#fff8f0" } },
    urgency_bar: { content: { text: "🔥 {{viewers}} জন এখন দেখছে!", subtext: "শুধুমাত্র {{stock}} টি বাকি আছে — দ্রুত অর্ডার করুন!", bgGradient: "linear-gradient(90deg,#ff6a00,#ee0979)", animated: true }, settings: { padding: "14px 20px" } },
    multi_banner: { content: { banners: [{ title: "📚 বই ফেস্ট", subtitle: "৫০% পর্যন্ত ছাড়", bgGradient: "linear-gradient(135deg,#667eea,#764ba2)", url: "#" }, { title: "📱 ইবুক ডিল", subtitle: "২টি কিনলে ১টি ফ্রি", bgGradient: "linear-gradient(135deg,#ff4757,#c44569)", url: "#" }, { title: "🛍️ স্টেশনারি", subtitle: "নতুন কালেকশন", bgGradient: "linear-gradient(135deg,#11998e,#38ef7d)", url: "#" }, { title: "🎁 গিফট সেট", subtitle: "স্পেশাল প্যাকেজ", bgGradient: "linear-gradient(135deg,#f7971e,#ffd200)", url: "#" }] }, settings: { padding: "10px 20px" } },
    progress_bar: { content: { title: "🎯 সেল গোল প্রোগ্রেস", current: 78, target: 100, unit: "%", subtitle: "আর মাত্র ২২% বাকি! গোল পূর্ণ হলে এক্সট্রা ১০% ছাড়!", bgColor: "#ff4757" }, settings: { padding: "20px 30px", backgroundColor: "#fff5f5" } },
    order_summary: { content: { items: [{ name: "প্রোডাক্ট ১", qty: 1, price: "৳350" }, { name: "প্রোডাক্ট ২", qty: 2, price: "৳600" }], subtotal: "৳950", shipping: "৳60", total: "৳1010", orderNumber: "#ORD-2026-001" }, settings: { padding: "20px 30px" } },
    personalized_header: { content: { greeting: "হ্যালো {{name}}! 👋", subtitle: "আপনার জন্য বিশেষভাবে বাছাই করা অফার", avatar: "", bgGradient: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", showMemberBadge: true, memberLevel: "Gold" }, settings: { padding: "30px", textColor: "#ffffff" } },
    deal_grid: { content: { deals: [{ title: "সুপার ডিল", discount: "70%", originalPrice: "৳500", salePrice: "৳150", timeLeft: "2h 30m", sold: 85, total: 100 }, { title: "হট ডিল", discount: "50%", originalPrice: "৳800", salePrice: "৳400", timeLeft: "5h 15m", sold: 42, total: 100 }], style: "aliexpress" }, settings: { padding: "15px 20px" } },
  };
  const d = defaults[type] || {};
  return { id: genId(), type, content: d.content || {}, settings: d.settings || {} };
};

const siteUrl = "https://boialo.lovable.app";

// ── Professional HTML card generators ──
const productCardHtml = (p: any, style: string = "modern") => {
  const img = p.imageUrl || '';
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const discountBadge = hasDiscount
    ? `<div style="position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#ff4757,#c44569);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(255,71,87,0.3);">-${p.discount_percent || Math.round((1 - p.discountPrice / p.price) * 100)}%</div>`
    : '';

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.08);position:relative;border:1px solid #f0f0f0;">
      ${discountBadge}
      ${img ? `<img src="${img}" alt="${p.title}" style="width:100%;height:200px;object-fit:cover;display:block;" />` : `<div style="height:200px;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);text-align:center;line-height:200px;font-size:48px;">📚</div>`}
      <div style="padding:16px;">
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 6px;font-weight:700;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.title}</p>
        ${p.author ? `<p style="font-size:12px;color:#999;margin:0 0 10px;">✍️ ${p.author}</p>` : ''}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="color:#e53e3e;font-weight:800;font-size:18px;">৳${hasDiscount ? p.discountPrice : p.price}</span>
          ${hasDiscount ? `<span style="color:#bbb;text-decoration:line-through;font-size:13px;">৳${p.price}</span>` : ''}
        </div>
        <a href="${p.link}" style="display:block;background:${style === 'sale' ? 'linear-gradient(135deg,#ff4757,#c44569)' : 'linear-gradient(135deg,#667eea,#764ba2)'};color:#fff;padding:10px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;text-align:center;box-shadow:0 4px 12px rgba(102,126,234,0.3);">🛒 অর্ডার করুন</a>
      </div>
    </div>
  </td>`;
};

const ebookCardHtml = (eb: any) => {
  const hasDiscount = eb.discount_percent && eb.discount_percent > 0;
  const salePrice = hasDiscount ? Math.round(eb.price * (1 - eb.discount_percent / 100)) : null;
  const formatBadge = eb.file_format ? `<span style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;backdrop-filter:blur(4px);">${eb.file_format}</span>` : '';
  const discountBadge = hasDiscount ? `<span style="position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#ff4757,#c44569);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(255,71,87,0.3);">-${eb.discount_percent}%</span>` : '';
  const img = eb.cover_image || '';
  const isFree = eb.is_free;

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.08);position:relative;border:1px solid #f0f0f0;">
      ${discountBadge}${formatBadge}
      ${isFree ? `<div style="position:absolute;top:${hasDiscount ? '40' : '10'}px;left:10px;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;">FREE</div>` : ''}
      ${img ? `<img src="${img}" alt="${eb.title_bn}" style="width:100%;height:200px;object-fit:cover;display:block;" />` : `<div style="height:200px;background:linear-gradient(135deg,#e0f2fe,#bae6fd);text-align:center;line-height:200px;font-size:48px;">📱</div>`}
      <div style="padding:16px;">
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 6px;font-weight:700;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${eb.title_bn}</p>
        <div style="display:flex;align-items:center;gap:8px;margin:8px 0 12px;">
          ${isFree ? `<span style="color:#11998e;font-weight:800;font-size:16px;">ফ্রি ✨</span>` : `<span style="color:#2193b0;font-weight:800;font-size:18px;">৳${salePrice || eb.price}</span>${salePrice ? `<span style="color:#bbb;text-decoration:line-through;font-size:13px;">৳${eb.price}</span>` : ''}`}
        </div>
        <a href="${siteUrl}/ebooks/${eb.slug}" style="display:block;background:linear-gradient(135deg,#2193b0,#6dd5ed);color:#fff;padding:10px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;text-align:center;box-shadow:0 4px 12px rgba(33,147,176,0.3);">${isFree ? '📥 ফ্রিতে পড়ুন' : '🛒 এখনই কিনুন'}</a>
      </div>
    </div>
  </td>`;
};

const universalCardHtml = (up: any) => {
  const hasDiscount = up.discount_percent && up.discount_percent > 0;
  const salePrice = hasDiscount ? Math.round(up.price * (1 - up.discount_percent / 100)) : null;
  const imgs = Array.isArray(up.images) ? up.images : [];
  const img = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
  const discountBadge = hasDiscount ? `<span style="position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#ff4757,#c44569);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(255,71,87,0.3);">-${up.discount_percent}%</span>` : '';
  const typeBadge = up.product_type ? `<span style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;padding:3px 8px;border-radius:20px;backdrop-filter:blur(4px);">${up.product_type}</span>` : '';

  return `<td style="width:50%;padding:8px;vertical-align:top;">
    <div style="border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.08);position:relative;border:1px solid #f0f0f0;">
      ${discountBadge}${typeBadge}
      ${img ? `<img src="${img}" alt="${up.name_bn}" style="width:100%;height:200px;object-fit:cover;display:block;" />` : `<div style="height:200px;background:linear-gradient(135deg,#ffecd2,#fcb69f);text-align:center;line-height:200px;font-size:48px;">🛍️</div>`}
      <div style="padding:16px;">
        <p style="font-size:14px;color:#1a1a1a;margin:0 0 6px;font-weight:700;line-height:1.4;">${up.name_bn}</p>
        ${up.brand_name ? `<p style="font-size:12px;color:#999;margin:0 0 8px;">🏷️ ${up.brand_name}</p>` : ''}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="color:#11998e;font-weight:800;font-size:18px;">৳${salePrice || up.price}</span>
          ${salePrice ? `<span style="color:#bbb;text-decoration:line-through;font-size:13px;">৳${up.price}</span>` : ''}
        </div>
        <a href="${siteUrl}/universal-product/${up.slug}" style="display:block;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;padding:10px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;text-align:center;box-shadow:0 4px 12px rgba(17,153,142,0.3);">🛒 অর্ডার করুন</a>
      </div>
    </div>
  </td>`;
};

const starsHtml = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) s += '⭐';
    else if (i === full && half) s += '⭐';
    else s += '<span style="opacity:0.25;">⭐</span>';
  }
  return s;
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
  const [presetTab, setPresetTab] = useState("all");
  const [history, setHistory] = useState<EmailBlock[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Fetch books
  const { data: products = [] } = useQuery({
    queryKey: ['email-builder-products', productSearch],
    queryFn: async () => {
      let query = supabase.from('products').select('id, title_bn, title_en, slug, price, discount_percent, original_price, images, writer_name').eq('is_active', true).limit(30);
      if (productSearch) query = query.ilike('title_bn', `%${productSearch}%`);
      const { data } = await query;
      return (data || []).map((p: any) => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const imageUrl = (imgs[0] as any)?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
        const discountPrice = p.discount_percent ? Math.round(p.price * (1 - p.discount_percent / 100)) : null;
        return { ...p, imageUrl, discountPrice, title: p.title_bn, author: p.writer_name, link: `${siteUrl}/product/${p.slug}` };
      });
    }
  });

  // Fetch ebooks
  const { data: ebooks = [] } = useQuery({
    queryKey: ['email-builder-ebooks', ebookSearch],
    queryFn: async () => {
      let query = supabase.from('digital_products').select('id, title_bn, slug, price, discount_percent, original_price, cover_image, file_format, is_free, product_type').eq('is_active', true).limit(30);
      if (ebookSearch) query = query.ilike('title_bn', `%${ebookSearch}%`);
      const { data } = await query;
      return data || [];
    }
  });

  // Fetch universal products
  const { data: universalProducts = [] } = useQuery({
    queryKey: ['email-builder-universal', universalSearch],
    queryFn: async () => {
      let query = supabase.from('universal_products').select('id, name_bn, slug, price, discount_percent, original_price, images, product_type').eq('is_active', true).limit(30);
      if (universalSearch) query = query.ilike('name_bn', `%${universalSearch}%`);
      const { data } = await query;
      return (data || []).map((p: any) => {
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
      let query = supabase.from('categories').select('id, name_bn, slug, image_url').eq('is_active', true).limit(30);
      if (categorySearch) query = query.ilike('name_bn', `%${categorySearch}%`);
      const { data } = await query;
      return data || [];
    }
  });

  useEffect(() => {
    onHtmlChange(blocksToHtml(blocks));
  }, [blocks]);

  const pushHistory = useCallback((newBlocks: EmailBlock[]) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), newBlocks].slice(-30));
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(prev => prev - 1);
      setBlocks(history[historyIdx - 1]);
    }
  };
  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(prev => prev + 1);
      setBlocks(history[historyIdx + 1]);
    }
  };

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
      pushHistory(next);
      return next;
    });
    setSelectedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => { const n = prev.filter(b => b.id !== id); pushHistory(n); return n; });
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
    const newBlocks = template.blocks.map(b => ({ ...b, id: genId() }));
    setBlocks(newBlocks);
    pushHistory(newBlocks);
    setSelectedBlockId(null);
    toast.success(`"${template.name}" টেমপ্লেট লোড হয়েছে`);
  };

  // ── HTML Generation ──
  const blockToHtml = (block: EmailBlock): string => {
    const { content: c, settings: s } = block;
    const pad = s.padding || "0";
    const bgCol = s.backgroundColor || "transparent";
    const txtCol = s.textColor || "#333333";
    const align = s.alignment || "left";

    switch (block.type) {
      case "hero_banner":
        return `<div style="background:${c.bgGradient || '#667eea'};padding:${pad};text-align:center;">
  <h1 style="color:${txtCol};font-size:32px;margin:0 0 12px;font-weight:900;letter-spacing:-0.5px;line-height:1.2;">${c.title || ''}</h1>
  <p style="color:${txtCol};opacity:0.9;font-size:17px;margin:0;font-weight:400;line-height:1.5;">${c.subtitle || ''}</p>
</div>`;
      case "header": {
        const tag = c.level || "h2";
        const sizes: Record<string, string> = { h1: "28px", h2: "24px", h3: "20px" };
        const borders: Record<string, string> = { h1: "", h2: "border-bottom:3px solid #667eea;padding-bottom:10px;display:inline-block;", h3: "" };
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};"><${tag} style="color:${txtCol};font-size:${sizes[tag] || '24px'};margin:0;font-weight:800;${borders[tag] || ''}">${c.text || ''}</${tag}></div>`;
      }
      case "text":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};"><p style="color:${txtCol};font-size:15px;line-height:1.8;margin:0;white-space:pre-line;">${c.text || ''}</p></div>`;
      case "image":
        return `<div style="padding:${pad};text-align:${align};"><img src="${c.url || '/placeholder.svg'}" alt="${c.alt || ''}" style="max-width:${c.width || '100%'};border-radius:${s.borderRadius || '12px'};box-shadow:0 4px 20px rgba(0,0,0,0.1);" /></div>`;
      case "button": {
        const btnBg = c.bgColor || "#667eea";
        const btnTxt = c.textColor || "#ffffff";
        return `<div style="padding:${pad};text-align:${align};"><a href="${c.url || '#'}" style="display:inline-block;background:${btnBg};color:${btnTxt};padding:16px 48px;border-radius:${s.borderRadius || '30px'};text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 4px 15px rgba(0,0,0,0.15);letter-spacing:0.5px;">${c.text || 'বাটন'}</a></div>`;
      }
      case "divider":
        return `<div style="padding:${pad};"><hr style="border:none;border-top:${c.thickness || '1'}px ${c.style || 'solid'} ${c.color || '#eeeeee'};margin:0;" /></div>`;
      case "spacer":
        return `<div style="height:${c.height || '30'}px;"></div>`;

      case "product_grid": {
        const sel = products.filter(p => (c.productIds || []).includes(p.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;padding:30px;">📚 বই সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${productCardHtml(sel[i], c.cardStyle)}${sel[i + 1] ? productCardHtml(sel[i + 1], c.cardStyle) : '<td style="width:50%;"></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "ebook_grid": {
        const sel = ebooks.filter(eb => (c.ebookIds || []).includes(eb.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;padding:30px;">📱 ইবুক সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${ebookCardHtml(sel[i])}${sel[i + 1] ? ebookCardHtml(sel[i + 1]) : '<td style="width:50%;"></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "universal_grid": {
        const sel = universalProducts.filter(up => (c.universalIds || []).includes(up.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;padding:30px;">🛍️ প্রোডাক্ট সিলেক্ট করুন</div>`;
        const rows = [];
        for (let i = 0; i < sel.length; i += 2) {
          rows.push(`<tr>${universalCardHtml(sel[i])}${sel[i + 1] ? universalCardHtml(sel[i + 1]) : '<td style="width:50%;"></td>'}</tr>`);
        }
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;">${rows.join('')}</table></div>`;
      }

      case "category_grid": {
        const sel = categories.filter(ct => (c.categoryIds || []).includes(ct.id));
        if (sel.length === 0) return `<div style="padding:${pad};text-align:center;color:#999;font-size:13px;padding:30px;">ক্যাটাগরি সিলেক্ট করুন</div>`;
        const colW = Math.floor(100 / Math.min(sel.length, 4));
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr>${sel.map((ct, i) => {
          const card = `<td style="width:${colW}%;padding:8px;text-align:center;vertical-align:top;"><a href="${siteUrl}/category/${ct.slug}" style="text-decoration:none;">${ct.image_url ? `<img src="${ct.image_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;border:3px solid #f0f0f0;box-shadow:0 2px 10px rgba(0,0,0,0.08);" />` : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);margin:0 auto;line-height:80px;font-size:30px;">📂</div>`}<p style="color:#333;font-size:13px;margin-top:10px;font-weight:700;">${ct.name_bn}</p></a></td>`;
          return card + ((i % 4 === 3 && i < sel.length - 1) ? '</tr><tr>' : '');
        }).join('')}</tr></table></div>`;
      }

      case "coupon_box":
        return `<div style="padding:${pad};"><div style="border:2px dashed rgba(102,126,234,0.4);border-radius:20px;padding:30px;text-align:center;background:linear-gradient(135deg,#f8f9ff,#eef0ff);position:relative;overflow:hidden;">
  <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:rgba(102,126,234,0.08);border-radius:50%;"></div>
  <div style="position:absolute;bottom:-30px;left:-30px;width:100px;height:100px;background:rgba(102,126,234,0.06);border-radius:50%;"></div>
  <p style="font-size:14px;color:#666;margin:0 0 12px;letter-spacing:0.5px;">${c.description || ''}</p>
  <div style="background:${c.bgGradient || 'linear-gradient(135deg,#667eea,#764ba2)'};color:#fff;display:inline-block;padding:14px 44px;border-radius:12px;font-size:24px;font-weight:900;letter-spacing:5px;box-shadow:0 4px 20px rgba(102,126,234,0.3);">${c.code || 'CODE'}</div>
  <p style="font-size:32px;font-weight:900;background:${c.bgGradient || 'linear-gradient(135deg,#667eea,#764ba2)'};-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:14px 0 0;">${c.discount || ''} ছাড়</p>
</div></div>`;

      case "testimonial": {
        const stars = c.rating ? starsHtml(c.rating) : '';
        return `<div style="padding:${pad};"><div style="background:linear-gradient(135deg,#f8f9fa,#fff);border-radius:20px;padding:28px;text-align:center;border:1px solid #f0f0f0;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
  ${stars ? `<div style="margin-bottom:12px;font-size:18px;">${stars}</div>` : ''}
  <p style="font-size:16px;color:#444;margin:0 0 16px;font-style:italic;line-height:1.7;">"${c.text || ''}"</p>
  <div style="width:40px;height:2px;background:linear-gradient(90deg,#667eea,#764ba2);margin:0 auto 12px;border-radius:2px;"></div>
  <p style="font-size:14px;color:#333;margin:0;font-weight:700;">— ${c.name || ''}</p>
</div></div>`;
      }

      case "feature_list": {
        const items = c.items || [];
        const useEmoji = c.iconStyle === "emoji";
        return `<div style="padding:${pad};background:${bgCol};"><table style="width:100%;border-collapse:collapse;">${items.map((item: string) => {
          const hasEmoji = /^\p{Emoji}/u.test(item);
          const icon = useEmoji || hasEmoji ? '' : `<span style="display:inline-block;width:26px;height:26px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:50%;text-align:center;line-height:26px;font-size:12px;margin-right:12px;box-shadow:0 2px 6px rgba(102,126,234,0.3);">✓</span>`;
          return `<tr><td style="padding:8px 0;font-size:14px;color:#444;line-height:1.6;">${icon}${item}</td></tr>`;
        }).join('')}</table></div>`;
      }

      case "countdown":
        return `<div style="padding:${pad};background:${bgCol};text-align:center;">
  <p style="color:${s.textColor || '#666'};font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${c.title || 'অফার শেষ হচ্ছে'}</p>
  <table style="margin:0 auto;border-collapse:collapse;"><tr>
    ${['দিন', 'ঘণ্টা', 'মিনিট', 'সেকেন্ড'].map((l, i) => `<td style="padding:0 6px;text-align:center;"><div style="background:linear-gradient(135deg,#ff4757,#c44569);color:#fff;width:64px;height:64px;border-radius:14px;display:table-cell;vertical-align:middle;text-align:center;font-size:28px;font-weight:900;box-shadow:0 4px 15px rgba(255,71,87,0.25);">${['00', '00', '00', '00'][i]}</div><p style="font-size:10px;color:#999;margin:6px 0 0;font-weight:600;">${l}</p></td>`).join('')}
  </tr></table>
  <p style="color:#999;font-size:11px;margin:12px 0 0;">⏰ ${c.endDate || ''} পর্যন্ত</p>
</div>`;

      case "video_embed":
        return `<div style="padding:${pad};text-align:center;">
  <div style="position:relative;display:inline-block;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
    ${c.thumbnailUrl ? `<img src="${c.thumbnailUrl}" style="width:100%;max-width:520px;display:block;" />` : `<div style="width:520px;max-width:100%;height:300px;background:linear-gradient(135deg,#1a1a2e,#0f3460);"></div>`}
    <a href="${c.videoUrl || '#'}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;background:rgba(255,255,255,0.95);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);text-decoration:none;">
      <div style="width:0;height:0;border-left:22px solid #ff4757;border-top:14px solid transparent;border-bottom:14px solid transparent;margin-left:6px;"></div>
    </a>
  </div>
  ${c.title ? `<p style="font-size:15px;color:#333;margin-top:14px;font-weight:700;">${c.title}</p>` : ''}
</div>`;

      case "banner_strip":
        return `<div style="background:${c.bgColor || '#ff4757'};padding:${pad};text-align:center;">
  <p style="color:#fff;font-size:14px;margin:0;font-weight:700;letter-spacing:0.5px;">${c.text || ''}</p>
</div>`;

      case "rating_block":
        return `<div style="padding:${pad};text-align:center;background:${bgCol};">
  <div style="font-size:36px;margin-bottom:4px;">${starsHtml(c.rating || 0)}</div>
  <p style="font-size:36px;font-weight:900;color:#333;margin:0;">${c.rating || '0'}<span style="font-size:18px;color:#999;font-weight:400;">/5</span></p>
  <p style="font-size:13px;color:#999;margin:6px 0 0;">${c.text || ''} • ${c.totalReviews || '0'} রিভিউ</p>
</div>`;

      case "stats_row": {
        const items = c.items || [];
        return `<div style="padding:${pad};background:${bgCol};"><table style="width:100%;border-collapse:collapse;"><tr>${items.map((it: any) =>
          `<td style="text-align:center;padding:16px 8px;"><p style="font-size:28px;font-weight:900;color:#667eea;margin:0;line-height:1;">${it.value}</p><p style="font-size:12px;color:#888;margin:6px 0 0;font-weight:600;">${it.label}</p></td>`
        ).join('')}</tr></table></div>`;
      }

      case "cta_section":
        return `<div style="background:${c.bgGradient || 'linear-gradient(135deg,#667eea,#764ba2)'};padding:40px 30px;text-align:center;">
  <h2 style="color:#fff;font-size:26px;font-weight:900;margin:0 0 8px;">${c.title || ''}</h2>
  <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0 0 24px;">${c.subtitle || ''}</p>
  <a href="${c.buttonUrl || '#'}" style="display:inline-block;background:#fff;color:#333;padding:14px 40px;border-radius:30px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 4px 15px rgba(0,0,0,0.15);">${c.buttonText || 'শপে যান'}</a>
</div>`;

      case "image_text":
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr>
  <td style="width:40%;padding:10px;vertical-align:middle;">${c.imageUrl ? `<img src="${c.imageUrl}" style="width:100%;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.1);" />` : `<div style="width:100%;padding-top:100%;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);border-radius:14px;"></div>`}</td>
  <td style="width:60%;padding:16px 10px 16px 20px;vertical-align:middle;">
    <h3 style="color:#333;font-size:20px;font-weight:800;margin:0 0 10px;">${c.title || ''}</h3>
    <p style="color:#666;font-size:14px;line-height:1.7;margin:0 0 16px;">${c.text || ''}</p>
    ${c.buttonText ? `<a href="${c.buttonUrl || '#'}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">${c.buttonText}</a>` : ''}
  </td>
</tr></table></div>`;

      case "price_table": {
        const plans = c.plans || [];
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr>${plans.map((p: any) =>
          `<td style="width:${100 / plans.length}%;padding:8px;vertical-align:top;">
            <div style="border-radius:16px;${p.highlighted ? 'border:2px solid #667eea;box-shadow:0 4px 20px rgba(102,126,234,0.15);' : 'border:1px solid #eee;'}padding:24px;text-align:center;background:#fff;">
              ${p.highlighted ? '<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;display:inline-block;margin-bottom:12px;">জনপ্রিয়</div>' : ''}
              <p style="font-size:18px;font-weight:800;color:#333;margin:0 0 8px;">${p.name}</p>
              <p style="font-size:32px;font-weight:900;color:#667eea;margin:0 0 16px;">${p.price}</p>
              ${(p.features || []).map((f: string) => `<p style="font-size:13px;color:#666;margin:4px 0;line-height:1.6;">✓ ${f}</p>`).join('')}
              <a href="#" style="display:block;margin-top:16px;background:${p.highlighted ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#f0f0f0'};color:${p.highlighted ? '#fff' : '#333'};padding:12px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">নির্বাচন করুন</a>
            </div>
          </td>`
        ).join('')}</tr></table></div>`;
      }

      case "faq_block": {
        const items = c.items || [];
        return `<div style="padding:${pad};background:${bgCol};">${items.map((it: any) =>
          `<div style="border:1px solid #f0f0f0;border-radius:12px;padding:18px;margin-bottom:10px;background:#fff;">
            <p style="font-size:14px;font-weight:700;color:#333;margin:0 0 8px;">❓ ${it.q}</p>
            <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">${it.a}</p>
          </div>`
        ).join('')}</div>`;
      }

      case "brand_showcase": {
        const brands = c.brands || [];
        return `<div style="padding:${pad};background:${bgCol};text-align:center;">
  ${c.title ? `<p style="font-size:13px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">${c.title}</p>` : ''}
  <table style="width:100%;border-collapse:collapse;"><tr>${brands.map((b: string) =>
    `<td style="padding:10px;text-align:center;"><div style="background:#fff;border:1px solid #f0f0f0;border-radius:12px;padding:16px 8px;box-shadow:0 1px 4px rgba(0,0,0,0.04);"><p style="font-size:13px;color:#555;font-weight:700;margin:0;">${b}</p></div></td>`
  ).join('')}</tr></table>
</div>`;
      }

      case "social_links":
        return `<div style="padding:${pad};text-align:${align};background:${bgCol};">
  ${c.facebook ? `<a href="${c.facebook}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="36" height="36" style="border-radius:10px;" /></a>` : ''}
  ${c.instagram ? `<a href="${c.instagram}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="36" height="36" style="border-radius:10px;" /></a>` : ''}
  ${c.youtube ? `<a href="${c.youtube}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="36" height="36" style="border-radius:10px;" /></a>` : ''}
  ${c.twitter ? `<a href="${c.twitter}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" width="36" height="36" style="border-radius:10px;" /></a>` : ''}
  ${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp}" style="display:inline-block;margin:0 6px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733585.png" width="36" height="36" style="border-radius:10px;" /></a>` : ''}
</div>`;

      case "footer":
        return `<div style="padding:${pad};background:${bgCol};text-align:${align};">
  <p style="color:${txtCol};font-size:13px;margin:0;">${c.text || ''}</p>
  ${c.address ? `<p style="color:${txtCol};font-size:12px;margin:8px 0 0;opacity:0.7;">📍 ${c.address}</p>` : ''}
  ${c.phone ? `<p style="color:${txtCol};font-size:12px;margin:4px 0 0;opacity:0.7;">📞 ${c.phone}</p>` : ''}
  ${c.unsubscribe ? `<p style="margin:12px 0 0;"><a href="#" style="color:${txtCol};font-size:11px;text-decoration:underline;opacity:0.6;">আনসাবস্ক্রাইব</a></p>` : ''}
</div>`;

      case "columns":
        return `<div style="padding:${pad};"><table style="width:100%;border-collapse:collapse;"><tr><td style="width:50%;padding:10px;vertical-align:top;">${c.left || ''}</td><td style="width:50%;padding:10px;vertical-align:top;">${c.right || ''}</td></tr></table></div>`;

      default:
        return '';
    }
  };

  const blocksToHtml = (blocks: EmailBlock[]): string => {
    if (blocks.length === 0) return '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}td{border-collapse:collapse;}</style></head><body style="margin:0;padding:0;background:#e8e8e8;"><div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#ffffff;border-radius:0;overflow:hidden;">\n${blocks.map(b => blockToHtml(b)).join('\n')}\n</div></body></html>`;
  };

  const blockLabel = (type: BlockType) => BLOCK_LIBRARY.find(b => b.type === type)?.label || type;

  return (
    <div className="flex flex-col gap-4">
      {/* Presets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            প্রিসেট টেমপ্লেট
          </Label>
          <Badge variant="outline" className="text-[10px]">{PRESET_TEMPLATES.length}টি প্রিসেট</Badge>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {PRESET_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className="flex flex-col items-center gap-1 p-2.5 border rounded-xl hover:bg-accent hover:border-primary/30 transition-all text-center group relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: t.color }} />
              <span className="text-xl group-hover:scale-110 transition-transform">{t.icon}</span>
              <span className="text-[10px] font-semibold leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* View Toggle + Undo/Redo */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["design", "preview", "code"] as const).map(mode => (
            <Button key={mode} size="sm" variant={viewMode === mode ? "default" : "outline"} onClick={() => setViewMode(mode)} className="gap-1.5 text-xs">
              {mode === "design" && <><Palette className="h-3.5 w-3.5" /> ডিজাইন</>}
              {mode === "preview" && <><Eye className="h-3.5 w-3.5" /> প্রিভিউ</>}
              {mode === "code" && <><Code className="h-3.5 w-3.5" /> কোড</>}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {viewMode === "design" && (
            <>
              <Button size="sm" variant="ghost" onClick={undo} disabled={historyIdx <= 0} className="h-7 w-7 p-0"><Undo2 className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={redo} disabled={historyIdx >= history.length - 1} className="h-7 w-7 p-0"><Redo2 className="h-3.5 w-3.5" /></Button>
            </>
          )}
          {viewMode === "preview" && (
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <Button size="sm" variant={devicePreview === "desktop" ? "default" : "ghost"} onClick={() => setDevicePreview("desktop")} className="h-7 px-2"><Monitor className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={devicePreview === "mobile" ? "default" : "ghost"} onClick={() => setDevicePreview("mobile")} className="h-7 px-2"><Smartphone className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* Design Mode */}
      {viewMode === "design" && (
        <div className="flex gap-4 min-h-[550px]">
          {/* Block Library */}
          <div className="w-48 shrink-0">
            <Card className="sticky top-0">
              <CardHeader className="py-2.5 px-3"><CardTitle className="text-xs font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> ব্লক লাইব্রেরি</CardTitle></CardHeader>
              <CardContent className="p-2 pt-0">
                <ScrollArea className="h-[480px]">
                  {["basic", "layout", "products", "dynamic"].map(cat => (
                    <div key={cat} className="mb-2.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 mb-1.5 tracking-wider">
                        {cat === "basic" ? "বেসিক" : cat === "layout" ? "লেআউট" : cat === "products" ? "📦 প্রোডাক্ট" : "⚡ ডায়নামিক"}
                      </p>
                      <div className="space-y-0.5">
                        {BLOCK_LIBRARY.filter(b => b.category === cat).map(b => (
                          <div key={b.type} draggable onDragStart={(e) => handleSidebarDragStart(e, b.type)} onClick={() => addBlock(b.type)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:border-primary/20 hover:bg-accent cursor-grab active:cursor-grabbing transition-all text-xs font-medium group">
                            <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">{b.icon}</span>
                            <span className="truncate">{b.label}</span>
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
            <Card className="min-h-[550px] bg-muted/20">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <span className="text-[11px] text-muted-foreground ml-2">ইমেইল ক্যানভাস</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{blocks.length} ব্লক</Badge>
              </div>
              <div className="p-4 space-y-0" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleCanvasDrop(e)}>
                {blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                    <LayoutGrid className="h-12 w-12 mb-4 opacity-30" />
                    <p className="font-semibold text-sm">ব্লক ড্র্যাগ করুন অথবা ক্লিক করুন</p>
                    <p className="text-xs mt-1.5 opacity-70">অথবা উপরে থেকে একটি প্রিসেট বেছে নিন</p>
                  </div>
                )}
                {blocks.map((block, idx) => (
                  <div key={block.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDrop={() => handleDrop(idx)} onDragEnd={handleDragEnd} onClick={() => setSelectedBlockId(block.id)}
                    className={cn("group relative border-2 rounded-lg transition-all cursor-pointer", selectedBlockId === block.id ? "border-primary shadow-lg ring-2 ring-primary/10" : "border-transparent hover:border-primary/20", dragOverIdx === idx && "border-primary/50 bg-primary/5", draggedIdx === idx && "opacity-40")}>
                    <div className={cn("absolute -top-3 left-2 z-10 flex items-center gap-0.5 bg-primary text-primary-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm transition-opacity", selectedBlockId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
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
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  {selectedBlock ? blockLabel(selectedBlock.type) + " সেটিংস" : "ব্লক সিলেক্ট করুন"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {!selectedBlock ? (
                  <div className="text-center py-12">
                    <Settings className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">একটি ব্লকে ক্লিক করে সেটিংস দেখুন</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[480px]">
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
            <span className="text-xs text-muted-foreground ml-2">{devicePreview === "desktop" ? "ডেস্কটপ প্রিভিউ" : "মোবাইল প্রিভিউ"}</span>
          </div>
          <div className="p-8 bg-[#e8e8e8] flex justify-center min-h-[600px]">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all" style={{ maxWidth: devicePreview === "desktop" ? 620 : 375, width: "100%" }}
              dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) || '<div style="text-align:center;color:#999;padding:60px 20px;"><p style="font-size:48px;margin-bottom:16px;">📧</p><p>কোনো ব্লক নেই। ডিজাইন ট্যাবে যান।</p></div>' }} />
          </div>
        </Card>
      )}

      {/* Code */}
      {viewMode === "code" && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">জেনারেটেড HTML কোড</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(blocksToHtml(blocks)); toast.success("HTML কপি হয়েছে"); }}>
              <Copy className="h-3 w-3" /> কপি
            </Button>
          </div>
          <Textarea value={blocksToHtml(blocks)} readOnly rows={20} className="font-mono text-xs bg-muted/30" />
        </div>
      )}
    </div>
  );
};

// ── Block Settings Panel ──
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
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">স্টাইল</p>
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
            <label key={item.id} className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors", selected ? "bg-primary/10 border border-primary/20" : "hover:bg-accent")}>
              <input type="checkbox" checked={selected} onChange={e => {
                onContentChange(key, e.target.checked ? [...ids, item.id] : ids.filter((i: string) => i !== item.id));
              }} className="rounded" />
              {img && <img src={img} className="w-8 h-8 rounded object-cover shrink-0" />}
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

  const renderGradientPicker = (currentValue: string, onChange: (v: string) => void) => (
    <div>
      <Label className="text-xs mb-1.5 block">গ্র্যাডিয়েন্ট</Label>
      <Input value={currentValue || ''} onChange={e => onChange(e.target.value)} className="h-8 text-xs font-mono mb-2" />
      <div className="flex flex-wrap gap-1.5">
        {GRADIENT_PRESETS.map(g => (
          <button key={g.value} onClick={() => onChange(g.value)}
            className={cn("w-7 h-7 rounded-lg border-2 transition-all hover:scale-110", currentValue === g.value ? "border-primary ring-1 ring-primary/30" : "border-transparent")}
            style={{ background: g.value }} title={g.name} />
        ))}
      </div>
    </div>
  );

  switch (type) {
    case "hero_banner":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">সাবটাইটেল</Label><Input value={c.subtitle || ''} onChange={e => onContentChange("subtitle", e.target.value)} className="h-8 text-xs" /></div>
          {renderGradientPicker(c.bgGradient || '', v => onContentChange("bgGradient", v))}
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
            {["{{name}}", "{{shop_name}}", "{{discount}}", "{{order_number}}", "{{total}}"].map(tag => (
              <button key={tag} onClick={() => onContentChange("text", (c.text || '') + ' ' + tag)} className="text-[10px] px-2 py-0.5 bg-muted rounded-full hover:bg-primary/10 transition-colors">{tag}</button>
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
          <div><Label className="text-xs">স্টাইল</Label>
            <Select value={c.style || 'solid'} onValueChange={v => onContentChange("style", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">সলিড</SelectItem>
                <SelectItem value="dashed">ড্যাশড</SelectItem>
                <SelectItem value="dotted">ডটেড</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          {renderGradientPicker(c.bgGradient || '', v => onContentChange("bgGradient", v))}
          {renderCommonSettings()}
        </div>
      );

    case "countdown":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">শেষ তারিখ</Label><Input type="date" value={c.endDate || ''} onChange={e => onContentChange("endDate", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "video_embed":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">থাম্বনেইল URL</Label><Input value={c.thumbnailUrl || ''} onChange={e => onContentChange("thumbnailUrl", e.target.value)} placeholder="https://..." className="h-8 text-xs" /></div>
          <div><Label className="text-xs">ভিডিও URL</Label><Input value={c.videoUrl || ''} onChange={e => onContentChange("videoUrl", e.target.value)} placeholder="https://youtube.com/..." className="h-8 text-xs" /></div>
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "banner_strip":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">টেক্সট</Label><Input value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">ব্যাকগ্রাউন্ড কালার</Label>
            <div className="flex gap-2"><input type="color" value={c.bgColor || '#ff4757'} onChange={e => onContentChange("bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border" /><Input value={c.bgColor || ''} onChange={e => onContentChange("bgColor", e.target.value)} className="h-8 text-xs flex-1" /></div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case "rating_block":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">রেটিং (1-5)</Label><Input type="number" min="1" max="5" step="0.1" value={c.rating || '4.8'} onChange={e => onContentChange("rating", parseFloat(e.target.value))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">মোট রিভিউ</Label><Input value={c.totalReviews || ''} onChange={e => onContentChange("totalReviews", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বিবরণ</Label><Input value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "stats_row": {
      const items = c.items || [];
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold">পরিসংখ্যান আইটেম</Label>
          {items.map((item: any, i: number) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Input value={item.value} onChange={e => { const n = [...items]; n[i] = { ...n[i], value: e.target.value }; onContentChange("items", n); }} placeholder="মান" className="h-7 text-xs flex-1" />
              <Input value={item.label} onChange={e => { const n = [...items]; n[i] = { ...n[i], label: e.target.value }; onContentChange("items", n); }} placeholder="লেবেল" className="h-7 text-xs flex-1" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => onContentChange("items", items.filter((_: any, j: number) => j !== i))}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("items", [...items, { value: "0", label: "লেবেল" }])}><Plus className="h-3 w-3 mr-1" /> যোগ করুন</Button>
          {renderCommonSettings()}
        </div>
      );
    }

    case "cta_section":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">সাবটাইটেল</Label><Input value={c.subtitle || ''} onChange={e => onContentChange("subtitle", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বাটন টেক্সট</Label><Input value={c.buttonText || ''} onChange={e => onContentChange("buttonText", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বাটন URL</Label><Input value={c.buttonUrl || ''} onChange={e => onContentChange("buttonUrl", e.target.value)} className="h-8 text-xs" /></div>
          {renderGradientPicker(c.bgGradient || '', v => onContentChange("bgGradient", v))}
        </div>
      );

    case "image_text":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ইমেজ URL</Label><Input value={c.imageUrl || ''} onChange={e => onContentChange("imageUrl", e.target.value)} placeholder="https://..." className="h-8 text-xs" /></div>
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বিবরণ</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={3} className="text-xs" /></div>
          <div><Label className="text-xs">বাটন টেক্সট</Label><Input value={c.buttonText || ''} onChange={e => onContentChange("buttonText", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">বাটন URL</Label><Input value={c.buttonUrl || ''} onChange={e => onContentChange("buttonUrl", e.target.value)} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "testimonial":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">গ্রাহকের নাম</Label><Input value={c.name || ''} onChange={e => onContentChange("name", e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">মন্তব্য</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={3} className="text-xs" /></div>
          <div><Label className="text-xs">রেটিং (1-5)</Label><Input type="number" min="1" max="5" value={c.rating || '5'} onChange={e => onContentChange("rating", parseInt(e.target.value))} className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "feature_list": {
      const items: string[] = c.items || [];
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold">ফিচার আইটেম</Label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1">
              <Input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onContentChange("items", n); }} className="h-8 text-xs" />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => onContentChange("items", items.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("items", [...items, "নতুন ফিচার"])}><Plus className="h-3 w-3 mr-1" /> যোগ করুন</Button>
          <div>
            <Label className="text-xs">আইকন স্টাইল</Label>
            <Select value={c.iconStyle || 'check'} onValueChange={v => onContentChange("iconStyle", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="check">✓ চেকমার্ক</SelectItem>
                <SelectItem value="emoji">ইমোজি</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderCommonSettings()}
        </div>
      );
    }

    case "price_table": {
      const plans = c.plans || [];
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold">প্ল্যান সমূহ</Label>
          {plans.map((plan: any, i: number) => (
            <div key={i} className="border rounded-lg p-2 space-y-2">
              <div className="flex gap-1.5">
                <Input value={plan.name} onChange={e => { const n = [...plans]; n[i] = { ...n[i], name: e.target.value }; onContentChange("plans", n); }} placeholder="নাম" className="h-7 text-xs" />
                <Input value={plan.price} onChange={e => { const n = [...plans]; n[i] = { ...n[i], price: e.target.value }; onContentChange("plans", n); }} placeholder="মূল্য" className="h-7 text-xs w-20" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={plan.highlighted || false} onChange={e => { const n = [...plans]; n[i] = { ...n[i], highlighted: e.target.checked }; onContentChange("plans", n); }} />
                <Label className="text-[10px]">হাইলাইটেড</Label>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => onContentChange("plans", plans.filter((_: any, j: number) => j !== i))}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("plans", [...plans, { name: "নতুন", price: "৳0", features: ["ফিচার ১"] }])}><Plus className="h-3 w-3 mr-1" /> প্ল্যান যোগ</Button>
          {renderCommonSettings()}
        </div>
      );
    }

    case "faq_block": {
      const items = c.items || [];
      return (
        <div className="space-y-3">
          <Label className="text-xs font-semibold">FAQ আইটেম</Label>
          {items.map((item: any, i: number) => (
            <div key={i} className="border rounded-lg p-2 space-y-1.5">
              <Input value={item.q} onChange={e => { const n = [...items]; n[i] = { ...n[i], q: e.target.value }; onContentChange("items", n); }} placeholder="প্রশ্ন" className="h-7 text-xs" />
              <div className="flex gap-1">
                <Input value={item.a} onChange={e => { const n = [...items]; n[i] = { ...n[i], a: e.target.value }; onContentChange("items", n); }} placeholder="উত্তর" className="h-7 text-xs flex-1" />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => onContentChange("items", items.filter((_: any, j: number) => j !== i))}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("items", [...items, { q: "প্রশ্ন?", a: "উত্তর" }])}><Plus className="h-3 w-3 mr-1" /> FAQ যোগ</Button>
          {renderCommonSettings()}
        </div>
      );
    }

    case "brand_showcase": {
      const brands = c.brands || [];
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">শিরোনাম</Label><Input value={c.title || ''} onChange={e => onContentChange("title", e.target.value)} className="h-8 text-xs" /></div>
          <Label className="text-xs font-semibold">ব্র্যান্ড</Label>
          {brands.map((b: string, i: number) => (
            <div key={i} className="flex gap-1">
              <Input value={b} onChange={e => { const n = [...brands]; n[i] = e.target.value; onContentChange("brands", n); }} className="h-7 text-xs" />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => onContentChange("brands", brands.filter((_: string, j: number) => j !== i))}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => onContentChange("brands", [...brands, "নতুন ব্র্যান্ড"])}><Plus className="h-3 w-3 mr-1" /> যোগ করুন</Button>
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
          <div><Label className="text-xs">WhatsApp নম্বর</Label><Input value={c.whatsapp || ''} onChange={e => onContentChange("whatsapp", e.target.value)} placeholder="8801XXXXXXXXX" className="h-8 text-xs" /></div>
          {renderCommonSettings()}
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <div><Label className="text-xs">ফুটার টেক্সট</Label><Textarea value={c.text || ''} onChange={e => onContentChange("text", e.target.value)} rows={2} className="text-xs" /></div>
          <div><Label className="text-xs">ঠিকানা</Label><Input value={c.address || ''} onChange={e => onContentChange("address", e.target.value)} placeholder="ঢাকা, বাংলাদেশ" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">ফোন</Label><Input value={c.phone || ''} onChange={e => onContentChange("phone", e.target.value)} placeholder="01XXXXXXXXX" className="h-8 text-xs" /></div>
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
