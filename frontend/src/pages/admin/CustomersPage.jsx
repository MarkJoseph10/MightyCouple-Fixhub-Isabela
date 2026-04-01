import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function StatusBadge({ value }) {
  const palette = {
    pending: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rejected: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    suspended: "border-slate-400/20 bg-slate-500/10 text-slate-200",
    terminated: "border-rose-500/20 bg-rose-600/15 text-rose-100",
    warning: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    seller: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    customer: "border-white/10 bg-white/5 text-slate-200",
    admin: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${palette[value] || palette.customer}`}>
      {value}
    </span>
  );
}

function getNextDisciplineLabel(user) {
  const offenseCount = Number(user?.sellerProfile?.discipline?.offenseCount || 0);

  if (offenseCount <= 0) {
    return "Issue warning (3 days)";
  }

  if (offenseCount === 1) {
    return "Suspend 7 days";
  }

  if (offenseCount === 2) {
    return "Suspend 15 days";
  }

  return "Terminate seller";
}

function getDisciplineSummary(user) {
  const discipline = user?.sellerProfile?.discipline || {};
  const offenseCount = Number(discipline.offenseCount || 0);
  const currentStage = discipline.currentStage || "good_standing";

  if (currentStage === "terminated" || discipline.terminatedAt) {
    return `4th offense termination${discipline.terminatedAt ? ` on ${new Date(discipline.terminatedAt).toLocaleDateString()}` : ""}`;
  }

  if (discipline.suspendedUntil) {
    return `Offense ${offenseCount}: access resumes on ${new Date(discipline.suspendedUntil).toLocaleDateString()}`;
  }

  if (offenseCount > 0) {
    return `Offense ${offenseCount} on record`;
  }

  return "No seller offenses on record";
}

function SectionPanel({ title, description, count, children }) {
  return (
    <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Count</p>
          <p className="mt-1 text-2xl font-semibold text-white">{count}</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function ManagementTab({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border px-4 py-3 text-left transition ${
        active ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-50 shadow-ambient" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{count}</p>
    </button>
  );
}

export default function CustomersPage() {
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("applications");

  async function loadData() {
    try {
      const [{ data: usersData }, { data: applicationsData }] = await Promise.all([api.get("/users"), api.get("/users/seller/applications")]);
      setUsers(usersData);
      setApplications(applicationsData);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load customers.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function reviewApplication(userId, status) {
    try {
      const adminNote = reviewNotes[userId] || "";
      const { data } = await api.patch(`/users/seller/applications/${userId}`, {
        status,
        adminNote,
        rejectionReason: status === "rejected" ? adminNote : ""
      });
      setApplications((current) => current.map((entry) => (entry._id === userId ? data.user : entry)));
      setUsers((current) => current.map((entry) => (entry._id === userId ? data.user : entry)));
      setMessage(data.message || "Seller application updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to review seller application.");
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const searchableUsers = useMemo(() => {
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.sellerProfile?.storeName,
        user.sellerApplication?.businessName,
        user.sellerApplication?.displayName
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [normalizedQuery, users]);

  const pendingApplications = useMemo(
    () => applications.filter((user) => (user.sellerApplication?.status || "none") === "pending").filter((user) => searchableUsers.some((entry) => entry._id === user._id)),
    [applications, searchableUsers]
  );
  const reviewedApplications = useMemo(
    () =>
      applications
        .filter((user) => ["rejected", "terminated"].includes(user.sellerApplication?.status || ""))
        .filter((user) => searchableUsers.some((entry) => entry._id === user._id)),
    [applications, searchableUsers]
  );
  const activeSellers = useMemo(
    () => searchableUsers.filter((user) => user.role === "seller" && user.sellerProfile?.isActive !== false),
    [searchableUsers]
  );
  const suspendedSellers = useMemo(
    () => searchableUsers.filter((user) => user.role === "seller" && user.sellerProfile?.isActive === false),
    [searchableUsers]
  );
  const customers = useMemo(
    () =>
      searchableUsers.filter((user) => {
        if (user.role !== "customer") {
          return false;
        }

        const sellerStatus = String(user.sellerApplication?.status || "none").toLowerCase();
        return sellerStatus === "none";
      }),
    [searchableUsers]
  );
  const payoutUsers = useMemo(
    () =>
      searchableUsers.filter(
        (user) =>
          user.role === "seller" &&
          Array.isArray(user.sellerProfile?.payoutRequests) &&
          user.sellerProfile.payoutRequests.length > 0
      ),
    [searchableUsers]
  );
  const payoutCases = useMemo(
    () =>
      payoutUsers
        .flatMap((user) =>
          (user.sellerProfile?.payoutRequests || []).map((request) => ({
            sellerId: user._id,
            sellerName: user.name,
            storeName: user.sellerProfile?.storeName || user.sellerApplication?.businessName || user.name,
            sellerActive: user.sellerProfile?.isActive !== false,
            request
          }))
        )
        .sort((left, right) => new Date(right.request.requestedAt || right.request.createdAt || 0) - new Date(left.request.requestedAt || left.request.createdAt || 0)),
    [payoutUsers]
  );
  const openPayoutCases = useMemo(() => payoutCases.filter(({ request }) => request.status === "pending"), [payoutCases]);
  const payoutHistoryCases = useMemo(() => payoutCases.filter(({ request }) => request.status !== "pending"), [payoutCases]);
  const payoutStatusCounts = useMemo(
    () => ({
      approved: payoutHistoryCases.filter(({ request }) => request.status === "approved").length,
      paid: payoutHistoryCases.filter(({ request }) => request.status === "paid").length,
      rejected: payoutHistoryCases.filter(({ request }) => request.status === "rejected").length
    }),
    [payoutHistoryCases]
  );

  const tabs = useMemo(
    () => [
      { key: "applications", label: "Applications", count: pendingApplications.length },
      { key: "sellers", label: "Active Sellers", count: activeSellers.length },
      { key: "payouts", label: "Payout Queue", count: openPayoutCases.length },
      { key: "customers", label: "Customers", count: customers.length },
      { key: "history", label: "Reviewed", count: reviewedApplications.length + suspendedSellers.length }
    ],
    [activeSellers.length, customers.length, openPayoutCases.length, pendingApplications.length, reviewedApplications.length, suspendedSellers.length]
  );

  async function reviewPayout(sellerId, requestId, status) {
    try {
      const { data } = await api.patch(`/users/seller/${sellerId}/payout-requests/${requestId}`, {
        status,
        adminNote: reviewNotes[`${sellerId}:${requestId}`] || ""
      });
      setUsers((current) => current.map((entry) => (entry._id === sellerId ? data.user : entry)));
      setApplications((current) => current.map((entry) => (entry._id === sellerId ? data.user : entry)));
      setMessage(data.message || "Payout request updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to review payout request.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-white">Customers and sellers</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Review new seller requests, manage active marketplace sellers, and keep customer records easier to scan instead of mixing everything into one long list.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4 xl:w-[520px]">
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Pending sellers</p>
              <p className="mt-2 text-3xl font-semibold text-amber-50">{pendingApplications.length}</p>
            </div>
            <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Active sellers</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-50">{activeSellers.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Customers</p>
              <p className="mt-2 text-3xl font-semibold text-white">{customers.length}</p>
            </div>
            <div className="rounded-[24px] border border-slate-400/20 bg-slate-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-200/70">Suspended sellers</p>
              <p className="mt-2 text-3xl font-semibold text-slate-50">{suspendedSellers.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/30 p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, role, store name, or business name"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {tabs.map((tab) => (
          <ManagementTab key={tab.key} active={activeTab === tab.key} label={tab.label} count={tab.count} onClick={() => setActiveTab(tab.key)} />
        ))}
      </section>

      {activeTab === "applications" ? (
      <SectionPanel
        title="Pending seller applications"
        description="Only applications that still need your decision stay here. Approved sellers move to their own section automatically."
        count={pendingApplications.length}
      >
        {pendingApplications.length ? (
          pendingApplications.map((user) => (
            <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{user.name}</p>
                    <StatusBadge value={user.sellerApplication?.status || "pending"} />
                  </div>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <p>Business: {user.sellerApplication?.businessName || "N/A"}</p>
                    <p>Display name: {user.sellerApplication?.displayName || "N/A"}</p>
                    <p>Phone: {user.sellerApplication?.phone || "N/A"}</p>
                    <p>Submitted: {user.sellerApplication?.submittedAt ? new Date(user.sellerApplication.submittedAt).toLocaleString() : "N/A"}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{user.sellerApplication?.description || "No seller description submitted."}</p>
                </div>
              </div>

              <textarea
                value={reviewNotes[user._id] || ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [user._id]: event.target.value }))}
                placeholder="Admin note or rejection reason"
                className="mt-4 min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => reviewApplication(user._id, "approved")} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
                  Approve seller
                </button>
                <button type="button" onClick={() => reviewApplication(user._id, "rejected")} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white">
                  Reject application
                </button>
                <button type="button" onClick={() => reviewApplication(user._id, "suspended")} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
                  Suspend seller
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No pending seller applications.</div>
        )}
      </SectionPanel>
      ) : null}

      {activeTab === "sellers" ? (
      <SectionPanel
        title="Active sellers"
        description="Approved sellers are separated here so you can track who is live on the marketplace without mixing them into pending requests."
        count={activeSellers.length}
      >
        {activeSellers.length ? (
          activeSellers.map((user) => (
            <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{user.name}</p>
                    <StatusBadge value="seller" />
                    <StatusBadge value={user.sellerApplication?.status || "approved"} />
                  </div>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <p>Store: {user.sellerProfile?.storeName || user.sellerApplication?.businessName || "N/A"}</p>
                    <p>Display name: {user.sellerProfile?.displayName || user.name}</p>
                    <p>GCash: {user.sellerProfile?.payoutDetails?.gcashNumber || "Not set"}</p>
                    <p>Approved: {user.sellerProfile?.approvedAt ? new Date(user.sellerProfile.approvedAt).toLocaleString() : "N/A"}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{user.sellerProfile?.description || user.sellerApplication?.description || "No seller description submitted."}</p>
                  <p className="mt-2 text-sm text-amber-100">{getDisciplineSummary(user)}</p>
                  {user.sellerApplication?.adminNote ? <p className="mt-3 text-sm text-slate-500">Admin note: {user.sellerApplication.adminNote}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => reviewApplication(user._id, "suspended")} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                    {getNextDisciplineLabel(user)}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No approved sellers matched your search.</div>
        )}
      </SectionPanel>
      ) : null}

      {activeTab === "history" ? (
      <SectionPanel
        title="Reviewed applications"
        description="Rejected and suspended seller cases are archived separately so they do not crowd the active workflow."
        count={reviewedApplications.length}
      >
        {reviewedApplications.length ? (
          reviewedApplications.map((user) => (
            <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">{user.name}</p>
                <StatusBadge value={user.sellerApplication?.status || "rejected"} />
              </div>
              <p className="mt-1 text-sm text-slate-400">{user.email}</p>
              <p className="mt-3 text-sm text-slate-300">{user.sellerApplication?.businessName || "No business name"}</p>
              {user.sellerApplication?.rejectionReason ? <p className="mt-2 text-sm text-rose-100">Reason: {user.sellerApplication.rejectionReason}</p> : null}
              {user.sellerApplication?.adminNote ? <p className="mt-2 text-sm text-slate-400">Admin note: {user.sellerApplication.adminNote}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No reviewed seller cases yet.</div>
        )}
      </SectionPanel>
      ) : null}

      {activeTab === "history" ? (
      <SectionPanel
        title="Suspended sellers"
        description="Suspended sellers are separated from active sellers and should no longer have access to seller tools until you reactivate them."
        count={suspendedSellers.length}
      >
        {suspendedSellers.length ? (
          suspendedSellers.map((user) => (
            <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">{user.name}</p>
                <StatusBadge value="suspended" />
                {user.sellerProfile?.discipline?.currentStage === "warning" ? <StatusBadge value="warning" /> : null}
              </div>
              <p className="mt-1 text-sm text-slate-400">{user.email}</p>
              <p className="mt-3 text-sm text-slate-300">Store: {user.sellerProfile?.storeName || user.sellerApplication?.businessName || "N/A"}</p>
              <p className="mt-2 text-sm text-amber-100">{getDisciplineSummary(user)}</p>
              {user.sellerProfile?.statusNote ? <p className="mt-2 text-sm text-slate-400">{user.sellerProfile.statusNote}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No suspended sellers.</div>
        )}
      </SectionPanel>
      ) : null}

      {activeTab === "payouts" ? (
      <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Pending queue</p>
          <p className="mt-2 text-3xl font-semibold text-amber-50">{openPayoutCases.length}</p>
        </div>
        <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Approved</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-50">{payoutStatusCounts.approved}</p>
        </div>
        <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Paid</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-50">{payoutStatusCounts.paid}</p>
        </div>
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-100/70">Rejected</p>
          <p className="mt-2 text-3xl font-semibold text-rose-50">{payoutStatusCounts.rejected}</p>
        </div>
      </section>

      <SectionPanel
        title="Active payout queue"
        description="Only payout requests that still need action stay here. Once approved, paid, or rejected, they move out of the active queue automatically."
        count={openPayoutCases.length}
      >
        {openPayoutCases.length ? (
          openPayoutCases.map(({ sellerId, sellerName, storeName, request, sellerActive }) => (
            <div key={`${sellerId}-${request._id}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{storeName}</p>
                    <StatusBadge value={request.status} />
                    {!sellerActive ? <StatusBadge value="suspended" /> : null}
                  </div>
                  <p className="text-sm text-slate-400">{sellerName}</p>
                  <p className="mt-3 text-lg font-semibold text-white">Requested {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(request.requestedAmount || 0)}</p>
                  {request.requestCode ? <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Request ref: {request.requestCode}</p> : null}
                  <p className="mt-1 text-sm text-slate-400">{new Date(request.requestedAt || request.createdAt).toLocaleString()}</p>
                  {request.note ? <p className="mt-3 text-sm text-slate-300">{request.note}</p> : null}
                  {request.adminNote ? <p className="mt-2 text-sm text-cyan-100">Admin note: {request.adminNote}</p> : null}
                </div>
              </div>

              <textarea
                value={reviewNotes[`${sellerId}:${request._id}`] || ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [`${sellerId}:${request._id}`]: event.target.value }))}
                placeholder="Admin note for payout review"
                className="mt-4 min-h-[90px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => reviewPayout(sellerId, request._id, "approved")} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-white">
                  Approve payout
                </button>
                <button type="button" onClick={() => reviewPayout(sellerId, request._id, "rejected")} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white">
                  Reject payout
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No active payout requests right now.</div>
        )}
      </SectionPanel>
      <SectionPanel
        title="Payout history"
        description="Approved, paid, and rejected payout cases stay here for audit trail and payout release tracking."
        count={payoutHistoryCases.length}
      >
        {payoutHistoryCases.length ? (
          payoutHistoryCases.map(({ sellerId, sellerName, storeName, request, sellerActive }) => (
            <div key={`${sellerId}-${request._id}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{storeName}</p>
                    <StatusBadge value={request.status} />
                    {!sellerActive ? <StatusBadge value="suspended" /> : null}
                  </div>
                  <p className="text-sm text-slate-400">{sellerName}</p>
                  <p className="mt-3 text-lg font-semibold text-white">Requested {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(request.requestedAmount || 0)}</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-400">
                    {request.requestCode ? <p>Request ref: {request.requestCode}</p> : null}
                    {request.approvedReference ? <p>Approved ref: {request.approvedReference}</p> : null}
                    {request.paidReference ? <p>Paid ref: {request.paidReference}</p> : null}
                    <p>Requested: {new Date(request.requestedAt || request.createdAt).toLocaleString()}</p>
                    {request.reviewedAt ? <p>Reviewed: {new Date(request.reviewedAt).toLocaleString()}</p> : null}
                    {request.paidAt ? <p>Paid: {new Date(request.paidAt).toLocaleString()}</p> : null}
                  </div>
                  {request.note ? <p className="mt-3 text-sm text-slate-300">{request.note}</p> : null}
                  {request.adminNote ? <p className="mt-2 text-sm text-cyan-100">Admin note: {request.adminNote}</p> : null}
                </div>
              </div>

              <textarea
                value={reviewNotes[`${sellerId}:${request._id}`] || ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [`${sellerId}:${request._id}`]: event.target.value }))}
                placeholder={request.status === "approved" ? "Optional note before marking as paid" : "Optional admin note"}
                className="mt-4 min-h-[90px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {request.status === "approved" ? (
                  <button type="button" onClick={() => reviewPayout(sellerId, request._id, "paid")} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
                    Mark paid
                  </button>
                ) : null}
                {request.status === "rejected" ? (
                  <button type="button" onClick={() => reviewPayout(sellerId, request._id, "approved")} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-white">
                    Re-approve payout
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No payout history yet.</div>
        )}
      </SectionPanel>
      </div>
      ) : null}

      {activeTab === "customers" ? (
      <SectionPanel
        title="Customer accounts"
        description="Regular customer accounts are separated from seller management so it is easier to scan buyer records."
        count={customers.length}
      >
        {customers.length ? (
          customers.map((user) => (
            <div key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{user.name}</p>
                    <StatusBadge value={user.role} />
                  </div>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
                <div className="text-sm text-slate-300">
                  <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "No recent login"}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No customer accounts matched your search.</div>
        )}
      </SectionPanel>
      ) : null}
    </div>
  );
}
