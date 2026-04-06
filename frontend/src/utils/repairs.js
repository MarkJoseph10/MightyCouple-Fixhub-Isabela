import { peso } from "./commerce";

export const REPAIR_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_parts", label: "Waiting parts" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

export const REPAIR_ATTACHMENT_GROUPS = [
  { key: "reportedIssue", label: "Issue media", uploadCategory: "reported_issue" },
  { key: "beforeRepair", label: "Before repair", uploadCategory: "before_repair" },
  { key: "diagnosis", label: "Diagnosis files", uploadCategory: "diagnosis" },
  { key: "afterRepair", label: "After repair", uploadCategory: "after_repair" },
  { key: "proofOfCompletion", label: "Proof of completion", uploadCategory: "proof_of_completion" }
];

export function getRepairStatusLabel(status = "") {
  return REPAIR_STATUS_OPTIONS.find((item) => item.value === status)?.label || "Pending";
}

export function getRepairStatusTone(status = "") {
  const value = String(status || "").toLowerCase();

  if (value === "completed") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (value === "ready_for_pickup") {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  }

  if (["quoted", "reviewing", "waiting_parts"].includes(value)) {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (["approved", "scheduled", "in_progress"].includes(value)) {
    return "border-violet-400/20 bg-violet-500/10 text-violet-100";
  }

  if (["rejected", "cancelled"].includes(value)) {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function getRepairTitle(repairRequest) {
  if (!repairRequest) {
    return "Repair request";
  }

  const parts = [
    repairRequest.device?.brand,
    repairRequest.device?.model || repairRequest.device?.type
  ].filter(Boolean);

  return parts.join(" ").trim() || repairRequest.requestNumber || "Repair request";
}

export function formatRepairDateTime(value, options = {}) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options
  }).format(new Date(value));
}

export function getRepairQuoteAmount(repairRequest) {
  return Number(
    repairRequest?.quote?.approvedAmount
    || repairRequest?.quote?.total
    || repairRequest?.invoice?.approvedAmount
    || 0
  );
}

export function getRepairPaymentLabel(repairRequest) {
  return peso(getRepairQuoteAmount(repairRequest));
}

export function getRepairScheduleLabel(repairRequest) {
  return repairRequest?.scheduledAt
    ? formatRepairDateTime(repairRequest.scheduledAt)
    : repairRequest?.preferredScheduleAt
      ? `Preferred ${formatRepairDateTime(repairRequest.preferredScheduleAt)}`
      : "Schedule to follow";
}

export function getRepairWaitingBadge(repairRequest) {
  const status = String(repairRequest?.status || "").toLowerCase();

  if (status === "quoted") {
    return "Waiting for customer approval";
  }
  if (status === "approved") {
    return "Ready for booking";
  }
  if (status === "scheduled") {
    return "Booking confirmed";
  }
  if (status === "ready_for_pickup") {
    return "Awaiting claim";
  }
  if (status === "completed") {
    return "Archive";
  }
  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Open";
}
