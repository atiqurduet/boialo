import { Truck, Shield, Clock, CreditCard } from "lucide-react";

const badges = [
  {
    icon: Truck,
    title: "সারাদেশে ডেলিভারি",
    subtitle: "৫-৭ কার্যদিবস",
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Shield,
    title: "১০০% অরিজিনাল",
    subtitle: "প্রকাশক থেকে সংগৃহীত",
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Clock,
    title: "২৪/৭ সাপোর্ট",
    subtitle: "যেকোনো সময় যোগাযোগ",
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: CreditCard,
    title: "নিরাপদ পেমেন্ট",
    subtitle: "বিকাশ, নগদ, কার্ড",
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
];

export const TrustBadges = () => {
  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className={`trust-badge-card bg-gradient-to-br ${badge.gradient}`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${badge.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight">
                    {badge.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
                    {badge.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
