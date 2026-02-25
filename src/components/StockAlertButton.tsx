import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StockAlertButtonProps {
  productId: string;
  isOutOfStock: boolean;
}

export function StockAlertButton({ productId, isOutOfStock }: StockAlertButtonProps) {
  const { user } = useAuth();

  const { data: existingAlert, refetch } = useQuery({
    queryKey: ["back-in-stock-alert", productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("back_in_stock_alerts")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isOutOfStock,
  });

  const toggleAlert = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (existingAlert) {
        await supabase.from("back_in_stock_alerts").delete().eq("id", existingAlert.id);
      } else {
        const { error } = await supabase.from("back_in_stock_alerts").insert({
          user_id: user.id,
          product_id: productId,
          email: user.email,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetch();
      toast.success(existingAlert ? "অ্যালার্ট বাতিল হয়েছে" : "স্টকে আসলে নোটিফিকেশন পাবেন");
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  if (!isOutOfStock) return null;

  return (
    <Button
      variant={existingAlert ? "secondary" : "outline"}
      size="sm"
      onClick={() => {
        if (!user) {
          toast.error("লগইন করুন");
          return;
        }
        toggleAlert.mutate();
      }}
      disabled={toggleAlert.isPending}
    >
      {toggleAlert.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : existingAlert ? (
        <BellOff className="h-4 w-4 mr-1" />
      ) : (
        <Bell className="h-4 w-4 mr-1" />
      )}
      {existingAlert ? "অ্যালার্ট সেট আছে" : "স্টকে আসলে জানান"}
    </Button>
  );
}
