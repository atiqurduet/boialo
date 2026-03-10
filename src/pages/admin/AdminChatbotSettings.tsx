import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Save, Plus, Trash2, MessageCircle, Shield, Sparkles, BookOpen, Loader2, Facebook, Phone, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FAQItem {
  question: string;
  answer: string;
}

const AdminChatbotSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [botName, setBotName] = useState("বই বন্ধু");
  const [tone, setTone] = useState("friendly");
  const [customInstructions, setCustomInstructions] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [restrictedTopics, setRestrictedTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [fbEnabled, setFbEnabled] = useState(false);
  const [waEnabled, setWaEnabled] = useState(false);
  const [fbPageToken, setFbPageToken] = useState("");
  const [fbVerifyToken, setFbVerifyToken] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "chatbot_enabled", "chatbot_greeting", "chatbot_custom_instructions",
        "chatbot_faq", "chatbot_name", "chatbot_tone",
        "chatbot_restricted_topics", "chatbot_fallback_message",
        "chatbot_fb_enabled", "chatbot_wa_enabled",
        "chatbot_fb_page_token", "chatbot_fb_verify_token",
        "chatbot_wa_access_token", "chatbot_wa_phone_number_id"
      ]);

    const map: Record<string, any> = {};
    (data || []).forEach((s: any) => {
      try {
        map[s.setting_key] = typeof s.setting_value === "string" ? JSON.parse(s.setting_value) : s.setting_value;
      } catch {
        map[s.setting_key] = s.setting_value;
      }
    });

    setEnabled(map.chatbot_enabled !== false && map.chatbot_enabled !== "false");
    setGreeting(map.chatbot_greeting || "");
    setBotName(map.chatbot_name || "বই বন্ধু");
    setTone(map.chatbot_tone || "friendly");
    setCustomInstructions(map.chatbot_custom_instructions || "");
    setFallbackMessage(map.chatbot_fallback_message || "");
    setRestrictedTopics(Array.isArray(map.chatbot_restricted_topics) ? map.chatbot_restricted_topics : []);
    setFaqs(Array.isArray(map.chatbot_faq) ? map.chatbot_faq : []);
    setFbEnabled(map.chatbot_fb_enabled === true || map.chatbot_fb_enabled === "true");
    setWaEnabled(map.chatbot_wa_enabled === true || map.chatbot_wa_enabled === "true");
    setFbPageToken(map.chatbot_fb_page_token || "");
    setFbVerifyToken(map.chatbot_fb_verify_token || "");
    setWaAccessToken(map.chatbot_wa_access_token || "");
    setWaPhoneNumberId(map.chatbot_wa_phone_number_id || "");
    setLoading(false);
  };

  const saveSetting = async (key: string, value: any) => {
    await supabase
      .from("site_settings")
      .upsert({ setting_key: key, setting_value: JSON.stringify(value) }, { onConflict: "setting_key" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting("chatbot_enabled", enabled),
        saveSetting("chatbot_greeting", greeting),
        saveSetting("chatbot_name", botName),
        saveSetting("chatbot_tone", tone),
        saveSetting("chatbot_custom_instructions", customInstructions),
        saveSetting("chatbot_fallback_message", fallbackMessage),
        saveSetting("chatbot_restricted_topics", restrictedTopics),
        saveSetting("chatbot_faq", faqs),
      ]);
      toast.success("চ্যাটবট সেটিংস সেভ হয়েছে!");
    } catch {
      toast.error("সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const addFAQ = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFAQ = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFAQ = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const addTopic = () => {
    if (newTopic.trim() && !restrictedTopics.includes(newTopic.trim())) {
      setRestrictedTopics([...restrictedTopics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    setRestrictedTopics(restrictedTopics.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI চ্যাটবট সেটিংস</h1>
              <p className="text-sm text-muted-foreground">চ্যাটবটের আচরণ, গ্রিটিং, FAQ এবং নিয়ন্ত্রণ</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            সেভ করুন
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-violet-500" /> সাধারণ সেটিংস
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <Label className="font-medium">চ্যাটবট চালু/বন্ধ</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">ওয়েবসাইটে AI চ্যাটবট দেখানো হবে কিনা</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="space-y-2">
                <Label>বটের নাম</Label>
                <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="বই বন্ধু" />
              </div>

              <div className="space-y-2">
                <Label>কথা বলার ধরন (Tone)</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">🤗 বন্ধুসুলভ</SelectItem>
                    <SelectItem value="professional">💼 প্রফেশনাল</SelectItem>
                    <SelectItem value="casual">😊 ক্যাজুয়াল</SelectItem>
                    <SelectItem value="formal">🎩 ফর্মাল</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>গ্রিটিং মেসেজ</Label>
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="আসসালামু আলাইকুম! 👋 আমি বই বন্ধু..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">গ্রাহক প্রথমবার চ্যাট খুললে এই মেসেজ দেখবে</p>
              </div>

              <div className="space-y-2">
                <Label>ফলব্যাক মেসেজ</Label>
                <Textarea
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  placeholder="দুঃখিত, এই বিষয়ে আমি সাহায্য করতে পারছি না..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">নিষিদ্ধ বিষয়ে জিজ্ঞেস করলে বট এই উত্তর দেবে</p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-4 h-4 text-blue-500" /> কাস্টম নির্দেশনা
              </CardTitle>
              <CardDescription>বটকে কীভাবে উত্তর দিতে হবে সে সম্পর্কে বিশেষ নির্দেশনা</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>কাস্টম প্রম্পট / নির্দেশনা</Label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={"উদাহরণ:\n- সবসময় বাংলায় উত্তর দাও\n- প্রতিটি উত্তরে কমপক্ষে ২টি বই সাজেস্ট করো\n- ডেলিভারি চার্জ সম্পর্কে সবসময় জানাও\n- প্রোমোশনাল কোড WELCOME10 সবাইকে জানাও"}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">এই নির্দেশনাগুলো AI এর সিস্টেম প্রম্পটে যুক্ত হবে</p>
              </div>

              {/* Restricted Topics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <Label>নিষিদ্ধ বিষয়</Label>
                </div>
                <p className="text-xs text-muted-foreground">এই বিষয়গুলো সম্পর্কে বট উত্তর দেবে না</p>
                <div className="flex gap-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="বিষয় লিখুন..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                  />
                  <Button variant="outline" size="icon" onClick={addTopic}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {restrictedTopics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {topic}
                      <button onClick={() => removeTopic(i)} className="ml-1 hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {restrictedTopics.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">কোনো নিষিদ্ধ বিষয় নেই</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4 text-emerald-500" /> FAQ / প্রি-সেট উত্তর
                </CardTitle>
                <CardDescription>কমন প্রশ্নের জন্য আগে থেকে উত্তর সেট করুন — AI এই উত্তরগুলো অগ্রাধিকার দেবে</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFAQ}>
                <Plus className="w-4 h-4 mr-1" /> FAQ যোগ করুন
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {faqs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">কোনো FAQ যোগ করা হয়নি</p>
                <p className="text-xs mt-1">উপরের বাটনে ক্লিক করে FAQ যোগ করুন</p>
              </div>
            ) : (
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground mt-2">#{i + 1}</span>
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">প্রশ্ন</Label>
                          <Input
                            value={faq.question}
                            onChange={(e) => updateFAQ(i, "question", e.target.value)}
                            placeholder="যেমন: ডেলিভারি চার্জ কত?"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">উত্তর</Label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => updateFAQ(i, "answer", e.target.value)}
                            placeholder="যেমন: ঢাকার ভিতরে ৳60, ঢাকার বাইরে ৳120..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFAQ(i)} className="text-destructive hover:text-destructive shrink-0 mt-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminChatbotSettings;
