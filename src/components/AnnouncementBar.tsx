import { useState } from "react";
import { X, Gift } from "lucide-react";

export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 relative">
      <div className="container">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Gift className="w-4 h-4" />
          <span className="font-medium">
            ৪৯৯+ টাকার অর্ডারে ক্যালিগ্রাফি বুকমার্ক ফ্রি! 🎁
          </span>
          <span className="hidden sm:inline text-primary-foreground/80">
            | কুপন কোড: WAFIBOOK
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
          aria-label="Close announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
