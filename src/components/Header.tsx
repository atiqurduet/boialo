import { useState } from "react";
import { Heart, ShoppingBag, User, Menu, LogOut, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchDropdown } from "@/components/SearchDropdown";
import { MobileMenu } from "@/components/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const navLinks = [
  { name: "হোম", path: "/" },
  { name: "জেনারেল বই", path: "/shop" },
  { name: "একাডেমিক", path: "/shop?category=academic" },
  { name: "আরবি বই", path: "/shop?category=arabic" },
  { name: "বিষয়", path: "/shop?category=subject" },
  { name: "লেখক", path: "/authors" },
  { name: "প্রকাশক", path: "/publishers" },
  { name: "আজকের অফার", path: "/offers" },
  { name: "প্রি-অর্ডার", path: "/preorder" },
  { name: "লাইফস্টাইল", path: "/lifestyle" },
  { name: "স্টেশনারি", path: "/stationery" },
  { name: "ফুড", path: "/food" },
];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { cartCount } = useCartContext();
  const { wishlistCount } = useWishlistContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top Header */}
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1 shrink-0">
              <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                <circle cx="20" cy="20" r="18" className="fill-primary" />
                <path
                  d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                  className="fill-primary-foreground"
                />
              </svg>
              <span className="text-2xl font-bold text-primary">WafiLife</span>
            </Link>

            {/* Search Bar */}
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              className="hidden md:block flex-1 max-w-xl"
            />

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <Link
                to="/wishlist"
                className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors relative"
              >
                <Heart className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">উইশলিস্ট</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 lg:-top-2 lg:right-12 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">শপিং ব্যাগ</span>
                <span className="absolute -top-1 -right-1 lg:-top-2 lg:right-8 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <User className="w-5 h-5" />
                      <span className="hidden lg:inline text-sm truncate max-w-[100px]">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        <Package className="w-4 h-4 mr-2" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" />
                        My Wishlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/cart" className="cursor-pointer">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        My Cart
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/signin"
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden lg:inline text-sm">Sign In</span>
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-3">
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="বইয়ের নাম দিয়ে অনুসন্ধান করুন..."
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:block border-t border-border bg-card">
          <div className="container">
            <ul className="flex items-center gap-1 overflow-x-auto py-1">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="nav-link whitespace-nowrap">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};
