import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Copy, 
  ExternalLink 
} from "lucide-react";
import { toast } from "sonner";

interface CustomerContactActionsProps {
  customer: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export const CustomerContactActions = ({ customer }: CustomerContactActionsProps) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} কপি করা হয়েছে`);
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove all non-digits and add country code if not present
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "88" + cleaned;
    } else if (!cleaned.startsWith("88")) {
      cleaned = "88" + cleaned;
    }
    return cleaned;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5" />
          যোগাযোগ অপশন
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Phone Actions */}
        {customer.phone && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`tel:${customer.phone}`, "_self")}
            >
              <Phone className="h-4 w-4 mr-2" />
              কল করুন
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`https://wa.me/${formatPhoneForWhatsApp(customer.phone!)}`, "_blank")}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(customer.phone!, "ফোন নম্বর")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Email Actions */}
        {customer.email && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`mailto:${customer.email}`, "_blank")}
            >
              <Mail className="h-4 w-4 mr-2" />
              ইমেইল পাঠান
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(customer.email!, "ইমেইল")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Quick Message Templates */}
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">দ্রুত মেসেজ টেমপ্লেট</p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="justify-start text-left h-auto py-2"
              onClick={() => {
                const message = `হ্যালো ${customer.full_name || "গ্রাহক"}, আপনার কার্টে কিছু প্রোডাক্ট আছে। কোনো সাহায্য লাগলে জানাবেন!`;
                if (customer.phone) {
                  window.open(`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}?text=${encodeURIComponent(message)}`, "_blank");
                }
              }}
              disabled={!customer.phone}
            >
              🛒 কার্ট রিমাইন্ডার
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="justify-start text-left h-auto py-2"
              onClick={() => {
                const message = `হ্যালো ${customer.full_name || "গ্রাহক"}, আমরা আপনার জন্য বিশেষ অফার নিয়ে এসেছি! বিস্তারিত জানতে রিপ্লাই দিন।`;
                if (customer.phone) {
                  window.open(`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}?text=${encodeURIComponent(message)}`, "_blank");
                }
              }}
              disabled={!customer.phone}
            >
              🎁 অফার নোটিফিকেশন
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="justify-start text-left h-auto py-2"
              onClick={() => {
                const message = `হ্যালো ${customer.full_name || "গ্রাহক"}, আপনার অর্ডার সম্পর্কে জানাতে চাইছি। কিছু জানার থাকলে জানাবেন।`;
                if (customer.phone) {
                  window.open(`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}?text=${encodeURIComponent(message)}`, "_blank");
                }
              }}
              disabled={!customer.phone}
            >
              📦 অর্ডার আপডেট
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
