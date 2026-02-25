import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import {
  Mail, Search, Trash2, Eye, Reply, Star, Clock, CheckCircle, AlertCircle,
  Filter, MailOpen, Loader2, MessageSquare, User, Phone, Calendar, FileText,
  Archive, RefreshCw, ChevronLeft, ChevronRight, Send, Bell, BellOff, Volume2,
  VolumeX, Download, Zap, Copy, CheckCheck, AlertTriangle, TrendingUp,
  Activity, BarChart3, PieChart
} from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  reply_message: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  unread: { label: "অপঠিত", color: "destructive", icon: Mail },
  read: { label: "পঠিত", color: "secondary", icon: MailOpen },
  replied: { label: "উত্তর দেওয়া হয়েছে", color: "default", icon: Reply },
  archived: { label: "আর্কাইভ", color: "outline", icon: Archive },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "কম", color: "secondary" },
  normal: { label: "সাধারণ", color: "default" },
  high: { label: "উচ্চ", color: "destructive" },
  urgent: { label: "জরুরি", color: "destructive" },
};

const quickReplyTemplates = [
  { label: "ধন্যবাদ বার্তা", text: "আপনার বার্তার জন্য ধন্যবাদ। আমরা আপনার অনুরোধটি পেয়েছি এবং শীঘ্রই সমাধান করব। কোনো প্রশ্ন থাকলে জানাবেন।\n\nধন্যবাদান্তে,\nবইআলো টিম" },
  { label: "অর্ডার সংক্রান্ত", text: "আপনার অর্ডার সংক্রান্ত বার্তার জন্য ধন্যবাদ। আমরা বিষয়টি পর্যালোচনা করছি। অনুগ্রহ করে আপনার অর্ডার নম্বরটি শেয়ার করুন যাতে আমরা দ্রুত সাহায্য করতে পারি।\n\nধন্যবাদ,\nবইআলো সাপোর্ট" },
  { label: "রিফান্ড তথ্য", text: "আপনার রিফান্ড অনুরোধ আমরা পেয়েছি। আমাদের রিফান্ড পলিসি অনুযায়ী ৭-১০ কার্যদিবসের মধ্যে রিফান্ড প্রক্রিয়া সম্পন্ন হবে। বিস্তারিত জানতে আমাদের রিফান্ড পলিসি পৃষ্ঠা দেখুন।\n\nধন্যবাদ,\nবইআলো টিম" },
  { label: "ডেলিভারি আপডেট", text: "আপনার ডেলিভারি সংক্রান্ত জিজ্ঞাসার জন্য ধন্যবাদ। ঢাকার ভিতরে সাধারণত ১-২ দিন এবং ঢাকার বাইরে ৩-৫ দিন সময় লাগে। আপনার অর্ডার ট্র্যাকিং পৃষ্ঠা থেকে আপডেট দেখতে পারবেন।\n\nধন্যবাদ,\nবইআলো টিম" },
];

const AdminContactMessages = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [page, setPage] = useState(0);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("inbox");
  const [newMessagePulse, setNewMessagePulse] = useState(false);
  const prevUnreadRef = useRef<number>(0);
  const pageSize = 20;

  // Notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio not available
    }
  }, [soundEnabled]);

  // Desktop notification
  const showDesktopNotification = useCallback((name: string, subject: string) => {
    if (Notification.permission === "granted") {
      new Notification("নতুন কন্টাক্ট বার্তা - বইআলো", {
        body: `${name}: ${subject}`,
        icon: "/favicon.ico",
      });
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch messages
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["contact-messages", statusFilter, priorityFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("contact_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ContactMessage[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["contact-messages-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages" as any)
        .select("status, priority, created_at");
      if (error) throw error;
      const all = (data || []) as unknown as { status: string; priority: string; created_at: string }[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMessages = all.filter(m => new Date(m.created_at) >= today);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekMessages = all.filter(m => new Date(m.created_at) >= weekAgo);
      
      return {
        total: all.length,
        unread: all.filter(m => m.status === "unread").length,
        read: all.filter(m => m.status === "read").length,
        replied: all.filter(m => m.status === "replied").length,
        archived: all.filter(m => m.status === "archived").length,
        urgent: all.filter(m => m.priority === "urgent" || m.priority === "high").length,
        today: todayMessages.length,
        todayUnread: todayMessages.filter(m => m.status === "unread").length,
        week: weekMessages.length,
        responseRate: all.length > 0 ? Math.round((all.filter(m => m.status === "replied").length / all.length) * 100) : 0,
      };
    },
  });

  // Detect new messages for notification
  useEffect(() => {
    const currentUnread = stats?.unread || 0;
    if (prevUnreadRef.current > 0 && currentUnread > prevUnreadRef.current) {
      playNotificationSound();
      setNewMessagePulse(true);
      setTimeout(() => setNewMessagePulse(false), 3000);
      // Find the newest message for desktop notification
      if (messages.length > 0 && messages[0].status === "unread") {
        showDesktopNotification(messages[0].name, messages[0].subject);
      }
    }
    prevUnreadRef.current = currentUnread;
  }, [stats?.unread, messages, playNotificationSound, showDesktopNotification]);

  // Mark as read
  const markAsRead = async (msg: ContactMessage) => {
    if (msg.status === "unread") {
      await supabase.from("contact_messages" as any).update({ status: "read" } as any).eq("id", msg.id);
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
    }
  };

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contact_messages" as any).update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { error } = await supabase.from("contact_messages" as any).update({ priority } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("প্রায়োরিটি আপডেট হয়েছে");
    },
  });

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("contact_messages" as any).update({ admin_notes: notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("নোট সেভ হয়েছে");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setSelectedMessage(null);
      toast.success("বার্তা মুছে ফেলা হয়েছে");
    },
  });

  // Bulk actions
  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await supabase.from("contact_messages" as any).update({ status } as any).eq("id", id);
      }
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size}টি বার্তা আপডেট হয়েছে`);
    } catch {
      toast.error("বাল্ক আপডেটে সমস্যা হয়েছে");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}টি বার্তা মুছতে চান?`)) return;
    try {
      for (const id of selectedIds) {
        await supabase.from("contact_messages" as any).delete().eq("id", id);
      }
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setSelectedIds(new Set());
      setSelectedMessage(null);
      toast.success("বার্তা মুছে ফেলা হয়েছে");
    } catch {
      toast.error("মুছতে সমস্যা হয়েছে");
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (messages.length === 0) return;
    const headers = ["নাম", "ইমেইল", "ফোন", "বিষয়", "বার্তা", "স্ট্যাটাস", "প্রায়োরিটি", "তারিখ", "উত্তর"];
    const rows = messages.map(m => [
      m.name, m.email, m.phone || "", m.subject,
      `"${m.message.replace(/"/g, '""')}"`,
      statusConfig[m.status]?.label || m.status,
      priorityConfig[m.priority]?.label || m.priority,
      format(new Date(m.created_at), "dd/MM/yyyy HH:mm"),
      m.reply_message ? `"${m.reply_message.replace(/"/g, '""')}"` : "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-messages-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হচ্ছে");
  };

  // Send reply
  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("send-email", {
        body: {
          to: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px 12px 0 0;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">বইআলো</h2>
                <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">আপনার বার্তার উত্তর</p>
              </div>
              <div style="padding: 24px; background: #ffffff;">
                <p style="color: #333; margin: 0 0 16px;">প্রিয় ${selectedMessage.name},</p>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; margin: 16px 0; color: #333; line-height: 1.6;">
                  ${replyText.replace(/\n/g, "<br/>")}
                </div>
              </div>
              <div style="padding: 16px 24px; background: #f8f9fa; border-radius: 0 0 12px 12px;">
                <p style="color: #888; font-size: 12px; margin: 0 0 8px;">
                  <strong>আপনার আসল বার্তা:</strong><br/>
                  <em>"${selectedMessage.message.slice(0, 300)}${selectedMessage.message.length > 300 ? "..." : ""}"</em>
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 12px 0;" />
                <p style="color: #999; font-size: 11px; margin: 0;">ধন্যবাদ, বইআলো টিম | info@boialo.com</p>
              </div>
            </div>
          `,
        },
      });
      if (fnError) throw fnError;

      await supabase.from("contact_messages" as any).update({
        status: "replied", reply_message: replyText, replied_at: new Date().toISOString(),
      } as any).eq("id", selectedMessage.id);

      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setReplyDialog(false);
      setReplyText("");
      setSelectedMessage(prev => prev ? { ...prev, status: "replied", reply_message: replyText, replied_at: new Date().toISOString() } : null);
      toast.success("উত্তর সফলভাবে পাঠানো হয়েছে!");
    } catch (err) {
      console.error("Reply error:", err);
      toast.error("উত্তর পাঠাতে সমস্যা হয়েছে। ইমেইল প্রোভাইডার কনফিগার করা আছে কিনা দেখুন।");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Realtime subscription with notification
  useEffect(() => {
    const channel = supabase
      .channel("contact-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
        queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
        const newMsg = payload.new as any;
        if (newMsg) {
          toast.info(`নতুন বার্তা: ${newMsg.name} - ${newMsg.subject}`, { duration: 5000 });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contact_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
        queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "contact_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
        queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const openMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.admin_notes || "");
    markAsRead(msg);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              কন্টাক্ট বার্তা
              {(stats?.unread || 0) > 0 && (
                <Badge variant="destructive" className={`ml-2 ${newMessagePulse ? "animate-pulse" : ""}`}>
                  {stats?.unread} নতুন
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">গ্রাহকদের পাঠানো বার্তা পরিচালনা ও উত্তর দিন</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "সাউন্ড বন্ধ" : "সাউন্ড চালু"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              CSV এক্সপোর্ট
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              রিফ্রেশ
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Mail className="w-4 h-4" />
              ইনবক্স
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              অ্যানালিটিক্স
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">আজকের বার্তা</p>
                      <p className="text-3xl font-bold mt-1">{stats?.today || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stats?.todayUnread || 0} অপঠিত</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">এই সপ্তাহে</p>
                      <p className="text-3xl font-bold mt-1">{stats?.week || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">গত ৭ দিন</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">রেসপন্স রেট</p>
                      <p className="text-3xl font-bold mt-1">{stats?.responseRate || 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">মোট উত্তর দেওয়া</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCheck className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">জরুরি/উচ্চ</p>
                      <p className="text-3xl font-bold mt-1 text-destructive">{stats?.urgent || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">মনোযোগ প্রয়োজন</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Timeline */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  সাম্প্রতিক কার্যকলাপ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {messages.slice(0, 10).map((msg, i) => (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        msg.status === "unread" ? "bg-destructive" :
                        msg.status === "replied" ? "bg-green-500" :
                        msg.status === "archived" ? "bg-muted-foreground" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{msg.name}</span>
                          <span className="text-muted-foreground"> — {msg.subject}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: bn })}
                          {msg.status === "replied" && " • উত্তর দেওয়া হয়েছে"}
                        </p>
                      </div>
                      <Badge variant={statusConfig[msg.status]?.color as any || "secondary"} className="text-[10px] shrink-0">
                        {statusConfig[msg.status]?.label || msg.status}
                      </Badge>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">কোনো কার্যকলাপ নেই</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbox">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "মোট", value: stats?.total || 0, icon: MessageSquare, color: "text-foreground" },
                { label: "অপঠিত", value: stats?.unread || 0, icon: Mail, color: "text-destructive" },
                { label: "পঠিত", value: stats?.read || 0, icon: MailOpen, color: "text-blue-500" },
                { label: "উত্তর দেওয়া", value: stats?.replied || 0, icon: Reply, color: "text-green-500" },
                { label: "আর্কাইভ", value: stats?.archived || 0, icon: Archive, color: "text-muted-foreground" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-medium">{selectedIds.size}টি সিলেক্টেড</span>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("read")}>
                  <MailOpen className="w-3 h-3 mr-1" />পঠিত
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("archived")}>
                  <Archive className="w-3 h-3 mr-1" />আর্কাইভ
                </Button>
                <Button size="sm" variant="destructive" onClick={bulkDelete}>
                  <Trash2 className="w-3 h-3 mr-1" />মুছুন
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>বাতিল</Button>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="নাম, ইমেইল বা বিষয় খুঁজুন..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="স্ট্যাটাস" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
                  <SelectItem value="unread">অপঠিত</SelectItem>
                  <SelectItem value="read">পঠিত</SelectItem>
                  <SelectItem value="replied">উত্তর দেওয়া</SelectItem>
                  <SelectItem value="archived">আর্কাইভ</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="প্রায়োরিটি" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল প্রায়োরিটি</SelectItem>
                  <SelectItem value="low">কম</SelectItem>
                  <SelectItem value="normal">সাধারণ</SelectItem>
                  <SelectItem value="high">উচ্চ</SelectItem>
                  <SelectItem value="urgent">জরুরি</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Messages List & Detail */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* List */}
              <div className="lg:col-span-2 space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    checked={messages.length > 0 && selectedIds.size === messages.length}
                    onCheckedChange={selectAll}
                  />
                  <span className="text-xs text-muted-foreground">সবগুলো সিলেক্ট</span>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>কোনো বার্তা পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedMessage?.id === msg.id
                            ? "border-primary bg-primary/5"
                            : msg.status === "unread"
                            ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedIds.has(msg.id)}
                            onCheckedChange={() => toggleSelect(msg.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0" onClick={() => openMessage(msg)}>
                            <div className="flex items-center gap-2 mb-1">
                              {msg.status === "unread" && (
                                <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                              )}
                              <span className={`font-medium truncate ${msg.status === "unread" ? "font-bold" : ""}`}>
                                {msg.name}
                              </span>
                              {(msg.priority === "high" || msg.priority === "urgent") && (
                                <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{msg.subject}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">{msg.message.slice(0, 80)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: bn })}
                            </span>
                            <Badge variant={statusConfig[msg.status]?.color as any || "secondary"} className="text-[10px]">
                              {statusConfig[msg.status]?.label || msg.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={messages.length < pageSize}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Detail */}
              <div className="lg:col-span-3">
                {selectedMessage ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{selectedMessage.name}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedMessage.email}</span>
                            {selectedMessage.phone && (
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedMessage.phone}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(selectedMessage.created_at), "dd MMM yyyy, hh:mm a")}
                            <span className="mx-1">•</span>
                            {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true, locale: bn })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline" size="sm" className="gap-1"
                            onClick={() => { setReplyText(""); setReplyDialog(true); }}
                          >
                            <Reply className="w-4 h-4" />উত্তর দিন
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { if (confirm("এই বার্তা মুছতে চান?")) deleteMessage.mutate(selectedMessage.id); }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Controls */}
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <Label className="text-xs">স্ট্যাটাস</Label>
                          <Select
                            value={selectedMessage.status}
                            onValueChange={(v) => {
                              updateStatus.mutate({ id: selectedMessage.id, status: v });
                              setSelectedMessage(prev => prev ? { ...prev, status: v } : null);
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unread">অপঠিত</SelectItem>
                              <SelectItem value="read">পঠিত</SelectItem>
                              <SelectItem value="replied">উত্তর দেওয়া</SelectItem>
                              <SelectItem value="archived">আর্কাইভ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">প্রায়োরিটি</Label>
                          <Select
                            value={selectedMessage.priority}
                            onValueChange={(v) => {
                              updatePriority.mutate({ id: selectedMessage.id, priority: v });
                              setSelectedMessage(prev => prev ? { ...prev, priority: v } : null);
                            }}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">কম</SelectItem>
                              <SelectItem value="normal">সাধারণ</SelectItem>
                              <SelectItem value="high">উচ্চ</SelectItem>
                              <SelectItem value="urgent">জরুরি</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Message Body */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="whitespace-pre-wrap text-sm">{selectedMessage.message}</p>
                      </div>

                      {/* Reply History */}
                      {selectedMessage.reply_message && (
                        <div className="border-l-4 border-primary/30 pl-4">
                          <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                            <Reply className="w-3 h-3" />
                            আপনার উত্তর — {selectedMessage.replied_at && format(new Date(selectedMessage.replied_at), "dd MMM yyyy, hh:mm a")}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{selectedMessage.reply_message}</p>
                        </div>
                      )}

                      {/* Admin Notes */}
                      <div>
                        <Label className="text-xs">এডমিন নোট (শুধু অভ্যন্তরীণ)</Label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="অভ্যন্তরীণ নোট লিখুন..."
                          rows={3}
                          className="mt-1 text-sm"
                        />
                        <Button
                          size="sm" variant="outline" className="mt-2"
                          onClick={() => saveNotes.mutate({ id: selectedMessage.id, notes: adminNotes })}
                        >
                          <FileText className="w-3 h-3 mr-1" />নোট সেভ করুন
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>একটি বার্তা সিলেক্ট করুন</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog} onOpenChange={setReplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5" />উত্তর পাঠান
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="font-medium">প্রাপক: {selectedMessage?.name} ({selectedMessage?.email})</p>
              <p className="text-muted-foreground text-xs mt-1">বিষয়: Re: {selectedMessage?.subject}</p>
            </div>

            {/* Quick Reply Templates */}
            <div>
              <Label className="text-xs mb-2 block">দ্রুত উত্তর টেমপ্লেট</Label>
              <div className="flex flex-wrap gap-2">
                {quickReplyTemplates.map((tpl) => (
                  <Button
                    key={tpl.label}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setReplyText(tpl.text)}
                  >
                    <Zap className="w-3 h-3" />
                    {tpl.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>আপনার উত্তর *</Label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="উত্তর লিখুন..."
                rows={6}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{replyText.length} অক্ষর</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(false)}>বাতিল</Button>
            <Button onClick={sendReply} disabled={!replyText.trim() || isSendingReply} className="gap-2">
              {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ইমেইল পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminContactMessages;
