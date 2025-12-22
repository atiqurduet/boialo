import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard, Product } from "./ProductCard";

interface ProductGridProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export const ProductGrid = ({
  title,
  products,
  viewAllLink,
  columns = 5,
}: ProductGridProps) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title mb-0">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            সবগুলো দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};
