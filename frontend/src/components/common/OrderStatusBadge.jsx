const toneMap = {
  pending: "bg-amber-500/15 text-amber-200",
  paid: "bg-sky-500/15 text-sky-200",
  verified: "bg-cyan-500/15 text-cyan-200",
  packed: "bg-indigo-500/15 text-indigo-200",
  processing: "bg-indigo-500/15 text-indigo-200",
  shipped: "bg-purple-500/15 text-purple-200",
  out_for_delivery: "bg-orange-500/15 text-orange-200",
  delivered: "bg-emerald-500/15 text-emerald-200",
  cancelled: "bg-rose-500/15 text-rose-200",
  approved: "bg-sky-500/15 text-sky-200",
  rejected: "bg-rose-500/15 text-rose-200",
  refunded: "bg-emerald-500/15 text-emerald-200"
};

export default function OrderStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${toneMap[status] || "bg-white/10 text-slate-200"}`}>
      {String(status || "pending").replaceAll("_", " ")}
    </span>
  );
}
