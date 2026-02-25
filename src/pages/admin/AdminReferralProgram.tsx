import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Gift, Users, TrendingUp, DollarSign, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const AdminReferralProgram = () => {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings = [] } = useQuery({
    queryKey: ["referral-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("referral_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getSetting = (key: string, defaultVal: any = null) => {
    const s = settings.find((s: any) => s.setting_key === key);
    return s ? s.setting_value : defaultVal;
  };

  const [formData, setFormData] = useState<Record<string, any>>({});

  // Initialize form when settings load
  const isEnabled = formData.is_enabled ?? getSetting("is_enabled", false);
  const referrerReward = formData.referrer_reward_amount ?? getSetting("referrer_reward_amount", 50);
  const referredReward = formData.referred_reward_amount ?? getSetting("referred_reward_amount", 30);
  const minOrder = formData.min_order_amount ?? getSetting("min_order_amount", 200);

  // Fetch referral stats
  const { data: referralCodes = [] } = useQuery({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .order("total_referrals", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentRewards = [] } = useQuery({
    queryKey: ["admin-referral-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalReferrals = referralCodes.reduce((sum: number, c: any) => sum + (c.total_referrals || 0), 0);
  const totalEarned = referralCodes.reduce((sum: number, c: any) => sum + Number(c.total_earned || 0), 0);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const updates = [
        { setting_key: "is_enabled", setting_value: isEnabled },
        { setting_key: "referrer_reward_amount", setting_value: referrerReward },
        { setting_key: "referred_reward_amount", setting_value: referredReward },
        { setting_key: "min_order_amount", setting_value: minOrder },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from("referral_settings")
          .update({ setting_value: u.setting_value, updated_at: new Date().toISOString() })
          .eq("setting_key", u.setting_key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
      toast.success("সেটিংস সংরক্ষিত");
    },
    onError: (e) => toast.error("সমস্যা: " + e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            রেফারাল প্রোগ্রাম
          </h1>
          <p className="text-muted-foreground">কাস্টমার রেফারাল ও রিওয়ার্ড সিস্টেম</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg"><Users className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-2xl font-bold">{referralCodes.length}</p>
                  <p className="text-xs text-muted-foreground">রেফারাল কোড</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg"><TrendingUp className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalReferrals}</p>
                  <p className="text-xs text-muted-foreground">মোট রেফারাল</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg"><DollarSign className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-2xl font-bold">৳{totalEarned.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">মোট রিওয়ার্ড</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg"><Gift className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-2xl font-bold">{recentRewards.length}</p>
                  <p className="text-xs text-muted-foreground">পেন্ডিং রিওয়ার্ড</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>রেফারাল সেটিংস</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={!!isEnabled}
                onCheckedChange={(v) => setFormData({ ...formData, is_enabled: v })}
              />
              <Label>রেফারাল প্রোগ্রাম সক্রিয়</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>রেফারারের রিওয়ার্ড (৳)</Label>
                <Input
                  type="number"
                  value={referrerReward}
                  onChange={(e) => setFormData({ ...formData, referrer_reward_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>রেফার্ডের রিওয়ার্ড (৳)</Label>
                <Input
                  type="number"
                  value={referredReward}
                  onChange={(e) => setFormData({ ...formData, referred_reward_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>ন্যূনতম অর্ডার পরিমাণ (৳)</Label>
                <Input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              সংরক্ষণ করুন
            </Button>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle>টপ রেফারার</CardTitle>
          </CardHeader>
          <CardContent>
            {referralCodes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">কোন রেফারাল কোড নেই</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কোড</TableHead>
                    <TableHead className="text-center">রেফারাল</TableHead>
                    <TableHead className="text-right">আয়</TableHead>
                    <TableHead className="text-center">স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralCodes.map((code: any) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-bold">{code.code}</TableCell>
                      <TableCell className="text-center">{code.total_referrals}</TableCell>
                      <TableCell className="text-right">৳{Number(code.total_earned || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {code.is_active ? (
                          <Badge className="bg-green-500">সক্রিয়</Badge>
                        ) : (
                          <Badge variant="secondary">নিষ্ক্রিয়</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReferralProgram;
