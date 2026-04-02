import { Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import StoreLayout from "./layouts/StoreLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminInstallmentsPage from "./pages/admin/AdminInstallmentsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import DropshippingPage from "./pages/admin/DropshippingPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import ProductsPage from "./pages/admin/ProductsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import SellerLayout from "./layouts/SellerLayout";
import AuthPage from "./pages/store/AuthPage";
import FacebookAuthCallbackPage from "./pages/store/FacebookAuthCallbackPage";
import GoogleAuthCallbackPage from "./pages/store/GoogleAuthCallbackPage";
import CartPage from "./pages/store/CartPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import ContactPage from "./pages/store/ContactPage";
import HomePage from "./pages/store/HomePage";
import InstallmentsPage from "./pages/store/InstallmentsPage";
import OrdersPage from "./pages/store/OrdersPage";
import OrderSuccessPage from "./pages/store/OrderSuccessPage";
import NotificationsPage from "./pages/store/NotificationsPage";
import PrivacyPolicyPage from "./pages/store/PrivacyPolicyPage";
import ProductDetailsPage from "./pages/store/ProductDetailsPage";
import ReturnPolicyPage from "./pages/store/ReturnPolicyPage";
import TermsPage from "./pages/store/TermsPage";
import SellerApplyPage from "./pages/store/SellerApplyPage";
import ShippingPolicyPage from "./pages/store/ShippingPolicyPage";
import TrackOrderPage from "./pages/store/TrackOrderPage";
import WishlistPage from "./pages/store/WishlistPage";
import SellerDashboardPage from "./pages/seller/SellerDashboardPage";
import SellerOrdersPage from "./pages/seller/SellerOrdersPage";
import SellerAppealPage from "./pages/seller/SellerAppealPage";
import SellerProductsPage from "./pages/seller/SellerProductsPage";
import BrandingBackground from "./components/layout/BrandingBackground";

export default function App() {
  return (
    <div className="relative isolate min-h-screen">
      <BrandingBackground />
      <div className="relative z-10">
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/facebook/callback" element={<FacebookAuthCallbackPage />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
            <Route path="/product/:slug" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/checkout/success/:orderReference"
              element={
                <ProtectedRoute>
                  <OrderSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute message="Please log in to continue to checkout.">
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
            <Route path="/return-policy" element={<ReturnPolicyPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route
              path="/become-seller"
              element={
                <ProtectedRoute>
                  <SellerApplyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/appeal"
              element={
                <ProtectedRoute sellerAccountOnly>
                  <SellerAppealPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute message="Please log in to view and save wishlist items.">
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/installments"
              element={
                <ProtectedRoute>
                  <InstallmentsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/products" element={<ProductsPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/installments" element={<AdminInstallmentsPage />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/dropshipping" element={<DropshippingPage />} />
            <Route path="/admin/activity-log" element={<ActivityLogPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute sellerOnly>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/seller" element={<SellerDashboardPage />} />
            <Route path="/seller/products" element={<SellerProductsPage />} />
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}
