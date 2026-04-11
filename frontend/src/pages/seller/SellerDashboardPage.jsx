import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import api from "../../api/client";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";

const mediaBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

function withAbsoluteUrl(url = "") {
  return resolveMediaUrl(url);
}

function StatusBadge({ value }) {
  const palette = {
    approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    pending: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    rejected: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${palette[value] || "border-white/10 bg-white/5 text-slate-200"}`}>{value}</span>;
}

function SectionShell({ title, description, aside, children }) {
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <section className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[22px] p-4" : "rounded-[32px] p-6"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{title}</p>
          <p className={`mt-2 text-slate-300 ${isNativeApp ? "text-[12px] leading-5" : "text-sm leading-7"}`}>{description}</p>
        </div>
        {aside ? <div className="md:max-w-[320px]">{aside}</div> : null}
      </div>
      <div className={isNativeApp ? "mt-4" : "mt-5"}>{children}</div>
    </section>
  );
}

function DashboardTabButton({ active, label, count, onClick }) {
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`border text-left transition ${
        active ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-50 shadow-ambient" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      } ${isNativeApp ? "rounded-[18px] px-3 py-2.5" : "rounded-[22px] px-4 py-3"}`}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={`font-semibold ${isNativeApp ? "mt-1 text-lg" : "mt-1 text-2xl"}`}>{count}</p>
    </button>
  );
}

export default function SellerDashboardPage() {
  const isNativeApp = Capacitor.isNativePlatform();
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ requestedAmount: "", note: "" });
  const [uploading, setUploading] = useState({ avatar: false, banner: false });
  const [activeTab, setActiveTab] = useState("overview");

  async function loadData() {
    try {
      const [{ data: dashboard }, { data: me }] = await Promise.all([api.get("/users/seller/dashboard"), api.get("/users/seller/me")]);
      setSummary(dashboard);
      setProfile({
        storeName: me.sellerProfile?.storeName || "",
        displayName: me.sellerProfile?.displayName || me.name || "",
        description: me.sellerProfile?.description || "",
        avatar: me.sellerProfile?.avatar || "",
        banner: me.sellerProfile?.banner || "",
        statusNote: me.sellerProfile?.statusNote || "",
        gcashNumber: me.sellerProfile?.payoutDetails?.gcashNumber || "",
        bankName: me.sellerProfile?.payoutDetails?.bankName || "",
        bankAccountName: me.sellerProfile?.payoutDetails?.bankAccountName || "",
        bankAccountNumber: me.sellerProfile?.payoutDetails?.bankAccountNumber || ""
      });
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load seller dashboard.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const payoutProgress = useMemo(() => {
    const netRevenue = Number(summary?.netRevenue || 0);
    const paidOut = Number(summary?.paidOut || 0);
    return netRevenue > 0 ? Math.min(100, Math.round((paidOut / netRevenue) * 100)) : 0;
  }, [summary?.netRevenue, summary?.paidOut]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview", count: summary?.productsCount || 0 },
      { key: "payouts", label: "Payouts", count: summary?.payoutRequests?.length || 0 },
      { key: "profile", label: "Store Profile", count: profile?.storeName ? 1 : 0 }
    ],
    [profile?.storeName, summary?.payoutRequests?.length, summary?.productsCount]
  );

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.put("/users/seller/me", profile);
      setMessage(data.message || "Seller profile updated.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update seller profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMediaUpload(kind, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading((current) => ({ ...current, [kind]: true }));
    setError("");

    try {
      const payload = new FormData();
      payload.append("image", file);
      const { data } = await api.post("/uploads", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile((current) => ({
        ...current,
        [kind]: withAbsoluteUrl(data.imageUrl || data.url)
      }));
      setMessage(`${kind === "avatar" ? "Store logo" : "Store banner"} uploaded. Save profile to apply it.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload seller media.");
    } finally {
      event.target.value = "";
      setUploading((current) => ({ ...current, [kind]: false }));
    }
  }

  async function handlePayoutRequest(event) {
    event.preventDefault();
    setRequestingPayout(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/users/seller/payout-requests", {
        requestedAmount: Number(payoutForm.requestedAmount || 0),
        note: payoutForm.note
      });
      setMessage(data.message || "Payout request submitted.");
      setPayoutForm({ requestedAmount: "", note: "" });
      await loadData();
      setActiveTab("payouts");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request payout.");
    } finally {
      setRequestingPayout(false);
    }
  }

  return (
    <div className={`pb-10 ${isNativeApp ? "native-screen-stack space-y-4" : "space-y-6"}`}>
      <section className="glass-panel overflow-hidden rounded-[32px] shadow-ambient">
        <div className={`relative ${isNativeApp ? "min-h-[180px] p-4" : "min-h-[220px] p-6"}`}>
          {profile?.banner ? <img src={withAbsoluteUrl(profile.banner)} alt="Seller banner" className="absolute inset-0 h-full w-full object-cover opacity-30" /> : null}
          <div className="absolute inset-0 bg-slate-950/45" />
          <div className="relative z-10 flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className={`overflow-hidden border border-white/10 bg-white/5 ${isNativeApp ? "h-16 w-16 rounded-[20px]" : "h-20 w-20 rounded-[28px]"}`}>
                {profile?.avatar ? (
                  <img src={withAbsoluteUrl(profile.avatar)} alt={profile.storeName || "Seller"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-semibold text-white">{(profile?.storeName || "S").slice(0, 1)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Seller hub</p>
                <h1 className={`break-words font-semibold text-white ${isNativeApp ? "mt-1.5 text-2xl leading-tight" : "mt-2 text-3xl"}`}>{profile?.storeName || "Marketplace seller dashboard"}</h1>
                <p className={`max-w-2xl text-slate-200 ${isNativeApp ? "mt-2 text-[12px] leading-5" : "mt-3 text-sm leading-7"}`}>
                  Track listing approvals, review earnings after the 10% platform commission, and manage your payout flow in one cleaner seller workspace.
                </p>
                {profile?.statusNote ? <p className={`text-cyan-100 ${isNativeApp ? "mt-2 text-[12px] leading-5" : "mt-3 text-sm"}`}>{profile.statusNote}</p> : null}
              </div>
            </div>
            <div className={`grid w-full ${isNativeApp ? "grid-cols-3 gap-2" : "gap-3 sm:grid-cols-2 2xl:w-[420px] 2xl:grid-cols-3"}`}>
              <div className={`rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 ${isNativeApp ? "p-3" : "p-4"}`}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">Net revenue</p>
                <p className={`break-words font-semibold text-cyan-50 ${isNativeApp ? "mt-1.5 text-base" : "mt-2 text-xl sm:text-2xl"}`}>{peso(summary?.netRevenue || 0)}</p>
              </div>
              <div className={`rounded-[24px] border border-amber-400/20 bg-amber-500/10 ${isNativeApp ? "p-3" : "p-4"}`}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">Available payout</p>
                <p className={`break-words font-semibold text-amber-50 ${isNativeApp ? "mt-1.5 text-base" : "mt-2 text-xl sm:text-2xl"}`}>{peso(summary?.availableForPayout || 0)}</p>
              </div>
              <div className={`rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 ${isNativeApp ? "p-3" : "p-4"}`}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/70">Paid out</p>
                <p className={`break-words font-semibold text-emerald-50 ${isNativeApp ? "mt-1.5 text-base" : "mt-2 text-xl sm:text-2xl"}`}>{peso(summary?.paidOut || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <section className={`grid ${isNativeApp ? "native-chip-grid grid-cols-3" : "gap-3 sm:grid-cols-3"}`}>
        {tabs.map((tab) => (
          <DashboardTabButton key={tab.key} active={activeTab === tab.key} label={tab.label} count={tab.count} onClick={() => setActiveTab(tab.key)} />
        ))}
      </section>

      {activeTab === "overview" ? (
        <>
      <section className={`grid ${isNativeApp ? "native-summary-grid grid-cols-2" : "gap-4 md:grid-cols-2 xl:grid-cols-5"}`}>
        <div className={`glass-panel shadow-ambient ${isNativeApp ? "native-summary-card rounded-[20px]" : "rounded-[28px] p-5"}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Products</p>
          <p className={`font-semibold text-white ${isNativeApp ? "mt-1.5 text-xl" : "mt-2 text-3xl"}`}>{summary?.productsCount || 0}</p>
        </div>
        <div className={`glass-panel shadow-ambient ${isNativeApp ? "native-summary-card rounded-[20px]" : "rounded-[28px] p-5"}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Approved</p>
          <p className={`font-semibold text-white ${isNativeApp ? "mt-1.5 text-xl" : "mt-2 text-3xl"}`}>{summary?.approvedProductsCount || 0}</p>
        </div>
        <div className={`glass-panel shadow-ambient ${isNativeApp ? "native-summary-card rounded-[20px]" : "rounded-[28px] p-5"}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Pending review</p>
          <p className={`font-semibold text-white ${isNativeApp ? "mt-1.5 text-xl" : "mt-2 text-3xl"}`}>{summary?.pendingProductsCount || 0}</p>
        </div>
        <div className={`glass-panel shadow-ambient ${isNativeApp ? "native-summary-card rounded-[20px]" : "rounded-[28px] p-5"}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Rejected</p>
          <p className={`font-semibold text-white ${isNativeApp ? "mt-1.5 text-xl" : "mt-2 text-3xl"}`}>{summary?.rejectedProductsCount || 0}</p>
        </div>
        <div className={`glass-panel shadow-ambient ${isNativeApp ? "native-summary-card rounded-[20px]" : "rounded-[28px] p-5"}`}>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Commission kept</p>
          <p className={`font-semibold text-white ${isNativeApp ? "mt-1.5 text-xl" : "mt-2 text-3xl"}`}>{peso(summary?.totalCommission || 0)}</p>
        </div>
      </section>
        </>
      ) : null}

      <div className={`grid ${isNativeApp ? "gap-4" : "gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]"}`}>
        <div className="space-y-6">
          {activeTab === "overview" ? (
          <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Listing status clarity</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">This tells you whether each product is already live, still waiting for admin review, or needs corrections before it can go public.</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent status updates</p>
                <p className="mt-1 text-2xl font-semibold text-white">{summary?.recentProductStatuses?.length || 0}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {summary?.recentProductStatuses?.length ? (
                summary.recentProductStatuses.map((product) => (
                  <div key={product.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{new Date(product.updatedAt).toLocaleString()}</p>
                        <p className="mt-2 text-sm text-slate-300">
                          {product.approvalStatus === "approved"
                            ? "Approved and live on the storefront."
                            : product.approvalStatus === "rejected"
                              ? "Needs fixes before it can go live again."
                              : "Waiting for admin review before it appears publicly."}
                        </p>
                        {product.approvalNote ? <p className="mt-2 text-sm text-rose-100">Admin note: {product.approvalNote}</p> : null}
                      </div>
                      <StatusBadge value={product.approvalStatus} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No product status updates yet.</div>
              )}
            </div>
          </section>
          ) : null}

          {activeTab === "payouts" ? (
          <SectionShell
            title="Payout center"
            description="Request your available seller earnings, then wait for admin approval or payout confirmation."
            aside={
              <div className="w-full max-w-[220px]">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
                  <span>Payout progress</span>
                  <span>{payoutProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${payoutProgress}%` }} />
                </div>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Available</p>
                <p className="mt-2 text-2xl font-semibold text-amber-50">{peso(summary?.availableForPayout || 0)}</p>
              </div>
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Pending requests</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-50">{peso(summary?.pendingPayouts || 0)}</p>
              </div>
              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Approved / paid</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-50">{peso(summary?.approvedPayouts || 0)}</p>
              </div>
            </div>

            <form onSubmit={handlePayoutRequest} className="mt-5 grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={payoutForm.requestedAmount}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, requestedAmount: event.target.value }))}
                  placeholder="Requested amount"
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                />
                <input
                  value={payoutForm.note}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Optional note for admin, like preferred payout method or batch coverage"
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button disabled={requestingPayout} className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-60">
                  {requestingPayout ? "Submitting..." : "Request payout"}
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {(summary?.payoutRequests || []).length ? (
                summary.payoutRequests.map((request) => (
                  <div key={request._id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{peso(request.requestedAmount)}</p>
                        {request.requestCode ? <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{request.requestCode}</p> : null}
                        <p className="mt-1 text-sm text-slate-400">{new Date(request.requestedAt || request.createdAt).toLocaleString()}</p>
                        {request.note ? <p className="mt-2 text-sm text-slate-300">{request.note}</p> : null}
                        {request.adminNote ? <p className="mt-2 text-sm text-cyan-100">Admin note: {request.adminNote}</p> : null}
                        {request.approvedReference ? <p className="mt-2 text-sm text-slate-400">Approved ref: {request.approvedReference}</p> : null}
                        {request.paidReference ? <p className="mt-1 text-sm text-slate-400">Paid ref: {request.paidReference}</p> : null}
                      </div>
                      <StatusBadge value={request.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No payout requests yet.</div>
              )}
            </div>
          </SectionShell>
          ) : null}
        </div>

        {activeTab === "profile" ? (
        <form onSubmit={handleSave} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Seller profile</p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                  {profile?.avatar ? <img src={withAbsoluteUrl(profile.avatar)} alt="Store logo" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Store logo preview</div>}
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                  {uploading.avatar ? "Uploading..." : "Upload store logo"}
                  <input type="file" accept="image/*" onChange={(event) => handleMediaUpload("avatar", event)} className="hidden" />
                </label>
              </div>
              <div className="space-y-3">
                <div className="aspect-[16/10] overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                  {profile?.banner ? <img src={withAbsoluteUrl(profile.banner)} alt="Store banner" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Store banner preview</div>}
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                  {uploading.banner ? "Uploading..." : "Upload store banner"}
                  <input type="file" accept="image/*" onChange={(event) => handleMediaUpload("banner", event)} className="hidden" />
                </label>
              </div>
            </div>

            {Object.entries({
              storeName: "Store name",
              displayName: "Display name",
              statusNote: "Short store note",
              gcashNumber: "GCash number",
              bankName: "Bank name",
              bankAccountName: "Bank account name",
              bankAccountNumber: "Bank account number"
            }).map(([field, label]) => (
              <input
                key={field}
                value={profile?.[field] || ""}
                onChange={(event) => setProfile((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={label}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
            ))}
            <textarea
              value={profile?.description || ""}
              onChange={(event) => setProfile((current) => ({ ...current, description: event.target.value }))}
              placeholder="Store description"
              className="min-h-[120px] rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
          </div>
          <button className="mt-5 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-600">
            {saving ? "Saving..." : "Save seller profile"}
          </button>
        </form>
        ) : null}
      </div>
    </div>
  );
}
