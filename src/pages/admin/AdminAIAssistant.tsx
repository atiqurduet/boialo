import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Bot, Send, Loader2, Sparkles, Trash2, Copy, Download, 
  TrendingUp, Package, Users, BarChart3, Lightbulb, 
  Target, Megaphone, ShoppingBag, DollarSign, Clock,
  ChevronDown, BookOpen
} from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";

const quickPromptCategories = [
  {
    icon: BarChart3,
    label: "অ্যানালিটিক্স",
    color: "from-blue-500 to-cyan-500",
    prompts: [
      { label: "📊 সেলস সামারি", prompt: "আজকের ও গত ৭ দিনের সেলস পারফরম্যান্স সামারি দাও। AOV, গ্রোথ রেট, ট্রেন্ড সহ।" },
      { label: "📈 গ্রোথ অ্যানালাইসিস", prompt: "গত ৩০ দিনের ডেটা বিশ্লেষণ করে গ্রোথ ট্রেন্ড ও প্যাটার্ন দেখাও।" },
      { label: "🔄 কনভার্শন রেট", prompt: "অসম্পূর্ণ অর্ডার ও কনভার্শন রেট বিশ্লেষণ করো এবং উন্নতির পরামর্শ দাও।" },
    ]
  },
  {
    icon: Package,
    label: "ইনভেন্টরি",
    color: "from-amber-500 to-orange-500",
    prompts: [
      { label: "📦 স্টক রিপোর্ট", prompt: "লো স্টক ও আউট অফ স্টক প্রোডাক্টের বিস্তারিত রিপোর্ট দাও। রিস্টক প্রায়োরিটি সহ।" },
      { label: "🏷️ প্রাইসিং অপটিমাইজ", prompt: "বেস্ট সেলিং প্রোডাক্টগুলোর প্রাইসিং রিভিউ করো। ডিসকাউন্ট স্ট্র্যাটেজি সহ।" },
      { label: "📋 ক্যাটাগরি পারফরম্যান্স", prompt: "কোন ক্যাটাগরি সবচেয়ে ভালো পারফর্ম করছে? নতুন ক্যাটাগরি সাজেস্ট করো।" },
    ]
  },
  {
    icon: Megaphone,
    label: "মার্কেটিং",
    color: "from-violet-500 to-purple-600",
    prompts: [
      { label: "💡 ক্যাম্পেইন আইডিয়া", prompt: "এই সপ্তাহের জন্য ৫টি মার্কেটিং ক্যাম্পেইন আইডিয়া দাও। বাজেট, চ্যানেল, ও টার্গেট অডিয়েন্স সহ।" },
      { label: "📱 সোশ্যাল মিডিয়া", prompt: "Facebook ও Instagram এর জন্য ৫টি পোস্ট আইডিয়া দাও ক্যাপশন সহ।" },
      { label: "🎁 অফার প্ল্যান", prompt: "আগামী মাসের জন্য একটি অফার ক্যালেন্ডার তৈরি করো। কুপন কোড, ডিসকাউন্ট % সহ।" },
    ]
  },
  {
    icon: Users,
    label: "কাস্টমার",
    color: "from-emerald-500 to-teal-500",
    prompts: [
      { label: "🎯 রিটেনশন টিপস", prompt: "কাস্টমার রিটেনশন বাড়াতে ৫টি অ্যাকশনেবল স্ট্র্যাটেজি দাও।" },
      { label: "👥 সেগমেন্টেশন", prompt: "কাস্টমার সেগমেন্ট বিশ্লেষণ করো (VIP, রিপিট বায়ার, অ্যাট-রিস্ক) এবং প্রতিটির জন্য স্ট্র্যাটেজি দাও।" },
      { label: "⭐ রিভিউ স্ট্র্যাটেজি", prompt: "প্রোডাক্ট রিভিউ বাড়ানোর জন্য একটি পরিকল্পনা তৈরি করো।" },
    ]
  },
];

const statCards = [
  { icon: TrendingUp, label: "গ্রোথ", color: "text-emerald-500" },
  { icon: ShoppingBag, label: "অর্ডার", color: "text-blue-500" },
  { icon: DollarSign, label: "রেভিনিউ", color: "text-amber-500" },
  { icon: Target, label: "কনভার্শন", color: "text-violet-500" },
];

const AdminAIAssistant = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat("admin");
  const [input, setInput] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    await sendMessage(prompt);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("কপি হয়েছে!");
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "👤 আপনি" : "🤖 AI"}: ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("এক্সপোর্ট হয়েছে!");
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
        {/* Premium Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">AI বিজনেস অ্যাসিস্ট্যান্ট</h1>
                <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-violet-500/10 to-purple-600/10 text-violet-600 border-violet-500/20">
                  <Sparkles className="w-3 h-3 mr-1" /> Premium
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">রিয়েল-টাইম ডেটা বিশ্লেষণ • মার্কেটিং পরামর্শ • গ্রোথ স্ট্র্যাটেজি</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportChat} className="h-8">
                  <Download className="w-3.5 h-3.5 mr-1" /> এক্সপোর্ট
                </Button>
                <Button variant="outline" size="sm" onClick={clearMessages} className="h-8">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> ক্লিয়ার
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Chat Card */}
        <Card className="flex-1 flex flex-col overflow-hidden border-violet-500/10">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="py-6">
                {/* Welcome */}
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Sparkles className="w-10 h-10 text-violet-500" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">আপনার AI বিজনেস পার্টনার</h2>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    আপনার স্টোরের রিয়েল-টাইম ডেটা বিশ্লেষণ করে ইনসাইট, মার্কেটিং আইডিয়া, ইনভেন্টরি পরামর্শ এবং গ্রোথ স্ট্র্যাটেজি পান
                  </p>
                </div>

                {/* Category Quick Prompts */}
                <div className="space-y-3 max-w-3xl mx-auto">
                  {quickPromptCategories.map((cat, ci) => (
                    <div key={ci} className="border rounded-xl overflow-hidden bg-card hover:border-primary/20 transition-colors">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === ci ? null : ci)}
                        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                            <cat.icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">{cat.prompts.length} প্রম্পট</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCategory === ci ? "rotate-180" : ""}`} />
                      </button>
                      {expandedCategory === ci && (
                        <div className="p-2 pt-0 grid gap-1.5">
                          {cat.prompts.map((qp, qi) => (
                            <button
                              key={qi}
                              onClick={() => handleQuickPrompt(qp.prompt)}
                              disabled={isLoading}
                              className="text-left p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                              <Lightbulb className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {qp.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0 shadow-sm">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-sm"
                          : "bg-muted/60 rounded-bl-md border border-border/50"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {/* Action bar for assistant messages */}
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyMessage(msg.content)} className="p-1 hover:bg-muted rounded-md" title="কপি">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <span className="text-[10px] text-muted-foreground/50 ml-1">
                            {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ml-2 mt-1 shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0 shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-bl-md border border-border/50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        ডেটা বিশ্লেষণ করছি...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {/* Bottom Input */}
          <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
            {/* Contextual Quick Prompts */}
            {messages.length > 0 && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin">
                {quickPromptCategories.flatMap(c => c.prompts).slice(0, 5).map((qp, i) => (
                  <button key={i} onClick={() => handleQuickPrompt(qp.prompt)} disabled={isLoading}
                    className="text-[11px] px-3 py-1.5 rounded-full border bg-card hover:bg-accent/50 transition-colors whitespace-nowrap disabled:opacity-50 shadow-sm">
                    {qp.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="আপনার প্রশ্ন লিখুন... (Shift+Enter নতুন লাইন)"
                className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-violet-500/10 focus:border-violet-500/30"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
            <div className="flex items-center justify-center mt-2">
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini দ্বারা চালিত • রিয়েল-টাইম ডেটা
              </span>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAIAssistant;
