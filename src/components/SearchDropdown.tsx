import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, FolderTree, TrendingUp, Clock, Mic, MicOff, Sparkles, ArrowRight } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { supabase } from "@/integrations/supabase/client";

interface SearchDropdownProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'boialo_recent_searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]').slice(0, MAX_RECENT);
  } catch { return []; }
}

function saveRecentSearch(query: string) {
  try {
    const existing = getRecentSearches().filter(s => s !== query);
    existing.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export const SearchDropdown = ({
  query,
  onQueryChange,
  placeholder = "বইয়ের নাম ও লেখক দিয়ে অনুসন্ধান করুন",
  className = "",
}: SearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const { results, loading, search, clearResults } = useSearch();

  // Load recent & trending searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    fetchTrendingSearches();
  }, []);

  const fetchTrendingSearches = async () => {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('query')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (data) {
        // Count frequency
        const freq: Record<string, number> = {};
        data.forEach(r => {
          const q = r.query.toLowerCase().trim();
          if (q.length >= 2) freq[q] = (freq[q] || 0) + 1;
        });
        const sorted = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([q]) => q);
        setTrendingSearches(sorted);
      }
    } catch {}
  };

  // Voice search
  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onQueryChange(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onQueryChange]);

  const stopVoiceSearch = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const hasVoiceSupport = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Trigger search when query changes
  useEffect(() => {
    if (query.length >= 1) {
      search(query);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      clearResults();
      // Show recent/trending when focused with empty query
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

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
      // Track search analytics
      supabase.from('search_analytics').insert({ 
        query: query.trim(), 
        results_count: results.totalProducts 
      }).then();
      navigate(`/shop?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  }, [query, navigate, results.totalProducts]);

  // Keyboard navigation
  const navigableItems = (() => {
    const items: { type: string; value: string; link?: string }[] = [];
    if (query.length >= 1) {
      results.autocomplete?.forEach(a => items.push({ type: 'autocomplete', value: a }));
      results.products.forEach((p: any) => items.push({ 
        type: 'product', 
        value: p.title_bn, 
        link: p.source === 'universal' ? `/${p.publisher || 'lifestyle'}/${p.slug}` : `/product/${p.slug}` 
      }));
    }
    return items;
  })();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < navigableItems.length) {
        const item = navigableItems[selectedIndex];
        if (item.type === 'product' && item.link) {
          navigate(item.link);
          setIsOpen(false);
          onQueryChange("");
        } else {
          onQueryChange(item.value);
        }
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, navigableItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onQueryChange(suggestion);
    inputRef.current?.focus();
  };

  const handleProductClick = () => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
    }
    setIsOpen(false);
    onQueryChange("");
  };

  const handleRecentClick = (term: string) => {
    onQueryChange(term);
    inputRef.current?.focus();
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setRecentSearches(getRecentSearches());
  };

  const getProductImage = (product: any): string => {
    if (!product.images) return '/placeholder.svg';
    if (typeof product.images === 'string') return product.images;
    if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
    return '/placeholder.svg';
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 1) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <mark className="bg-primary/15 text-foreground rounded-sm px-0.5">{text.substring(idx, idx + query.length)}</mark>
        {text.substring(idx + query.length)}
      </>
    );
  };

  const hasResults = results.products.length > 0 || results.categories.length > 0;
  const showDropdown = isOpen;
  const showEmptyState = !query || query.length < 1;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="search-input pr-24"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          role="combobox"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {loading && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={() => onQueryChange("")}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {hasVoiceSupport && (
            <button
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`p-1.5 rounded-md transition-colors ${
                isListening 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              aria-label={isListening ? "Stop voice search" : "Voice search"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleSearch}
            className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in" role="listbox">
          <div className="max-h-[70vh] overflow-y-auto">
            
            {/* Empty state: Recent & Trending */}
            {showEmptyState && (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>সাম্প্রতিক সার্চ</span>
                      </div>
                      <button 
                        onClick={handleClearRecent}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        মুছুন
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleRecentClick(term)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-primary/10 hover:text-primary transition-colors group"
                        >
                          <Clock className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                {trendingSearches.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <TrendingUp className="w-3 h-3" />
                      <span>ট্রেন্ডিং সার্চ</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trendingSearches.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleRecentClick(term)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm hover:bg-accent/20 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No recent/trending */}
                {recentSearches.length === 0 && trendingSearches.length === 0 && (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">বইয়ের নাম, লেখক বা ক্যাটেগরি লিখুন</p>
                  </div>
                )}
              </>
            )}

            {/* Search Results */}
            {!showEmptyState && (
              <>
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
                          {highlightMatch(category.name_bn, query)}
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
                    <div className="space-y-0.5">
                      {results.autocomplete.map((item, idx) => {
                        const itemIdx = idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(item)}
                            className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                              selectedIndex === itemIdx ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                            role="option"
                            aria-selected={selectedIndex === itemIdx}
                          >
                            <span className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {highlightMatch(item, query)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggestions (Authors/Publishers) */}
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
                          className="px-3 py-1.5 bg-accent/10 rounded-full text-sm hover:bg-accent/20 transition-colors text-accent"
                        >
                          {highlightMatch(suggestion, query)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Section */}
                {results.products.length > 0 && (
                  <div>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-xs text-muted-foreground">
                        {results.totalProducts} প্রোডাক্ট পাওয়া গেছে
                      </span>
                    </div>
                    {results.products.map((product: any, idx: number) => {
                      const isUniversal = product.source === 'universal';
                      const productLink = isUniversal 
                        ? `/${product.publisher || 'lifestyle'}/${product.slug}` 
                        : `/product/${product.slug}`;
                      const itemIdx = (results.autocomplete?.length || 0) + idx;
                      return (
                        <Link
                          key={product.id}
                          to={productLink}
                          className={`flex items-center gap-3 p-3 transition-colors ${
                            selectedIndex === itemIdx ? 'bg-primary/5' : 'hover:bg-muted'
                          }`}
                          onClick={handleProductClick}
                          role="option"
                          aria-selected={selectedIndex === itemIdx}
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product.title_bn}
                            className="w-12 h-16 object-cover rounded-lg border border-border/50"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">
                              {highlightMatch(product.title_bn, query)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {product.author ? highlightMatch(product.author, query) : product.title_en}
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
                                <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-md font-medium">
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
                    <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-foreground font-medium">"{query}" দিয়ে কোনো ফলাফল পাওয়া যায়নি</p>
                    <p className="text-sm text-muted-foreground mt-1">বানান পরীক্ষা করুন বা অন্য শব্দ ব্যবহার করুন</p>
                    {recentSearches.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">সাম্প্রতিক সার্চ</p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {recentSearches.slice(0, 4).map((term, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRecentClick(term)}
                              className="px-3 py-1 bg-muted rounded-full text-sm hover:bg-primary/10 transition-colors"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading State */}
                {loading && !hasResults && (
                  <div className="p-6 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">অনুসন্ধান করা হচ্ছে...</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* View All Results Footer */}
          {!showEmptyState && hasResults && (
            <button
              onClick={handleSearch}
              className="w-full py-3 text-center text-sm text-primary hover:bg-muted transition-colors border-t border-border font-medium flex items-center justify-center gap-2"
            >
              "{query}" দিয়ে সব ফলাফল দেখুন ({results.totalProducts})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
