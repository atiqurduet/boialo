import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { ProductCard } from "@/components/ProductCard";
import { Heart, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";

const Wishlist = () => {
  const { wishlistItems, loading, removeFromWishlist, clearWishlist } = useWishlistContext();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-12">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-12">
          <div className="text-center py-16">
            <Heart className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your wishlist</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to save your favorite books and access them later
            </p>
            <Link to="/signin">
              <Button className="btn-primary">Sign In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
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
      <AnnouncementBar />
      <Header />

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">আমার উইশলিস্ট</h1>
            <p className="text-muted-foreground">{wishlistItems.length} টি আইটেম</p>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={clearWishlist}
          >
            <Trash2 className="w-4 h-4" />
            সব মুছুন
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {wishlistItems.map((item) => (
            <div key={item.id} className="relative group">
              <ProductCard product={item.product} />
              <button
                onClick={() => removeFromWishlist(item.id)}
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
