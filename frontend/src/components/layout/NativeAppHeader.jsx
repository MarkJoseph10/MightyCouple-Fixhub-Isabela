import { Capacitor } from "@capacitor/core";
import { ArrowLeft, Bell, MessageSquare, Search, ShoppingBag } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNotifications } from "../../context/NotificationContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { optimizeImageUrl } from "../../utils/media";
import { canNativeNavigateBack, getNativeHomeRoute, isNativeTabRootRoute } from "../../utils/nativeNavigation";

const CATALOG_SEARCH_PENDING_KEY = "shopverse-native-catalog-search-pending";

function getRouteMeta(pathname, { isAdmin, isSeller, isRepairTechnician, storeName }) {
  if (pathname === "/") {
    return { title: storeName || "Store", subtitle: "Browse products" };
  }

  if (pathname.startsWith("/product/")) {
    return { title: "Product details", subtitle: "Review specs and buy options" };
  }

  if (pathname === "/notifications") {
    return { title: "Notifications", subtitle: "Latest account updates" };
  }

  if (pathname === "/repairs") {
    return { title: "Repair bookings", subtitle: "Track and manage repair requests" };
  }

  if (pathname === "/orders") {
    return { title: "My orders", subtitle: "Purchases and delivery updates" };
  }

  if (pathname === "/messages") {
    return { title: "Messages", subtitle: "Product, order, and repair chats" };
  }

  if (pathname === "/profile") {
    return { title: "My profile", subtitle: "Personal details and security" };
  }

  if (pathname === "/cart") {
    return { title: "Cart", subtitle: "Ready for checkout" };
  }

  if (pathname === "/wishlist") {
    return { title: "Wishlist", subtitle: "Saved products" };
  }

  if (pathname === "/track-order") {
    return { title: "Track order", subtitle: "Check delivery progress" };
  }

  if (pathname === "/installments") {
    return { title: "Installments", subtitle: "Payment plans and due dates" };
  }

  if (pathname === "/become-seller") {
    return { title: "Become seller", subtitle: "Apply to start selling" };
  }

  if (pathname === "/seller") {
    return { title: "Seller hub", subtitle: "Store performance and tasks" };
  }

  if (pathname === "/seller/products") {
    return { title: "My products", subtitle: "Manage your catalog" };
  }

  if (pathname === "/seller/orders") {
    return { title: "Seller orders", subtitle: "Fulfillment and updates" };
  }

  if (pathname === "/seller/messages") {
    return { title: "Seller messages", subtitle: "Reply to customer chats" };
  }

  if (pathname === "/seller/repairs") {
    return { title: "Seller repairs", subtitle: "Manage assigned repair jobs" };
  }

  if (pathname === "/seller/technician") {
    return {
      title: isRepairTechnician ? "Repair technician" : "Apply as technician",
      subtitle: isRepairTechnician ? "Repair access approved" : "Request repair access"
    };
  }

  if (pathname === "/admin") {
    return { title: "Admin dashboard", subtitle: "Store overview and controls" };
  }

  if (pathname === "/admin/messages") {
    return { title: "Admin messages", subtitle: "Escalations and support threads" };
  }

  if (pathname === "/admin/repairs") {
    return { title: "Admin repairs", subtitle: "Repair oversight and disputes" };
  }

  if (pathname === "/admin/technicians") {
    return { title: "Technicians", subtitle: "Approve and manage repair access" };
  }

  if (pathname === "/admin/orders") {
    return { title: "Admin orders", subtitle: "Order monitoring and actions" };
  }

  if (pathname === "/admin/installments") {
    return { title: "Installments", subtitle: "Review payment plans" };
  }

  if (pathname === "/admin/products") {
    return { title: "Products", subtitle: "Catalog management" };
  }

  if (pathname === "/admin/customers") {
    return { title: "Customers", subtitle: "Account and seller oversight" };
  }

  if (pathname === "/admin/settings") {
    return { title: "Settings", subtitle: "Branding and admin tools" };
  }

  if (pathname === "/admin/reports") {
    return { title: "Reports", subtitle: "Performance and sales views" };
  }

  if (pathname === "/admin/activity-log") {
    return { title: "Activity log", subtitle: "System and admin history" };
  }

  if (pathname === "/admin/dropshipping") {
    return { title: "Dropshipping", subtitle: "Supplier tools" };
  }

  return {
    title: isAdmin ? "Admin workspace" : isSeller ? "Seller workspace" : storeName || "Mighty Couple",
    subtitle: isAdmin ? "Store operations" : isSeller ? "Manage your store" : "Mobile shopping app"
  };
}

export default function NativeAppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isSeller, isRepairTechnician } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const { settings } = useStoreSettings();

  if (!Capacitor.isNativePlatform() || !user) {
    return null;
  }

  const meta = getRouteMeta(location.pathname, {
    isAdmin,
    isSeller,
    isRepairTechnician,
    storeName: settings.storeName
  });
  const homeRoute = getNativeHomeRoute({ isAdmin, isSeller });
  const showBack = !isNativeTabRootRoute(location.pathname, { isAdmin, isSeller });
  const logoInitials = settings.storeName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  const messagesRoute = isAdmin ? "/admin/messages" : isSeller ? "/seller/messages" : "/messages";

  function handleSearchJump() {
    if (location.pathname === "/") {
      const target = document.getElementById("catalog-search");
      const input = document.getElementById("catalog-search-input");

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => input?.focus(), 220);
      return;
    }

    try {
      window.sessionStorage.setItem(CATALOG_SEARCH_PENDING_KEY, "1");
    } catch {
      // Ignore storage access failures.
    }

    navigate("/");
  }

  function handleBack() {
    if (canNativeNavigateBack()) {
      navigate(-1);
      return;
    }

    navigate(homeRoute, { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/92 backdrop-blur-xl md:hidden">
      <div
        className="page-shell flex items-center gap-2.5 py-2.5"
        style={{ paddingTop: "max(0.6rem, env(safe-area-inset-top))" }}
      >
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={17} />
          </button>
        ) : (
          <Link
            to={isAdmin ? "/admin" : isSeller ? "/seller" : "/"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-brand-500 to-orange-400 text-sm font-semibold text-white"
            aria-label="Home"
          >
            {settings.logo?.url ? (
              <img
                src={optimizeImageUrl(settings.logo.url, { width: 96, height: 96, fit: "fill" })}
                alt={settings.logo.alt || settings.storeName}
                className="h-full w-full object-cover"
              />
            ) : (
              logoInitials || "MC"
            )}
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-[0.26em] text-slate-500">{isAdmin ? "Admin app" : isSeller ? "Seller app" : settings.storeName}</p>
          <p className="truncate text-[15px] font-semibold text-white">{meta.title}</p>
          <p className="truncate text-[11px] text-slate-400">{meta.subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isAdmin && !isSeller ? (
            <>
              <button
                type="button"
                onClick={handleSearchJump}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-white"
                aria-label="Search products"
              >
                <Search size={16} />
              </button>
              <Link
                to="/cart"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-white"
                aria-label="Open cart"
              >
                <ShoppingBag size={16} />
                {itemCount ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-semibold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                ) : null}
              </Link>
            </>
          ) : (
            <>
              <Link
                to={messagesRoute}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-white"
                aria-label="Open messages"
              >
                <MessageSquare size={16} />
              </Link>
              <Link
                to="/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-white"
                aria-label="Open notifications"
              >
                <Bell size={16} />
                {unreadCount ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
