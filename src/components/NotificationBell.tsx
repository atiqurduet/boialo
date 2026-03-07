import { Bell, Check, CheckCheck, Package, TrendingDown, Gift, Tag, MessageCircle, Info } from "lucide-react";
import { useNotifications, UserNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const typeIcon: Record<string, React.ReactNode> = {
  order: <Package className="w-4 h-4 text-blue-500" />,
  price_drop: <TrendingDown className="w-4 h-4 text-green-500" />,
  offer: <Tag className="w-4 h-4 text-orange-500" />,
  loyalty: <Gift className="w-4 h-4 text-purple-500" />,
  chat: <MessageCircle className="w-4 h-4 text-cyan-500" />,
  general: <Info className="w-4 h-4 text-muted-foreground" />,
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!user) return null;

  const handleClick = (n: UserNotification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-primary/10 transition-colors group">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary rounded-full px-1 animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">নোটিফিকেশন</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllAsRead}>
              <CheckCheck className="w-3.5 h-3.5" />
              সব পঠিত
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              কোনো নোটিফিকেশন নেই
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 items-start",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {typeIcon[n.type] || typeIcon.general}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm line-clamp-1", !n.is_read && "font-semibold")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: bn })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
