import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, BookOpen, ShoppingBag } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  type: 'book' | 'universal';
}

interface DynamicCategorySelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const DynamicCategorySelector = ({ selectedIds, onChange }: DynamicCategorySelectorProps) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: bookCats }, { data: uniCats }] = await Promise.all([
        supabase.from('categories').select('id, name_bn').eq('is_active', true).order('name_bn'),
        supabase.from('universal_categories').select('id, name_bn, product_type').eq('is_active', true).order('name_bn'),
      ]);

      const items: CategoryItem[] = [
        ...(bookCats || []).map((c: any) => ({
          id: c.id,
          name: c.name_bn,
          type: 'book' as const,
        })),
        ...(uniCats || []).map((c: any) => ({
          id: c.id,
          name: `${c.name_bn} (${c.product_type})`,
          type: 'universal' as const,
        })),
      ];
      setCategories(items);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const selectedCategories = categories.filter(c => selectedIds.includes(c.id));

  return (
    <div className="space-y-2">
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map(c => (
            <Badge key={c.id} variant="secondary" className="gap-1 text-xs">
              {c.type === 'book' ? <BookOpen className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
              {c.name.slice(0, 25)}{c.name.length > 25 ? '…' : ''}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggle(c.id)} />
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ক্যাটাগরি খুঁজুন..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <ScrollArea className="h-48 border rounded-md">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">কোন ক্যাটাগরি পাওয়া যায়নি</div>
        ) : (
          <div className="p-1">
            {filtered.map(c => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.type === 'book' ? (
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                )}
                <span className="truncate flex-1">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
      <p className="text-xs text-muted-foreground">{selectedIds.length} টি ক্যাটাগরি নির্বাচিত</p>
    </div>
  );
};
