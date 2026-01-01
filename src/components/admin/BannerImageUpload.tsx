import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';

interface BannerImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  aspectRatio?: 'desktop' | 'mobile';
}

export const BannerImageUpload = ({ value, onChange, label, aspectRatio = 'desktop' }: BannerImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('অনুগ্রহ করে একটি বৈধ ইমেজ ফাইল নির্বাচন করুন');
      return;
    }

    // Validate file size (max 5MB for banners)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ফাইল সাইজ ৫MB এর বেশি হতে পারবে না');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banners/${Date.now()}.${fileExt}`;

      // Delete old file if exists
      if (value) {
        const urlParts = value.split('/branding/');
        if (urlParts.length > 1) {
          const oldPath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('branding').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success('ব্যানার ইমেজ আপলোড হয়েছে');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('আপলোড করতে সমস্যা হয়েছে');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        const urlParts = value.split('/branding/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('branding').remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
    onChange('');
  };

  const containerClass = aspectRatio === 'desktop' 
    ? 'aspect-[16/5] max-w-full' 
    : 'aspect-[9/16] max-w-[150px]';

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {value ? (
        <div className={`relative ${containerClass}`}>
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className={`border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground ${containerClass} flex items-center justify-center`}>
          <p className="text-sm">{label}</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
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
            {value ? 'ইমেজ পরিবর্তন' : 'ইমেজ আপলোড'}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        {aspectRatio === 'desktop' ? 'প্রস্তাবিত: ১৯২০x৬০০px' : 'প্রস্তাবিত: ৭৫০x১২০০px'} • সর্বোচ্চ ৫MB
      </p>
    </div>
  );
};
