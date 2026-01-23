import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  image: string;
  slug: string;
}

interface CategorySectionProps {
  title: string;
  categories: Category[];
  viewAllLink?: string;
}

export const CategorySection = ({ title, categories, viewAllLink }: CategorySectionProps) => {
  return (
    <section className="bg-card rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            সব দেখুন <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/categories/${category.slug}`}
            className="category-card group"
          >
            <div className="w-20 h-24 md:w-24 md:h-32 rounded-lg overflow-hidden mb-2 shadow-md group-hover:shadow-lg transition-shadow">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="text-sm text-center text-muted-foreground group-hover:text-primary transition-colors line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
