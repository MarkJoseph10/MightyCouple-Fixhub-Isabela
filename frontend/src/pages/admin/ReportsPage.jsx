import { Download, ExternalLink, FileClock, RefreshCcw, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import StatsCard from "../../components/admin/StatsCard";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";
import { getOrderReference } from "../../utils/orders";

const REPORT_RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
  { key: "all", label: "All time" }
];

function formatDate(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRangeLabel(range) {
  return REPORT_RANGES.find((option) => option.key === range)?.label || "All time";
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

function MiniBarChart({ title, series = [], accentClass }) {
  const maxValue = Math.max(...series.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{title}</p>
      <div className="mt-5 grid h-40 grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-end gap-2">
        {series.length ? (
          series.map((item) => {
            const height = `${Math.max(12, (Number(item.value || 0) / maxValue) * 100)}%`;

            return (
              <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                <div className="text-[11px] text-slate-400">{peso(item.value)}</div>
                <div className="flex w-full items-end">
                  <div className={`w-full rounded-t-2xl bg-gradient-to-t ${accentClass}`} style={{ height }} />
                </div>
                <div className="text-[11px] text-slate-500">{item.label}</div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-[20px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            No chart data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildReportCsv({
  reportRange,
  stats,
  adminActions,
  systemIncidents,
  recentOrders,
  topProducts,
  viewedProducts,
  lowStockProducts
}) {
  const overview = stats?.overview || {};
  const insights = stats?.insights || {};

  return [
    ["Section", "Metric", "Value"],
    ["Report range", "Current period", formatRangeLabel(reportRange)],
    ["Overview", "Total sales", peso(overview.totalSales || 0)],
    ["Overview", "Orders", overview.totalOrders || 0],
    ["Overview", "Products", overview.totalProducts || 0],
    ["Overview", "Users", overview.totalUsers || 0],
    ["Overview", "Estimated profit", peso(overview.estimatedProfit || 0)],
    ["Overview", "Conversion rate", `${Number(overview.conversionRate || 0).toFixed(1)}%`],
    ["Overview", "Newsletter subscribers", overview.newsletterSubscribers || 0],
    ["Insights", "Cart adds tracked", insights.cartAdds || 0],
    ["Insights", "Best sellers listed", topProducts.length],
    ["Insights", "Most viewed listed", viewedProducts.length],
    ["Insights", "Low stock items listed", lowStockProducts.length],
    ["Revenue", "Daily points", (stats?.charts?.dailyRevenue || []).length],
    ["Revenue", "Weekly points", (stats?.charts?.weeklyRevenue || []).length],
    ["Revenue", "Monthly points", (stats?.charts?.monthlyRevenue || []).length],
    [],
    ["Recent Orders"],
    ["Created", "Order Reference", "Customer", "Email", "Status", "Total"],
    ...(recentOrders || []).map((order) => [
      formatDate(order.createdAt),
      getOrderReference(order),
      order.user?.name || "Guest",
      order.user?.email || order.shippingAddress?.email || "No email",
      order.status || "",
      peso(order.pricing?.total || 0)
    ]),
    [],
    ["Recent Admin Activity"],
    ["Created", "Title", "Actor", "Role", "Category", "Severity", "Link"],
    ...(adminActions || []).map((entry) => [
      formatDate(entry.createdAt),
      entry.title || "",
      entry.actorName || "System",
      entry.actorRole || "system",
      entry.category || "system",
      entry.severity || "info",
      entry.link || ""
    ]),
    [],
    ["System Incidents"],
    ["Created", "Title", "Message", "Actor", "Severity"],
    ...(systemIncidents || []).map((entry) => [
      formatDate(entry.createdAt),
      entry.title || "",
      entry.message || "",
      entry.actorName || "System",
      entry.severity || "danger"
    ]),
    [],
    ["Products"],
    ["Top Seller", "Product", "Sold", "Price"],
    ...(topProducts || []).map((product) => [product.name || "", product.totalSold || 0, peso(product.price || 0)]),
    [],
    ["Products"],
    ["Most Viewed", "Product", "Views", "Sold"],
    ...(viewedProducts || []).map((product) => [product.name || "", product.viewsCount || 0, product.totalSold || 0]),
    [],
    ["Products"],
    ["Low Stock", "Product", "Stock", "Category"],
    ...(lowStockProducts || []).map((product) => [product.name || "", product.stock || 0, product.category || ""])
  ];
}

function MonitoringCard({ incidents = [] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Production monitoring</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Recent system incidents</h3>
        </div>
        <div className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">
          {incidents.length} alerts
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {incidents.length ? (
          incidents.map((entry) => (
            <div key={entry._id} className="rounded-[24px] border border-rose-400/15 bg-rose-500/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{entry.title}</p>
                  <p className="mt-1 text-sm text-rose-100/80">{entry.message}</p>
                </div>
                <span className="rounded-full border border-rose-400/20 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-100">
                  {entry.severity || "danger"}
                </span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-rose-100/70">
                {formatDate(entry.createdAt)} · {entry.actorName || "System"} · {entry.category || "system"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            No recent critical incidents. Backend errors will appear here automatically.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [adminActions, setAdminActions] = useState([]);
  const [systemIncidents, setSystemIncidents] = useState([]);
  const [reportRange, setReportRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      try {
        const [{ data: statsData }, { data: adminActivityData }, { data: incidentsData }] = await Promise.all([
          api.get("/stats", { params: { range: reportRange } }),
          api.get("/activity-logs", { params: { limit: 6, category: "all" } }),
          api.get("/activity-logs", { params: { limit: 6, category: "system", severity: "danger" } })
        ]);

        if (!active) {
          return;
        }

        setStats(statsData);
        setAdminActions(adminActivityData.logs || []);
        setSystemIncidents(incidentsData.logs || []);
        setLastRefreshedAt(new Date());
        setError("");
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(requestError.response?.data?.message || "Unable to load reports.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, [reportRange]);

  const overview = stats?.overview || {};
  const insights = stats?.insights || {};
  const recentOrders = useMemo(() => (stats?.recentOrders || []).slice(0, 5), [stats?.recentOrders]);
  const topProducts = useMemo(() => (insights.bestSellingProducts || []).slice(0, 4), [insights.bestSellingProducts]);
  const viewedProducts = useMemo(() => (insights.mostViewedProducts || []).slice(0, 4), [insights.mostViewedProducts]);
  const lowStockProducts = useMemo(() => (insights.lowStockProducts || []).slice(0, 4), [insights.lowStockProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [{ data: statsData }, { data: adminActivityData }, { data: incidentsData }] = await Promise.all([
        api.get("/stats", { params: { range: reportRange } }),
        api.get("/activity-logs", { params: { limit: 6, category: "all" } }),
        api.get("/activity-logs", { params: { limit: 6, category: "system", severity: "danger" } })
      ]);

      setStats(statsData);
      setAdminActions(adminActivityData.logs || []);
      setSystemIncidents(incidentsData.logs || []);
      setLastRefreshedAt(new Date());
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to refresh reports.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const rows = buildReportCsv({
        reportRange,
        stats,
        adminActions,
        systemIncidents,
        recentOrders,
        topProducts,
        viewedProducts,
        lowStockProducts
      });
      downloadCsv(`shopverse-report-${reportRange}.csv`, rows);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading reports..." />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Analytics</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Reports and store intelligence</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Review revenue, fulfillment, restock pressure, and recent admin activity in one place without digging through other pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/activity-log" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            <FileClock size={16} />
            Activity log
          </Link>
          <Link to="/admin/orders" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            <ShoppingBag size={16} />
            Orders
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Report period</p>
            <p className="mt-2 text-sm text-slate-300">Current view: {formatRangeLabel(reportRange)}</p>
            {lastRefreshedAt ? <p className="mt-1 text-xs text-slate-500">Last refreshed {formatDate(lastRefreshedAt)}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {REPORT_RANGES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setReportRange(option.key)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  reportRange === option.key
                    ? "border-brand-400/40 bg-brand-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <SectionCard
        eyebrow="Summary"
        title="Revenue, audience, and conversion snapshot"
        description="A single place for the numbers that usually get asked during internal reviews."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatsCard label="Total sales" value={{ numericValue: overview.totalSales || 0, type: "currency" }} helper="Paid orders collected to date." tone="brand" />
          <StatsCard label="Orders" value={{ numericValue: overview.totalOrders || 0, type: "number" }} helper="All orders in the selected period." tone="emerald" />
          <StatsCard label="Products" value={{ numericValue: overview.totalProducts || 0, type: "number" }} helper="Active catalog size." tone="cyan" />
          <StatsCard label="Users" value={{ numericValue: overview.totalUsers || 0, type: "number" }} helper="Registered customer and seller accounts." tone="amber" />
          <StatsCard label="Profit" value={{ numericValue: overview.estimatedProfit || 0, type: "currency" }} helper="Estimated product margin after cost prices." tone="brand" />
          <StatsCard label="Conversion" value={{ numericValue: overview.conversionRate || 0, type: "percent" }} helper={`${insights.cartAdds || 0} tracked cart adds.`} tone="cyan" />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Monitoring"
        title="Production health and system incidents"
        description="Backend errors are surfaced here so we can spot regressions without waiting for a customer report."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <MonitoringCard incidents={systemIncidents} />
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Live signals</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Admin actions</p>
                <p className="mt-2 text-3xl font-semibold text-white">{adminActions.length}</p>
                <p className="mt-2 text-sm text-slate-400">Recent audit entries pulled for this report.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Critical incidents</p>
                <p className="mt-2 text-3xl font-semibold text-white">{systemIncidents.length}</p>
                <p className="mt-2 text-sm text-slate-400">Danger-level logs automatically recorded from backend failures.</p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Alert routing</p>
                  <p className="mt-2 font-semibold text-white">Admin notifications receive critical errors</p>
                </div>
                <Link
                  to="/notifications"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  View alerts
                  <ExternalLink size={14} />
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                When a backend 500 happens in production, it is captured in the activity log and pushed as an admin notification.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Trends"
        title="Revenue movement"
        description="Use these charts to spot daily spikes and longer term shifts before they turn into stock or cash-flow surprises."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <MiniBarChart title="Daily revenue" series={stats?.charts?.dailyRevenue || []} accentClass="from-brand-500 via-brand-400 to-cyan-400" />
          <MiniBarChart title="Weekly revenue" series={stats?.charts?.weeklyRevenue || []} accentClass="from-emerald-500 via-emerald-400 to-cyan-400" />
          <MiniBarChart title="Monthly revenue" series={stats?.charts?.monthlyRevenue || []} accentClass="from-orange-500 via-amber-400 to-brand-400" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Operations"
          title="Fulfillment and stock pressure"
          description="Track order movement, stock warnings, and recent admin actions without leaving the reports page."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Order status mix</p>
              <div className="mt-4 space-y-3">
                {(stats?.ordersByStatus || []).length ? (
                  stats.ordersByStatus.map((item) => (
                    <div key={item._id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <OrderStatusBadge status={item._id} />
                        <span className="text-sm text-slate-300">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400"
                          style={{ width: `${overview.totalOrders ? (Number(item.count || 0) / overview.totalOrders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                    No fulfillment data yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Restock watch</p>
              <div className="mt-4 space-y-3">
                {lowStockProducts.length ? (
                  lowStockProducts.map((product) => (
                    <div key={product._id} className="rounded-[24px] border border-orange-400/15 bg-orange-500/10 p-4">
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-300">{product.category}</p>
                      <p className="mt-3 text-sm text-orange-100">{product.stock || 0} left in stock</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                    No low-stock items at the current threshold.
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="History"
          title="Recent activity and order movement"
          description="A quick snapshot of what changed most recently in the store."
        >
          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Recent orders</p>
              <div className="mt-4 space-y-3">
                {recentOrders.length ? (
                  recentOrders.map((order) => (
                    <div key={order._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{getOrderReference(order)}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {order.user?.name || "Guest"} · {order.user?.email || order.shippingAddress?.email || "No email"}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{peso(order.pricing?.total || 0)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                    No recent orders to show yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Recent admin actions</p>
              <div className="mt-4 space-y-3">
                {adminActions.length ? (
                  adminActions.map((entry) => (
                    <div key={entry._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{entry.title}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {entry.actorName || "System"} · {entry.category || "system"}
                          </p>
                        </div>
                        {entry.link ? (
                          <Link to={entry.link} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10">
                            Open
                            <ExternalLink size={13} />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                    Activity will appear here once admins start making changes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Products"
        title="Attention and top performers"
        description="Use this section to see which products pull interest and which items may need inventory attention."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Top sellers</p>
            <div className="mt-4 space-y-3">
              {topProducts.length ? (
                topProducts.map((product) => (
                  <div key={product._id} className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-slate-950/25 p-3">
                    <img src={resolveMediaUrl(product.images?.[0]?.url)} alt={product.name} className="h-14 w-14 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{product.totalSold || 0} sold</p>
                    </div>
                    <p className="text-sm font-medium text-emerald-300">{peso(product.price)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  Top sellers will populate once sales start coming in.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Most viewed</p>
            <div className="mt-4 space-y-3">
              {viewedProducts.length ? (
                viewedProducts.map((product) => (
                  <div key={product._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{product.viewsCount || 0} views</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  Browsing insights will appear here as shoppers use the site.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Operational notes</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                <p className="font-semibold text-white">Newsletter subscribers</p>
                <p className="mt-1 text-slate-400">{overview.newsletterSubscribers || 0} total subscribers on file.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                <p className="font-semibold text-white">Cart adds tracked</p>
                <p className="mt-1 text-slate-400">{insights.cartAdds || 0} cart adds recorded for conversion analysis.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                <p className="font-semibold text-white">Low-stock threshold</p>
                <p className="mt-1 text-slate-400">
                  {lowStockProducts.length ? `${lowStockProducts.length} products are already near restock.` : "No current products are below the threshold."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
