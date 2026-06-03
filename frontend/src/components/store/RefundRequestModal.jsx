import { AlertCircle, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";

const refundReasons = [
  { value: "defective_item", label: "Defective item" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Item not as described" },
  { value: "damaged_in_transit", label: "Damaged in transit" },
  { value: "changed_mind", label: "Changed mind" },
  { value: "other", label: "Other" }
];

export default function RefundRequestModal({ open, order, onClose, onSubmitted }) {
  const [reason, setReason] = useState("defective_item");
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("defective_item");
      setMessage("");
      setProofFile(null);
      setStatusMessage("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open || !order) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage("");

    try {
      const payload = new FormData();
      payload.append("reason", reason);
      payload.append("message", message);

      if (proofFile) {
        payload.append("image", proofFile);
      }

      const { data } = await api.post(`/orders/${order._id}/refund-request`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setStatusMessage(data.message || "Refund request submitted.");
      onSubmitted?.(data.order, data.message || "Refund request submitted.");
    } catch (requestError) {
      setStatusMessage(requestError.response?.data?.message || "Unable to submit the refund request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-[32px] p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Request refund</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Create a refund request for this order</h2>
            <p className="mt-2 text-sm text-slate-400">
              Share the reason and any extra notes so the store team can review it faster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Reason for refund</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            >
              {refundReasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Message for admin</span>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Explain what happened and what resolution you need."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="flex items-center justify-between rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <Upload size={16} className="text-brand-100" />
              {proofFile ? proofFile.name : "Upload proof image (optional)"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProofFile(event.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {order.refundEligibility?.refundWindowDays ? (
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Refund requests are accepted within {order.refundEligibility.refundWindowDays} day(s) after the eligible paid or delivered status.
                </p>
              </div>
            </div>
          ) : null}

          {statusMessage && (
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit refund request"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-5 py-3 text-slate-200 transition hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
