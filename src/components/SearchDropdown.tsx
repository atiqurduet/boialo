import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, FolderTree, TrendingUp } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

interface SearchDropdownProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchDropdown = ({
  query,
  onQueryChange,
  placeholder = "বইয়ের নাম ও লেখক দিয়ে অনুসন্ধান করুন",
  className = "",
}: SearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { results, loading, search, clearResults } = useSearch();

  // Trigger search when query changes
  useEffect(() => {
    if (query.length >= 1) {
      search(query);
      setIsOpen(true);
    } else {
      clearResults();
      setIsOpen(false);
    }
  }, [query, search, clearResults]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onQueryChange(suggestion);
    inputRef.current?.focus();
  };

  const handleProductClick = () => {
    setIsOpen(false);
    onQueryChange("");
  };

  const getProductImage = (product: any): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  const hasResults = results.products.length > 0 || results.categories.length > 0;
  const showDropdown = isOpen && query.length >= 1;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="search-input pr-20"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 1 && setIsOpen(true)}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={() => onQueryChange("")}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Categories Section */}
            {results.categories.length > 0 && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FolderTree className="w-3 h-3" />
                  <span>ক্যাটাগরি</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {results.categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories/${category.slug}`}
                      className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={handleProductClick}
                    >
                      {category.name_bn}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Autocomplete Suggestions */}
            {results.autocomplete && results.autocomplete.length > 0 && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Search className="w-3 h-3" />
                  <span>আপনি কি খুঁজছেন?</span>
                </div>
                <div className="space-y-1">
                  {results.autocomplete.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(item)}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-muted rounded transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions Section */}
            {results.suggestions.length > 0 && (
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>সাজেশন</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {results.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 bg-accent/50 rounded-full text-sm hover:bg-accent transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            {results.products.length > 0 && (
              <div>
                {results.products.map((product: any) => {
                  const isUniversal = product.source === 'universal';
                  const productLink = isUniversal 
                    ? `/${product.publisher || 'lifestyle'}/${product.slug}` 
                    : `/product/${product.slug}`;
                  return (
                    <Link
                      key={product.id}
                      to={productLink}
                      className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                      onClick={handleProductClick}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.title_bn}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{product.title_bn}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.author || product.title_en}
                          {isUniversal && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[10px]">
                              {product.publisher}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-primary font-bold">৳{product.price}</p>
                          {product.original_price && product.original_price > product.price && (
                            <p className="text-xs text-muted-foreground line-through">
                              ৳{product.original_price}
                            </p>
                          )}
                          {product.discount_percent && product.discount_percent > 0 && (
                            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                              -{product.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {!loading && !hasResults && query.length >= 1 && (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">"{query}" দিয়ে কোনো ফলাফল পাওয়া যায়নি</p>
                <p className="text-sm text-muted-foreground mt-1">বানান পরীক্ষা করুন বা অন্য শব্দ ব্যবহার করুন</p>
              </div>
            )}

            {/* Loading State */}
            {loading && !hasResults && (
              <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">অনুসন্ধান করা হচ্ছে...</p>
              </div>
            )}
          </div>

          {/* View All Results */}
          {hasResults && (
            <button
              onClick={handleSearch}
              className="w-full py-3 text-center text-sm text-primary hover:bg-muted transition-colors border-t border-border font-medium"
            >
              "{query}" দিয়ে সব ফলাফল দেখুন ({results.totalProducts})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
