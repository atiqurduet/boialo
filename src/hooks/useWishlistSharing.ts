import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useWishlistSharing = () => {
  const { user } = useAuth();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const generateShareLink = async () => {
    if (!user) {
      toast.error("শেয়ার করতে লগইন করুন");
      return null;
    }

    setSharing(true);
    try {
      // Check for existing share
      const { data: existing } = await supabase
        .from("shared_wishlists")
        .select("share_code")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        const url = `${window.location.origin}/wishlist/shared/${existing.share_code}`;
        setShareUrl(url);
        return url;
      }

      // Generate new share code
      const shareCode = Math.random().toString(36).substring(2, 10);
      const { error } = await supabase.from("shared_wishlists").insert({
        user_id: user.id,
        share_code: shareCode,
      });

      if (error) throw error;

      const url = `${window.location.origin}/wishlist/shared/${shareCode}`;
      setShareUrl(url);
      toast.success("শেয়ার লিংক তৈরি হয়েছে");
      return url;
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("শেয়ার লিংক তৈরি করা যায়নি");
      return null;
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = async () => {
    const url = shareUrl || (await generateShareLink());
    if (url) {
      await navigator.clipboard.writeText(url);
      toast.success("লিংক কপি হয়েছে");
    }
  };

  return { shareUrl, sharing, generateShareLink, copyShareLink };
};
