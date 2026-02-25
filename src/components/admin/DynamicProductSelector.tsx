import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, BookOpen, ShoppingBag } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  type: 'book' | 'universal';
  price: number;
  image?: string;
}

interface DynamicProductSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const DynamicProductSelector = ({ selectedIds, onChange }: DynamicProductSelectorProps) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: books }, { data: universals }] = await Promise.all([
        supabase.from('products').select('id, title_bn, price, images').eq('is_active', true).order('title_bn'),
        supabase.from('universal_products').select('id, name_bn, price, images, product_type').eq('is_active', true).order('name_bn'),
      ]);

      const items: ProductItem[] = [
        ...(books || []).map((b: any) => ({
          id: b.id,
          name: b.title_bn,
          type: 'book' as const,
          price: b.price,
          image: Array.isArray(b.images) ? b.images[0] : undefined,
        })),
        ...(universals || []).map((u: any) => ({
          id: u.id,
          name: `${u.name_bn} (${u.product_type})`,
          type: 'universal' as const,
          price: u.price,
          image: Array.isArray(u.images) ? u.images[0] : undefined,
        })),
      ];
      setProducts(items);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const selectedProducts = products.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-2">
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedProducts.map(p => (
            <Badge key={p.id} variant="secondary" className="gap-1 text-xs">
              {p.type === 'book' ? <BookOpen className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
              {p.name.slice(0, 25)}{p.name.length > 25 ? '…' : ''}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggle(p.id)} />
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="পণ্য খুঁজুন..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <ScrollArea className="h-48 border rounded-md">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">কোন পণ্য পাওয়া যায়নি</div>
        ) : (
          <div className="p-1">
            {filtered.map(p => (
              <label
                key={p.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                {p.type === 'book' ? (
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                )}
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">৳{p.price}</span>
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
      <p className="text-xs text-muted-foreground">{selectedIds.length} টি পণ্য নির্বাচিত</p>
    </div>
  );
};
