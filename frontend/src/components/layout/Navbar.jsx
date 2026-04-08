import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  UserRound,
  Wrench
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import NotificationBell from "./NotificationBell";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";
import { optimizeImageUrl } from "../../utils/media";

function navPillClass({ isActive }) {
  return `inline-flex h-8 items-center rounded-full px-2.5 py-1.5 text-[12px] leading-none whitespace-nowrap transition sm:h-9 sm:px-3 sm:py-2 sm:text-[13px] ${
    isActive ? "bg-white/14 text-white" : "bg-white/[0.08] text-slate-200 hover:bg-white/12 hover:text-white"
  }`;
}

function menuItemClass() {
  return "group flex items-center gap-3 rounded-[20px] px-3 py-3 transition hover:bg-white/8";
}

function MenuSection({ title, items, onSelect }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-2">
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

export default function Navbar() {
  const { user, isAdmin, isSeller, isSellerAccount, isRepairTechnician, logout } = useAuth();
  const { itemCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { settings } = useStoreSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = settings.storeName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  const messagesRoute = isAdmin ? "/admin/messages" : isSeller ? "/seller/messages" : "/messages";
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

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const menuSections = useMemo(() => {
    const sections = [
      {
        title: "Browse",
        items: [
          {
            label: "Home",
            description: "Back to the storefront",
            to: "/",
            icon: Home
          },
          {
            label: "Track order",
            description: "Check your delivery progress",
            to: "/track-order",
            icon: Truck
          },
          {
            label: "Help and contact",
            description: "Reach the support team",
            to: "/contact",
            icon: CircleHelp
          }
        ]
      }
    ];

    if (!user) {
      sections.push({
        title: "Store info",
        items: [
          {
            label: "Shipping policy",
            description: "Read shipping rules and delivery notes",
            to: "/shipping-policy",
            icon: Truck
          },
          {
            label: "Privacy policy",
            description: "See how customer data is handled",
            to: "/privacy-policy",
            icon: Settings
          }
        ]
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
          {
            label: "Dashboard",
            description: "Open store operations and insights",
            to: "/admin",
            icon: LayoutDashboard
          },
          {
            label: "Messages",
            description: "Handle escalations and support threads",
            to: "/admin/messages",
            icon: MessageSquare
          },
          {
            label: "Repairs",
            description: "Oversee repair bookings and disputes",
            to: "/admin/repairs",
            icon: Wrench
          },
          {
            label: "Technicians",
            description: "Approve repair technicians before they handle jobs",
            to: "/admin/technicians",
            icon: Users
          },
          {
            label: "Settings",
            description: "Control store operations and content",
            to: "/admin/settings",
            icon: Settings
          }
        ]
      });
    } else if (isSeller) {
      sections.push({
        title: "Seller tools",
        items: [
          {
            label: "Seller hub",
            description: "Open your sales dashboard",
            to: "/seller",
            icon: LayoutDashboard
          },
          {
            label: "Messages",
            description: "Reply to customers quickly",
            to: "/seller/messages",
            icon: MessageSquare
          },
          {
            label: isRepairTechnician ? "Seller repairs" : "Apply as technician",
            description: isRepairTechnician ? "Manage active repair jobs" : "Get admin approval before handling repair bookings",
            to: isRepairTechnician ? "/seller/repairs" : "/seller/technician",
            icon: Wrench
          },
          {
            label: "Orders",
            description: "Fulfill orders from customers",
            to: "/seller/orders",
            icon: ShoppingBag
          }
        ]
      });
    } else {
      sections.push({
        title: "Your account",
        items: [
          {
            label: "My orders",
            description: "Review purchases and tracking",
            to: "/orders",
            icon: ShoppingBag
          },
          {
            label: "Messages",
            description: "Open product, order, and repair chats",
            to: messagesRoute,
            icon: MessageSquare
          },
          {
            label: "Notifications",
            description: "See the latest account updates",
            to: "/notifications",
            icon: Bell
          },
          {
            label: "Installments",
            description: "Track payment plans and due dates",
            to: "/installments",
            icon: CreditCard
          },
          {
            label: "Repair bookings",
            description: "Manage device repair requests",
            to: "/repairs",
            icon: Wrench
          }
        ]
      });
    }

    sections.push({
      title: "Shortcuts",
      items: [
        {
          label: "Wishlist",
          description: "Open saved items",
          to: "/wishlist",
          icon: Heart,
          badge: wishlistIds.length
        },
        {
          label: "Cart",
          description: "View products ready for checkout",
          to: "/cart",
          icon: ShoppingBag,
          badge: itemCount
        }
      ]
    });

    return sections;
  }, [isAdmin, isRepairTechnician, isSeller, itemCount, messagesRoute, user, wishlistIds.length]);

  function handleCatalogSearchJump() {
    if (location.pathname === "/") {
      const target = document.getElementById("catalog-search");
      const input = document.getElementById("catalog-search-input");

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      window.setTimeout(() => {
        input?.focus();
      }, 350);

      return;
    }

    navigate("/#catalog-search");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    closeMenu();
    logout();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="page-shell py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center gap-3 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
          <Link to="/" className="group flex min-w-0 flex-1 items-center gap-2.5 lg:min-w-[220px] lg:flex-none sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 font-bold text-white shadow-ambient transition duration-300 group-hover:scale-105">
              {settings.logo?.url ? (
                <img
                  src={optimizeImageUrl(settings.logo.url, { width: 96, height: 96, fit: "fill" })}
                  alt={settings.logo.alt || settings.storeName}
                  className="h-full w-full object-cover"
                  loading="eager"
                  fetchpriority="high"
                />
              ) : (
                initials || "MC"
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">{settings.storeName}</p>
              <p className="text-[13px] font-semibold leading-tight text-white sm:text-[0.95rem]">Commerce Platform</p>
            </div>
          </Link>

          <nav className="order-3 hidden w-full flex-wrap items-center gap-1.5 text-[13px] text-slate-300 lg:order-2 lg:flex lg:min-w-0 lg:flex-nowrap lg:justify-center lg:gap-2 lg:overflow-x-auto lg:pb-1 xl:overflow-visible">
            <NavLink to="/" end className={navPillClass}>Store</NavLink>
            <NavLink to="/track-order" className={navPillClass}>Track Order</NavLink>
            {user && <NavLink to="/orders" className={navPillClass}>My Orders</NavLink>}
            {user && !isAdmin && !isSellerAccount && <NavLink to="/become-seller" className={navPillClass}>Become Seller</NavLink>}
            {isSeller && <NavLink to="/seller" className={navPillClass}>Seller Hub</NavLink>}
            {isSellerAccount && !isSeller && <NavLink to="/seller/appeal" className={navPillClass}>Seller Appeal</NavLink>}
          </nav>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-0">
            <button
              type="button"
              onClick={handleCatalogSearchJump}
              className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3"
              aria-label="Search products"
            >
              <Search size={16} />
            </button>
            {user ? <NotificationBell /> : null}
            <Link to="/wishlist" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center gap-2 rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3">
              <Heart size={16} />
              <span>{wishlistIds.length}</span>
            </Link>
            <Link to="/cart" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center gap-2 rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3">
              <ShoppingBag size={16} />
              <span>{itemCount}</span>
            </Link>

            <div ref={menuRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="glass-panel inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-sm text-white sm:px-3"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {user ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 text-xs font-semibold text-white">
                    {user.avatar ? (
                      <img
                        src={optimizeImageUrl(user.avatar, { width: 80, height: 80, fit: "fill" })}
                        alt={user.name || "Profile"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials || "MC"
                    )}
                  </span>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                    <Menu size={16} />
                  </span>
                )}
                <span className="hidden max-w-[7rem] truncate text-left sm:block">
                  <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">{user ? "Account" : "Menu"}</span>
                  <span className="block truncate text-sm font-semibold text-white">{user ? userLabel : "Quick links"}</span>
                </span>
                <ChevronDown size={16} className={`transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(23rem,calc(100vw-1rem))] overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
                  style={{ maxHeight: "calc(100vh - 1rem)" }}
                >
                  <div className="border-b border-white/10 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-500 to-orange-400 text-sm font-semibold text-white">
                        {user?.avatar ? (
                          <img
                            src={optimizeImageUrl(user.avatar, { width: 96, height: 96, fit: "fill" })}
                            alt={user.name || "Profile"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user ? userInitials || "MC" : "MC"
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user ? userLabel : settings.storeName}</p>
                        <p className="truncate text-xs text-slate-400">{user ? userSubLabel : "Shortcuts, support, and store navigation"}</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="overflow-y-auto overscroll-contain p-3"
                    style={{ maxHeight: "calc(100vh - 7.5rem)" }}
                  >
                    <div className="space-y-3">
                      {menuSections.map((section) => (
                        <MenuSection key={section.title} title={section.title} items={section.items} onSelect={closeMenu} />
                      ))}

                      {user ? (
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-2">
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
                      ) : (
                        <Link to="/auth" onClick={closeMenu} className="block rounded-[24px] bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-600">
                          Sign in
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {!user ? (
              <Link to="/auth" className="hidden h-10 items-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white md:inline-flex">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
