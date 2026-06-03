import { CalendarClock, CheckCircle2, PackageCheck, Truck, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import InstallmentCompletionSnapshot from "../../components/common/InstallmentCompletionSnapshot";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderTimeline from "../../components/common/OrderTimeline";
import { peso } from "../../utils/commerce";
import {
  formatInstallmentStatus,
  getInstallmentDueMeta,
  getInstallmentProgress,
  getInstallmentStatusTone
} from "../../utils/installments";
import { buildTrackOrderUrl, getOrderReference, getOrderTrackingSteps } from "../../utils/orders";

const initialDraft = {
  amount: "",
  method: "gcash",
  paymentDate: "",
  proof: null
};

const installmentSections = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed archive" },
  { key: "cancelled", label: "Cancelled archive" }
];

function getInstallmentShippingMeta(order) {
  const status = String(order?.status || "").toLowerCase();
  const installment = order?.installment || {};
  const readyToShip = Boolean(installment.releasedEarly || Number(installment.remainingBalance || 0) <= 0);

  if (status === "delivered") {
    return {
      label: "Delivered",
      tone: "text-emerald-200",
      detail: "Your installment item has been delivered.",
      canTrack: true
    };
  }

  if (["shipped", "out_for_delivery"].includes(status)) {
    return {
      label: status === "out_for_delivery" ? "Out for delivery" : "Shipped",
      tone: "text-cyan-200",
      detail: "Your item is already in transit. You can continue tracking it from the order tracker.",
      canTrack: true
    };
  }

  if (["processing", "packed", "verified", "paid"].includes(status) && readyToShip) {
    return {
      label: "Preparing for shipment",
      tone: "text-amber-200",
      detail: "Your installment has cleared release requirements and the store can now prepare it for shipping.",
      canTrack: true
    };
  }

  if (readyToShip) {
    return {
      label: "Ready to ship",
      tone: "text-amber-200",
      detail: "Your payment requirement is complete. The item is now waiting for admin shipping action.",
      canTrack: true
    };
  }

  return {
    label: "Awaiting release",
    tone: "text-slate-300",
    detail:
      installment.releaseCondition === "admin_approved_early_release"
        ? "Your item can only be released after full payment or when admin approves early release."
        : "Your item will be released after full installment payment is completed.",
    canTrack: false
  };
}

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageOrderId, setMessageOrderId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState("");
  const [activeSection, setActiveSection] = useState("active");

  async function loadInstallments() {
    try {
      const { data } = await api.get("/orders/installments/mine");
      setInstallments(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load installments.");
    }
  }

  useEffect(() => {
    loadInstallments();
  }, []);

  const allInstallments = useMemo(() => installments || [], [installments]);
  const sectionCounts = useMemo(
    () => ({
      active: allInstallments.filter((order) => !["completed", "cancelled"].includes(String(order.installment?.status || "").toLowerCase())).length,
      completed: allInstallments.filter((order) => String(order.installment?.status || "").toLowerCase() === "completed").length,
      cancelled: allInstallments.filter((order) => String(order.installment?.status || "").toLowerCase() === "cancelled").length
    }),
    [allInstallments]
  );
  const visibleInstallments = useMemo(() => {
    if (activeSection === "completed") {
      return allInstallments.filter((order) => String(order.installment?.status || "").toLowerCase() === "completed");
    }

    if (activeSection === "cancelled") {
      return allInstallments.filter((order) => String(order.installment?.status || "").toLowerCase() === "cancelled");
    }

    return allInstallments.filter((order) => !["completed", "cancelled"].includes(String(order.installment?.status || "").toLowerCase()));
  }, [activeSection, allInstallments]);

  function updateDraft(orderId, field, value) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || initialDraft),
        [field]: value
      }
    }));
  }

  async function handleSubmitPayment(order) {
    const draft = drafts[order._id] || initialDraft;

    if (!draft.amount || !draft.method || !draft.proof) {
      setError("Please complete the installment payment form and attach proof before submitting.");
      return;
    }

    try {
      setSubmittingId(order._id);
      setError("");
      setMessage("");
      setMessageOrderId("");
      const payload = new FormData();
      payload.append("amount", draft.amount);
      payload.append("method", draft.method);
      payload.append("paymentDate", draft.paymentDate || new Date().toISOString());
      payload.append("image", draft.proof);

      const { data } = await api.post(`/orders/${order._id}/installment-payments`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setInstallments((current) =>
        (current || []).map((entry) => (entry._id === order._id ? data.order : entry))
      );
      setDrafts((current) => ({
        ...current,
        [order._id]: initialDraft
      }));
      setMessage(data.message || "Installment payment submitted.");
      setMessageOrderId(order._id);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit installment payment.");
      setMessageOrderId(order._id);
    } finally {
      setSubmittingId("");
    }
  }

  if (!installments && !error) {
    return <LoadingScreen label="Loading your installments..." />;
  }

  return (
    <div className="page-shell space-y-6 py-10">
      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Customer dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">My installments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Track your active gadget installment plans, check remaining balance, and submit payment proof for admin verification.
          Payments made are non-refundable under the installment agreement.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {installmentSections.map((section) => (
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
            <p className="mt-2 text-3xl font-semibold text-white">{sectionCounts[section.key] || 0}</p>
          </button>
        ))}
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

      {visibleInstallments.length ? (
        visibleInstallments.map((order) => {
          const progress = getInstallmentProgress(order);
          const dueMeta = getInstallmentDueMeta(order.installment);
          const draft = drafts[order._id] || initialDraft;
          const pendingVerification = order.installment?.payments?.some((payment) => payment.status === "pending_verification");
          const shippingMeta = getInstallmentShippingMeta(order);
          const trackUrl = buildTrackOrderUrl(getOrderReference(order), order.shippingAddress?.email || "");
          const isArchived = ["completed", "cancelled"].includes(String(order.installment?.status || "").toLowerCase());
          const isCancelled = String(order.installment?.status || "").toLowerCase() === "cancelled";

          return (
            <section key={order._id} className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Installment ID</p>
                  <p className="mt-2 text-lg font-semibold tracking-[0.08em] text-white">{getOrderReference(order)}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {order.items?.[0]?.name} {order.items?.length > 1 ? `+ ${order.items.length - 1} more item(s)` : ""}
                  </p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-2 text-sm ${getInstallmentStatusTone(order.installment?.status)}`}>
                  {formatInstallmentStatus(order.installment?.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Total price</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.totalWithServiceFee || order.pricing?.total)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Down payment</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.downPaymentAmount)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Amount paid</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.amountPaid)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Remaining balance</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{peso(order.installment?.remainingBalance)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[26px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                  <span>Payment progress</span>
                  <span>{progress}% paid</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-950/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                  <span>Next due: {order.installment?.nextDueDate ? new Date(order.installment.nextDueDate).toLocaleDateString() : "All paid"}</span>
                  <span>{order.installment?.frequency === "monthly" ? "Monthly" : "Weekly"} x {order.installment?.paymentCount}</span>
                  <span>Grace period: {order.installment?.gracePeriodDays} day(s)</span>
                  <span className={dueMeta.tone}>{dueMeta.label}</span>
                </div>
              </div>

              <div className="mt-5 rounded-[26px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <PackageCheck size={16} className="text-cyan-300" />
                      Release and shipping
                    </div>
                    <p className={`mt-3 text-lg font-semibold ${shippingMeta.tone}`}>{shippingMeta.label}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{shippingMeta.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>
                        Release condition: {order.installment?.releaseCondition === "admin_approved_early_release" ? "Full payment or admin-approved early release" : "After full payment"}
                      </span>
                      <span>Order status: {String(order.status || "pending").replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  {shippingMeta.canTrack ? (
                    <Link
                      to={trackUrl}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      <Truck size={16} className="mr-2" />
                      Track installment item
                    </Link>
                  ) : null}
                </div>
              </div>
              {isArchived ? <InstallmentCompletionSnapshot order={order} /> : null}

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-4">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <Truck size={16} className="text-cyan-300" />
                      Shipping timeline
                    </div>
                    <div className="mt-4">
                      <OrderTimeline steps={getOrderTrackingSteps(order)} compact />
                    </div>
                  </div>
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <CalendarClock size={16} className="text-cyan-300" />
                      Payment schedule
                    </div>
                    <div className="mt-4 space-y-3">
                      {(order.installment?.schedule || []).map((entry) => (
                        <div key={entry.sequence} className="flex flex-col gap-2 rounded-[22px] border border-white/10 bg-slate-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-white">Payment {entry.sequence}</p>
                            <p className="text-sm text-slate-400">Due {new Date(entry.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-white">{peso(entry.amount)}</span>
                            <span className={`rounded-full border px-3 py-1 text-xs ${getInstallmentStatusTone(entry.status === "paid" ? "completed" : entry.status === "pending_verification" ? "pending_verification" : entry.status === "late" ? "late" : "active")}`}>
                              {entry.status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <CheckCircle2 size={16} className="text-emerald-300" />
                      Payment history
                    </div>
                    <div className="mt-4 space-y-3">
                      {(order.installment?.payments || []).length ? (
                        order.installment.payments.map((payment) => (
                          <div key={payment._id} className="rounded-[22px] border border-white/10 bg-slate-950/20 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">{payment.phase === "down_payment" ? "Down payment" : "Installment payment"}</p>
                                <p className="text-sm text-slate-400">{new Date(payment.submittedAt).toLocaleString()}</p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs ${getInstallmentStatusTone(payment.status === "approved" ? "completed" : payment.status === "rejected" ? "cancelled" : "pending_verification")}`}>
                                {payment.status.replaceAll("_", " ")}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                              <span>{peso(payment.amount)}</span>
                              <span className="capitalize">{String(payment.method || "").replaceAll("_", " ")}</span>
                              {payment.adminNote ? <span>Admin: {payment.adminNote}</span> : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                          No submitted installment payments yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                    <Upload size={16} className="text-amber-300" />
                    {isArchived ? "Installment archive" : "Submit payment"}
                  </div>
                  {isArchived ? (
                    <div className="mt-4 space-y-3">
                      <div className={`rounded-[22px] border px-4 py-4 text-sm ${
                        isCancelled
                          ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                          : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                      }`}>
                        {isCancelled
                          ? "This installment was cancelled / forfeited by admin. Payment submissions are now locked and this record is kept here for viewing only."
                          : "This installment is fully paid. Payment submissions are closed and this record now stays in your completed archive."}
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-slate-950/20 px-4 py-4 text-sm text-slate-300">
                        {isCancelled
                          ? order.installment?.cancelledReason || "Cancelled installment record."
                          : "You can still review your payment history and shipping progress from this archived installment record."}
                      </div>
                      {shippingMeta.canTrack ? (
                        <Link
                          to={trackUrl}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          <Truck size={16} className="mr-2" />
                          Track installment item
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Upload your payment proof for admin verification. Duplicate submissions are blocked while one payment is still pending.
                      </p>
                      {pendingVerification ? (
                        <div className="mt-4 rounded-[22px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                          You already have a submitted payment waiting for admin verification. Review will need to finish before you can upload another payment.
                        </div>
                      ) : null}
                      <div className="mt-4 space-y-3">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={draft.amount}
                          onChange={(event) => updateDraft(order._id, "amount", event.target.value)}
                          placeholder="Amount paid"
                          disabled={pendingVerification}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                        />
                        <select
                          value={draft.method}
                          onChange={(event) => updateDraft(order._id, "method", event.target.value)}
                          disabled={pendingVerification}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                        >
                          <option value="gcash">GCash</option>
                          <option value="maya">Maya</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="paypal">PayPal</option>
                          <option value="stripe">Stripe</option>
                        </select>
                        <input
                          type="date"
                          value={draft.paymentDate}
                          onChange={(event) => updateDraft(order._id, "paymentDate", event.target.value)}
                          disabled={pendingVerification}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => updateDraft(order._id, "proof", event.target.files?.[0] || null)}
                          disabled={pendingVerification}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                          Payments made are non-refundable under installment agreement.
                        </div>
                        {message && messageOrderId === order._id ? (
                          <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            {message}
                          </div>
                        ) : null}
                        {error && messageOrderId === order._id ? (
                          <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                            {error}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSubmitPayment(order)}
                          disabled={pendingVerification || submittingId === order._id || ["completed", "cancelled"].includes(order.installment?.status)}
                          className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submittingId === order._id ? "Submitting..." : pendingVerification ? "Waiting for admin verification" : "Submit payment proof"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <div className="glass-panel rounded-[32px] p-6 shadow-ambient text-slate-300">
          {activeSection === "active"
            ? "You do not have any active installment purchases right now."
            : activeSection === "completed"
              ? "No completed installment records in your archive yet."
              : "No cancelled installment records in your archive yet."}
        </div>
      )}
    </div>
  );
}
