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

      if (data?.rawHtml) {
        // Open invoice in new window for printing/saving as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.rawHtml);
          printWindow.document.close();
          
          // Add print styles and trigger print dialog after fonts load
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
          
          toast.success("ইনভয়েস তৈরি হয়েছে - প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন");
        } else {
          // Fallback: download as HTML file
          const blob = new Blob([data.rawHtml], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = data.filename || `invoice-${orderId}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.success("ইনভয়েস ডাউনলোড হয়েছে");
        }
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
