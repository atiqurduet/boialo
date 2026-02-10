import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Link } from "react-router-dom";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RecentlyViewed = () => {
  const { items, clearAll } = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          সম্প্রতি দেখা পণ্য
        </h2>
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
          <X className="w-3 h-3 mr-1" /> মুছুন
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.slice(0, 10).map((item) => (
          <Link
            key={item.id}
            to={`/product/${item.slug}`}
            className="flex-shrink-0 w-32 group"
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted mb-2">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <h4 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h4>
            <p className="text-xs text-primary font-bold mt-1">৳{item.price}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
