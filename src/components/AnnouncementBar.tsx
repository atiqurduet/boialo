import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Gift } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { settings, loading } = useSiteSettings();

  if (!isVisible || loading || !settings.pre_header_enabled) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 relative">
      <div className="container">
        <Link 
          to={settings.pre_header_link || '/offers'}
          className="flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity"
        >
          <Gift className="w-4 h-4" />
          <span className="font-medium">
            {settings.pre_header_text}
          </span>
        </Link>
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
