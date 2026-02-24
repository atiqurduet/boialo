import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebarHeader = ({ isCollapsed, onToggleCollapse }: AdminSidebarHeaderProps) => {
  return (
    <div className={cn(
      "p-4 border-b flex items-center",
      isCollapsed ? "justify-center" : "justify-between"
    )}>
      {!isCollapsed && (
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-xl">ব</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">বইআলো</h1>
            <p className="text-xs text-muted-foreground">এডমিন প্যানেল</p>
          </div> 
        </Link>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        className={cn(
          "h-8 w-8 rounded-lg hover:bg-muted",
          isCollapsed && "mx-auto"
        )}
        title={isCollapsed ? "সাইডবার বড় করুন" : "সাইডবার ছোট করুন"}
      >
        {isCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
