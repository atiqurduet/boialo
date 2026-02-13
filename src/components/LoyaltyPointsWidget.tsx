import { Gift, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAuth } from "@/contexts/AuthContext";

export const LoyaltyPointsWidget = () => {
  const { user } = useAuth();
  const { totalPoints, settings, loading, getPointsValue } = useLoyaltyPoints();

  if (!user || !settings.is_enabled || loading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          আমার পয়েন্ট
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">
              মূল্য: ৳{getPointsValue(totalPoints).toFixed(0)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              প্রতি ৳{1/settings.points_per_taka} = ১ পয়েন্ট
            </Badge>
            <p className="text-xs text-muted-foreground">
              রিডিম: ন্যূনতম {settings.min_redeem_points} পয়েন্ট
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
