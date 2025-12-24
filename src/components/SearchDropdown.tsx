import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { sampleProducts } from "@/data/products";

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
  const [results, setResults] = useState<typeof sampleProducts>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length >= 2) {
      const filtered = sampleProducts.filter(
        (product) =>
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.author.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 5));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

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
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative w-full">
        <input
          type="text"
          placeholder={placeholder}
          className="search-input pr-20"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
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

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="max-h-80 overflow-y-auto">
            {results.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  onQueryChange("");
                }}
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.author}</p>
                  <p className="text-sm text-primary font-bold mt-1">৳{product.price}</p>
                </div>
              </Link>
            ))}
          </div>
          <button
            onClick={handleSearch}
            className="w-full py-3 text-center text-sm text-primary hover:bg-muted transition-colors border-t border-border"
          >
            "{query}" দিয়ে সব ফলাফল দেখুন
          </button>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 p-6 text-center">
          <p className="text-muted-foreground">কোনো ফলাফল পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
};
