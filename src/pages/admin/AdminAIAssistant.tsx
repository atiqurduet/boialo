import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Send, Loader2, Sparkles, Trash2, TrendingUp, Package, Users, BarChart3 } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";

const quickPrompts = [
  { label: "📊 আজকের সেলস সামারি", prompt: "আজকের সেলস পারফরম্যান্স সামারি দাও" },
  { label: "📦 লো স্টক রিপোর্ট", prompt: "কোন কোন প্রোডাক্ট লো স্টকে আছে এবং কী করা উচিত?" },
  { label: "💡 মার্কেটিং আইডিয়া", prompt: "এই মাসের জন্য ৫টি মার্কেটিং ক্যাম্পেইন আইডিয়া দাও" },
  { label: "🎯 কাস্টমার রিটেনশন", prompt: "কাস্টমার রিটেনশন বাড়াতে কী কী করা যায়?" },
  { label: "💰 প্রাইসিং স্ট্র্যাটেজি", prompt: "বেস্ট সেলিং প্রোডাক্টগুলোর প্রাইসিং অপটিমাইজ করার পরামর্শ দাও" },
  { label: "📈 গ্রোথ প্ল্যান", prompt: "পরবর্তী ৩ মাসের জন্য একটি গ্রোথ প্ল্যান তৈরি করো" },
];

const AdminAIAssistant = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat("admin");
  const [input, setInput] = useState("");
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    await sendMessage(prompt);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI বিজনেস অ্যাসিস্ট্যান্ট</h1>
              <p className="text-sm text-muted-foreground">আপনার স্টোরের ডেটা বিশ্লেষণ ও পরামর্শ</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearMessages}>
              <Trash2 className="w-4 h-4 mr-1" />
              ক্লিয়ার
            </Button>
          )}
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI অ্যাসিস্ট্যান্ট</h3>
                <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
                  আপনার স্টোরের ডেটা বিশ্লেষণ করে ইনসাইট, মার্কেটিং পরামর্শ, এবং বিজনেস স্ট্র্যাটেজি পাবেন
                </p>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl">
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(qp.prompt)}
                      className="text-left p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-sm"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        চিন্তা করছি...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            {messages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {quickPrompts.slice(0, 4).map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-accent/50 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
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
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAIAssistant;
