import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export const AchievementBadges = () => {
  const { user } = useAuth();
  const { badges, earnedBadgeIds, loading } = useGamification();

  if (!user || loading) return null;

  const earned = badges.filter((b: any) => earnedBadgeIds.includes(b.id));
  const locked = badges.filter((b: any) => !earnedBadgeIds.includes(b.id));

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            🏆 অ্যাচিভমেন্ট ব্যাজ
          </span>
          <Badge variant="secondary" className="text-xs">
            {earned.length}/{badges.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((badge: any) => {
            const isEarned = earnedBadgeIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl text-center transition-all",
                  isEarned
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-muted/50 border border-transparent opacity-60"
                )}
              >
                <span className={cn("text-3xl mb-1.5", !isEarned && "grayscale")}>
                  {badge.icon}
                </span>
                <p className="text-xs font-semibold line-clamp-1">{badge.name_bn}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                  {badge.description_bn}
                </p>
                {badge.points_reward > 0 && (
                  <Badge
                    variant={isEarned ? "default" : "outline"}
                    className="text-[10px] mt-1.5"
                  >
                    {isEarned ? "✓ " : ""}+{badge.points_reward} পয়েন্ট
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
