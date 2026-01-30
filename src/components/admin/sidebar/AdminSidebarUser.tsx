import { LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { roleLabels } from '@/config/adminMenuConfig';

interface AdminSidebarUserProps {
  email: string;
  role: string | null;
  onSignOut: () => void;
  isCollapsed?: boolean;
}

export const AdminSidebarUser = ({ email, role, onSignOut, isCollapsed = false }: AdminSidebarUserProps) => {
  if (isCollapsed) {
    return (
      <div className="p-2 border-t flex flex-col items-center gap-2">
        <div 
          className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center"
          title={email}
        >
          <span className="text-primary font-semibold text-sm">
            {email?.[0]?.toUpperCase()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSignOut}
          className="h-8 w-8"
          title="লগআউট"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t space-y-3">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
          <span className="text-primary font-semibold">
            {email?.[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{email}</p>
          <p className="text-xs text-muted-foreground">
            {role && roleLabels[role]}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          asChild
        >
          <Link to="/" target="_blank">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            সাইট দেখুন
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
