import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Heart, User, Phone, Mail, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface DynamicMenuItem {
  name: string;
  path: string;
  openInNewTab?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  dynamicMenuItems?: DynamicMenuItem[];
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

export const MobileMenu = ({ isOpen, onClose, dynamicMenuItems }: MobileMenuProps) => {
  // Use dynamic items if provided, otherwise use default
  const menuItems = dynamicMenuItems && dynamicMenuItems.length > 0
    ? dynamicMenuItems.map(item => ({ 
        name: item.name, 
        path: item.path, 
        hasSubmenu: false, 
        openInNewTab: item.openInNewTab || false 
      }))
    : defaultMenuItems;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 bg-card">
        <SheetHeader className="p-4 border-b border-border bg-primary text-primary-foreground">
          <SheetTitle className="text-left text-primary-foreground flex items-center gap-2">
            <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
              <circle cx="20" cy="20" r="18" className="fill-primary-foreground" />
              <path
                d="M12 28V14l8 7-8 7zm8-7l8-7v14l-8-7z"
                className="fill-primary"
              />
            </svg>
            WafiLife
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-140px)]">
          {/* Quick Links */}
          <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/50">
            <Link
              to="/signin"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              onClick={onClose}
            >
              <User className="w-4 h-4" />
              Sign In
            </Link>
            <Link
              to="/wishlist"
              className="flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-lg text-sm"
              onClick={onClose}
            >
              <Heart className="w-4 h-4" />
              উইশলিস্ট
            </Link>
          </div>

          {/* Navigation */}
          <Accordion type="single" collapsible className="w-full">
            {menuItems.map((item, index) => {
              const hasSubmenu = 'hasSubmenu' in item && item.hasSubmenu && 'submenu' in item;
              
              if (hasSubmenu && 'submenu' in item) {
                return (
                  <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted text-sm font-medium hover:no-underline">
                      {item.name}
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="bg-muted/50">
                        <Link
                          to={item.path}
                          className="block px-6 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
                          onClick={onClose}
                        >
                          সব দেখুন
                        </Link>
                        {(item as any).submenu?.map((subItem: any, subIndex: number) => (
                          <Link
                            key={subIndex}
                            to={subItem.path}
                            className="block px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            onClick={onClose}
                          >
                            {subItem.name}
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
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted transition-colors border-b border-border"
                  onClick={onClose}
                >
                  {item.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
              ) : (
                <Link
                  key={index}
                  to={item.path}
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted transition-colors border-b border-border"
                  onClick={onClose}
                >
                  {item.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </Accordion>

          {/* Info Links */}
          <div className="p-4 space-y-2 border-t border-border mt-4">
            <Link
              to="/about"
              className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              আমাদের সম্পর্কে
            </Link>
            <Link
              to="/contact"
              className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              যোগাযোগ
            </Link>
            <Link
              to="/faq"
              className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              সাধারণ জিজ্ঞাসা
            </Link>
          </div>

          {/* Contact Info */}
          <div className="p-4 bg-muted/50 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">যোগাযোগ করুন</p>
            <div className="space-y-2">
              <a href="tel:+8809613000000" className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="w-4 h-4 text-primary" />
                09613-000000
              </a>
              <a href="mailto:info@wafilife.com" className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="w-4 h-4 text-primary" />
                info@wafilife.com
              </a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
