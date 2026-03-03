import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PromoBannerSettings {
  title?: string;
  description?: string;
  button_text?: string;
  button_link?: string;
  badge_text?: string;
  background_color?: string;
  background_image?: string;
}

interface DynamicPromoBannerProps {
  settings: PromoBannerSettings;
}

export const DynamicPromoBanner = ({ settings }: DynamicPromoBannerProps) => {
  const {
    title = "বিশেষ অফার!",
    description = "সীমিত সময়ের জন্য বিশেষ ছাড়",
    button_text = "এখনই কিনুন",
    button_link = "/shop",
    badge_text = "সীমিত সময়ের অফার",
    background_image,
  } = settings || {};

  return (
    <div
      className={cn(
        "relative rounded-2xl p-8 md:p-12 text-primary-foreground my-8 overflow-hidden",
        !background_image && "bg-gradient-to-r from-primary to-primary/80"
      )}
    >
      {background_image && (
        <img
          src={background_image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {background_image && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative max-w-2xl z-10">
        {badge_text && (
          <span className="inline-block bg-primary-foreground/20 px-4 py-1 rounded-full text-sm mb-4">
            {badge_text}
          </span>
        )}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        <p className="text-lg opacity-90 mb-6">{description}</p>
        <Link
          to={button_link}
          className="inline-block bg-primary-foreground text-primary font-bold px-8 py-3 rounded-lg hover:bg-primary-foreground/90 transition-colors"
        >
          {button_text}
        </Link>
      </div>
    </div>
  );
};
