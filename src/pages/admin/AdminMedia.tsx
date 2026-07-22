import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";

export default function AdminMedia() {
  const [open, setOpen] = useState(true);

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">মিডিয়া লাইব্রেরি</h1>
            <p className="text-muted-foreground text-sm">সব image ও PDF এক জায়গায় manage করুন</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <ImageIcon className="h-4 w-4 mr-2" />
            লাইব্রেরি খুলুন
          </Button>
        </div>

        <Card className="p-6 text-sm space-y-2">
          <p className="font-semibold">কীভাবে ব্যবহার করবেন?</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>উপরের "লাইব্রেরি খুলুন" বাটনে ক্লিক করুন</li>
            <li>ফোল্ডার সিলেক্ট করে একসাথে অনেক ফাইল আপলোড করুন</li>
            <li>Product/Banner/Blog editor থেকেও এই লাইব্রেরি থেকে select করা যায়</li>
            <li>সব ফাইল আপনার cPanel-এ stored হয়, শুধু URL database-এ যায়</li>
          </ul>
        </Card>

        <MediaLibraryModal
          open={open}
          onOpenChange={setOpen}
          onSelect={() => {}}
          multiple={true}
          accept="all"
          defaultFolder="products"
        />
      </div>
    </AdminLayout>
  );
}
