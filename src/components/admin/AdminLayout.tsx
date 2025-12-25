import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'ড্যাশবোর্ড', href: '/admin', roles: ['admin', 'manager', 'support'] },
  { icon: ShoppingCart, label: 'অর্ডার', href: '/admin/orders', roles: ['admin', 'manager', 'support'] },
  { icon: Package, label: 'প্রোডাক্ট', href: '/admin/products', roles: ['admin', 'manager'] },
  { icon: FolderTree, label: 'ক্যাটাগরি', href: '/admin/categories', roles: ['admin', 'manager'] },
  { icon: Image, label: 'ব্যানার', href: '/admin/banners', roles: ['admin', 'manager'] },
  { icon: Ticket, label: 'কুপন', href: '/admin/coupons', roles: ['admin', 'manager'] },
  { icon: Users, label: 'ইউজার', href: '/admin/users', roles: ['admin'] },
  { icon: BarChart3, label: 'রিপোর্ট', href: '/admin/reports', roles: ['admin', 'manager'] },
  { icon: Settings, label: 'সেটিংস', href: '/admin/settings', roles: ['admin'] },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, role, loading, hasPermission } = useAdminAuth();
  const { user, signOut } = useAuth();

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

  const filteredMenuItems = menuItems.filter(item => 
    hasPermission(item.roles as any)
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
                {filteredMenuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
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
