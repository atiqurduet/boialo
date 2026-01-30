import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MenuCategory } from '@/config/adminMenuConfig';

interface AdminSidebarNavProps {
  categories: MenuCategory[];
  openCategories: string[];
  toggleCategory: (label: string) => void;
  hasPermission: (roles: string[]) => boolean;
  onItemClick?: () => void;
  isCollapsed?: boolean;
}

export const AdminSidebarNav = ({
  categories,
  openCategories,
  toggleCategory,
  hasPermission,
  onItemClick,
  isCollapsed = false,
}: AdminSidebarNavProps) => {
  const location = useLocation();

  return (
    <ScrollArea className="flex-1 py-4">
      <nav className="px-3 space-y-1">
        {categories.map((category) => {
          const isOpen = openCategories.includes(category.label);
          const hasActiveItem = category.items.some(item => location.pathname === item.href);
          const filteredItems = category.items.filter(item => hasPermission(item.roles));

          if (filteredItems.length === 0) return null;

          if (isCollapsed) {
            // Mini sidebar - show only icons with tooltips
            return (
              <div key={category.label} className="space-y-1">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onItemClick}
                      title={item.label}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <Collapsible 
              key={category.label} 
              open={isOpen}
              onOpenChange={() => toggleCategory(category.label)}
            >
              <CollapsibleTrigger className="w-full">
                <div
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    hasActiveItem
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{category.label}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 flex-shrink-0",
                      isOpen && "rotate-180"
                    )} 
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onItemClick}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={item.badgeColor === 'destructive' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>
    </ScrollArea>
  );
};
