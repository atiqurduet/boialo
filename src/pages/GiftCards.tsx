import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, CreditCard, Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AMOUNTS = [500, 1000, 2000, 5000];

const GiftCards = () => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const [redeemCode, setRedeemCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [cardInfo, setCardInfo] = useState<any>(null);

  const [myCards, setMyCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (user) fetchMyCards();
  }, [user]);

  const fetchMyCards = async () => {
    if (!user) return;
    setLoadingCards(true);
    const { data } = await supabase
      .from("gift_cards")
      .select("*")
      .or(`purchased_by.eq.${user.id},redeemed_by.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setMyCards(data || []);
    setLoadingCards(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "GC-";
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += "-";
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("গিফট কার্ড কিনতে লগইন করুন");
      return;
    }

    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount < 100) {
      toast.error("সর্বনিম্ন ৳১০০ এর গিফট কার্ড কেনা যায়");
      return;
    }

    setPurchasing(true);
    try {
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error } = await supabase.from("gift_cards").insert({
        code,
        amount,
        balance: amount,
        purchased_by: user.id,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        sender_name: senderName || null,
        message: message || null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success(`গিফট কার্ড তৈরি হয়েছে! কোড: ${code}`);
      setRecipientName("");
      setRecipientEmail("");
      setSenderName("");
      setMessage("");
      setCustomAmount("");
      fetchMyCards();
    } catch (error) {
      console.error("Error purchasing gift card:", error);
      toast.error("গিফট কার্ড তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setPurchasing(false);
    }
  };

  const checkCard = async () => {
    if (!redeemCode.trim()) return;
    setChecking(true);
    setCardInfo(null);

    const { data, error } = await supabase.rpc("validate_gift_card", {
      p_code: redeemCode.trim().toUpperCase(),
    });

    const result = data as any;
    if (result && result.valid) {
      setCardInfo({ balance: result.balance, code: redeemCode.trim().toUpperCase(), is_active: true });
    } else {
      setCardInfo(null);
    }
    setChecking(false);

    if (!data) {
      toast.error("গিফট কার্ড পাওয়া যায়নি");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Gift className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-foreground">গিফট কার্ড</h1>
            <p className="text-muted-foreground mt-2">প্রিয়জনকে পড়ার আনন্দ উপহার দিন</p>
          </div>

          <Tabs defaultValue="buy" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="buy">কিনুন</TabsTrigger>
              <TabsTrigger value="redeem">ব্যালেন্স চেক</TabsTrigger>
              <TabsTrigger value="my-cards">আমার কার্ড</TabsTrigger>
            </TabsList>

            <TabsContent value="buy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    গিফট কার্ড কিনুন
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Amount Selection */}
                  <div>
                    <Label>পরিমাণ নির্বাচন করুন</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {AMOUNTS.map(amount => (
                        <button
                          key={amount}
                          onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                          className={`p-4 rounded-lg border-2 text-center font-bold transition-colors ${
                            selectedAmount === amount && !customAmount
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          ৳{amount}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Input
                        placeholder="অথবা কাস্টম পরিমাণ লিখুন (৳)"
                        type="number"
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>আপনার নাম</Label>
                      <Input className="mt-1" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="প্রেরকের নাম" />
                    </div>
                    <div>
                      <Label>প্রাপকের নাম</Label>
                      <Input className="mt-1" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="প্রাপকের নাম" />
                    </div>
                  </div>

                  <div>
                    <Label>প্রাপকের ইমেইল (ঐচ্ছিক)</Label>
                    <Input className="mt-1" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="example@email.com" />
                  </div>

                  <div>
                    <Label>বার্তা (ঐচ্ছিক)</Label>
                    <Textarea className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার শুভেচ্ছা বার্তা..." rows={3} />
                  </div>

                  <Button className="w-full" size="lg" onClick={handlePurchase} disabled={purchasing}>
                    {purchasing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
                    ৳{customAmount || selectedAmount} এর গিফট কার্ড কিনুন
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="redeem">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    গিফট কার্ড ব্যালেন্স চেক করুন
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="গিফট কার্ড কোড লিখুন (যেমন: GC-XXXX-XXXX-XXXX)"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button onClick={checkCard} disabled={checking}>
                      {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "চেক"}
                    </Button>
                  </div>

                  {cardInfo && (
                    <Card className="border-primary/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm text-muted-foreground">{cardInfo.code}</p>
                            <p className="text-2xl font-bold text-primary mt-1">৳{Number(cardInfo.balance).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">মূল পরিমাণ: ৳{Number(cardInfo.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            {cardInfo.is_active && cardInfo.balance > 0 ? (
                              <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />সক্রিয়</Badge>
                            ) : (
                              <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />নিষ্ক্রিয়</Badge>
                            )}
                          </div>
                        </div>
                        {cardInfo.message && (
                          <p className="mt-3 p-3 bg-muted rounded-lg text-sm italic">"{cardInfo.message}"</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-cards">
              <Card>
                <CardHeader>
                  <CardTitle>আমার গিফট কার্ড</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCards ? (
                    <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                  ) : myCards.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">কোনো গিফট কার্ড নেই</p>
                  ) : (
                    <div className="space-y-3">
                      {myCards.map(card => (
                        <div key={card.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <p className="font-mono font-medium">{card.code}</p>
                            <p className="text-sm text-muted-foreground">
                              {card.recipient_name ? `প্রাপক: ${card.recipient_name}` : "নিজের জন্য"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">৳{Number(card.balance).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">/ ৳{Number(card.amount).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GiftCards;
