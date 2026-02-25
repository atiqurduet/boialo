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
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: LayoutDashboard, label: 'ড্যাশবোর্ড', href: '/admin', roles: ['admin', 'manager', 'support'] },
      { icon: BarChart3, label: 'রিপোর্ট ও অ্যানালিটিক্স', href: '/admin/reports', roles: ['admin', 'manager'] },
      { icon: BarChart3, label: 'চেকআউট অ্যানালিটিক্স', href: '/admin/checkout-analytics', roles: ['admin', 'manager'] },
      { icon: BarChart3, label: 'ভিজিটর অ্যানালিটিক্স', href: '/admin/visitor-analytics', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: ShoppingCart,
    label: 'অর্ডার ম্যানেজমেন্ট',
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: ShoppingCart, label: 'সকল অর্ডার', href: '/admin/orders', roles: ['admin', 'manager', 'support'] },
      { icon: ClipboardList, label: 'টাস্ক ম্যানেজমেন্ট', href: '/admin/tasks', roles: ['admin', 'manager', 'support'] },
      { icon: ShoppingBag, label: 'অসম্পূর্ণ অর্ডার', href: '/admin/abandoned-carts', roles: ['admin', 'manager', 'support'] },
      { icon: RefreshCw, label: 'রিফান্ড রিকোয়েস্ট', href: '/admin/refund-requests', roles: ['admin', 'manager', 'support'] },
      { icon: AlertTriangle, label: 'ফ্রড রিভিউ', href: '/admin/fraud-review', roles: ['admin', 'manager'] },
      { icon: MessageCircle, label: 'লাইভ চ্যাট', href: '/admin/chat', roles: ['admin', 'manager', 'support'] },
      { icon: Mail, label: 'কন্টাক্ট বার্তা', href: '/admin/contact-messages', roles: ['admin', 'manager', 'support'] },
    ]
  },
  {
    icon: Store,
    label: 'বই ক্যাটালগ',
    roles: ['admin', 'manager'],
    items: [
      { icon: Package, label: 'বই', href: '/admin/products', roles: ['admin', 'manager'] },
      { icon: FolderTree, label: 'বই ক্যাটাগরি', href: '/admin/categories', roles: ['admin', 'manager'] },
      { icon: Users, label: 'লেখক', href: '/admin/writers', roles: ['admin', 'manager'] },
      { icon: FileText, label: 'প্রকাশনী', href: '/admin/publishers', roles: ['admin', 'manager'] },
      { icon: Layers, label: 'বান্ডেল', href: '/admin/bundles', roles: ['admin', 'manager'] },
      { icon: Package, label: 'ইনভেন্টরি', href: '/admin/inventory', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Layers,
    label: 'সাধারণ প্রোডাক্ট',
    roles: ['admin', 'manager'],
    items: [
      { icon: Layers, label: 'প্রোডাক্ট', href: '/admin/universal-products', roles: ['admin', 'manager'] },
      { icon: Grid3X3, label: 'ক্যাটাগরি', href: '/admin/universal-categories', roles: ['admin', 'manager'] },
      { icon: Package, label: 'প্রোডাক্ট টাইপ', href: '/admin/product-types', roles: ['admin', 'manager'] },
      { icon: Tag, label: 'ব্র্যান্ড', href: '/admin/brands', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Megaphone,
    label: 'মার্কেটিং',
    roles: ['admin', 'manager'],
    items: [
      { icon: Tag, label: 'অফার', href: '/admin/offers', roles: ['admin', 'manager'] },
      { icon: Ticket, label: 'কুপন', href: '/admin/coupons', roles: ['admin', 'manager'] },
      { icon: Tag, label: 'গিফট কার্ড', href: '/admin/gift-cards', roles: ['admin', 'manager'] },
      { icon: Tag, label: 'লয়্যালটি পয়েন্ট', href: '/admin/loyalty-points', roles: ['admin'] },
      { icon: Mail, label: 'ইমেইল মার্কেটিং', href: '/admin/email-marketing', roles: ['admin', 'manager'] },
      { icon: FileText, label: 'SMS মার্কেটিং', href: '/admin/sms', roles: ['admin'] },
      { icon: Megaphone, label: 'নোটিফিকেশন', href: '/admin/notifications', roles: ['admin'] },
      { icon: Megaphone, label: 'অটো মার্কেটিং', href: '/admin/marketing-automation', roles: ['admin', 'manager'] },
      { icon: Megaphone, label: 'সোশ্যাল মিডিয়া', href: '/admin/social-media', roles: ['admin', 'manager'] },
      { icon: Tag, label: 'ডায়নামিক প্রাইসিং', href: '/admin/dynamic-pricing', roles: ['admin'] },
      { icon: BookOpen, label: 'ব্লগ', href: '/admin/blog', roles: ['admin', 'manager'] },
      { icon: Users, label: 'রেফারাল প্রোগ্রাম', href: '/admin/referral', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Home,
    label: 'সাইট ডিজাইন',
    roles: ['admin', 'manager'],
    items: [
      { icon: Home, label: 'হোমপেজ', href: '/admin/homepage', roles: ['admin', 'manager'] },
      { icon: FilePlus, label: 'পেজ ম্যানেজমেন্ট', href: '/admin/pages', roles: ['admin', 'manager'] },
      { icon: Paintbrush, label: 'অ্যাপিয়ারেন্স', href: '/admin/appearance', roles: ['admin'] },
      { icon: Palette, label: 'লোগো ও ব্র্যান্ডিং', href: '/admin/branding', roles: ['admin', 'manager'] },
      { icon: Image, label: 'ব্যানার', href: '/admin/banners', roles: ['admin', 'manager'] },
      { icon: Navigation, label: 'মেনু', href: '/admin/menu', roles: ['admin', 'manager'] },
      { icon: Footprints, label: 'ফুটার', href: '/admin/footer', roles: ['admin', 'manager'] },
    ]
  },
  {
    icon: Users,
    label: 'ইউজার ম্যানেজমেন্ট',
    roles: ['admin', 'manager', 'support'],
    items: [
      { icon: Users, label: 'কাস্টমার', href: '/admin/customers', roles: ['admin', 'manager', 'support'] },
      { icon: ShoppingCart, label: 'কার্ট/উইশলিস্ট', href: '/admin/cart-wishlist-customers', roles: ['admin', 'manager', 'support'] },
      { icon: UserCog, label: 'স্টাফ', href: '/admin/staff', roles: ['admin'] },
      { icon: Shield, label: 'রোল ও পার্মিশন', href: '/admin/role-permissions', roles: ['admin'] },
      { icon: Users, label: 'এডমিন ইউজার', href: '/admin/users', roles: ['admin'] },
    ]
  },
  {
    icon: Settings,
    label: 'সেটিংস',
    roles: ['admin'],
    items: [
      { icon: Settings, label: 'সাইট সেটিংস', href: '/admin/settings', roles: ['admin'] },
      { icon: CreditCard, label: 'পেমেন্ট', href: '/admin/payments', roles: ['admin'] },
      { icon: Truck, label: 'কুরিয়ার', href: '/admin/couriers', roles: ['admin'] },
      { icon: MapPin, label: 'ডেলিভারি জোন', href: '/admin/delivery-zones', roles: ['admin'] },
      { icon: RefreshCw, label: 'অটো-অ্যাসাইন', href: '/admin/auto-assign', roles: ['admin'] },
      { icon: FileText, label: 'রিফান্ড পলিসি', href: '/admin/refund-policy', roles: ['admin'] },
      { icon: HardDrive, label: 'ব্যাকআপ ও রিস্টোর', href: '/admin/backup', roles: ['admin'] },
      { icon: Activity, label: 'অডিট লগ', href: '/admin/audit-log', roles: ['admin'] },
    ]
  },
];

export const roleLabels: Record<string, string> = {
  admin: 'এডমিন',
  manager: 'ম্যানেজার',
  support: 'সাপোর্ট'
};
