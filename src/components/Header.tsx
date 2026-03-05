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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = menuItems.length > 0 
    ? menuItems.map(item => ({ name: item.title_bn, path: item.url, openInNewTab: item.open_in_new_tab }))
    : fallbackNavLinks.map(item => ({ ...item, openInNewTab: false }));

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const IconBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-md animate-scale-in">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <>
      <header style={{
        backgroundColor: 'hsl(var(--header-bg, var(--card)))',
        color: 'hsl(var(--header-text, var(--foreground)))',
      }} className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled 
          ? "backdrop-blur-xl shadow-lg border-b border-border/30" 
          : "border-b border-border/50"
      )}>
        {/* Top Bar - Desktop only */}
        <div className="hidden lg:block border-b border-border/30">
          <div className="container flex items-center justify-between py-1.5 text-xs text-muted-foreground">
            <span>📞 হেল্পলাইন: 01714-005986</span>
            <div className="flex items-center gap-4">
              <Link to="/track" className="hover:text-primary transition-colors">অর্ডার ট্র্যাক</Link>
              <Link to="/about" className="hover:text-primary transition-colors">আমাদের সম্পর্কে</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">যোগাযোগ</Link>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="container py-2.5 md:py-3">
          <div className="flex items-center gap-3 md:gap-5">
            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 h-9 w-9 hover:bg-primary/10"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              {siteSettings.header_logo ? (
                <img 
                  src={siteSettings.header_logo} 
                  alt={siteSettings.site_name} 
                  className="h-8 md:h-10 object-contain transition-transform group-hover:scale-105"
                />
              ) : (
                <svg viewBox="0 0 40 40" className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-105" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary" />
                  <path d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z" className="fill-primary-foreground" />
                </svg>
              )}
              <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden xs:inline sm:inline">
                {siteSettings.site_name}
              </span>
            </Link>

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 justify-center mx-4">
              <div className="w-full max-w-xl">
                <SearchDropdown query={searchQuery} onQueryChange={setSearchQuery} className="w-full" />
              </div>
            </div>

            {/* Spacer for mobile */}
            <div className="flex-1 md:hidden" />

            {/* Actions */}
            <div className="flex items-center gap-0.5 md:gap-1">
              {/* Mobile Search */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 h-9 w-9 hover:bg-primary/10"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </Button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="hidden sm:flex relative p-2 rounded-full hover:bg-primary/10 transition-colors"
              >
                <Heart className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                <IconBadge count={wishlistCount} />
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-full hover:bg-primary/10 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                <IconBadge count={cartCount} />
              </Link>

              {/* User */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 p-2 rounded-full hover:bg-primary/10 transition-colors group">
                      <div className="relative">
                        <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-accent rounded-full border border-card" />
                      </div>
                      <span className="hidden lg:inline text-sm font-medium truncate max-w-[80px]">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </span>
                      <ChevronDown className="w-3 h-3 hidden lg:inline text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5">
                    <div className="px-3 py-2 mb-1.5 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex items-center gap-2 py-2">
                        <User className="w-4 h-4" /> আমার প্রোফাইল
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer flex items-center gap-2 py-2">
                        <Package className="w-4 h-4" /> আমার অর্ডার
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="cursor-pointer flex items-center gap-2 py-2">
                        <Heart className="w-4 h-4" /> উইশলিস্ট
                        {wishlistCount > 0 && (
                          <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{wishlistCount}</span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="cursor-pointer flex items-center gap-2 py-2 text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" /> লগ আউট
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/signin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden xs:inline">লগইন</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search Expandable */}
          <div className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            showMobileSearch ? "max-h-16 mt-2.5 opacity-100" : "max-h-0 opacity-0"
          )}>
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              placeholder="বইয়ের নাম দিয়ে অনুসন্ধান করুন..."
            />
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className={cn(
          "hidden md:block border-t border-border/30 bg-gradient-to-b from-card/80 to-card/60 transition-opacity duration-200",
          menuLoading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
        )}>
          <div className="container">
            <ul className="flex items-center gap-0.5 overflow-x-auto py-0 scrollbar-hide">
              {navLinks.map((link, index) => {
                const isActive = isActiveLink(link.path);
                const NavEl = link.openInNewTab ? 'a' : Link;
                const props = link.openInNewTab 
                  ? { href: link.path, target: "_blank", rel: "noopener noreferrer" } 
                  : { to: link.path };
                
                return (
                  <li key={`${link.name}-${index}`} className="shrink-0">
                    <NavEl 
                      {...props as any}
                      className={cn(
                        "relative px-3.5 py-2.5 text-sm font-medium transition-all duration-200 inline-block",
                        "hover:text-primary",
                        isActive 
                          ? "text-primary" 
                          : "text-muted-foreground"
                      )}
                    >
                      {link.name}
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                      )}
                    </NavEl>
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
