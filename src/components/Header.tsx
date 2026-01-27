import { useState, useEffect } from "react";
import { Heart, ShoppingBag, User, Menu, LogOut, Package, Search, ChevronDown, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { user, signOut } = useAuth();
  const { cartCount } = useCartContext();
  const { wishlistCount } = useWishlistContext();
  const { menuItems, loading: menuLoading } = useNavigationMenu('header');
  const { settings: siteSettings } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("সফলভাবে লগ আউট হয়েছে");
    navigate("/");
  };

  // Use dynamic menu items or fallback
  const navLinks = menuItems.length > 0 
    ? menuItems.map(item => ({ name: item.title_bn, path: item.url, openInNewTab: item.open_in_new_tab }))
    : fallbackNavLinks.map(item => ({ ...item, openInNewTab: false }));

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-card/95 backdrop-blur-xl shadow-lg border-b border-border/50" 
          : "bg-card border-b border-border"
      )}>
        {/* Main Header */}
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            {/* Left Section: Menu + Logo */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0 group">
                {siteSettings.header_logo ? (
                  <img 
                    src={siteSettings.header_logo} 
                    alt={siteSettings.site_name} 
                    className="h-9 md:h-11 object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg viewBox="0 0 40 40" className="w-9 h-9 md:w-11 md:h-11 relative transition-transform group-hover:scale-105" fill="none">
                      <circle cx="20" cy="20" r="18" className="fill-primary" />
                      <path
                        d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                        className="fill-primary-foreground"
                      />
                    </svg>
                  </div>
                )}
                <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline">
                  {siteSettings.site_name}
                </span>
              </Link>
            </div>

            {/* Center: Search Bar - Desktop */}
            <div className="hidden md:block flex-1 max-w-2xl">
              <SearchDropdown
                query={searchQuery}
                onQueryChange={setSearchQuery}
                className="w-full"
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Mobile Search Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </Button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 relative group",
                  "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <Heart className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="hidden lg:inline text-sm font-medium">উইশলিস্ট</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 lg:top-0 lg:-right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium shadow-lg animate-scale-in">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 relative group",
                  "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="hidden lg:inline text-sm font-medium">শপিং ব্যাগ</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 lg:top-0 lg:-right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium shadow-lg animate-scale-in">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 group",
                      "text-muted-foreground hover:text-primary hover:bg-primary/10"
                    )}>
                      <div className="relative">
                        <User className="w-5 h-5 transition-transform group-hover:scale-110" />
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-card" />
                      </div>
                      <span className="hidden lg:inline text-sm font-medium truncate max-w-[100px]">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 hidden lg:inline transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2">
                    <div className="px-2 py-2 mb-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex items-center gap-2 py-2">
                        <User className="w-4 h-4" />
                        আমার প্রোফাইল
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer flex items-center gap-2 py-2">
                        <Package className="w-4 h-4" />
                        আমার অর্ডার
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="cursor-pointer flex items-center gap-2 py-2">
                        <Heart className="w-4 h-4" />
                        উইশলিস্ট
                        {wishlistCount > 0 && (
                          <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/cart" className="cursor-pointer flex items-center gap-2 py-2">
                        <ShoppingBag className="w-4 h-4" />
                        শপিং ব্যাগ
                        {cartCount > 0 && (
                          <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {cartCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="cursor-pointer flex items-center gap-2 py-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      লগ আউট
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/signin"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 group",
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">লগইন</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search - Expandable */}
          <div className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            showMobileSearch ? "max-h-20 mt-3 opacity-100" : "max-h-0 opacity-0"
          )}>
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="বইয়ের নাম দিয়ে অনুসন্ধান করুন..."
            />
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:block border-t border-border/50 bg-gradient-to-b from-card to-card/95">
          <div className="container">
            <ul className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
              {navLinks.map((link, index) => {
                const isActive = isActiveLink(link.path);
                return (
                  <li key={`${link.name}-${index}`} className="shrink-0">
                    {link.openInNewTab ? (
                      <a 
                        href={link.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                          "relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                          "hover:bg-primary/10 hover:text-primary",
                          isActive 
                            ? "text-primary bg-primary/10" 
                            : "text-muted-foreground"
                        )}
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link 
                        to={link.path} 
                        className={cn(
                          "relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 inline-block",
                          "hover:bg-primary/10 hover:text-primary",
                          isActive 
                            ? "text-primary bg-primary/10" 
                            : "text-muted-foreground"
                        )}
                      >
                        {link.name}
                        {isActive && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        dynamicMenuItems={navLinks}
        siteName={siteSettings.site_name}
        siteLogo={siteSettings.header_logo}
      />
    </>
  );
};
