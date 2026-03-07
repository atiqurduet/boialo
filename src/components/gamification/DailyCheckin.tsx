import { useState } from "react";
import { Calendar, Flame, Gift, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const DailyCheckin = () => {
  const { user } = useAuth();
  const { todayCheckedIn, currentStreak, doCheckin } = useGamification();
  const [checking, setChecking] = useState(false);

  if (!user) return null;

  const handleCheckin = async () => {
    setChecking(true);
    const result = await doCheckin();
    setChecking(false);
    if (result && typeof result === 'object') {
      toast.success(`চেক-ইন সফল! +${result.points} পয়েন্ট 🎉`, {
        description: `স্ট্রিক: ${result.streak} দিন`,
      });
    }
  };

  // Generate week days
  const days = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            ডেইলি চেক-ইন
          </span>
          {currentStreak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {currentStreak} দিন স্ট্রিক
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Week progress */}
        <div className="flex justify-between mb-4">
          {days.map((day, i) => {
            const isActive = i < (currentStreak % 7 || (todayCheckedIn ? 7 : 0));
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isActive ? <Check className="w-4 h-4" /> : day[0]}
                </div>
                <span className="text-[10px] text-muted-foreground">{day}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <Gift className="w-4 h-4 inline mr-1" />
            পয়েন্ট: {Math.min(5 + (currentStreak) * 2, 50)}
          </div>
          <Button
            onClick={handleCheckin}
            disabled={todayCheckedIn || checking}
            size="sm"
            className="gap-1.5"
          >
            {todayCheckedIn ? (
              <>
                <Check className="w-4 h-4" />
                চেক-ইন সম্পন্ন
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                {checking ? "চেক-ইন হচ্ছে..." : "আজ চেক-ইন করুন"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
