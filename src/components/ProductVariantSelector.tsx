import { useState } from "react";
import { ProductVariant } from "@/hooks/useProductVariants";
import { Badge } from "@/components/ui/badge";

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export const ProductVariantSelector = ({
  variants,
  selectedVariant,
  onSelect,
}: ProductVariantSelectorProps) => {
  if (variants.length === 0) return null;

  // Group by variant_type
  const groupedVariants = variants.reduce((acc, v) => {
    const type = v.variant_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(v);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  const typeLabels: Record<string, string> = {
    edition: "সংস্করণ",
    size: "সাইজ",
    color: "রং",
    custom: "ধরন",
  };

  return (
    <div className="space-y-3">
      {Object.entries(groupedVariants).map(([type, vars]) => (
        <div key={type}>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {typeLabels[type] || type}
          </label>
          <div className="flex flex-wrap gap-2">
            {vars.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock_quantity <= 0;

              return (
                <button
                  key={variant.id}
                  onClick={() => onSelect(isSelected ? null : variant)}
                  disabled={isOutOfStock}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isOutOfStock
                      ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {variant.variant_name}
                  {variant.price && (
                    <span className="ml-1 text-xs">৳{variant.price}</span>
                  )}
                  {isOutOfStock && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      স্টক নেই
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
