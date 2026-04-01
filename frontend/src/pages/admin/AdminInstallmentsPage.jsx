import { CalendarRange, CheckCircle2, CreditCard, Search, ShieldAlert, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";
import {
  formatInstallmentStatus,
  getInstallmentDueMeta,
  getInstallmentProgress,
  getInstallmentStatusTone
} from "../../utils/installments";
import { getOrderReference } from "../../utils/orders";

const sections = [
  { key: "active", label: "Active" },
  { key: "pending_verification", label: "Pending Verification" },
  { key: "late", label: "Late" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" }
];

function getInstallmentShipmentMeta(order) {
  const status = String(order?.status || "").toLowerCase();
  const installment = order?.installment || {};
  const readyToShip = Boolean(installment.releasedEarly || Number(installment.remainingBalance || 0) <= 0);

  if (status === "delivered") {
    return {
      label: "Delivered",
      detail: "Installment item is already delivered.",
      tone: "text-emerald-200",
      readyToShip: true
    };
  }

  if (["shipped", "out_for_delivery"].includes(status)) {
    return {
      label: status === "out_for_delivery" ? "Out for delivery" : "Shipped",
      detail: "Item is already in transit.",
      tone: "text-cyan-200",
      readyToShip: true
    };
  }

  if (["processing", "packed", "verified", "paid"].includes(status) && readyToShip) {
    return {
      label: "Ready to ship",
      detail: "Release requirements are complete. Admin can now continue fulfillment from this screen.",
      tone: "text-amber-200",
      readyToShip: true
    };
  }

  if (readyToShip) {
    return {
      label: "Ready to ship",
      detail: "Full payment or approved early release is complete. Shipment can be prepared now.",
      tone: "text-amber-200",
      readyToShip: true
    };
  }

  return {
    label: "Awaiting release",
    detail:
      installment.releaseCondition === "admin_approved_early_release"
        ? "Still waiting for full payment or admin-approved early release before shipment."
        : "Still waiting for full installment payment before shipment.",
    tone: "text-slate-300",
    readyToShip: false
  };
}

function getAllowedInstallmentFulfillmentStatuses(order) {
  const currentStatus = String(order?.status || "").toLowerCase();
  const shipmentMeta = getInstallmentShipmentMeta(order);

  if (currentStatus === "cancelled") {
    return ["cancelled"];
  }

  if (currentStatus === "delivered") {
    return ["delivered"];
  }

  if (["shipped", "out_for_delivery"].includes(currentStatus)) {
    return [currentStatus, "delivered"];
  }

  const statuses = shipmentMeta.readyToShip
    ? ["processing", "packed", "shipped", "out_for_delivery", "delivered"]
    : ["pending", "verified", "paid", "processing"];

  if (!statuses.includes(currentStatus) && currentStatus) {
    statuses.unshift(currentStatus);
  }

  return [...new Set(statuses)];
}

export default function AdminInstallmentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("active");
  const [searchValue, setSearchValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminNotes, setAdminNotes] = useState({});
  const [dueDateDrafts, setDueDateDrafts] = useState({});

  async function loadInstallments() {
    try {
      setLoading(true);
      const { data } = await api.get("/orders/installments");
      setOrders(data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load installments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstallments();
  }, []);

  const counts = useMemo(
    () => sections.reduce((accumulator, section) => ({
      ...accumulator,
      [section.key]: orders.filter((order) => order.installment?.status === section.key).length
    }), {}),
    [orders]
  );

  const visibleOrders = useMemo(() => {
    const needle = String(searchValue || "").trim().toLowerCase();

    return orders
      .filter((order) => order.installment?.status === activeSection)
      .filter((order) => {
        if (!needle) {
          return true;
        }

        return [
          getOrderReference(order),
          order.user?.name,
          order.user?.email,
          order.items?.[0]?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [activeSection, orders, searchValue]);

  async function reviewPayment(orderId, paymentId, status) {
    try {
      const adminNote = adminNotes[`${orderId}:${paymentId}`] || "";
      const { data } = await api.patch(`/orders/${orderId}/installment-payments/${paymentId}`, { status, adminNote });
      setOrders((current) => current.map((order) => (order._id === orderId ? data.order : order)));
      setMessage(data.message || "Installment payment updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update installment payment.");
    }
  }

  async function updateInstallment(orderId, payload) {
    try {
      const { data } = await api.patch(`/orders/${orderId}/installment`, payload);
      setOrders((current) => current.map((order) => (order._id === orderId ? data.order : order)));
      setMessage(data.message || "Installment updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update installment.");
    }
  }

  async function updateFulfillmentStatus(orderId, status) {
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((current) => current.map((order) => (order._id === orderId ? data : order)));
      setMessage("Installment fulfillment updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update installment fulfillment.");
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-cyan-300">Installment management</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Paluwagan and gadget payment center</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Installment transactions stay separate from regular orders and refunds. Review balances, approve proofs, monitor overdue accounts,
              and manage release decisions in one clean workspace.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">Total installments</p>
            <p className="mt-2 text-2xl font-semibold text-white">{orders.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveSection(section.key)}
            className={`rounded-[26px] border px-5 py-4 text-left transition duration-300 ${
              activeSection === section.key
                ? "border-cyan-400/30 bg-cyan-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Installments</p>
            <p className="mt-2 text-lg font-semibold text-white">{section.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{counts[section.key] || 0}</p>
          </button>
        ))}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by Order ID, customer name, email, or product"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      {loading ? (
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-slate-300">Loading installments...</div>
      ) : visibleOrders.length ? (
        visibleOrders.map((order) => {
          const progress = getInstallmentProgress(order);
          const dueMeta = getInstallmentDueMeta(order.installment);
          const nextSchedule = (order.installment?.schedule || []).find((entry) => entry.status !== "paid" && entry.status !== "cancelled");
          const shipmentMeta = getInstallmentShipmentMeta(order);

          return (
            <section key={order._id} className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Order ID</p>
                  <p className="mt-2 text-lg font-semibold tracking-[0.08em] text-white">{getOrderReference(order)}</p>
                  <p className="mt-2 text-sm text-slate-400">{order.user?.name} • {order.user?.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.items?.[0]?.name} {order.items?.length > 1 ? `+ ${order.items.length - 1} more item(s)` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-2 text-sm ${getInstallmentStatusTone(order.installment?.status)}`}>
                    {formatInstallmentStatus(order.installment?.status)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                    {peso(order.installment?.remainingBalance)} left
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.totalWithServiceFee)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Paid</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.amountPaid)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Next due</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {order.installment?.nextDueDate ? new Date(order.installment.nextDueDate).toLocaleDateString() : "Completed"}
                  </p>
                  <p className={`mt-2 text-sm ${dueMeta.tone}`}>{dueMeta.label}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Progress</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{progress}%</p>
                  <p className={`mt-2 text-sm ${shipmentMeta.tone}`}>{shipmentMeta.label}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[26px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                  <span>Installment progress</span>
                  <span>{progress}% paid</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-950/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-4">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <CreditCard size={16} className="text-amber-300" />
                      Payment submissions
                    </div>
                    <div className="mt-4 space-y-3">
                      {(order.installment?.payments || []).length ? (
                        order.installment.payments.map((payment) => (
                          <div key={payment._id} className="rounded-[22px] border border-white/10 bg-slate-950/20 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">{payment.phase === "down_payment" ? "Down payment" : `Installment payment ${payment.scheduleSequence || ""}`}</p>
                                <p className="text-sm text-slate-400">{new Date(payment.submittedAt).toLocaleString()}</p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs ${getInstallmentStatusTone(payment.status === "approved" ? "completed" : payment.status === "rejected" ? "cancelled" : "pending_verification")}`}>
                                {payment.status.replaceAll("_", " ")}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                              <span>{peso(payment.amount)}</span>
                              <span className="capitalize">{String(payment.method || "").replaceAll("_", " ")}</span>
                            </div>
                            {payment.proofImage ? (
                              <a
                                href={resolveMediaUrl(payment.proofImage)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex text-sm text-cyan-200 underline-offset-4 hover:underline"
                              >
                                Open proof image
                              </a>
                            ) : null}
                            <textarea
                              value={adminNotes[`${order._id}:${payment._id}`] || ""}
                              onChange={(event) => setAdminNotes((current) => ({ ...current, [`${order._id}:${payment._id}`]: event.target.value }))}
                              placeholder="Admin note"
                              className="mt-3 min-h-[84px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                            />
                            {payment.status === "pending_verification" ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => reviewPayment(order._id, payment._id, "approved")}
                                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
                                >
                                  Approve payment
                                </button>
                                <button
                                  type="button"
                                  onClick={() => reviewPayment(order._id, payment._id, "rejected")}
                                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white"
                                >
                                  Reject payment
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                          No payment submissions yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <CalendarRange size={16} className="text-cyan-300" />
                      Schedule and actions
                    </div>
                    <div className="mt-4 space-y-3">
                      {(order.installment?.schedule || []).map((entry) => (
                        <div key={entry.sequence} className="rounded-[22px] border border-white/10 bg-slate-950/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">Payment {entry.sequence}</p>
                              <p className="text-sm text-slate-400">Due {new Date(entry.dueDate).toLocaleDateString()}</p>
                            </div>
                            <span className="text-sm font-semibold text-white">{peso(entry.amount)}</span>
                          </div>
                          {nextSchedule?.sequence === entry.sequence && !["paid", "cancelled"].includes(entry.status) ? (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <input
                                type="date"
                                value={dueDateDrafts[`${order._id}:${entry.sequence}`] || ""}
                                onChange={(event) => setDueDateDrafts((current) => ({ ...current, [`${order._id}:${entry.sequence}`]: event.target.value }))}
                                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateInstallment(order._id, {
                                  action: "extend_due_date",
                                  scheduleSequence: entry.sequence,
                                  nextDueDate: dueDateDrafts[`${order._id}:${entry.sequence}`]
                                })}
                                className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200"
                              >
                                Extend due date
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <ShieldAlert size={16} className="text-rose-300" />
                      Admin controls
                    </div>
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Shipment readiness</p>
                      <p className={`mt-3 text-lg font-semibold ${shipmentMeta.tone}`}>{shipmentMeta.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{shipmentMeta.detail}</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Fulfillment status
                      </span>
                      <select
                        value={order.status || "pending"}
                        onChange={(event) => updateFulfillmentStatus(order._id, event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                      >
                        {getAllowedInstallmentFulfillmentStatuses(order).map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs leading-5 text-slate-500">
                        {shipmentMeta.readyToShip
                          ? "This installment can now move through packing, shipping, and delivery."
                          : "Shipment stays limited until full payment clears or early release is approved."}
                      </p>
                    </div>
                    <textarea
                      value={adminNotes[order._id] || ""}
                      onChange={(event) => setAdminNotes((current) => ({ ...current, [order._id]: event.target.value }))}
                      placeholder="Add internal admin note"
                      className="mt-4 min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                    />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => updateInstallment(order._id, { action: "add_note", note: adminNotes[order._id] || "" })}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200"
                      >
                        Save note
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInstallment(order._id, { action: "approve_early_release", note: adminNotes[order._id] || "" })}
                        className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white"
                      >
                        Approve early release
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInstallment(order._id, { action: "mark_completed", note: adminNotes[order._id] || "" })}
                        className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white"
                      >
                        Mark completed
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInstallment(order._id, { action: "cancel", note: adminNotes[order._id] || "" })}
                        className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-medium text-white"
                      >
                        Cancel / forfeit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-slate-300">
          No installment records matched this section.
        </div>
      )}
    </div>
  );
}
