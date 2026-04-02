import { Clock3, Download, ExternalLink, FileClock, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";

const PAGE_SIZE = 10;

const CATEGORY_OPTIONS = [
  { key: "all", label: "All activity" },
  { key: "seller", label: "Seller" },
  { key: "order", label: "Orders" },
  { key: "installment", label: "Installments" },
  { key: "refund", label: "Refunds" },
  { key: "system", label: "System" }
];

function formatDate(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function badgeClass(severity) {
  if (severity === "success") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }
  if (severity === "warning") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }
  if (severity === "danger") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  return "border-sky-400/20 bg-sky-500/10 text-sky-100";
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ all: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [querySearch, setQuerySearch] = useState("");

  const loadLogs = useCallback(
    async ({ nextPage = 1, replace = false, nextCategory = categoryFilter, nextSearch = querySearch } = {}) => {
      setLoading(true);
      try {
        const { data } = await api.get("/activity-logs", {
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            category: nextCategory,
            search: nextSearch
          }
        });

        setHasMore(Boolean(data.hasMore));
        setSummary(data.summary || { all: 0 });
        setLogs((current) => {
          if (replace || nextPage === 1) {
            return data.logs || [];
          }

          const existingIds = new Set(current.map((entry) => entry._id));
          const nextItems = (data.logs || []).filter((entry) => !existingIds.has(entry._id));
          return [...current, ...nextItems];
        });
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter, querySearch]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await api.get("/activity-logs/export", {
        params: {
          category: categoryFilter,
          search: querySearch
        },
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "activity-log.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [categoryFilter, querySearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuerySearch(searchValue.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    setPage(1);
    loadLogs({ nextPage: 1, replace: true, nextCategory: categoryFilter, nextSearch: querySearch }).catch(() => {
      setLogs([]);
      setHasMore(false);
      setLoading(false);
    });
  }, [categoryFilter, loadLogs, querySearch]);

  return (
    <section className="section-card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Admin activity</p>
          <h1 className="section-title mt-2">Audit log and history</h1>
          <p className="section-description mt-3">
            Track seller actions, settings changes, order status updates, refunds, payouts, and installment decisions from one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            <FileClock size={16} />
            {summary.all || 0} total entries
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.all || 0}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Seller</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.seller || 0}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Orders</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.order || 0}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Installments</p>
          <p className="mt-2 text-3xl font-semibold text-white">{summary.installment || 0}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 space-y-4">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by title, message, actor, or reference"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Filter size={13} />
            Filter by category
          </div>
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setCategoryFilter(option.key);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                categoryFilter === option.key
                  ? "border-brand-400/40 bg-brand-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading && !logs.length ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">Loading activity log...</div>
        ) : logs.length ? (
          logs.map((entry) => (
            <article key={entry._id} className={`rounded-[28px] border p-5 ${badgeClass(entry.severity)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
                    <Clock3 size={14} />
                    <span>{entry.category || "system"}</span>
                    <span>•</span>
                    <span>{entry.actorRole || "system"}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{entry.title}</h2>
                  <p className="max-w-4xl text-sm text-slate-100/90">{entry.message}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200">
                    {entry.actorName || "System"}
                  </span>
                  {entry.link ? (
                    <Link
                      to={entry.link}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Open
                      <ExternalLink size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                <span>{formatDate(entry.createdAt)}</span>
                {entry.subjectType ? <span>• {entry.subjectType}</span> : null}
                {entry.subjectId ? <span>• {entry.subjectId}</span> : null}
                {entry.metadata?.action ? <span>• {entry.metadata.action}</span> : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            <FileClock size={28} className="mx-auto mb-3 text-slate-400" />
            No activity logs yet. When admin actions happen, they will appear here.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {hasMore ? "Older history is available below." : "No more history to load."}
        </p>
        {hasMore ? (
          <button
            type="button"
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              loadLogs({ nextPage, replace: false, nextCategory: categoryFilter, nextSearch: querySearch }).catch(() => {});
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Load older history
          </button>
        ) : null}
      </div>
    </section>
  );
}
