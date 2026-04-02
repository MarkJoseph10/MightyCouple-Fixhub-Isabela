import { BarChart3, Boxes, Palette, Settings2, ShoppingBag, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import StatsCard from "../../components/admin/StatsCard";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";

function getPeriodKey(mode) {
  const current = new Date();

  if (mode === "month") {
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  }

  if (mode === "week") {
    const workingDate = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
    const dayNumber = workingDate.getUTCDay() || 7;
    workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((workingDate - yearStart) / 86400000) + 1) / 7);

    return `${workingDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }

  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
}

function getSeriesValue(series, mode) {
  const match = (series || []).find((item) => item.label === getPeriodKey(mode));
  return Number(match?.value || 0);
}

function formatSeriesLabel(label) {
  if (!label) {
    return "";
  }

  if (label.includes("-W")) {
    const [year, week] = label.split("-W");
    return `${week}/${year.slice(-2)}`;
  }

  if (label.length === 7) {
    const [year, month] = label.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-PH", {
      month: "short"
    });
  }

  return new Date(label).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric"
  });
}

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <section className="glass-panel rounded-[32px] p-5 shadow-ambient sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        {description ? <p className="max-w-xl text-sm text-slate-400">{description}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function QuickLink({ to, icon: Icon, title, caption, tone = "brand" }) {
  const toneClass =
    tone === "cyan"
      ? "from-cyan-500/20 to-brand-500/10"
      : tone === "emerald"
        ? "from-emerald-500/20 to-cyan-400/10"
        : "from-brand-500/20 to-orange-400/10";

  return (
    <Link
      to={to}
      className="rounded-[28px] border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:bg-white/10"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} text-brand-50`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{caption}</p>
    </Link>
  );
}

function RevenueChart({ title, series, accentClass }) {
  const maxValue = Math.max(...(series || []).map((item) => Number(item.value || 0)), 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Revenue trend</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-xs text-slate-300">
          {(series || []).length} points
        </div>
      </div>
      <div className="mt-6 grid h-44 grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-end gap-3">
        {(series || []).map((item, index) => {
          const height = `${Math.max(16, (Number(item.value || 0) / maxValue) * 100)}%`;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex min-w-0 flex-col items-center gap-3"
            >
              <div className="text-[11px] text-slate-400">{peso(item.value)}</div>
              <div className="flex h-28 w-full items-end">
                <div className={`w-full rounded-t-3xl bg-gradient-to-t ${accentClass}`} style={{ height }} />
              </div>
              <div className="text-[11px] text-slate-500">{formatSeriesLabel(item.label)}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatusMixCard({ ordersByStatus = [], totalOrders = 0 }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Order status mix</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Live fulfillment pulse</h3>
      <div className="mt-5 space-y-3">
        {ordersByStatus.length ? (
          ordersByStatus.map((item) => {
            const percent = totalOrders ? (Number(item.count || 0) / totalOrders) * 100 : 0;

            return (
              <div key={item._id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <OrderStatusBadge status={item._id} />
                  <span className="text-sm text-slate-300">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400"
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            No order statuses yet. This panel will update once orders start moving.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { settings, setSettings } = useStoreSettings();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [{ data: statsData }, { data: adminSettings }] = await Promise.all([
          api.get("/stats"),
          api.get("/settings")
        ]);

        setStats(statsData);
        setSettings(adminSettings);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [setSettings]);

  const overview = stats?.overview || {};
  const insights = stats?.insights || {};
  const dailyRevenue = getSeriesValue(stats?.charts?.dailyRevenue, "day");
  const weeklyRevenue = getSeriesValue(stats?.charts?.weeklyRevenue, "week");
  const monthlyRevenue = getSeriesValue(stats?.charts?.monthlyRevenue, "month");
  const totalOrders = Number(overview.totalOrders || 0);

  const spotlightProducts = useMemo(() => (insights.bestSellingProducts || []).slice(0, 3), [insights.bestSellingProducts]);

  if (loading) {
    return <LoadingScreen label="Loading admin dashboard..." />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin overview</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Run {settings.storeName} without the clutter</h1>
        </div>
        <div className="rounded-[28px] border border-brand-400/20 bg-gradient-to-r from-brand-500/20 to-cyan-400/10 px-5 py-4 text-sm text-slate-100">
          Settings now live in their own page so overview stays focused on decisions.
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <SectionCard
        eyebrow="Overview"
        title="Revenue, orders, and fast admin actions"
        description="Keep the big numbers and most-used shortcuts visible first, then jump into settings only when you need to change the store."
      >
        <div className="dashboard-card-grid">
          <StatsCard className="dashboard-card-span-2" label="Daily revenue" value={{ numericValue: dailyRevenue, type: "currency" }} helper="Revenue collected for the current calendar day." tone="brand" />
          <StatsCard label="Weekly revenue" value={{ numericValue: weeklyRevenue, type: "currency" }} helper="Revenue collected for the current ISO week." tone="emerald" />
          <StatsCard label="Monthly revenue" value={{ numericValue: monthlyRevenue, type: "currency" }} helper="Revenue collected for the current month." tone="cyan" />
          <StatsCard label="Estimated profit" value={{ numericValue: overview.estimatedProfit || 0, type: "currency" }} helper="Based on paid orders minus cost pricing." tone="amber" />
          <StatsCard label="Conversion rate" value={{ numericValue: overview.conversionRate || 0, type: "percent" }} helper={`${overview.totalOrders || 0} orders from ${insights.cartAdds || 0} tracked cart adds.`} tone="brand" />
          <StatsCard label="Audience" value={{ numericValue: overview.totalUsers || 0, type: "number" }} helper={`${overview.newsletterSubscribers || 0} newsletter subscribers on file.`} tone="cyan" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink to="/admin/settings" icon={Palette} title="Settings" caption="Branding, admin account, operations, and checkout rules." />
            <QuickLink to="/admin/products" icon={Boxes} title="Products" caption="Catalog, variants, trending tags, and inventory polish." tone="cyan" />
            <QuickLink to="/admin/orders" icon={ShoppingBag} title="Orders" caption="Verify payment and move orders through fulfillment." tone="emerald" />
            <QuickLink to="/admin/customers" icon={Users} title="Customers" caption="Seller workflow, payout review, and discipline actions." tone="cyan" />
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Store pulse</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Orders</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{overview.totalOrders || 0}</p>
                  <p className="mt-2 text-sm text-slate-400">All-time order volume in the current database.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Products</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{overview.totalProducts || 0}</p>
                  <p className="mt-2 text-sm text-slate-400">Products currently available across the catalog.</p>
                </div>
              </div>
            </div>

            <StatusMixCard ordersByStatus={stats?.ordersByStatus || []} totalOrders={totalOrders} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Insights"
        title="Charts, best sellers, and restock pressure"
        description="Deeper store insight stays here, but the update-heavy controls now live in their own settings workspace."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <RevenueChart title="Daily revenue" series={stats?.charts?.dailyRevenue || []} accentClass="from-brand-500 via-brand-400 to-cyan-400" />
          <RevenueChart title="Weekly revenue" series={stats?.charts?.weeklyRevenue || []} accentClass="from-emerald-500 via-emerald-400 to-cyan-400" />
          <RevenueChart title="Monthly revenue" series={stats?.charts?.monthlyRevenue || []} accentClass="from-orange-500 via-amber-400 to-brand-400" />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Best sellers</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Products driving volume</h3>
            <div className="mt-5 space-y-3">
              {spotlightProducts.length ? (
                spotlightProducts.map((product) => (
                  <div key={product._id} className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-slate-950/25 p-3">
                    <img src={resolveMediaUrl(product.images?.[0]?.url)} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{product.totalSold || 0} sold</p>
                    </div>
                    <p className="text-sm font-medium text-emerald-300">{peso(product.price)}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  Best sellers will appear once orders start accumulating.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Most viewed</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Products getting attention</h3>
            <div className="mt-5 space-y-3">
              {(insights.mostViewedProducts || []).length ? (
                insights.mostViewedProducts.slice(0, 3).map((product) => (
                  <div key={product._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                    <div className="flex items-center gap-3">
                      <img src={resolveMediaUrl(product.images?.[0]?.url)} alt={product.name} className="h-14 w-14 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{product.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{product.views || 0} views</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  Product view insights will populate as shoppers browse the store.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Restock watch</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Low-stock alerts</h3>
            <div className="mt-5 space-y-3">
              {(insights.lowStockProducts || []).length ? (
                insights.lowStockProducts.slice(0, 4).map((product) => (
                  <div key={product._id} className="rounded-[24px] border border-orange-400/15 bg-orange-500/10 p-4">
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-300">{product.category}</p>
                    <p className="mt-3 text-sm text-orange-100">{product.stock || 0} left in stock</p>
                  </div>
                ))
              ) : (
                <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  No products are under the current low-stock threshold.
                </p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
