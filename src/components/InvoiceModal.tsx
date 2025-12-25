import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText, X } from "lucide-react";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceHtml: string | null;
  onPrint: () => void;
  onSaveAsPdf: () => void;
  onDownloadHtml: () => void;
}

export const InvoiceModal = ({
  isOpen,
  onClose,
  invoiceHtml,
  onPrint,
  onSaveAsPdf,
  onDownloadHtml,
}: InvoiceModalProps) => {
  if (!invoiceHtml) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">ইনভয়েস প্রিভিউ</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                প্রিন্ট
              </Button>
              <Button variant="outline" size="sm" onClick={onSaveAsPdf}>
                <Download className="w-4 h-4 mr-2" />
                PDF সংরক্ষণ
              </Button>
              <Button variant="outline" size="sm" onClick={onDownloadHtml}>
                <FileText className="w-4 h-4 mr-2" />
                HTML ডাউনলোড
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <iframe
              srcDoc={invoiceHtml}
              className="w-full h-full min-h-[600px]"
              title="Invoice Preview"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
