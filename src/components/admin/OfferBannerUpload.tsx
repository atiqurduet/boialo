import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface OfferBannerUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export const OfferBannerUpload = ({ value, onChange, label = "ব্যানার ইমেজ" }: OfferBannerUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'ভুল ফাইল টাইপ',
        description: 'শুধুমাত্র ইমেজ ফাইল আপলোড করুন',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'ফাইল অনেক বড়',
        description: 'ফাইল সাইজ ৫MB এর কম হতে হবে',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old image if exists
      if (value) {
        const oldPath = value.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('product-images').remove([`offers/${oldPath}`]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `offer-${Date.now()}.${fileExt}`;
      const filePath = `offers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast({ title: 'সফল', description: 'ইমেজ আপলোড হয়েছে' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'আপলোড ব্যর্থ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleRemove = async () => {
    if (value) {
      try {
        const oldPath = value.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('product-images').remove([`offers/${oldPath}`]);
        }
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative group">
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden border bg-muted">
            <img
              src={value}
              alt="Offer banner preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1">পরিবর্তন</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
                <span className="ml-1">মুছুন</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative aspect-[16/9] rounded-lg border-2 border-dashed cursor-pointer
            transition-colors flex flex-col items-center justify-center gap-2
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">আপলোড হচ্ছে...</span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">ক্লিক করুন বা ড্র্যাগ করুন</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP (সর্বোচ্চ ৫MB)</p>
                <p className="text-xs text-muted-foreground mt-1">প্রস্তাবিত সাইজ: 1200 x 675 px</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
};
