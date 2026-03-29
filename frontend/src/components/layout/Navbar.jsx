import { Heart, LayoutDashboard, LogOut, ShoppingBag, Truck } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
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
      <div className="page-shell flex items-center justify-between gap-4 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 font-bold text-white shadow-ambient transition duration-300 group-hover:scale-105">
            {settings.logo?.url ? (
              <img src={settings.logo.url} alt={settings.logo.alt || settings.storeName} className="h-full w-full object-cover" />
            ) : (
              initials || "MC"
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{settings.storeName}</p>
            <p className="font-semibold text-white">Commerce Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <NavLink to="/" className="hover:text-white">Store</NavLink>
          <NavLink to="/contact" className="hover:text-white">Contact</NavLink>
          <NavLink to="/wishlist" className="hover:text-white">Wishlist</NavLink>
          <NavLink to="/cart" className="hover:text-white">Cart</NavLink>
          <NavLink to="/track-order" className="hover:text-white">Track Order</NavLink>
          {user && <NavLink to="/orders" className="hover:text-white">My Orders</NavLink>}
          {isAdmin && <NavLink to="/admin" className="hover:text-white">Dashboard</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/wishlist" className="glass-panel hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-white md:flex">
            <Heart size={16} />
            <span>{wishlistIds.length}</span>
          </Link>
          <Link to="/cart" className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white">
            <ShoppingBag size={16} />
            <span>{itemCount}</span>
          </Link>
          <Link to="/track-order" className="hidden rounded-full bg-white/10 px-4 py-2 text-sm text-slate-100 lg:inline-flex">
            <Truck size={16} className="mr-2" />
            Track
          </Link>
          {isAdmin && (
            <Link to="/admin" className="hidden rounded-full bg-white/10 px-4 py-2 text-sm text-slate-100 md:inline-flex">
              <LayoutDashboard size={16} className="mr-2" />
              Admin
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-slate-100">
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
