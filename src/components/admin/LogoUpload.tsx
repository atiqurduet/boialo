import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  folder?: string;
}

export const LogoUpload = ({ value, onChange, label, folder = 'logos' }: LogoUploadProps) => {
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

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ফাইল সাইজ ২MB এর বেশি হতে পারবে না');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

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
      toast.success('লোগো আপলোড হয়েছে');
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
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="h-16 max-w-[200px] object-contain bg-muted p-2 rounded-lg border"
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
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <p className="text-sm">কোনো লোগো নেই</p>
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
            {value ? 'লোগো পরিবর্তন' : 'লোগো আপলোড'}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">সর্বোচ্চ ২MB, PNG/JPG/SVG</p>
    </div>
  );
};