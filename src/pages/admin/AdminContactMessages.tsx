import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Mail, Search, Trash2, Eye, Reply, Star, Clock, CheckCircle, AlertCircle,
  Filter, MailOpen, Loader2, MessageSquare, User, Phone, Calendar, FileText,
  Archive, RefreshCw, ChevronLeft, ChevronRight, Send
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
  const pageSize = 20;

  // Fetch messages
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["contact-messages", statusFilter, priorityFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("contact_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }
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
        .select("status");
      if (error) throw error;
      const all = (data || []) as unknown as { status: string }[];
      return {
        total: all.length,
        unread: all.filter((m) => m.status === "unread").length,
        read: all.filter((m) => m.status === "read").length,
        replied: all.filter((m) => m.status === "replied").length,
        archived: all.filter((m) => m.status === "archived").length,
      };
    },
  });

  // Mark as read when viewing
  const markAsRead = async (msg: ContactMessage) => {
    if (msg.status === "unread") {
      await supabase
        .from("contact_messages" as any)
        .update({ status: "read" } as any)
        .eq("id", msg.id);
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
    }
  };

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contact_messages" as any)
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  // Update priority
  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { error } = await supabase
        .from("contact_messages" as any)
        .update({ priority } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("প্রায়োরিটি আপডেট হয়েছে");
    },
  });

  // Save admin notes
  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("contact_messages" as any)
        .update({ admin_notes: notes } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("নোট সেভ হয়েছে");
    },
  });

  // Delete message
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setSelectedMessage(null);
      toast.success("বার্তা মুছে ফেলা হয়েছে");
    },
  });

  // Send reply via email
  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSendingReply(true);

    try {
      const { error: fnError } = await supabase.functions.invoke("send-email", {
        body: {
          to: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">বইআলো - আপনার বার্তার উত্তর</h2>
              <p>প্রিয় ${selectedMessage.name},</p>
              <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
                ${replyText.replace(/\n/g, "<br/>")}
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #888; font-size: 12px;">
                আপনার আসল বার্তা:<br/>
                <em>"${selectedMessage.message.slice(0, 200)}${selectedMessage.message.length > 200 ? "..." : ""}"</em>
              </p>
              <p style="color: #888; font-size: 12px;">ধন্যবাদ,<br/>বইআলো টিম</p>
            </div>
          `,
        },
      });

      if (fnError) throw fnError;

      // Update message status
      await supabase
        .from("contact_messages" as any)
        .update({
          status: "replied",
          reply_message: replyText,
          replied_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedMessage.id);

      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages-stats"] });
      setReplyDialog(false);
      setReplyText("");
      setSelectedMessage((prev) =>
        prev ? { ...prev, status: "replied", reply_message: replyText, replied_at: new Date().toISOString() } : null
      );
      toast.success("উত্তর সফলভাবে পাঠানো হয়েছে!");
    } catch (err) {
      console.error("Reply error:", err);
      toast.error("উত্তর পাঠাতে সমস্যা হয়েছে। ইমেইল প্রোভাইডার কনফিগার করা আছে কিনা দেখুন।");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("contact-messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => {
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              কন্টাক্ট বার্তা
            </h1>
            <p className="text-muted-foreground text-sm">গ্রাহকদের পাঠানো বার্তা পরিচালনা ও উত্তর দিন</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            রিফ্রেশ
          </Button>
        </div>

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
                    onClick={() => openMessage(msg)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedMessage?.id === msg.id
                        ? "border-primary bg-primary/5"
                        : msg.status === "unread"
                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {msg.status === "unread" && (
                            <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                          )}
                          <span className={`font-medium truncate ${msg.status === "unread" ? "font-bold" : ""}`}>
                            {msg.name}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{msg.subject}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{msg.message.slice(0, 80)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "dd/MM/yy")}
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
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={messages.length < pageSize}>
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
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{selectedMessage.name}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedMessage.email}</span>
                        {selectedMessage.phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedMessage.phone}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(selectedMessage.created_at), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          setReplyText("");
                          setReplyDialog(true);
                        }}
                      >
                        <Reply className="w-4 h-4" />
                        উত্তর দিন
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("এই বার্তা মুছতে চান?")) deleteMessage.mutate(selectedMessage.id);
                        }}
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
                          setSelectedMessage((prev) => prev ? { ...prev, status: v } : null);
                        }}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
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
                          setSelectedMessage((prev) => prev ? { ...prev, priority: v } : null);
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
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
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => saveNotes.mutate({ id: selectedMessage.id, notes: adminNotes })}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      নোট সেভ করুন
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
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog} onOpenChange={setReplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5" />
              উত্তর পাঠান
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="font-medium">প্রাপক: {selectedMessage?.name} ({selectedMessage?.email})</p>
              <p className="text-muted-foreground text-xs mt-1">বিষয়: Re: {selectedMessage?.subject}</p>
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
