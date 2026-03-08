import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2, Link } from 'lucide-react';

interface InlineImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const InlineImageUpload = ({
  value,
  onChange,
  label = 'ইমেজ',
  placeholder = 'https://...',
  className = '',
}: InlineImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>(value && !value.includes('supabase') ? 'url' : 'upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('শুধুমাত্র ইমেজ ফাইল আপলোড করা যাবে');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ফাইল সাইজ ৫MB এর বেশি হতে পারবে না');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `email-templates/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success('ইমেজ আপলোড হয়েছে');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('আপলোড করতে সমস্যা হয়েছে');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <button
          type="button"
          onClick={() => setMode(m => m === 'upload' ? 'url' : 'upload')}
          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
        >
          {mode === 'upload' ? <><Link className="h-2.5 w-2.5" /> URL দিন</> : <><Upload className="h-2.5 w-2.5" /> আপলোড</>}
        </button>
      </div>

      {mode === 'url' ? (
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
      ) : (
        <div className="flex gap-1.5">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          {value ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <img src={value} alt="" className="h-8 w-8 rounded border object-cover shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate flex-1">{value.split('/').pop()}</span>
              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => onChange('')}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> আপলোড হচ্ছে...</>
              ) : (
                <><Upload className="h-3 w-3 mr-1.5" /> ইমেজ আপলোড করুন</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
