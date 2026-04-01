import {
  Ban,
  CalendarRange,
  CheckCircle2,
  Copy,
  CreditCard,
  Filter,
  RotateCcw,
  Search,
  Truck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { copyText, formatRefundReason, getOrderReference } from "../../utils/orders";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

const sectionMeta = {
  "pending-payments": {
    label: "Pending Payments",
    description: "Orders waiting for payment confirmation and proof review.",
    icon: CreditCard,
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
    ring: "ring-amber-400/30"
  },
  "active-orders": {
    label: "Active Orders",
    description: "Paid and in-progress transactions that still need fulfillment actions.",
    icon: Truck,
    accent: "from-sky-500/20 via-cyan-500/10 to-transparent",
    ring: "ring-sky-400/30"
  },
  "refund-requests": {
    label: "Refund Requests",
    description: "Refund cases that need review, decisions, or completion.",
    icon: RotateCcw,
    accent: "from-rose-500/20 via-fuchsia-500/10 to-transparent",
    ring: "ring-rose-400/30"
  },
  "completed-transactions": {
    label: "Completed Transactions",
    description: "Delivered and fully completed orders kept for review and export.",
    icon: CheckCircle2,
    accent: "from-emerald-500/20 via-green-500/10 to-transparent",
    ring: "ring-emerald-400/30"
  },
  "cancelled-orders": {
    label: "Cancelled Orders",
    description: "Cancelled transactions archived away from active operational work.",
    icon: Ban,
    accent: "from-slate-500/20 via-zinc-500/10 to-transparent",
    ring: "ring-slate-400/30"
  }
};

const activeStageOptions = [
  { key: "all", label: "All active" },
  { key: "paid", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" }
];

const refundStageOptions = [
  { key: "all", label: "All refunds" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "refunded", label: "Refunded" }
];

const dateFilterOptions = [
  { key: "all", label: "Any time" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" }
];

function buildUploadUrl(path = "") {
  if (!path) {
    return "";
  }

  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${path}`;
}

function normalizeValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getOrderSection(order) {
  if (order.orderType === "installment") {
    return "installments";
  }

  if (order.refundRequest?.status) {
    return "refund-requests";
  }

  if (normalizeValue(order.status) === "cancelled") {
    return "cancelled-orders";
  }

  if (normalizeValue(order.status) === "delivered") {
    return "completed-transactions";
  }

  if (normalizeValue(order.payment?.status) === "pending") {
    return "pending-payments";
  }

  return "active-orders";
}

function getActiveStage(order) {
  const status = normalizeValue(order.status);
  const paymentStatus = normalizeValue(order.payment?.status);

  if (["shipped", "out_for_delivery"].includes(status)) {
    return "shipped";
  }

  if (status === "processing") {
    return "processing";
  }

  if (paymentStatus === "paid" || ["paid", "verified", "packed"].includes(status)) {
    return "paid";
  }

  return "all";
}

function getAllowedFulfillmentStatuses(order) {
  const currentStatus = normalizeValue(order.status);
  const paymentStatus = normalizeValue(order.payment?.status);
  const paymentMethod = normalizeValue(order.payment?.method);
  const paidOrCollectible = paymentStatus === "paid" || paymentMethod === "cod";
  const baseOptions = ["pending", "verified", "packed", "processing", "shipped", "out_for_delivery", "cancelled"];

  if (["shipped", "out_for_delivery"].includes(currentStatus) && paidOrCollectible) {
    return [...baseOptions, "delivered"];
  }

  return baseOptions;
}

function getCustomerName(order) {
  return order.user?.name || order.shippingAddress?.fullName || order.guestCustomer?.name || "Customer";
}

function getCustomerEmail(order) {
  return order.user?.email || order.shippingAddress?.email || order.guestCustomer?.email || "No email";
}

function matchesSearch(order, searchValue) {
  const needle = normalizeValue(searchValue);

  if (!needle) {
    return true;
  }

  const haystack = [
    getOrderReference(order),
    getCustomerName(order),
    getCustomerEmail(order),
    order.shippingAddress?.fullName,
    order.payment?.method,
    order.status
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function matchesDateFilter(order, dateFilter) {
  if (dateFilter === "all") {
    return true;
  }

  const days = Number(dateFilter);

  if (!Number.isFinite(days) || days <= 0) {
    return true;
  }

  const createdAt = new Date(order.createdAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return createdAt >= cutoff;
}

function matchesPaymentFilter(order, paymentFilter) {
  if (paymentFilter === "all") {
    return true;
  }

  return normalizeValue(order.payment?.method) === paymentFilter;
}

function matchesStatusFilter(order, statusFilter) {
  if (statusFilter === "all") {
    return true;
  }

  const candidates = [
    normalizeValue(order.status),
    normalizeValue(order.payment?.status),
    normalizeValue(order.refundRequest?.status)
  ];

  return candidates.includes(statusFilter);
}

function summarizeItems(order) {
  return (order.items || [])
    .slice(0, 3)
    .map((item) => `${item.name} x${item.quantity}`)
    .join(", ");
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function SectionCountCard({ sectionKey, count, active, onClick }) {
  const meta = sectionMeta[sectionKey];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/55 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-slate-900/75 ${
        active ? `ring-1 ${meta.ring} bg-slate-900/85` : ""
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.accent} opacity-90`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-400">Orders</p>
          <h3 className="mt-3 text-lg font-semibold text-white">{meta.label}</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">{meta.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative mt-6 flex items-end justify-between">
        <span className="text-3xl font-semibold text-white">{count}</span>
        <span className="text-sm font-medium text-slate-300 group-hover:text-white">Open section</span>
      </div>
    </button>
  );
}

function ProofPreview({ label, path }) {
  if (!path) {
    return null;
  }

  return (
    <a
      href={buildUploadUrl(path)}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 transition hover:border-white/20"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</p>
      </div>
      <img src={buildUploadUrl(path)} alt={label} className="h-40 w-full object-cover" />
    </a>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [activeSection, setActiveSection] = useState("pending-payments");
  const [activeStage, setActiveStage] = useState("all");
  const [refundStage, setRefundStage] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refundNoteDrafts, setRefundNoteDrafts] = useState({});

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/orders");
      setOrders(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load orders right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const paymentMethods = useMemo(() => {
    return [...new Set(orders.map((order) => normalizeValue(order.payment?.method)).filter(Boolean))];
  }, [orders]);

  const statusOptions = useMemo(() => {
    return [
      ...new Set(
        orders
          .flatMap((order) => [
            normalizeValue(order.status),
            normalizeValue(order.payment?.status),
            normalizeValue(order.refundRequest?.status)
          ])
          .filter(Boolean)
      )
    ];
  }, [orders]);

  const sectionCounts = useMemo(() => {
    return orders.reduce(
      (accumulator, order) => {
        const sectionKey = getOrderSection(order);
        if (sectionKey === "installments") {
          return accumulator;
        }
        accumulator[sectionKey] = (accumulator[sectionKey] || 0) + 1;
        return accumulator;
      },
      {
        "pending-payments": 0,
        "active-orders": 0,
        "refund-requests": 0,
        "completed-transactions": 0,
        "cancelled-orders": 0
      }
    );
  }, [orders]);

  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => order.orderType !== "installment")
      .filter((order) => getOrderSection(order) === activeSection)
      .filter((order) => matchesSearch(order, searchValue))
      .filter((order) => matchesPaymentFilter(order, paymentFilter))
      .filter((order) => matchesStatusFilter(order, statusFilter))
      .filter((order) => matchesDateFilter(order, dateFilter))
      .filter((order) => {
        if (activeSection === "active-orders" && activeStage !== "all") {
          return getActiveStage(order) === activeStage;
        }

        if (activeSection === "refund-requests" && refundStage !== "all") {
          return normalizeValue(order.refundRequest?.status) === refundStage;
        }

        return true;
      })
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [orders, activeSection, searchValue, paymentFilter, statusFilter, dateFilter, activeStage, refundStage]);

  async function updateStatus(orderId, payload) {
    try {
      setError("");
      setMessage("");
      const { data } = await api.patch(`/orders/${orderId}/status`, payload);
      setOrders((current) => current.map((order) => (order._id === orderId ? data : order)));
      setMessage("Order updated successfully.");
    } catch (updateError) {
      setError(updateError.response?.data?.message || "Unable to update this order.");
    }
  }

  async function updateRefundStatus(orderId, status) {
    try {
      setError("");
      setMessage("");
      const adminMessage = refundNoteDrafts[orderId] || "";
      const { data } = await api.patch(`/orders/${orderId}/refund`, { status, adminMessage });
      setOrders((current) => current.map((order) => (order._id === orderId ? data.order : order)));
      setMessage(data.message || "Refund updated successfully.");
    } catch (updateError) {
      setError(updateError.response?.data?.message || "Unable to update refund status.");
    }
  }

  async function handleCopyOrderId(order) {
    const copied = await copyText(getOrderReference(order));
    setMessage(copied ? "Order ID copied." : "Could not copy Order ID.");
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky-300">Order management</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Transaction workflow center</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Orders are now separated by operational stage so admin only sees the actions that matter:
              pending payment reviews, active fulfillment, refund cases, completed records, and cancelled transactions.
            </p>
            <p className="mt-2 text-sm text-cyan-200">Installment / Paluwagan transactions are managed separately in the new Installments section.</p>
          </div>
          <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-4 sm:grid-cols-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">Total orders</p>
              <p className="mt-2 text-2xl font-semibold text-white">{orders.length}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">Active queues</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {sectionCounts["pending-payments"] + sectionCounts["active-orders"] + sectionCounts["refund-requests"]}
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">Completed and archived</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {sectionCounts["completed-transactions"] + sectionCounts["cancelled-orders"]}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.keys(sectionMeta).map((sectionKey) => (
            <SectionCountCard
              key={sectionKey}
              sectionKey={sectionKey}
              count={sectionCounts[sectionKey]}
              active={activeSection === sectionKey}
              onClick={() => setActiveSection(sectionKey)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">Current section</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{sectionMeta[activeSection].label}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{sectionMeta[activeSection].description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <Filter className="h-4 w-4" />
                {visibleOrders.length} visible records
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <CalendarRange className="h-4 w-4" />
                {dateFilter === "all" ? "All dates" : `${dateFilter} day window`}
              </span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by Order ID or customer"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All payment methods</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            >
              {dateFilterOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {activeSection === "active-orders" ? (
            <div className="flex flex-wrap gap-3">
              {activeStageOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveStage(option.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeStage === option.key
                      ? "bg-sky-500 text-slate-950"
                      : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {activeSection === "refund-requests" ? (
            <div className="flex flex-wrap gap-3">
              {refundStageOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRefundStage(option.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    refundStage === option.key
                      ? "bg-rose-500 text-white"
                      : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          {loading ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-slate-400">
              Loading orders...
            </div>
          ) : null}

          {!loading && !visibleOrders.length ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center">
              <p className="text-lg font-semibold text-white">No matching orders in this section.</p>
              <p className="mt-3 text-sm text-slate-400">Try clearing a filter or switch to another transaction category.</p>
            </div>
          ) : null}

          {!loading && visibleOrders.length ? (
            <div className="grid gap-5">
              {visibleOrders.map((order) => (
                <article
                  key={order._id}
                  className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/85 shadow-[0_18px_55px_rgba(15,23,42,0.25)]"
                >
                  <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.05] to-transparent px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">
                            {getOrderReference(order)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOrderId(order)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                          >
                            <Copy className="h-4 w-4" />
                            Copy Order ID
                          </button>
                          <OrderStatusBadge status={order.status} />
                          <OrderStatusBadge status={order.payment?.status} />
                          {order.refundRequest?.status ? <OrderStatusBadge status={order.refundRequest.status} /> : null}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{getCustomerName(order)}</h3>
                          <p className="mt-1 text-sm text-slate-400">{getCustomerEmail(order)}</p>
                        </div>
                        <p className="max-w-4xl text-sm leading-6 text-slate-300">{summarizeItems(order) || "Order items unavailable"}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:w-[22rem] xl:grid-cols-1">
                        <DetailItem label="Placed on" value={formatDate(order.createdAt)} />
                        <DetailItem label="Order total" value={peso.format(order.pricing?.total || 0)} />
                        <DetailItem label="Payment method" value={String(order.payment?.method || "N/A").replaceAll("_", " ")} />
                        <DetailItem
                          label="Items"
                          value={`${(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} units`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 px-5 py-6 sm:px-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <DetailItem label="Shipping to" value={order.shippingAddress?.fullName || "No recipient"} />
                        <DetailItem
                          label="Location"
                          value={[order.shippingAddress?.city, order.shippingAddress?.province].filter(Boolean).join(", ") || "No location"}
                        />
                        <DetailItem label="Contact" value={order.shippingAddress?.phone || "No phone"} />
                        <DetailItem label="Updated" value={formatDate(order.updatedAt)} />
                      </div>

                      {(order.payment?.proofImage || order.refundRequest?.proofImage) ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProofPreview label="Payment proof" path={order.payment?.proofImage} />
                          <ProofPreview label="Refund proof" path={order.refundRequest?.proofImage} />
                        </div>
                      ) : null}

                      {order.notes ? (
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">Notes</p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">{order.notes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-5">
                      {(activeSection === "pending-payments" || activeSection === "active-orders") ? (
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">Operational actions</p>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 text-sm text-slate-300">
                              <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Payment status
                              </span>
                              <select
                                value={order.payment?.status || "pending"}
                                onChange={(event) => updateStatus(order._id, { paymentStatus: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none"
                              >
                                {["pending", "paid"].map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2 text-sm text-slate-300">
                              <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Fulfillment status
                              </span>
                              <select
                                value={order.status || "pending"}
                                onChange={(event) => updateStatus(order._id, { status: event.target.value })}
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none"
                              >
                                {getAllowedFulfillmentStatuses(order).map((status) => (
                                  <option key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-slate-400">
                            Completed, refunded, and cancelled records automatically leave the active workflow after status changes.
                          </p>
                        </div>
                      ) : null}

                      {activeSection === "refund-requests" ? (
                        <div className="rounded-[24px] border border-rose-400/15 bg-rose-500/[0.06] p-5">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-rose-200/80">Refund case</p>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <DetailItem label="Refund reason" value={formatRefundReason(order.refundRequest?.reason)} />
                            <DetailItem label="Requested on" value={formatDate(order.refundRequest?.requestedAt)} />
                          </div>
                          {order.refundRequest?.message ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm leading-6 text-slate-300">
                              {order.refundRequest.message}
                            </div>
                          ) : null}
                          <textarea
                            value={refundNoteDrafts[order._id] ?? order.refundRequest?.adminMessage ?? ""}
                            onChange={(event) =>
                              setRefundNoteDrafts((current) => ({ ...current, [order._id]: event.target.value }))
                            }
                            rows={3}
                            placeholder="Add an admin note for this refund case"
                            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                          />
                          <div className="mt-4 flex flex-wrap gap-3">
                            {["approved", "rejected", "refunded"].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateRefundStatus(order._id, status)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  status === "approved"
                                    ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
                                    : status === "rejected"
                                      ? "bg-rose-500 text-white hover:bg-rose-400"
                                      : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                }`}
                              >
                                Mark as {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {(activeSection === "completed-transactions" || activeSection === "cancelled-orders") ? (
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">Record status</p>
                          <p className="mt-4 text-sm leading-7 text-slate-300">
                            This transaction is already archived in its final section. It stays searchable here for review, export, and audit purposes, but no active fulfillment controls are shown.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
