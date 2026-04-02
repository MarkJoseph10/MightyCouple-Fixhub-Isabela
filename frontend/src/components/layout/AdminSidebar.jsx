import { Boxes, ChartColumn, Clock3, CreditCard, PackageSearch, Settings2, ShoppingCart, Truck, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { resolveMediaUrl } from "../../utils/media";

const links = [
  { to: "/admin", label: "Overview", icon: ChartColumn },
  { to: "/admin/products", label: "Products", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/installments", label: "Installments", icon: CreditCard },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/dropshipping", label: "Dropshipping", icon: Truck },
  { to: "/admin/activity-log", label: "Activity Log", icon: Clock3 },
  { to: "/admin/settings", label: "Settings", icon: Settings2 },
  { to: "/", label: "Storefront", icon: PackageSearch }
];

export default function AdminSidebar({ onNavigate }) {
  const { settings } = useStoreSettings();

  return (
    <aside className="glass-panel h-fit rounded-3xl p-4 shadow-ambient">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-orange-400 text-sm font-bold text-white">
          {settings.logo?.url ? (
            <img src={resolveMediaUrl(settings.logo.url)} alt={settings.logo.alt || settings.storeName} className="h-full w-full object-cover" />
          ) : (
            settings.storeName.slice(0, 2).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Store</p>
          <p className="font-semibold text-white">{settings.storeName}</p>
        </div>
      </div>
      <p className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
      <nav className="space-y-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                isActive ? "bg-brand-500 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
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
