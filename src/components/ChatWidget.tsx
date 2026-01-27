import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageCircle, X, Send, Minimize2, Paperclip, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import EmojiPicker from "@/components/chat/EmojiPicker";
import StagedAttachment from "@/components/chat/StagedAttachment";
import TypingIndicator from "@/components/chat/TypingIndicator";

interface Message {
  id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

interface StagedFile {
  file: File;
  previewUrl?: string;
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
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate or get visitor ID based on phone
  const getVisitorId = (phone?: string) => {
    // If phone is provided, use it as unique identifier
    if (phone) {
      return `phone_${phone.replace(/\D/g, '')}`;
    }
    // Fallback to stored visitor ID
    let visitorId = localStorage.getItem("chat_visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_visitor_id", visitorId);
    }
    return visitorId;
  };

  // Check for existing conversation by stored visitor ID
  useEffect(() => {
    const checkExistingConversation = async () => {
      const visitorId = localStorage.getItem("chat_visitor_id");
      if (!visitorId) return;

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

  // Check for existing conversation by phone number
  const checkExistingConversationByPhone = async (phone: string): Promise<boolean> => {
    const phoneVisitorId = getVisitorId(phone);
    
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("visitor_id", phoneVisitorId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const conversation = data[0];
      // Store the phone-based visitor ID for future sessions
      localStorage.setItem("chat_visitor_id", phoneVisitorId);
      
      setConversationId(conversation.id);
      setVisitorInfo({
        name: conversation.visitor_name || "",
        phone: conversation.visitor_phone || "",
        submitted: true,
      });
      fetchMessages(conversation.id);
      return true;
    }
    return false;
  };

  // Real-time subscription for messages
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
          // Reset admin typing when new message arrives
          setIsAdminTyping(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Typing indicator channel
  useEffect(() => {
    if (!conversationId) return;

    const typingChannel = supabase.channel(`typing-${conversationId}`);
    
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_type === "admin") {
          setIsAdminTyping(true);
          // Auto-hide after 3 seconds
          setTimeout(() => setIsAdminTyping(false), 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
    };
  }, [conversationId]);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !conversationId) return;
    
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { sender_type: "customer", conversation_id: conversationId },
    });
  }, [conversationId]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Broadcast typing
    broadcastTyping();
    
    // Debounce typing broadcast
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Stop broadcasting after 2 seconds of no typing
    }, 2000);
  };

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
      // Check if user has existing conversation by phone number
      const hasExisting = await checkExistingConversationByPhone(visitorInfo.phone.trim());
      if (hasExisting) {
        toast.success("আপনার আগের চ্যাট পাওয়া গেছে!");
        setLoading(false);
        return;
      }

      // Create phone-based visitor ID for new conversations
      const visitorId = getVisitorId(visitorInfo.phone.trim());
      // Store for future sessions
      localStorage.setItem("chat_visitor_id", visitorId);
      
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

      await supabase.from("chat_messages").insert({
        conversation_id: convData.id,
        sender_type: "admin",
        sender_name: siteName,
        message: `স্বাগতম ${visitorInfo.name.trim()}! আপনাকে সাহায্য করতে পেরে আমরা খুশি। কীভাবে সাহায্য করতে পারি?`,
      });

      fetchMessages(convData.id);
      toast.success("চ্যাট শুরু হয়েছে!");
    } catch (error: any) {
      console.error("Chat start error:", error);
      toast.error(error.message || "চ্যাট শুরু করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("শুধুমাত্র ছবি (JPG, PNG, GIF, WebP) এবং PDF ফাইল আপলোড করা যাবে");
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ফাইল সাইজ ১০MB এর বেশি হতে পারবে না");
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      toast.error("ফাইল আপলোড করতে সমস্যা হয়েছে");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      type: file.type.startsWith('image/') ? 'image' : 'pdf',
      name: file.name
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("শুধুমাত্র ছবি (JPG, PNG, GIF, WebP) এবং PDF ফাইল আপলোড করা যাবে");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ফাইল সাইজ ১০MB এর বেশি হতে পারবে না");
      return;
    }

    // Create preview URL for images
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    setStagedFile({ file, previewUrl });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeStagedFile = () => {
    if (stagedFile?.previewUrl) {
      URL.revokeObjectURL(stagedFile.previewUrl);
    }
    setStagedFile(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !stagedFile) || !conversationId) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setUploading(true);

    try {
      let attachmentData: { url: string; type: string; name: string } | null = null;

      // Upload file if staged
      if (stagedFile) {
        attachmentData = await uploadFile(stagedFile.file);
        if (!attachmentData && !messageText) {
          setUploading(false);
          return;
        }
        removeStagedFile();
      }

      // Determine message content
      let finalMessage = messageText;
      if (!finalMessage && attachmentData) {
        finalMessage = attachmentData.type === 'image' ? '📷 ছবি পাঠানো হয়েছে' : '📄 PDF ফাইল পাঠানো হয়েছে';
      }

      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "customer",
        sender_name: visitorInfo.name,
        message: finalMessage,
        attachment_url: attachmentData?.url || null,
        attachment_type: attachmentData?.type || null,
        attachment_name: attachmentData?.name || null,
      });

      if (error) {
        console.error("Message send error:", error);
        throw error;
      }

      await supabase
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      toast.error("মেসেজ পাঠাতে সমস্যা হয়েছে");
      setNewMessage(messageText);
    } finally {
      setUploading(false);
    }
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    if (msg.attachment_type === 'image') {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img 
            src={msg.attachment_url} 
            alt={msg.attachment_name || "Attachment"} 
            className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    if (msg.attachment_type === 'pdf') {
      return (
        <a 
          href={msg.attachment_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${
            msg.sender_type === "customer" 
              ? "bg-primary-foreground/20" 
              : "bg-background/50"
          } hover:opacity-80 transition-opacity`}
        >
          <FileText className="h-5 w-5" />
          <span className="text-sm truncate max-w-[150px]">{msg.attachment_name || "PDF ফাইল"}</span>
        </a>
      );
    }

    return null;
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
        isMinimized ? "h-14" : "h-[520px]"
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
              <ScrollArea className="h-[360px] p-4">
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
                        {renderAttachment(msg)}
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
                  {/* Typing indicator */}
                  {isAdminTyping && (
                    <div className="flex justify-start">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {siteName?.[0] || "ব"}
                        </AvatarFallback>
                      </Avatar>
                      <TypingIndicator />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Staged Attachment Preview */}
              {stagedFile && (
                <div className="px-3 py-2 border-t bg-muted/30">
                  <StagedAttachment
                    file={stagedFile.file}
                    previewUrl={stagedFile.previewUrl}
                    onRemove={removeStagedFile}
                  />
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t">
                <form onSubmit={sendMessage} className="flex gap-2 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={(!newMessage.trim() && !stagedFile) || uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  📷 ছবি ও 📄 PDF পাঠাতে পারেন
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;
