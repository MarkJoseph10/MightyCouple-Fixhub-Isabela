import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function SellerAppealPage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadProfile() {
    try {
      const { data } = await api.get("/users/seller/me");
      setProfile(data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load seller appeal details.");
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post("/users/seller/appeal", { message: appealMessage });
      setMessage(data.message || "Seller appeal submitted successfully.");
      setAppealMessage("");
      await Promise.all([loadProfile(), refreshUser()]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit seller appeal.");
    } finally {
      setSubmitting(false);
    }
  }

  const discipline = profile?.sellerProfile?.discipline;
  const appeal = profile?.sellerProfile?.appeal;
  const canAppeal = profile?.role === "seller" && profile?.sellerProfile?.isActive === false && appeal?.status !== "pending";

  return (
    <div className="page-shell py-8">
      <section className="glass-panel mx-auto max-w-3xl rounded-[32px] p-6 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Seller appeal</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Request a suspension review</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          If you think your seller suspension was a mistake, explain your side here. Admin can review your appeal and restore selling access if needed.
        </p>

        {message ? <div className="mt-5 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
        {error ? <div className="mt-5 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current status</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {profile?.sellerProfile?.isActive === false ? "Suspended" : "Active"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {discipline?.suspendedUntil
                ? `Access resumes on ${new Date(discipline.suspendedUntil).toLocaleString()}.`
                : profile?.sellerProfile?.statusNote || "No suspension schedule found."}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Appeal status</p>
            <p className="mt-2 text-xl font-semibold text-white capitalize">{appeal?.status || "none"}</p>
            <p className="mt-2 text-sm text-slate-300">
              {appeal?.status === "pending"
                ? "Your appeal is currently waiting for admin review."
                : appeal?.status === "approved"
                  ? "Your appeal was approved and selling access should already be restored."
                  : appeal?.status === "rejected"
                    ? "Your appeal was reviewed and the suspension remains active."
                    : "No appeal submitted yet."}
            </p>
            {appeal?.adminNote ? <p className="mt-2 text-sm text-cyan-100">Admin note: {appeal.adminNote}</p> : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <textarea
            value={appealMessage}
            onChange={(event) => setAppealMessage(event.target.value)}
            placeholder="Explain why the suspension should be reviewed. Include context, order details, or anything admin should re-check."
            className="min-h-[160px] w-full rounded-[24px] border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            disabled={!canAppeal}
          />
          <button
            type="submit"
            disabled={!canAppeal || submitting}
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting appeal..." : "Submit appeal"}
          </button>
        </form>
      </section>
    </div>
  );
}
