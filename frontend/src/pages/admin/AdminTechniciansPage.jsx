import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { fetchTechnicianApplications, reviewTechnicianApplication } from "../../services/technicianService";

function badgeClass(status) {
  const palette = {
    pending: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    rejected: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    suspended: "border-slate-400/20 bg-slate-500/10 text-slate-100"
  };
  return palette[status] || "border-white/10 bg-white/5 text-slate-200";
}

function StatCard({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition ${
        active ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-50 shadow-ambient" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </button>
  );
}

export default function AdminTechniciansPage() {
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("pending");

  async function loadData() {
    try {
      const [applicationRows, usersResponse] = await Promise.all([fetchTechnicianApplications(), api.get("/users")]);
      setApplications(applicationRows);
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load technician applications.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReview(userId, status) {
    try {
      const adminNote = reviewNotes[userId] || "";
      const data = await reviewTechnicianApplication(userId, {
        status,
        adminNote,
        rejectionReason: status === "rejected" ? adminNote : ""
      });
      setApplications((current) => current.map((entry) => (entry._id === userId ? data.user : entry)));
      setUsers((current) => current.map((entry) => (entry._id === userId ? data.user : entry)));
      setMessage(data.message || "Technician application updated.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to review technician application.");
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const searchable = useMemo(() => {
    const rows = [...applications];
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((user) =>
      [
        user.name,
        user.email,
        user.sellerProfile?.storeName,
        user.sellerProfile?.displayName,
        ...(user.technicianApplication?.servicePoints || []),
        ...(user.technicianApplication?.specialties || [])
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [applications, normalizedQuery]);

  const filteredApplications = useMemo(() => {
    if (activeFilter === "all") {
      return searchable;
    }
    return searchable.filter((user) => (user.technicianApplication?.status || "none") === activeFilter);
  }, [activeFilter, searchable]);

  const approvedTechnicians = useMemo(
    () => users.filter((user) => user.role === "seller" && user.technicianApplication?.status === "approved"),
    [users]
  );

  const stats = {
    pending: applications.filter((user) => user.technicianApplication?.status === "pending").length,
    approved: applications.filter((user) => user.technicianApplication?.status === "approved").length,
    rejected: applications.filter((user) => user.technicianApplication?.status === "rejected").length,
    suspended: applications.filter((user) => user.technicianApplication?.status === "suspended").length
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-white">Repair technician approvals</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Sellers cannot handle repair jobs until admin approves their technician application. Review experience, service points, and repair coverage here.
            </p>
          </div>
          <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-slate-950/30 p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by seller, store, branch, or specialty"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            />
          </div>
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" value={stats.pending} active={activeFilter === "pending"} onClick={() => setActiveFilter("pending")} />
        <StatCard label="Approved" value={stats.approved} active={activeFilter === "approved"} onClick={() => setActiveFilter("approved")} />
        <StatCard label="Rejected" value={stats.rejected} active={activeFilter === "rejected"} onClick={() => setActiveFilter("rejected")} />
        <StatCard label="Suspended" value={stats.suspended} active={activeFilter === "suspended"} onClick={() => setActiveFilter("suspended")} />
      </section>

      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Technician application queue</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Approve only the sellers who should receive customer repair requests and repair chat access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              activeFilter === "all" ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-200"
            }`}
          >
            Show all
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {filteredApplications.length ? (
            filteredApplications.map((user) => {
              const application = user.technicianApplication || {};
              return (
                <article key={user._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{user.sellerProfile?.storeName || user.name}</p>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${badgeClass(application.status || "none")}`}>
                          {(application.status || "none").replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                        <p>Display name: {user.sellerProfile?.displayName || user.name}</p>
                        <p>Repair contact: {application.contactNumber || user.phone || "Not set"}</p>
                        <p>Experience: {Number(application.yearsExperience || 0)} year(s)</p>
                        <p>Submitted: {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">Service points: {(application.servicePoints || []).join(", ") || "No service points listed"}</p>
                      <p className="mt-2 text-sm text-slate-300">Specialties: {(application.specialties || []).join(", ") || "No specialties listed"}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{application.experienceSummary || "No technician summary submitted."}</p>
                      {application.adminNote ? <p className="mt-3 text-sm text-cyan-100">Admin note: {application.adminNote}</p> : null}
                      {application.rejectionReason ? <p className="mt-2 text-sm text-rose-100">Reason: {application.rejectionReason}</p> : null}
                    </div>
                  </div>

                  <textarea
                    value={reviewNotes[user._id] || ""}
                    onChange={(event) => setReviewNotes((current) => ({ ...current, [user._id]: event.target.value }))}
                    placeholder="Admin note or rejection reason"
                    className="mt-4 min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleReview(user._id, "approved")} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
                      Approve technician
                    </button>
                    <button type="button" onClick={() => handleReview(user._id, "rejected")} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white">
                      Reject application
                    </button>
                    <button type="button" onClick={() => handleReview(user._id, "suspended")} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
                      Suspend technician access
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">No technician applications matched this filter.</div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h2 className="text-2xl font-semibold text-white">Approved repair team</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">These sellers can now appear in customer repair booking and can access seller repair workflow tools.</p>

        <div className="mt-6 space-y-3">
          {approvedTechnicians.length ? (
            approvedTechnicians.map((user) => (
              <div key={user._id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{user.sellerProfile?.storeName || user.name}</p>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${badgeClass("approved")}`}>approved</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {(user.technicianApplication?.servicePoints || []).join(", ") || "No service points listed"}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No approved technicians yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
