import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send, Plus, Calendar, Clock, Hash, Trash2, Edit, Eye, RefreshCw,
  Facebook, Instagram, Twitter, MessageCircle, Linkedin, Youtube, Globe, Printer,
  TrendingUp, Heart, MessageSquare, Share2, BarChart3, Settings, Smartphone,
  Search, Copy, Link2, Package, X, Check, AlertCircle, RotateCcw, Filter,
  Image as ImageIcon, Upload, BookOpen, ShoppingBag, FolderOpen, Sparkles
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
  const [tplContentBn, setTplContentBn] = useState('');
  const [tplContentEn, setTplContentEn] = useState('');
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

  // Log filters
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logTriggerFilter, setLogTriggerFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logDateRange, setLogDateRange] = useState<'today' | '7d' | '30d' | 'all'>('all');

  const tplContentRef = useRef<HTMLTextAreaElement>(null);

  // Old settings
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['auto-post-settings'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('auto_post_settings').select('*').order('setting_key');
      return data || [];
    }
  });

  const { data: hashtagGroups = [], isLoading: hashtagsLoading } = useQuery({
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
      const usedVars = AVAILABLE_VARIABLES.filter(v => tplContentBn.includes(v.key) || tplContentEn.includes(v.key)).map(v => v.key);
      const data: any = {
        name: tplName, template_type: tplType, content_bn: tplContentBn || null, content_en: tplContentEn || null,
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
    setTplName(''); setTplType('general'); setTplContentBn(''); setTplContentEn('');
    setTplPlatforms([]); setTplHashtagGroup(''); setTplIncludeImage(true); setTplIncludePrice(true);
    setTplIncludeLink(true); setTplDescription(''); setEditingTemplate(null); setShowTemplateForm(false); setShowPreview(false);
  };

  const resetRuleForm = () => {
    setRuleName(''); setRuleTrigger('new_product'); setRulePlatforms([]);
    setRuleTemplate(''); setRuleHashtagGroup(''); setRuleDelay(0);
    setRuleSendEmail(false); setRuleSendSms(false); setRulePriority(0);
    setRuleScheduleDays([]); setRuleTimeStart(''); setRuleTimeEnd('');
    setRuleMaxExec(null); setRuleConditions({}); setEditingRule(null); setShowRuleForm(false);
  };

  const editTemplateAction = (t: any) => {
    setEditingTemplate(t); setTplName(t.name); setTplType(t.template_type);
    setTplContentBn(t.content_bn || ''); setTplContentEn(t.content_en || '');
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

  const insertVariable = (varKey: string) => {
    const textarea = tplContentRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = tplContentBn.substring(0, start) + varKey + tplContentBn.substring(end);
      setTplContentBn(newVal);
      setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + varKey.length, start + varKey.length); }, 50);
    } else {
      setTplContentBn(prev => prev + varKey);
    }
  };

  const getPreviewContent = () => {
    let content = tplContentBn || 'কোনো কন্টেন্ট নেই';
    content = content.replace(/\{\{product_name\}\}/g, 'আমার প্রথম বই')
      .replace(/\{\{price\}\}/g, '৳350')
      .replace(/\{\{discount_price\}\}/g, '৳280')
      .replace(/\{\{author\}\}/g, 'লেখক নাম')
      .replace(/\{\{category\}\}/g, 'উপন্যাস')
      .replace(/\{\{link\}\}/g, 'https://boialo.com/book/example')
      .replace(/\{\{shop_name\}\}/g, 'বইআলো')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('bn-BD'));
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

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t: any) => {
      if (templateFilterType !== 'all' && t.template_type !== templateFilterType) return false;
      if (templateSearch && !t.name?.toLowerCase().includes(templateSearch.toLowerCase()) && !t.content_bn?.toLowerCase().includes(templateSearch.toLowerCase())) return false;
      return true;
    });
  }, [templates, templateFilterType, templateSearch]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return automationRules.filter((r: any) => {
      if (ruleFilter === 'active' && !r.is_active) return false;
      if (ruleFilter === 'inactive' && r.is_active) return false;
      return true;
    });
  }, [automationRules, ruleFilter]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return automationLogs.filter((log: any) => {
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
    });
  }, [automationLogs, logStatusFilter, logTriggerFilter, logSearch, logDateRange]);

  // Log stats
  const logStats = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l: any) => l.status === 'success').length;
    const failed = filteredLogs.filter((l: any) => l.status === 'failed').length;
    const skipped = filteredLogs.filter((l: any) => l.status === 'skipped').length;
    return { total, success, failed, skipped, successRate: total > 0 ? Math.round((success / total) * 100) : 0 };
  }, [filteredLogs]);

  if (settingsLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
        {[
          { key: 'overview' as const, label: '⚙️ ওভারভিউ', count: null },
          { key: 'hashtags' as const, label: '#️⃣ হ্যাশট্যাগ', count: hashtagGroups.length },
          { key: 'templates' as const, label: '📝 টেমপ্লেট', count: templates.length },
          { key: 'rules' as const, label: '🤖 রুলস', count: automationRules.length },
          { key: 'logs' as const, label: '📋 লগ', count: automationLogs.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`text-xs font-medium py-2 px-3 rounded-md transition-all ${activeSubTab === tab.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> অটো সোশ্যাল মিডিয়া পোস্ট</span>
                {smSetting && (
                  <Switch checked={smSetting.is_active && smConfig.enabled} onCheckedChange={(checked) => updateSetting.mutate({ id: smSetting.id, is_active: checked, setting_value: { ...smConfig, enabled: checked } })} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">নতুন পণ্য যোগ করলে স্বয়ংক্রিয়ভাবে সোশ্যাল মিডিয়ায় পোস্ট হবে।</p>
              <div>
                <Label className="text-sm font-medium mb-2 block">প্ল্যাটফর্ম নির্বাচন</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <Badge key={p.id} variant={(smConfig.platforms || []).includes(p.id) ? 'default' : 'outline'} className="cursor-pointer gap-1.5 text-xs py-1 px-2" onClick={() => togglePlatform(p.id)}>
                      <p.icon className="w-3.5 h-3.5" /> {p.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">পোস্ট টেমপ্লেট</Label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {AVAILABLE_VARIABLES.slice(0, 5).map(v => (
                    <Badge key={v.key} variant="outline" className="cursor-pointer text-[9px] hover:bg-primary/10 gap-0.5 py-0" onClick={() => {
                      const current = smConfig.template_bn || '';
                      smSetting && updateSetting.mutate({ id: smSetting.id, setting_value: { ...smConfig, template_bn: current + v.key } });
                    }}>
                      {v.icon} {v.key}
                    </Badge>
                  ))}
                </div>
                <Textarea value={smConfig.template_bn || ''} onChange={e => smSetting && updateSetting.mutate({ id: smSetting.id, setting_value: { ...smConfig, template_bn: e.target.value } })} rows={3} placeholder="📚 নতুন বই: {{product_name}} ..." className="mt-1 font-mono text-sm" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> অটো ইমেইল নোটিফিকেশন</span>
                {emailSetting && (
                  <Switch checked={emailSetting.is_active && emailConfig.enabled} onCheckedChange={(checked) => updateSetting.mutate({ id: emailSetting.id, is_active: checked, setting_value: { ...emailConfig, enabled: checked } })} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">নতুন পণ্য যোগ করলে সকল সাবস্ক্রাইবারকে ইমেইল পাঠানো হবে।</p>
              <div>
                <Label className="text-sm font-medium">ইমেইল সাবজেক্ট টেমপ্লেট</Label>
                <Input value={emailConfig.template_subject || ''} onChange={e => emailSetting && updateSetting.mutate({ id: emailSetting.id, setting_value: { ...emailConfig, template_subject: e.target.value } })} placeholder="🆕 নতুন পণ্য: {{product_name}}" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  { label: 'হ্যাশট্যাগ গ্রুপ', value: hashtagGroups.length, icon: Hash, color: 'text-blue-500' },
                  { label: 'টেমপ্লেট', value: templates.length, icon: Copy, color: 'text-purple-500' },
                  { label: 'অটোমেশন রুলস', value: automationRules.length, icon: Settings, color: 'text-orange-500' },
                  { label: 'অ্যাক্টিভ রুলস', value: automationRules.filter((r: any) => r.is_active).length, icon: Check, color: 'text-green-500' },
                  { label: 'মোট এক্সিকিউশন', value: automationLogs.length, icon: BarChart3, color: 'text-primary' },
                  { label: 'সাফল্যের হার', value: `${logStats.successRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
                    <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
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
            <CardHeader><CardTitle className="text-base">#️⃣ {editingGroup ? 'গ্রুপ এডিট' : 'নতুন হ্যাশট্যাগ গ্রুপ'}</CardTitle></CardHeader>
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
                {editingGroup && (
                  <Button variant="outline" onClick={() => { setEditingGroup(null); setNewGroupName(''); setNewGroupTags(''); }}>বাতিল</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">সেভড হ্যাশট্যাগ গ্রুপ ({hashtagGroups.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {hashtagGroups.map((g: any) => (
                    <div key={g.id} className={`p-3 border rounded-lg space-y-2 ${g.is_default ? 'border-primary/40 bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{g.name}</span>
                          {g.is_default && <Badge variant="default" className="text-[9px]">ডিফল্ট</Badge>}
                        </div>
                        <div className="flex gap-0.5">
                          {!g.is_default && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="ডিফল্ট করুন" onClick={() => setDefaultGroup.mutate(g.id)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingGroup(g); setNewGroupName(g.name); setNewGroupTags((g.hashtags || []).join(', ')); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deleteHashtagGroup.mutate(g.id); }}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(g.hashtags || []).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">#{tag}</Badge>
                        ))}
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

      {/* TEMPLATES - UPGRADED */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          {/* Header with search & filter */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="টেমপ্লেট খুঁজুন..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={templateFilterType} onValueChange={setTemplateFilterType}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব টাইপ</SelectItem>
                  {TEMPLATE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs py-1">মোট: {templates.length} | ফিল্টার: {filteredTemplates.length}</Badge>
              <Button size="sm" onClick={() => { resetTemplateForm(); setShowTemplateForm(true); }}>
                <Plus className="w-4 h-4 mr-1" /> নতুন টেমপ্লেট
              </Button>
            </div>
          </div>

          {/* Template Form - Enhanced */}
          {showTemplateForm && (
            <Card className="border-primary/30 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {editingTemplate ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingTemplate ? 'টেমপ্লেট এডিট' : 'নতুন টেমপ্লেট তৈরি'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">টেমপ্লেটের নাম *</Label>
                    <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="যেমন: নতুন বই পোস্ট" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">টাইপ</Label>
                    <Select value={tplType} onValueChange={setTplType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">হ্যাশট্যাগ গ্রুপ</Label>
                    <Select value={tplHashtagGroup || 'none'} onValueChange={v => setTplHashtagGroup(v === 'none' ? '' : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোনোটি নয়</SelectItem>
                        {hashtagGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} ({(g.hashtags || []).length})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">বিবরণ (ঐচ্ছিক)</Label>
                  <Input value={tplDescription} onChange={e => setTplDescription(e.target.value)} placeholder="এই টেমপ্লেটটি কখন ব্যবহার করবেন..." className="mt-1" />
                </div>

                {/* Variable insertion buttons */}
                <div>
                  <Label className="text-sm mb-2 block">ভেরিয়েবল যোগ করুন</Label>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_VARIABLES.map(v => (
                      <Button key={v.key} type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => insertVariable(v.key)}>
                        <span>{v.icon}</span> {v.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">কন্টেন্ট (বাংলা) *</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowPreview(!showPreview)}>
                        <Eye className="w-3 h-3 mr-1" /> {showPreview ? 'এডিটর' : 'প্রিভিউ'}
                      </Button>
                    </div>
                    {!showPreview ? (
                      <Textarea ref={tplContentRef} value={tplContentBn} onChange={e => setTplContentBn(e.target.value)} rows={6} className="font-mono text-sm" placeholder="📚 নতুন বই!\n\n{{product_name}}\n✍️ {{author}}\n💰 মূল্য: {{price}}\n\n👉 {{link}}" />
                    ) : (
                      <div className="border rounded-md p-3 bg-muted/30 min-h-[150px] text-sm whitespace-pre-line">
                        {getPreviewContent()}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm mb-1 block">কন্টেন্ট (English)</Label>
                    <Textarea value={tplContentEn} onChange={e => setTplContentEn(e.target.value)} rows={6} className="font-mono text-sm" placeholder="📚 New Book!\n\n{{product_name}}\nPrice: {{price}}" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1 block">প্ল্যাটফর্ম</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.map(p => (
                        <Badge key={p.id} variant={tplPlatforms.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] gap-1 py-1" onClick={() => setTplPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                          <p.icon className="w-3 h-3" /> {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-4">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludeImage} onCheckedChange={c => setTplIncludeImage(!!c)} /> ছবি সংযুক্ত</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludePrice} onCheckedChange={c => setTplIncludePrice(!!c)} /> মূল্য দেখান</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={tplIncludeLink} onCheckedChange={c => setTplIncludeLink(!!c)} /> লিংক দিন</label>
                  </div>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button onClick={() => saveTemplate.mutate()} disabled={!tplName || !tplContentBn || saveTemplate.isPending}>
                    {saveTemplate.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
                    {editingTemplate ? 'আপডেট করুন' : 'সেভ করুন'}
                  </Button>
                  <Button variant="outline" onClick={resetTemplateForm}>বাতিল</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template Grid - Professional Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t: any) => {
              const hGroup = hashtagGroups.find((g: any) => g.id === t.hashtag_group_id);
              return (
                <Card key={t.id} className={`group transition-all hover:shadow-md ${!t.is_active ? 'opacity-50 grayscale' : ''}`}>
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
                      <div className="bg-muted/40 rounded-md p-2.5 border border-border/50">
                        <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-line">{t.content_bn}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {(t.platforms || []).map((pid: string) => {
                          const plat = PLATFORMS.find(x => x.id === pid);
                          return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null;
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {t.include_image && <Badge variant="secondary" className="text-[8px] py-0">📷</Badge>}
                        {t.include_price && <Badge variant="secondary" className="text-[8px] py-0">💰</Badge>}
                        {t.include_link && <Badge variant="secondary" className="text-[8px] py-0">🔗</Badge>}
                      </div>
                    </div>

                    {hGroup && (
                      <div className="flex flex-wrap gap-1">
                        {(hGroup.hashtags || []).slice(0, 4).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] text-primary">#{tag}</span>
                        ))}
                        {(hGroup.hashtags || []).length > 4 && <span className="text-[10px] text-muted-foreground">+{(hGroup.hashtags || []).length - 4}</span>}
                      </div>
                    )}

                    {(t.variables || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(t.variables || []).map((v: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[8px] py-0 font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}

                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">ব্যবহার: {t.use_count || 0} বার</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editTemplateAction(t)} title="এডিট"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTemplate.mutate(t)} title="ডুপ্লিকেট"><Copy className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছতে চান?')) deleteTemplate.mutate(t.id); }} title="মুছুন"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredTemplates.length === 0 && !showTemplateForm && (
              <Card className="md:col-span-3">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">কোনো টেমপ্লেট পাওয়া যায়নি</p>
                  <p className="text-xs text-muted-foreground mt-1">উপরের বাটনে ক্লিক করে নতুন টেমপ্লেট তৈরি করুন।</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* RULES - UPGRADED */}
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
              <Badge variant="secondary" className="text-xs py-1">মোট: {automationRules.length} | দেখাচ্ছে: {filteredRules.length}</Badge>
            </div>
            <Button size="sm" onClick={() => { resetRuleForm(); setShowRuleForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> নতুন রুল
            </Button>
          </div>

          {/* Rule Form - Enhanced */}
          {showRuleForm && (
            <Card className="border-primary/30 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {editingRule ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingRule ? 'রুল এডিট করুন' : 'নতুন অটোমেশন রুল'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-sm">রুলের নাম *</Label>
                    <Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="যেমন: নতুন বই অটো পোস্ট" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">ট্রিগার টাইপ *</Label>
                    <Select value={ruleTrigger} onValueChange={setRuleTrigger}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">প্রায়োরিটি</Label>
                    <Input type="number" value={rulePriority} onChange={e => setRulePriority(Number(e.target.value))} min={0} max={100} className="mt-1" placeholder="0-100" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">বেশি = আগে চলবে</p>
                  </div>
                </div>

                {/* Template & Hashtag */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">কন্টেন্ট টেমপ্লেট</Label>
                    <Select value={ruleTemplate || 'none'} onValueChange={v => setRuleTemplate(v === 'none' ? '' : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="টেমপ্লেট সিলেক্ট" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোনোটি নয় (ডিফল্ট ব্যবহার হবে)</SelectItem>
                        {templates.filter((t: any) => t.is_active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>📝 {t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">হ্যাশট্যাগ গ্রুপ</Label>
                    <Select value={ruleHashtagGroup || 'none'} onValueChange={v => setRuleHashtagGroup(v === 'none' ? '' : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="গ্রুপ সিলেক্ট" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">কোনোটি নয়</SelectItem>
                        {hashtagGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>#️⃣ {g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <Label className="text-sm mb-1 block">প্ল্যাটফর্ম নির্বাচন</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <Badge key={p.id} variant={rulePlatforms.includes(p.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] gap-1 py-1" onClick={() => setRulePlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                        <p.icon className="w-3 h-3" /> {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Schedule Window */}
                <div>
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2"><Clock className="w-4 h-4" /> শিডিউল উইন্ডো (ঐচ্ছিক)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">সক্রিয় দিন</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {DAYS_OF_WEEK.map(d => (
                          <Badge key={d.id} variant={ruleScheduleDays.includes(d.id) ? 'default' : 'outline'} className="cursor-pointer text-[10px] py-0.5" onClick={() => setRuleScheduleDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}>
                            {d.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">শুরু সময়</Label>
                      <Input type="time" value={ruleTimeStart} onChange={e => setRuleTimeStart(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">শেষ সময়</Label>
                      <Input type="time" value={ruleTimeEnd} onChange={e => setRuleTimeEnd(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </div>

                {/* Execution & Notification Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-sm">ডিলে (মিনিট)</Label>
                    <Input type="number" value={ruleDelay} onChange={e => setRuleDelay(Number(e.target.value))} min={0} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">দৈনিক সর্বোচ্চ</Label>
                    <Input type="number" value={ruleMaxExec ?? ''} onChange={e => setRuleMaxExec(e.target.value ? Number(e.target.value) : null)} min={0} className="mt-1" placeholder="সীমাহীন" />
                  </div>
                  <label className="flex items-center gap-2 text-sm pt-6">
                    <Checkbox checked={ruleSendEmail} onCheckedChange={c => setRuleSendEmail(!!c)} /> 📧 ইমেইল পাঠান
                  </label>
                  <label className="flex items-center gap-2 text-sm pt-6">
                    <Checkbox checked={ruleSendSms} onCheckedChange={c => setRuleSendSms(!!c)} /> 📱 SMS পাঠান
                  </label>
                </div>

                {/* Conditions */}
                <div>
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2"><Filter className="w-4 h-4" /> কন্ডিশন (ঐচ্ছিক)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CONDITION_TYPES.map(cond => (
                      <div key={cond.id} className="flex items-center gap-2">
                        {cond.type === 'boolean' ? (
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox checked={!!ruleConditions[cond.id]} onCheckedChange={c => setRuleConditions((prev: any) => ({ ...prev, [cond.id]: !!c }))} />
                            {cond.label}
                          </label>
                        ) : (
                          <div className="flex-1">
                            <Label className="text-[11px] text-muted-foreground">{cond.label}</Label>
                            <Input type={cond.type} value={ruleConditions[cond.id] || ''} onChange={e => setRuleConditions((prev: any) => ({ ...prev, [cond.id]: e.target.value }))} className="h-8 text-xs mt-0.5" placeholder={cond.type === 'number' ? '0' : 'মান দিন'} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button onClick={() => saveRule.mutate()} disabled={!ruleName || saveRule.isPending}>
                    {saveRule.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
                    {editingRule ? 'আপডেট করুন' : 'সেভ করুন'}
                  </Button>
                  <Button variant="outline" onClick={resetRuleForm}>বাতিল</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List - Professional */}
          <div className="space-y-2">
            {filteredRules.map((r: any) => {
              const trigger = TRIGGER_TYPES.find(t => t.id === r.trigger_type);
              const tpl = templates.find((t: any) => t.id === r.template_id);
              const hGroup = hashtagGroups.find((g: any) => g.id === r.hashtag_group_id);
              const totalExec = (r.success_count || 0) + (r.fail_count || 0);
              const successRate = totalExec > 0 ? Math.round(((r.success_count || 0) / totalExec) * 100) : 0;
              return (
                <Card key={r.id} className={`group transition-all hover:shadow-md ${!r.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg">{trigger?.icon || '🔔'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{r.name}</h4>
                            <Badge variant="outline" className="text-[9px]">{trigger?.label || r.trigger_type}</Badge>
                            {r.priority > 0 && <Badge variant="secondary" className="text-[9px]">P{r.priority}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {tpl && <Badge variant="secondary" className="text-[9px] gap-0.5">📝 {tpl.name}</Badge>}
                            {hGroup && <Badge variant="secondary" className="text-[9px] gap-0.5">#️⃣ {hGroup.name}</Badge>}
                            {r.delay_minutes > 0 && <Badge variant="secondary" className="text-[9px] gap-0.5">⏱️ {r.delay_minutes}মি.</Badge>}
                            {r.send_email && <Badge variant="secondary" className="text-[9px]">📧</Badge>}
                            {r.send_sms && <Badge variant="secondary" className="text-[9px]">📱</Badge>}
                            {r.max_executions_per_day && <Badge variant="secondary" className="text-[9px]">সর্বোচ্চ {r.max_executions_per_day}/দিন</Badge>}
                          </div>
                          {(r.schedule_days || []).length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">
                                {(r.schedule_days || []).map((d: string) => DAYS_OF_WEEK.find(x => x.id === d)?.label).filter(Boolean).join(', ')}
                                {r.schedule_time_start && ` (${r.schedule_time_start}${r.schedule_time_end ? '-' + r.schedule_time_end : ''})`}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-1.5 mt-1.5">
                            {(r.platforms || []).map((pid: string) => {
                              const plat = PLATFORMS.find(x => x.id === pid);
                              return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null;
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Switch checked={r.is_active} onCheckedChange={checked => toggleRule.mutate({ id: r.id, active: checked })} />
                        <div className="text-right">
                          <p className="text-xs font-medium">{r.trigger_count || 0} বার</p>
                          {totalExec > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${successRate}%` }} />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{successRate}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editRuleAction(r)} title="এডিট"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateRule.mutate(r)} title="ডুপ্লিকেট"><Copy className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('মুছতে চান?')) deleteRule.mutate(r.id); }} title="মুছুন"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredRules.length === 0 && !showRuleForm && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Settings className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">কোনো অটোমেশন রুল পাওয়া যায়নি</p>
                  <p className="text-xs text-muted-foreground mt-1">উপরের বাটনে ক্লিক করে নতুন রুল তৈরি করুন।</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* LOGS - UPGRADED */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'মোট', value: logStats.total, icon: BarChart3, color: 'text-primary' },
              { label: 'সফল', value: logStats.success, icon: Check, color: 'text-green-600' },
              { label: 'ব্যর্থ', value: logStats.failed, icon: X, color: 'text-red-500' },
              { label: 'স্কিপ', value: logStats.skipped, icon: AlertCircle, color: 'text-yellow-500' },
              { label: 'সাফল্য', value: `${logStats.successRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-2">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <div><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="পণ্যের নাম দিয়ে খুঁজুন..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                    <SelectItem value="success">✓ সফল</SelectItem>
                    <SelectItem value="failed">✗ ব্যর্থ</SelectItem>
                    <SelectItem value="skipped">⏭ স্কিপ</SelectItem>
                    <SelectItem value="pending">⏳ পেন্ডিং</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={logTriggerFilter} onValueChange={setLogTriggerFilter}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব ট্রিগার</SelectItem>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={logDateRange} onValueChange={(v: any) => setLogDateRange(v)}>
                  <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব সময়</SelectItem>
                    <SelectItem value="today">আজ</SelectItem>
                    <SelectItem value="7d">৭ দিন</SelectItem>
                    <SelectItem value="30d">৩০ দিন</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>📋 এক্সিকিউশন লগ</span>
                <Badge variant="outline" className="text-xs">{filteredLogs.length} / {automationLogs.length}</Badge>
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
                        <TableRow key={log.id} className="group">
                          <TableCell className="text-xs whitespace-nowrap font-mono">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] gap-0.5">
                              <span>{trigger?.icon}</span> {trigger?.label || log.trigger_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate font-medium">{log.product_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(log.platforms_posted || []).map((pid: string) => {
                                const plat = PLATFORMS.find(x => x.id === pid);
                                return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null;
                              })}
                              {(!log.platforms_posted || log.platforms_posted.length === 0) && <span className="text-xs text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              log.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              log.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              log.status === 'skipped' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-muted text-muted-foreground'
                            } variant="outline">
                              {log.status === 'success' ? '✓ সফল' : log.status === 'failed' ? '✗ ব্যর্থ' : log.status === 'skipped' ? '⏭ স্কিপ' : '⏳'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                            {log.error_message ? (
                              <span className="text-red-500 truncate block" title={log.error_message}>{log.error_message}</span>
                            ) : log.execution_time_ms ? (
                              <span>{log.execution_time_ms}ms</span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-muted-foreground">কোনো লগ পাওয়া যায়নি</p>
                          <p className="text-xs text-muted-foreground mt-1">ফিল্টার পরিবর্তন করে চেষ্টা করুন</p>
                        </TableCell>
                      </TableRow>
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
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectorTab, setSelectorTab] = useState<'books' | 'universal' | 'categories'>('books');

  // Image upload
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState('all');

  // Post detail dialog
  const [viewingPost, setViewingPost] = useState<any>(null);

  // Account form
  const [accPlatform, setAccPlatform] = useState('');
  const [accName, setAccName] = useState('');
  const [accToken, setAccToken] = useState('');
  const [accPageId, setAccPageId] = useState('');
  const [accChannelId, setAccChannelId] = useState('');

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_accounts').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_posts').select('*').order('created_at', { ascending: false }).limit(200);
      return data || [];
    }
  });

  const { data: postResults = [] } = useQuery({
    queryKey: ['social-post-results'],
    queryFn: async () => {
      const { data } = await supabase.from('social_media_post_results').select('*').order('created_at', { ascending: false }).limit(500);
      return data || [];
    }
  });

  // Products query for selector
  const { data: products = [] } = useQuery({
    queryKey: ['social-products', productSearch],
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
    queryKey: ['social-universal-products', productSearch],
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
    queryKey: ['social-categories', productSearch],
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
    queryKey: ['social-universal-categories', productSearch],
    queryFn: async () => {
      const sanitized = productSearch.replace(/[%_\\]/g, '\\$&').slice(0, 200);
      // @ts-ignore
      const base = supabase.from('universal_categories').select('id, name_bn, name_en, slug, image_url, product_type').eq('is_active', true).order('name_bn').limit(30);
      const final = sanitized ? base.or(`name_bn.ilike.%${sanitized}%,name_en.ilike.%${sanitized}%`) : base;
      const { data } = await final;
      return (data || []) as any[];
    }
  });

  // Saved hashtag groups for composer
  const { data: composerHashtagGroups = [] } = useQuery({
    queryKey: ['saved-hashtag-groups'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('saved_hashtag_groups').select('*').order('use_count', { ascending: false });
      return data || [];
    }
  });

  // Saved templates for quick use in composer
  const { data: composerTemplates = [] } = useQuery({
    queryKey: ['social-post-templates'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase.from('social_post_templates').select('*').eq('is_active', true).order('use_count', { ascending: false });
      return data || [];
    }
  });

  // Filtered history
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (historyStatusFilter !== 'all' && p.status !== historyStatusFilter) return false;
      if (historyPlatformFilter !== 'all' && !(p.platforms || []).includes(historyPlatformFilter)) return false;
      if (historySearch) {
        const s = historySearch.toLowerCase();
        if (!(p.content || '').toLowerCase().includes(s) && !(p.content_bn || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [posts, historyStatusFilter, historyPlatformFilter, historySearch]);

  // Image upload handler
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
    } catch (err) {
      console.error(err);
      toast.error('ছবি আপলোড করতে ব্যর্থ');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (url: string) => {
    setMediaUrls(prev => prev.filter(u => u !== url));
  };

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
    onSuccess: () => { toast.success(editingAccount ? 'অ্যাকাউন্ট আপডেট হয়েছে' : 'অ্যাকাউন্ট যোগ হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); setShowAccountDialog(false); resetAccountForm(); },
    onError: () => toast.error('অ্যাকাউন্ট সেভ করতে ব্যর্থ'),
  });

  const toggleAccount = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('social_media_accounts').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('social_media_accounts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('অ্যাকাউন্ট মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-accounts'] }); },
  });

  const savePost = useMutation({
    mutationFn: async (status: string) => {
      const postData: any = {
        content: postContent,
        content_bn: postContent,
        platforms: selectedPlatforms,
        hashtags: postHashtags ? postHashtags.split(',').map(h => h.trim()) : [],
        link_url: postLink || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        product_id: selectedProduct?.id || null,
        post_type: selectedProduct ? selectedProduct.type : null,
        status,
        scheduled_at: status === 'scheduled' && scheduleDate ? new Date(scheduleDate).toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase.from('social_media_posts').update(postData).eq('id', editingPost.id);
        if (error) throw error;
        if (status === 'published') {
          await supabase.from('social_media_post_results').delete().eq('post_id', editingPost.id);
          const results = selectedPlatforms.map(platform => ({
            post_id: editingPost.id, platform, status: 'pending',
            account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null,
          }));
          await supabase.from('social_media_post_results').insert(results);
          try { await supabase.functions.invoke('social-media-post', { body: { post_id: editingPost.id } }); } catch (e) { console.error(e); }
        }
      } else {
        const { data, error } = await supabase.from('social_media_posts').insert(postData).select().single();
        if (error) throw error;
        if (data && (status === 'published' || status === 'scheduled')) {
          const results = selectedPlatforms.map(platform => ({
            post_id: data.id, platform, status: 'pending',
            account_id: accounts.find(a => a.platform === platform && a.is_active)?.id || null,
          }));
          await supabase.from('social_media_post_results').insert(results);
        }
        if (status === 'published' && data) {
          try { await supabase.functions.invoke('social-media-post', { body: { post_id: data.id } }); } catch (e) { console.error(e); }
        }
      }
    },
    onSuccess: (_, status) => {
      toast.success(status === 'draft' ? 'ড্রাফট সেভ হয়েছে' : status === 'scheduled' ? 'শিডিউল সেট হয়েছে' : 'পোস্ট পাবলিশ হচ্ছে');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post-results'] });
      resetComposer();
    },
    onError: () => toast.error('পোস্ট সেভ করতে ব্যর্থ'),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('social_media_post_results').delete().eq('post_id', id);
      const { error } = await supabase.from('social_media_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('পোস্ট মুছে ফেলা হয়েছে'); queryClient.invalidateQueries({ queryKey: ['social-posts'] }); queryClient.invalidateQueries({ queryKey: ['social-post-results'] }); },
  });

  const retryPost = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from('social_media_post_results').update({ status: 'pending', error_message: null }).eq('post_id', postId).eq('status', 'failed');
      await supabase.from('social_media_posts').update({ status: 'published' }).eq('id', postId);
      await supabase.functions.invoke('social-media-post', { body: { post_id: postId } });
    },
    onSuccess: () => {
      toast.success('পুনরায় পোস্ট হচ্ছে');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-post-results'] });
    },
    onError: () => toast.error('রিট্রাই করতে ব্যর্থ'),
  });

  const resetComposer = () => {
    setPostContent(''); setSelectedPlatforms([]);
    setPostHashtags(''); setPostLink(''); setScheduleDate(''); setEditingPost(null);
    setSelectedProduct(null); setMediaUrls([]);
  };

  const resetAccountForm = () => {
    setAccPlatform(''); setAccName(''); setAccToken(''); setAccPageId(''); setAccChannelId('');
    setEditingAccount(null);
  };

  const editAccount = (acc: any) => {
    setEditingAccount(acc);
    setAccPlatform(acc.platform); setAccName(acc.account_name || '');
    setAccToken(''); setAccPageId(acc.page_id || ''); setAccChannelId(acc.channel_id || '');
    setShowAccountDialog(true);
  };

  const editPost = (post: any) => {
    setEditingPost(post);
    setPostContent(post.content_bn || post.content || '');
    setSelectedPlatforms(post.platforms || []);
    setPostHashtags((post.hashtags || []).join(', '));
    setPostLink(post.link_url || '');
    setMediaUrls(post.media_urls || []);
    setScheduleDate(post.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '');
    setSelectedProduct(null);
  };

  const duplicatePost = (post: any) => {
    setEditingPost(null);
    setPostContent(post.content_bn || post.content || '');
    setSelectedPlatforms(post.platforms || []);
    setPostHashtags((post.hashtags || []).join(', '));
    setPostLink(post.link_url || '');
    setMediaUrls(post.media_urls || []);
    setScheduleDate('');
    setSelectedProduct(null);
    toast.info('পোস্ট কপি করা হয়েছে - এডিট করে পোস্ট করুন');
  };

  const BASE_URL = 'https://boialo.lovable.app';

  const selectProduct = (product: any, type: 'book' | 'universal') => {
    const imgUrl = product.images?.[0] || null;
    const name = type === 'book' ? (product.title_bn || product.title_en) : (product.name_bn || product.name_en);
    const price = product.price;
    const discountPrice = product.original_price && product.discount_percent ? Math.round(price) : null;
    const url = type === 'book' ? `${BASE_URL}/product/${product.slug}` : `${BASE_URL}/universal-product/${product.slug}`;
    
    setSelectedProduct({ ...product, type, image_url: imgUrl, _resolved_name: name, _resolved_url: url });
    setPostLink(url);
    if (imgUrl && !mediaUrls.includes(imgUrl)) {
      setMediaUrls(prev => [...prev, imgUrl]);
    }
    if (!postContent) {
      setPostContent(`📚 ${name}\n💰 মূল্য: ৳${price}\n\n🛒 এখনই অর্ডার করুন!\n🔗 ${url}`);
    }
    setShowProductSelector(false);
    toast.success('প্রোডাক্ট সিলেক্ট হয়েছে');
  };

  // Build dynamic variables from selected product
  const dynamicProductVars = useMemo(() => {
    if (!selectedProduct) return [];
    const vars: { key: string; label: string; icon: string; value: string }[] = [];
    const p = selectedProduct;
    const name = p._resolved_name || p.title_bn || p.name_bn || p.title_en || p.name_en || '';
    if (name) vars.push({ key: name, label: 'পণ্যের নাম', icon: '📦', value: name });
    if (p.price) vars.push({ key: `৳${p.price}`, label: 'মূল্য', icon: '💰', value: `৳${p.price}` });
    if (p.original_price && p.original_price > p.price) vars.push({ key: `৳${p.original_price}`, label: 'ছাড় মূল্য', icon: '🏷️', value: `৳${p.original_price}` });
    if (p.discount_percent) vars.push({ key: `${p.discount_percent}%`, label: 'ডিসকাউন্ট', icon: '🔥', value: `${p.discount_percent}%` });
    if (p.author) vars.push({ key: p.author, label: 'লেখক', icon: '✍️', value: p.author });
    if (p.publisher) vars.push({ key: p.publisher, label: 'প্রকাশনী', icon: '🏢', value: p.publisher });
    if (p.product_type) vars.push({ key: p.product_type, label: 'প্রোডাক্ট টাইপ', icon: '🏷️', value: p.product_type });
    if (p.isbn) vars.push({ key: p.isbn, label: 'ISBN', icon: '📖', value: p.isbn });
    if (p.language) vars.push({ key: p.language, label: 'ভাষা', icon: '🌐', value: p.language });
    if (p.pages) vars.push({ key: `${p.pages}`, label: 'পৃষ্ঠা', icon: '📄', value: `${p.pages} পৃষ্ঠা` });
    if (p.edition) vars.push({ key: p.edition, label: 'সংস্করণ', icon: '📕', value: p.edition });
    if (p.sku) vars.push({ key: p.sku, label: 'SKU', icon: '🔢', value: p.sku });
    if (p._resolved_url) vars.push({ key: p._resolved_url, label: 'লিংক', icon: '🔗', value: p._resolved_url });
    // Always add static vars
    vars.push({ key: 'বইআলো', label: 'দোকানের নাম', icon: '🏪', value: 'বইআলো' });
    vars.push({ key: new Date().toLocaleDateString('bn-BD'), label: 'তারিখ', icon: '📅', value: new Date().toLocaleDateString('bn-BD') });
    return vars;
  }, [selectedProduct]);

  const selectCategory = (cat: any, type: 'book' | 'universal') => {
    const name = cat.name_bn || cat.name_en;
    const url = type === 'book' ? `${BASE_URL}/categories/${cat.slug}` : `${BASE_URL}/category/${cat.product_type}/${cat.slug}`;
    setPostLink(url);
    setSelectedProduct({ id: cat.id, type: `category-${type}`, name_bn: name, image_url: cat.image_url, slug: cat.slug, _resolved_name: name, _resolved_url: url });
    if (cat.image_url && !mediaUrls.includes(cat.image_url)) {
      setMediaUrls(prev => [...prev, cat.image_url]);
    }
    if (!postContent) {
      setPostContent(`📂 ${name} ক্যাটাগরি\n\n🛒 সব পণ্য দেখুন!\n🔗 ${url}`);
    }
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

  const platformPostCount = PLATFORMS.map(p => ({
    name: p.name, count: postResults.filter(r => r.platform === p.id).length, color: p.color,
  })).filter(p => p.count > 0);

  const getResultsForPost = (postId: string) => postResults.filter(r => r.post_id === postId);

  const printReport = () => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<html><head><title>Social Media Report</title>
      <style>body{font-family:'Hind Siliguri',sans-serif;padding:30px}h1{text-align:center}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
      .stat{background:#f5f5f5;padding:14px;border-radius:8px;text-align:center}
      .stat .v{font-size:24px;font-weight:700;color:#e53e3e}.stat .l{font-size:11px;color:#666}
      table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f5f5f5}
      @media print{body{padding:10px}}</style></head><body>
      <h1>📱 সোশ্যাল মিডিয়া রিপোর্ট</h1>
      <p style="text-align:center;color:#666">${format(new Date(), 'dd/MM/yyyy')}</p>
      <div class="grid">
        <div class="stat"><div class="v">${totalPosts}</div><div class="l">মোট পোস্ট</div></div>
        <div class="stat"><div class="v">${publishedPosts}</div><div class="l">পাবলিশড</div></div>
        <div class="stat"><div class="v">${totalViews}</div><div class="l">মোট ভিউ</div></div>
        <div class="stat"><div class="v">${totalLikes}</div><div class="l">মোট লাইক</div></div>
      </div>
      <h3>সাম্প্রতিক পোস্ট</h3>
      <table><tr><th>তারিখ</th><th>কন্টেন্ট</th><th>প্ল্যাটফর্ম</th><th>স্ট্যাটাস</th></tr>
      ${posts.slice(0, 30).map(p => `<tr><td>${format(new Date(p.created_at), 'dd/MM/yy')}</td><td>${(p.content || '').substring(0, 80)}...</td><td>${(p.platforms || []).join(', ')}</td><td>${statusLabels[p.status] || p.status}</td></tr>`).join('')}
      </table></body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">সোশ্যাল মিডিয়া ম্যানেজমেন্ট</h1>
            <p className="text-muted-foreground text-sm">এক জায়গা থেকে সব সোশ্যাল মিডিয়া কন্ট্রোল করুন</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printReport}><Printer className="w-4 h-4 mr-2" /> রিপোর্ট</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: Send, label: 'মোট পোস্ট', value: totalPosts },
            { icon: Eye, label: 'পাবলিশড', value: publishedPosts },
            { icon: Calendar, label: 'শিডিউল', value: scheduledPosts },
            { icon: Eye, label: 'মোট ভিউ', value: totalViews },
            { icon: Heart, label: 'লাইক', value: totalLikes },
            { icon: MessageSquare, label: 'কমেন্ট', value: totalComments },
            { icon: Share2, label: 'শেয়ার', value: totalShares },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <kpi.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="compose"><Send className="w-4 h-4 mr-1" /> পোস্ট</TabsTrigger>
            <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" /> হিস্ট্রি</TabsTrigger>
            <TabsTrigger value="accounts"><Settings className="w-4 h-4 mr-1" /> অ্যাকাউন্ট</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> অ্যানালিটিক্স</TabsTrigger>
            <TabsTrigger value="automation"><Sparkles className="w-4 h-4 mr-1" /> অটোমেশন</TabsTrigger>
          </TabsList>

          {/* COMPOSE TAB */}
          <TabsContent value="compose">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Composer */}
              <div className="md:col-span-2 space-y-4">
                {editingPost && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Edit className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">পোস্ট এডিট মোড</span>
                    <Badge variant="outline" className="ml-auto">{statusLabels[editingPost.status] || editingPost.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={resetComposer}><X className="w-4 h-4" /></Button>
                  </div>
                )}

                <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-background to-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      পোস্ট কম্পোজার
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Dynamic Product/Category Selector */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm font-semibold">
                        <Package className="w-4 h-4 text-primary" />
                        প্রোডাক্ট / ক্যাটাগরি সিলেক্ট করুন
                        <Badge variant="secondary" className="text-[10px] ml-1">ঐচ্ছিক</Badge>
                      </Label>

                      {selectedProduct ? (
                        <div className="flex items-center gap-3 p-3 border-2 border-primary/30 rounded-xl bg-primary/5">
                          {selectedProduct.image_url ? (
                            <img src={selectedProduct.image_url} alt="" className="w-14 h-14 object-cover rounded-lg shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {selectedProduct.title_bn || selectedProduct.name_bn || selectedProduct.title_en || selectedProduct.name_en}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">
                                {selectedProduct.type === 'book' ? '📚 বই' : selectedProduct.type === 'universal' ? '🛍️ প্রোডাক্ট' : '📂 ক্যাটাগরি'}
                              </Badge>
                              {selectedProduct.price && (
                                <span className="text-xs text-muted-foreground">৳{selectedProduct.discount_price || selectedProduct.price}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setSelectedProduct(null); setPostLink(''); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                          onClick={() => { setShowProductSelector(true); setProductSearch(''); setSelectorTab('books'); }}
                        >
                          <Search className="w-4 h-4 mr-2 text-primary" />
                          প্রোডাক্ট বা ক্যাটাগরি খুঁজুন ও সিলেক্ট করুন
                        </Button>
                      )}
                    </div>

                    <Separator />

                    {/* Quick Template Selector */}
                    {composerTemplates.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-sm font-semibold"><Sparkles className="w-3.5 h-3.5 text-primary" /> দ্রুত টেমপ্লেট</Label>
                        <div className="flex flex-wrap gap-1">
                          {composerTemplates.slice(0, 6).map((t: any) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5"
                              onClick={() => {
                                if (t.content_bn) setPostContent(t.content_bn);
                                else if (t.content_en) setPostContent(t.content_en);
                                if (t.platforms?.length) setSelectedPlatforms(t.platforms);
                                if (t.hashtag_group_id) {
                                  const group = composerHashtagGroups.find((g: any) => g.id === t.hashtag_group_id);
                                  if (group) setPostHashtags((group.hashtags || []).map((h: string) => `#${h}`).join(', '));
                                }
                                // @ts-ignore
                                supabase.from('social_post_templates').update({ use_count: (t.use_count || 0) + 1 }).eq('id', t.id).then(() => {});
                                toast.success(`টেমপ্লেট "${t.name}" প্রয়োগ হয়েছে`);
                              }}
                            >
                              <Copy className="w-2.5 h-2.5" /> {t.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unified Content Editor with Variable Insertion */}
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm flex items-center gap-2">
                        ✍️ পোস্ট কন্টেন্ট
                      </Label>
                      
                      {/* Dynamic variable insertion toolbar */}
                      <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg border">
                        <span className="text-[10px] font-semibold text-destructive self-center mr-1">ভেরিয়েবল:</span>
                        {selectedProduct && dynamicProductVars.length > 0 ? (
                          <>
                            {dynamicProductVars.map((v, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5 py-0.5 border-primary/30"
                                onClick={() => {
                                  const textarea = postContentRef.current;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const newVal = postContent.substring(0, start) + v.value + postContent.substring(end);
                                    setPostContent(newVal);
                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + v.value.length, start + v.value.length); }, 50);
                                  } else {
                                    setPostContent(prev => prev + v.value);
                                  }
                                }}
                              >
                                {v.icon} {v.label}
                              </Badge>
                            ))}
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-muted-foreground self-center">প্রোডাক্ট সিলেক্ট করলে অটো ভেরিয়েবল আসবে</span>
                            {STATIC_VARIABLES.map(v => (
                              <Badge
                                key={v.key}
                                variant="outline"
                                className="cursor-pointer text-[10px] hover:bg-primary/10 gap-0.5 py-0.5"
                                onClick={() => {
                                  const textarea = postContentRef.current;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const newVal = postContent.substring(0, start) + v.value + postContent.substring(end);
                                    setPostContent(newVal);
                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + v.value.length, start + v.value.length); }, 50);
                                  } else {
                                    setPostContent(prev => prev + v.value);
                                  }
                                }}
                              >
                                {v.icon} {v.label}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>

                      <Textarea
                        ref={postContentRef}
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder="📚 পোস্ট কন্টেন্ট লিখুন বা প্রোডাক্ট সিলেক্ট করুন..."
                        rows={6}
                        className="resize-y font-medium text-sm"
                      />
                      <div className="flex justify-between">
                        <p className="text-[10px] text-muted-foreground">{postContent.length}/2200 অক্ষর</p>
                        {postContent.length > 2200 && <p className="text-[10px] text-destructive">সর্বোচ্চ ২২০০ অক্ষর</p>}
                      </div>
                    </div>

                    <Separator />

                    {/* Image Upload Section */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm font-semibold">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        ছবি / মিডিয়া
                        <Badge variant="secondary" className="text-[10px] ml-1">ঐচ্ছিক</Badge>
                      </Label>

                      {mediaUrls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {mediaUrls.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border aspect-square">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeMedia(url)}
                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> আপলোড হচ্ছে...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> ছবি আপলোড করুন</>
                        )}
                      </Button>
                    </div>

                    <Separator />

                    {/* Hashtags, Link, Schedule */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-sm font-semibold"><Hash className="w-3.5 h-3.5 text-primary" /> হ্যাশট্যাগ</Label>
                        <Input value={postHashtags} onChange={e => setPostHashtags(e.target.value)} placeholder="#books, #reading, #বই" />
                        {composerHashtagGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {composerHashtagGroups.map((g: any) => (
                              <Badge
                                key={g.id}
                                variant="outline"
                                className="cursor-pointer text-[9px] hover:bg-primary/10 gap-0.5"
                                onClick={() => {
                                  const existing = postHashtags ? postHashtags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                  const newTags = (g.hashtags || []).filter((t: string) => !existing.some(e => e.replace('#', '') === t));
                                  const merged = [...existing, ...newTags.map((t: string) => `#${t}`)].join(', ');
                                  setPostHashtags(merged);
                                  // @ts-ignore
                                  supabase.from('saved_hashtag_groups').update({ use_count: (g.use_count || 0) + 1 }).eq('id', g.id).then(() => {});
                                }}
                              >
                                <Plus className="w-2.5 h-2.5" /> {g.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-sm font-semibold"><Link2 className="w-3.5 h-3.5 text-primary" /> লিংক</Label>
                        <div className="relative">
                          <Input
                            value={postLink}
                            onChange={e => setPostLink(e.target.value)}
                            placeholder="https://boialo.lovable.app/..."
                            className={postLink ? 'pr-8 border-primary/40 bg-primary/5' : ''}
                            readOnly={!!selectedProduct}
                          />
                          {postLink && (
                            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          )}
                        </div>
                        {selectedProduct && <p className="text-[10px] text-muted-foreground">✨ অটো জেনারেটেড লিংক</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1 text-sm font-semibold"><Calendar className="w-3.5 h-3.5 text-primary" /> শিডিউল <span className="text-muted-foreground font-normal">- ঐচ্ছিক</span></Label>
                      <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Platform selector + Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">📱 চ্যানেল নির্বাচন</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {PLATFORMS.map(p => {
                      const activeAccounts = accounts.filter(a => a.platform === p.id && a.is_active);
                      const hasAccount = activeAccounts.length > 0;
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <label key={p.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'} ${!hasAccount ? 'opacity-40' : ''}`}>
                          <Checkbox
                            checked={isSelected}
                            disabled={!hasAccount}
                            onCheckedChange={checked => {
                              setSelectedPlatforms(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                            }}
                          />
                          <p.icon className="w-5 h-5" style={{ color: p.color }} />
                          <span className="text-sm font-medium flex-1">{p.name}</span>
                          {hasAccount ? (
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              <Check className="w-3 h-3 mr-0.5" />{activeAccounts.length}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">সেটআপ</Badge>
                          )}
                        </label>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedPlatforms(accounts.filter(a => a.is_active).map(a => a.platform).filter((v, i, arr) => arr.indexOf(v) === i))}>
                        সব সিলেক্ট
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedPlatforms([])}>
                        সব বাদ
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Button className="w-full" disabled={!postContent || selectedPlatforms.length === 0 || savePost.isPending} onClick={() => savePost.mutate('published')}>
                      <Send className="w-4 h-4 mr-2" /> {editingPost ? 'আপডেট ও পোস্ট করুন' : 'এখনই পোস্ট করুন'}
                    </Button>
                    {scheduleDate && (
                      <Button variant="outline" className="w-full" disabled={!postContent || selectedPlatforms.length === 0} onClick={() => savePost.mutate('scheduled')}>
                        <Calendar className="w-4 h-4 mr-2" /> শিডিউল করুন
                      </Button>
                    )}
                    <Button variant="secondary" className="w-full" disabled={!postContent} onClick={() => savePost.mutate('draft')}>
                      {editingPost ? 'ড্রাফট হিসেবে আপডেট' : 'ড্রাফট সেভ করুন'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Live Preview */}
                {(postContent || mediaUrls.length > 0) && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">👁️ লাইভ প্রিভিউ</CardTitle></CardHeader>
                    <CardContent>
                      <div className="bg-muted rounded-xl p-3 text-sm space-y-2">
                        {mediaUrls.length > 0 && (
                          <div className={`grid gap-1 rounded-lg overflow-hidden ${mediaUrls.length === 1 ? '' : 'grid-cols-2'}`}>
                            {mediaUrls.slice(0, 4).map((url, i) => (
                              <img key={i} src={url} alt="" className={`w-full object-cover ${mediaUrls.length === 1 ? 'h-40 rounded-lg' : 'h-24'}`} />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-line text-xs leading-relaxed">{postContent}</p>
                        {postHashtags && <p className="text-primary text-[10px]">{postHashtags.split(',').map(h => h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`).join(' ')}</p>}
                        {postLink && <p className="text-[10px] text-blue-600 truncate">{postLink}</p>}
                        <div className="flex gap-1 pt-1">
                          {selectedPlatforms.map(pid => {
                            const plat = PLATFORMS.find(x => x.id === pid);
                            return plat ? <plat.icon key={pid} className="w-3.5 h-3.5" style={{ color: plat.color }} /> : null;
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle className="text-base">📋 পোস্ট হিস্ট্রি ({filteredPosts.length})</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="খুঁজুন..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-8 w-40" />
                    </div>
                    <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                        <SelectItem value="draft">ড্রাফট</SelectItem>
                        <SelectItem value="scheduled">শিডিউল</SelectItem>
                        <SelectItem value="published">পাবলিশড</SelectItem>
                        <SelectItem value="failed">ব্যর্থ</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={historyPlatformFilter} onValueChange={setHistoryPlatformFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব প্ল্যাটফর্ম</SelectItem>
                        {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>কন্টেন্ট</TableHead>
                      <TableHead>চ্যানেল</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>রেজাল্ট</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.map(post => {
                      const results = getResultsForPost(post.id);
                      const hasFailed = results.some(r => r.status === 'failed');
                      return (
                        <TableRow key={post.id} className="group">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(post.created_at), 'dd/MM/yy HH:mm')}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-center gap-2">
                              {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                              <div className="min-w-0">
                                <p className="truncate text-sm">{post.content_bn || post.content}</p>
                                {post.link_url && <p className="text-[10px] text-blue-500 truncate">{post.link_url}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(post.platforms || []).map((p: string) => {
                                const plat = PLATFORMS.find(x => x.id === p);
                                const result = results.find(r => r.platform === p);
                                return plat ? (
                                  <div key={p} className="relative" title={`${plat.name}: ${result ? statusLabels[result.status] || result.status : 'N/A'}`}>
                                    <plat.icon className="w-4 h-4" style={{ color: plat.color }} />
                                    {result?.status === 'success' && <Check className="w-2.5 h-2.5 text-green-600 absolute -bottom-1 -right-1" />}
                                    {result?.status === 'failed' && <X className="w-2.5 h-2.5 text-red-600 absolute -bottom-1 -right-1" />}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[post.status] || ''} variant="outline">
                              {statusLabels[post.status] || post.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 text-xs">
                              {results.length > 0 && (
                                <>
                                  <span className="text-green-600">{results.filter(r => r.status === 'success').length} ✓</span>
                                  {results.some(r => r.status === 'failed') && (
                                    <span className="text-red-600">{results.filter(r => r.status === 'failed').length} ✗</span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              <Button variant="ghost" size="icon" title="বিস্তারিত দেখুন" onClick={() => setViewingPost(post)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="এডিট করুন" onClick={() => editPost(post)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="ডুপ্লিকেট" onClick={() => duplicatePost(post)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                              {(post.status === 'published' || post.status === 'failed') && (
                                <Button variant="ghost" size="icon" title="রিট্রাই" onClick={() => retryPost.mutate(post.id)} disabled={retryPost.isPending}>
                                  <RotateCcw className={`w-4 h-4 text-orange-500 ${retryPost.isPending ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="ডিলিট" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deletePost.mutate(post.id); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPosts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো পোস্ট পাওয়া যায়নি</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCOUNTS TAB */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">🔗 কানেক্টেড অ্যাকাউন্ট</CardTitle>
                <Button size="sm" onClick={() => { resetAccountForm(); setShowAccountDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> নতুন অ্যাকাউন্ট
                </Button>

                <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingAccount ? '✏️ অ্যাকাউন্ট আপডেট' : '➕ নতুন অ্যাকাউন্ট যোগ করুন'}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>প্ল্যাটফর্ম</Label>
                        <Select value={accPlatform} onValueChange={setAccPlatform}>
                          <SelectTrigger><SelectValue placeholder="সিলেক্ট করুন" /></SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>অ্যাকাউন্ট নাম</Label>
                        <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="যেমন: My Page" />
                      </div>
                      <div>
                        <Label>{editingAccount ? 'নতুন API Token (পরিবর্তন করতে চাইলে)' : 'API Token / Access Token'}</Label>
                        <Input type="password" value={accToken} onChange={e => setAccToken(e.target.value)} placeholder={editingAccount ? 'খালি রাখলে আগেরটা থাকবে' : 'Token দিন'} />
                      </div>
                      {['facebook', 'instagram', 'linkedin'].includes(accPlatform) && (
                        <div>
                          <Label>Page/Organization ID</Label>
                          <Input value={accPageId} onChange={e => setAccPageId(e.target.value)} placeholder="Page বা Organization ID" />
                        </div>
                      )}
                      {['telegram', 'whatsapp'].includes(accPlatform) && (
                        <div>
                          <Label>Channel/Chat ID</Label>
                          <Input value={accChannelId} onChange={e => setAccChannelId(e.target.value)} placeholder="Channel বা Chat ID" />
                          {accPlatform === 'telegram' && <p className="text-xs text-muted-foreground mt-1">@channel_username অথবা -100xxxxxxx ফরম্যাটে দিন</p>}
                        </div>
                      )}
                      <Button className="w-full" disabled={!accPlatform || !accName} onClick={() => saveAccount.mutate()}>
                        {editingAccount ? 'আপডেট করুন' : 'সেভ করুন'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>প্ল্যাটফর্ম</TableHead>
                      <TableHead>অ্যাকাউন্ট</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>যোগ করা হয়েছে</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(acc => {
                      const plat = PLATFORMS.find(p => p.id === acc.platform);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {plat && <plat.icon className="w-5 h-5" style={{ color: plat.color }} />}
                              <span className="font-medium">{plat?.name || acc.platform}</span>
                            </div>
                          </TableCell>
                          <TableCell>{acc.account_name}</TableCell>
                          <TableCell><Switch checked={acc.is_active} onCheckedChange={checked => toggleAccount.mutate({ id: acc.id, active: checked })} /></TableCell>
                          <TableCell className="text-xs">{format(new Date(acc.created_at), 'dd/MM/yy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => editAccount(acc)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('মুছে ফেলতে চান?')) deleteAccount.mutate(acc.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {accounts.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো অ্যাকাউন্ট কানেক্ট করা নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm">📖 সেটআপ গাইড</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Facebook/Instagram:</p>
                      <p>→ Meta Developer Portal থেকে Page Access Token নিন</p>
                      <p>→ Page ID: পেজের About সেকশন থেকে পাবেন</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Telegram:</p>
                      <p>→ @BotFather থেকে Bot Token নিন</p>
                      <p>→ Channel ID: @channel_username বা -100xxxxxxx</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Twitter/X:</p>
                      <p>→ Twitter Developer Portal থেকে Bearer Token নিন</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">LinkedIn:</p>
                      <p>→ LinkedIn Developer Portal থেকে Access Token নিন</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">📊 প্ল্যাটফর্ম অনুযায়ী পোস্ট</CardTitle></CardHeader>
                <CardContent>
                  {platformPostCount.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={platformPostCount} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {platformPostCount.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">ডেটা নেই</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">📈 এনগেজমেন্ট সামারি</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'মোট ভিউ', value: totalViews, icon: Eye, color: 'text-blue-500' },
                      { label: 'মোট লাইক', value: totalLikes, icon: Heart, color: 'text-red-500' },
                      { label: 'মোট কমেন্ট', value: totalComments, icon: MessageSquare, color: 'text-green-500' },
                      { label: 'মোট শেয়ার', value: totalShares, icon: Share2, color: 'text-purple-500' },
                      { label: 'মোট রিচ', value: postResults.reduce((s, r) => s + (r.reach_count || 0), 0), icon: TrendingUp, color: 'text-orange-500' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          <span className="text-sm">{stat.label}</span>
                        </div>
                        <span className="text-lg font-bold">{stat.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">📋 প্ল্যাটফর্ম বিস্তারিত</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>প্ল্যাটফর্ম</TableHead>
                        <TableHead className="text-right">পোস্ট</TableHead>
                        <TableHead className="text-right">সফল</TableHead>
                        <TableHead className="text-right">ব্যর্থ</TableHead>
                        <TableHead className="text-right">ভিউ</TableHead>
                        <TableHead className="text-right">লাইক</TableHead>
                        <TableHead className="text-right">কমেন্ট</TableHead>
                      </TableRow>
                    </TableHeader>
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

      {/* Dynamic Product/Category Selector Dialog */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              প্রোডাক্ট / ক্যাটাগরি সিলেক্ট করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="নাম দিয়ে খুঁজুন..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-9 h-10"
                autoFocus
              />
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {[
                { key: 'books' as const, label: '📚 বই', count: products.length },
                { key: 'universal' as const, label: '🛍️ প্রোডাক্ট', count: universalProducts.length },
                { key: 'categories' as const, label: '📂 ক্যাটাগরি', count: categories.length + universalCategories.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectorTab(tab.key)}
                  className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${selectorTab === tab.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-1 p-1">
                {selectorTab === 'books' && (
                  <>
                    {products.map(p => (
                      <button
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
                        onClick={() => selectProduct(p, 'book')}
                      >
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-16 object-cover rounded-md shadow-sm" />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded-md flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title_bn || p.title_en}</p>
                          {p.author && <p className="text-[11px] text-muted-foreground truncate">{p.author}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold text-primary">৳{p.discount_price || p.price}</span>
                            {p.discount_price && p.price > p.discount_price && (
                              <span className="text-[10px] text-muted-foreground line-through">৳{p.price}</span>
                            )}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                    {products.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">কোনো বই পাওয়া যায়নি</p>}
                  </>
                )}

                {selectorTab === 'universal' && (
                  <>
                    {universalProducts.map(p => (
                      <button
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
                        onClick={() => selectProduct(p, 'universal')}
                      >
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-md shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name_bn || p.name_en}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px]">{p.product_type}</Badge>
                            <span className="text-xs font-semibold text-primary">৳{p.discount_price || p.price}</span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                    {universalProducts.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি</p>}
                  </>
                )}

                {selectorTab === 'categories' && (
                  <>
                    {categories.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">বই ক্যাটাগরি</p>
                        {categories.map(c => (
                          <button
                            key={c.id}
                            className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
                            onClick={() => selectCategory(c, 'book')}
                          >
                            {c.image_url ? (
                              <img src={c.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.name_bn}</p>
                              {c.name_en && <p className="text-[10px] text-muted-foreground">{c.name_en}</p>}
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </>
                    )}
                    {universalCategories.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 pt-3 uppercase tracking-wide">ইউনিভার্সাল ক্যাটাগরি</p>
                        {universalCategories.map(c => (
                          <button
                            key={c.id}
                            className="flex items-center gap-3 p-2.5 w-full text-left rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
                            onClick={() => selectCategory(c, 'universal')}
                          >
                            {c.image_url ? (
                              <img src={c.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.name_bn}</p>
                              <Badge variant="outline" className="text-[9px]">{c.product_type}</Badge>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </>
                    )}
                    {categories.length === 0 && universalCategories.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">কোনো ক্যাটাগরি পাওয়া যায়নি</p>
                    )}
                  </>
                )}
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
              <div className="flex items-center gap-2">
                <Badge className={statusColors[viewingPost.status] || ''} variant="outline">{statusLabels[viewingPost.status] || viewingPost.status}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(viewingPost.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>

              {viewingPost.media_urls?.length > 0 && (
                <div className={`grid gap-1 rounded-lg overflow-hidden ${viewingPost.media_urls.length === 1 ? '' : 'grid-cols-2'}`}>
                  {viewingPost.media_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-full h-32 object-cover" />
                  ))}
                </div>
              )}

              {viewingPost.content && (
                <div>
                  <Label className="text-xs">English</Label>
                  <p className="text-sm bg-muted p-2 rounded whitespace-pre-line">{viewingPost.content}</p>
                </div>
              )}
              {viewingPost.content_bn && (
                <div>
                  <Label className="text-xs">বাংলা</Label>
                  <p className="text-sm bg-muted p-2 rounded whitespace-pre-line">{viewingPost.content_bn}</p>
                </div>
              )}
              {viewingPost.hashtags?.length > 0 && <p className="text-xs text-primary">{viewingPost.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>}
              {viewingPost.link_url && <p className="text-xs text-blue-600 truncate">{viewingPost.link_url}</p>}

              <div>
                <Label className="text-xs mb-2 block">চ্যানেল রেজাল্ট</Label>
                <div className="space-y-2">
                  {getResultsForPost(viewingPost.id).map((r, i) => {
                    const plat = PLATFORMS.find(p => p.id === r.platform);
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
                        {plat && <plat.icon className="w-4 h-4" style={{ color: plat.color }} />}
                        <span className="flex-1">{plat?.name || r.platform}</span>
                        <Badge className={statusColors[r.status] || ''} variant="outline">{statusLabels[r.status] || r.status}</Badge>
                        {r.error_message && <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={r.error_message}>{r.error_message}</span>}
                      </div>
                    );
                  })}
                  {getResultsForPost(viewingPost.id).length === 0 && <p className="text-xs text-muted-foreground">রেজাল্ট নেই</p>}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { editPost(viewingPost); setViewingPost(null); }}>
                  <Edit className="w-4 h-4 mr-1" /> এডিট করুন
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { duplicatePost(viewingPost); setViewingPost(null); }}>
                  <Copy className="w-4 h-4 mr-1" /> ডুপ্লিকেট
                </Button>
                {getResultsForPost(viewingPost.id).some(r => r.status === 'failed') && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { retryPost.mutate(viewingPost.id); setViewingPost(null); }}>
                    <RotateCcw className="w-4 h-4 mr-1" /> রিট্রাই
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
    </AdminLayout>
  );
};

export default AdminSocialMedia;
