import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LoadingScreen from "./components/common/LoadingScreen";
import ProtectedRoute from "./routes/ProtectedRoute";
import BrandingBackground from "./components/layout/BrandingBackground";

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const StoreLayout = lazy(() => import("./layouts/StoreLayout"));
const SellerLayout = lazy(() => import("./layouts/SellerLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const AdminInstallmentsPage = lazy(() => import("./pages/admin/AdminInstallmentsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const DropshippingPage = lazy(() => import("./pages/admin/DropshippingPage"));
const ActivityLogPage = lazy(() => import("./pages/admin/ActivityLogPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AuthPage = lazy(() => import("./pages/store/AuthPage"));
const FacebookAuthCallbackPage = lazy(() => import("./pages/store/FacebookAuthCallbackPage"));
const GoogleAuthCallbackPage = lazy(() => import("./pages/store/GoogleAuthCallbackPage"));
const CartPage = lazy(() => import("./pages/store/CartPage"));
const CheckoutPage = lazy(() => import("./pages/store/CheckoutPage"));
const ContactPage = lazy(() => import("./pages/store/ContactPage"));
const HomePage = lazy(() => import("./pages/store/HomePage"));
const InstallmentsPage = lazy(() => import("./pages/store/InstallmentsPage"));
const OrdersPage = lazy(() => import("./pages/store/OrdersPage"));
const OrderSuccessPage = lazy(() => import("./pages/store/OrderSuccessPage"));
const NotificationsPage = lazy(() => import("./pages/store/NotificationsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/store/PrivacyPolicyPage"));
const ProductDetailsPage = lazy(() => import("./pages/store/ProductDetailsPage"));
const ReturnPolicyPage = lazy(() => import("./pages/store/ReturnPolicyPage"));
const TermsPage = lazy(() => import("./pages/store/TermsPage"));
const SellerApplyPage = lazy(() => import("./pages/store/SellerApplyPage"));
const ShippingPolicyPage = lazy(() => import("./pages/store/ShippingPolicyPage"));
const TrackOrderPage = lazy(() => import("./pages/store/TrackOrderPage"));
const WishlistPage = lazy(() => import("./pages/store/WishlistPage"));
const SellerDashboardPage = lazy(() => import("./pages/seller/SellerDashboardPage"));
const SellerOrdersPage = lazy(() => import("./pages/seller/SellerOrdersPage"));
const SellerAppealPage = lazy(() => import("./pages/seller/SellerAppealPage"));
const SellerProductsPage = lazy(() => import("./pages/seller/SellerProductsPage"));

function LazyBoundary({ label, children }) {
  return <Suspense fallback={<LoadingScreen label={label} />}>{children}</Suspense>;
}

export default function App() {
  return (
    <div className="relative isolate min-h-screen">
      <BrandingBackground />
      <div className="relative z-10">
        <Routes>
          <Route element={<LazyBoundary label="Loading storefront..."><StoreLayout /></LazyBoundary>}>
            <Route path="/" element={<LazyBoundary label="Loading home..."><HomePage /></LazyBoundary>} />
            <Route path="/auth" element={<LazyBoundary label="Loading sign in..."><AuthPage /></LazyBoundary>} />
            <Route path="/auth/facebook/callback" element={<LazyBoundary label="Completing Facebook sign in..."><FacebookAuthCallbackPage /></LazyBoundary>} />
            <Route path="/auth/google/callback" element={<LazyBoundary label="Completing Google sign in..."><GoogleAuthCallbackPage /></LazyBoundary>} />
            <Route path="/product/:slug" element={<LazyBoundary label="Loading product..."><ProductDetailsPage /></LazyBoundary>} />
            <Route path="/cart" element={<LazyBoundary label="Loading cart..."><CartPage /></LazyBoundary>} />
            <Route
              path="/checkout/success/:orderReference"
              element={
                <ProtectedRoute>
                  <LazyBoundary label="Loading order success..."><OrderSuccessPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute message="Please log in to continue to checkout.">
                  <LazyBoundary label="Loading checkout..."><CheckoutPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route path="/contact" element={<LazyBoundary label="Loading contact page..."><ContactPage /></LazyBoundary>} />
            <Route path="/shipping-policy" element={<LazyBoundary label="Loading shipping policy..."><ShippingPolicyPage /></LazyBoundary>} />
            <Route path="/return-policy" element={<LazyBoundary label="Loading return policy..."><ReturnPolicyPage /></LazyBoundary>} />
            <Route path="/privacy-policy" element={<LazyBoundary label="Loading privacy policy..."><PrivacyPolicyPage /></LazyBoundary>} />
            <Route path="/terms" element={<LazyBoundary label="Loading terms..."><TermsPage /></LazyBoundary>} />
            <Route path="/track-order" element={<LazyBoundary label="Loading tracker..."><TrackOrderPage /></LazyBoundary>} />
            <Route
              path="/become-seller"
              element={
                <ProtectedRoute>
                  <LazyBoundary label="Loading seller application..."><SellerApplyPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/appeal"
              element={
                <ProtectedRoute sellerAccountOnly>
                  <LazyBoundary label="Loading seller appeal..."><SellerAppealPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute message="Please log in to view and save wishlist items.">
                  <LazyBoundary label="Loading wishlist..."><WishlistPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <LazyBoundary label="Loading orders..."><OrdersPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <LazyBoundary label="Loading notifications..."><NotificationsPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/installments"
              element={
                <ProtectedRoute>
                  <LazyBoundary label="Loading installments..."><InstallmentsPage /></LazyBoundary>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute adminOnly>
                <LazyBoundary label="Loading admin area..."><AdminLayout /></LazyBoundary>
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<LazyBoundary label="Loading admin dashboard..."><DashboardPage /></LazyBoundary>} />
            <Route path="/admin/reports" element={<LazyBoundary label="Loading reports..."><ReportsPage /></LazyBoundary>} />
            <Route path="/admin/products" element={<LazyBoundary label="Loading admin products..."><ProductsPage /></LazyBoundary>} />
            <Route path="/admin/orders" element={<LazyBoundary label="Loading admin orders..."><AdminOrdersPage /></LazyBoundary>} />
            <Route path="/admin/installments" element={<LazyBoundary label="Loading admin installments..."><AdminInstallmentsPage /></LazyBoundary>} />
            <Route path="/admin/customers" element={<LazyBoundary label="Loading customers..."><CustomersPage /></LazyBoundary>} />
            <Route path="/admin/dropshipping" element={<LazyBoundary label="Loading dropshipping..."><DropshippingPage /></LazyBoundary>} />
            <Route path="/admin/activity-log" element={<LazyBoundary label="Loading activity log..."><ActivityLogPage /></LazyBoundary>} />
            <Route path="/admin/settings" element={<LazyBoundary label="Loading settings..."><SettingsPage /></LazyBoundary>} />
          </Route>

          <Route
            element={
              <ProtectedRoute sellerOnly>
                <LazyBoundary label="Loading seller area..."><SellerLayout /></LazyBoundary>
              </ProtectedRoute>
            }
          >
            <Route path="/seller" element={<LazyBoundary label="Loading seller dashboard..."><SellerDashboardPage /></LazyBoundary>} />
            <Route path="/seller/products" element={<LazyBoundary label="Loading seller products..."><SellerProductsPage /></LazyBoundary>} />
            <Route path="/seller/orders" element={<LazyBoundary label="Loading seller orders..."><SellerOrdersPage /></LazyBoundary>} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}
