import { CreditCard, Heart, LayoutDashboard, LogOut, ShoppingBag } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";
import { resolveMediaUrl } from "../../utils/media";

function navPillClass({ isActive }) {
  return `inline-flex h-8 items-center rounded-full px-2.5 py-1.5 text-[12px] leading-none whitespace-nowrap transition sm:h-9 sm:px-3 sm:py-2 sm:text-[13px] ${
    isActive ? "bg-white/14 text-white" : "bg-white/[0.08] text-slate-200 hover:bg-white/12 hover:text-white"
  }`;
}

export default function Navbar() {
  const { user, isAdmin, isSeller, logout } = useAuth();
  const { itemCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { settings } = useStoreSettings();
  const initials = settings.storeName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="page-shell py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center gap-3 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_auto] lg:items-center lg:gap-4">
          <Link to="/" className="group flex min-w-0 flex-1 items-center gap-2.5 lg:min-w-[220px] lg:flex-none sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 font-bold text-white shadow-ambient transition duration-300 group-hover:scale-105">
              {settings.logo?.url ? (
                <img src={resolveMediaUrl(settings.logo.url)} alt={settings.logo.alt || settings.storeName} className="h-full w-full object-cover" />
              ) : (
                initials || "MC"
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">{settings.storeName}</p>
              <p className="text-[13px] font-semibold leading-tight text-white sm:text-[0.95rem]">Commerce Platform</p>
            </div>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center gap-1.5 text-[13px] text-slate-300 lg:order-2 lg:min-w-0 lg:flex-nowrap lg:justify-center lg:gap-2 lg:overflow-x-auto lg:pb-1 xl:overflow-visible">
          <NavLink to="/" end className={navPillClass}>Store</NavLink>
          <NavLink to="/track-order" className={navPillClass}>Track Order</NavLink>
          {user && <NavLink to="/orders" className={navPillClass}>My Orders</NavLink>}
          {user && !isAdmin && !isSeller && <NavLink to="/become-seller" className={navPillClass}>Become Seller</NavLink>}
          {isSeller && <NavLink to="/seller" className={navPillClass}>Seller Hub</NavLink>}
          </nav>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-0">
            <Link to="/wishlist" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center gap-2 rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3">
              <Heart size={16} />
              <span>{wishlistIds.length}</span>
            </Link>
            <Link to="/cart" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center gap-2 rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3">
              <ShoppingBag size={16} />
              <span>{itemCount}</span>
            </Link>
            {user && (
              <Link to="/installments" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3" aria-label="Installments">
                <CreditCard size={16} />
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="glass-panel inline-flex h-9 min-w-[2.8rem] items-center justify-center rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3" aria-label="Dashboard">
                <LayoutDashboard size={16} />
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="inline-flex h-9 items-center rounded-full bg-white/10 px-3 py-2 text-sm text-slate-100 sm:h-10 sm:px-4">
                <LogOut size={16} className="mr-2" />
                <span>Logout</span>
              </button>
            ) : (
              <Link to="/auth" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
