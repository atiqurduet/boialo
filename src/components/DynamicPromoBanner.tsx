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
  banner_mode?: 'image_only' | 'image_with_text' | 'gradient_with_text';
  text_align?: 'left' | 'center' | 'right';
  text_color?: 'white' | 'black' | 'primary';
  title_size?: 'sm' | 'md' | 'lg' | 'xl';
  overlay_color?: 'none' | 'black' | 'primary' | 'white';
  overlay_opacity?: number;
  height?: number;
  border_radius?: number;
  padding_y?: number;
  padding_x?: number;
  margin_top?: number;
  margin_bottom?: number;
  object_fit?: 'cover' | 'contain' | 'fill';
  full_width?: boolean;
}

interface DynamicPromoBannerProps {
  settings: PromoBannerSettings;
}

const titleSizeMap: Record<string, string> = {
  sm: 'text-lg md:text-xl',
  md: 'text-xl md:text-2xl',
  lg: 'text-2xl md:text-3xl',
  xl: 'text-3xl md:text-4xl',
};

const textColorMap: Record<string, string> = {
  white: 'text-white',
  black: 'text-foreground',
  primary: 'text-primary',
};

const overlayColorMap: Record<string, string> = {
  black: 'bg-black',
  primary: 'bg-primary',
  white: 'bg-white',
};

export const DynamicPromoBanner = ({ settings }: DynamicPromoBannerProps) => {
  const {
    title = "বিশেষ অফার!",
    description = "সীমিত সময়ের জন্য বিশেষ ছাড়",
    button_text = "এখনই কিনুন",
    button_link = "/shop",
    badge_text = "সীমিত সময়ের অফার",
    background_image,
    banner_mode = 'image_with_text',
    text_align = 'left',
    text_color = 'white',
    title_size = 'xl',
    overlay_color = 'black',
    overlay_opacity = 40,
    height = 300,
    border_radius = 16,
    padding_y = 32,
    padding_x = 32,
    margin_top = 0,
    margin_bottom = 32,
    object_fit = 'cover',
    full_width = false,
  } = settings || {};

  const isImageOnly = banner_mode === 'image_only';
  const showText = banner_mode !== 'image_only';
  const hasImage = !!background_image;
  const isGradient = banner_mode === 'gradient_with_text';

  const containerStyle: React.CSSProperties = {
    minHeight: `${height}px`,
    borderRadius: `${border_radius}px`,
    paddingTop: showText ? `${padding_y}px` : 0,
    paddingBottom: showText ? `${padding_y}px` : 0,
    paddingLeft: showText ? `${padding_x}px` : 0,
    paddingRight: showText ? `${padding_x}px` : 0,
    marginTop: `${margin_top}px`,
    marginBottom: `${margin_bottom}px`,
  };

  const imgStyle: React.CSSProperties = {
    objectFit: object_fit as React.CSSProperties['objectFit'],
  };

  const overlayStyle: React.CSSProperties = overlay_color !== 'none' ? {
    opacity: overlay_opacity / 100,
  } : {};

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[text_align];

  const colorClass = textColorMap[text_color] || 'text-white';
  const titleClass = titleSizeMap[title_size] || titleSizeMap.xl;

  const buttonColorClass = text_color === 'white'
    ? 'bg-white text-foreground hover:bg-white/90'
    : text_color === 'black'
    ? 'bg-foreground text-background hover:bg-foreground/90'
    : 'bg-primary text-primary-foreground hover:bg-primary/90';

  const badgeBgClass = text_color === 'white'
    ? 'bg-white/20'
    : text_color === 'black'
    ? 'bg-black/10'
    : 'bg-primary/20';

  // Image-only mode
  if (isImageOnly) {
    const imageContent = (
      <div
        className={cn("relative overflow-hidden block", full_width && "-mx-4 md:-mx-8")}
        style={{
          minHeight: `${height}px`,
          borderRadius: full_width ? 0 : `${border_radius}px`,
          marginTop: `${margin_top}px`,
          marginBottom: `${margin_bottom}px`,
        }}
      >
        {hasImage ? (
          <img
            src={background_image}
            alt="Promotional Banner"
            className="w-full h-full absolute inset-0"
            style={imgStyle}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
        )}
      </div>
    );

    if (button_link) {
      return <Link to={button_link}>{imageContent}</Link>;
    }
    return imageContent;
  }

  // Text modes (image_with_text or gradient_with_text)
  return (
    <div
      className={cn(
        "relative overflow-hidden flex flex-col justify-center",
        full_width && "-mx-4 md:-mx-8",
        isGradient && !hasImage && "bg-gradient-to-r from-primary to-primary/80",
        colorClass,
      )}
      style={containerStyle}
    >
      {/* Background Image */}
      {hasImage && (
        <img
          src={background_image}
          alt={title}
          className="absolute inset-0 w-full h-full"
          style={imgStyle}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Overlay */}
      {hasImage && overlay_color !== 'none' && (
        <div
          className={cn("absolute inset-0", overlayColorMap[overlay_color])}
          style={overlayStyle}
        />
      )}

      {/* Text Content */}
      <div className={cn("relative z-10 flex flex-col max-w-2xl", textAlignClass, text_align === 'center' && 'mx-auto', text_align === 'right' && 'ml-auto')}>
        {badge_text && (
          <span className={cn("inline-block px-4 py-1 rounded-full text-sm mb-4 w-fit", badgeBgClass)}>
            {badge_text}
          </span>
        )}
        {title && (
          <h2 className={cn("font-bold mb-3 leading-tight", titleClass)}>
            {title}
          </h2>
        )}
        {description && (
          <p className="text-base md:text-lg opacity-90 mb-5 max-w-xl">
            {description}
          </p>
        )}
        {button_text && button_link && (
          <Link
            to={button_link}
            className={cn(
              "inline-block font-bold px-8 py-3 rounded-lg transition-colors w-fit",
              buttonColorClass
            )}
          >
            {button_text}
          </Link>
        )}
      </div>
    </div>
  );
};
