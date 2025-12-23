import { Truck, Shield, Clock, CreditCard } from "lucide-react";

const badges = [
  {
    icon: Truck,
    title: "সারাদেশে ডেলিভারি",
    description: "৫-৭ কার্যদিবসে",
  },
  {
    icon: Shield,
    title: "১০০% অরিজিনাল",
    description: "প্রকাশক থেকে সংগৃহীত",
  },
  {
    icon: Clock,
    title: "২৪/৭ সাপোর্ট",
    description: "যেকোনো সময় যোগাযোগ",
  },
  {
    icon: CreditCard,
    title: "নিরাপদ পেমেন্ট",
    description: "বিকাশ, নগদ, কার্ড",
  },
];

export const TrustBadges = () => {
  return (
    <section className="bg-card py-8 border-y border-border">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm md:text-base">{badge.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
