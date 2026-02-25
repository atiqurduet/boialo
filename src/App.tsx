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
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderHistory from "./pages/OrderHistory";
import OrderTracking from "./pages/OrderTracking";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Authors from "./pages/Authors";
import WriterDetail from "./pages/WriterDetail";
import Publishers from "./pages/Publishers";
import PublisherDetail from "./pages/PublisherDetail";
import Wishlist from "./pages/Wishlist";
import Offers from "./pages/Offers";
import Preorder from "./pages/Preorder";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import CategoryLanding from "./pages/CategoryLanding";
import CategoryDetail from "./pages/CategoryDetail";
import UniversalProductDetail from "./pages/UniversalProductDetail";
import BkashCallback from "./pages/BkashCallback";
import Categories from "./pages/Categories";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import DigitalLibrary from "./pages/DigitalLibrary";
import Bundles from "./pages/Bundles";
import SharedWishlist from "./pages/SharedWishlist";
// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminHomepage from "./pages/admin/AdminHomepage";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminCouriers from "./pages/admin/AdminCouriers";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminFraudReview from "./pages/admin/AdminFraudReview";
import AdminSMS from "./pages/admin/AdminSMS";
import AdminWriters from "./pages/admin/AdminWriters";
import AdminPublishers from "./pages/admin/AdminPublishers";
import AdminBranding from "./pages/admin/AdminBranding";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminFooter from "./pages/admin/AdminFooter";
import AdminAbandonedCarts from "./pages/admin/AdminAbandonedCarts";
import AdminCheckoutAnalytics from "./pages/admin/AdminCheckoutAnalytics";
import AdminUniversalProducts from "./pages/admin/AdminUniversalProducts";
import AdminUniversalCategories from "./pages/admin/AdminUniversalCategories";
import AdminProductTypes from "./pages/admin/AdminProductTypes";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminEmailMarketing from "./pages/admin/AdminEmailMarketing";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminChat from "./pages/admin/AdminChat";
import AdminRefundPolicy from "./pages/admin/AdminRefundPolicy";
import AdminRefundRequests from "./pages/admin/AdminRefundRequests";
import AdminStaffManagement from "./pages/admin/AdminStaffManagement";
import AdminAutoAssign from "./pages/admin/AdminAutoAssign";
import AdminRolePermissions from "./pages/admin/AdminRolePermissions";
import AdminCartWishlistCustomers from "./pages/admin/AdminCartWishlistCustomers";
import AdminPages from "./pages/admin/AdminPages";
import AdminPageEditor from "./pages/admin/AdminPageEditor";
import AdminAppearance from "./pages/admin/AdminAppearance";
import AdminBackupRestore from "./pages/admin/AdminBackupRestore";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import RefundPolicy from "./pages/RefundPolicy";
import RefundRequests from "./pages/RefundRequests";
import ChatWidget from "./components/ChatWidget";
import DynamicPage from "./pages/DynamicPage";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminGiftCards from "./pages/admin/AdminGiftCards";
import AdminBundles from "./pages/admin/AdminBundles";
import AdminLoyaltyPoints from "./pages/admin/AdminLoyaltyPoints";
import AdminContactMessages from "./pages/admin/AdminContactMessages";
import AdminMarketingAutomation from "./pages/admin/AdminMarketingAutomation";
import GiftCards from "./pages/GiftCards";
import Compare from "./pages/Compare";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminDeliveryZones from "./pages/admin/AdminDeliveryZones";
import AdminReferralProgram from "./pages/admin/AdminReferralProgram";
import AdminVisitorAnalytics from "./pages/admin/AdminVisitorAnalytics";
import AdminSocialMedia from "./pages/admin/AdminSocialMedia";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { CompareFloatingBar } from "./components/CompareFloatingBar";

const queryClient = new QueryClient();

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
                <Route path="/admin/staff" element={<AdminStaffManagement />} />
                <Route path="/admin/auto-assign" element={<AdminAutoAssign />} />
                <Route path="/admin/role-permissions" element={<AdminRolePermissions />} />
                <Route path="/admin/cart-wishlist-customers" element={<AdminCartWishlistCustomers />} />
                <Route path="/admin/pages" element={<AdminPages />} />
                <Route path="/admin/pages/:id" element={<AdminPageEditor />} />
                <Route path="/admin/appearance" element={<AdminAppearance />} />
                <Route path="/admin/backup" element={<AdminBackupRestore />} />
                <Route path="/admin/audit-log" element={<AdminAuditLog />} />
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
                
                {/* Dynamic Page Route - must be before catch-all */}
                <Route path="/:slug" element={<DynamicPage />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatWidget />
              <CompareFloatingBar />
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
