import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuCategory, MenuItem } from '@/config/adminMenuConfig';

interface AdminSidebarSearchProps {
  categories: MenuCategory[];
  hasPermission: (roles: string[]) => boolean;
  onItemClick?: () => void;
}

export const AdminSidebarSearch = ({ 
  categories, 
  hasPermission,
  onItemClick 
}: AdminSidebarSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: (MenuItem & { category: string })[] = [];

    categories.forEach(category => {
      if (!hasPermission(category.roles)) return;
      
      category.items.forEach(item => {
        if (!hasPermission(item.roles)) return;
        
        if (
          item.label.toLowerCase().includes(query) ||
          category.label.toLowerCase().includes(query)
        ) {
          results.push({ ...item, category: category.label });
        }
      });
    });

    return results.slice(0, 8); // Limit results
  }, [searchQuery, categories, hasPermission]);

  return (
    <div className="relative px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="মেনু খুঁজুন..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-9 pr-8 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isFocused && filteredItems.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => {
                setSearchQuery('');
                onItemClick?.();
              }}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.category}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isFocused && searchQuery && filteredItems.length === 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-top-2 duration-200">
          কোনো ফলাফল পাওয়া যায়নি
        </div>
      )}
    </div>
  );
};
