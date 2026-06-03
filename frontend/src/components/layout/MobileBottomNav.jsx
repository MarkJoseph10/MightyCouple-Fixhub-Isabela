import { useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Bell,
  CircleHelp,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
  Wrench,
  X
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNotifications } from "../../context/NotificationContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";
import { optimizeImageUrl } from "../../utils/media";

function tabClass(isActive) {
  return `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-1.5 py-2 text-[10px] font-medium transition ${
    isActive ? "bg-brand-500 text-white shadow-ambient" : "text-slate-300 hover:bg-white/8 hover:text-white"
  }`;
}

function sectionCardClass() {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-2";
}

function menuItemClass() {
  return "group flex items-center gap-3 rounded-[20px] px-3 py-3 transition hover:bg-white/8";
}

function MobileMenuSection({ title, items, onSelect }) {
  return (
    <div className={sectionCardClass()}>
      <p className="px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} to={item.to} onClick={onSelect} className={menuItemClass()}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-white transition group-hover:border-brand-400/40 group-hover:bg-brand-500/10 group-hover:text-brand-200">
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                <span className="block truncate text-xs text-slate-400">{item.description}</span>
              </span>
              {item.badge ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileBottomNav() {
  const { user, isAdmin, isSeller, isSellerAccount, isRepairTechnician, logout } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const { settings } = useStoreSettings();
  const { wishlistIds } = useWishlist();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  const userLabel = user?.sellerProfile?.displayName || user?.name || settings.storeName;
  const userInitials = (user?.name || settings.storeName || "MC")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  const userSubLabel = isAdmin
    ? "Admin access"
    : isSeller
      ? user?.sellerProfile?.storeName || "Seller account"
      : user?.email || "Customer account";
  const messagesRoute = isAdmin ? "/admin/messages" : isSeller ? "/seller/messages" : "/messages";

  const menuSections = useMemo(() => {
    const sections = [
      {
        title: "Browse",
        items: [
          { label: "Home", description: "Back to the storefront", to: "/", icon: Home },
          { label: "Track order", description: "Check delivery progress", to: "/track-order", icon: Truck },
          { label: "Help and contact", description: "Reach the support team", to: "/contact", icon: CircleHelp }
        ]
      }
    ];

    if (!user) {
      sections.push({
        title: "Start here",
        items: [{ label: "Sign in", description: "Access orders, repairs, and profile", to: "/auth", icon: UserRound }]
      });
      return sections;
    }

    sections.push({
      title: "Profile",
      items: [
        {
          label: "My profile",
          description: "Edit your name, email, phone, photo, and security",
          to: "/profile",
          icon: UserRound
        }
      ]
    });

    if (isAdmin) {
      sections.push({
        title: "Admin tools",
        items: [
          { label: "Dashboard", description: "Open store operations and insights", to: "/admin", icon: LayoutDashboard },
          { label: "Reports", description: "Review sales and performance", to: "/admin/reports", icon: LayoutDashboard },
          { label: "Products", description: "Manage store products and stock", to: "/admin/products", icon: ShoppingBag },
          { label: "Messages", description: "Handle escalations and support threads", to: "/admin/messages", icon: MessageSquare },
          { label: "Repairs", description: "Oversee repair bookings and disputes", to: "/admin/repairs", icon: Wrench },
          { label: "Technicians", description: "Approve repair technicians before they handle jobs", to: "/admin/technicians", icon: Users },
          { label: "Settings", description: "Branding, operations, and admin tools", to: "/admin/settings", icon: LayoutDashboard },
          { label: "Notifications", description: "Review latest store alerts", to: "/notifications", icon: Bell, badge: unreadCount }
        ]
      });
    } else if (isSeller) {
      sections.push({
        title: "Seller tools",
        items: [
          { label: "Seller hub", description: "Open your sales dashboard", to: "/seller", icon: LayoutDashboard },
          { label: "My products", description: "Manage your product catalog", to: "/seller/products", icon: ShoppingBag },
          { label: "Messages", description: "Reply to customers quickly", to: "/seller/messages", icon: MessageSquare },
          {
            label: isRepairTechnician ? "Seller repairs" : "Apply as technician",
            description: isRepairTechnician ? "Manage active repair jobs" : "Get admin approval before handling repair bookings",
            to: isRepairTechnician ? "/seller/repairs" : "/seller/technician",
            icon: Wrench
          },
          { label: "Orders", description: "Fulfill customer orders", to: "/seller/orders", icon: ShoppingBag },
          { label: "Notifications", description: "See seller alerts", to: "/notifications", icon: Bell, badge: unreadCount }
        ]
      });
    } else {
      sections.push({
        title: "Your account",
        items: [
          { label: "My orders", description: "Review purchases and tracking", to: "/orders", icon: ShoppingBag },
          { label: "Messages", description: "Open product, order, and repair chats", to: messagesRoute, icon: MessageSquare },
          { label: "Notifications", description: "See the latest account updates", to: "/notifications", icon: Bell, badge: unreadCount },
          { label: "Installments", description: "Track payment plans and due dates", to: "/installments", icon: CreditCard },
          { label: "Repair bookings", description: "Manage device repair requests", to: "/repairs", icon: Wrench }
        ]
      });
    }

    sections.push({
      title: "Shortcuts",
      items: [
        { label: "Wishlist", description: "Open saved items", to: "/wishlist", icon: Heart, badge: wishlistIds.length },
        { label: "Cart", description: "View products ready for checkout", to: "/cart", icon: ShoppingBag, badge: itemCount }
      ]
    });

    return sections;
  }, [isAdmin, isRepairTechnician, isSeller, itemCount, messagesRoute, unreadCount, user, wishlistIds.length]);

  function closeProfile() {
    setProfileOpen(false);
  }

  async function handleLogout() {
    closeProfile();
    await logout();
  }

  const tabs = useMemo(() => {
    if (isNativeApp && isAdmin) {
      return [
        { label: "Home", to: "/admin", icon: LayoutDashboard, badge: null, active: location.pathname === "/admin" },
        { label: "Chats", to: "/admin/messages", icon: MessageSquare, badge: null, active: location.pathname === "/admin/messages" },
        { label: "Repair", to: "/admin/repairs", icon: Wrench, badge: null, active: location.pathname === "/admin/repairs" || location.pathname === "/admin/technicians" },
        { label: "Profile", action: () => setProfileOpen(true), icon: UserRound, badge: null, active: profileOpen || location.pathname === "/profile" || location.pathname === "/admin/settings" }
      ];
    }

    if (isNativeApp && isSeller) {
      return [
        { label: "Home", to: "/seller", icon: LayoutDashboard, badge: null, active: location.pathname === "/seller" },
        { label: "Orders", to: "/seller/orders", icon: ShoppingBag, badge: null, active: location.pathname === "/seller/orders" },
        {
          label: "Repair",
          to: isRepairTechnician ? "/seller/repairs" : "/seller/technician",
          icon: Wrench,
          badge: null,
          active: location.pathname === "/seller/repairs" || location.pathname === "/seller/technician"
        },
        { label: "Profile", action: () => setProfileOpen(true), icon: UserRound, badge: null, active: profileOpen || location.pathname === "/profile" }
      ];
    }

    return [
      { label: "Home", to: "/", icon: Home, badge: null, active: location.pathname === "/" || location.pathname.startsWith("/product/") || location.pathname === "/cart" || location.pathname === "/wishlist" },
      { label: "Alerts", to: user ? "/notifications" : "/auth", icon: Bell, badge: unreadCount || null, active: location.pathname === "/notifications" },
      { label: "Repair", to: user ? "/repairs" : "/auth", icon: Wrench, badge: null, active: location.pathname === "/repairs" },
      { label: "Profile", action: () => setProfileOpen(true), icon: UserRound, badge: null, active: profileOpen || location.pathname === "/profile" }
    ];
  }, [isAdmin, isNativeApp, isRepairTechnician, isSeller, location.pathname, profileOpen, unreadCount, user]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-1.5 rounded-[24px] border border-white/10 bg-slate-950/92 p-1.5 shadow-2xl backdrop-blur-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.to) {
              return (
                <Link key={tab.label} to={tab.to} className={tabClass(tab.active)}>
                  <span className="relative inline-flex">
                    <Icon size={16} />
                    {tab.badge ? (
                      <span className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            }

            return (
              <button key={tab.label} type="button" onClick={tab.action} className={tabClass(tab.active)}>
                <span className="relative inline-flex">
                  <Icon size={16} />
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {profileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeProfile} aria-label="Close profile menu" />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[32px] border border-white/10 bg-slate-950/96 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-500 to-orange-400 text-sm font-semibold text-white">
                  {user?.avatar ? (
                    <img
                      src={optimizeImageUrl(user.avatar, { width: 96, height: 96, fit: "fill" })}
                      alt={user.name || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userInitials || "MC"
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{userLabel}</p>
                  <p className="truncate text-sm text-slate-400">{userSubLabel}</p>
                </div>
              </div>
              <button type="button" onClick={closeProfile} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(88vh-5rem)] overflow-y-auto overscroll-contain p-3 pb-28">
              <div className="space-y-3">
                {menuSections.map((section) => (
                  <MobileMenuSection key={section.title} title={section.title} items={section.items} onSelect={closeProfile} />
                ))}

                {user ? (
                  <div className={sectionCardClass()}>
                    <p className="px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">Security</p>
                    <button type="button" onClick={handleLogout} className={`${menuItemClass()} w-full text-left`}>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-200">
                        <LogOut size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">Sign out</span>
                        <span className="block truncate text-xs text-slate-400">End this session safely</span>
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
