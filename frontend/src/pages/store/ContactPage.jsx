import { useState } from "react";
import api from "../../api/client";
import InfoPageShell from "../../components/common/InfoPageShell";
import { useAuth } from "../../context/AuthContext";

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || user?.name || "",
      email: current.email || user?.email || ""
    }));
  }, [user?.email, user?.name]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      const { data } = await api.post("/contact", form);
      setStatus(data.message || "Your message has been sent.");
      setForm((current) => ({ ...current, message: "" }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send your message right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Talk to Mighty Couple support"
      description="Reach us for order concerns, shipping questions, payment verification, or gadget inquiries."
    >
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-brand-400/20 bg-brand-500/10 p-5 text-sm text-brand-50">
            Use this page for order concerns, shipping questions, payment verification, or general gadget inquiries. We keep the support path short so buyers can get help quickly.
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Support email</p>
            <a href="mailto:supportmightycouple@gmail.com" className="mt-3 block text-lg font-semibold text-white hover:text-brand-100">
              supportmightycouple@gmail.com
            </a>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Facebook</p>
            <p className="mt-3 text-lg font-semibold text-white">Mighty Couple support page</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">WhatsApp</p>
            <a href="https://wa.me/639077281841" target="_blank" rel="noreferrer" className="mt-3 block text-lg font-semibold text-white hover:text-brand-100">
              09077281841
            </a>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            We usually reply within 24 hours for product questions, return requests, and payment concerns. For urgent order issues, include your order ID in the first message.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Contact form</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Send a message</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <textarea
              required
              rows={8}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Message"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none md:col-span-2"
            />
          </div>
          {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
          {status && <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div>}
          <button
            disabled={submitting}
            className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </InfoPageShell>
  );
}
