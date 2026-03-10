import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  MessageCircle, X, Send, Minimize2, Paperclip, FileText, Loader2, 
  Bot, User, Sparkles, ThumbsUp, ThumbsDown, RotateCcw, Phone
} from "lucide-react";
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

const quickReplies = [
  { emoji: "📦", text: "অর্ডার ট্র্যাক করতে চাই" },
  { emoji: "📚", text: "বই সাজেস্ট করুন" },
  { emoji: "🚚", text: "ডেলিভারি চার্জ কত?" },
  { emoji: "🎁", text: "কোনো অফার আছে?" },
];

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
  const [chatMode, setChatMode] = useState<"ai" | "human">("ai");
  const [aiResponding, setAiResponding] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const aiChatHistoryRef = useRef<Array<{role: string; content: string}>>([]);

  const getVisitorId = (phone?: string) => {
    if (phone) return `phone_${phone.replace(/\D/g, '')}`;
    let visitorId = localStorage.getItem("chat_visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_visitor_id", visitorId);
    }
    return visitorId;
  };

  useEffect(() => {
    const checkExistingConversation = async () => {
      const visitorId = localStorage.getItem("chat_visitor_id");
      if (!visitorId) return;
      const { data, error } = await supabase.rpc("get_visitor_conversations", { p_visitor_id: visitorId });
      if (!error && data && data.length > 0) {
        const conversation = data.find((c: any) => c.status === 'open') || data[0];
        setConversationId(conversation.id);
        setVisitorInfo({ name: conversation.visitor_name || "", phone: conversation.visitor_phone || "", submitted: true });
        fetchMessages(conversation.id, visitorId);
      }
    };
    checkExistingConversation();
  }, []);

  const checkExistingConversationByPhone = async (phone: string): Promise<boolean> => {
    const phoneVisitorId = getVisitorId(phone);
    const { data, error } = await supabase.rpc("get_visitor_conversations", { p_visitor_id: phoneVisitorId });
    if (!error && data && data.length > 0) {
      const conversation = data[0];
      localStorage.setItem("chat_visitor_id", phoneVisitorId);
      setConversationId(conversation.id);
      setVisitorInfo({ name: conversation.visitor_name || "", phone: conversation.visitor_phone || "", submitted: true });
      fetchMessages(conversation.id, phoneVisitorId);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setIsAdminTyping(false);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const typingChannel = supabase.channel(`typing-${conversationId}`);
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.sender_type === "admin") {
          setIsAdminTyping(true);
          setTimeout(() => setIsAdminTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;
    return () => { supabase.removeChannel(typingChannel); typingChannelRef.current = null; };
  }, [conversationId]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !conversationId) return;
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { sender_type: "customer", conversation_id: conversationId } });
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAdminTyping]);

  const fetchMessages = async (convId: string, visitorId?: string) => {
    const vId = visitorId || localStorage.getItem("chat_visitor_id") || "";
    const { data } = await supabase.rpc("get_visitor_chat_messages", { p_conversation_id: convId, p_visitor_id: vId });
    if (data) setMessages(data);
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorInfo.name.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (!visitorInfo.phone.trim()) { toast.error("ফোন নম্বর দিন"); return; }
    setLoading(true);
    try {
      const hasExisting = await checkExistingConversationByPhone(visitorInfo.phone.trim());
      if (hasExisting) { toast.success("আপনার আগের চ্যাট পাওয়া গেছে!"); setLoading(false); return; }
      const visitorId = getVisitorId(visitorInfo.phone.trim());
      localStorage.setItem("chat_visitor_id", visitorId);
      const { data: convData, error: convError } = await supabase.rpc("create_visitor_conversation", {
        p_visitor_id: visitorId, p_visitor_name: visitorInfo.name.trim(), p_visitor_phone: visitorInfo.phone.trim(), p_user_id: user?.id || null,
      });
      if (convError) throw new Error(convError.message);
      if (!convData) throw new Error("কথোপকথন তৈরি হয়নি");
      setConversationId(convData.id);
      setVisitorInfo((prev) => ({ ...prev, submitted: true }));

      const welcomeMsg = chatMode === "ai" 
        ? `আসসালামু আলাইকুম ${visitorInfo.name.trim()}! 🤖\n\nআমি ${siteName} এর AI সহকারী "বই বন্ধু"। আপনাকে কীভাবে সাহায্য করতে পারি?\n\n📚 বই খুঁজতে\n📦 অর্ডার ট্র্যাক করতে\n🎁 অফার জানতে\n\nনিচের বাটন থেকে বা টাইপ করে জানান!`
        : `স্বাগতম ${visitorInfo.name.trim()}! আপনাকে সাহায্য করতে পেরে আমরা খুশি। কীভাবে সাহায্য করতে পারি?`;

      await supabase.rpc("insert_visitor_chat_message", {
        p_conversation_id: convData.id, p_visitor_id: visitorId,
        p_sender_type: "admin", p_sender_name: chatMode === "ai" ? "🤖 বই বন্ধু" : siteName,
        p_message: welcomeMsg,
      });
      fetchMessages(convData.id, visitorId);
      toast.success("চ্যাট শুরু হয়েছে!");
    } catch (error: any) {
      toast.error(error.message || "চ্যাট শুরু করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) { toast.error("শুধুমাত্র ছবি ও PDF আপলোড করা যাবে"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("ফাইল সাইজ ১০MB এর বেশি হতে পারবে না"); return null; }
    const fileExt = file.name.split('.').pop();
    const fileName = `${conversationId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const { data, error } = await supabase.storage.from('chat-attachments').upload(fileName, file);
    if (error) { toast.error("ফাইল আপলোড করতে সমস্যা হয়েছে"); return null; }
    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);
    return { url: urlData.publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf', name: file.name };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) { toast.error("শুধুমাত্র ছবি ও PDF আপলোড করা যাবে"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("ফাইল সাইজ ১০MB এর বেশি হতে পারবে না"); return; }
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) previewUrl = URL.createObjectURL(file);
    setStagedFile({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = () => {
    if (stagedFile?.previewUrl) URL.revokeObjectURL(stagedFile.previewUrl);
    setStagedFile(null);
  };

  const handleEmojiSelect = (emoji: string) => setNewMessage(prev => prev + emoji);

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setShowQuickReplies(false);
    // Auto-send
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      form?.requestSubmit();
    }, 100);
  };

  const handleFeedback = (msgId: string, type: "up" | "down") => {
    setFeedbackGiven(prev => ({ ...prev, [msgId]: type }));
    toast.success(type === "up" ? "ধন্যবাদ! 😊" : "আমরা উন্নতি করব 🙏");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !stagedFile) || !conversationId) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setShowQuickReplies(false);
    setUploading(true);

    try {
      let attachmentData: { url: string; type: string; name: string } | null = null;
      if (stagedFile) {
        attachmentData = await uploadFile(stagedFile.file);
        if (!attachmentData && !messageText) { setUploading(false); return; }
        removeStagedFile();
      }

      let finalMessage = messageText;
      if (!finalMessage && attachmentData) {
        finalMessage = attachmentData.type === 'image' ? '📷 ছবি পাঠানো হয়েছে' : '📄 PDF ফাইল পাঠানো হয়েছে';
      }

      const visitorId = localStorage.getItem("chat_visitor_id") || "";
      const { error } = await supabase.rpc("insert_visitor_chat_message", {
        p_conversation_id: conversationId, p_visitor_id: visitorId,
        p_sender_type: "customer", p_sender_name: visitorInfo.name,
        p_message: finalMessage,
        p_attachment_url: attachmentData?.url || null,
        p_attachment_type: attachmentData?.type || null,
        p_attachment_name: attachmentData?.name || null,
      });

      if (error) throw error;

      // AI auto-reply
      if (chatMode === "ai" && messageText) {
        setAiResponding(true);
        setIsAdminTyping(true);
        try {
          aiChatHistoryRef.current.push({ role: "user", content: messageText });
          const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
          const resp = await fetch(AI_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ messages: aiChatHistoryRef.current, mode: "customer" }),
          });

          if (!resp.ok || !resp.body) throw new Error("AI response failed");

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let textBuffer = "";
          let fullResponse = "";
          let streamDone = false;

          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });
            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") { streamDone = true; break; }
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch { textBuffer = line + "\n" + textBuffer; break; }
            }
          }

          if (fullResponse.trim()) {
            aiChatHistoryRef.current.push({ role: "assistant", content: fullResponse });
            await supabase.rpc("insert_visitor_chat_message", {
              p_conversation_id: conversationId, p_visitor_id: visitorId,
              p_sender_type: "admin", p_sender_name: "🤖 বই বন্ধু",
              p_message: fullResponse.trim(),
            });
          }
        } catch (aiError) {
          console.error("AI error:", aiError);
          // Fallback message
          const visitorId2 = localStorage.getItem("chat_visitor_id") || "";
          await supabase.rpc("insert_visitor_chat_message", {
            p_conversation_id: conversationId, p_visitor_id: visitorId2,
            p_sender_type: "admin", p_sender_name: "🤖 বই বন্ধু",
            p_message: "দুঃখিত, এই মুহূর্তে আমি উত্তর দিতে পারছি না। আপনি \"👤 লাইভ চ্যাট\" বাটনে ক্লিক করে সরাসরি আমাদের টিমের সাথে কথা বলতে পারেন। 🙏",
          });
        } finally {
          setAiResponding(false);
          setIsAdminTyping(false);
        }
      }
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
          <img src={msg.attachment_url} alt={msg.attachment_name || "Attachment"} className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
      );
    }
    if (msg.attachment_type === 'pdf') {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${msg.sender_type === "customer" ? "bg-primary-foreground/20" : "bg-background/50"} hover:opacity-80 transition-opacity`}>
          <FileText className="h-5 w-5" />
          <span className="text-sm truncate max-w-[150px]">{msg.attachment_name || "PDF ফাইল"}</span>
        </a>
      );
    }
    return null;
  };

  // Floating button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Greeting bubble */}
        <div className="bg-card border shadow-lg rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-medium">আসসালামু আলাইকুম! 👋</p>
          <p className="text-xs text-muted-foreground mt-0.5">কীভাবে সাহায্য করতে পারি?</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 group-hover:hidden" />
            <Bot className="h-6 w-6 hidden group-hover:block" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-primary animate-pulse" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-[380px] bg-background border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isMinimized ? "h-[56px]" : "h-[560px]"}`}>
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-primary/85 text-primary-foreground px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                {chatMode === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {chatMode === "ai" ? "বই বন্ধু AI" : `${siteName}`}
                </span>
                {chatMode === "ai" && (
                  <span className="text-[9px] bg-primary-foreground/25 px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">AI</span>
                )}
              </div>
              <p className="text-[10px] text-primary-foreground/70">
                {chatMode === "ai" ? (aiResponding ? "টাইপ করছে..." : "অনলাইন • তাৎক্ষণিক উত্তর") : "সাধারণত কয়েক মিনিটে উত্তর দেই"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {visitorInfo.submitted && (
              <button
                onClick={() => setChatMode(chatMode === "ai" ? "human" : "ai")}
                className="text-[10px] bg-primary-foreground/15 hover:bg-primary-foreground/25 px-2.5 py-1 rounded-full transition-colors backdrop-blur-sm font-medium mr-1"
              >
                {chatMode === "ai" ? "👤 লাইভ" : "🤖 AI"}
              </button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setIsMinimized(!isMinimized)}>
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setIsOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!visitorInfo.submitted ? (
            <div className="p-5 flex flex-col h-[calc(560px-56px)]">
              <div className="text-center mb-5 flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg">AI সহকারী 🤖</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  তাৎক্ষণিক উত্তর পান AI এর মাধ্যমে
                </p>
              </div>

              <form onSubmit={startConversation} className="space-y-3 flex-1 flex flex-col justify-center">
                <Input placeholder="আপনার নাম *" value={visitorInfo.name} onChange={(e) => setVisitorInfo((prev) => ({ ...prev, name: e.target.value }))} required className="h-11 rounded-xl" />
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="ফোন নম্বর *" value={visitorInfo.phone} onChange={(e) => setVisitorInfo((prev) => ({ ...prev, phone: e.target.value }))} required className="h-11 rounded-xl pl-10" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/85 shadow-md hover:shadow-lg transition-all" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> সংযোগ হচ্ছে...</> : <><Bot className="w-4 h-4 mr-2" /> চ্যাট শুরু করুন</>}
                </Button>
              </form>

              <div className="mt-4 flex-shrink-0">
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> ২৪/৭ সক্রিয়</span>
                  <span>🔒 নিরাপদ</span>
                  <span>⚡ তাৎক্ষণিক</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[395px] px-3 py-3">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "customer" ? "justify-end" : "justify-start"} group`}>
                      {msg.sender_type !== "customer" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                          {msg.sender_name?.includes("🤖") ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      )}
                      <div className="flex flex-col max-w-[78%]">
                        <div className={`rounded-2xl px-3.5 py-2.5 ${
                          msg.sender_type === "customer"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
                            : "bg-muted/80 rounded-bl-md border border-border/50"
                        }`}>
                          <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          {renderAttachment(msg)}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${msg.sender_type === "customer" ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] text-muted-foreground/60">{format(new Date(msg.created_at), "hh:mm a")}</span>
                          {/* Feedback for AI messages */}
                          {msg.sender_name?.includes("🤖") && !feedbackGiven[msg.id] && (
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleFeedback(msg.id, "up")} className="p-0.5 hover:bg-muted rounded">
                                <ThumbsUp className="w-3 h-3 text-muted-foreground/60 hover:text-emerald-500" />
                              </button>
                              <button onClick={() => handleFeedback(msg.id, "down")} className="p-0.5 hover:bg-muted rounded">
                                <ThumbsDown className="w-3 h-3 text-muted-foreground/60 hover:text-destructive" />
                              </button>
                            </div>
                          )}
                          {feedbackGiven[msg.id] && (
                            <span className="text-[10px]">{feedbackGiven[msg.id] === "up" ? "👍" : "👎"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAdminTyping && (
                    <div className="flex justify-start">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <TypingIndicator />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {showQuickReplies && messages.length <= 2 && chatMode === "ai" && (
                <div className="px-3 py-2 border-t bg-muted/20">
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {quickReplies.map((qr, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickReply(qr.text)}
                        disabled={uploading || aiResponding}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border bg-card hover:bg-accent/60 transition-all whitespace-nowrap disabled:opacity-50 shadow-sm hover:shadow"
                      >
                        <span>{qr.emoji}</span>
                        <span>{qr.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stagedFile && (
                <div className="px-3 py-2 border-t bg-muted/30">
                  <StagedAttachment file={stagedFile.file} previewUrl={stagedFile.previewUrl} onRemove={removeStagedFile} />
                </div>
              )}

              <div className="p-3 border-t bg-background">
                <form id="chat-form" onSubmit={sendMessage} className="flex gap-1.5 items-center">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden" />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-full" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={chatMode === "ai" ? "AI কে জিজ্ঞেস করুন..." : "মেসেজ লিখুন..."}
                    className="flex-1 h-9 rounded-full text-sm"
                  />
                  <Button type="submit" size="icon" disabled={(!newMessage.trim() && !stagedFile) || uploading || aiResponding}
                    className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-sm hover:shadow-md transition-all">
                    {uploading || aiResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <div className="flex items-center justify-center gap-3 mt-1.5">
                  <span className="text-[9px] text-muted-foreground/50">
                    {chatMode === "ai" ? "🤖 AI দ্বারা চালিত" : "👤 লাইভ সাপোর্ট"} • 📷 ছবি ও 📄 PDF
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;
