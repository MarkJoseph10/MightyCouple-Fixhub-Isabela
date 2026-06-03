import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function SellerApplyPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    businessName: "",
    displayName: "",
    phone: "",
    description: "",
    gcashNumber: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      displayName: current.displayName || user?.name || "",
      phone: current.phone || user?.phone || ""
    }));
  }, [user?.name, user?.phone]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/users/seller/apply", form);
      await refreshUser();
      setMessage(data.message || "Seller application submitted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit seller application.");
    } finally {
      setSubmitting(false);
    }
  }

  const status = user?.sellerApplication?.status || "none";

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Seller application</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Apply to become a seller</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Create your own seller account inside the platform. Admin approval is required before you can publish products.
          </p>

          {message ? <div className="mt-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
          {error ? <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["businessName", "Business name"],
              ["displayName", "Display name"],
              ["phone", "Phone"],
              ["gcashNumber", "GCash number"],
              ["bankName", "Bank name"],
              ["bankAccountName", "Bank account name"],
              ["bankAccountNumber", "Bank account number"]
            ].map(([field, label]) => (
              <input
                key={field}
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={label}
                className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
            ))}
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe what you want to sell"
              className="min-h-[130px] rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none md:col-span-2"
            />
          </div>

          <button
            disabled={submitting || status === "pending" || status === "approved"}
            className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : status === "pending" ? "Application pending" : status === "approved" ? "Already approved" : "Submit seller application"}
          </button>
        </form>

        <aside className="glass-panel h-fit rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Current status</p>
          <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-lg font-semibold capitalize text-white">{status}</p>
            <p className="mt-3 text-sm text-slate-300">
              {status === "pending"
                ? "Your application is waiting for admin review."
                : status === "approved"
                  ? "Your seller access is already active."
                  : status === "rejected"
                    ? user?.sellerApplication?.rejectionReason || "Your last application was rejected. You can update and submit again."
                    : "No seller application submitted yet."}
            </p>
            {user?.sellerApplication?.adminNote ? (
              <p className="mt-3 text-sm text-slate-400">Admin note: {user.sellerApplication.adminNote}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
