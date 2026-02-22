import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroBannerProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  productCount?: number;
  image?: string | null;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeroBanner = ({
  title,
  subtitle,
  breadcrumbs,
  productCount,
  image,
  icon,
  children,
}: PageHeroBannerProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-b border-border/50">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTIwIDBDOC45NTQgMCAwIDguOTU0IDAgMjBzOC45NTQgMjAgMjAgMjAgMjAtOC45NTQgMjAtMjBTMzEuMDQ2IDAgMjAgMHptMCAzNmMtOC44MzcgMC0xNi03LjE2My0xNi0xNlMxMS4xNjMgNCAyMCA0czE2IDcuMTYzIDE2IDE2LTcuMTYzIDE2LTE2IDE2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

      <div className="container mx-auto px-4 py-6 md:py-10 relative">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs md:text-sm mb-4 flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground/60" />}
              {crumb.href ? (
                <Link to={crumb.href} className="text-muted-foreground hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Category image */}
          {image && (
            <div className="w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden bg-card shadow-lg border border-border/50 flex-shrink-0">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            </div>
          )}

          {/* Icon */}
          {!image && icon && (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">
                {subtitle}
              </p>
            )}
            {typeof productCount === 'number' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs md:text-sm bg-card/80 backdrop-blur-sm text-muted-foreground px-3 py-1 rounded-full border border-border/50 shadow-sm">
                  <span className="font-semibold text-foreground">{productCount}</span> টি পণ্য
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Optional children (subcategories, etc.) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
};
