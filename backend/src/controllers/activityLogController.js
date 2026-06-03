import { ActivityLog } from "../models/ActivityLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function serializeActivityLog(log) {
  return {
    _id: log._id,
    actorName: log.actorName || "System",
    actorRole: log.actorRole || "system",
    category: log.category || "system",
    action: log.action,
    title: log.title,
    message: log.message,
    link: log.link || "",
    subjectType: log.subjectType || "",
    subjectId: log.subjectId || "",
    severity: log.severity || "info",
    metadata: log.metadata || {},
    createdAt: log.createdAt,
    updatedAt: log.updatedAt
  };
}

function buildActivityFilter(query = {}) {
  const category = String(query.category || "").trim().toLowerCase();
  const action = String(query.action || "").trim().toLowerCase();
  const severity = String(query.severity || "").trim().toLowerCase();
  const search = String(query.search || "").trim();
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();

  const filter = {};

  if (category && category !== "all") {
    filter.category = category;
  }

  if (action) {
    filter.action = action;
  }

  if (severity && severity !== "all") {
    filter.severity = severity;
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    if (!Object.keys(filter.createdAt).length) {
      delete filter.createdAt;
    }
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { message: { $regex: escaped, $options: "i" } },
      { actorName: { $regex: escaped, $options: "i" } },
      { subjectType: { $regex: escaped, $options: "i" } },
      { subjectId: { $regex: escaped, $options: "i" } }
    ];
  }

  return filter;
}

export const getActivityLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
  const page = Math.max(1, Number(req.query.page || 1));
  const filter = buildActivityFilter(req.query);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments(filter)
  ]);

  const totals = await ActivityLog.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);

  const summary = totals.reduce(
    (acc, entry) => {
      acc[entry._id || "system"] = entry.count;
      return acc;
    },
    { all: total }
  );

  res.json({
    logs: logs.map(serializeActivityLog),
    page,
    limit,
    total,
    hasMore: page * limit < total,
    summary
  });
});

export const exportActivityLogs = asyncHandler(async (req, res) => {
  const filter = buildActivityFilter(req.query);

  const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(5000);

  const header = [
    "Created At",
    "Category",
    "Action",
    "Severity",
    "Actor",
    "Role",
    "Title",
    "Message",
    "Subject Type",
    "Subject ID",
    "Link"
  ];

  const rows = logs.map((log) => [
    log.createdAt?.toISOString?.() || "",
    log.category || "system",
    log.action || "",
    log.severity || "info",
    log.actorName || "System",
    log.actorRole || "system",
    log.title || "",
    log.message || "",
    log.subjectType || "",
    log.subjectId || "",
    log.link || ""
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="activity-log.csv"');
  res.send(`\uFEFF${csv}`);
});
