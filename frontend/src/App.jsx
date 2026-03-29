import { Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import StoreLayout from "./layouts/StoreLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import DropshippingPage from "./pages/admin/DropshippingPage";
import ProductsPage from "./pages/admin/ProductsPage";
import AuthPage from "./pages/store/AuthPage";
import CartPage from "./pages/store/CartPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import ContactPage from "./pages/store/ContactPage";
import HomePage from "./pages/store/HomePage";
import OrdersPage from "./pages/store/OrdersPage";
import PrivacyPolicyPage from "./pages/store/PrivacyPolicyPage";
import ProductDetailsPage from "./pages/store/ProductDetailsPage";
import ReturnPolicyPage from "./pages/store/ReturnPolicyPage";
import ShippingPolicyPage from "./pages/store/ShippingPolicyPage";
import TrackOrderPage from "./pages/store/TrackOrderPage";
import WishlistPage from "./pages/store/WishlistPage";

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/product/:slug" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
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
        <Route path="/track-order" element={<TrackOrderPage />} />
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
        <Route path="/admin/customers" element={<CustomersPage />} />
        <Route path="/admin/dropshipping" element={<DropshippingPage />} />
      </Route>
    </Routes>
  );
}
