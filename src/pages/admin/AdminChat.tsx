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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
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
  Mail
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
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminChat = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
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

  // Real-time subscription for messages
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is selected
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

      // Update conversation last_message_at
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
    onError: (error) => {
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const filteredConversations = conversations?.filter(conv => 
    conv.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.visitor_phone?.includes(searchQuery) ||
    conv.visitor_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              লাইভ চ্যাট
            </h1>
            <p className="text-muted-foreground text-sm">
              কাস্টমারদের সাথে রিয়েল-টাইম যোগাযোগ করুন
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {conversations?.filter(c => c.status === "open").length || 0} সক্রিয় চ্যাট
          </Badge>
        </div>

        <div className="grid grid-cols-12 gap-4 h-[calc(100%-4rem)]">
          {/* Conversations List */}
          <Card className="col-span-4 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="p-4 text-center text-muted-foreground">লোড হচ্ছে...</div>
              ) : filteredConversations?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">কোনো চ্যাট নেই</div>
              ) : (
                <div className="divide-y">
                  {filteredConversations?.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation === conv.id ? "bg-primary/5 border-l-4 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conv.visitor_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">
                              {conv.visitor_name || "অতিথি"}
                            </span>
                            <Badge 
                              variant={conv.status === "open" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {conv.status === "open" ? "সক্রিয়" : "বন্ধ"}
                            </Badge>
                          </div>
                          {conv.visitor_phone && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conv.visitor_phone}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conv.last_message_at), "dd MMM, hh:mm a", { locale: bn })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-8 flex flex-col overflow-hidden">
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
                    {selectedConv?.status === "open" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => closeConversation(selectedConversation)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        বন্ধ করুন
                      </Button>
                    )}
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
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_type === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              {format(new Date(msg.created_at), "hh:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                {selectedConv?.status === "open" && (
                  <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="মেসেজ লিখুন..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>চ্যাট দেখতে বাম দিক থেকে একটি কথোপকথন নির্বাচন করুন</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChat;
