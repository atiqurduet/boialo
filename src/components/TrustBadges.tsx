import { Truck, Shield, Clock, CreditCard } from "lucide-react";

const badges = [
  {
    icon: Truck,
    title: "সারাদেশে ডেলিভারি",
    subtitle: "৫-৭ কার্যদিবস",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/8 dark:bg-blue-500/15",
  },
  {
    icon: Shield,
    title: "১০০% অরিজিনাল",
    subtitle: "প্রকাশক থেকে সংগৃহীত",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/8 dark:bg-emerald-500/15",
  },
  {
    icon: Clock,
    title: "২৪/৭ সাপোর্ট",
    subtitle: "যেকোনো সময় যোগাযোগ",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/8 dark:bg-amber-500/15",
  },
  {
    icon: CreditCard,
    title: "নিরাপদ পেমেন্ট",
    subtitle: "বিকাশ, নগদ, কার্ড",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/8 dark:bg-purple-500/15",
  },
];

export const TrustBadges = () => {
  return (
    <section className="py-4 md:py-6 border-b border-border/40">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className="flex items-center gap-3 p-3.5 md:p-4 rounded-xl bg-card border border-border/30 hover:border-border/60 transition-all duration-200 group"
              >
                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-lg ${badge.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${badge.color}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground leading-tight">
                    {badge.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
