import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  MessageCircle, X, Send, Minimize2, Paperclip, FileText, Loader2,
  Bot, User, Sparkles, ThumbsUp, ThumbsDown, Phone, Search,
  ShoppingBag, Truck, Gift, BookOpen, ChevronRight, Zap, Shield, Clock
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

const quickActions = [
  { icon: Search, emoji: "🔍", text: "বই খুঁজুন", hint: "যেকোনো বই খুঁজে দিই" },
  { icon: ShoppingBag, emoji: "📦", text: "অর্ডার ট্র্যাক", hint: "অর্ডার নম্বর দিন" },
  { icon: Truck, emoji: "🚚", text: "ডেলিভারি চার্জ", hint: "এলাকা অনুযায়ী" },
  { icon: Gift, emoji: "🎁", text: "অফার দেখুন", hint: "সক্রিয় ছাড়" },
  { icon: BookOpen, emoji: "📚", text: "বই সাজেস্ট", hint: "পছন্দ অনুযায়ী" },
  { icon: Zap, emoji: "⚡", text: "ই-বুক খুঁজুন", hint: "ডিজিটাল বই" },
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
  const [visitorInfo, setVisitorInfo] = useState({ name: "", phone: "", submitted: false });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [chatMode, setChatMode] = useState<"ai" | "human">("ai");
  const [aiResponding, setAiResponding] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});
  const [pulseButton, setPulseButton] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const aiChatHistoryRef = useRef<Array<{ role: string; content: string }>>([]);

  // Check if chatbot is enabled
  useEffect(() => {
    const checkEnabled = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "chatbot_enabled")
        .single();
      if (data) {
        try {
          const val = typeof data.setting_value === "string" ? JSON.parse(data.setting_value) : data.setting_value;
          setChatbotEnabled(val !== false && val !== "false");
        } catch { setChatbotEnabled(true); }
      }
    };
    checkEnabled();
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const aiChatHistoryRef = useRef<Array<{ role: string; content: string }>>([]);

  const getVisitorId = (phone?: string) => {
    if (phone) return `phone_${phone.replace(/\D/g, '')}`;
    let visitorId = localStorage.getItem("chat_visitor_id");
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_visitor_id", visitorId);
    }
    return visitorId;
  };

  // Auto-hide pulse after 5s
  useEffect(() => {
    const t = setTimeout(() => setPulseButton(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const checkExisting = async () => {
      const visitorId = localStorage.getItem("chat_visitor_id");
      if (!visitorId) return;
      const { data } = await supabase.rpc("get_visitor_conversations", { p_visitor_id: visitorId });
      if (data?.length) {
        const conv = data.find((c: any) => c.status === 'open') || data[0];
        setConversationId(conv.id);
        setVisitorInfo({ name: conv.visitor_name || "", phone: conv.visitor_phone || "", submitted: true });
        fetchMessages(conv.id, visitorId);
      }
    };
    checkExisting();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => {
            const exists = prev.some(m => m.id === (payload.new as Message).id);
            return exists ? prev : [...prev, payload.new as Message];
          });
          setIsAdminTyping(false);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase.channel(`typing-${conversationId}`);
    ch.on("broadcast", { event: "typing" }, (p) => {
      if (p.payload?.sender_type === "admin") {
        setIsAdminTyping(true);
        setTimeout(() => setIsAdminTyping(false), 3000);
      }
    }).subscribe();
    typingChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); typingChannelRef.current = null; };
  }, [conversationId]);

  const broadcastTyping = useCallback(() => {
    typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { sender_type: "customer", conversation_id: conversationId } });
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAdminTyping]);

  const fetchMessages = async (convId: string, visitorId?: string) => {
    const vId = visitorId || localStorage.getItem("chat_visitor_id") || "";
    const { data } = await supabase.rpc("get_visitor_chat_messages", { p_conversation_id: convId, p_visitor_id: vId });
    if (data) setMessages(data);
  };

  const checkExistingByPhone = async (phone: string): Promise<boolean> => {
    const phoneVisitorId = getVisitorId(phone);
    const { data } = await supabase.rpc("get_visitor_conversations", { p_visitor_id: phoneVisitorId });
    if (data?.length) {
      const conv = data[0];
      localStorage.setItem("chat_visitor_id", phoneVisitorId);
      setConversationId(conv.id);
      setVisitorInfo({ name: conv.visitor_name || "", phone: conv.visitor_phone || "", submitted: true });
      fetchMessages(conv.id, phoneVisitorId);
      return true;
    }
    return false;
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorInfo.name.trim() || !visitorInfo.phone.trim()) { toast.error("নাম ও ফোন নম্বর দিন"); return; }
    setLoading(true);
    try {
      if (await checkExistingByPhone(visitorInfo.phone.trim())) { toast.success("আগের চ্যাট পাওয়া গেছে!"); setLoading(false); return; }
      const visitorId = getVisitorId(visitorInfo.phone.trim());
      localStorage.setItem("chat_visitor_id", visitorId);
      const { data: convData, error } = await supabase.rpc("create_visitor_conversation", {
        p_visitor_id: visitorId, p_visitor_name: visitorInfo.name.trim(), p_visitor_phone: visitorInfo.phone.trim(), p_user_id: user?.id || null,
      });
      if (error) throw error;
      if (!convData) throw new Error("কথোপকথন তৈরি হয়নি");
      setConversationId(convData.id);
      setVisitorInfo(prev => ({ ...prev, submitted: true }));

      const welcome = `আসসালামু আলাইকুম ${visitorInfo.name.trim()}! 🤖\n\nআমি **${siteName}** এর AI সহকারী। আপনাকে সাহায্য করতে পারি:\n\n🔍 **যেকোনো বই/প্রোডাক্ট খুঁজে দিতে**\n📦 **অর্ডার ট্র্যাক করতে**\n🎁 **অফার ও ছাড় জানাতে**\n📚 **বই সাজেস্ট করতে**\n\nনিচে থেকে বেছে নিন অথবা সরাসরি লিখুন!`;
      await supabase.rpc("insert_visitor_chat_message", {
        p_conversation_id: convData.id, p_visitor_id: visitorId,
        p_sender_type: "admin", p_sender_name: "🤖 AI সহকারী", p_message: welcome,
      });
      fetchMessages(convData.id, visitorId);
    } catch (err: any) {
      toast.error(err.message || "চ্যাট শুরু করতে সমস্যা");
    } finally { setLoading(false); }
  };

  const uploadFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) { toast.error("শুধু ছবি ও PDF"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("১০MB এর বেশি নয়"); return null; }
    const ext = file.name.split('.').pop();
    const path = `${conversationId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('chat-attachments').upload(path, file);
    if (error) { toast.error("আপলোড ব্যর্থ"); return null; }
    const { data: url } = supabase.storage.from('chat-attachments').getPublicUrl(data.path);
    return { url: url.publicUrl, type: file.type.startsWith('image/') ? 'image' : 'pdf', name: file.name };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) return;
    setStagedFile({ file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = () => {
    if (stagedFile?.previewUrl) URL.revokeObjectURL(stagedFile.previewUrl);
    setStagedFile(null);
  };

  const handleQuickAction = (text: string) => {
    setNewMessage(text);
    setShowQuickActions(false);
    setTimeout(() => {
      document.getElementById("chat-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
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
    setShowQuickActions(false);
    setUploading(true);
    try {
      let attachment: any = null;
      if (stagedFile) { attachment = await uploadFile(stagedFile.file); removeStagedFile(); }
      const finalMsg = messageText || (attachment?.type === 'image' ? '📷 ছবি' : '📄 PDF');
      const visitorId = localStorage.getItem("chat_visitor_id") || "";

      // Optimistically show user message immediately
      const optimisticId = `opt_${Date.now()}`;
      const optimisticMsg: Message = {
        id: optimisticId,
        sender_type: "customer",
        sender_name: visitorInfo.name,
        message: finalMsg,
        created_at: new Date().toISOString(),
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
      };
      setMessages(prev => [...prev, optimisticMsg]);

      // Save to DB (don't await blocking - let realtime handle dedup)
      const rpcPromise = supabase.rpc("insert_visitor_chat_message", {
        p_conversation_id: conversationId, p_visitor_id: visitorId,
        p_sender_type: "customer", p_sender_name: visitorInfo.name,
        p_message: finalMsg,
        p_attachment_url: attachment?.url || null,
        p_attachment_type: attachment?.type || null,
        p_attachment_name: attachment?.name || null,
      });

      if (chatMode === "ai" && messageText) {
        setAiResponding(true);
        setIsAdminTyping(true);
        try {
          // Wait for RPC to complete before AI call
          const { error: rpcError } = await rpcPromise;
          if (rpcError) console.error("RPC insert error:", rpcError);

          aiChatHistoryRef.current.push({ role: "user", content: messageText });
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ messages: aiChatHistoryRef.current, mode: "customer" }),
          });
          if (!resp.ok || !resp.body) {
            if (resp.status === 429) throw new Error("অনেক বেশি রিকোয়েস্ট, কিছুক্ষণ পর চেষ্টা করুন");
            if (resp.status === 402) throw new Error("সার্ভিস সাময়িক অনুপলব্ধ");
            const errText = await resp.text().catch(() => "");
            console.error("AI response error:", resp.status, errText);
            throw new Error("AI সংযোগ ব্যর্থ");
          }

          // Stream AI response and show progressively
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = "", fullResp = "", done = false;
          const aiMsgId = `ai_${Date.now()}`;

          while (!done) {
            const { done: d, value } = await reader.read();
            if (d) break;
            buf += decoder.decode(value, { stream: true });
            let ni: number;
            while ((ni = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, ni); buf = buf.slice(ni + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const j = line.slice(6).trim();
              if (j === "[DONE]") { done = true; break; }
              try {
                const p = JSON.parse(j);
                const c = p.choices?.[0]?.delta?.content;
                if (c) {
                  fullResp += c;
                  // Update AI message in real-time (streaming effect)
                  setMessages(prev => {
                    const existing = prev.find(m => m.id === aiMsgId);
                    if (existing) {
                      return prev.map(m => m.id === aiMsgId ? { ...m, message: fullResp } : m);
                    }
                    return [...prev, {
                      id: aiMsgId,
                      sender_type: "admin",
                      sender_name: "🤖 AI সহকারী",
                      message: fullResp,
                      created_at: new Date().toISOString(),
                    }];
                  });
                }
              }
              catch { buf = line + "\n" + buf; break; }
            }
          }

          // Flush remaining buffer
          if (buf.trim()) {
            for (let raw of buf.split("\n")) {
              if (!raw) continue;
              if (raw.endsWith("\r")) raw = raw.slice(0, -1);
              if (!raw.startsWith("data: ")) continue;
              const j = raw.slice(6).trim();
              if (j === "[DONE]") continue;
              try {
                const p = JSON.parse(j);
                const c = p.choices?.[0]?.delta?.content;
                if (c) {
                  fullResp += c;
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, message: fullResp } : m));
                }
              } catch { /* ignore */ }
            }
          }

          if (fullResp.trim()) {
            aiChatHistoryRef.current.push({ role: "assistant", content: fullResp });
            // Save AI response to DB
            await supabase.rpc("insert_visitor_chat_message", {
              p_conversation_id: conversationId, p_visitor_id: visitorId,
              p_sender_type: "admin", p_sender_name: "🤖 AI সহকারী", p_message: fullResp.trim(),
            });
          } else {
            // No response received - show error
            const errMsg = "দুঃখিত, উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন। 🙏";
            setMessages(prev => [...prev, {
              id: aiMsgId,
              sender_type: "admin",
              sender_name: "🤖 AI সহকারী",
              message: errMsg,
              created_at: new Date().toISOString(),
            }]);
          }
        } catch (aiErr: any) {
          console.error("AI error:", aiErr);
          const errMsg = `⚠️ ${aiErr.message || "সমস্যা হয়েছে।"} "👤 লাইভ চ্যাট" এ যোগাযোগ করুন। 🙏`;
          setMessages(prev => [...prev, {
            id: `err_${Date.now()}`,
            sender_type: "admin",
            sender_name: "🤖 AI সহকারী",
            message: errMsg,
            created_at: new Date().toISOString(),
          }]);
          // Also save error to DB
          try {
            await supabase.rpc("insert_visitor_chat_message", {
              p_conversation_id: conversationId, p_visitor_id: visitorId,
              p_sender_type: "admin", p_sender_name: "🤖 AI সহকারী", p_message: errMsg,
            });
          } catch { /* ignore */ }
        } finally { setAiResponding(false); setIsAdminTyping(false); }
      } else {
        // Human mode - just save the message
        await rpcPromise;
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      toast.error("মেসেজ পাঠাতে সমস্যা");
      setNewMessage(messageText);
    }
    finally { setUploading(false); }
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;
    if (msg.attachment_type === 'image') {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={msg.attachment_url} alt={msg.attachment_name || "Attachment"} className="max-w-full rounded-xl max-h-48 object-cover hover:opacity-90 transition-opacity" />
        </a>
      );
    }
    return (
      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-background/40 hover:bg-background/60 transition-colors border border-border/30">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="text-xs truncate">{msg.attachment_name || "PDF"}</span>
        <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-50" />
      </a>
    );
  };

  // ===== FLOATING BUTTON =====
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
        <div className="bg-card border border-border/60 shadow-xl rounded-2xl rounded-br-sm px-4 py-3 max-w-[220px] animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="text-sm font-semibold">আসসালামু আলাইকুম! 👋</p>
          <p className="text-xs text-muted-foreground mt-1">যেকোনো প্রশ্নে AI সহকারী প্রস্তুত</p>
        </div>
        <button
          onClick={() => { setIsOpen(true); setPulseButton(false); }}
          className={`group relative h-[60px] w-[60px] rounded-full shadow-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-primary/25 ${pulseButton ? "animate-bounce" : ""}`}
        >
          <MessageCircle className="h-6 w-6 transition-transform group-hover:rotate-12" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-primary" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
        </button>
      </div>
    );
  }

  // ===== MAIN CHAT WINDOW =====
  return (
    <div className={`fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-2.5rem)] bg-background border border-border/60 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${isMinimized ? "h-[60px]" : "h-[600px]"}`}>
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary-foreground)/0.08),transparent_70%)]" />
        <div className="relative px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center border border-primary-foreground/10">
                  {chatMode === "ai" ? <Bot className="w-5 h-5 text-primary-foreground" /> : <User className="w-5 h-5 text-primary-foreground" />}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-primary" />
              </div>
              <div className="text-primary-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight">
                    {chatMode === "ai" ? "AI সহকারী" : siteName}
                  </span>
                  {chatMode === "ai" && (
                    <span className="text-[9px] bg-primary-foreground/20 backdrop-blur-sm px-2 py-0.5 rounded-full font-semibold border border-primary-foreground/10">
                      ✨ AI
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-primary-foreground/60 mt-0.5">
                  {aiResponding ? "🔍 খুঁজছি ও লিখছি..." : chatMode === "ai" ? "সব প্রোডাক্ট সার্চ • তাৎক্ষণিক উত্তর" : "সাধারণত কয়েক মিনিটে উত্তর দেই"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {visitorInfo.submitted && (
                <button
                  onClick={() => setChatMode(chatMode === "ai" ? "human" : "ai")}
                  className="text-[10px] bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-full transition-all font-semibold border border-primary-foreground/10 mr-1"
                >
                  {chatMode === "ai" ? "👤 লাইভ" : "🤖 AI"}
                </button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => setIsMinimized(!isMinimized)}>
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => setIsOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!visitorInfo.submitted ? (
            /* ===== ONBOARDING ===== */
            <div className="flex flex-col h-[calc(600px-60px)] p-6">
              <div className="text-center mb-6 flex-shrink-0">
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/10">
                    <Sparkles className="h-9 w-9 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Search className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-xl tracking-tight">AI প্রোডাক্ট সহকারী</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  সব বই, ই-বুক ও প্রোডাক্ট থেকে খুঁজে দিই
                </p>
              </div>

              <form onSubmit={startConversation} className="space-y-3 flex-1 flex flex-col justify-center">
                <div className="space-y-3">
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="আপনার নাম"
                      value={visitorInfo.name}
                      onChange={e => setVisitorInfo(p => ({ ...p, name: e.target.value }))}
                      required
                      className="h-12 rounded-2xl pl-11 bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all text-sm"
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="ফোন নম্বর"
                      value={visitorInfo.phone}
                      onChange={e => setVisitorInfo(p => ({ ...p, phone: e.target.value }))}
                      required
                      className="h-12 rounded-2xl pl-11 bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-primary to-primary/85 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> সংযোগ হচ্ছে...</> : <><Bot className="w-4 h-4 mr-2" /> চ্যাট শুরু করুন</>}
                </Button>
              </form>

              <div className="mt-5 flex-shrink-0">
                <div className="flex items-center justify-center gap-5 text-[10px] text-muted-foreground/60">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ২৪/৭</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> নিরাপদ</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> তাৎক্ষণিক</span>
                </div>
              </div>
            </div>
          ) : (
            /* ===== CHAT AREA ===== */
            <>
              <ScrollArea className="h-[calc(600px-60px-68px)] px-4 py-3">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "customer" ? "justify-end" : "justify-start"} group animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                      {msg.sender_type !== "customer" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mr-2 mt-1 shrink-0 border border-primary/10">
                          {msg.sender_name?.includes("🤖") ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
                        </div>
                      )}
                      <div className="flex flex-col max-w-[80%]">
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.sender_type === "customer"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-sm shadow-primary/20"
                            : "bg-muted/50 rounded-bl-md border border-border/40"
                        }`}>
                          {msg.sender_type !== "customer" ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert text-[13px] leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline [&_a]:font-medium [&_strong]:font-bold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                              <ReactMarkdown>{msg.message}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          )}
                          {renderAttachment(msg)}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 px-1 ${msg.sender_type === "customer" ? "justify-end" : "justify-start"}`}>
                          <span className="text-[9px] text-muted-foreground/50 font-medium">{format(new Date(msg.created_at), "hh:mm a")}</span>
                          {msg.sender_name?.includes("🤖") && !feedbackGiven[msg.id] && (
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button onClick={() => handleFeedback(msg.id, "up")} className="p-1 hover:bg-muted rounded-lg transition-colors">
                                <ThumbsUp className="w-3 h-3 text-muted-foreground/40 hover:text-emerald-500" />
                              </button>
                              <button onClick={() => handleFeedback(msg.id, "down")} className="p-1 hover:bg-muted rounded-lg transition-colors">
                                <ThumbsDown className="w-3 h-3 text-muted-foreground/40 hover:text-destructive" />
                              </button>
                            </div>
                          )}
                          {feedbackGiven[msg.id] && <span className="text-[10px]">{feedbackGiven[msg.id] === "up" ? "👍" : "👎"}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAdminTyping && (
                    <div className="flex justify-start animate-in fade-in duration-200">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mr-2 mt-1 shrink-0 border border-primary/10">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <TypingIndicator />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              {showQuickActions && messages.length <= 3 && chatMode === "ai" && (
                <div className="px-3 py-2.5 border-t border-border/30 bg-muted/10">
                  <div className="grid grid-cols-3 gap-1.5">
                    {quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(qa.text)}
                        disabled={uploading || aiResponding}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-border/40 bg-card/60 hover:bg-accent/40 hover:border-primary/20 transition-all duration-200 disabled:opacity-40 group/qa active:scale-95"
                      >
                        <span className="text-base">{qa.emoji}</span>
                        <span className="text-[10px] font-semibold text-foreground/80 group-hover/qa:text-primary transition-colors">{qa.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stagedFile && (
                <div className="px-3 py-2 border-t border-border/30 bg-muted/20">
                  <StagedAttachment file={stagedFile.file} previewUrl={stagedFile.previewUrl} onRemove={removeStagedFile} />
                </div>
              )}

              {/* ===== INPUT ===== */}
              <div className="p-3 border-t border-border/30 bg-background/80 backdrop-blur-sm">
                <form id="chat-form" onSubmit={sendMessage} className="flex gap-2 items-center">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden" />
                  <div className="flex items-center gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl hover:bg-muted/60" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <EmojiPicker onEmojiSelect={e => setNewMessage(p => p + e)} />
                  </div>
                  <Input
                    value={newMessage}
                    onChange={e => { setNewMessage(e.target.value); broadcastTyping(); }}
                    placeholder={chatMode === "ai" ? "বই খুঁজুন বা প্রশ্ন করুন..." : "মেসেজ লিখুন..."}
                    className="flex-1 h-10 rounded-2xl text-sm bg-muted/30 border-border/40 focus:border-primary/40 focus:bg-background transition-all"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={(!newMessage.trim() && !stagedFile) || uploading || aiResponding}
                    className="shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/15 hover:shadow-lg transition-all active:scale-90 disabled:opacity-30"
                  >
                    {uploading || aiResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <p className="text-center text-[9px] text-muted-foreground/40 mt-1.5 font-medium">
                  {chatMode === "ai" ? "🔍 সব বই • ই-বুক • প্রোডাক্ট সার্চ সক্ষম" : "👤 লাইভ সাপোর্ট"} • Powered by AI
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
