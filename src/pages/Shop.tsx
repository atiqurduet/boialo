import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { sampleProducts, publishers } from "@/data/products";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    publisher: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getCategoryTitle = () => {
    switch (category) {
      case "academic":
        return "একাডেমিক বই";
      case "children":
        return "শিশু কিশোরদের বই";
      case "islamic":
        return "ইসলামি বই";
      default:
        return "সকল বই";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4">
          <span>বই</span>
          <span className="mx-2">›</span>
          <span className="text-foreground">{getCategoryTitle()}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              ফিল্টার
            </Button>
            <Select defaultValue="new">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Released</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sidebar Filters */}
          <aside
            className={`${
              showFilters ? "fixed inset-0 z-50 bg-background p-4 overflow-y-auto" : "hidden"
            } lg:block lg:relative lg:w-64 lg:shrink-0`}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">ফিল্টার</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-sm space-y-6">
              {/* Price Range */}
              <div>
                <button
                  onClick={() => toggleSection("price")}
                  className="flex items-center justify-between w-full font-semibold mb-4"
                >
                  Price Range
                  {expandedSections.price ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.price && (
                  <div className="space-y-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={30000}
                      step={100}
                      className="mt-2"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Publishers */}
              <div>
                <button
                  onClick={() => toggleSection("publisher")}
                  className="flex items-center justify-between w-full font-semibold mb-4"
                >
                  প্রকাশক
                  {expandedSections.publisher ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.publisher && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {publishers.map((publisher) => (
                      <label
                        key={publisher.id}
                        className="filter-checkbox"
                      >
                        <Checkbox />
                        <span>
                          {publisher.name} ({publisher.count})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Apply Button */}
            <div className="lg:hidden mt-4">
              <Button
                className="w-full btn-primary"
                onClick={() => setShowFilters(false)}
              >
                ফিল্টার প্রয়োগ করুন
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{getCategoryTitle()}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {sampleProducts.length} Items Found
                </p>
              </div>
              <div className="hidden lg:block">
                <Select defaultValue="new">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Released</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sampleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="default" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
