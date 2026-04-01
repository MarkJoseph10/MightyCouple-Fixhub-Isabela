import { CalendarClock, CheckCircle2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import LoadingScreen from "../../components/common/LoadingScreen";
import { peso } from "../../utils/commerce";
import {
  formatInstallmentStatus,
  getInstallmentDueMeta,
  getInstallmentProgress,
  getInstallmentStatusTone
} from "../../utils/installments";
import { getOrderReference } from "../../utils/orders";

const initialDraft = {
  amount: "",
  method: "gcash",
  paymentDate: "",
  proof: null
};

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState("");

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

  const activeInstallments = useMemo(() => installments || [], [installments]);

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
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit installment payment.");
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

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

      {activeInstallments.length ? (
        activeInstallments.map((order) => {
          const progress = getInstallmentProgress(order);
          const dueMeta = getInstallmentDueMeta(order.installment);
          const draft = drafts[order._id] || initialDraft;
          const pendingVerification = order.installment?.payments?.some((payment) => payment.status === "pending_verification");

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

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-4">
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
                    Submit payment
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Upload your payment proof for admin verification. Duplicate submissions are blocked while one payment is still pending.
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => updateDraft(order._id, "amount", event.target.value)}
                      placeholder="Amount paid"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                    />
                    <select
                      value={draft.method}
                      onChange={(event) => updateDraft(order._id, "method", event.target.value)}
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
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateDraft(order._id, "proof", event.target.files?.[0] || null)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-white"
                    />
                    <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      Payments made are non-refundable under installment agreement.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubmitPayment(order)}
                      disabled={pendingVerification || submittingId === order._id || ["completed", "cancelled"].includes(order.installment?.status)}
                      className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingId === order._id ? "Submitting..." : pendingVerification ? "Waiting for admin verification" : "Submit payment proof"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <div className="glass-panel rounded-[32px] p-6 shadow-ambient text-slate-300">
          You do not have any installment purchases yet.
        </div>
      )}
    </div>
  );
}
