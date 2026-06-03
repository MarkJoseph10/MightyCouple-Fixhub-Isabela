import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Wrench } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { applyAsTechnician } from "../../services/technicianService";

function inputClassName(extra = "") {
  return `w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/30 ${extra}`;
}

export default function TechnicianApplyPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    specialties: "",
    experienceSummary: "",
    yearsExperience: "",
    contactNumber: "",
    servicePoints: "",
    allowDropOff: true,
    allowPickup: false
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
      contactNumber: current.contactNumber || user?.phone || "",
      servicePoints:
        current.servicePoints ||
        (Array.isArray(user?.sellerProfile?.servicePoints) ? user.sellerProfile.servicePoints.join("\n") : "")
    }));
  }, [user?.phone, user?.sellerProfile?.servicePoints]);

  const technicianStatus = user?.technicianApplication?.status || "none";
  const pickupMethods = useMemo(() => {
    const methods = [];
    if (form.allowDropOff) methods.push("drop_off");
    if (form.allowPickup) methods.push("pickup");
    return methods;
  }, [form.allowDropOff, form.allowPickup]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        specialties: String(form.specialties || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        experienceSummary: form.experienceSummary,
        yearsExperience: Number(form.yearsExperience || 0),
        contactNumber: form.contactNumber,
        servicePoints: String(form.servicePoints || "")
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        pickupMethods
      };
      const data = await applyAsTechnician(payload);
      await refreshUser();
      setMessage(data.message || "Technician application submitted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit technician application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Repair technician access</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Apply as technician</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Sellers need a separate admin approval before they can receive repair bookings, send estimates, schedule repair slots, and update repair progress.
        </p>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Repair specialties</span>
              <input
                value={form.specialties}
                onChange={(event) => setForm((current) => ({ ...current, specialties: event.target.value }))}
                placeholder="Screen replacement, diagnostics, battery, water damage"
                className={inputClassName()}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Years of experience</span>
              <input
                type="number"
                min="0"
                value={form.yearsExperience}
                onChange={(event) => setForm((current) => ({ ...current, yearsExperience: event.target.value }))}
                placeholder="0"
                className={inputClassName()}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Repair contact number</span>
              <input
                value={form.contactNumber}
                onChange={(event) => setForm((current) => ({ ...current, contactNumber: event.target.value }))}
                placeholder="09XXXXXXXXX"
                className={inputClassName()}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Experience summary</span>
              <textarea
                rows={6}
                value={form.experienceSummary}
                onChange={(event) => setForm((current) => ({ ...current, experienceSummary: event.target.value }))}
                placeholder="Explain the device brands you handle, common repair jobs, and how your shop manages diagnosis, parts, and turnaround."
                className={inputClassName("min-h-[150px]")}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Branches / service points</span>
              <textarea
                rows={5}
                value={form.servicePoints}
                onChange={(event) => setForm((current) => ({ ...current, servicePoints: event.target.value }))}
                placeholder={"Main repair desk\nBranch 2 - service counter"}
                className={inputClassName("min-h-[140px]")}
              />
              <span className="text-xs text-slate-500">Enter one service point per line.</span>
            </label>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Supported booking types</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={form.allowDropOff}
                  onChange={(event) => setForm((current) => ({ ...current, allowDropOff: event.target.checked }))}
                />
                Accept drop-off repairs
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={form.allowPickup}
                  onChange={(event) => setForm((current) => ({ ...current, allowPickup: event.target.checked }))}
                />
                Offer pickup scheduling
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting || technicianStatus === "pending" || technicianStatus === "approved" || technicianStatus === "suspended" || pickupMethods.length === 0}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Wrench size={16} />}
              {technicianStatus === "pending"
                ? "Application pending"
                : technicianStatus === "approved"
                  ? "Technician access active"
                  : technicianStatus === "suspended"
                    ? "Technician access suspended"
                  : "Submit technician application"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Current status</p>
            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-lg font-semibold capitalize text-white">{technicianStatus.replaceAll("_", " ")}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {technicianStatus === "pending"
                  ? "Your technician application is waiting for admin review."
                  : technicianStatus === "approved"
                    ? "You can now access repair bookings and manage repair workflow."
                    : technicianStatus === "rejected"
                      ? user?.technicianApplication?.rejectionReason || "Your last application was rejected. Update the details and submit again."
                      : technicianStatus === "suspended"
                        ? user?.technicianApplication?.adminNote || "Your technician access is suspended right now."
                        : "You have not applied for repair technician access yet."}
              </p>
              {user?.technicianApplication?.adminNote ? (
                <p className="mt-3 text-sm text-cyan-100">Admin note: {user.technicianApplication.adminNote}</p>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">What approval unlocks</p>
            <div className="mt-4 space-y-3">
              {[
                "Receive assigned repair bookings from customers",
                "Send repair quotes and estimated completion dates",
                "Offer repair slots and block unavailable time",
                "Upload diagnosis, before/after proof, and final findings",
                "Handle repair-specific chat with customer and admin"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <CheckCircle2 size={16} className="mt-0.5 text-cyan-200" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
