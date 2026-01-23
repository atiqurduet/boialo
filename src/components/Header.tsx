import { useState } from "react";
import { Heart, ShoppingBag, User, Menu, LogOut, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchDropdown } from "@/components/SearchDropdown";
import { MobileMenu } from "@/components/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useCartContext } from "@/contexts/CartContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useNavigationMenu } from "@/hooks/useNavigationMenu";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Fallback nav links if no database data
const fallbackNavLinks = [
  { name: "হোম", path: "/" },
  { name: "জেনারেল বই", path: "/shop" },
  { name: "একাডেমিক", path: "/categories/academic" },
  { name: "আরবি বই", path: "/categories/arabic" },
  { name: "লেখক", path: "/authors" },
  { name: "প্রকাশক", path: "/publishers" },
  { name: "লাইফস্টাইল", path: "/category/lifestyle" },
  { name: "স্টেশনারী", path: "/category/stationery" },
  { name: "ফুড", path: "/category/food" },
  { name: "আজকের অফার", path: "/offers" },
  { name: "প্রি-অর্ডার", path: "/preorder" },
];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { cartCount } = useCartContext();
  const { wishlistCount } = useWishlistContext();
  const { menuItems, loading: menuLoading } = useNavigationMenu('header');
  const { settings: siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Use dynamic menu items or fallback
  const navLinks = menuItems.length > 0 
    ? menuItems.map(item => ({ name: item.title_bn, path: item.url, openInNewTab: item.open_in_new_tab }))
    : fallbackNavLinks.map(item => ({ ...item, openInNewTab: false }));

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        {/* Top Header */}
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {siteSettings.header_logo ? (
                <img 
                  src={siteSettings.header_logo} 
                  alt={siteSettings.site_name} 
                  className="h-8 md:h-10 object-contain"
                />
              ) : (
                <svg viewBox="0 0 40 40" className="w-7 h-7 md:w-8 md:h-8" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary" />
                  <path
                    d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                    className="fill-primary-foreground"
                  />
                </svg>
              )}
              <span className="text-lg md:text-2xl font-bold text-primary hidden xs:inline">{siteSettings.site_name}</span>
            </Link>

            {/* Search Bar - Desktop */}
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              className="hidden md:block flex-1 max-w-xl"
            />

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              <Link
                to="/wishlist"
                className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors relative p-2"
              >
                <Heart className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">উইশলিস্ট</span>
                {wishlistCount > 0 && (
                  <span className="absolute top-0 right-0 lg:-top-1 lg:right-12 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors relative p-2"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="hidden lg:inline text-sm">শপিং ব্যাগ</span>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 lg:-top-1 lg:right-8 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors p-2">
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
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors p-2"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden lg:inline text-sm">Sign In</span>
                </Link>
              )}
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

        {/* Navigation - Desktop only */}
        <nav className="hidden md:block border-t border-border bg-card">
          <div className="container">
            <ul className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
              {navLinks.map((link, index) => (
                <li key={`${link.name}-${index}`} className="shrink-0">
                  {link.openInNewTab ? (
                    <a 
                      href={link.path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="nav-link whitespace-nowrap"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link to={link.path} className="nav-link whitespace-nowrap">
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        dynamicMenuItems={navLinks}
      />
    </>
  );
};
