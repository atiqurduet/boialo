import { useCountdown } from "@/hooks/useCountdown";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  endDate: string | null;
  variant?: 'default' | 'compact' | 'badge' | 'hero';
  className?: string;
  showIcon?: boolean;
}

export const CountdownTimer = ({ 
  endDate, 
  variant = 'default', 
  className,
  showIcon = true 
}: CountdownTimerProps) => {
  const time = useCountdown(endDate);

  if (!endDate || time.isExpired) {
    return null;
  }

  if (variant === 'badge') {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400",
        className
      )}>
        {showIcon && <Clock className="h-3 w-3" />}
        {time.days > 0 
          ? `${time.days}দ ${time.hours}ঘ বাকি` 
          : time.hours > 0 
            ? `${time.hours}ঘ ${time.minutes}মি বাকি`
            : `${time.minutes}মি ${time.seconds}সে বাকি`
        }
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400",
        className
      )}>
        {showIcon && <Clock className="h-4 w-4" />}
        <span className="font-medium">
          {time.days > 0 && <span>{time.days}দ </span>}
          {time.hours.toString().padStart(2, '0')}:
          {time.minutes.toString().padStart(2, '0')}:
          {time.seconds.toString().padStart(2, '0')}
        </span>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {time.days > 0 && (
          <div className="flex flex-col items-center bg-primary/20 rounded-lg px-3 py-2 min-w-[60px]">
            <span className="text-2xl font-bold text-primary-foreground">{time.days}</span>
            <span className="text-xs text-primary-foreground/80">দিন</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-primary/20 rounded-lg px-3 py-2 min-w-[60px]">
          <span className="text-2xl font-bold text-primary-foreground">
            {time.hours.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-primary-foreground/80">ঘণ্টা</span>
        </div>
        <span className="text-2xl font-bold text-primary-foreground animate-pulse">:</span>
        <div className="flex flex-col items-center bg-primary/20 rounded-lg px-3 py-2 min-w-[60px]">
          <span className="text-2xl font-bold text-primary-foreground">
            {time.minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-primary-foreground/80">মিনিট</span>
        </div>
        <span className="text-2xl font-bold text-primary-foreground animate-pulse">:</span>
        <div className="flex flex-col items-center bg-primary/20 rounded-lg px-3 py-2 min-w-[60px]">
          <span className="text-2xl font-bold text-primary-foreground">
            {time.seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-primary-foreground/80">সেকেন্ড</span>
        </div>
      </div>
    );
  }

  // Default variant with animated boxes
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showIcon && <Clock className="h-4 w-4 text-orange-500" />}
      <div className="flex items-center gap-1 text-sm">
        {time.days > 0 && (
          <>
            <span className="bg-primary text-primary-foreground font-bold px-2 py-1 rounded min-w-[32px] text-center">
              {time.days}
            </span>
            <span className="text-muted-foreground">দিন</span>
          </>
        )}
        <span className="bg-primary text-primary-foreground font-bold px-2 py-1 rounded min-w-[32px] text-center">
          {time.hours.toString().padStart(2, '0')}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-primary text-primary-foreground font-bold px-2 py-1 rounded min-w-[32px] text-center">
          {time.minutes.toString().padStart(2, '0')}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-primary text-primary-foreground font-bold px-2 py-1 rounded min-w-[32px] text-center animate-pulse">
          {time.seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
