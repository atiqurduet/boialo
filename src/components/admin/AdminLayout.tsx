import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Image,
  Settings,
  Users,
  Tag,
  FileText,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  BarChart3,
  Ticket,
  Home,
  Navigation,
  Footprints,
  Palette,
  ShoppingBag,
  Layers,
  Grid3X3,
  Mail,
  ChevronDown,
  Store,
  Megaphone,
  Truck,
  CreditCard,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  roles: string[];
}

interface MenuCategory {
  icon: any;
  label: string;
  roles: string[];
  items: MenuItem[];
}

// Grouped menu items by category
const menuCategories: MenuCategory[] = [
  {
    icon: LayoutDashboard,
    label: 'ড্যাশবোর্ড',
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: LayoutDashboard, label: 'ড্যাশবোর্ড', href: '/admin', roles: ['admin', 'manager', 'support'] },
      { icon: BarChart3, label: 'রিপোর্ট', href: '/admin/reports', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Home,
    label: 'সাইট ডিজাইন',
    roles: ['admin', 'manager'],
    items: [
      { icon: Home, label: 'হোমপেজ', href: '/admin/homepage', roles: ['admin', 'manager'] },
      { icon: Palette, label: 'ব্র্যান্ডিং', href: '/admin/branding', roles: ['admin', 'manager'] },
      { icon: Navigation, label: 'মেনু', href: '/admin/menu', roles: ['admin', 'manager'] },
      { icon: Footprints, label: 'ফুটার', href: '/admin/footer', roles: ['admin', 'manager'] },
      { icon: Image, label: 'ব্যানার', href: '/admin/banners', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: ShoppingCart,
    label: 'অর্ডার ম্যানেজমেন্ট',
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: ShoppingCart, label: 'অর্ডার', href: '/admin/orders', roles: ['admin', 'manager', 'support'] },
      { icon: ClipboardList, label: 'টাস্ক ম্যানেজমেন্ট', href: '/admin/tasks', roles: ['admin', 'manager', 'support'] },
      { icon: ShoppingBag, label: 'অসম্পূর্ণ অর্ডার', href: '/admin/abandoned-carts', roles: ['admin', 'manager', 'support'] },
      { icon: BarChart3, label: 'চেকআউট অ্যানালিটিক্স', href: '/admin/checkout-analytics', roles: ['admin', 'manager'] },
      { icon: BarChart3, label: 'ফ্রড রিভিউ', href: '/admin/fraud-review', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Store,
    label: 'বই ম্যানেজমেন্ট',
    roles: ['admin', 'manager'],
    items: [
      { icon: Package, label: 'প্রোডাক্ট', href: '/admin/products', roles: ['admin', 'manager'] },
      { icon: FolderTree, label: 'ক্যাটাগরি', href: '/admin/categories', roles: ['admin', 'manager'] },
      { icon: Users, label: 'লেখক', href: '/admin/writers', roles: ['admin', 'manager'] },
      { icon: FileText, label: 'প্রকাশনী', href: '/admin/publishers', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Layers,
    label: 'ইউনিভার্সাল প্রোডাক্ট',
    roles: ['admin', 'manager'],
    items: [
      { icon: Layers, label: 'প্রোডাক্ট', href: '/admin/universal-products', roles: ['admin', 'manager'] },
      { icon: Grid3X3, label: 'ক্যাটাগরি', href: '/admin/universal-categories', roles: ['admin', 'manager'] },
      { icon: Tag, label: 'ব্র্যান্ড', href: '/admin/brands', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Megaphone,
    label: 'মার্কেটিং',
    roles: ['admin', 'manager'],
    items: [
      { icon: Ticket, label: 'কুপন', href: '/admin/coupons', roles: ['admin', 'manager'] },
      { icon: Mail, label: 'ইমেইল মার্কেটিং', href: '/admin/email-marketing', roles: ['admin', 'manager'] },
      { icon: FileText, label: 'SMS', href: '/admin/sms', roles: ['admin'] },
    ]
  },
  {
    icon: Users,
    label: 'ইউজার ম্যানেজমেন্ট',
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: Users, label: 'কাস্টমার', href: '/admin/customers', roles: ['admin', 'manager', 'support'] },
      { icon: Users, label: 'এডমিন ইউজার', href: '/admin/users', roles: ['admin'] },
    ]
  },
  {
    icon: Settings,
    label: 'সেটিংস',
    roles: ['admin'],
    items: [
      { icon: CreditCard, label: 'পেমেন্ট', href: '/admin/payments', roles: ['admin'] },
      { icon: Truck, label: 'কুরিয়ার', href: '/admin/couriers', roles: ['admin'] },
      { icon: Settings, label: 'সাইট সেটিংস', href: '/admin/settings', roles: ['admin'] },
    ]
  },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['ড্যাশবোর্ড']);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, role, loading, hasPermission } = useAdminAuth();
  const { user, signOut } = useAuth();

  // Find which category contains the current route and open it
  const currentCategory = menuCategories.find(cat => 
    cat.items.some(item => location.pathname === item.href)
  );

  // Auto-open current category
  if (currentCategory && !openCategories.includes(currentCategory.label)) {
    setOpenCategories(prev => [...prev, currentCategory.label]);
  }

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/signin?redirect=/admin');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground mb-4">আপনার এডমিন প্যানেলে প্রবেশের অনুমতি নেই।</p>
          <Button onClick={() => navigate('/')}>হোমে ফিরে যান</Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  // Filter categories based on user role
  const filteredCategories = menuCategories.filter(cat => 
    hasPermission(cat.roles as any) && 
    cat.items.some(item => hasPermission(item.roles as any))
  );

  const roleLabels = {
    admin: 'এডমিন',
    manager: 'ম্যানেজার',
    support: 'সাপোর্ট'
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <span className="font-bold text-lg">এডমিন প্যানেল</span>
        <div className="w-10" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 lg:static",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b">
              <Link to="/admin" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">ব</span>
                </div>
                <div>
                  <h1 className="font-bold text-lg">বইঘর</h1>
                  <p className="text-xs text-muted-foreground">এডমিন প্যানেল</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
              <nav className="px-3 space-y-1">
                {filteredCategories.map((category) => {
                  const isOpen = openCategories.includes(category.label);
                  const hasActiveItem = category.items.some(item => location.pathname === item.href);
                  const filteredItems = category.items.filter(item => hasPermission(item.roles as any));

                  return (
                    <Collapsible 
                      key={category.label} 
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category.label)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div
                          className={cn(
                            "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            hasActiveItem
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <category.icon className="h-5 w-5" />
                            <span>{category.label}</span>
                          </div>
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isOpen && "rotate-180"
                            )} 
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 mt-1 space-y-1">
                        {filteredItems.map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* User Info */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {role && roleLabels[role]}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                লগআউট
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
