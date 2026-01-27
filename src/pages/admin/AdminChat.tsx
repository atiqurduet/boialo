import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { bn } from "date-fns/locale";
import { 
  MessageCircle, 
  Send, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Download,
  Trash2,
  Archive,
  MoreVertical,
  RefreshCw,
  Filter,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  History,
  ChevronDown,
  Eye,
  RotateCcw,
  FileText,
  Paperclip,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Conversation {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
  assigned_to: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

interface ChatStats {
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  totalMessages: number;
  avgResponseTime: string;
}

const AdminChat = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } = useQuery({
    queryKey: ["admin-chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["admin-chat-messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Calculate stats
  const stats: ChatStats = {
    totalConversations: conversations?.length || 0,
    openConversations: conversations?.filter(c => c.status === "open").length || 0,
    closedConversations: conversations?.filter(c => c.status === "closed").length || 0,
    totalMessages: 0,
    avgResponseTime: "~5 মিনিট",
  };

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", selectedConversation] });
          queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (selectedConversation) {
      supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", selectedConversation)
        .eq("sender_type", "customer");
    }
  }, [selectedConversation]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedConversation) return;
      
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation,
        sender_type: "admin",
        sender_id: user?.id,
        sender_name: "Support Team",
        message,
      });
      
      if (error) throw error;

      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
    },
    onError: () => {
      toast.error("মেসেজ পাঠাতে সমস্যা হয়েছে");
    },
  });

  // Close conversation
  const closeConversation = async (id: string) => {
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "closed" })
      .eq("id", id);
    
    if (error) {
      toast.error("বন্ধ করতে সমস্যা হয়েছে");
    } else {
      toast.success("কথোপকথন বন্ধ হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
    }
  };

  // Reopen conversation
  const reopenConversation = async (id: string) => {
    const { error } = await supabase
      .from("chat_conversations")
      .update({ status: "open" })
      .eq("id", id);
    
    if (error) {
      toast.error("পুনরায় খুলতে সমস্যা হয়েছে");
    } else {
      toast.success("কথোপকথন পুনরায় খোলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    // First delete all messages
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    
    // Then delete conversation
    const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
    
    if (error) {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে");
    } else {
      toast.success("কথোপকথন মুছে ফেলা হয়েছে");
      if (selectedConversation === id) setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    for (const id of selectedConversations) {
      await supabase.from("chat_messages").delete().eq("conversation_id", id);
      await supabase.from("chat_conversations").delete().eq("id", id);
    }
    toast.success(`${selectedConversations.length}টি কথোপকথন মুছে ফেলা হয়েছে`);
    setSelectedConversations([]);
    setBulkDeleteDialogOpen(false);
    if (selectedConversation && selectedConversations.includes(selectedConversation)) {
      setSelectedConversation(null);
    }
    queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
  };

  // Export conversations
  const exportConversations = async () => {
    const conversationsToExport = filteredConversations || [];
    const exportData = [];

    for (const conv of conversationsToExport) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      exportData.push({
        conversation: {
          id: conv.id,
          visitor_name: conv.visitor_name,
          visitor_phone: conv.visitor_phone,
          visitor_email: conv.visitor_email,
          status: conv.status,
          created_at: conv.created_at,
          last_message_at: conv.last_message_at,
        },
        messages: msgs || [],
      });
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-history-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("চ্যাট হিস্ট্রি এক্সপোর্ট হয়েছে");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  // Filter conversations
  const filteredConversations = conversations?.filter(conv => {
    // Tab filter
    if (activeTab === "open" && conv.status !== "open") return false;
    if (activeTab === "closed" && conv.status !== "closed") return false;

    // Search filter
    const searchMatch = 
      conv.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.visitor_phone?.includes(searchQuery) ||
      conv.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery && !searchMatch) return false;

    // Date filter
    if (dateRange.from && dateRange.to) {
      const convDate = new Date(conv.created_at);
      if (!isWithinInterval(convDate, { 
        start: startOfDay(dateRange.from), 
        end: endOfDay(dateRange.to) 
      })) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    } else {
      return new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime();
    }
  });

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  const toggleSelectConversation = (id: string) => {
    setSelectedConversations(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedConversations.length === filteredConversations?.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(filteredConversations?.map(c => c.id) || []);
    }
  };

  const quickDateFilters = [
    { label: "আজ", days: 0 },
    { label: "গত ৭ দিন", days: 7 },
    { label: "গত ৩০ দিন", days: 30 },
    { label: "গত ৯০ দিন", days: 90 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              চ্যাট ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm">
              কাস্টমারদের সাথে রিয়েল-টাইম যোগাযোগ ও হিস্ট্রি ম্যানেজমেন্ট
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchConversations()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              রিফ্রেশ
            </Button>
            <Button variant="outline" size="sm" onClick={exportConversations}>
              <Download className="h-4 w-4 mr-1" />
              এক্সপোর্ট
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">মোট কথোপকথন</p>
                  <p className="text-2xl font-bold">{stats.totalConversations}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">সক্রিয় চ্যাট</p>
                  <p className="text-2xl font-bold text-green-600">{stats.openConversations}</p>
                </div>
                <Users className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">বন্ধ চ্যাট</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.closedConversations}</p>
                </div>
                <History className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">গড় রেসপন্স</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-22rem)]">
          {/* Conversations List */}
          <Card className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b space-y-3">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">
                    সব ({conversations?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="open" className="text-xs">
                    সক্রিয় ({stats.openConversations})
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="text-xs">
                    বন্ধ ({stats.closedConversations})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="নাম, ফোন, ইমেইল দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {dateRange.from && dateRange.to 
                        ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
                        : "তারিখ ফিল্টার"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 border-b flex flex-wrap gap-1">
                      {quickDateFilters.map((filter) => (
                        <Button
                          key={filter.days}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (filter.days === 0) {
                              setDateRange({ from: new Date(), to: new Date() });
                            } else {
                              setDateRange({ 
                                from: subDays(new Date(), filter.days), 
                                to: new Date() 
                              });
                            }
                          }}
                        >
                          {filter.label}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        ক্লিয়ার
                      </Button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v: "recent" | "oldest") => setSortBy(v)}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">সাম্প্রতিক</SelectItem>
                    <SelectItem value="oldest">পুরাতন</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedConversations.length > 0 && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    {selectedConversations.length}টি নির্বাচিত
                  </span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    মুছুন
                  </Button>
                </div>
              )}
            </CardHeader>

            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="p-4 text-center text-muted-foreground">লোড হচ্ছে...</div>
              ) : filteredConversations?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>কোনো চ্যাট নেই</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Select All */}
                  <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                    <Checkbox 
                      checked={selectedConversations.length === filteredConversations?.length && filteredConversations.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs text-muted-foreground">সব নির্বাচন করুন</span>
                  </div>

                  {filteredConversations?.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-start gap-2 p-3 hover:bg-muted/50 transition-colors ${
                        selectedConversation === conv.id ? "bg-primary/5 border-l-4 border-primary" : ""
                      }`}
                    >
                      <Checkbox 
                        checked={selectedConversations.includes(conv.id)}
                        onCheckedChange={() => toggleSelectConversation(conv.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => setSelectedConversation(conv.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {conv.visitor_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">
                                {conv.visitor_name || "অতিথি"}
                              </span>
                              <Badge 
                                variant={conv.status === "open" ? "default" : "secondary"}
                                className="text-[10px] px-1.5"
                              >
                                {conv.status === "open" ? "সক্রিয়" : "বন্ধ"}
                              </Badge>
                            </div>
                            {conv.visitor_phone && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.visitor_phone}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(conv.last_message_at), "dd MMM yyyy, hh:mm a", { locale: bn })}
                            </p>
                          </div>
                        </div>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedConversation(conv.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            দেখুন
                          </DropdownMenuItem>
                          {conv.status === "open" ? (
                            <DropdownMenuItem onClick={() => closeConversation(conv.id)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              বন্ধ করুন
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => reopenConversation(conv.id)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              পুনরায় খুলুন
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setConversationToDelete(conv.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            মুছে ফেলুন
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedConv?.visitor_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{selectedConv?.visitor_name || "অতিথি"}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {selectedConv?.visitor_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {selectedConv.visitor_phone}
                            </span>
                          )}
                          {selectedConv?.visitor_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {selectedConv.visitor_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedConv?.status === "open" ? "default" : "secondary"}>
                        {selectedConv?.status === "open" ? "সক্রিয়" : "বন্ধ"}
                      </Badge>
                      {selectedConv?.status === "open" ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => closeConversation(selectedConversation)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          বন্ধ করুন
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => reopenConversation(selectedConversation)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          পুনরায় খুলুন
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="text-center text-muted-foreground">লোড হচ্ছে...</div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground">কোনো মেসেজ নেই</div>
                  ) : (
                    <div className="space-y-4">
                      {messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_type === "admin"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {/* Attachment display */}
                            {msg.attachment_url && msg.attachment_type === 'image' && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                <img 
                                  src={msg.attachment_url} 
                                  alt={msg.attachment_name || "Attachment"} 
                                  className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </a>
                            )}
                            {msg.attachment_url && msg.attachment_type === 'pdf' && (
                              <a 
                                href={msg.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${
                                  msg.sender_type === "admin" 
                                    ? "bg-primary-foreground/20" 
                                    : "bg-background/50"
                                } hover:opacity-80 transition-opacity`}
                              >
                                <FileText className="h-5 w-5" />
                                <span className="text-sm truncate max-w-[150px]">{msg.attachment_name || "PDF ফাইল"}</span>
                              </a>
                            )}
                            <div className={`flex items-center gap-1 mt-1 ${
                              msg.sender_type === "admin" ? "justify-end" : ""
                            }`}>
                              <span className={`text-[10px] ${
                                msg.sender_type === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {format(new Date(msg.created_at), "hh:mm a")}
                              </span>
                              {msg.sender_type === "admin" && (
                                <CheckCircle2 className={`h-3 w-3 ${
                                  msg.is_read ? "text-primary-foreground" : "text-primary-foreground/50"
                                }`} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={selectedConv?.status === "open" ? "মেসেজ লিখুন..." : "চ্যাট বন্ধ আছে - পুনরায় খুলুন"}
                      className="flex-1"
                      disabled={selectedConv?.status !== "open"}
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sendMessageMutation.isPending || selectedConv?.status !== "open"}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">কথোপকথন নির্বাচন করুন</p>
                  <p className="text-sm">চ্যাট দেখতে বাম দিক থেকে একটি কথোপকথন নির্বাচন করুন</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Delete Single Conversation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>কথোপকথন মুছে ফেলুন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কথোপকথন এবং সমস্ত মেসেজ স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && deleteConversation(conversationToDelete)}
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedConversations.length}টি কথোপকথন মুছে ফেলুন?</AlertDialogTitle>
            <AlertDialogDescription>
              নির্বাচিত সমস্ত কথোপকথন এবং মেসেজ স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              সব মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminChat;
