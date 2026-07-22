import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MediaPickerButton } from './MediaPickerButton';

interface ProductImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  productId?: string;
}

export const ProductImageUpload = ({ images, onImagesChange, productId }: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'ত্রুটি',
            description: `${file.name} একটি বৈধ ইমেজ নয়`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'ত্রুটি',
            description: `${file.name} ৫MB এর বেশি`,
            variant: 'destructive',
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = productId ? `${productId}/${fileName}` : `temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'আপলোড ত্রুটি',
            description: uploadError.message,
            variant: 'destructive',
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({
          title: 'সফল',
          description: `${newImages.length}টি ইমেজ আপলোড হয়েছে`,
        });
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: 'ত্রুটি',
        description: 'ইমেজ আপলোড করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index: number) => {
    const imageUrl = images[index];
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    // Try to delete from storage
    try {
      const urlParts = imageUrl.split('/product-images/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('product-images').remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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
              ইমেজ আপলোড
            </>
          )}
        </Button>
        <MediaPickerButton
          multiple
          defaultFolder="products"
          accept="image"
          label="লাইব্রেরি থেকে নিন"
          onSelect={(urls) => onImagesChange([...images, ...urls])}
        />
        <span className="text-sm text-muted-foreground">
          সর্বোচ্চ ৫MB, JPG/PNG/WEBP
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                  প্রধান
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>কোনো ইমেজ নেই</p>
          <p className="text-sm">উপরের বাটনে ক্লিক করে ইমেজ যোগ করুন</p>
        </div>
      )}
    </div>
  );
};
