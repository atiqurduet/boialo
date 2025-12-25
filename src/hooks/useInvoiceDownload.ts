import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInvoiceDownload = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceFilename, setInvoiceFilename] = useState<string>("");

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
        setInvoiceHtml(data.rawHtml);
        setInvoiceFilename(data.filename || `invoice-${orderId}.html`);
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("ইনভয়েস ডাউনলোড করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(null);
    }
  };

  const printInvoice = () => {
    if (!invoiceHtml) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
    }
  };

  const saveAsPdf = () => {
    if (!invoiceHtml) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const htmlWithPrintHint = invoiceHtml.replace(
        '</style>',
        `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        </style>
        `
      );
      printWindow.document.write(htmlWithPrintHint);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
      toast.info("প্রিন্ট ডায়ালগ থেকে 'Save as PDF' নির্বাচন করুন");
    }
  };

  const downloadAsHtml = () => {
    if (!invoiceHtml) return;
    
    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = invoiceFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("ইনভয়েস ডাউনলোড হয়েছে");
  };

  const closeInvoice = () => {
    setInvoiceHtml(null);
    setInvoiceFilename("");
  };

  return { 
    downloadInvoice, 
    downloading, 
    invoiceHtml, 
    printInvoice, 
    saveAsPdf, 
    downloadAsHtml,
    closeInvoice 
  };
};
