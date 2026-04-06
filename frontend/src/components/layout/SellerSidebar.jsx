import { Boxes, ChartColumn, MessageSquare, PackageSearch, ShoppingCart, Store, Wrench } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SellerSidebar({ onNavigate }) {
  const { user, isRepairTechnician } = useAuth();
  const links = [
    { to: "/seller", label: "Overview", icon: ChartColumn },
    { to: "/seller/products", label: "My Products", icon: Boxes },
    { to: "/seller/orders", label: "My Orders", icon: ShoppingCart },
    { to: isRepairTechnician ? "/seller/repairs" : "/seller/technician", label: isRepairTechnician ? "Repairs" : "Apply as technician", icon: Wrench },
    { to: "/seller/messages", label: "Messages", icon: MessageSquare },
    { to: "/", label: "Storefront", icon: PackageSearch }
  ];

  return (
    <aside className="glass-panel h-fit rounded-3xl p-4 shadow-ambient">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-brand-500 text-sm font-bold text-white">
          <Store size={18} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seller</p>
          <p className="font-semibold text-white">{user?.sellerProfile?.storeName || user?.name || "Seller Hub"}</p>
        </div>
      </div>
      <p className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-400">Seller tools</p>
      <nav className="space-y-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/seller"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                isActive ? "bg-cyan-500 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
