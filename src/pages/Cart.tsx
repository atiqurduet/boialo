import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, Loader2, Bookmark, ShoppingCart } from "lucide-react";
import { useCartContext } from "@/contexts/CartContext";
import { useSavedCart } from "@/hooks/useSavedCart";
import { useAuth } from "@/contexts/AuthContext";

const Cart = () => {
  const { cartItems, loading, updateQuantity, removeFromCart, subtotal, addToCart } = useCartContext();
  const { savedItems, saveForLater, removeSavedItem } = useSavedCart();
  const { user } = useAuth();
  
  const shipping = subtotal >= 499 ? 0 : 60;
  const total = subtotal + shipping;

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

  // Guest users can now use cart - no login required

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="container py-12">
          <div className="text-center py-16">
            <ShoppingBag className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-2xl font-bold mb-4">আপনার শপিং ব্যাগ খালি</h1>
            <p className="text-muted-foreground mb-8">
              কিছু পণ্য যোগ করুন এবং কেনাকাটা শুরু করুন
            </p>
            <Link to="/shop">
              <Button className="btn-primary">কেনাকাটা শুরু করুন</Button>
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

      <main className="container py-6">
        <h1 className="text-2xl font-bold mb-6">শপিং ব্যাগ ({cartItems.length} আইটেম)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-xl p-4 shadow-sm flex gap-4"
              >
                <Link to={`/product/${item.product.slug}`} className="shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-24 h-32 object-cover rounded-lg"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="font-medium hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.product.title}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.product.author}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary font-bold">৳{item.product.price}</span>
                    {item.product.originalPrice && (
                      <span className="text-muted-foreground line-through text-sm">
                        ৳{item.product.originalPrice}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && (
                        <button
                          onClick={async () => {
                            await saveForLater(item.productId);
                            await removeFromCart(item.id);
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="পরে কেনার জন্য সেভ করুন"
                        >
                          <Bookmark className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Saved for Later */}
            {user && savedItems.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-4">পরে কেনার জন্য সেভ করা ({savedItems.length})</h2>
                <div className="space-y-3">
                  {savedItems.map((item) => (
                    <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm flex gap-4">
                      <Link to={`/product/${item.product.slug}`} className="shrink-0">
                        <img src={item.product.image} alt={item.product.title} className="w-16 h-20 object-cover rounded-lg" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.product.slug}`} className="font-medium hover:text-primary line-clamp-1 text-sm">
                          {item.product.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.product.author}</p>
                        <p className="text-primary font-bold text-sm mt-1">৳{item.product.price}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={async () => {
                          await addToCart(item.productId);
                          await removeSavedItem(item.id);
                        }}>
                          <ShoppingCart className="w-3 h-3 mr-1" /> কার্টে
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeSavedItem(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-lg mb-4">অর্ডার সারাংশ</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">মোট</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                  <span>{shipping === 0 ? "ফ্রি" : `৳${shipping}`}</span>
                </div>
                {subtotal < 499 && (
                  <p className="text-xs text-muted-foreground">
                    ৳{499 - subtotal} টাকা আরো কিনলে ডেলিভারি ফ্রি!
                  </p>
                )}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>সর্বমোট</span>
                    <span className="text-primary">৳{total}</span>
                  </div>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="w-full btn-primary mt-6">
                  চেকআউট করুন
                </Button>
              </Link>

              <div className="mt-4">
                <input
                  type="text"
                  placeholder="প্রোমো কোড লিখুন"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
