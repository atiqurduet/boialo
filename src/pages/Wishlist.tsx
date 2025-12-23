import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { sampleProducts } from "@/data/products";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState(sampleProducts.slice(0, 4));

  const removeItem = (productId: string) => {
    setWishlistItems((items) => items.filter((item) => item.id !== productId));
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="text-center py-16">
            <Heart className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-2xl font-bold mb-4">আপনার উইশলিস্ট খালি</h1>
            <p className="text-muted-foreground mb-8">
              পছন্দের বই উইশলিস্টে যোগ করুন এবং পরে সহজে খুঁজে পান
            </p>
            <Link to="/shop">
              <Button className="btn-primary">বই খুঁজুন</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">আমার উইশলিস্ট</h1>
            <p className="text-muted-foreground">{wishlistItems.length} টি আইটেম</p>
          </div>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
            সব মুছুন
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {wishlistItems.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              <button
                onClick={() => removeItem(product.id)}
                className="absolute top-2 right-2 p-2 bg-card rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-20"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Wishlist;
