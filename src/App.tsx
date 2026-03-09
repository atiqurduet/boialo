import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { CompareFloatingBar } from "./components/CompareFloatingBar";
import { PopupBannerRenderer } from "./components/PopupBannerRenderer";
import ChatWidget from "./components/ChatWidget";

// Critical path - load immediately
import Index from "./pages/Index";

// Lazy-loaded pages
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const SignIn = lazy(() => import("./pages/SignIn"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Authors = lazy(() => import("./pages/Authors"));
const WriterDetail = lazy(() => import("./pages/WriterDetail"));
const Publishers = lazy(() => import("./pages/Publishers"));
const PublisherDetail = lazy(() => import("./pages/PublisherDetail"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Offers = lazy(() => import("./pages/Offers"));
const Preorder = lazy(() => import("./pages/Preorder"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CategoryLanding = lazy(() => import("./pages/CategoryLanding"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail"));
const UniversalProductDetail = lazy(() => import("./pages/UniversalProductDetail"));
const BkashCallback = lazy(() => import("./pages/BkashCallback"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Categories = lazy(() => import("./pages/Categories"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const DigitalLibrary = lazy(() => import("./pages/DigitalLibrary"));
const Bundles = lazy(() => import("./pages/Bundles"));
const SharedWishlist = lazy(() => import("./pages/SharedWishlist"));
const EbookReader = lazy(() => import("./pages/EbookReader"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const RefundRequests = lazy(() => import("./pages/RefundRequests"));
const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const GiftCards = lazy(() => import("./pages/GiftCards"));
const Compare = lazy(() => import("./pages/Compare"));
const Ebooks = lazy(() => import("./pages/Ebooks"));
const EbookDetail = lazy(() => import("./pages/EbookDetail"));
const Eproducts = lazy(() => import("./pages/Eproducts"));
const Rewards = lazy(() => import("./pages/Rewards"));

// Admin Pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminHomepage = lazy(() => import("./pages/admin/AdminHomepage"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminCouriers = lazy(() => import("./pages/admin/AdminCouriers"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminFraudReview = lazy(() => import("./pages/admin/AdminFraudReview"));
const AdminSMS = lazy(() => import("./pages/admin/AdminSMS"));
const AdminWriters = lazy(() => import("./pages/admin/AdminWriters"));
const AdminPublishers = lazy(() => import("./pages/admin/AdminPublishers"));
const AdminBranding = lazy(() => import("./pages/admin/AdminBranding"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu"));
const AdminFooter = lazy(() => import("./pages/admin/AdminFooter"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminCheckoutAnalytics = lazy(() => import("./pages/admin/AdminCheckoutAnalytics"));
const AdminUniversalProducts = lazy(() => import("./pages/admin/AdminUniversalProducts"));
const AdminUniversalCategories = lazy(() => import("./pages/admin/AdminUniversalCategories"));
const AdminProductTypes = lazy(() => import("./pages/admin/AdminProductTypes"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminEmailMarketing = lazy(() => import("./pages/admin/AdminEmailMarketing"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminRefundPolicy = lazy(() => import("./pages/admin/AdminRefundPolicy"));
const AdminRefundRequests = lazy(() => import("./pages/admin/AdminRefundRequests"));
const AdminAutoAssign = lazy(() => import("./pages/admin/AdminAutoAssign"));
const AdminRolePermissions = lazy(() => import("./pages/admin/AdminRolePermissions"));
const AdminCartWishlistCustomers = lazy(() => import("./pages/admin/AdminCartWishlistCustomers"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminPageEditor = lazy(() => import("./pages/admin/AdminPageEditor"));
const AdminAppearance = lazy(() => import("./pages/admin/AdminAppearance"));
const AdminBackupRestore = lazy(() => import("./pages/admin/AdminBackupRestore"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminGiftCards = lazy(() => import("./pages/admin/AdminGiftCards"));
const AdminBundles = lazy(() => import("./pages/admin/AdminBundles"));
const AdminLoyaltyPoints = lazy(() => import("./pages/admin/AdminLoyaltyPoints"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminMarketingAutomation = lazy(() => import("./pages/admin/AdminMarketingAutomation"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminDeliveryZones = lazy(() => import("./pages/admin/AdminDeliveryZones"));
const AdminReferralProgram = lazy(() => import("./pages/admin/AdminReferralProgram"));
const AdminVisitorAnalytics = lazy(() => import("./pages/admin/AdminVisitorAnalytics"));
const AdminSocialMedia = lazy(() => import("./pages/admin/AdminSocialMedia"));
const AdminDynamicPricing = lazy(() => import("./pages/admin/AdminDynamicPricing"));
const AdminSEOTools = lazy(() => import("./pages/admin/AdminSEOTools"));
const AdminPopupBanners = lazy(() => import("./pages/admin/AdminPopupBanners"));
const AdminStaffActivity = lazy(() => import("./pages/admin/AdminStaffActivity"));
const AdminMyDashboard = lazy(() => import("./pages/admin/AdminMyDashboard"));
const AdminEbooks = lazy(() => import("./pages/admin/AdminEbooks"));
const AdminEproducts = lazy(() => import("./pages/admin/AdminEproducts"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Global loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ThemeInitializer />
            <BrowserRouter>
              <AnalyticsProvider>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/track" element={<OrderTracking />} />
                <Route path="/track/:orderNumber" element={<OrderTracking />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/authors" element={<Authors />} />
                <Route path="/authors/:slug" element={<WriterDetail />} />
                <Route path="/publishers" element={<Publishers />} />
                <Route path="/publishers/:slug" element={<PublisherDetail />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/preorder" element={<Preorder />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/refund-requests" element={<RefundRequests />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:slug" element={<CategoryDetail />} />
                <Route path="/category/:productType" element={<CategoryLanding />} />
                <Route path="/category/:productType/:categorySlug" element={<CategoryLanding />} />
                <Route path="/universal-product/:slug" element={<UniversalProductDetail />} />
                <Route path="/bkash/callback" element={<BkashCallback />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/digital-library" element={<DigitalLibrary />} />
                <Route path="/gift-cards" element={<GiftCards />} />
                <Route path="/bundles" element={<Bundles />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/ebooks" element={<Ebooks />} />
                <Route path="/ebooks/:slug" element={<EbookDetail />} />
                <Route path="/ebooks/:slug/read" element={<EbookReader />} />
                <Route path="/eproducts" element={<Eproducts />} />
                <Route path="/wishlist/shared/:shareCode" element={<SharedWishlist />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/homepage" element={<AdminHomepage />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/writers" element={<AdminWriters />} />
                <Route path="/admin/publishers" element={<AdminPublishers />} />
                <Route path="/admin/brands" element={<AdminBrands />} />
                <Route path="/admin/universal-products" element={<AdminUniversalProducts />} />
                <Route path="/admin/universal-categories" element={<AdminUniversalCategories />} />
                <Route path="/admin/product-types" element={<AdminProductTypes />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/tasks" element={<AdminTasks />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/payments" element={<AdminPayments />} />
                <Route path="/admin/couriers" element={<AdminCouriers />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/fraud-review" element={<AdminFraudReview />} />
                <Route path="/admin/sms" element={<AdminSMS />} />
                <Route path="/admin/menu" element={<AdminMenu />} />
                <Route path="/admin/footer" element={<AdminFooter />} />
                <Route path="/admin/branding" element={<AdminBranding />} />
                <Route path="/admin/abandoned-carts" element={<AdminAbandonedCarts />} />
                <Route path="/admin/checkout-analytics" element={<AdminCheckoutAnalytics />} />
                <Route path="/admin/offers" element={<AdminOffers />} />
                <Route path="/admin/email-marketing" element={<AdminEmailMarketing />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/chat" element={<AdminChat />} />
                <Route path="/admin/refund-policy" element={<AdminRefundPolicy />} />
                <Route path="/admin/refund-requests" element={<AdminRefundRequests />} />
                <Route path="/admin/staff" element={<AdminUsers />} />
                <Route path="/admin/auto-assign" element={<AdminAutoAssign />} />
                <Route path="/admin/role-permissions" element={<AdminRolePermissions />} />
                <Route path="/admin/cart-wishlist-customers" element={<AdminCartWishlistCustomers />} />
                <Route path="/admin/pages" element={<AdminPages />} />
                <Route path="/admin/pages/:id" element={<AdminPageEditor />} />
                <Route path="/admin/appearance" element={<AdminAppearance />} />
                <Route path="/admin/backup" element={<AdminBackupRestore />} />
                <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                <Route path="/admin/staff-activity" element={<AdminStaffActivity />} />
                <Route path="/admin/my-dashboard" element={<AdminMyDashboard />} />
                <Route path="/admin/blog" element={<AdminBlog />} />
                <Route path="/admin/gift-cards" element={<AdminGiftCards />} />
                <Route path="/admin/loyalty-points" element={<AdminLoyaltyPoints />} />
                <Route path="/admin/bundles" element={<AdminBundles />} />
                <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
                <Route path="/admin/marketing-automation" element={<AdminMarketingAutomation />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/delivery-zones" element={<AdminDeliveryZones />} />
                <Route path="/admin/referral" element={<AdminReferralProgram />} />
                <Route path="/admin/visitor-analytics" element={<AdminVisitorAnalytics />} />
                <Route path="/admin/social-media" element={<AdminSocialMedia />} />
                <Route path="/admin/dynamic-pricing" element={<AdminDynamicPricing />} />
                <Route path="/admin/seo-tools" element={<AdminSEOTools />} />
                <Route path="/admin/popup-banners" element={<AdminPopupBanners />} />
                <Route path="/admin/ebooks" element={<AdminEbooks />} />
                <Route path="/admin/eproducts" element={<AdminEproducts />} />
                
                {/* Dynamic Page Route - must be before catch-all */}
                <Route path="/:slug" element={<DynamicPage />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <ChatWidget />
              <CompareFloatingBar />
              <PopupBannerRenderer />
              </AnalyticsProvider>
            </BrowserRouter>
          </TooltipProvider>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;