import { Link } from "react-router-dom";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";

export const CompareFloatingBar = () => {
  const { items, removeFromCompare } = useCompare();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">তুলনা:</span>
      <div className="flex gap-2">
        {items.map(item => (
          <div key={item.id} className="relative">
            <img src={item.image} alt={item.name} className="w-10 h-12 object-cover rounded" />
            <button
              onClick={() => removeFromCompare(item.id)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
      {items.length >= 2 && (
        <Link to="/compare">
          <Button size="sm" className="text-xs">
            তুলনা করুন <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
};
