import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Eye } from 'lucide-react';

interface ProductPreviewUploadProps {
  previewUrl: string;
  onPreviewChange: (url: string) => void;
  productId?: string;
}

export const ProductPreviewUpload = ({ previewUrl, onPreviewChange, productId }: ProductPreviewUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images or PDF)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'ত্রুটি',
        description: 'শুধু ইমেজ বা PDF ফাইল গ্রহণযোগ্য',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB for PDFs, 5MB for images)
    const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'ত্রুটি',
        description: `ফাইল সাইজ ${file.type === 'application/pdf' ? '১০MB' : '৫MB'} এর বেশি`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old file if exists
      if (previewUrl) {
        try {
          const urlParts = previewUrl.split('/product-previews/');
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1]);
            await supabase.storage.from('product-previews').remove([filePath]);
          }
        } catch (error) {
          console.error('Error deleting old preview:', error);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = productId ? `${productId}/${fileName}` : `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-previews')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-previews')
        .getPublicUrl(filePath);

      onPreviewChange(publicUrl);
      toast({
        title: 'সফল',
        description: 'প্রিভিউ ফাইল আপলোড হয়েছে',
      });
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast({
        title: 'ত্রুটি',
        description: error.message || 'ফাইল আপলোড করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePreview = async () => {
    if (previewUrl) {
      try {
        const urlParts = previewUrl.split('/product-previews/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('product-previews').remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting preview:', error);
      }
    }
    onPreviewChange('');
  };

  const isPdf = previewUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              আপলোড হচ্ছে...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              একটু পড়ুন ফাইল আপলোড
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          ইমেজ (৫MB) বা PDF (১০MB)
        </span>
      </div>

      {previewUrl ? (
        <div className="relative border rounded-lg p-4">
          <div className="flex items-center gap-4">
            {isPdf ? (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <FileText className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">PDF ফাইল আপলোড হয়েছে</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    প্রিভিউ দেখুন
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded-lg"
                />
                <div>
                  <p className="font-medium">ইমেজ আপলোড হয়েছে</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    পূর্ণ সাইজে দেখুন
                  </a>
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removePreview}
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <div className="flex justify-center gap-2 mb-2">
            <ImageIcon className="h-8 w-8 opacity-50" />
            <FileText className="h-8 w-8 opacity-50" />
          </div>
          <p>কোনো প্রিভিউ ফাইল নেই</p>
          <p className="text-sm">বইয়ের কিছু পৃষ্ঠা বা স্যাম্পল চ্যাপ্টার যোগ করুন</p>
        </div>
      )}
    </div>
  );
};
