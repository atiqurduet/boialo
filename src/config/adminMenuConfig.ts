import {
  LayoutDashboard,
  Package,
  FolderTree,
  Image,
  Settings,
  Users,
  Tag,
  FileText,
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
  Store,
  Megaphone,
  Truck,
  CreditCard,
  ClipboardList,
  MessageCircle,
  Shield,
  RefreshCw,
  UserCog,
  AlertTriangle,
  FilePlus,
  Activity,
  HardDrive,
  Paintbrush,
  BookOpen,
  MapPin,
  Globe,
  Bot,
  type LucideIcon
} from 'lucide-react';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  roles: string[];
  badge?: string;
  badgeColor?: 'default' | 'destructive' | 'success';
}

export interface MenuCategory {
  icon: LucideIcon;
  label: string;
  roles: string[];
  items: MenuItem[];
}

// Consolidated menu structure - removed duplicates and organized logically
export const menuCategories: MenuCategory[] = [
  {
    icon: LayoutDashboard,
    label: 'ড্যাশবোর্ড',
    roles: ['super_admin', 'admin', 'manager', 'support'],
    items: [
      { icon: LayoutDashboard, label: 'ড্যাশবোর্ড', href: '/admin', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: Bot, label: 'AI অ্যাসিস্ট্যান্ট', href: '/admin/ai-assistant', roles: ['super_admin', 'admin', 'manager'], badge: 'AI', badgeColor: 'success' },
      { icon: ClipboardList, label: 'আমার টাস্ক', href: '/admin/my-dashboard', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: BarChart3, label: 'রিপোর্ট ও অ্যানালিটিক্স', href: '/admin/reports', roles: ['super_admin', 'admin', 'manager'] },
      { icon: BarChart3, label: 'চেকআউট অ্যানালিটিক্স', href: '/admin/checkout-analytics', roles: ['super_admin', 'admin', 'manager'] },
      { icon: BarChart3, label: 'ভিজিটর অ্যানালিটিক্স', href: '/admin/visitor-analytics', roles: ['super_admin', 'admin', 'manager'] },
      { icon: BarChart3, label: 'অডিয়েন্স এক্সপোর্ট', href: '/admin/audience-export', roles: ['super_admin', 'admin'] },
    ]
  },
  {
    icon: ShoppingCart,
    label: 'অর্ডার ম্যানেজমেন্ট',
    roles: ['super_admin', 'admin', 'manager', 'support'],
    items: [
      { icon: ShoppingCart, label: 'সকল অর্ডার', href: '/admin/orders', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: ClipboardList, label: 'টাস্ক ম্যানেজমেন্ট', href: '/admin/tasks', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: ShoppingBag, label: 'অসম্পূর্ণ অর্ডার', href: '/admin/abandoned-carts', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: ShoppingCart, label: 'কার্ট/উইশলিস্ট', href: '/admin/cart-wishlist-customers', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: RefreshCw, label: 'রিফান্ড রিকোয়েস্ট', href: '/admin/refund-requests', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: AlertTriangle, label: 'ফ্রড রিভিউ', href: '/admin/fraud-review', roles: ['super_admin', 'admin', 'manager'] },
      { icon: MessageCircle, label: 'লাইভ চ্যাট', href: '/admin/chat', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: Bot, label: 'চ্যাটবট সেটিংস', href: '/admin/chatbot-settings', roles: ['super_admin', 'admin'] },
      { icon: Mail, label: 'কন্টাক্ট বার্তা', href: '/admin/contact-messages', roles: ['super_admin', 'admin', 'manager', 'support'] },
    ]
  },
  {
    icon: Store,
    label: 'বই ক্যাটালগ',
    roles: ['super_admin', 'admin', 'manager'],
    items: [
      { icon: Package, label: 'বই', href: '/admin/products', roles: ['super_admin', 'admin', 'manager'] },
      { icon: FolderTree, label: 'বই ক্যাটাগরি', href: '/admin/categories', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Users, label: 'লেখক', href: '/admin/writers', roles: ['super_admin', 'admin', 'manager'] },
      { icon: FileText, label: 'প্রকাশনী', href: '/admin/publishers', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Layers, label: 'বান্ডেল', href: '/admin/bundles', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', roles: ['super_admin', 'admin', 'manager'] },
    ]
  },
  {
    icon: Layers,
    label: 'সাধারণ প্রোডাক্ট',
    roles: ['super_admin', 'admin', 'manager'],
    items: [
      { icon: Layers, label: 'প্রোডাক্ট', href: '/admin/universal-products', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Grid3X3, label: 'ক্যাটাগরি', href: '/admin/universal-categories', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Package, label: 'প্রোডাক্ট টাইপ', href: '/admin/product-types', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Tag, label: 'ব্র্যান্ড', href: '/admin/brands', roles: ['super_admin', 'admin', 'manager'] },
    ]
  },
  {
    icon: BookOpen,
    label: 'ডিজিটাল প্রোডাক্ট',
    roles: ['super_admin', 'admin', 'manager'],
    items: [
      { icon: BookOpen, label: 'ই-বুক', href: '/admin/ebooks', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Package, label: 'ই-প্রোডাক্ট', href: '/admin/eproducts', roles: ['super_admin', 'admin', 'manager'] },
    ]
  },
  {
    icon: Megaphone,
    label: 'মার্কেটিং',
    roles: ['super_admin', 'admin', 'manager'],
    items: [
      { icon: Tag, label: 'অফার', href: '/admin/offers', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Ticket, label: 'কুপন', href: '/admin/coupons', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Tag, label: 'গিফট কার্ড', href: '/admin/gift-cards', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Tag, label: 'লয়্যালটি পয়েন্ট', href: '/admin/loyalty-points', roles: ['super_admin', 'admin'] },
      { icon: Mail, label: 'ইমেইল মার্কেটিং', href: '/admin/email-marketing', roles: ['super_admin', 'admin', 'manager'] },
      { icon: FileText, label: 'SMS মার্কেটিং', href: '/admin/sms', roles: ['super_admin', 'admin'] },
      { icon: Megaphone, label: 'নোটিফিকেশন', href: '/admin/notifications', roles: ['super_admin', 'admin'] },
      { icon: Megaphone, label: 'অটো মার্কেটিং', href: '/admin/marketing-automation', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Megaphone, label: 'সোশ্যাল মিডিয়া', href: '/admin/social-media', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Tag, label: 'ডায়নামিক প্রাইসিং', href: '/admin/dynamic-pricing', roles: ['super_admin', 'admin'] },
      { icon: BookOpen, label: 'ব্লগ', href: '/admin/blog', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Users, label: 'রেফারাল প্রোগ্রাম', href: '/admin/referral', roles: ['super_admin', 'admin', 'manager'] },
    ]
  },
  {
    icon: Home,
    label: 'সাইট ডিজাইন',
    roles: ['super_admin', 'admin', 'manager'],
    items: [
      { icon: Home, label: 'হোমপেজ', href: '/admin/homepage', roles: ['super_admin', 'admin', 'manager'] },
      { icon: FilePlus, label: 'পেজ ম্যানেজমেন্ট', href: '/admin/pages', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Megaphone, label: 'পপআপ ব্যানার', href: '/admin/popup-banners', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Paintbrush, label: 'অ্যাপিয়ারেন্স', href: '/admin/appearance', roles: ['super_admin', 'admin'] },
      { icon: Palette, label: 'লোগো ও ব্র্যান্ডিং', href: '/admin/branding', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Image, label: 'ব্যানার', href: '/admin/banners', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Navigation, label: 'মেনু', href: '/admin/menu', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Footprints, label: 'ফুটার', href: '/admin/footer', roles: ['super_admin', 'admin', 'manager'] },
      { icon: Globe, label: 'SEO টুলস', href: '/admin/seo-tools', roles: ['super_admin', 'admin', 'manager'] },
    ]
  },
  {
    icon: Users,
    label: 'ইউজার ম্যানেজমেন্ট',
    roles: ['super_admin', 'admin', 'manager', 'support'],
    items: [
      { icon: Users, label: 'কাস্টমার', href: '/admin/customers', roles: ['super_admin', 'admin', 'manager', 'support'] },
      { icon: UserCog, label: 'স্টাফ ম্যানেজমেন্ট', href: '/admin/users', roles: ['super_admin'] },
      { icon: Activity, label: 'স্টাফ অ্যাক্টিভিটি', href: '/admin/staff-activity', roles: ['super_admin', 'admin'] },
      { icon: Shield, label: 'রোল ও পার্মিশন', href: '/admin/role-permissions', roles: ['super_admin'] },
    ]
  },
  {
    icon: Settings,
    label: 'সেটিংস',
    roles: ['super_admin'],
    items: [
      { icon: Settings, label: 'সাইট সেটিংস', href: '/admin/settings', roles: ['super_admin'] },
      { icon: CreditCard, label: 'পেমেন্ট', href: '/admin/payments', roles: ['super_admin'] },
      { icon: Truck, label: 'কুরিয়ার', href: '/admin/couriers', roles: ['super_admin'] },
      { icon: MapPin, label: 'ডেলিভারি জোন', href: '/admin/delivery-zones', roles: ['super_admin'] },
      { icon: RefreshCw, label: 'অটো-অ্যাসাইন', href: '/admin/auto-assign', roles: ['super_admin'] },
      { icon: FileText, label: 'রিফান্ড পলিসি', href: '/admin/refund-policy', roles: ['super_admin'] },
      { icon: HardDrive, label: 'ব্যাকআপ ও রিস্টোর', href: '/admin/backup', roles: ['super_admin'] },
      { icon: Activity, label: 'অডিট লগ', href: '/admin/audit-log', roles: ['super_admin'] },
    ]
  },
];

export const roleLabels: Record<string, string> = {
  super_admin: 'সুপার এডমিন',
  admin: 'এডমিন',
  manager: 'ম্যানেজার',
  support: 'সাপোর্ট'
};
