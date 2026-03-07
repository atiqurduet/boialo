import { DailyCheckin } from "@/components/gamification/DailyCheckin";
import { SpinWheel } from "@/components/gamification/SpinWheel";
import { AchievementBadges } from "@/components/gamification/AchievementBadges";
import { LoyaltyPointsWidget } from "@/components/LoyaltyPointsWidget";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Gift } from "lucide-react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Rewards() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">রিওয়ার্ডস</h1>
            <p className="text-sm text-muted-foreground">ডেইলি চেক-ইন, স্পিন হুইল ও ব্যাজ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LoyaltyPointsWidget />
            <DailyCheckin />
          </div>
          <SpinWheel />
        </div>

        <div className="mt-6">
          <AchievementBadges />
        </div>
      </div>
    </Layout>
  );
}
