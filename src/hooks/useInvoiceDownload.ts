import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInvoiceDownload = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadInvoice = async (orderId: string) => {
    setDownloading(orderId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to download invoice");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { orderId },
      });

      if (error) throw error;

      if (data?.pdf) {
        // Create download link
        const link = document.createElement("a");
        link.href = data.pdf;
        link.download = data.filename || `invoice-${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("ইনভয়েস ডাউনলোড হয়েছে");
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("ইনভয়েস ডাউনলোড করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(null);
    }
  };

  return { downloadInvoice, downloading };
};
