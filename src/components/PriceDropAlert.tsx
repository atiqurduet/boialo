import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PriceDropAlertProps {
  productId: string;
  currentPrice: number;
}

export function PriceDropAlert({ productId, currentPrice }: PriceDropAlertProps) {
  const { user } = useAuth();

  const { data: existingAlert, refetch } = useQuery({
    queryKey: ["price-drop-alert", productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("price_drop_alerts")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const toggleAlert = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (existingAlert) {
        await supabase.from("price_drop_alerts").delete().eq("id", existingAlert.id);
      } else {
        const { error } = await supabase.from("price_drop_alerts").insert({
          user_id: user.id,
          product_id: productId,
          original_price: currentPrice,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetch();
      toast.success(existingAlert ? "অ্যালার্ট বাতিল" : "দাম কমলে জানানো হবে");
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (!user) { toast.error("লগইন করুন"); return; }
        toggleAlert.mutate();
      }}
      disabled={toggleAlert.isPending}
      className={existingAlert ? "text-primary" : "text-muted-foreground"}
    >
      {toggleAlert.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <TrendingDown className="h-4 w-4 mr-1" />
      )}
      {existingAlert ? "প্রাইস অ্যালার্ট সেট আছে" : "দাম কমলে জানান"}
    </Button>
  );
}
