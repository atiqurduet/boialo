import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Attribute {
  id?: string;
  attribute_name_bn: string;
  attribute_name_en: string;
  attribute_value_bn: string;
  attribute_value_en: string;
  sort_order: number;
  isNew?: boolean;
}

interface AttributeTemplate {
  attribute_name_bn: string;
  attribute_name_en: string;
  is_required: boolean;
}

interface Props {
  productId?: string;
  productType: string;
  localAttributes: Attribute[];
  onChange: (attrs: Attribute[]) => void;
}

export const UniversalProductAttributeEditor = ({ productId, productType, localAttributes, onChange }: Props) => {
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (productType) {
      supabase
        .from('product_type_attribute_templates')
        .select('*')
        .eq('type_key', productType)
        .order('sort_order')
        .then(({ data }) => setTemplates(data || []));
    }
  }, [productType]);

  const addAttribute = (nameBn = '', nameEn = '') => {
    const newAttr: Attribute = {
      attribute_name_bn: nameBn,
      attribute_name_en: nameEn,
      attribute_value_bn: '',
      attribute_value_en: '',
      sort_order: localAttributes.length,
      isNew: true,
    };
    onChange([...localAttributes, newAttr]);
  };

  const updateAttribute = (index: number, field: keyof Attribute, value: string | number) => {
    const updated = [...localAttributes];
    (updated[index] as any)[field] = value;
    onChange(updated);
  };

  const removeAttribute = (index: number) => {
    onChange(localAttributes.filter((_, i) => i !== index));
  };

  const unusedTemplates = templates.filter(
    t => !localAttributes.some(a => a.attribute_name_bn === t.attribute_name_bn)
  );

  return (
    <div className="space-y-4">
      {/* Template suggestions */}
      {unusedTemplates.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2 text-muted-foreground">দ্রুত যোগ করুন (টেমপ্লেট থেকে):</p>
          <div className="flex flex-wrap gap-2">
            {unusedTemplates.map((t) => (
              <Button
                key={t.attribute_name_bn}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => addAttribute(t.attribute_name_bn, t.attribute_name_en || '')}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t.attribute_name_bn}
                {t.is_required && <span className="text-destructive ml-1">*</span>}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Attribute rows */}
      <div className="space-y-2">
        {localAttributes.map((attr, index) => (
          <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-card">
            <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground flex-shrink-0" />
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div>
                <Label className="text-xs">অ্যাট্রিবিউট নাম (বাংলা) *</Label>
                <Input
                  value={attr.attribute_name_bn}
                  onChange={(e) => updateAttribute(index, 'attribute_name_bn', e.target.value)}
                  placeholder="যেমন: রং, সাইজ, উপাদান"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Attribute Name (English)</Label>
                <Input
                  value={attr.attribute_name_en}
                  onChange={(e) => updateAttribute(index, 'attribute_name_en', e.target.value)}
                  placeholder="e.g. Color, Size"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">মান (বাংলা) *</Label>
                <Input
                  value={attr.attribute_value_bn}
                  onChange={(e) => updateAttribute(index, 'attribute_value_bn', e.target.value)}
                  placeholder="যেমন: লাল, বড়, তুলা"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Value (English)</Label>
                <Input
                  value={attr.attribute_value_en}
                  onChange={(e) => updateAttribute(index, 'attribute_value_en', e.target.value)}
                  placeholder="e.g. Red, Large, Cotton"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0 mt-4"
              onClick={() => removeAttribute(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => addAttribute()}>
        <Plus className="h-4 w-4 mr-2" />
        অ্যাট্রিবিউট যোগ করুন
      </Button>

      {localAttributes.length === 0 && templates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          কোনো অ্যাট্রিবিউট নেই। উপরের বাটনে ক্লিক করে যোগ করুন।
        </p>
      )}
    </div>
  );
};
