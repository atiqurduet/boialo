import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Heart, User, Phone, Mail, ChevronRight, Home, ShoppingBag, HelpCircle, Info, FileText, X, MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface DynamicMenuItem {
  name: string;
  path: string;
  openInNewTab?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  dynamicMenuItems?: DynamicMenuItem[];
  siteName?: string;
  siteLogo?: string;
}

// Fallback menu items
const defaultMenuItems = [
  { name: "হোম", path: "/", hasSubmenu: false },
  { 
    name: "জেনারেল বই", 
    path: "/shop",
    hasSubmenu: true,
    submenu: [
      { name: "ইসলামিক", path: "/categories/islamic" },
      { name: "ইতিহাস", path: "/categories/history" },
      { name: "জীবনী", path: "/categories/biography" },
      { name: "উপন্যাস", path: "/categories/novel" },
      { name: "সাহিত্য", path: "/categories/literature" },
    ]
  },
  { 
    name: "একাডেমিক", 
    path: "/categories/academic",
    hasSubmenu: true,
    submenu: [
      { name: "ভর্তি প্রস্তুতি", path: "/categories/admission" },
      { name: "এইচএসসি", path: "/categories/hsc" },
      { name: "মেডিকেল", path: "/categories/medical" },
      { name: "স্কুল", path: "/categories/school" },
    ]
  },
  { name: "আরবি বই", path: "/categories/arabic", hasSubmenu: false },
  { name: "লেখক", path: "/authors", hasSubmenu: false },
  { name: "প্রকাশক", path: "/publishers", hasSubmenu: false },
  { name: "আজকের অফার", path: "/offers", hasSubmenu: false },
  { name: "প্রি-অর্ডার", path: "/preorder", hasSubmenu: false },
  { name: "লাইফস্টাইল", path: "/lifestyle", hasSubmenu: false },
  { name: "স্টেশনারি", path: "/stationery", hasSubmenu: false },
];

export const MobileMenu = ({ isOpen, onClose, dynamicMenuItems, siteName = "বই স্টোর", siteLogo }: MobileMenuProps) => {
  const location = useLocation();
  
  // Use dynamic items if provided, otherwise use default
  const menuItems = dynamicMenuItems && dynamicMenuItems.length > 0
    ? dynamicMenuItems.map(item => ({ 
        name: item.name, 
        path: item.path, 
        hasSubmenu: false, 
        openInNewTab: item.openInNewTab || false 
      }))
    : defaultMenuItems;

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 bg-card border-r-0">
        {/* Header with gradient */}
        <SheetHeader className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <SheetTitle className="text-left text-primary-foreground flex items-center gap-3 relative z-10">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="h-10 object-contain" />
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                <svg viewBox="0 0 40 40" className="w-10 h-10 relative" fill="none">
                  <circle cx="20" cy="20" r="18" className="fill-primary-foreground" />
                  <path
                    d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                    className="fill-primary"
                  />
                </svg>
              </div>
            )}
            <span className="text-xl font-bold">{siteName}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          {/* Quick Links */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-b from-muted/50 to-transparent">
            <Link
              to="/signin"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={onClose}
            >
              <User className="w-4 h-4" />
              লগইন করুন
            </Link>
            <Link
              to="/wishlist"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-card border border-border rounded-xl text-sm hover:bg-muted transition-all"
              onClick={onClose}
            >
              <Heart className="w-4 h-4 text-primary" />
              <span className="hidden xs:inline">উইশলিস্ট</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="py-2">
            <Accordion type="single" collapsible className="w-full">
              {menuItems.map((item, index) => {
                const hasSubmenu = 'hasSubmenu' in item && item.hasSubmenu && 'submenu' in item;
                const isActive = isActiveLink(item.path);
                
                if (hasSubmenu && 'submenu' in item) {
                  return (
                    <AccordionItem key={index} value={`item-${index}`} className="border-b border-border/50">
                      <AccordionTrigger className={cn(
                        "px-4 py-3.5 hover:bg-muted text-sm font-medium hover:no-underline transition-all",
                        isActive && "text-primary bg-primary/5"
                      )}>
                        <span className="flex items-center gap-3">
                          {item.name}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="bg-muted/30 py-1">
                          <Link
                            to={item.path}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm text-primary font-medium hover:bg-muted transition-colors"
                            onClick={onClose}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            সব দেখুন
                          </Link>
                          {(item as any).submenu?.map((subItem: any, subIndex: number) => (
                            <Link
                              key={subIndex}
                              to={subItem.path}
                              className={cn(
                                "flex items-center justify-between px-6 py-2.5 text-sm transition-colors",
                                isActiveLink(subItem.path) 
                                  ? "text-primary bg-primary/5 font-medium" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                              onClick={onClose}
                            >
                              {subItem.name}
                              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                            </Link>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }

                const openInNewTab = 'openInNewTab' in item && item.openInNewTab;
                
                return openInNewTab ? (
                  <a
                    key={index}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-all border-b border-border/50",
                      "hover:bg-muted hover:text-primary"
                    )}
                    onClick={onClose}
                  >
                    {item.name}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </a>
                ) : (
                  <Link
                    key={index}
                    to={item.path}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-all border-b border-border/50",
                      isActive 
                        ? "text-primary bg-primary/5 border-l-2 border-l-primary" 
                        : "hover:bg-muted hover:text-primary"
                    )}
                    onClick={onClose}
                  >
                    {item.name}
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                  </Link>
                );
              })}
            </Accordion>
          </div>

          {/* Info Links */}
          <div className="p-4 space-y-1 border-t border-border mt-2">
            <p className="text-xs text-muted-foreground font-medium mb-3 px-2">তথ্য ও সহায়তা</p>
            {[
              { to: "/about", icon: Info, label: "আমাদের সম্পর্কে" },
              { to: "/contact", icon: Phone, label: "যোগাযোগ" },
              { to: "/faq", icon: HelpCircle, label: "সাধারণ জিজ্ঞাসা" },
              { to: "/terms", icon: FileText, label: "শর্তাবলী" },
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-colors",
                  isActiveLink(to)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={onClose}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Contact Info */}
          <div className="p-4 bg-gradient-to-t from-muted/80 to-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium mb-3">যোগাযোগ করুন</p>
            <div className="space-y-3">
              <a href="tel:+8801714005986" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                01714-005986
              </a>
              <a href="mailto:info@boialo.com" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                info@boialo.com
              </a>
              <a
                href="https://wa.me/8801714005986"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-foreground hover:text-green-600 transition-colors group"
              >
                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                WhatsApp চ্যাট
              </a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
