import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface Message {
  id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  created_at: string;
}

const ChatWidget = () => {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || "বইআলো";
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorInfo, setVisitorInfo] = useState({
    name: "",
    phone: "",
    submitted: false,
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate or get visitor ID
  const getVisitorId = () => {
    let visitorId = localStorage.getItem("chat_visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_visitor_id", visitorId);
    }
    return visitorId;
  };

  // Check for existing conversation
  useEffect(() => {
    const checkExistingConversation = async () => {
      const visitorId = getVisitorId();
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("visitor_id", visitorId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const conversation = data[0];
        setConversationId(conversation.id);
        setVisitorInfo({
          name: conversation.visitor_name || "",
          phone: conversation.visitor_phone || "",
          submitted: true,
        });
        fetchMessages(conversation.id);
      }
    };

    checkExistingConversation();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorInfo.name.trim()) {
      toast.error("আপনার নাম দিন");
      return;
    }
    if (!visitorInfo.phone.trim()) {
      toast.error("ফোন নম্বর দিন");
      return;
    }

    setLoading(true);
    try {
      const visitorId = getVisitorId();
      
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          visitor_id: visitorId,
          visitor_name: visitorInfo.name.trim(),
          visitor_phone: visitorInfo.phone.trim(),
          user_id: user?.id || null,
          status: "open",
        })
        .select()
        .single();

      if (convError) {
        console.error("Conversation creation error:", convError);
        throw new Error(`কথোপকথন তৈরি করতে সমস্যা: ${convError.message}`);
      }

      if (!convData) {
        throw new Error("কথোপকথন তৈরি হয়নি");
      }

      setConversationId(convData.id);
      setVisitorInfo((prev) => ({ ...prev, submitted: true }));

      // Send welcome message
      const { error: msgError } = await supabase.from("chat_messages").insert({
        conversation_id: convData.id,
        sender_type: "admin",
        sender_name: siteName,
        message: `স্বাগতম ${visitorInfo.name.trim()}! আপনাকে সাহায্য করতে পেরে আমরা খুশি। কীভাবে সাহায্য করতে পারি?`,
      });

      if (msgError) {
        console.error("Welcome message error:", msgError);
        // Don't throw here, conversation is already created
      }

      fetchMessages(convData.id);
      toast.success("চ্যাট শুরু হয়েছে!");
    } catch (error: any) {
      console.error("Chat start error:", error);
      toast.error(error.message || "চ্যাট শুরু করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "customer",
        sender_name: visitorInfo.name,
        message: messageText,
      });

      if (error) {
        console.error("Message send error:", error);
        throw error;
      }

      // Update conversation last_message_at
      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      toast.error("মেসেজ পাঠাতে সমস্যা হয়েছে");
      setNewMessage(messageText);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 animate-bounce"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[360px] bg-background border rounded-2xl shadow-2xl overflow-hidden transition-all ${
        isMinimized ? "h-14" : "h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-medium">{siteName} সাপোর্ট</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!visitorInfo.submitted ? (
            /* Start Chat Form */
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">আমাদের সাথে চ্যাট করুন</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  সাধারণত কয়েক মিনিটের মধ্যে উত্তর দেই
                </p>
              </div>

              <form onSubmit={startConversation} className="space-y-4">
                <div>
                  <Input
                    placeholder="আপনার নাম *"
                    value={visitorInfo.name}
                    onChange={(e) =>
                      setVisitorInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="ফোন নম্বর *"
                    value={visitorInfo.phone}
                    onChange={(e) =>
                      setVisitorInfo((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "শুরু হচ্ছে..." : "চ্যাট শুরু করুন"}
                </Button>
              </form>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="h-[380px] p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "customer" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender_type === "admin" && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {siteName?.[0] || "ব"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          msg.sender_type === "customer"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender_type === "customer"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {format(new Date(msg.created_at), "hh:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;
