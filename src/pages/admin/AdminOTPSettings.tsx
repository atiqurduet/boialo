import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Phone, UserCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

interface OTPSetting {
  id: string;
  setting_key: string;
  setting_value: boolean;
  description: string | null;
}

const AdminOTPSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["otp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("category", "security")
        .in("setting_key", ["otp_enabled", "otp_required_for_cod", "otp_required_for_new_customers", "otp_only_for_cod"]);
      
      if (error) throw error;
      
      return data.map(setting => ({
        ...setting,
        setting_value: setting.setting_value === true || setting.setting_value === "true"
      })) as OTPSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["otp-settings"] });
      toast.success("OTP সেটিংস আপডেট হয়েছে");
    },
    onError: (error) => {
      toast.error("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    },
  });

  const getSetting = (key: string) => {
    return settings?.find(s => s.setting_key === key)?.setting_value ?? false;
  };

  const toggleSetting = (key: string, currentValue: boolean) => {
    updateMutation.mutate({ key, value: !currentValue });
  };

  const settingConfig = [
    {
      key: "otp_enabled",
      title: "OTP ভেরিফিকেশন",
      description: "সমস্ত অর্ডারের জন্য ফোন নম্বর OTP ভেরিফিকেশন সক্রিয় করুন",
      icon: Shield,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "otp_only_for_cod",
      title: "শুধুমাত্র COD অর্ডারে OTP",
      description: "OTP শুধুমাত্র ক্যাশ অন ডেলিভারি অর্ডারের জন্য প্রযোজ্য (অন্যান্য পেমেন্ট মেথডে OTP লাগবে না)",
      icon: Phone,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      key: "otp_required_for_cod",
      title: "COD অর্ডারে OTP বাধ্যতামূলক",
      description: "ক্যাশ অন ডেলিভারি অর্ডারের জন্য OTP ভেরিফিকেশন প্রয়োজন",
      icon: Phone,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      key: "otp_required_for_new_customers",
      title: "নতুন কাস্টমারদের জন্য OTP",
      description: "শুধুমাত্র নতুন কাস্টমারদের জন্য OTP ভেরিফিকেশন প্রয়োজন",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  const activeCount = settings?.filter(s => s.setting_value).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              OTP সেটিংস
            </h1>
            <p className="text-muted-foreground mt-1">
              অর্ডার ভেরিফিকেশনের জন্য OTP সেটিংস নিয়ন্ত্রণ করুন
            </p>
          </div>
          <Badge 
            variant={activeCount > 0 ? "default" : "secondary"}
            className="text-sm px-3 py-1"
          >
            {activeCount} / {settingConfig.length} সক্রিয়
          </Badge>
        </div>

        {/* Status Alert */}
        <Card className={activeCount > 0 ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50"}>
          <CardContent className="flex items-center gap-3 py-4">
            {activeCount > 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-800">OTP সুরক্ষা সক্রিয় আছে</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800">OTP সুরক্ষা নিষ্ক্রিয় আছে - ফ্রড অর্ডার বাড়তে পারে</span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              লোড হচ্ছে...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {settingConfig.map((config, index) => {
              const isEnabled = getSetting(config.key);
              const Icon = config.icon;
              
              return (
                <Card 
                  key={config.key}
                  className={`transition-all ${isEnabled ? 'border-primary/50 shadow-sm' : ''}`}
                >
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${config.bgColor}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{config.title}</h3>
                          {isEnabled && (
                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                              সক্রিয়
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">{config.description}</p>
                      </div>
                      
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleSetting(config.key, isEnabled)}
                        disabled={updateMutation.isPending}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">OTP কীভাবে কাজ করে?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• কাস্টমার চেকআউটের সময় ফোন নম্বর দিলে ৬ সংখ্যার OTP পাঠানো হয়</p>
            <p>• OTP ৫ মিনিটের মধ্যে ভেরিফাই করতে হবে</p>
            <p>• ভেরিফাইড কাস্টমাররা পরবর্তী অর্ডারে দ্রুত চেকআউট করতে পারবেন</p>
            <p>• SMS প্রোভাইডার সক্রিয় থাকতে হবে (Admin → SMS সেটিংস)</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminOTPSettings;
