import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send, Plus, Calendar, Clock, Hash, Trash2, Edit, Eye, RefreshCw,
  Facebook, Instagram, Twitter, MessageCircle, Linkedin, Youtube, Globe, Printer,
  TrendingUp, Heart, MessageSquare, Share2, BarChart3, Settings, Smartphone,
  Search, Copy, Link2, Package, X, Check, AlertCircle, RotateCcw, Filter,
  Image as ImageIcon, Upload, BookOpen, ShoppingBag, FolderOpen, Sparkles,
  Zap, Target, Activity, ArrowUpRight, Layers, Bell, ChevronRight
} from "lucide-react";

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: '#1DA1F2' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088cc' },
  { id: 'tiktok', name: 'TikTok', icon: Smartphone, color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'pinterest', name: 'Pinterest', icon: Globe, color: '#E60023' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  publishing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<string, string> = {
  draft: 'ড্রাফট', scheduled: 'শিডিউল', publishing: 'পোস্ট হচ্ছে',
  published: 'পাবলিশড', failed: 'ব্যর্থ', pending: 'পেন্ডিং', success: 'সফল',
};

const TRIGGER_TYPES = [
  { id: 'new_product', label: 'নতুন পণ্য যোগ', icon: '📦' },
  { id: 'product_update', label: 'পণ্য আপডেট', icon: '✏️' },
  { id: 'new_offer', label: 'নতুন অফার', icon: '🏷️' },
  { id: 'price_drop', label: 'মূল্য হ্রাস', icon: '📉' },
  { id: 'back_in_stock', label: 'স্টকে ফিরেছে', icon: '📦' },
  { id: 'flash_sale', label: 'ফ্ল্যাশ সেল', icon: '⚡' },
];

const TEMPLATE_TYPES = [
  { id: 'general', label: 'সাধারণ' },
  { id: 'new_product', label: 'নতুন পণ্য' },
  { id: 'offer', label: 'অফার' },
  { id: 'category', label: 'ক্যাটাগরি' },
  { id: 'custom', label: 'কাস্টম' },
];

const STATIC_VARIABLES = [
  { key: '{{shop_name}}', label: 'দোকানের নাম', icon: '🏪', value: 'বইআলো' },
  { key: '{{date}}', label: 'তারিখ', icon: '📅', value: new Date().toLocaleDateString('bn-BD') },
];

const AVAILABLE_VARIABLES = [
  { key: '{{product_name}}', label: 'পণ্যের নাম', icon: '📦' },
  { key: '{{price}}', label: 'মূল্য', icon: '💰' },
  { key: '{{discount_price}}', label: 'ছাড় মূল্য', icon: '🏷️' },
  { key: '{{author}}', label: 'লেখক', icon: '✍️' },
  { key: '{{category}}', label: 'ক্যাটাগরি', icon: '📂' },
  { key: '{{link}}', label: 'লিংক', icon: '🔗' },
  { key: '{{shop_name}}', label: 'দোকানের নাম', icon: '🏪' },
  { key: '{{date}}', label: 'তারিখ', icon: '📅' },
];

const DAYS_OF_WEEK = [
  { id: 'sat', label: 'শনি' }, { id: 'sun', label: 'রবি' }, { id: 'mon', label: 'সোম' },
  { id: 'tue', label: 'মঙ্গল' }, { id: 'wed', label: 'বুধ' }, { id: 'thu', label: 'বৃহ' }, { id: 'fri', label: 'শুক্র' },
];

const CONDITION_TYPES = [
  { id: 'min_price', label: 'সর্বনিম্ন মূল্য', type: 'number' },
  { id: 'max_price', label: 'সর্বোচ্চ মূল্য', type: 'number' },
  { id: 'category_match', label: 'নির্দিষ্ট ক্যাটাগরি', type: 'text' },
  { id: 'has_discount', label: 'ডিসকাউন্ট আছে', type: 'boolean' },
  { id: 'has_image', label: 'ছবি আছে', type: 'boolean' },
];

const BASE_URL = 'https://boialo.lovable.app';

// Shared product selector hook
const useProductCategorySelector = (searchKey: string) => {
  const [productSearch, setProductSearch] = useState('');
  const [selectorTab, setSelectorTab] = useState<'books' | 'universal' | 'categories'>('books');

  const { data: products = [] } = useQuery({
    queryKey: [searchKey + '-products', productSearch],
    queryFn: async () => {
      const sanitized = productSearch.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      // @ts-ignore
      const base = supabase.from('products').select('id, title_bn, title_en, slug, images, price, original_price, discount_percent, author, publisher, category_id, isbn, writer_id, publisher_id, brand_id').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      const final = sanitized ? base.or(`title_bn.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%,author.ilike.%${sanitized}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  const { data: universalProducts = [] } = useQuery({
    queryKey: [searchKey + '-universal', productSearch],
    queryFn: async () => {
      const sanitized = productSearch.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      // @ts-ignore
      const base = supabase.from('universal_products').select('id, name_bn, name_en, slug, images, price, original_price, discount_percent, product_type, brand, sku, weight, manufacturer').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      const final = sanitized ? base.or(`name_bn.ilike.%${sanitized}%,name_en.ilike.%${sanitized}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: [searchKey + '-categories', productSearch],
    queryFn: async () => {
      const sanitized = productSearch.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      // @ts-ignore
      const base = supabase.from('categories').select('id, name_bn, name_en, slug, image_url').eq('is_active', true).order('name_bn').limit(30);
      const final = sanitized ? base.or(`name_bn.ilike.%${sanitized}%,name_en.ilike.%${sanitized}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  const { data: universalCategories = [] } = useQuery({
    queryKey: [searchKey + '-ucategories', productSearch],
    queryFn: async () => {
      const sanitized = productSearch.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      // @ts-ignore
      const base = supabase.from('universal_categories').select('id, name_bn, name_en, slug, image_url, product_type').eq('is_active', true).order('name_bn').limit(30);
      const final = sanitized ? base.or(`name_bn.ilike.%${sanitized}%,name_en.ilike.%${sanitized}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  return { products, universalProducts, categories, universalCategories, productSearch, setProductSearch, selectorTab, setSelectorTab };
};

// Build dynamic variables from a selected product
const buildDynamicVars = (selectedProduct: any) => {
  if (!selectedProduct) return [];
  const vars: { key: string; label: string; icon: string; value: string }[] = [];
  const p = selectedProduct;
  const name = p._resolved_name || p.title_bn || p.name_bn || p.title_en || p.name_en || '';
  if (name) vars.push({ key: name, label: 'পণ্যের নাম', icon: '📦', value: name });
  if (p.price) vars.push({ key: `৳${p.price}`, label: 'মূল্য', icon: '💰', value: `৳${p.price}` });
  if (p.original_price && p.original_price > p.price) vars.push({ key: `৳${p.original_price}`, label: 'আগের মূল্য', icon: '🏷️', value: `৳${p.original_price}` });
  if (p.discount_percent) vars.push({ key: `${p.discount_percent}%`, label: 'ডিসকাউন্ট', icon: '🔥', value: `${p.discount_percent}%` });
  if (p.author) vars.push({ key: p.author, label: 'লেখক', icon: '✍️', value: p.author });
  if (p.publisher) vars.push({ key: p.publisher, label: 'প্রকাশনী', icon: '🏢', value: p.publisher });
  if (p.product_type) vars.push({ key: p.product_type, label: 'টাইপ', icon: '🏷️', value: p.product_type });
  if (p.isbn) vars.push({ key: p.isbn, label: 'ISBN', icon: '📖', value: p.isbn });
  if (p.sku) vars.push({ key: p.sku, label: 'SKU', icon: '🔢', value: p.sku });
  if (p.brand) vars.push({ key: p.brand, label: 'ব্র্যান্ড', icon: '🏷️', value: p.brand });
  if (p.manufacturer) vars.push({ key: p.manufacturer, label: 'প্রস্তুতকারক', icon: '🏭', value: p.manufacturer });
  if (p._resolved_url) vars.push({ key: p._resolved_url, label: 'লিংক', icon: '🔗', value: p._resolved_url });
  vars.push({ key: 'বইআলো', label: 'দোকানের নাম', icon: '🏪', value: 'বইআলো' });
  vars.push({ key: new Date().toLocaleDateString('bn-BD'), label: 'তারিখ', icon: '📅', value: new Date().toLocaleDateString('bn-BD') });
  return vars;
};

// Shared Product Selector UI Component
const ProductSelectorInline = ({
  selectedProduct, onSelect, onClear, selector, showSelector, setShowSelector
}: {
  selectedProduct: any;
  onSelect: (product: any, type: 'book' | 'universal') => void;
  onClear: () => void;
  selector: ReturnType<typeof useProductCategorySelector>;
  showSelector: boolean;
  setShowSelector: (v: boolean) => void;
}) => {
  const selectCategory = (cat: any, type: 'book' | 'universal') => {
    const name = cat.name_bn || cat.name_en;
    const url = type === 'book' ? `${BASE_URL}/categories/${cat.slug}` : `${BASE_URL}/category/${cat.product_type}/${cat.slug}`;
    onSelect({ id: cat.id, type: `category-${type}`, name_bn: name, slug: cat.slug, _resolved_name: name, _resolved_url: url, image_url: cat.image_url }, type);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> প্রোডাক্ট / ক্যাটাগরি
        </Label>
        {!selectedProduct && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowSelector(!showSelector)}>
            <Search className="w-3 h-3" /> সিলেক্ট করুন
          </Button>
        )}
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-3 p-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          {(selectedProduct.images?.[0] || selectedProduct.image_url) && (
            <img src={selectedProduct.images?.[0] || selectedProduct.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedProduct._resolved_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px]">
                {selectedProduct.type === 'book' ? '📚 বই' : selectedProduct.type === 'universal' ? '🛍️ প্রোডাক্ট' : '📂 ক্যাটাগরি'}
              </Badge>
              {selectedProduct.price && <span className="text-[10px] text-muted-foreground">৳{selectedProduct.price}</span>}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClear}><X className="w-3.5 h-3.5" /></Button>
        </div>
      )}

      {showSelector && !selectedProduct && (
        <Card className="border-dashed border-primary/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
              {[
                { key: 'books' as const, label: '📚 বই', count: selector.products.length },
                { key: 'universal' as const, label: '🛍️ প্রোডাক্ট', count: selector.universalProducts.length },
                { key: 'categories' as const, label: '📂 ক্যাটাগরি', count: selector.categories.length + selector.universalCategories.length },
              ].map(t => (
                <button key={t.key} onClick={() => selector.setSelectorTab(t.key)}
                  className={`flex-1 text-[10px] font-medium py-1.5 rounded-md transition-all ${selector.selectorTab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                  {t.label} ({t.count})
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="খুঁজুন..." value={selector.productSearch} onChange={e => selector.setProductSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <ScrollArea className="h-44">
              <div className="space-y-0.5">
                {selector.selectorTab === 'books' && selector.products.map((p: any) => (
                  <button key={p.id} onClick={() => onSelect(p, 'book')} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 text-left text-xs transition-colors">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-8 h-10 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0"><p className="truncate font-medium">{p.title_bn || p.title_en}</p><p className="text-[10px] text-muted-foreground">৳{p.price} {p.author ? `• ${p.author}` : ''}</p></div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {selector.selectorTab === 'universal' && selector.universalProducts.map((p: any) => (
                  <button key={p.id} onClick={() => onSelect(p, 'universal')} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 text-left text-xs transition-colors">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0"><p className="truncate font-medium">{p.name_bn || p.name_en}</p><p className="text-[10px] text-muted-foreground">৳{p.price} • {p.product_type}</p></div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {selector.selectorTab === 'categories' && (
                  <>
                    {selector.categories.map((c: any) => (
                      <button key={c.id} onClick={() => selectCategory(c, 'book')} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 text-left text-xs transition-colors">
                        <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate flex-1">{c.name_bn || c.name_en}</span>
                        <Badge variant="outline" className="text-[8px] shrink-0">বই</Badge>
                      </button>
                    ))}
                    {selector.universalCategories.map((c: any) => (
                      <button key={c.id} onClick={() => selectCategory(c, 'universal')} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 text-left text-xs transition-colors">
                        <ShoppingBag className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="truncate flex-1">{c.name_bn || c.name_en}</span>
                        <Badge variant="outline" className="text-[8px] shrink-0">{c.product_type}</Badge>
                      </button>
                    ))}
                  </>
                )}
                {selector.selectorTab === 'books' && selector.products.length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">কোনো বই পাওয়া যায়নি</p>}
                {selector.selectorTab === 'universal' && selector.universalProducts.length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">কোনো প্রোডাক্ট পাওয়া যায়নি</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Dynamic Variable Toolbar Component
const DynamicVariableToolbar = ({
  selectedProduct, onInsert, staticOnly = false
}: {
  selectedProduct: any;
  onInsert: (value: string) => void;
  staticOnly?: boolean;
}) => {
  const dynamicVars = useMemo(() => buildDynamicVars(selectedProduct), [selectedProduct]);

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium flex items-center gap-1.5 text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> ভেরিয়েবল ক্লিক করে যোগ করুন
      </Label>
      <div className="flex flex-wrap gap-1 p-2 bg-muted/40 rounded-lg border border-border/50">
        {selectedProduct && dynamicVars.length > 0 ? (
          dynamicVars.map((v, idx) => (
            <Badge key={idx} variant="outline"
              className="cursor-pointer text-[10px] hover:bg-primary/10 hover:border-primary/40 gap-0.5 py-0.5 transition-colors"
              onClick={() => onInsert(v.value)}>
              <span>{v.icon}</span> <span className="font-normal">{v.label}</span>
            </Badge>
          ))
        ) : staticOnly ? (
          AVAILABLE_VARIABLES.map(v => (
            <Badge key={v.key} variant="outline"
              className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5 py-0.5 transition-colors"
              onClick={() => onInsert(v.key)}>
              <span>{v.icon}</span> {v.label}
            </Badge>
          ))
        ) : (
          <>
            <span className="text-[10px] text-muted-foreground self-center mr-1">প্রোডাক্ট সিলেক্ট করলে ডায়নামিক ভেরিয়েবল আসবে</span>
            {STATIC_VARIABLES.map(v => (
              <Badge key={v.key} variant="outline"
                className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5 py-0.5 transition-colors"
                onClick={() => onInsert(v.value)}>
                {v.icon} {v.label}
              </Badge>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ======================== AUTOMATION SETTINGS ========================
const AutomationSettings = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'hashtags' | 'templates' | 'rules' | 'logs'>('overview');

  // Saved hashtag groups
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState('');
  const [editingGroup, setEditingGroup] = useState<any>(null);

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplType, setTplType] = useState('general');
  const [tplContent, setTplContent] = useState('');
  const [tplPlatforms, setTplPlatforms] = useState<string[]>([]);
  const [tplHashtagGroup, setTplHashtagGroup] = useState('');
  const [tplIncludeImage, setTplIncludeImage] = useState(true);
  const [tplIncludePrice, setTplIncludePrice] = useState(true);
  const [tplIncludeLink, setTplIncludeLink] = useState(true);
  const [tplDescription, setTplDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilterType, setTemplateFilterType] = useState('all');
  const [showPreview, setShowPreview] = useState(false);

  // Template product/category selector
  const [tplShowProductSelector, setTplShowProductSelector] = useState(false);
  const [tplSelectedProduct, setTplSelectedProduct] = useState<any>(null);
  const tplSelector = useProductCategorySelector('tpl');

  // Rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState('new_product');
  const [rulePlatforms, setRulePlatforms] = useState<string[]>([]);
  const [ruleTemplate, setRuleTemplate] = useState('');
  const [ruleHashtagGroup, setRuleHashtagGroup] = useState('');
  const [ruleDelay, setRuleDelay] = useState(0);
  const [ruleSendEmail, setRuleSendEmail] = useState(false);
  const [ruleSendSms, setRuleSendSms] = useState(false);
  const [rulePriority, setRulePriority] = useState(0);
  const [ruleScheduleDays, setRuleScheduleDays] = useState<string[]>([]);
  const [ruleTimeStart, setRuleTimeStart] = useState('');
  const [ruleTimeEnd, setRuleTimeEnd] = useState('');
  const [ruleMaxExec, setRuleMaxExec] = useState<number | null>(null);
  const [ruleConditions, setRuleConditions] = useState<any>({});
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleFilter, setRuleFilter] = useState('all');

  // Rule product selector
  const [ruleShowProductSelector, setRuleShowProductSelector] = useState(false);
  const [ruleSelectedProduct, setRuleSelectedProduct] = useState<any>(null);
  const [ruleContent, setRuleContent] = useState('');
  const ruleSelector = useProductCategorySelector('rule');
  const ruleContentRef = useRef<HTMLTextAreaElement>(null);

  // Log filters
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logTriggerFilter, setLogTriggerFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logDateRange, setLogDateRange] = useState<'today' | '7d' | '30d' | 'all'>('all');

  const tplContentRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['auto-post-settings'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('auto_post_settings').select('*').order('setting_key');
      return data || [];
    }
  });

  const { data: hashtagGroups = [] } = useQuery({
    queryKey: ['saved-hashtag-groups'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('saved_hashtag_groups').select('*').order('use_count', { ascending: false });
      return data || [];
    }
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['social-post-templates'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('social_post_templates').select('*').order('use_count', { ascending: false });
      return data || [];
    }
  });

  const { data: automationRules = [] } = useQuery({
    queryKey: ['social-automation-rules'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('social_automation_rules').select('*').order('priority', { ascending: false });
      return data || [];
    }
  });

  const { data: automationLogs = [] } = useQuery({
    queryKey: ['social-automation-log'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('social_automation_log').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    }
  });

  const smSetting = settings.find((s: any) => s.setting_key === 'social_media_auto_post');
  const emailSetting = settings.find((s: any) => s.setting_key === 'email_new_product');
  const smConfig = (smSetting?.setting_value || {}) as any;
  const emailConfig = (emailSetting?.setting_value || {}) as any;

  const updateSetting = useMutation({
    mutationFn: async ({ id, is_active, setting_value }: { id: string; is_active?: boolean; setting_value?: any }) => {
      const updates: any = {};
      if (is_active !== undefined) updates.is_active = is_active;
      if (setting_value !== undefined) updates.setting_value = setting_value;
      updates.updated_at = new Date().toISOString();
      // @ts-ignore
      const { error } = await supabase.from('auto_post_settings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['auto-post-settings'] }); toast.success('সেটিংস আপডেট হয়েছে'); },
    onError: () => toast.error('আপডেট ব্যর্থ'),
  });

  // Hashtag group mutations
  const saveHashtagGroup = useMutation({
    mutationFn: async () => {
      const tags = newGroupTags.split(/[,\s]+/).filter(Boolean).map(t => t.replace(/^#/, ''));
      if (editingGroup) {
        // @ts-ignore
        const { error } = await supabase.from('saved_hashtag_groups').update({ name: newGroupName, hashtags: tags, updated_at: new Date().toISOString() }).eq('id', editingGroup.id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase.from('saved_hashtag_groups').insert({ name: newGroupName, hashtags: tags });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saved-hashtag-groups'] }); toast.success('হ্যাশট্যাগ গ্রুপ সেভ হয়েছে'); setNewGroupName(''); setNewGroupTags(''); setEditingGroup(null); },
    onError: () => toast.error('সেভ করতে ব্যর্থ'),
  });

  const deleteHashtagGroup = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore
      const { error } = await supabase.from('saved_hashtag_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saved-hashtag-groups'] }); toast.success('মুছে ফেলা হয়েছে'); },
  });

  const setDefaultGroup = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore
      await supabase.from('saved_hashtag_groups').update({ is_default: false }).neq('id', id);
      // @ts-ignore
      const { error } = await supabase.from('saved_hashtag_groups').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saved-hashtag-groups'] }); toast.success('ডিফল্ট সেট হয়েছে'); },
  });

  // Template mutations
  const saveTemplate = useMutation({
    mutationFn: async () => {
      const usedVars = AVAILABLE_VARIABLES.filter(v => tplContent.includes(v.key)).map(v => v.key);
      const data: any = {
        name: tplName, template_type: tplType, content_bn: tplContent || null, content_en: null,
        platforms: tplPlatforms, hashtag_group_id: tplHashtagGroup || null,
        include_image: tplIncludeImage, include_price: tplIncludePrice, include_link: tplIncludeLink,
        description: tplDescription || null, variables: usedVars,
        updated_at: new Date().toISOString(),
      };
      if (editingTemplate) {
        // @ts-ignore
        const { error } = await supabase.from('social_post_templates').update(data).eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase.from('social_post_templates').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-post-templates'] }); toast.success('টেমপ্লেট সেভ হয়েছে'); resetTemplateForm(); },
    onError: () => toast.error('সেভ করতে ব্যর্থ'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore
      const { error } = await supabase.from('social_post_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-post-templates'] }); toast.success('মুছে ফেলা হয়েছে'); },
  });

  const toggleTemplate = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // @ts-ignore
      const { error } = await supabase.from('social_post_templates').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-post-templates'] }),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (t: any) => {
      const { id, created_at, updated_at, use_count, last_used_at, ...rest } = t;
      // @ts-ignore
      const { error } = await supabase.from('social_post_templates').insert({ ...rest, name: `${t.name} (কপি)`, use_count: 0 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-post-templates'] }); toast.success('টেমপ্লেট ডুপ্লিকেট হয়েছে'); },
  });

  // Rule mutations
  const saveRule = useMutation({
    mutationFn: async () => {
      const data: any = {
        name: ruleName, trigger_type: ruleTrigger, platforms: rulePlatforms,
        template_id: ruleTemplate || null, hashtag_group_id: ruleHashtagGroup || null,
        delay_minutes: ruleDelay, send_email: ruleSendEmail, send_sms: ruleSendSms,
        priority: rulePriority, conditions: ruleConditions,
        schedule_days: ruleScheduleDays, schedule_time_start: ruleTimeStart || null,
        schedule_time_end: ruleTimeEnd || null, max_executions_per_day: ruleMaxExec,
        updated_at: new Date().toISOString(),
      };
      if (editingRule) {
        // @ts-ignore
        const { error } = await supabase.from('social_automation_rules').update(data).eq('id', editingRule.id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase.from('social_automation_rules').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-automation-rules'] }); toast.success('রুল সেভ হয়েছে'); resetRuleForm(); },
    onError: () => toast.error('সেভ করতে ব্যর্থ'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      // @ts-ignore
      const { error } = await supabase.from('social_automation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-automation-rules'] }); toast.success('মুছে ফেলা হয়েছে'); },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // @ts-ignore
      const { error } = await supabase.from('social_automation_rules').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-automation-rules'] }),
  });

  const duplicateRule = useMutation({
    mutationFn: async (r: any) => {
      const { id, created_at, updated_at, trigger_count, success_count, fail_count, last_executed_at, ...rest } = r;
      // @ts-ignore
      const { error } = await supabase.from('social_automation_rules').insert({ ...rest, name: `${r.name} (কপি)`, trigger_count: 0, success_count: 0, fail_count: 0 });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-automation-rules'] }); toast.success('রুল ডুপ্লিকেট হয়েছে'); },
  });

  const resetTemplateForm = () => {
    setTplName(''); setTplType('general'); setTplContent('');
    setTplPlatforms([]); setTplHashtagGroup(''); setTplIncludeImage(true); setTplIncludePrice(true);
    setTplIncludeLink(true); setTplDescription(''); setEditingTemplate(null); setShowTemplateForm(false); setShowPreview(false);
    setTplSelectedProduct(null); tplSelector.setProductSearch('');
  };

  const resetRuleForm = () => {
    setRuleName(''); setRuleTrigger('new_product'); setRulePlatforms([]);
    setRuleTemplate(''); setRuleHashtagGroup(''); setRuleDelay(0);
    setRuleSendEmail(false); setRuleSendSms(false); setRulePriority(0);
    setRuleScheduleDays([]); setRuleTimeStart(''); setRuleTimeEnd('');
    setRuleMaxExec(null); setRuleConditions({}); setEditingRule(null); setShowRuleForm(false);
    setRuleSelectedProduct(null); setRuleContent(''); ruleSelector.setProductSearch('');
  };

  const editTemplateAction = (t: any) => {
    setEditingTemplate(t); setTplName(t.name); setTplType(t.template_type);
    setTplContent(t.content_bn || t.content_en || '');
    setTplPlatforms(t.platforms || []); setTplHashtagGroup(t.hashtag_group_id || '');
    setTplIncludeImage(t.include_image !== false); setTplIncludePrice(t.include_price !== false);
    setTplIncludeLink(t.include_link !== false); setTplDescription(t.description || ''); setShowTemplateForm(true);
  };

  const editRuleAction = (r: any) => {
    setEditingRule(r); setRuleName(r.name); setRuleTrigger(r.trigger_type);
    setRulePlatforms(r.platforms || []); setRuleTemplate(r.template_id || '');
    setRuleHashtagGroup(r.hashtag_group_id || ''); setRuleDelay(r.delay_minutes || 0);
    setRuleSendEmail(r.send_email || false); setRuleSendSms(r.send_sms || false);
    setRulePriority(r.priority || 0); setRuleScheduleDays(r.schedule_days || []);
    setRuleTimeStart(r.schedule_time_start || ''); setRuleTimeEnd(r.schedule_time_end || '');
    setRuleMaxExec(r.max_executions_per_day || null); setRuleConditions(r.conditions || {});
    setShowRuleForm(true);
  };

  const insertToTextarea = (ref: React.RefObject<HTMLTextAreaElement>, value: string, content: string, setContent: (v: string) => void) => {
    const textarea = ref.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = content.substring(0, start) + value + content.substring(end);
      setContent(newVal);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + value.length, start + value.length); }, 50);
    } else {
      setContent(content + value);
    }
  };

  const tplSelectProduct = (product: any, type: 'book' | 'universal') => {
    const name = type === 'book' ? (product.title_bn || product.title_en) : (product.name_bn || product.name_en);
    const url = type === 'book' ? `${BASE_URL}/product/${product.slug}` : `${BASE_URL}/universal-product/${product.slug}`;
    setTplSelectedProduct({ ...product, type, _resolved_name: name, _resolved_url: url });
    setTplShowProductSelector(false);
  };

  const ruleSelectProduct = (product: any, type: 'book' | 'universal') => {
    const name = type === 'book' ? (product.title_bn || product.title_en) : (product.name_bn || product.name_en);
    const url = type === 'book' ? `${BASE_URL}/product/${product.slug}` : `${BASE_URL}/universal-product/${product.slug}`;
    setRuleSelectedProduct({ ...product, type, _resolved_name: name, _resolved_url: url });
    setRuleShowProductSelector(false);
  };

  const getPreviewContent = () => {
    let content = tplContent || 'কোনো কন্টেন্ট নেই';
    if (tplSelectedProduct) {
      const p = tplSelectedProduct;
      content = content.replace(/\{\{product_name\}\}/g, p._resolved_name || 'পণ্যের নাম')
        .replace(/\{\{price\}\}/g, p.price ? `৳${p.price}` : '৳0')
        .replace(/\{\{discount_price\}\}/g, p.original_price ? `৳${p.original_price}` : '')
        .replace(/\{\{author\}\}/g, p.author || 'লেখক')
        .replace(/\{\{category\}\}/g, p.product_type || 'ক্যাটাগরি')
        .replace(/\{\{link\}\}/g, p._resolved_url || '#')
        .replace(/\{\{shop_name\}\}/g, 'বইআলো')
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('bn-BD'));
    } else {
      content = content.replace(/\{\{product_name\}\}/g, 'আমার প্রথম বই')
        .replace(/\{\{price\}\}/g, '৳350').replace(/\{\{discount_price\}\}/g, '৳280')
        .replace(/\{\{author\}\}/g, 'লেখক নাম').replace(/\{\{category\}\}/g, 'উপন্যাস')
        .replace(/\{\{link\}\}/g, 'https://boialo.com/book/example')
        .replace(/\{\{shop_name\}\}/g, 'বইআলো').replace(/\{\{date\}\}/g, new Date().toLocaleDateString('bn-BD'));
    }
    const hGroup = hashtagGroups.find((g: any) => g.id === tplHashtagGroup);
    if (hGroup) content += '\n\n' + (hGroup.hashtags || []).map((h: string) => `#${h}`).join(' ');
    return content;
  };

  const togglePlatform = (platform: string) => {
    if (!smSetting) return;
    const current = smConfig.platforms || [];
    const updated = current.includes(platform) ? current.filter((p: string) => p !== platform) : [...current, platform];
    updateSetting.mutate({ id: smSetting.id, setting_value: { ...smConfig, platforms: updated } });
  };

  // Filtered data
  const filteredTemplates = useMemo(() => templates.filter((t: any) => {
    if (templateFilterType !== 'all' && t.template_type !== templateFilterType) return false;
    if (templateSearch && !t.name?.toLowerCase().includes(templateSearch.toLowerCase()) && !t.content_bn?.toLowerCase().includes(templateSearch.toLowerCase())) return false;
    return true;
  }), [templates, templateFilterType, templateSearch]);

  const filteredRules = useMemo(() => automationRules.filter((r: any) => {
    if (ruleFilter === 'active' && !r.is_active) return false;
    if (ruleFilter === 'inactive' && r.is_active) return false;
    return true;
  }), [automationRules, ruleFilter]);

  const filteredLogs = useMemo(() => automationLogs.filter((log: any) => {
    if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false;
    if (logTriggerFilter !== 'all' && log.trigger_type !== logTriggerFilter) return false;
    if (logSearch && !log.product_name?.toLowerCase().includes(logSearch.toLowerCase())) return false;
    if (logDateRange !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      if (logDateRange === 'today' && logDate.toDateString() !== now.toDateString()) return false;
      if (logDateRange === '7d' && (now.getTime() - logDate.getTime()) > 7 * 86400000) return false;
      if (logDateRange === '30d' && (now.getTime() - logDate.getTime()) > 30 * 86400000) return false;
    }
    return true;
  }), [automationLogs, logStatusFilter, logTriggerFilter, logSearch, logDateRange]);

  const logStats = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l: any) => l.status === 'success').length;
    const failed = filteredLogs.filter((l: any) => l.status === 'failed').length;
    const skipped = filteredLogs.filter((l: any) => l.status === 'skipped').length;
    return { total, success, failed, skipped, successRate: total > 0 ? Math.round((success / total) * 100) : 0 };
  }, [filteredLogs]);

  if (settingsLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-5">
      {/* Sub-tabs - Professional pill design */}
      <div className="flex gap-1 bg-muted/60 p-1 rounded-xl flex-wrap border border-border/50">
        {[
          { key: 'overview' as const, label: 'ওভারভিউ', icon: Activity, count: null },
          { key: 'hashtags' as const, label: 'হ্যাশট্যাগ', icon: Hash, count: hashtagGroups.length },
          { key: 'templates' as const, label: 'টেমপ্লেট', icon: Layers, count: templates.length },
          { key: 'rules' as const, label: 'অটো রুলস', icon: Zap, count: automationRules.length },
          { key: 'logs' as const, label: 'লগ', icon: Activity, count: automationLogs.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center gap-1.5 text-xs font-medium py-2 px-3.5 rounded-lg transition-all ${activeSubTab === tab.key ? 'bg-background shadow-sm text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count !== null && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-0.5">{tab.count}</Badge>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> অটো সোশ্যাল পোস্ট</span>
                  {smSetting && <Switch checked={smSetting.is_active && smConfig.enabled} onCheckedChange={(checked) => updateSetting.mutate({ id: smSetting.id, is_active: checked, setting_value: { ...smConfig, enabled: checked } })} />}
                </CardTitle>
                <CardDescription>নতুন পণ্যে স্বয়ংক্রিয় সোশ্যাল মিডিয়া পোস্ট</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">প্ল্যাটফর্ম</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <Badge key={p.id} variant={(smConfig.platforms || []).includes(p.id) ? 'default' : 'outline'} className="cursor-pointer gap-1.5 text-[10px] py-1 px-2.5 transition-all hover:scale-105" onClick={() => togglePlatform(p.id)}>
                        <p.icon className="w-3 h-3" /> {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">পোস্ট টেমপ্লেট</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {AVAILABLE_VARIABLES.slice(0, 5).map(v => (
                      <Badge key={v.key} variant="outline" className="cursor-pointer text-[9px] hover:bg-primary/10 gap-0.5 py-0" onClick={() => {
                        const current = smConfig.template_bn || '';
                        smSetting && updateSetting.mutate({ id: smSetting.id, setting_value: { ...smConfig, template_bn: current + v.key } });
                      }}>
                        {v.icon} {v.key}
                      </Badge>
                    ))}
                  </div>
                  <Textarea value={smConfig.template_bn || ''} onChange={e => smSetting && updateSetting.mutate({ id: smSetting.id, setting_value: { ...smConfig, template_bn: e.target.value } })} rows={3} placeholder="📚 নতুন বই: {{product_name}} ..." className="font-mono text-sm" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Bell className="w-5 h-5 text-accent" /> অটো ইমেইল নোটিফিকেশন</span>
                  {emailSetting && <Switch checked={emailSetting.is_active && emailConfig.enabled} onCheckedChange={(checked) => updateSetting.mutate({ id: emailSetting.id, is_active: checked, setting_value: { ...emailConfig, enabled: checked } })} />}
                </CardTitle>
                <CardDescription>সাবস্ক্রাইবারদের নতুন পণ্যের ইমেইল</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">ইমেইল সাবজেক্ট</Label>
                  <Input value={emailConfig.template_subject || ''} onChange={e => emailSetting && updateSetting.mutate({ id: emailSetting.id, setting_value: { ...emailConfig, template_subject: e.target.value } })} placeholder="🆕 নতুন পণ্য: {{product_name}}" className="mt-1.5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Grid */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  { label: 'হ্যাশট্যাগ গ্রুপ', value: hashtagGroups.length, icon: Hash, color: 'text-blue-500' },
                  { label: 'টেমপ্লেট', value: templates.length, icon: Layers, color: 'text-purple-500' },
                  { label: 'অটো রুলস', value: automationRules.length, icon: Zap, color: 'text-orange-500' },
                  { label: 'অ্যাক্টিভ রুলস', value: automationRules.filter((r: any) => r.is_active).length, icon: Check, color: 'text-green-500' },
                  { label: 'মোট এক্সিকিউশন', value: automationLogs.length, icon: Activity, color: 'text-primary' },
                  { label: 'সাফল্যের হার', value: `${logStats.successRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30">
                    <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shadow-sm">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div><p className="text-lg font-bold leading-tight">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HASHTAGS */}
      {activeSubTab === 'hashtags' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> {editingGroup ? 'গ্রুপ এডিট' : 'নতুন হ্যাশট্যাগ গ্রুপ'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">গ্রুপের নাম</Label>
                <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="যেমন: বই প্রচার" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">হ্যাশট্যাগসমূহ (কমা দিয়ে আলাদা)</Label>
                <Textarea value={newGroupTags} onChange={e => setNewGroupTags(e.target.value)} placeholder="নতুন_বই, বইআলো, পড়ুন, বাংলা_বই" rows={3} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveHashtagGroup.mutate()} disabled={!newGroupName || !newGroupTags || saveHashtagGroup.isPending} className="flex-1">
                  {editingGroup ? 'আপডেট করুন' : 'সেভ করুন'}
                </Button>
                {editingGroup && <Button variant="outline" onClick={() => { setEditingGroup(null); setNewGroupName(''); setNewGroupTags(''); }}>বাতিল</Button>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">সেভড গ্রুপ ({hashtagGroups.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {hashtagGroups.map((g: any) => (
                    <div key={g.id} className={`p-3 border rounded-xl space-y-2 transition-all hover:shadow-sm ${g.is_default ? 'border-primary/40 bg-primary/5' : 'border-border/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{g.name}</span>
                          {g.is_default && <Badge className="text-[9px]">ডিফল্ট</Badge>}
                        </div>
                        <div className="flex gap-0.5">
                          {!g.is_default && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDefaultGroup.mutate(g.id)}><Check className="w-3.5 h-3.5" /></Button>}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingGroup(g); setNewGroupName(g.name); setNewGroupTags((g.hashtags || []).join(', ')); }}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deleteHashtagGroup.mutate(g.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(g.hashtags || []).map((tag: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">#{tag}</Badge>)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">ব্যবহার: {g.use_count || 0} বার</p>
                    </div>
                  ))}
                  {hashtagGroups.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">কোনো গ্রুপ নেই</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="টেমপ্লেট খুঁজুন..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={templateFilterType} onValueChange={setTemplateFilterType}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব টাইপ</SelectItem>
                  {TEMPLATE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => { resetTemplateForm(); setShowTemplateForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> নতুন টেমপ্লেট
            </Button>
          </div>

          {/* Template Form */}
          {showTemplateForm && (
            <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {editingTemplate ? <Edit className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editingTemplate ? 'টেমপ্লেট এডিট' : 'নতুন টেমপ্লেট তৈরি'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label className="text-sm">নাম *</Label><Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="যেমন: নতুন বই পোস্ট" className="mt-1" /></div>
                  <div><Label className="text-sm">টাইপ</Label>
                    <Select value={tplType} onValueChange={setTplType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div><Label className="text-sm">হ্যাশট্যাগ গ্রুপ</Label>
                    <Select value={tplHashtagGroup || 'none'} onValueChange={v => setTplHashtagGroup(v === 'none' ? '' : v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">কোনোটি নয়</SelectItem>{hashtagGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} ({(g.hashtags || []).length})</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>

                <Input value={tplDescription} onChange={e => setTplDescription(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক) - এই টেমপ্লেটটি কখন ব্যবহার করবেন..." />

                {/* Product Selector */}
                <ProductSelectorInline
                  selectedProduct={tplSelectedProduct}
                  onSelect={tplSelectProduct}
                  onClear={() => setTplSelectedProduct(null)}
                  selector={tplSelector}
                  showSelector={tplShowProductSelector}
                  setShowSelector={setTplShowProductSelector}
                />

                {/* Dynamic Variables */}
                <DynamicVariableToolbar
                  selectedProduct={tplSelectedProduct}
                  onInsert={(val) => insertToTextarea(tplContentRef, val, tplContent, setTplContent)}
                  staticOnly={!tplSelectedProduct}
                />

                {/* Single Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-medium">কন্টেন্ট *</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowPreview(!showPreview)}>
                      <Eye className="w-3 h-3" /> {showPreview ? 'এডিটর' : 'প্রিভিউ'}
                    </Button>
                  </div>
                  {!showPreview ? (
                    <Textarea ref={tplContentRef} value={tplContent} onChange={e => setTplContent(e.target.value)} rows={6} className="font-mono text-sm" placeholder="📚 নতুন বই!\n\n{{product_name}}\n✍️ {{author}}\n💰 মূল্য: {{price}}\n\n👉 {{link}}" />
                  ) : (
                    <div className="border rounded-xl p-4 bg-muted/20 min-h-[150px] text-sm whitespace-pre-line">{getPreviewContent()}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">প্ল্যাটফর্ম</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.map(p => (
                        <Badge key={p.id} variant={tplPlatforms.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] gap-1 py-1 transition-all hover:scale-105" onClick={() => setTplPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                          <p.icon className="w-3 h-3" /> {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-4">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludeImage} onCheckedChange={c => setTplIncludeImage(!!c)} /> 📷 ছবি</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludePrice} onCheckedChange={c => setTplIncludePrice(!!c)} /> 💰 মূল্য</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludeLink} onCheckedChange={c => setTplIncludeLink(!!c)} /> 🔗 লিংক</label>
                  </div>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button onClick={() => saveTemplate.mutate()} disabled={!tplName || !tplContent || saveTemplate.isPending}>
                    {saveTemplate.isPending && <RefreshCw className="w-4 h-4 mr-1 animate-spin" />}
                    {editingTemplate ? 'আপডেট করুন' : 'সেভ করুন'}
                  </Button>
                  <Button variant="outline" onClick={resetTemplateForm}>বাতিল</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t: any) => {
              const hGroup = hashtagGroups.find((g: any) => g.id === t.hashtag_group_id);
              return (
                <Card key={t.id} className={`group transition-all hover:shadow-lg hover:-translate-y-0.5 ${!t.is_active ? 'opacity-50 grayscale' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm truncate">{t.name}</h4>
                          <Badge variant="outline" className="text-[9px] shrink-0">{TEMPLATE_TYPES.find(x => x.id === t.template_type)?.label || t.template_type}</Badge>
                        </div>
                        {t.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                      </div>
                      <Switch checked={t.is_active !== false} onCheckedChange={checked => toggleTemplate.mutate({ id: t.id, active: checked })} />
                    </div>
                    {t.content_bn && (
                      <div className="bg-muted/30 rounded-lg p-2.5 border border-border/30">
                        <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-line">{t.content_bn}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {(t.platforms || []).map((pid: string) => { const plat = PLATFORMS.find(x => x.id === pid); return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null; })}
                      </div>
                      <div className="flex items-center gap-1">
                        {t.include_image && <span className="text-[10px]">📷</span>}
                        {t.include_price && <span className="text-[10px]">💰</span>}
                        {t.include_link && <span className="text-[10px]">🔗</span>}
                      </div>
                    </div>
                    {hGroup && <div className="flex flex-wrap gap-1">{(hGroup.hashtags || []).slice(0, 4).map((tag: string, i: number) => <span key={i} className="text-[10px] text-primary">#{tag}</span>)}{(hGroup.hashtags || []).length > 4 && <span className="text-[10px] text-muted-foreground">+{(hGroup.hashtags || []).length - 4}</span>}</div>}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">ব্যবহার: {t.use_count || 0} বার</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editTemplateAction(t)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTemplate.mutate(t)}><Copy className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছতে চান?')) deleteTemplate.mutate(t.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredTemplates.length === 0 && !showTemplateForm && (
              <Card className="md:col-span-3"><CardContent className="p-12 text-center"><Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground font-medium">কোনো টেমপ্লেট পাওয়া যায়নি</p></CardContent></Card>
            )}
          </div>
        </div>
      )}

      {/* RULES */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব রুল</SelectItem>
                  <SelectItem value="active">অ্যাক্টিভ</SelectItem>
                  <SelectItem value="inactive">ইন্যাক্টিভ</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs py-1">দেখাচ্ছে: {filteredRules.length}/{automationRules.length}</Badge>
            </div>
            <Button size="sm" onClick={() => { resetRuleForm(); setShowRuleForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> নতুন রুল
            </Button>
          </div>

          {/* Rule Form - Enhanced with Product Selector */}
          {showRuleForm && (
            <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  {editingRule ? 'রুল এডিট করুন' : 'নতুন অটোমেশন রুল'}
                </CardTitle>
                <CardDescription>ট্রিগার ইভেন্টে স্বয়ংক্রিয়ভাবে পোস্ট ও নোটিফিকেশন পাঠান</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label className="text-sm">রুলের নাম *</Label><Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="যেমন: নতুন বই অটো পোস্ট" className="mt-1" /></div>
                  <div><Label className="text-sm">ট্রিগার *</Label>
                    <Select value={ruleTrigger} onValueChange={setRuleTrigger}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TRIGGER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div><Label className="text-sm">প্রায়োরিটি</Label><Input type="number" value={rulePriority} onChange={e => setRulePriority(Number(e.target.value))} min={0} max={100} className="mt-1" placeholder="0-100" /></div>
                </div>

                {/* Template & Hashtag */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label className="text-sm">কন্টেন্ট টেমপ্লেট</Label>
                    <Select value={ruleTemplate || 'none'} onValueChange={v => setRuleTemplate(v === 'none' ? '' : v)}><SelectTrigger className="mt-1"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger><SelectContent><SelectItem value="none">ডিফল্ট ব্যবহার হবে</SelectItem>{templates.filter((t: any) => t.is_active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>📝 {t.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div><Label className="text-sm">হ্যাশট্যাগ গ্রুপ</Label>
                    <Select value={ruleHashtagGroup || 'none'} onValueChange={v => setRuleHashtagGroup(v === 'none' ? '' : v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">কোনোটি নয়</SelectItem>{hashtagGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>#️⃣ {g.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <Label className="text-sm mb-1.5 block">প্ল্যাটফর্ম</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <Badge key={p.id} variant={rulePlatforms.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] gap-1 py-1 transition-all hover:scale-105" onClick={() => setRulePlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                        <p.icon className="w-3 h-3" /> {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Product/Category Selector for Rule - NEW */}
                <ProductSelectorInline
                  selectedProduct={ruleSelectedProduct}
                  onSelect={ruleSelectProduct}
                  onClear={() => { setRuleSelectedProduct(null); setRuleContent(''); }}
                  selector={ruleSelector}
                  showSelector={ruleShowProductSelector}
                  setShowSelector={setRuleShowProductSelector}
                />

                {/* Dynamic Variable Toolbar for Rule - NEW */}
                <DynamicVariableToolbar
                  selectedProduct={ruleSelectedProduct}
                  onInsert={(val) => insertToTextarea(ruleContentRef, val, ruleContent, setRuleContent)}
                  staticOnly={!ruleSelectedProduct}
                />

                {/* Rule Custom Content - NEW */}
                {ruleSelectedProduct && (
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">কাস্টম কন্টেন্ট (ঐচ্ছিক - প্রিভিউ)</Label>
                    <Textarea ref={ruleContentRef} value={ruleContent} onChange={e => setRuleContent(e.target.value)} rows={4} className="font-mono text-sm" placeholder="📚 {{product_name}} - এখন পাওয়া যাচ্ছে!\n💰 মূল্য: {{price}}" />
                  </div>
                )}

                <Separator />

                {/* Schedule Window */}
                <div>
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> শিডিউল উইন্ডো</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">সক্রিয় দিন</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {DAYS_OF_WEEK.map(d => (
                          <Badge key={d.id} variant={ruleScheduleDays.includes(d.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] py-0.5 transition-all" onClick={() => setRuleScheduleDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}>
                            {d.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div><Label className="text-[11px] text-muted-foreground">শুরু সময়</Label><Input type="time" value={ruleTimeStart} onChange={e => setRuleTimeStart(e.target.value)} className="mt-1" /></div>
                    <div><Label className="text-[11px] text-muted-foreground">শেষ সময়</Label><Input type="time" value={ruleTimeEnd} onChange={e => setRuleTimeEnd(e.target.value)} className="mt-1" /></div>
                  </div>
                </div>

                {/* Execution Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-sm">ডিলে (মিনিট)</Label><Input type="number" value={ruleDelay} onChange={e => setRuleDelay(Number(e.target.value))} min={0} className="mt-1" /></div>
                  <div><Label className="text-sm">দৈনিক সর্বোচ্চ</Label><Input type="number" value={ruleMaxExec ?? ''} onChange={e => setRuleMaxExec(e.target.value ? Number(e.target.value) : null)} min={0} className="mt-1" placeholder="সীমাহীন" /></div>
                  <label className="flex items-center gap-2 text-sm pt-6"><Checkbox checked={ruleSendEmail} onCheckedChange={c => setRuleSendEmail(!!c)} /> 📧 ইমেইল</label>
                  <label className="flex items-center gap-2 text-sm pt-6"><Checkbox checked={ruleSendSms} onCheckedChange={c => setRuleSendSms(!!c)} /> 📱 SMS</label>
                </div>

                {/* Conditions */}
                <div>
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> কন্ডিশন</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CONDITION_TYPES.map(cond => (
                      <div key={cond.id} className="flex items-center gap-2">
                        {cond.type === 'boolean' ? (
                          <label className="flex items-center gap-2 text-xs"><Checkbox checked={!!ruleConditions[cond.id]} onCheckedChange={c => setRuleConditions((prev: any) => ({ ...prev, [cond.id]: !!c }))} />{cond.label}</label>
                        ) : (
                          <div className="flex-1"><Label className="text-[11px] text-muted-foreground">{cond.label}</Label><Input type={cond.type} value={ruleConditions[cond.id] || ''} onChange={e => setRuleConditions((prev: any) => ({ ...prev, [cond.id]: e.target.value }))} className="h-8 text-xs mt-0.5" /></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button onClick={() => saveRule.mutate()} disabled={!ruleName || saveRule.isPending}>
                    {saveRule.isPending && <RefreshCw className="w-4 h-4 mr-1 animate-spin" />}
                    {editingRule ? 'আপডেট করুন' : 'সেভ করুন'}
                  </Button>
                  <Button variant="outline" onClick={resetRuleForm}>বাতিল</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          <div className="space-y-2">
            {filteredRules.map((r: any) => {
              const trigger = TRIGGER_TYPES.find(t => t.id === r.trigger_type);
              const tpl = templates.find((t: any) => t.id === r.template_id);
              const hGroup = hashtagGroups.find((g: any) => g.id === r.hashtag_group_id);
              const totalExec = (r.success_count || 0) + (r.fail_count || 0);
              const successRate = totalExec > 0 ? Math.round(((r.success_count || 0) / totalExec) * 100) : 0;
              return (
                <Card key={r.id} className={`group transition-all hover:shadow-lg hover:-translate-y-0.5 ${!r.is_active ? 'opacity-40' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-lg">{trigger?.icon || '🔔'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{r.name}</h4>
                            <Badge variant="outline" className="text-[9px]">{trigger?.label || r.trigger_type}</Badge>
                            {r.priority > 0 && <Badge variant="secondary" className="text-[9px]">P{r.priority}</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {tpl && <Badge variant="secondary" className="text-[9px] gap-0.5">📝 {tpl.name}</Badge>}
                            {hGroup && <Badge variant="secondary" className="text-[9px] gap-0.5">#️⃣ {hGroup.name}</Badge>}
                            {r.delay_minutes > 0 && <Badge variant="secondary" className="text-[9px]">⏱️ {r.delay_minutes}মি.</Badge>}
                            {r.send_email && <Badge variant="secondary" className="text-[9px]">📧</Badge>}
                            {r.send_sms && <Badge variant="secondary" className="text-[9px]">📱</Badge>}
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            {(r.platforms || []).map((pid: string) => { const plat = PLATFORMS.find(x => x.id === pid); return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null; })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Switch checked={r.is_active} onCheckedChange={checked => toggleRule.mutate({ id: r.id, active: checked })} />
                        <div className="text-right">
                          <p className="text-xs font-medium">{r.trigger_count || 0} বার</p>
                          {totalExec > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Progress value={successRate} className="w-16 h-1.5" />
                              <span className="text-[9px] text-muted-foreground">{successRate}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editRuleAction(r)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateRule.mutate(r)}><Copy className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছতে চান?')) deleteRule.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredRules.length === 0 && !showRuleForm && (
              <Card><CardContent className="p-12 text-center"><Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground font-medium">কোনো রুল পাওয়া যায়নি</p></CardContent></Card>
            )}
          </div>
        </div>
      )}

      {/* LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'মোট', value: logStats.total, icon: Activity, color: 'text-primary' },
              { label: 'সফল', value: logStats.success, icon: Check, color: 'text-green-600' },
              { label: 'ব্যর্থ', value: logStats.failed, icon: X, color: 'text-red-500' },
              { label: 'স্কিপ', value: logStats.skipped, icon: AlertCircle, color: 'text-yellow-500' },
              { label: 'সাফল্য', value: `${logStats.successRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                  <div><p className="text-lg font-bold leading-tight">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="পণ্যের নাম দিয়ে খুঁজুন..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-9 h-9" /></div>
                <Select value={logStatusFilter} onValueChange={setLogStatusFilter}><SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সব</SelectItem><SelectItem value="success">✓ সফল</SelectItem><SelectItem value="failed">✗ ব্যর্থ</SelectItem><SelectItem value="skipped">⏭ স্কিপ</SelectItem></SelectContent></Select>
                <Select value={logTriggerFilter} onValueChange={setLogTriggerFilter}><SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সব ট্রিগার</SelectItem>{TRIGGER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}</SelectContent></Select>
                <Select value={logDateRange} onValueChange={(v: any) => setLogDateRange(v)}><SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সব সময়</SelectItem><SelectItem value="today">আজ</SelectItem><SelectItem value="7d">৭ দিন</SelectItem><SelectItem value="30d">৩০ দিন</SelectItem></SelectContent></Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> এক্সিকিউশন লগ</span>
                <Badge variant="outline" className="text-xs">{filteredLogs.length}/{automationLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">তারিখ</TableHead>
                      <TableHead>ট্রিগার</TableHead>
                      <TableHead>পণ্য</TableHead>
                      <TableHead>প্ল্যাটফর্ম</TableHead>
                      <TableHead className="text-center">স্ট্যাটাস</TableHead>
                      <TableHead>বিবরণ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log: any) => {
                      const trigger = TRIGGER_TYPES.find(t => t.id === log.trigger_type);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap font-mono">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[9px] gap-0.5"><span>{trigger?.icon}</span> {trigger?.label || log.trigger_type}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate font-medium">{log.product_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">{(log.platforms_posted || []).map((pid: string) => { const plat = PLATFORMS.find(x => x.id === pid); return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null; })}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={log.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : log.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'} variant="outline">
                              {log.status === 'success' ? '✓ সফল' : log.status === 'failed' ? '✗ ব্যর্থ' : '⏭ স্কিপ'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                            {log.error_message ? <span className="text-red-500 truncate block" title={log.error_message}>{log.error_message}</span> : log.execution_time_ms ? <span>{log.execution_time_ms}ms</span> : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-12"><AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" /><p className="text-muted-foreground">কোনো লগ পাওয়া যায়নি</p></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ======================== MAIN COMPONENT ========================
const AdminSocialMedia = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [postContent, setPostContent] = useState('');
  const postContentRef = useRef<HTMLTextAreaElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postHashtags, setPostHashtags] = useState('');
  const [postLink, setPostLink] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Product/Category selector
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const composerSelector = useProductCategorySelector('composer');

  // Image upload
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState('all');

  // Post detail dialog
  const [viewingPost, setViewingPost] = useState<any>(null);
  const [viewingPublishHistory, setViewingPublishHistory] = useState<any>(null);

  // Account form
  const [accPlatform, setAccPlatform] = useState('');
  const [accName, setAccName] = useState('');
  const [accToken, setAccToken] = useState('');
  const [accPageId, setAccPageId] = useState('');
  const [accChannelId, setAccChannelId] = useState('');

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => { const { data } = await supabase.from('social_media_accounts').select('*').order('created_at', { ascending: false }); return data || []; }
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => { const { data } = await supabase.from('social_media_posts').select('*').order('created_at', { ascending: false }).limit(200); return data || []; }
  });

  const { data: postResults = [] } = useQuery({
    queryKey: ['social-post-results'],
    queryFn: async () => { const { data } = await supabase.from('social_media_post_results').select('*').order('created_at', { ascending: false }).limit(500); return data || []; }
  });

  const { data: publishHistory = [] } = useQuery({
    queryKey: ['social-publish-history'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('social_media_publish_history').select('*').order('published_at', { ascending: false }).limit(200);
      return data || [];
    }
  });

  const { data: composerHashtagGroups = [] } = useQuery({
    queryKey: ['saved-hashtag-groups'],
    queryFn: async () => { // @ts-ignore
      const { data } = await supabase.from('saved_hashtag_groups').select('*').order('use_count', { ascending: false }); return data || []; }
  });

  const { data: composerTemplates = [] } = useQuery({
    queryKey: ['social-post-templates'],
    queryFn: async () => { // @ts-ignore
      const { data } = await supabase.from('social_post_templates').select('*').eq('is_active', true).order('use_count', { ascending: false }); return data || []; }
  });

  const filteredPosts = useMemo(() => posts.filter(p => {
    if (historyStatusFilter !== 'all' && p.status !== historyStatusFilter) return false;
    if (historyPlatformFilter !== 'all' && !(p.platforms || []).includes(historyPlatformFilter)) return false;
    if (historySearch) { const s = historySearch.toLowerCase(); if (!(p.content || '').toLowerCase().includes(s) && !(p.content_bn || '').toLowerCase().includes(s)) return false; }
    return true;
  }), [posts, historyStatusFilter, historyPlatformFilter, historySearch]);

  const dynamicProductVars = useMemo(() => buildDynamicVars(selectedProduct), [selectedProduct]);

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('social-media').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('social-media').getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }
      setMediaUrls(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length}টি ছবি আপলোড হয়েছে`);
    } catch (err) { console.error(err); toast.error('ছবি আপলোড করতে ব্যর্থ'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const removeMedia = (url: string) => setMediaUrls(prev => prev.filter(u => u !== url));

  // Mutations
  const saveAccount = useMutation({
    mutationFn: async () => {
      if (editingAccount) {
        const updateData: any = { platform: accPlatform, account_name: accName, page_id: accPageId || null, channel_id: accChannelId || null };
        if (accToken) updateData.access_token = accToken;
        const { error } = await supabase.from('social_media_accounts').update(updateData).eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('social_media_accounts').insert({ platform: accPlatform, account_name: accName, access_token: accToken || null, page_id: accPageId || null, channel_id: accChannelId || null });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editingAccount ? 'আপডেট হয়েছে' : 'যোগ হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); setShowAccountDialog(false); resetAccountForm(); },
    onError: () => toast.error('সেভ ব্যর্থ'),
  });

  const toggleAccount = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => { const { error } = await supabase.from('social_media_accounts').update({ is_active: active }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('social_media_accounts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); },
  });

  const savePost = useMutation({
    mutationFn: async (status: string) => {
      const postData: any = {
        content: postContent, content_bn: postContent, platforms: selectedPlatforms,
        hashtags: postHashtags ? postHashtags.split(',').map(h => h.trim()) : [],
        link_url: postLink || null, media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        product_id: selectedProduct?.id || null, post_type: selectedProduct ? selectedProduct.type : null,
        status, scheduled_at: status === 'scheduled' && scheduleDate ? new Date(scheduleDate).toISOString() : null,
      };
      if (editingPost) {
        const { error } = await supabase.from('social_media_posts').update(postData).eq('id', editingPost.id);
        if (error) throw error;
        if (status === 'published') {
          await supabase.from('social_media_post_results').delete().eq('post_id', editingPost.id);
          const results = selectedPlatforms.map(platform => ({ post_id: editingPost.id, platform, status: 'pending', account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null }));
          await supabase.from('social_media_post_results').insert(results);
          try { await supabase.functions.invoke('social-media-post', { body: { post_id: editingPost.id } }); } catch (e) { console.error(e); }
        }
      } else {
        const { data, error } = await supabase.from('social_media_posts').insert(postData).select().single();
        if (error) throw error;
        if (data && (status === 'published' || status === 'scheduled')) {
          const results = selectedPlatforms.map(platform => ({ post_id: data.id, platform, status: 'pending', account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null }));
          await supabase.from('social_media_post_results').insert(results);
        }
        if (status === 'published' && data) { try { await supabase.functions.invoke('social-media-post', { body: { post_id: data.id } }); } catch (e) { console.error(e); } }
      }
    },
    onSuccess: (_, status) => {
      toast.success(status === 'draft' ? 'ড্রাফট সেভ হয়েছে' : status === 'scheduled' ? 'শিডিউল সেট হয়েছে' : 'পোস্ট পাবলিশ হচ্ছে');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] }); queryClient.invalidateQueries({ queryKey: ['social-post-results'] }); resetComposer();
    },
    onError: () => toast.error('পোস্ট সেভ ব্যর্থ'),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => { await supabase.from('social_media_post_results').delete().eq('post_id', id); const { error } = await supabase.from('social_media_posts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-posts'] }); queryClient.invalidateQueries({ queryKey: ['social-post-results'] }); },
  });

  const retryPost = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from('social_media_post_results').update({ status: 'pending', error_message: null }).eq('post_id', postId).eq('status', 'failed');
      await supabase.from('social_media_posts').update({ status: 'published' }).eq('id', postId);
      await supabase.functions.invoke('social-media-post', { body: { post_id: postId } });
    },
    onSuccess: () => { toast.success('পুনরায় পোস্ট হচ্ছে'); queryClient.invalidateQueries({ queryKey: ['social-posts'] }); queryClient.invalidateQueries({ queryKey: ['social-post-results'] }); },
    onError: () => toast.error('রিট্রাই ব্যর্থ'),
  });

  const resetComposer = () => { setPostContent(''); setSelectedPlatforms([]); setPostHashtags(''); setPostLink(''); setScheduleDate(''); setEditingPost(null); setSelectedProduct(null); setMediaUrls([]); };
  const resetAccountForm = () => { setAccPlatform(''); setAccName(''); setAccToken(''); setAccPageId(''); setAccChannelId(''); setEditingAccount(null); };

  const editAccount = (acc: any) => { setEditingAccount(acc); setAccPlatform(acc.platform); setAccName(acc.account_name || ''); setAccToken(''); setAccPageId(acc.page_id || ''); setAccChannelId(acc.channel_id || ''); setShowAccountDialog(true); };
  const editPost = (post: any) => { setEditingPost(post); setPostContent(post.content_bn || post.content || ''); setSelectedPlatforms(post.platforms || []); setPostHashtags((post.hashtags || []).join(', ')); setPostLink(post.link_url || ''); setMediaUrls(post.media_urls || []); setScheduleDate(post.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : ''); setSelectedProduct(null); };
  const duplicatePost = (post: any) => { setEditingPost(null); setPostContent(post.content_bn || post.content || ''); setSelectedPlatforms(post.platforms || []); setPostHashtags((post.hashtags || []).join(', ')); setPostLink(post.link_url || ''); setMediaUrls(post.media_urls || []); setScheduleDate(''); setSelectedProduct(null); toast.info('পোস্ট কপি হয়েছে'); };

  const selectProduct = (product: any, type: 'book' | 'universal') => {
    const imgUrl = product.images?.[0] || null;
    const name = type === 'book' ? (product.title_bn || product.title_en) : (product.name_bn || product.name_en);
    const url = type === 'book' ? `${BASE_URL}/product/${product.slug}` : `${BASE_URL}/universal-product/${product.slug}`;
    setSelectedProduct({ ...product, type, image_url: imgUrl, _resolved_name: name, _resolved_url: url });
    setPostLink(url);
    if (imgUrl && !mediaUrls.includes(imgUrl)) setMediaUrls(prev => [...prev, imgUrl]);
    if (!postContent) setPostContent(`📚 ${name}\n💰 মূল্য: ৳${product.price}\n\n🛒 এখনই অর্ডার করুন!\n🔗 ${url}`);
    setShowProductSelector(false);
    toast.success('প্রোডাক্ট সিলেক্ট হয়েছে');
  };

  const selectCategory = (cat: any, type: 'book' | 'universal') => {
    const name = cat.name_bn || cat.name_en;
    const url = type === 'book' ? `${BASE_URL}/categories/${cat.slug}` : `${BASE_URL}/category/${cat.product_type}/${cat.slug}`;
    setPostLink(url);
    setSelectedProduct({ id: cat.id, type: `category-${type}`, name_bn: name, image_url: cat.image_url, slug: cat.slug, _resolved_name: name, _resolved_url: url });
    if (cat.image_url && !mediaUrls.includes(cat.image_url)) setMediaUrls(prev => [...prev, cat.image_url]);
    if (!postContent) setPostContent(`📂 ${name} ক্যাটাগরি\n\n🛒 সব পণ্য দেখুন!\n🔗 ${url}`);
    setShowProductSelector(false);
    toast.success('ক্যাটাগরি সিলেক্ট হয়েছে');
  };

  // Analytics
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const scheduledPosts = posts.filter(p => p.status === 'scheduled').length;
  const totalLikes = postResults.reduce((s, r) => s + (r.likes_count || 0), 0);
  const totalComments = postResults.reduce((s, r) => s + (r.comments_count || 0), 0);
  const totalShares = postResults.reduce((s, r) => s + (r.shares_count || 0), 0);
  const totalViews = postResults.reduce((s, r) => s + (r.views_count || 0), 0);
  const platformPostCount = PLATFORMS.map(p => ({ name: p.name, count: postResults.filter(r => r.platform === p.id).length, color: p.color })).filter(p => p.count > 0);
  const getResultsForPost = (postId: string) => postResults.filter(r => r.post_id === postId);

  const printReport = () => {
    const pw = window.open('', '_blank'); if (!pw) return;
    pw.document.write(`<html><head><title>Social Media Report</title><style>body{font-family:'Hind Siliguri',sans-serif;padding:30px}h1{text-align:center}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.stat{background:#f5f5f5;padding:14px;border-radius:8px;text-align:center}.stat .v{font-size:24px;font-weight:700;color:#e53e3e}.stat .l{font-size:11px;color:#666}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f5f5f5}@media print{body{padding:10px}}</style></head><body><h1>📱 সোশ্যাল মিডিয়া রিপোর্ট</h1><p style="text-align:center;color:#666">${format(new Date(), 'dd/MM/yyyy')}</p><div class="grid"><div class="stat"><div class="v">${totalPosts}</div><div class="l">মোট পোস্ট</div></div><div class="stat"><div class="v">${publishedPosts}</div><div class="l">পাবলিশড</div></div><div class="stat"><div class="v">${totalViews}</div><div class="l">মোট ভিউ</div></div><div class="stat"><div class="v">${totalLikes}</div><div class="l">মোট লাইক</div></div></div><h3>সাম্প্রতিক পোস্ট</h3><table><tr><th>তারিখ</th><th>কন্টেন্ট</th><th>প্ল্যাটফর্ম</th><th>স্ট্যাটাস</th></tr>${posts.slice(0, 30).map(p => `<tr><td>${format(new Date(p.created_at), 'dd/MM/yy')}</td><td>${(p.content || '').substring(0, 80)}...</td><td>${(p.platforms || []).join(', ')}</td><td>${statusLabels[p.status] || p.status}</td></tr>`).join('')}</table></body></html>`);
    pw.document.close(); pw.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Send className="w-4 h-4 text-primary" /></div>
              সোশ্যাল মিডিয়া ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">সব সোশ্যাল মিডিয়া এক জায়গা থেকে কন্ট্রোল করুন</p>
          </div>
          <Button variant="outline" onClick={printReport} size="sm"><Printer className="w-4 h-4 mr-1.5" /> রিপোর্ট</Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: Send, label: 'মোট পোস্ট', value: totalPosts, color: 'text-primary' },
            { icon: Check, label: 'পাবলিশড', value: publishedPosts, color: 'text-green-600' },
            { icon: Calendar, label: 'শিডিউল', value: scheduledPosts, color: 'text-blue-500' },
            { icon: Eye, label: 'মোট ভিউ', value: totalViews, color: 'text-purple-500' },
            { icon: Heart, label: 'লাইক', value: totalLikes, color: 'text-red-500' },
            { icon: MessageSquare, label: 'কমেন্ট', value: totalComments, color: 'text-orange-500' },
            { icon: Share2, label: 'শেয়ার', value: totalShares, color: 'text-cyan-500' },
          ].map((kpi, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-lg bg-muted mx-auto mb-1.5 flex items-center justify-center">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/60 p-1 border border-border/50">
            <TabsTrigger value="compose" className="gap-1.5"><Send className="w-3.5 h-3.5" /> পোস্ট</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> হিস্ট্রি</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> অ্যাকাউন্ট</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> অ্যানালিটিক্স</TabsTrigger>
            <TabsTrigger value="automation" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> অটোমেশন</TabsTrigger>
          </TabsList>

          {/* COMPOSE TAB */}
          <TabsContent value="compose">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                {editingPost && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <Edit className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">এডিট মোড</span>
                    <Badge variant="outline" className="ml-auto">{statusLabels[editingPost.status]}</Badge>
                    <Button variant="ghost" size="sm" onClick={resetComposer}><X className="w-4 h-4" /></Button>
                  </div>
                )}

                <Card className="bg-gradient-to-br from-background to-muted/20 border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> পোস্ট কম্পোজার</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Product Selector */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm font-semibold"><Package className="w-4 h-4 text-primary" /> প্রোডাক্ট / ক্যাটাগরি</Label>
                      {selectedProduct ? (
                        <div className="flex items-center gap-3 p-3 border-2 border-primary/20 rounded-xl bg-primary/5">
                          {selectedProduct.image_url ? <img src={selectedProduct.image_url} alt="" className="w-14 h-14 object-cover rounded-lg shadow-sm" /> : <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{selectedProduct._resolved_name || selectedProduct.title_bn || selectedProduct.name_bn}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">{selectedProduct.type === 'book' ? '📚 বই' : selectedProduct.type === 'universal' ? '🛍️ প্রোডাক্ট' : '📂 ক্যাটাগরি'}</Badge>
                              {selectedProduct.price && <span className="text-xs text-muted-foreground">৳{selectedProduct.price}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setSelectedProduct(null); setPostLink(''); }}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => { setShowProductSelector(true); composerSelector.setProductSearch(''); composerSelector.setSelectorTab('books'); }}>
                          <Search className="w-4 h-4 mr-2 text-primary" /> প্রোডাক্ট বা ক্যাটাগরি খুঁজুন
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Quick Templates */}
                    {composerTemplates.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-sm font-semibold"><Layers className="w-3.5 h-3.5 text-primary" /> দ্রুত টেমপ্লেট</Label>
                        <div className="flex flex-wrap gap-1">
                          {composerTemplates.slice(0, 6).map((t: any) => (
                            <Badge key={t.id} variant="outline" className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5 transition-colors" onClick={() => {
                              if (t.content_bn) setPostContent(t.content_bn);
                              if (t.platforms?.length) setSelectedPlatforms(t.platforms);
                              if (t.hashtag_group_id) { const group = composerHashtagGroups.find((g: any) => g.id === t.hashtag_group_id); if (group) setPostHashtags((group.hashtags || []).map((h: string) => `#${h}`).join(', ')); }
                              // @ts-ignore
                              supabase.from('social_post_templates').update({ use_count: (t.use_count || 0) + 1 }).eq('id', t.id).then(() => {});
                              toast.success(`টেমপ্লেট "${t.name}" প্রয়োগ হয়েছে`);
                            }}>
                              <Copy className="w-2.5 h-2.5" /> {t.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Editor */}
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm">✍️ পোস্ট কন্টেন্ট</Label>
                      <DynamicVariableToolbar selectedProduct={selectedProduct} onInsert={(val) => {
                        const textarea = postContentRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart; const end = textarea.selectionEnd;
                          const newVal = postContent.substring(0, start) + val + postContent.substring(end);
                          setPostContent(newVal);
                          setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + val.length, start + val.length); }, 50);
                        } else { setPostContent(prev => prev + val); }
                      }} />
                      <Textarea ref={postContentRef} value={postContent} onChange={e => setPostContent(e.target.value)} rows={5} className="text-sm" placeholder="আপনার পোস্ট লিখুন..." />
                      <p className="text-[10px] text-muted-foreground text-right">{postContent.length} অক্ষর</p>
                    </div>

                    {/* Platform Selection */}
                    <div>
                      <Label className="font-semibold text-sm mb-2 block">📡 প্ল্যাটফর্ম</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {PLATFORMS.map(p => {
                          const hasAccount = accounts.some(a => a.platform === p.id && a.is_active);
                          return (
                            <Badge key={p.id} variant={selectedPlatforms.includes(p.id) ? 'default' : 'outline'}
                              className={`cursor-pointer gap-1.5 text-[10px] py-1 px-2.5 transition-all hover:scale-105 ${!hasAccount ? 'opacity-50' : ''}`}
                              onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                              <p.icon className="w-3 h-3" /> {p.name}
                              {!hasAccount && <span className="text-[8px]">⚠️</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hashtags & Link */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm mb-1.5 block">হ্যাশট্যাগ</Label>
                        <div className="space-y-1.5">
                          <Input value={postHashtags} onChange={e => setPostHashtags(e.target.value)} placeholder="#বই, #পড়ুন" />
                          {composerHashtagGroups.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {composerHashtagGroups.slice(0, 4).map((g: any) => (
                                <Badge key={g.id} variant="outline" className="cursor-pointer text-[9px] hover:bg-primary/10 transition-colors" onClick={() => setPostHashtags((g.hashtags || []).map((h: string) => `#${h}`).join(', '))}>
                                  <Hash className="w-2.5 h-2.5" /> {g.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">লিংক</Label>
                        <Input value={postLink} onChange={e => setPostLink(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <Label className="text-sm mb-1.5 block">📷 মিডিয়া</Label>
                      {mediaUrls.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-2">
                          {mediaUrls.map((url, i) => (
                            <div key={i} className="relative group">
                              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                              <button onClick={() => removeMedia(url)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> {uploading ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}
                      </Button>
                    </div>

                    {/* Schedule */}
                    <div>
                      <Label className="text-sm mb-1.5 block">⏰ শিডিউল</Label>
                      <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" onClick={() => savePost.mutate('draft')} disabled={!postContent || savePost.isPending} className="gap-1.5">
                        <Edit className="w-3.5 h-3.5" /> ড্রাফট
                      </Button>
                      {scheduleDate && (
                        <Button variant="secondary" onClick={() => savePost.mutate('scheduled')} disabled={!postContent || selectedPlatforms.length === 0 || savePost.isPending} className="gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> শিডিউল
                        </Button>
                      )}
                      <Button onClick={() => savePost.mutate('published')} disabled={!postContent || selectedPlatforms.length === 0 || savePost.isPending} className="gap-1.5">
                        {savePost.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <Send className="w-3.5 h-3.5" /> {editingPost ? 'আপডেট ও পোস্ট' : 'এখনই পোস্ট'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> লাইভ প্রিভিউ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-xl p-3 bg-muted/20 min-h-[120px]">
                      {mediaUrls.length > 0 && <div className="mb-2 rounded-lg overflow-hidden"><img src={mediaUrls[0]} alt="" className="w-full h-32 object-cover" /></div>}
                      <p className="text-sm whitespace-pre-line">{postContent || <span className="text-muted-foreground italic">কন্টেন্ট লিখুন...</span>}</p>
                      {postHashtags && <p className="text-xs text-primary mt-2">{postHashtags}</p>}
                      {postLink && <p className="text-[10px] text-blue-500 mt-1 truncate">{postLink}</p>}
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {selectedPlatforms.map(pid => { const p = PLATFORMS.find(x => x.id === pid); return p ? <Badge key={pid} variant="secondary" className="text-[9px] gap-1"><p.icon className="w-3 h-3" style={{ color: p.color }} />{p.name}</Badge> : null; })}
                    </div>
                  </CardContent>
                </Card>

                {/* Connected Accounts Quick View */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">🔗 কানেক্টেড অ্যাকাউন্ট</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {accounts.filter(a => a.is_active).map(acc => {
                      const plat = PLATFORMS.find(p => p.id === acc.platform);
                      return (
                        <div key={acc.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-muted/30">
                          {plat && <plat.icon className="w-3.5 h-3.5" style={{ color: plat.color }} />}
                          <span className="truncate flex-1">{acc.account_name}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                      );
                    })}
                    {accounts.filter(a => a.is_active).length === 0 && <p className="text-xs text-muted-foreground">কোনো অ্যাক্টিভ অ্যাকাউন্ট নেই</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> পোস্ট হিস্ট্রি</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="খুঁজুন..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-9 w-48 h-9" /></div>
                    <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সব</SelectItem><SelectItem value="draft">ড্রাফট</SelectItem><SelectItem value="scheduled">শিডিউল</SelectItem><SelectItem value="published">পাবলিশড</SelectItem><SelectItem value="failed">ব্যর্থ</SelectItem></SelectContent></Select>
                    <Select value={historyPlatformFilter} onValueChange={setHistoryPlatformFilter}><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সব</SelectItem>{PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>তারিখ</TableHead><TableHead>কন্টেন্ট</TableHead><TableHead>চ্যানেল</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>পাবলিশ</TableHead><TableHead>রেজাল্ট</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredPosts.map(post => {
                      const results = getResultsForPost(post.id);
                      const postPublishHistory = publishHistory.filter((h: any) => h.post_id === post.id);
                      return (
                        <TableRow key={post.id} className="group">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(post.created_at), 'dd/MM/yy HH:mm')}
                            {post.scheduled_at && post.status === 'scheduled' && (
                              <div className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-0.5"><Calendar className="w-3 h-3" />{format(new Date(post.scheduled_at), 'dd/MM HH:mm')}</div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-center gap-2">
                              {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                              <div className="min-w-0"><p className="truncate text-sm">{post.content_bn || post.content}</p>{post.link_url && <p className="text-[10px] text-blue-500 truncate">{post.link_url}</p>}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(post.platforms || []).map((p: string) => { const plat = PLATFORMS.find(x => x.id === p); const result = results.find(r => r.platform === p); return plat ? (<div key={p} className="relative" title={`${plat.name}: ${result ? statusLabels[result.status] || result.status : 'N/A'}`}><plat.icon className="w-4 h-4" style={{ color: plat.color }} />{result?.status === 'success' && <Check className="w-2.5 h-2.5 text-green-600 absolute -bottom-1 -right-1" />}{result?.status === 'failed' && <X className="w-2.5 h-2.5 text-red-600 absolute -bottom-1 -right-1" />}</div>) : null; })}
                            </div>
                          </TableCell>
                          <TableCell><Badge className={statusColors[post.status] || ''} variant="outline">{statusLabels[post.status] || post.status}</Badge></TableCell>
                          <TableCell>
                            {(post.publish_count || 0) > 0 ? (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 font-semibold" onClick={() => setViewingPublishHistory(post)}>
                                <Activity className="w-3 h-3 text-primary" /> {post.publish_count || 0}বার
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell><div className="flex gap-2 text-xs">{results.length > 0 && (<><span className="text-green-600">{results.filter(r => r.status === 'success').length} ✓</span>{results.some(r => r.status === 'failed') && <span className="text-red-600">{results.filter(r => r.status === 'failed').length} ✗</span>}</>)}</div></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button variant="ghost" size="icon" onClick={() => setViewingPost(post)}><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => editPost(post)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => duplicatePost(post)}><Copy className="w-4 h-4" /></Button>
                              {(post.status === 'published' || post.status === 'failed') && <Button variant="ghost" size="icon" onClick={() => retryPost.mutate(post.id)} disabled={retryPost.isPending}><RotateCcw className={`w-4 h-4 text-orange-500 ${retryPost.isPending ? 'animate-spin' : ''}`} /></Button>}
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deletePost.mutate(post.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPosts.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো পোস্ট পাওয়া যায়নি</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCOUNTS TAB */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> কানেক্টেড অ্যাকাউন্ট</CardTitle>
                <Button size="sm" onClick={() => { resetAccountForm(); setShowAccountDialog(true); }}><Plus className="w-4 h-4 mr-1" /> নতুন অ্যাকাউন্ট</Button>
                <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingAccount ? '✏️ অ্যাকাউন্ট আপডেট' : '➕ নতুন অ্যাকাউন্ট'}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>প্ল্যাটফর্ম</Label><Select value={accPlatform} onValueChange={setAccPlatform}><SelectTrigger><SelectValue placeholder="সিলেক্ট" /></SelectTrigger><SelectContent>{PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label>অ্যাকাউন্ট নাম</Label><Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="যেমন: My Page" /></div>
                      <div><Label>{editingAccount ? 'নতুন API Token' : 'API Token'}</Label><Input type="password" value={accToken} onChange={e => setAccToken(e.target.value)} placeholder={editingAccount ? 'খালি রাখলে আগেরটা থাকবে' : 'Token'} /></div>
                      {['facebook', 'instagram', 'linkedin'].includes(accPlatform) && <div><Label>Page/Organization ID</Label><Input value={accPageId} onChange={e => setAccPageId(e.target.value)} /></div>}
                      {['telegram', 'whatsapp'].includes(accPlatform) && <div><Label>Channel/Chat ID</Label><Input value={accChannelId} onChange={e => setAccChannelId(e.target.value)} />{accPlatform === 'telegram' && <p className="text-xs text-muted-foreground mt-1">@channel_username অথবা -100xxxxxxx</p>}</div>}
                      <Button className="w-full" disabled={!accPlatform || !accName} onClick={() => saveAccount.mutate()}>{editingAccount ? 'আপডেট' : 'সেভ'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>প্ল্যাটফর্ম</TableHead><TableHead>অ্যাকাউন্ট</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>যোগ করা</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {accounts.map(acc => {
                      const plat = PLATFORMS.find(p => p.id === acc.platform);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell><div className="flex items-center gap-2">{plat && <plat.icon className="w-5 h-5" style={{ color: plat.color }} />}<span className="font-medium">{plat?.name || acc.platform}</span></div></TableCell>
                          <TableCell>{acc.account_name}</TableCell>
                          <TableCell><Switch checked={acc.is_active} onCheckedChange={checked => toggleAccount.mutate({ id: acc.id, active: checked })} /></TableCell>
                          <TableCell className="text-xs">{format(new Date(acc.created_at), 'dd/MM/yy')}</TableCell>
                          <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => editAccount(acc)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { if (confirm('মুছতে চান?')) deleteAccount.mutate(acc.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button></div></TableCell>
                        </TableRow>
                      );
                    })}
                    {accounts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো অ্যাকাউন্ট নেই</TableCell></TableRow>}
                  </TableBody>
                </Table>
                <div className="mt-6 p-4 bg-muted/30 rounded-xl space-y-3 border border-border/30">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> সেটআপ গাইড</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="space-y-1"><p className="font-medium text-foreground">Facebook/Instagram:</p><p>→ Meta Developer Portal থেকে Page Access Token</p></div>
                    <div className="space-y-1"><p className="font-medium text-foreground">Telegram:</p><p>→ @BotFather থেকে Bot Token</p></div>
                    <div className="space-y-1"><p className="font-medium text-foreground">Twitter/X:</p><p>→ Developer Portal থেকে Bearer Token</p></div>
                    <div className="space-y-1"><p className="font-medium text-foreground">LinkedIn:</p><p>→ Developer Portal থেকে Access Token</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> প্ল্যাটফর্ম অনুযায়ী পোস্ট</CardTitle></CardHeader>
                <CardContent>
                  {platformPostCount.length > 0 ? (
                    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={platformPostCount} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{platformPostCount.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                  ) : <p className="text-center text-muted-foreground py-8">ডেটা নেই</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> এনগেজমেন্ট সামারি</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'মোট ভিউ', value: totalViews, icon: Eye, color: 'text-blue-500' },
                      { label: 'মোট লাইক', value: totalLikes, icon: Heart, color: 'text-red-500' },
                      { label: 'মোট কমেন্ট', value: totalComments, icon: MessageSquare, color: 'text-green-500' },
                      { label: 'মোট শেয়ার', value: totalShares, icon: Share2, color: 'text-purple-500' },
                      { label: 'মোট রিচ', value: postResults.reduce((s, r) => s + (r.reach_count || 0), 0), icon: TrendingUp, color: 'text-orange-500' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/30">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center"><stat.icon className={`w-4 h-4 ${stat.color}`} /></div><span className="text-sm">{stat.label}</span></div>
                        <span className="text-lg font-bold">{stat.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">প্ল্যাটফর্ম বিস্তারিত</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>প্ল্যাটফর্ম</TableHead><TableHead className="text-right">পোস্ট</TableHead><TableHead className="text-right">সফল</TableHead><TableHead className="text-right">ব্যর্থ</TableHead><TableHead className="text-right">ভিউ</TableHead><TableHead className="text-right">লাইক</TableHead><TableHead className="text-right">কমেন্ট</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {PLATFORMS.map(p => {
                        const pResults = postResults.filter(r => r.platform === p.id);
                        if (pResults.length === 0) return null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="flex items-center gap-2"><p.icon className="w-4 h-4" style={{ color: p.color }} />{p.name}</TableCell>
                            <TableCell className="text-right">{pResults.length}</TableCell>
                            <TableCell className="text-right text-green-600">{pResults.filter(r => r.status === 'success').length}</TableCell>
                            <TableCell className="text-right text-red-600">{pResults.filter(r => r.status === 'failed').length}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.views_count || 0), 0)}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.likes_count || 0), 0)}</TableCell>
                            <TableCell className="text-right">{pResults.reduce((s, r) => s + (r.comments_count || 0), 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AUTOMATION TAB */}
          <TabsContent value="automation">
            <AutomationSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Selector Dialog */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> প্রোডাক্ট / ক্যাটাগরি সিলেক্ট</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="নাম দিয়ে খুঁজুন..." value={composerSelector.productSearch} onChange={e => composerSelector.setProductSearch(e.target.value)} className="pl-9 h-10" autoFocus /></div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {[
                { key: 'books' as const, label: '📚 বই', count: composerSelector.products.length },
                { key: 'universal' as const, label: '🛍️ প্রোডাক্ট', count: composerSelector.universalProducts.length },
                { key: 'categories' as const, label: '📂 ক্যাটাগরি', count: composerSelector.categories.length + composerSelector.universalCategories.length },
              ].map(tab => (
                <button key={tab.key} onClick={() => composerSelector.setSelectorTab(tab.key)} className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${composerSelector.selectorTab === tab.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-1 p-1">
                {composerSelector.selectorTab === 'books' && composerSelector.products.map(p => (
                  <button key={p.id} className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all" onClick={() => selectProduct(p, 'book')}>
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-12 h-16 object-cover rounded-md shadow-sm" /> : <div className="w-12 h-16 bg-muted rounded-md flex items-center justify-center"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>}
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.title_bn || p.title_en}</p>{p.author && <p className="text-[11px] text-muted-foreground truncate">{p.author}</p>}<span className="text-xs font-semibold text-primary">৳{p.price}</span></div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {composerSelector.selectorTab === 'universal' && composerSelector.universalProducts.map(p => (
                  <button key={p.id} className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all" onClick={() => selectProduct(p, 'universal')}>
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-md shadow-sm" /> : <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-muted-foreground" /></div>}
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name_bn || p.name_en}</p><div className="flex items-center gap-2 mt-0.5"><Badge variant="outline" className="text-[9px]">{p.product_type}</Badge><span className="text-xs font-semibold text-primary">৳{p.price}</span></div></div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {composerSelector.selectorTab === 'categories' && (
                  <>
                    {composerSelector.categories.length > 0 && (<><p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">বই ক্যাটাগরি</p>{composerSelector.categories.map(c => (<button key={c.id} className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all" onClick={() => selectCategory(c, 'book')}>{c.image_url ? <img src={c.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" /> : <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"><FolderOpen className="w-4 h-4 text-muted-foreground" /></div>}<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name_bn}</p></div><Plus className="w-4 h-4 text-muted-foreground shrink-0" /></button>))}</>)}
                    {composerSelector.universalCategories.length > 0 && (<><p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 pt-3 uppercase tracking-wide">ইউনিভার্সাল ক্যাটাগরি</p>{composerSelector.universalCategories.map(c => (<button key={c.id} className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all" onClick={() => selectCategory(c, 'universal')}>{c.image_url ? <img src={c.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" /> : <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center"><FolderOpen className="w-4 h-4 text-muted-foreground" /></div>}<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name_bn}</p><Badge variant="outline" className="text-[9px]">{c.product_type}</Badge></div><Plus className="w-4 h-4 text-muted-foreground shrink-0" /></button>))}</>)}
                    {composerSelector.categories.length === 0 && composerSelector.universalCategories.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">কোনো ক্যাটাগরি পাওয়া যায়নি</p>}
                  </>
                )}
                {composerSelector.selectorTab === 'books' && composerSelector.products.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">কোনো বই পাওয়া যায়নি</p>}
                {composerSelector.selectorTab === 'universal' && composerSelector.universalProducts.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <Dialog open={!!viewingPost} onOpenChange={open => { if (!open) setViewingPost(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>📝 পোস্ট বিস্তারিত</DialogTitle></DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2"><Badge className={statusColors[viewingPost.status] || ''} variant="outline">{statusLabels[viewingPost.status]}</Badge><span className="text-xs text-muted-foreground">{format(new Date(viewingPost.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
              {viewingPost.media_urls?.length > 0 && <div className={`grid gap-1 rounded-xl overflow-hidden ${viewingPost.media_urls.length === 1 ? '' : 'grid-cols-2'}`}>{viewingPost.media_urls.map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full h-32 object-cover" />)}</div>}
              {(viewingPost.content_bn || viewingPost.content) && <div className="bg-muted/30 p-3 rounded-xl text-sm whitespace-pre-line border border-border/30">{viewingPost.content_bn || viewingPost.content}</div>}
              {viewingPost.hashtags?.length > 0 && <p className="text-xs text-primary">{viewingPost.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>}
              {viewingPost.link_url && <p className="text-xs text-blue-600 truncate">{viewingPost.link_url}</p>}
              <div>
                <Label className="text-xs mb-2 block">চ্যানেল রেজাল্ট</Label>
                <div className="space-y-1.5">
                  {getResultsForPost(viewingPost.id).map((r, i) => {
                    const plat = PLATFORMS.find(p => p.id === r.platform);
                    return (<div key={i} className="flex items-center gap-2 p-2 border rounded-xl text-sm">{plat && <plat.icon className="w-4 h-4" style={{ color: plat.color }} />}<span className="flex-1">{plat?.name}</span><Badge className={statusColors[r.status] || ''} variant="outline">{statusLabels[r.status]}</Badge>{r.error_message && <span className="text-[10px] text-red-500 max-w-[120px] truncate" title={r.error_message}>{r.error_message}</span>}</div>);
                  })}
                  {getResultsForPost(viewingPost.id).length === 0 && <p className="text-xs text-muted-foreground">রেজাল্ট নেই</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { editPost(viewingPost); setViewingPost(null); }}><Edit className="w-4 h-4 mr-1" /> এডিট</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { duplicatePost(viewingPost); setViewingPost(null); }}><Copy className="w-4 h-4 mr-1" /> ডুপ্লিকেট</Button>
                {getResultsForPost(viewingPost.id).some(r => r.status === 'failed') && <Button variant="outline" size="sm" className="flex-1" onClick={() => { retryPost.mutate(viewingPost.id); setViewingPost(null); }}><RotateCcw className="w-4 h-4 mr-1" /> রিট্রাই</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish History Dialog */}
      <Dialog open={!!viewingPublishHistory} onOpenChange={open => { if (!open) setViewingPublishHistory(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> পাবলিশ হিস্ট্রি</DialogTitle></DialogHeader>
          {viewingPublishHistory && (
            <div className="space-y-3">
              <div className="bg-muted/30 p-3 rounded-xl border border-border/30">
                <p className="text-sm truncate font-medium">{viewingPublishHistory.content_bn || viewingPublishHistory.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px]">মোট পাবলিশ: {viewingPublishHistory.publish_count || 0}বার</Badge>
                  {viewingPublishHistory.published_at && <span className="text-[10px] text-muted-foreground">শেষ: {format(new Date(viewingPublishHistory.published_at), 'dd/MM/yy HH:mm')}</span>}
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {publishHistory.filter((h: any) => h.post_id === viewingPublishHistory.id).map((h: any, i: number) => {
                    const hResults = (h.results || []) as any[];
                    const successCount = hResults.filter((r: any) => r.status === 'success').length;
                    const failCount = hResults.filter((r: any) => r.status === 'failed').length;
                    return (
                      <div key={h.id || i} className="p-3 border rounded-xl bg-background space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">#{i + 1}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(h.published_at), 'dd/MM/yyyy HH:mm:ss')}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{h.trigger_type === 'scheduled' ? '⏰ শিডিউল' : h.trigger_type === 'auto' ? '🤖 অটো' : '👤 ম্যানুয়াল'}</Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(h.platforms || []).map((pid: string) => { const plat = PLATFORMS.find(x => x.id === pid); return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null; })}
                          <span className="text-[10px] ml-auto">
                            {successCount > 0 && <span className="text-green-600 mr-2">{successCount} সফল</span>}
                            {failCount > 0 && <span className="text-red-600">{failCount} ব্যর্থ</span>}
                          </span>
                        </div>
                        {hResults.some((r: any) => r.error) && (
                          <div className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 p-1.5 rounded">
                            {hResults.filter((r: any) => r.error).map((r: any, j: number) => <div key={j}>{r.platform}: {r.error}</div>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {publishHistory.filter((h: any) => h.post_id === viewingPublishHistory.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">কোনো পাবলিশ রেকর্ড নেই</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
    </AdminLayout>
  );
};

export default AdminSocialMedia;
