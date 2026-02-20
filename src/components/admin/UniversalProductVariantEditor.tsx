import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Upload, X, Loader2, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export interface ProductVariant {
  id?: string;
  variant_name_bn: string;
  variant_name_en: string;
  variant_type: string;
  sku: string;
  price: number;
  original_price: number;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  sort_order: number;
  isNew?: boolean;
}

interface Props {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  productId?: string;
}

const VariantImageUpload = ({ images, onImagesChange }: { images: string[]; onImagesChange: (imgs: string[]) => void }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImgs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) continue;

      const fileName = `variants/${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        newImgs.push(publicUrl);
      }
    }

    if (newImgs.length > 0) {
      onImagesChange([...images, ...newImgs]);
      toast({ title: 'সফল', description: `${newImgs.length}টি ছবি আপলোড হয়েছে` });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImg = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          ছবি আপলোড
        </Button>
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, idx) => (
            <div key={idx} className="relative group">
              <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
              <button
                type="button"
                onClick={() => removeImg(idx)}
                className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {idx === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-primary/80 text-primary-foreground rounded-b">প্রধান</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const UniversalProductVariantEditor = ({ variants, onChange, productId }: Props) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const variantTypes = ['সাইজ', 'রং', 'ওজন', 'প্যাকেজ', 'এডিশন', 'ফ্লেভার', 'ম্যাটেরিয়াল', 'অন্যান্য'];

  const addVariant = () => {
    const newVariant: ProductVariant = {
      variant_name_bn: '',
      variant_name_en: '',
      variant_type: 'অন্যান্য',
      sku: '',
      price: 0,
      original_price: 0,
      stock_quantity: 0,
      images: [],
      is_active: true,
      sort_order: variants.length,
      isNew: true,
    };
    const updated = [...variants, newVariant];
    onChange(updated);
    setExpandedIdx(updated.length - 1);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    onChange(updated);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
    if (expandedIdx === index) setExpandedIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">প্রতিটি ভেরিয়েন্টে আলাদা দাম, স্টক এবং ছবি থাকবে</p>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="h-4 w-4 mr-1" />
          ভেরিয়েন্ট যোগ
        </Button>
      </div>

      {variants.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">কোনো ভেরিয়েন্ট নেই</p>
          <p className="text-xs">সাইজ, রং বা অন্য বিভিন্নতা যোগ করুন</p>
        </div>
      )}

      {variants.map((variant, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer"
            onClick={() => setExpandedIdx(expandedIdx === index ? null : index)}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{variant.variant_type || 'ভেরিয়েন্ট'}</Badge>
              <span className="font-medium text-sm">{variant.variant_name_bn || `ভেরিয়েন্ট ${index + 1}`}</span>
              {variant.price > 0 && <span className="text-xs text-muted-foreground">৳{variant.price}</span>}
              <Badge variant={variant.is_active ? 'default' : 'secondary'} className="text-xs">
                {variant.is_active ? 'অ্যাক্টিভ' : 'বন্ধ'}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeVariant(index); }}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
              {expandedIdx === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          {expandedIdx === index && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">ভেরিয়েন্ট ধরন</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={variant.variant_type}
                    onChange={(e) => updateVariant(index, 'variant_type', e.target.value)}
                  >
                    {variantTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">নাম (বাংলা) *</Label>
                  <Input value={variant.variant_name_bn} onChange={(e) => updateVariant(index, 'variant_name_bn', e.target.value)} className="h-9 text-sm" placeholder="যেমন: লাল, XL, ৫০০গ্রা" />
                </div>
                <div>
                  <Label className="text-xs">Name (English)</Label>
                  <Input value={variant.variant_name_en} onChange={(e) => updateVariant(index, 'variant_name_en', e.target.value)} className="h-9 text-sm" placeholder="e.g. Red, XL, 500g" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">বিক্রয় মূল্য (৳) *</Label>
                  <Input type="number" value={variant.price} onChange={(e) => updateVariant(index, 'price', Number(e.target.value))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">আসল মূল্য (৳)</Label>
                  <Input type="number" value={variant.original_price} onChange={(e) => updateVariant(index, 'original_price', Number(e.target.value))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">স্টক পরিমাণ</Label>
                  <Input type="number" value={variant.stock_quantity} onChange={(e) => updateVariant(index, 'stock_quantity', Number(e.target.value))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">SKU</Label>
                  <Input value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">ভেরিয়েন্ট ছবি</Label>
                <VariantImageUpload
                  images={variant.images}
                  onImagesChange={(imgs) => updateVariant(index, 'images', imgs)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={variant.is_active} onCheckedChange={(c) => updateVariant(index, 'is_active', c)} />
                <Label className="text-xs">অ্যাক্টিভ</Label>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
