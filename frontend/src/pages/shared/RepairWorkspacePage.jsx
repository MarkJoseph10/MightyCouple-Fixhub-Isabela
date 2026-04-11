import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CalendarRange,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Filter,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageSquare,
  PackageSearch,
  Phone,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Settings2,
  ShieldAlert,
  Star,
  Upload,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import LoadingScreen from "../../components/common/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { Capacitor } from "@capacitor/core";
import { captureImageFile, isNativeMediaAvailable, pickImageFile } from "../../utils/nativeMedia";
import {
  addRepairSlot,
  assignRepairRequest,
  bookRepairSlot,
  claimRepairRequest,
  createRepairRequest,
  fetchRepairOptions,
  fetchRepairRequest,
  fetchRepairRequests,
  finalizeRepairRequest,
  respondRepairQuote,
  submitRepairQuote,
  submitRepairRating,
  updateRepairDispute,
  updateRepairSchedule,
  updateRepairServicePoints,
  updateRepairSlot,
  updateRepairStatus,
  uploadRepairAttachments
} from "../../services/repairService";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";
import {
  REPAIR_ATTACHMENT_GROUPS,
  REPAIR_STATUS_OPTIONS,
  formatRepairDateTime,
  getRepairPaymentLabel,
  getRepairScheduleLabel,
  getRepairStatusLabel,
  getRepairStatusTone,
  getRepairTitle,
  getRepairWaitingBadge
} from "../../utils/repairs";

const statusFilterOptions = [{ value: "all", label: "All statuses" }, ...REPAIR_STATUS_OPTIONS];
const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "waived", label: "Waived" }
];
const paymentMethodOptions = [
  { value: "", label: "No payment method yet" },
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" }
];
const pickupMethodOptions = [
  { value: "drop_off", label: "Drop-off" },
  { value: "pickup", label: "Pickup request" }
];
const customerStatMeta = [
  { key: "total", label: "Total bookings", icon: Wrench, filter: "all" },
  { key: "open", label: "Open", icon: Clock3, filter: "open" },
  { key: "waitingCustomer", label: "Waiting on you", icon: AlertTriangle, filter: "waitingCustomer" },
  { key: "completed", label: "Completed", icon: CheckCircle2, filter: "completed" }
];
const sellerStatMeta = [
  { key: "total", label: "Assigned jobs", icon: Wrench, filter: "all" },
  { key: "pending", label: "Pending triage", icon: Clock3, filter: "pending" },
  { key: "waitingApproval", label: "Waiting approval", icon: CreditCard, filter: "waitingApproval" },
  { key: "waitingParts", label: "Waiting parts", icon: Boxes, filter: "waitingParts" },
  { key: "pickup", label: "Ready for pickup", icon: ClipboardList, filter: "pickup" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, filter: "overdue" }
];
const adminStatMeta = [
  { key: "total", label: "All jobs", icon: Wrench, filter: "all" },
  { key: "unassigned", label: "Unassigned", icon: UserRound, filter: "unassigned" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, filter: "overdue" },
  { key: "waitingApproval", label: "Waiting approval", icon: CreditCard, filter: "waitingApproval" },
  { key: "disputed", label: "Disputed", icon: ShieldAlert, filter: "disputed" },
  { key: "pickup", label: "Ready for pickup", icon: ClipboardList, filter: "pickup" }
];
const initialBookingForm = {
  sellerId: "",
  branchLabel: "",
  pickupMethod: "drop_off",
  deviceType: "",
  brand: "",
  model: "",
  serialNumber: "",
  color: "",
  accessories: "",
  issueDescription: "",
  preferredDateTime: "",
  contactNumber: "",
  alternateContact: ""
};
const initialSlotForm = { label: "", startAt: "", endAt: "", note: "", status: "available" };
const initialScheduleForm = { scheduledAt: "", scheduleNotes: "" };
const initialQuoteForm = {
  laborFee: "",
  partsFee: "",
  otherFee: "",
  estimatedCompletionAt: "",
  notes: "",
  paymentStatus: "unpaid",
  paymentMethod: "",
  paymentReference: "",
  technicianNotes: ""
};
const initialFinalizeForm = {
  technicianNotes: "",
  finalSummary: "",
  paymentStatus: "unpaid",
  paymentMethod: "",
  paymentReference: "",
  warrantyDurationDays: "",
  warrantyNote: "",
  dueAt: "",
  status: "ready_for_pickup",
  partsUsed: [{ name: "", quantity: 1, cost: "", note: "", linkedProductId: "", linkedProductCategory: "", stock: 0 }]
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function toDateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function humanizePickupMethod(value = "") {
  return pickupMethodOptions.find((option) => option.value === value)?.label || "Drop-off";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function sortRepairs(items = []) {
  return [...items].sort((left, right) => {
    return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
  });
}

function upsertRepair(items, repairRequest) {
  if (!repairRequest?._id) return sortRepairs(items);
  const nextItems = [...(items || []).filter((item) => item._id !== repairRequest._id), repairRequest];
  return sortRepairs(nextItems);
}

function matchesRepairSearch(repairRequest, value = "") {
  const needle = String(value || "").trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    repairRequest.requestNumber,
    repairRequest.device?.type,
    repairRequest.device?.brand,
    repairRequest.device?.model,
    repairRequest.issueDescription,
    repairRequest.branchLabel,
    repairRequest.contactNumber,
    repairRequest.customer?.name,
    repairRequest.customer?.email,
    repairRequest.seller?.storeName,
    repairRequest.seller?.name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function buildBookingStats(items = [], isCustomerMode) {
  if (isCustomerMode) {
    return {
      total: items.length,
      open: items.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
      waitingCustomer: items.filter((item) => ["quoted", "ready_for_pickup"].includes(item.status)).length,
      completed: items.filter((item) => item.status === "completed").length,
      pending: 0,
      waitingApproval: 0,
      waitingParts: 0,
      pickup: 0,
      overdue: 0,
      unassigned: 0,
      disputed: 0
    };
  }
  return {
    total: items.length,
    pending: items.filter((item) => ["pending", "reviewing"].includes(item.status)).length,
    open: items.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
    waitingCustomer: 0,
    completed: items.filter((item) => item.status === "completed").length,
    waitingApproval: items.filter((item) => item.queueFlags?.isWaitingCustomerApproval).length,
    waitingParts: items.filter((item) => item.queueFlags?.isWaitingParts).length,
    pickup: items.filter((item) => item.queueFlags?.isReadyForPickup).length,
    overdue: items.filter((item) => item.queueFlags?.isOverdue).length,
    unassigned: items.filter((item) => item.queueFlags?.isUnassigned).length,
    disputed: items.filter((item) => item.queueFlags?.isDisputed).length
  };
}

function buildDefaultQuoteForm(repairRequest) {
  return {
    laborFee: repairRequest?.quote?.laborFee ?? "",
    partsFee: repairRequest?.quote?.partsFee ?? "",
    otherFee: repairRequest?.quote?.otherFee ?? "",
    estimatedCompletionAt: toDateTimeInputValue(repairRequest?.quote?.estimatedCompletionAt),
    notes: repairRequest?.quote?.notes || "",
    paymentStatus: repairRequest?.quote?.paymentStatus || "unpaid",
    paymentMethod: repairRequest?.quote?.paymentMethod || "",
    paymentReference: repairRequest?.quote?.paymentReference || "",
    technicianNotes: repairRequest?.technicianNotes || ""
  };
}

function buildDefaultScheduleForm(repairRequest) {
  return {
    scheduledAt: toDateTimeInputValue(repairRequest?.scheduledAt || repairRequest?.preferredScheduleAt),
    scheduleNotes: repairRequest?.scheduleNotes || ""
  };
}

function buildDefaultFinalizeForm(repairRequest) {
  const existingParts = Array.isArray(repairRequest?.partsUsed) && repairRequest.partsUsed.length
    ? repairRequest.partsUsed
    : initialFinalizeForm.partsUsed;
  return {
    technicianNotes: repairRequest?.technicianNotes || "",
    finalSummary: repairRequest?.finalSummary || "",
    paymentStatus: repairRequest?.quote?.paymentStatus || "unpaid",
    paymentMethod: repairRequest?.quote?.paymentMethod || "",
    paymentReference: repairRequest?.quote?.paymentReference || "",
    warrantyDurationDays: repairRequest?.warranty?.durationDays ?? "",
    warrantyNote: repairRequest?.warranty?.note || "",
    dueAt: toDateTimeInputValue(repairRequest?.dueAt),
    status: repairRequest?.status === "completed" ? "completed" : "ready_for_pickup",
    partsUsed: existingParts.map((part) => ({
      name: part.name || "",
      quantity: Number(part.quantity || 1),
      cost: part.cost ?? "",
      note: part.note || "",
      linkedProductId: part.linkedProduct?._id || "",
      linkedProductCategory: part.linkedProduct?.category || "",
      stock: Number(part.linkedProduct?.stock || 0)
    }))
  };
}

function buildSlotDrafts(repairRequest) {
  return Object.fromEntries(
    (repairRequest?.availableSlots || []).map((slot) => [
      slot._id,
      {
        label: slot.label || "",
        startAt: toDateTimeInputValue(slot.startAt),
        endAt: toDateTimeInputValue(slot.endAt),
        note: slot.note || ""
      }
    ])
  );
}

function parseServicePoints(value = "") {
  return [...new Set(
    String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function buildServicePointDraft(points = []) {
  return (Array.isArray(points) ? points : []).filter(Boolean).join("\n");
}

function buildSlotStatusSummary(slots = []) {
  return {
    available: slots.filter((slot) => slot.status === "available").length,
    booked: slots.filter((slot) => slot.status === "booked").length,
    unavailable: slots.filter((slot) => slot.status === "unavailable").length,
    cancelled: slots.filter((slot) => slot.status === "cancelled").length
  };
}

function matchesQueueView(repairRequest, queueView = "all") {
  if (!repairRequest) return false;

  switch (queueView) {
    case "open":
      return !["completed", "cancelled"].includes(repairRequest.status);
    case "completed":
      return repairRequest.status === "completed";
    case "waitingCustomer":
      return ["quoted", "ready_for_pickup"].includes(repairRequest.status);
    case "pending":
      return ["pending", "reviewing"].includes(repairRequest.status);
    case "waitingApproval":
      return Boolean(repairRequest.queueFlags?.isWaitingCustomerApproval);
    case "waitingParts":
      return Boolean(repairRequest.queueFlags?.isWaitingParts);
    case "pickup":
      return Boolean(repairRequest.queueFlags?.isReadyForPickup);
    case "overdue":
      return Boolean(repairRequest.queueFlags?.isOverdue);
    case "unassigned":
      return Boolean(repairRequest.queueFlags?.isUnassigned);
    case "disputed":
      return Boolean(repairRequest.queueFlags?.isDisputed);
    default:
      return true;
  }
}

function printRepairReceipt(repairRequest) {
  if (typeof window === "undefined" || !repairRequest) return;
  const popup = window.open("", "_blank", "width=900,height=760");
  if (!popup) return;
  const title = escapeHtml(getRepairTitle(repairRequest));
  const summary = escapeHtml(repairRequest.finalSummary || repairRequest.issueDescription || "Repair service summary pending.");
  const partsRows = (repairRequest.partsUsed || [])
    .map(
      (part) => `
        <tr>
          <td>${escapeHtml(part.name || "Part")}</td>
          <td>${escapeHtml(String(part.quantity || 0))}</td>
          <td>${escapeHtml(peso(part.cost || 0))}</td>
          <td>${escapeHtml(peso(Number(part.quantity || 0) * Number(part.cost || 0)))}</td>
        </tr>
      `
    )
    .join("");
  const timelineRows = (repairRequest.timeline || [])
    .slice(-6)
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.label || "")}</td>
          <td>${escapeHtml(formatRepairDateTime(entry.createdAt))}</td>
          <td>${escapeHtml(entry.actor?.name || entry.actorName || "System")}</td>
        </tr>
      `
    )
    .join("");
  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(repairRequest.requestNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
          h1, h2, h3 { margin-bottom: 8px; }
          .muted { color: #6b7280; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
          .hero { border: 1px solid #dbeafe; border-radius: 20px; padding: 20px; background: #eff6ff; margin: 20px 0; }
          .certificate { border: 1px dashed #94a3b8; border-radius: 18px; padding: 18px; margin-top: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="muted">${escapeHtml(repairRequest.requestNumber)} | ${escapeHtml(getRepairStatusLabel(repairRequest.status))}</p>
        <div class="grid">
          <div class="card">
            <h3>Customer</h3>
            <p>${escapeHtml(repairRequest.customer?.name || repairRequest.customer?.email || "Customer")}</p>
            <p class="muted">${escapeHtml(repairRequest.contactNumber || "No contact number")}</p>
          </div>
          <div class="card">
            <h3>Repair desk</h3>
            <p>${escapeHtml(repairRequest.seller?.storeName || repairRequest.seller?.name || "Admin assigned later")}</p>
            <p class="muted">${escapeHtml(repairRequest.branchLabel || humanizePickupMethod(repairRequest.pickupMethod))}</p>
          </div>
        </div>
        <div class="card">
          <h3>Device</h3>
          <p>${escapeHtml(repairRequest.device?.brand || "")} ${escapeHtml(repairRequest.device?.model || repairRequest.device?.type || "")}</p>
          <p class="muted">${escapeHtml(repairRequest.issueDescription || "")}</p>
        </div>
        <div class="grid">
          <div class="card">
            <h3>Invoice</h3>
            <p>Approved amount: ${escapeHtml(getRepairPaymentLabel(repairRequest))}</p>
            <p>Payment status: ${escapeHtml(repairRequest.quote?.paymentStatus || "unpaid")}</p>
            <p>Payment method: ${escapeHtml(repairRequest.invoice?.paymentMethod || repairRequest.quote?.paymentMethod || "Not set")}</p>
            <p>Payment reference: ${escapeHtml(repairRequest.invoice?.paymentReference || repairRequest.quote?.paymentReference || "Not set")}</p>
          </div>
          <div class="card">
            <h3>Final findings</h3>
            <p>${summary}</p>
          </div>
        </div>
        <div class="hero">
          <h2>Warranty and completion summary</h2>
          <p>Warranty note: ${escapeHtml(repairRequest.warranty?.note || "No warranty note")}</p>
          <p>Warranty expiry: ${escapeHtml(repairRequest.warranty?.expiresAt ? formatRepairDateTime(repairRequest.warranty.expiresAt) : "Not set")}</p>
          <p>Repair desk: ${escapeHtml(repairRequest.branchLabel || humanizePickupMethod(repairRequest.pickupMethod))}</p>
        </div>
        <h2>Parts used</h2>
        <table>
          <thead><tr><th>Part</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr></thead>
          <tbody>${partsRows || "<tr><td colspan='4'>No parts were logged.</td></tr>"}</tbody>
        </table>
        <h2>Recent timeline</h2>
        <table>
          <thead><tr><th>Update</th><th>When</th><th>By</th></tr></thead>
          <tbody>${timelineRows || "<tr><td colspan='3'>No updates yet.</td></tr>"}</tbody>
        </table>
        <div class="certificate">
          <h3>Repair completion certificate</h3>
          <p>This document confirms that ${title} under request ${escapeHtml(repairRequest.requestNumber)} was processed through the Mighty Couple repair workflow.</p>
          <p>Status: ${escapeHtml(getRepairStatusLabel(repairRequest.status))}</p>
          <p>Customer: ${escapeHtml(repairRequest.customer?.name || repairRequest.customer?.email || "Customer")}</p>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function Field({ label, helper, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</span>
      {children}
      {helper ? <span className="text-xs leading-6 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function inputClassName(extra = "") {
  return classNames(
    "w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/30 focus:bg-slate-950/60",
    extra
  );
}

function SectionCard({ eyebrow, title, description, actions, children, sectionId, className = "" }) {
  const isNativeApp = Capacitor.isNativePlatform();
  return (
    <section
      id={sectionId}
      className={classNames(
        "glass-panel shadow-ambient",
        isNativeApp ? "rounded-[24px] p-4" : "rounded-[30px] p-5 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p> : null}
          <h2 className={classNames("mt-2 font-semibold text-white", isNativeApp ? "text-lg" : "text-xl")}>{title}</h2>
          {description ? (
            <p className={classNames("mt-3 max-w-3xl text-slate-300", isNativeApp ? "text-[13px] leading-6" : "text-sm leading-7")}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={classNames(isNativeApp ? "mt-4" : "mt-5")}>{children}</div>
    </section>
  );
}

function MetricCard({ label, value, hint, icon: Icon, active = false, onClick }) {
  const isNativeApp = Capacitor.isNativePlatform();
  const cardClassName = classNames(
    "glass-panel shadow-ambient",
    isNativeApp ? "rounded-[20px] p-3" : "rounded-[26px] p-4",
    onClick ? "text-left transition hover:bg-white/10" : "",
    active ? "border border-brand-400/40 bg-brand-500/10" : ""
  );
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
        <p className={classNames("mt-3 font-semibold text-white", isNativeApp ? "text-2xl" : "text-3xl")}>{value}</p>
        <p className={classNames("mt-2 text-slate-400", isNativeApp ? "text-xs" : "text-sm")}>{hint}</p>
      </div>
      <div
        className={classNames(
          "inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200",
          isNativeApp ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Icon size={isNativeApp ? 16 : 18} />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClassName}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

const CUSTOMER_REPAIR_STEPS = [
  { key: "pending", label: "Booking sent" },
  { key: "reviewing", label: "Estimate on the way" },
  { key: "quoted", label: "Your approval" },
  { key: "approved", label: "Choose a schedule" },
  { key: "in_progress", label: "Repair in progress" },
  { key: "ready_for_pickup", label: "Ready to claim" },
  { key: "completed", label: "Completed" }
];

function getCustomerFriendlyStatusLabel(status = "") {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "Booking received";
    case "reviewing":
      return "We are reviewing your device";
    case "quoted":
      return "Your approval is needed";
    case "approved":
      return "Ready for scheduling";
    case "scheduled":
      return "Schedule confirmed";
    case "in_progress":
      return "Repair in progress";
    case "waiting_parts":
      return "Waiting for parts";
    case "ready_for_pickup":
      return "Your device is ready to claim";
    case "completed":
      return "Repair completed";
    case "rejected":
      return "Estimate was not approved";
    case "cancelled":
      return "Repair request closed";
    default:
      return getRepairStatusLabel(status);
  }
}

function getCustomerFriendlyWaitingText(repairRequest) {
  const status = String(repairRequest?.status || "").toLowerCase();

  if (status === "pending") {
    return "Your booking was submitted and is waiting for review.";
  }
  if (status === "reviewing") {
    return "The repair desk is checking the problem and preparing your estimate.";
  }
  if (status === "quoted") {
    return "Please review the estimate so the repair can move forward.";
  }
  if (status === "approved") {
    return (repairRequest?.availableSlots || []).some((slot) => slot.status === "available")
      ? "Choose a repair time that works for you."
      : "The quote is approved. A repair time will be offered soon.";
  }
  if (status === "scheduled") {
    return "Your repair schedule is confirmed.";
  }
  if (status === "in_progress") {
    return "Your device is currently being repaired.";
  }
  if (status === "waiting_parts") {
    return "The repair is waiting for parts or a replacement item.";
  }
  if (status === "ready_for_pickup") {
    return "Use your claim code when you are ready to pick up your device.";
  }
  if (status === "completed") {
    return repairRequest?.rating?.createdAt ? "This repair is complete." : "Your repair is complete. You can now rate the service.";
  }
  if (status === "rejected") {
    return "The estimate was not approved yet. Message the repair desk if you want it revised.";
  }
  if (status === "cancelled") {
    return "This repair request is already closed.";
  }

  return getRepairWaitingBadge(repairRequest);
}

function getCustomerStepIndex(repairRequest) {
  const status = String(repairRequest?.status || "").toLowerCase();

  switch (status) {
    case "pending":
      return 0;
    case "reviewing":
      return 1;
    case "quoted":
    case "rejected":
      return 2;
    case "approved":
      return 3;
    case "scheduled":
    case "in_progress":
    case "waiting_parts":
      return 4;
    case "ready_for_pickup":
      return 5;
    case "completed":
      return 6;
    default:
      return 0;
  }
}

function getCustomerLatestUpdate(repairRequest) {
  const items = Array.isArray(repairRequest?.timeline) ? repairRequest.timeline : [];
  if (!items.length) return null;
  return [...items].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())[0];
}

function getCustomerPrimaryAction(repairRequest) {
  if (!repairRequest) return null;

  const status = String(repairRequest.status || "").toLowerCase();
  const availableSlotCount = (repairRequest.availableSlots || []).filter((slot) => slot.status === "available").length;

  if (status === "quoted" && repairRequest.permissions?.canApproveQuote) {
    return {
      key: "approve_quote",
      label: "Review estimate",
      description: "Approve or reject the estimate so the repair can continue."
    };
  }

  if (status === "approved" && availableSlotCount > 0) {
    return {
      key: "book_slot",
      label: "Choose your schedule",
      description: "Pick the repair time that works best for you."
    };
  }

  if (status === "ready_for_pickup" && repairRequest.claim?.otp && repairRequest.status !== "completed") {
    return {
      key: "claim_with_otp",
      label: "Claim your device",
      description: "Use the claim code to verify pickup when you arrive."
    };
  }

  if (repairRequest.permissions?.canRate) {
    return {
      key: "rate_service",
      label: "Rate the repair service",
      description: "Share how the repair went after completion."
    };
  }

  if (["pending", "reviewing", "scheduled", "in_progress", "waiting_parts", "rejected"].includes(status)) {
    return {
      key: "open_chat",
      label: status === "rejected" ? "Ask for a revised estimate" : "Message your repair desk",
      description: status === "rejected"
        ? "Use chat if you want the estimate updated before moving forward."
        : "Send a message if you need clarification or a status update."
    };
  }

  return null;
}

function getCustomerActionCopy(action = {}) {
  const byKey = {
    approve_quote: {
      label: "Review estimate",
      description: "Check the estimate and approve or reject it so your repair can move forward."
    },
    book_slot: {
      label: "Choose your schedule",
      description: "Pick the repair time that works best for you."
    },
    upload_proof: {
      label: "Add more photos or videos",
      description: "Upload clearer damage photos or follow-up proof for the repair desk."
    },
    open_chat: {
      label: "Message your repair desk",
      description: "Ask questions about the estimate, schedule, progress, or release."
    },
    claim_with_otp: {
      label: "Claim your device",
      description: "Use your claim code to verify pickup when your device is ready."
    },
    rate_service: {
      label: "Rate the repair service",
      description: "Share feedback about the repair quality, turnaround time, and communication."
    }
  };

  return {
    label: byKey[action.key]?.label || action.label,
    description: byKey[action.key]?.description || action.description || ""
  };
}

function CustomerOverviewCard({ label, title, description, tone = "default" }) {
  const isNativeApp = Capacitor.isNativePlatform();
  return (
    <div
      className={classNames(
        "border",
        isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4",
        tone === "brand"
          ? "border-brand-400/20 bg-brand-500/10"
          : tone === "emerald"
            ? "border-emerald-400/20 bg-emerald-500/10"
            : tone === "amber"
              ? "border-amber-400/20 bg-amber-500/10"
              : "border-white/10 bg-white/5"
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={classNames("mt-3 font-semibold text-white", isNativeApp ? "text-sm" : "text-base")}>{title}</p>
      {description ? <p className={classNames("mt-2 text-slate-300", isNativeApp ? "text-xs leading-5" : "text-sm leading-6")}>{description}</p> : null}
    </div>
  );
}

function CustomerProgressStepper({ repairRequest }) {
  const isNativeApp = Capacitor.isNativePlatform();
  const currentIndex = getCustomerStepIndex(repairRequest);
  const status = String(repairRequest?.status || "").toLowerCase();

  return (
    <div className={classNames("border border-white/10 bg-slate-950/30", isNativeApp ? "rounded-[22px] p-3" : "rounded-[26px] p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Progress tracker</p>
          <p className={classNames("mt-2 text-slate-300", isNativeApp ? "text-xs" : "text-sm")}>Follow your repair from booking to pickup in one simple view.</p>
        </div>
        <StatusBadge status={repairRequest?.status} label={getCustomerFriendlyStatusLabel(repairRequest?.status)} />
      </div>
      <div className={classNames("mt-4 grid", isNativeApp ? "grid-cols-2 gap-2" : "gap-3 md:grid-cols-2 xl:grid-cols-7")}>
        {CUSTOMER_REPAIR_STEPS.map((step, index) => {
          const done = status === "completed" ? index <= currentIndex : index < currentIndex;
          const current = index === currentIndex && !["cancelled"].includes(status);

          return (
            <div
                key={step.key}
                className={classNames(
                  "border",
                  isNativeApp ? "rounded-[18px] p-2.5" : "rounded-[22px] p-3",
                  current
                    ? "border-brand-400/30 bg-brand-500/10"
                    : done
                    ? "border-emerald-400/20 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={classNames(
                    "inline-flex items-center justify-center rounded-full border text-xs font-semibold",
                    isNativeApp ? "h-7 w-7" : "h-8 w-8",
                    current
                      ? "border-brand-400/30 bg-brand-500/20 text-white"
                      : done
                        ? "border-emerald-400/20 bg-emerald-500/20 text-emerald-100"
                        : "border-white/10 bg-slate-950/30 text-slate-400"
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <p className={classNames("font-semibold text-white", isNativeApp ? "text-xs" : "text-sm")}>{step.label}</p>
                  <p className={classNames("mt-1 uppercase tracking-[0.18em] text-slate-500", isNativeApp ? "text-[10px]" : "text-[11px]")}>
                    {current ? "Current" : done ? "Done" : "Coming up"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {status === "waiting_parts" ? (
        <div className="mt-4 rounded-[20px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          The repair desk is currently waiting for parts or a replacement item before the work can continue.
        </div>
      ) : null}
      {status === "rejected" ? (
        <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          The estimate was not approved yet. You can message the repair desk if you want it revised.
        </div>
      ) : null}
      {status === "cancelled" ? (
        <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This repair request has been closed.
        </div>
      ) : null}
    </div>
  );
}

function CollapsiblePanel({ title, description, children, defaultOpen = false }) {
  const isNativeApp = Capacitor.isNativePlatform();
  return (
    <details open={defaultOpen} className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4")}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className={classNames("font-semibold text-white", isNativeApp ? "text-xs" : "text-sm")}>{title}</p>
          {description ? <p className={classNames("mt-2 text-slate-400", isNativeApp ? "text-xs leading-5" : "text-sm leading-6")}>{description}</p> : null}
        </div>
        <span className={classNames("rounded-full border border-white/10 bg-slate-950/30 font-semibold text-slate-200", isNativeApp ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs")}>
          See more
        </span>
      </summary>
      <div className={classNames(isNativeApp ? "mt-3" : "mt-4")}>{children}</div>
    </details>
  );
}

function StatusBadge({ status, label }) {
  return (
    <span className={classNames("inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold", getRepairStatusTone(status))}>
      {label || getRepairStatusLabel(status)}
    </span>
  );
}

function QueueCard({ repairRequest, isActive, onClick, isCustomerMode = false }) {
  const isNativeApp = Capacitor.isNativePlatform();
  const flags = [
    repairRequest.queueFlags?.isUnassigned ? "Unassigned" : "",
    repairRequest.queueFlags?.isOverdue ? "Overdue" : "",
    repairRequest.queueFlags?.isWaitingCustomerApproval ? "Waiting approval" : "",
    repairRequest.queueFlags?.isWaitingParts ? "Waiting parts" : "",
    repairRequest.queueFlags?.isReadyForPickup ? "Ready for pickup" : "",
    repairRequest.queueFlags?.isDisputed ? "Disputed" : ""
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full border text-left transition",
        isNativeApp ? "rounded-[20px] p-3" : "rounded-[26px] p-4",
        isActive ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
      )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{getRepairTitle(repairRequest)}</p>
              <StatusBadge status={repairRequest.status} label={isCustomerMode ? getCustomerFriendlyStatusLabel(repairRequest.status) : undefined} />
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{repairRequest.requestNumber}</p>
          </div>
          <p className={classNames("text-slate-500", isNativeApp ? "text-[10px]" : "text-[11px]")}>{formatRepairDateTime(repairRequest.updatedAt)}</p>
        </div>
        <div className={classNames("mt-4 grid", isNativeApp ? "gap-2" : "gap-3 sm:grid-cols-2")}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue</p>
            <p className={classNames("mt-1 line-clamp-2 text-slate-300", isNativeApp ? "text-xs leading-5" : "text-sm leading-6")}>{repairRequest.issueDescription || "No issue description yet."}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Schedule</p>
            <p className={classNames("mt-1 text-slate-300", isNativeApp ? "text-xs leading-5" : "text-sm leading-6")}>{getRepairScheduleLabel(repairRequest)}</p>
            <p className={classNames("mt-1 text-slate-500", isNativeApp ? "text-[11px]" : "text-xs")}>{isCustomerMode ? getCustomerFriendlyWaitingText(repairRequest) : getRepairWaitingBadge(repairRequest)}</p>
          </div>
        </div>
        <div className={classNames("mt-4 flex flex-wrap items-center gap-2 text-slate-400", isNativeApp ? "text-[11px]" : "text-xs")}>
          {isCustomerMode ? (
            <>
              <span>{repairRequest.seller?.storeName || repairRequest.seller?.name || "Waiting for repair desk"}</span>
              <span className="text-slate-600">|</span>
              <span>{repairRequest.branchLabel || humanizePickupMethod(repairRequest.pickupMethod)}</span>
            </>
          ) : (
            <>
              <span>{repairRequest.customer?.name || repairRequest.customer?.email || "Customer"}</span>
              <span className="text-slate-600">|</span>
              <span>{repairRequest.seller?.storeName || repairRequest.branchLabel || "Waiting for assignment"}</span>
            </>
          )}
          {flags.length ? (
            <>
              <span className="text-slate-600">|</span>
            {flags.map((flag) => (
              <span key={flag} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                {flag}
              </span>
            ))}
          </>
        ) : null}
      </div>
    </button>
  );
}

function AttachmentGallery({ title, attachments = [] }) {
  const isNativeApp = Capacitor.isNativePlatform();
  return (
    <div className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4")}>
      <div className="flex items-center justify-between gap-3">
        <p className={classNames("font-semibold text-white", isNativeApp ? "text-xs" : "text-sm")}>{title}</p>
        <span className={classNames("uppercase tracking-[0.2em] text-slate-500", isNativeApp ? "text-[10px]" : "text-xs")}>{attachments.length} file{attachments.length === 1 ? "" : "s"}</span>
      </div>
      {attachments.length ? (
        <div className={classNames("mt-4 grid", isNativeApp ? "gap-2" : "gap-3 sm:grid-cols-2")}>
          {attachments.map((attachment) => (
            <div key={attachment._id} className={classNames("overflow-hidden border border-white/10 bg-slate-950/30", isNativeApp ? "rounded-[18px]" : "rounded-[22px]")}>
              {attachment.type === "video" ? (
                <video controls preload="metadata" className={classNames("w-full bg-slate-950 object-cover", isNativeApp ? "h-32" : "h-48")} src={resolveMediaUrl(attachment.url)} />
              ) : (
                <img src={resolveMediaUrl(attachment.url)} alt={attachment.originalName || title} className={classNames("w-full object-cover", isNativeApp ? "h-32" : "h-48")} loading="lazy" />
              )}
              <div className={classNames("space-y-1", isNativeApp ? "p-2.5" : "p-3")}>
                <p className={classNames("truncate font-medium text-white", isNativeApp ? "text-xs" : "text-sm")}>{attachment.originalName || "Attachment"}</p>
                <a href={resolveMediaUrl(attachment.url)} target="_blank" rel="noreferrer" className={classNames("inline-flex items-center gap-1 text-cyan-200 transition hover:text-white", isNativeApp ? "text-[11px]" : "text-xs")}>
                  Open file
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          No uploads in this section yet.
        </div>
      )}
    </div>
  );
}

function PendingFiles({ files, onRemove }) {
  if (!files.length) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
          {file.name}
          <button type="button" onClick={() => onRemove(index)} className="text-slate-400 transition hover:text-white">
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AttachmentUploadCard({ title, category, disabled, busy, onUpload, helper }) {
  const [files, setFiles] = useState([]);
  const nativeMediaEnabled = Capacitor.isNativePlatform() && isNativeMediaAvailable();

  useEffect(() => {
    setFiles([]);
  }, [category]);

  function appendFiles(incomingFiles = []) {
    if (!incomingFiles.length) return;
    setFiles((current) => [...current, ...incomingFiles].slice(0, 4));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!files.length) return;
    const success = await onUpload(files);
    if (success) setFiles([]);
  }

  async function handleCaptureImage() {
    const file = await captureImageFile(`repair-${category}-camera`);
    appendFiles(file ? [file] : []);
  }

  async function handlePickImage() {
    const file = await pickImageFile(`repair-${category}-gallery`);
    appendFiles(file ? [file] : []);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p>
        </div>
        <Upload size={16} className="text-slate-400" />
        </div>
        <div className="mt-4">
          <PendingFiles files={files} onRemove={(index) => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} />
          {nativeMediaEnabled ? (
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleCaptureImage().catch(() => {})}
                disabled={disabled || busy}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera size={15} />
                Take photo
              </button>
              <button
                type="button"
                onClick={() => handlePickImage().catch(() => {})}
                disabled={disabled || busy}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus size={15} />
                Choose from gallery
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={disabled || busy}
            onChange={(event) => {
              const picked = Array.from(event.target.files || []);
              appendFiles(picked);
              event.target.value = "";
            }}
            className="block w-full rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={disabled || busy || !files.length} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
          Upload
        </button>
      </div>
    </form>
  );
}

function DetailMeta({ label, value, icon: Icon }) {
  const isNativeApp = Capacitor.isNativePlatform();
  return (
    <div className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[18px] p-3" : "rounded-[22px] p-4")}>
      <div className="flex items-center gap-3">
        <div className={classNames("inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300", isNativeApp ? "h-8 w-8" : "h-10 w-10")}>
          <Icon size={isNativeApp ? 14 : 16} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className={classNames("mt-1 text-white", isNativeApp ? "text-xs leading-5" : "text-sm leading-6")}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function PartEditor({ value, onChange, productOptions = [] }) {
  function updateRow(index, field, nextValue) {
    onChange(value.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: nextValue } : row)));
  }

  function updateLinkedProduct(index, productId) {
    const selectedProduct = productOptions.find((product) => String(product._id) === String(productId));
    onChange(
      value.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (!selectedProduct) {
          return { ...row, linkedProductId: "", linkedProductCategory: "", stock: 0 };
        }

        return {
          ...row,
          linkedProductId: productId,
          linkedProductCategory: selectedProduct.category || "",
          name: row.name || selectedProduct.name || "",
          cost: row.cost === "" || Number(row.cost) === 0 ? Number(selectedProduct.price || 0) : row.cost,
          stock: Number(selectedProduct.stock || 0)
        };
      })
    );
  }

  function addRow() {
    onChange([...value, { name: "", quantity: 1, cost: "", note: "", linkedProductId: "", linkedProductCategory: "", stock: 0 }]);
  }
  function removeRow(index) {
    onChange(value.filter((_, rowIndex) => rowIndex !== index));
  }

  const partsTotal = value.reduce((sum, row) => sum + safeNumber(row.quantity, 1) * safeNumber(row.cost, 0), 0);

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div key={`part-${index}`} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          {(() => {
            const replacementOptions = row.linkedProductId
              ? productOptions
                  .filter((product) => {
                    if (String(product._id) === String(row.linkedProductId)) return false;
                    if (Number(product.stock || 0) <= 0) return false;
                    if (row.linkedProductCategory && product.category !== row.linkedProductCategory) return false;
                    return true;
                  })
                  .slice(0, 3)
              : [];
            const hasEnoughLinkedStock = Number(row.stock || 0) >= safeNumber(row.quantity, 1);

            return (
              <>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Part name">
              <input value={row.name} onChange={(event) => updateRow(index, "name", event.target.value)} className={inputClassName()} placeholder="Battery, screen, charging flex" />
            </Field>
            <Field label="Linked inventory">
              <select value={row.linkedProductId} onChange={(event) => updateLinkedProduct(index, event.target.value)} className={inputClassName()}>
                <option value="">No linked catalog product</option>
                {productOptions.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
              </select>
            </Field>
            <Field label="Quantity">
              <input type="number" min="1" value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} className={inputClassName()} />
            </Field>
            <Field label="Cost">
              <input type="number" min="0" step="0.01" value={row.cost} onChange={(event) => updateRow(index, "cost", event.target.value)} className={inputClassName()} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1.5 text-slate-200">
              Row total {peso(safeNumber(row.quantity, 1) * safeNumber(row.cost, 0))}
            </span>
            {row.linkedProductId ? (
              <span className={classNames(
                "rounded-full border px-3 py-1.5",
                hasEnoughLinkedStock ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-rose-400/20 bg-rose-500/10 text-rose-100"
              )}>
                Stock {Number(row.stock || 0)}
              </span>
            ) : null}
            {row.linkedProductCategory ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
                {row.linkedProductCategory}
              </span>
            ) : null}
          </div>
          {row.linkedProductId && !hasEnoughLinkedStock ? (
            <div className="mt-3 rounded-[18px] border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100">
              Linked stock is low for this quantity. Consider a replacement from the same category before finalizing the repair.
              {replacementOptions.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {replacementOptions.map((product) => (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => updateLinkedProduct(index, product._id)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/10"
                    >
                      Use {product.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <Field label="Part note">
            <input value={row.note} onChange={(event) => updateRow(index, "note", event.target.value)} className={inputClassName()} placeholder="Supplier, replacement version, compatibility note" />
          </Field>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => removeRow(index)} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
              Remove part
            </button>
          </div>
              </>
            );
          })()}
        </div>
      ))}
      <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
        <Plus size={15} />
        Add part
      </button>
      <div className="rounded-[20px] border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-200">
        Estimated parts total: <span className="font-semibold text-white">{peso(partsTotal)}</span>
      </div>
    </div>
  );
}

function HistoryList({ title, items = [], emptyLabel = "No history yet.", tone = "default" }) {
  const toneClassName = tone === "audit"
    ? "border-violet-400/20 bg-violet-500/10"
    : "border-white/10 bg-white/5";

  return (
    <div className={classNames("rounded-[24px] border p-4", toneClassName)}>
      <p className="text-sm font-semibold text-white">{title}</p>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-[18px] border border-white/10 bg-slate-950/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{item.label || item.title}</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{formatRepairDateTime(item.createdAt)}</span>
              </div>
              {item.message ? <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p> : null}
              <p className="mt-2 text-xs text-slate-500">
                By {item.actor?.name || item.actorName || "System"}{item.actorRole ? ` • ${item.actorRole}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export default function RepairWorkspacePage({ mode = "customer" }) {
  const { user } = useAuth();
  const { openRepairChat } = useChat();
  const isNativeApp = Capacitor.isNativePlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [options, setOptions] = useState({ sellers: [] });
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [repairRequests, setRepairRequests] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [queueView, setQueueView] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [bookingOpen, setBookingOpen] = useState(mode === "customer");
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [bookingFiles, setBookingFiles] = useState([]);
  const [quoteForm, setQuoteForm] = useState(initialQuoteForm);
  const [quoteResponseNote, setQuoteResponseNote] = useState("");
  const [slotForm, setSlotForm] = useState(initialSlotForm);
  const [slotDrafts, setSlotDrafts] = useState({});
  const [editingSlotId, setEditingSlotId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotBookingNote, setSlotBookingNote] = useState("");
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [statusOverrideValue, setStatusOverrideValue] = useState("pending");
  const [statusNote, setStatusNote] = useState("");
  const [assignForm, setAssignForm] = useState({ sellerId: "", branchLabel: "" });
  const [servicePointSellerId, setServicePointSellerId] = useState("");
  const [servicePointDraft, setServicePointDraft] = useState("");
  const [workflowStatusValue, setWorkflowStatusValue] = useState("reviewing");
  const [workflowStatusNote, setWorkflowStatusNote] = useState("");
  const [finalizeForm, setFinalizeForm] = useState(initialFinalizeForm);
  const [disputeForm, setDisputeForm] = useState({ reason: "", message: "", resolutionNote: "" });
  const [claimCode, setClaimCode] = useState("");
  const [ratingForm, setRatingForm] = useState({ rating: "5", comment: "" });
  const nativeMediaEnabled = Capacitor.isNativePlatform() && isNativeMediaAvailable();

  const isCustomerMode = mode === "customer";
  const isAdminMode = mode === "admin";
  const isSellerMode = mode === "seller";
  const repairParam = searchParams.get("repair") || "";

  const pageCopy = useMemo(() => {
    if (isAdminMode) {
      return {
        eyebrow: "Repair control center",
        title: "Admin repair oversight",
        description: "Review every repair request, assign the right seller, step in on disputes, audit the full timeline, and keep service quality visible."
      };
    }
    if (isSellerMode) {
      return {
        eyebrow: "Repair desk",
        title: "Repairs assigned to your store",
        description: "Handle diagnostics, send quotes, offer schedules, upload proof, and keep customers updated without losing the full service history."
      };
    }
    return {
      eyebrow: "Repair booking",
      title: "Book a device repair and stay updated",
      description: "Send your issue details, attach damage photos or videos, choose a repair desk, approve quotes, chat about the request, and track the full service timeline."
    };
  }, [isAdminMode, isSellerMode]);

  const selectedRepair = useMemo(
    () => repairRequests.find((repairRequest) => String(repairRequest._id) === String(repairParam)) || null,
    [repairParam, repairRequests]
  );
  const selectedBookingSeller = useMemo(
    () => (options.sellers || []).find((seller) => String(seller._id) === String(bookingForm.sellerId)) || null,
    [bookingForm.sellerId, options.sellers]
  );
  const assignSellerOption = useMemo(
    () => (options.sellers || []).find((seller) => String(seller._id) === String(assignForm.sellerId)) || null,
    [assignForm.sellerId, options.sellers]
  );
  const bookingServicePoints = selectedBookingSeller?.servicePoints || [];
  const assignServicePoints = assignSellerOption?.servicePoints || [];
  const managedServicePointSellerId = isSellerMode
    ? String(user?._id || "")
    : servicePointSellerId || selectedRepair?.seller?._id || assignForm.sellerId || "";
  const managedServicePointSeller = useMemo(
    () => (options.sellers || []).find((seller) => String(seller._id) === String(managedServicePointSellerId)) || null,
    [managedServicePointSellerId, options.sellers]
  );
  const managedServicePoints = managedServicePointSeller?.servicePoints || [];
  const servicePointDraftEntries = useMemo(() => parseServicePoints(servicePointDraft), [servicePointDraft]);

  const visibleRepairs = useMemo(() => {
    return repairRequests.filter((repairRequest) => {
      if (!matchesRepairSearch(repairRequest, searchValue)) return false;
      if (statusFilter !== "all" && repairRequest.status !== statusFilter) return false;
      if (sellerFilter !== "all" && String(repairRequest.seller?._id || "") !== sellerFilter) return false;
      if (!matchesQueueView(repairRequest, queueView)) return false;
      return true;
    });
  }, [queueView, repairRequests, searchValue, sellerFilter, statusFilter]);

  const stats = useMemo(() => buildBookingStats(repairRequests, isCustomerMode), [isCustomerMode, repairRequests]);
  const statCards = useMemo(() => {
    const meta = isCustomerMode ? customerStatMeta : isAdminMode ? adminStatMeta : sellerStatMeta;
    return meta.map((item) => ({ ...item, value: stats[item.key] || 0 }));
  }, [isAdminMode, isCustomerMode, stats]);
  const queueQuickFilters = useMemo(
    () => [{ key: "all", label: "All", filter: "all", value: repairRequests.length }, ...statCards.filter((card) => card.filter && card.filter !== "all")],
    [repairRequests.length, statCards]
  );

  const attachmentGroupsForMode = useMemo(() => {
    return isCustomerMode
      ? REPAIR_ATTACHMENT_GROUPS.filter((item) => item.uploadCategory === "reported_issue")
      : REPAIR_ATTACHMENT_GROUPS;
  }, [isCustomerMode]);

  async function loadCatalogProducts() {
    if (isCustomerMode) return [];
    const endpoint = isAdminMode ? "/products/admin" : "/products/seller/mine";
    const { data } = await api.get(endpoint);
    return Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
  }

  async function loadWorkspaceData({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [nextOptions, nextRepairs, nextProducts] = await Promise.all([
        fetchRepairOptions(),
        fetchRepairRequests(mode, { limit: 100 }),
        loadCatalogProducts()
      ]);

      setOptions(nextOptions || { sellers: [] });
      setRepairRequests(sortRepairs(nextRepairs.repairRequests || []));
      setCatalogProducts(nextProducts || []);
      setError("");
    } catch (requestError) {
      setError(extractErrorMessage(requestError, "Unable to load repair workspace."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkspaceData().catch(() => {});
  }, [mode]);

  useEffect(() => {
    if (!repairRequests.length) return;
    if (!repairParam) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("repair", repairRequests[0]._id);
        return next;
      }, { replace: true });
      return;
    }

    const exists = repairRequests.some((repairRequest) => String(repairRequest._id) === String(repairParam));
    if (!exists) {
      fetchRepairRequest(repairParam)
        .then((repairRequest) => {
          setRepairRequests((current) => upsertRepair(current, repairRequest));
        })
        .catch(() => {});
    }
  }, [repairParam, repairRequests, setSearchParams]);

  useEffect(() => {
    if (!selectedRepair) return;

    setAssignForm({
      sellerId: selectedRepair.seller?._id || "",
      branchLabel: selectedRepair.branchLabel || ""
    });
    setSelectedSlotId((selectedRepair.availableSlots || []).find((slot) => slot.status === "available")?._id || "");
    setQuoteForm(buildDefaultQuoteForm(selectedRepair));
    setSlotDrafts(buildSlotDrafts(selectedRepair));
    setEditingSlotId("");
    setScheduleForm(buildDefaultScheduleForm(selectedRepair));
    setStatusOverrideValue(selectedRepair.status || "pending");
    setWorkflowStatusValue(
      ["reviewing", "scheduled", "in_progress", "waiting_parts", "ready_for_pickup"].includes(selectedRepair.status)
        ? selectedRepair.status
        : "reviewing"
    );
    setFinalizeForm(buildDefaultFinalizeForm(selectedRepair));
    setStatusNote("");
    setWorkflowStatusNote("");
    setQuoteResponseNote("");
    setSlotBookingNote("");
    setClaimCode("");
    setServicePointSellerId(selectedRepair.seller?._id || (isSellerMode ? user?._id || "" : ""));
    setRatingForm({
      rating: String(selectedRepair.rating?.rating || 5),
      comment: selectedRepair.rating?.comment || ""
    });
    setDisputeForm({
      reason: selectedRepair.dispute?.reason || "Needs admin review",
      message: selectedRepair.dispute?.message || "",
      resolutionNote: selectedRepair.dispute?.resolutionNote || ""
    });
  }, [isSellerMode, selectedRepair, user?._id]);

  useEffect(() => {
    if (!bookingForm.sellerId || bookingForm.branchLabel || !bookingServicePoints.length) return;
    setBookingForm((current) => (
      current.sellerId && !current.branchLabel
        ? { ...current, branchLabel: bookingServicePoints[0] }
        : current
    ));
  }, [bookingForm.branchLabel, bookingForm.sellerId, bookingServicePoints]);

  useEffect(() => {
    if (!assignForm.sellerId || assignForm.branchLabel || !assignServicePoints.length) return;
    setAssignForm((current) => (
      current.sellerId && !current.branchLabel
        ? { ...current, branchLabel: assignServicePoints[0] }
        : current
    ));
  }, [assignForm.branchLabel, assignForm.sellerId, assignServicePoints]);

  useEffect(() => {
    if (!managedServicePointSellerId || !managedServicePointSeller) {
      if (!managedServicePointSellerId) {
        setServicePointDraft("");
      }
      return;
    }

    setServicePointDraft(buildServicePointDraft(managedServicePoints));
  }, [managedServicePointSeller, managedServicePointSellerId, managedServicePoints]);

  function setSelectedRepairId(nextRepairId) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextRepairId) next.set("repair", nextRepairId);
      else next.delete("repair");
      return next;
    });
  }

  function syncUpdatedRepair(nextRepair) {
    if (!nextRepair?._id) return;
    setRepairRequests((current) => upsertRepair(current, nextRepair));
    if (nextRepair?.seller?._id && nextRepair.branchLabel) {
      setOptions((current) => ({
        ...current,
        sellers: (current.sellers || []).map((seller) => (
          String(seller._id) === String(nextRepair.seller._id)
            ? {
                ...seller,
                servicePoints: [...new Set([...(seller.servicePoints || []), nextRepair.branchLabel].filter(Boolean))]
              }
            : seller
        ))
      }));
    }
    setSelectedRepairId(nextRepair._id);
    setSlotDrafts(buildSlotDrafts(nextRepair));
  }

  async function runAction(key, requestFactory, fallbackMessage) {
    setBusyKey(key);
    setError("");
    setMessage("");

    try {
      const result = await requestFactory();
      if (result?.repairRequest) syncUpdatedRepair(result.repairRequest);
      if (result?.message || fallbackMessage) setMessage(result?.message || fallbackMessage);
      return result;
    } catch (requestError) {
      setError(extractErrorMessage(requestError, fallbackMessage || "Unable to complete this repair action."));
      return null;
    } finally {
      setBusyKey("");
    }
  }

  async function handleCreateRepairRequest(event) {
    event.preventDefault();
    const payload = new FormData();
    Object.entries(bookingForm).forEach(([key, value]) => {
      payload.set(key, value);
    });
    bookingFiles.forEach((file) => payload.append("attachments", file));

    const result = await runAction("create-booking", () => createRepairRequest(payload), "Repair booking submitted.");
    if (result?.repairRequest) {
      setBookingForm(initialBookingForm);
      setBookingFiles([]);
      setBookingOpen(false);
    }
  }

  async function handleAttachmentUpload(category, files) {
    if (!selectedRepair?._id || !files.length) return false;
    const payload = new FormData();
    files.forEach((file) => payload.append("attachments", file));
    const result = await runAction(`upload-${category}`, () => uploadRepairAttachments(selectedRepair._id, category, payload), "Repair attachments uploaded.");
    return Boolean(result?.repairRequest);
  }

  const repairListEmptyState = loading
    ? null
    : visibleRepairs.length
      ? null
      : "No repair requests match the current filters yet.";

  if (loading) {
    return <LoadingScreen label="Loading repair workspace..." />;
  }

  const availableSlots = (selectedRepair?.availableSlots || []).filter((slot) => slot.status === "available");
  const canCustomerRespondQuote = Boolean(isCustomerMode && selectedRepair?.permissions?.canApproveQuote);
  const canCustomerRate = Boolean(isCustomerMode && selectedRepair?.permissions?.canRate);

  function appendBookingFiles(incomingFiles = []) {
    if (!incomingFiles.length) return;
    setBookingFiles((current) => [...current, ...incomingFiles].slice(0, 4));
  }

  async function handleCaptureBookingFile() {
    const file = await captureImageFile("repair-booking-camera");
    appendBookingFiles(file ? [file] : []);
  }

  async function handlePickBookingFile() {
    const file = await pickImageFile("repair-booking-gallery");
    appendBookingFiles(file ? [file] : []);
  }
  const canCustomerDispute = Boolean(isCustomerMode && selectedRepair?.permissions?.canSubmitDispute);
  const canSellerDispute = Boolean(isSellerMode && selectedRepair?.permissions?.canSubmitDispute);
  const canOperatorManage = Boolean(isAdminMode || isSellerMode);
  const canManageQuote = Boolean(selectedRepair?.permissions?.canManageQuote);
  const canManageSlots = Boolean(selectedRepair?.permissions?.canManageSlots);
  const canManageCompletion = Boolean(selectedRepair?.permissions?.canManageCompletion);
  const canAssignRepair = Boolean(selectedRepair?.permissions?.canAssign);
  const canOverrideStatus = Boolean(selectedRepair?.permissions?.canOverrideStatus);
  const canManageWorkflowStatus = Boolean(selectedRepair?.permissions?.canManageWorkflowStatus && isSellerMode);
  const canManageServicePoints = Boolean(selectedRepair?.permissions?.canManageServicePoints && (isAdminMode || isSellerMode));
  const selectedRepairSuggestedActions = selectedRepair?.suggestedActions || [];
  const visibleUploadGroups = attachmentGroupsForMode.filter((group) => {
    if (isCustomerMode) {
      return group.uploadCategory === "reported_issue";
    }

    return true;
  });
  const attachmentGalleryGroups = REPAIR_ATTACHMENT_GROUPS
    .map((group) => ({
      ...group,
      attachments: selectedRepair?.attachments?.[group.key] || []
    }))
    .filter((group) => group.attachments.length);
  const draftQuoteTotal = safeNumber(quoteForm.laborFee) + safeNumber(quoteForm.partsFee) + safeNumber(quoteForm.otherFee);
  const slotStatusSummary = buildSlotStatusSummary(selectedRepair?.availableSlots || []);
  const customerLatestUpdate = getCustomerLatestUpdate(selectedRepair);
  const customerPrimaryAction = getCustomerPrimaryAction(selectedRepair);
  const queueSignals = [
    selectedRepair?.queueFlags?.isUnassigned
      ? { label: "Assignment needed", value: "No seller assigned yet", tone: "amber" }
      : { label: "Assigned desk", value: selectedRepair?.seller?.storeName || selectedRepair?.seller?.name || "Assigned", tone: "emerald" },
    selectedRepair?.queueFlags?.isOverdue
      ? { label: "SLA", value: "Overdue, admin attention recommended", tone: "rose" }
      : { label: "SLA", value: selectedRepair?.dueAt ? `Due ${formatRepairDateTime(selectedRepair.dueAt)}` : "No deadline set", tone: "white" },
    selectedRepair?.queueFlags?.isWaitingCustomerApproval
      ? { label: "Approval", value: "Waiting for customer quote approval", tone: "amber" }
      : { label: "Approval", value: selectedRepair?.quote?.status === "approved" ? "Quote approved" : "No pending approval", tone: "white" },
    selectedRepair?.queueFlags?.isWaitingParts
      ? { label: "Parts", value: "Waiting for inventory or replacement parts", tone: "amber" }
      : { label: "Parts", value: "Parts stage clear", tone: "white" },
    selectedRepair?.queueFlags?.isReadyForPickup
      ? { label: "Release", value: "Ready for pickup with claim code", tone: "emerald" }
      : { label: "Release", value: selectedRepair?.claim?.otp ? "Claim code generated" : "Not yet ready for pickup", tone: "white" },
    selectedRepair?.queueFlags?.isDisputed
      ? { label: "Dispute", value: "Open and waiting for admin resolution", tone: "rose" }
      : { label: "Dispute", value: "No active dispute", tone: "white" }
  ];

  function updateSlotDraft(slotId, field, nextValue) {
    setSlotDrafts((current) => ({
      ...current,
      [slotId]: {
        ...(current[slotId] || {}),
        [field]: nextValue
      }
    }));
  }

  function scrollToSection(sectionId) {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applySlotPreset(preset) {
    const nextBaseDate = preset === "preferred"
      ? selectedRepair?.preferredScheduleAt || selectedRepair?.scheduledAt || new Date()
      : new Date();
    const startAt = new Date(nextBaseDate);

    if (Number.isNaN(startAt.getTime())) {
      return;
    }

    if (preset === "block-next-hour") {
      startAt.setMinutes(0, 0, 0);
      startAt.setHours(startAt.getHours() + 1);
    }

    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    setSlotForm({
      label: preset === "preferred" ? "Customer preferred window" : "Seller unavailable",
      startAt: toDateTimeInputValue(startAt),
      endAt: toDateTimeInputValue(endAt),
      note: preset === "preferred"
        ? "Prefilled from the preferred repair date so the desk can confirm or adjust it."
        : "Temporarily blocked for store downtime, off-site work, or a fully booked hour.",
      status: preset === "preferred" ? "available" : "unavailable"
    });
  }

  function handleSuggestedAction(actionKey) {
    if (!selectedRepair) return;

    if (actionKey === "open_chat") {
      openRepairChat(selectedRepair);
      return;
    }

    const sectionMap = {
      approve_quote: "repair-quote",
      book_slot: "repair-schedule",
      upload_proof: "repair-uploads",
      claim_with_otp: "repair-claim",
      rate_service: "repair-rating",
      prepare_quote: "repair-quote",
      manage_slots: "repair-schedule",
      manage_service_points: "repair-service-points",
      update_workflow_stage: "repair-seller-stage",
      update_diagnosis: "repair-uploads",
      assign_repair: "repair-admin-controls",
      override_status: "repair-admin-controls",
      review_audit: "repair-history"
    };

    scrollToSection(sectionMap[actionKey] || "repair-detail");
  }

  return (
    <div className={classNames("space-y-6 pb-10", isNativeApp ? "space-y-4 pb-28" : "")}>
      <section className={classNames("glass-panel rounded-[32px] p-6 shadow-ambient", isNativeApp ? "rounded-[28px] p-4" : "")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{pageCopy.eyebrow}</p>
            <h1 className={classNames("mt-2 font-semibold text-white", isNativeApp ? "text-[1.9rem] leading-tight" : "text-3xl")}>{pageCopy.title}</h1>
            <p className={classNames("mt-3 max-w-4xl text-sm leading-7 text-slate-300", isNativeApp ? "leading-6" : "")}>{pageCopy.description}</p>
          </div>
          <div className={classNames("flex flex-wrap gap-2", isNativeApp ? "w-full" : "")}>
            <button type="button" onClick={() => loadWorkspaceData({ silent: true }).catch(() => {})} className={classNames("inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10", isNativeApp ? "flex-1 justify-center" : "")}>
              {refreshing ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
              Refresh
            </button>
            {isCustomerMode ? (
              <button type="button" onClick={() => setBookingOpen((current) => !current)} className={classNames("inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600", isNativeApp ? "flex-1 justify-center" : "")}>
                <Plus size={15} />
                {bookingOpen ? "Hide booking form" : "New repair booking"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={classNames("grid gap-4 md:grid-cols-2 xl:grid-cols-6", isNativeApp ? "grid-cols-2 gap-3" : "")}>
        {statCards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            value={card.value}
            hint={isCustomerMode ? "Updated from your repair history." : "Updated from the current repair queue."}
            icon={card.icon}
            active={queueView === card.filter}
            onClick={() => setQueueView(card.filter || "all")}
          />
        ))}
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}

      {isCustomerMode && bookingOpen ? (
        <SectionCard
          eyebrow="New booking"
          title="Create a repair request"
          description="Choose the repair desk, describe the issue clearly, and attach photos or videos so the seller or admin can diagnose the problem faster."
          className={isNativeApp ? "rounded-[28px] p-4" : ""}
        >
          <form onSubmit={handleCreateRepairRequest} className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <Field label="Repair seller">
                <select value={bookingForm.sellerId} onChange={(event) => setBookingForm((current) => ({ ...current, sellerId: event.target.value }))} className={inputClassName()}>
                  <option value="">Assign later</option>
                  {(options.sellers || []).map((seller) => <option key={seller._id} value={seller._id}>{seller.label}</option>)}
                </select>
              </Field>
              <Field label="Branch or pickup point">
                <div className="space-y-3">
                  {bookingServicePoints.length ? (
                    <select value={bookingServicePoints.includes(bookingForm.branchLabel) ? bookingForm.branchLabel : ""} onChange={(event) => setBookingForm((current) => ({ ...current, branchLabel: event.target.value }))} className={inputClassName()}>
                      <option value="">Choose a saved service point</option>
                      {bookingServicePoints.map((servicePoint) => <option key={servicePoint} value={servicePoint}>{servicePoint}</option>)}
                    </select>
                  ) : null}
                  <input value={bookingForm.branchLabel} onChange={(event) => setBookingForm((current) => ({ ...current, branchLabel: event.target.value }))} className={inputClassName()} placeholder={selectedBookingSeller ? "Type a custom service point if needed" : "Main branch, service booth, pickup landmark"} />
                </div>
              </Field>
              <Field label="Service method">
                <select value={bookingForm.pickupMethod} onChange={(event) => setBookingForm((current) => ({ ...current, pickupMethod: event.target.value }))} className={inputClassName()}>
                  {pickupMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Device type">
                <input required value={bookingForm.deviceType} onChange={(event) => setBookingForm((current) => ({ ...current, deviceType: event.target.value }))} className={inputClassName()} placeholder="Phone, laptop, earbuds" />
              </Field>
              <Field label="Brand">
                <input value={bookingForm.brand} onChange={(event) => setBookingForm((current) => ({ ...current, brand: event.target.value }))} className={inputClassName()} placeholder="Apple, Samsung, Asus" />
              </Field>
              <Field label="Model">
                <input value={bookingForm.model} onChange={(event) => setBookingForm((current) => ({ ...current, model: event.target.value }))} className={inputClassName()} placeholder="iPhone 13, Zenbook 14" />
              </Field>
              <Field label="Preferred date and time">
                <input type="datetime-local" value={bookingForm.preferredDateTime} onChange={(event) => setBookingForm((current) => ({ ...current, preferredDateTime: event.target.value }))} className={inputClassName()} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Serial number">
                <input value={bookingForm.serialNumber} onChange={(event) => setBookingForm((current) => ({ ...current, serialNumber: event.target.value }))} className={inputClassName()} placeholder="Optional" />
              </Field>
              <Field label="Color">
                <input value={bookingForm.color} onChange={(event) => setBookingForm((current) => ({ ...current, color: event.target.value }))} className={inputClassName()} placeholder="Midnight, silver" />
              </Field>
              <Field label="Accessories">
                <input value={bookingForm.accessories} onChange={(event) => setBookingForm((current) => ({ ...current, accessories: event.target.value }))} className={inputClassName()} placeholder="Charger, case, keyboard" />
              </Field>
            </div>

            <Field label="Issue description" helper="Explain the symptoms, when it started, and any troubleshooting already tried.">
              <textarea required rows={5} value={bookingForm.issueDescription} onChange={(event) => setBookingForm((current) => ({ ...current, issueDescription: event.target.value }))} className={inputClassName("min-h-[150px] resize-y")} placeholder="Screen flickers after charging, back camera not focusing, hinge feels loose, etc." />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Contact number">
                <input required value={bookingForm.contactNumber} onChange={(event) => setBookingForm((current) => ({ ...current, contactNumber: event.target.value }))} className={inputClassName()} placeholder="09xx xxx xxxx" />
              </Field>
              <Field label="Alternate contact">
                <input value={bookingForm.alternateContact} onChange={(event) => setBookingForm((current) => ({ ...current, alternateContact: event.target.value }))} className={inputClassName()} placeholder="Landline, Viber, secondary mobile" />
              </Field>
            </div>

            <Field label="Damage photos or videos" helper="Up to 4 files. Images and short videos help the seller estimate parts and labor faster.">
              <PendingFiles files={bookingFiles} onRemove={(index) => setBookingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} />
              {nativeMediaEnabled ? (
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleCaptureBookingFile().catch(() => {})}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <Camera size={15} />
                    Take photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePickBookingFile().catch(() => {})}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <ImagePlus size={15} />
                    Choose from gallery
                  </button>
                </div>
              ) : null}
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => { const picked = Array.from(event.target.files || []); appendBookingFiles(picked); event.target.value = ""; }} className="block w-full rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
            </Field>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setBookingForm(initialBookingForm); setBookingFiles([]); }} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                Reset form
              </button>
              <button type="submit" disabled={busyKey === "create-booking"} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
                {busyKey === "create-booking" ? <LoaderCircle size={15} className="animate-spin" /> : <Wrench size={15} />}
                Submit repair booking
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <div className={classNames("grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]", isNativeApp ? "gap-4" : "")}>
        <aside className="space-y-4">
          <SectionCard
            eyebrow={isCustomerMode ? "Your repairs" : "Repair queue"}
            title={isCustomerMode ? "Your repair bookings" : "Repair requests"}
            description={isCustomerMode ? "Open a booking to see your next step, latest update, and repair desk details." : "Filter and open the exact job you want to work on."}
          >
            <div className={classNames("space-y-4", isNativeApp ? "space-y-3" : "")}>
              <label className={classNames("flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5", isNativeApp ? "px-3 py-2.5" : "px-4 py-3")}>
                <Search size={15} className="text-slate-400" />
                <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search request number, issue, device, customer" className={classNames("w-full bg-transparent text-white outline-none placeholder:text-slate-500", isNativeApp ? "text-xs" : "text-sm")} />
              </label>
              <div className={classNames("grid gap-3 sm:grid-cols-2 xl:grid-cols-1", isNativeApp ? "gap-2" : "")}>
                <Field label="Status filter">
                  <div className="relative">
                    <Filter size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName("pl-11")}>
                      {statusFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </Field>
                {isAdminMode ? (
                  <Field label="Seller filter">
                    <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className={inputClassName()}>
                      <option value="all">All sellers</option>
                      {(options.sellers || []).map((seller) => <option key={seller._id} value={seller._id}>{seller.label}</option>)}
                    </select>
                  </Field>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Quick queue filters</p>
                <div className={classNames("mt-3 flex flex-wrap gap-2", isNativeApp ? "gap-1.5" : "")}>
                  {queueQuickFilters.map((filterOption) => (
                    <button
                      key={filterOption.key}
                      type="button"
                      onClick={() => setQueueView(filterOption.filter || "all")}
                      className={classNames(
                        "inline-flex items-center gap-2 rounded-full border transition",
                        isNativeApp ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
                        queueView === filterOption.filter
                          ? "border-brand-400/40 bg-brand-500/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <span>{filterOption.label}</span>
                      <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[11px] text-slate-200">{filterOption.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

            <div className="space-y-3">
              {visibleRepairs.map((repairRequest) => (
                <QueueCard
                  key={repairRequest._id}
                  repairRequest={repairRequest}
                  isCustomerMode={isCustomerMode}
                  isActive={String(repairRequest._id) === String(repairParam)}
                  onClick={() => setSelectedRepairId(repairRequest._id)}
                />
              ))}
            {repairListEmptyState ? (
              <div className={classNames("glass-panel border border-dashed border-white/10 text-slate-400 shadow-ambient", isNativeApp ? "rounded-[22px] p-4 text-xs" : "rounded-[28px] p-5 text-sm")}>
                {repairListEmptyState}
              </div>
            ) : null}
          </div>
        </aside>

        <main className={classNames("space-y-6", isNativeApp ? "space-y-4" : "")}>
          {selectedRepair ? (
            <>
              <SectionCard
                sectionId="repair-detail"
                eyebrow={isCustomerMode ? "Your repair at a glance" : "Repair detail"}
                title={getRepairTitle(selectedRepair)}
                description={isCustomerMode ? "See your current status, next action, repair desk, and latest update in one place." : "Everything about this repair booking stays in one place: diagnosis, quote, schedule, uploads, timeline, warranty, and chat."}
                actions={
                  !isCustomerMode ? (
                    <>
                      <button type="button" onClick={() => printRepairReceipt(selectedRepair)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                        <Printer size={15} />
                        Print receipt
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRepair.requestNumber || "");
                          setMessage(`Copied ${selectedRepair.requestNumber}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        <Copy size={15} />
                        Copy request number
                      </button>
                    </>
                  ) : null
                }
              >
                {isCustomerMode ? (
                  <div className={classNames("space-y-5", isNativeApp ? "space-y-4" : "")}>
                    <div className={classNames("grid gap-4 xl:grid-cols-4", isNativeApp ? "grid-cols-2 gap-2" : "")}>
                      <CustomerOverviewCard
                        label="Current status"
                        title={getCustomerFriendlyStatusLabel(selectedRepair.status)}
                        description={getCustomerFriendlyWaitingText(selectedRepair)}
                        tone={selectedRepair.status === "ready_for_pickup" || selectedRepair.status === "completed" ? "emerald" : selectedRepair.status === "quoted" ? "brand" : "default"}
                      />
                      <CustomerOverviewCard
                        label="Next action"
                        title={customerPrimaryAction?.label || "No action needed right now"}
                        description={customerPrimaryAction?.description || "We will let you know here as soon as the next step needs your attention."}
                        tone={customerPrimaryAction ? "brand" : "default"}
                      />
                      <CustomerOverviewCard
                        label="Repair desk"
                        title={selectedRepair.seller?.storeName || selectedRepair.seller?.name || "Waiting for assignment"}
                        description={selectedRepair.branchLabel || humanizePickupMethod(selectedRepair.pickupMethod)}
                      />
                      <CustomerOverviewCard
                        label="Latest update"
                        title={customerLatestUpdate?.label || "No updates yet"}
                        description={customerLatestUpdate?.createdAt ? `${formatRepairDateTime(customerLatestUpdate.createdAt)}${customerLatestUpdate?.message ? ` - ${customerLatestUpdate.message}` : ""}` : "We will show your latest timeline update here."}
                      />
                    </div>

                    <CustomerProgressStepper repairRequest={selectedRepair} />

                    {!isNativeApp ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_200px]">
                      <button
                        type="button"
                        onClick={() => handleSuggestedAction(customerPrimaryAction?.key || "open_chat")}
                        className="inline-flex min-h-[72px] items-center justify-center gap-3 rounded-[24px] bg-brand-500 px-6 py-4 text-base font-semibold text-white transition hover:bg-brand-600"
                      >
                        <ArrowUpRight size={18} />
                        {customerPrimaryAction?.label || "Message your repair desk"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openRepairChat(selectedRepair)}
                        className={classNames(
                          "inline-flex items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-white/5 font-semibold text-white transition hover:bg-white/10",
                          isNativeApp ? "min-h-[54px] px-4 py-3 text-sm" : "min-h-[72px] px-6 py-4 text-base"
                        )}
                      >
                        <MessageSquare size={18} />
                        {isNativeApp ? "Chat" : "Open chat"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(selectedRepair.requestNumber || "");
                          setMessage(`Copied ${selectedRepair.requestNumber}`);
                        }}
                        className={classNames(
                          "inline-flex items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-white/5 font-semibold text-white transition hover:bg-white/10",
                          isNativeApp ? "min-h-[54px] px-4 py-3 text-sm" : "min-h-[72px] px-6 py-4 text-base"
                        )}
                      >
                        <Copy size={18} />
                        Copy ID
                      </button>
                    </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(selectedRepair.requestNumber || "");
                            setMessage(`Copied ${selectedRepair.requestNumber}`);
                          }}
                          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          <Copy size={16} />
                          Copy ID
                        </button>
                        <button
                          type="button"
                          onClick={() => printRepairReceipt(selectedRepair)}
                          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          <Printer size={16} />
                          Receipt
                        </button>
                      </div>
                    )}

                    <CollapsiblePanel
                      title="More about this repair"
                      description="Open this only when you need device details, payment info, warranty, or contacts."
                      defaultOpen={!isNativeApp}
                    >
                      <div className={classNames("grid gap-4 xl:grid-cols-2 2xl:grid-cols-4", isNativeApp ? "gap-2" : "")}>
                        <DetailMeta label="Request number" value={selectedRepair.requestNumber} icon={ClipboardList} />
                        <DetailMeta label="Repair desk" value={selectedRepair.seller?.storeName || selectedRepair.seller?.name || "Waiting for assignment"} icon={UserRound} />
                        <DetailMeta label="Branch / service point" value={selectedRepair.branchLabel || humanizePickupMethod(selectedRepair.pickupMethod)} icon={MapPin} />
                        <DetailMeta label="Schedule" value={getRepairScheduleLabel(selectedRepair)} icon={CalendarRange} />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedRepair.status} label={getCustomerFriendlyStatusLabel(selectedRepair.status)} />
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">{humanizePickupMethod(selectedRepair.pickupMethod)}</span>
                        {selectedRepair.dispute?.status === "open" ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100">Dispute open</span> : null}
                        {selectedRepair.claim?.otp ? <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">Claim code ready</span> : null}
                      </div>
                      <div className={classNames("mt-5 grid gap-4 xl:grid-cols-3", isNativeApp ? "gap-2" : "")}>
                        <div className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4")}>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Device and issue</p>
                          <p className={classNames("mt-3 font-semibold text-white", isNativeApp ? "text-sm" : "text-lg")}>{getRepairTitle(selectedRepair)}</p>
                          <p className={classNames("mt-3 text-slate-300", isNativeApp ? "text-xs leading-5" : "text-sm leading-7")}>{selectedRepair.issueDescription}</p>
                          <div className={classNames("mt-4 space-y-2 text-slate-400", isNativeApp ? "text-xs" : "text-sm")}>
                            <p>Type: {selectedRepair.device?.type || "Not set"}</p>
                            <p>Serial: {selectedRepair.device?.serialNumber || "Not set"}</p>
                            <p>Accessories: {selectedRepair.device?.accessories || "Not listed"}</p>
                          </div>
                        </div>
                        <div className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4")}>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact details</p>
                          <div className={classNames("mt-3 space-y-3 text-slate-300", isNativeApp ? "text-xs" : "text-sm")}>
                            <p>Customer: {selectedRepair.customer?.name || selectedRepair.customer?.email || "Customer"}</p>
                            <p>Primary contact: {selectedRepair.contactNumber || "Not set"}</p>
                            <p>Alternate: {selectedRepair.alternateContact || "Not provided"}</p>
                            <p>Assigned by: {selectedRepair.assignedBy?.name || selectedRepair.assignedBy?.email || "System"}</p>
                          </div>
                        </div>
                        <div className={classNames("border border-white/10 bg-white/5", isNativeApp ? "rounded-[20px] p-3" : "rounded-[24px] p-4")}>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment and warranty</p>
                          <div className={classNames("mt-3 space-y-3 text-slate-300", isNativeApp ? "text-xs" : "text-sm")}>
                            <p>Approved amount: {getRepairPaymentLabel(selectedRepair)}</p>
                            <p>Payment status: {selectedRepair.quote?.paymentStatus || "unpaid"}</p>
                            <p>Due by: {selectedRepair.dueAt ? formatRepairDateTime(selectedRepair.dueAt) : "To be confirmed"}</p>
                            <p>Warranty: {selectedRepair.warranty?.expiresAt ? `Until ${formatRepairDateTime(selectedRepair.warranty.expiresAt, { month: "short", day: "numeric", year: "numeric" })}` : "No warranty expiry yet"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" onClick={() => printRepairReceipt(selectedRepair)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                          <Printer size={15} />
                          Print receipt
                        </button>
                      </div>
                    </CollapsiblePanel>
                  </div>
                ) : (
                  <>
                    <div className={classNames("grid gap-4 xl:grid-cols-2 2xl:grid-cols-4", isNativeApp ? "gap-2" : "")}>
                      <DetailMeta label="Request number" value={selectedRepair.requestNumber} icon={ClipboardList} />
                      <DetailMeta label="Repair desk" value={selectedRepair.seller?.storeName || selectedRepair.seller?.name || "Waiting for assignment"} icon={UserRound} />
                      <DetailMeta label="Branch / service point" value={selectedRepair.branchLabel || humanizePickupMethod(selectedRepair.pickupMethod)} icon={MapPin} />
                      <DetailMeta label="Schedule" value={getRepairScheduleLabel(selectedRepair)} icon={CalendarRange} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedRepair.status} />
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">{humanizePickupMethod(selectedRepair.pickupMethod)}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">{getRepairWaitingBadge(selectedRepair)}</span>
                      {selectedRepair.dispute?.status === "open" ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100">Dispute open</span> : null}
                      {selectedRepair.claim?.otp ? <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">Claim code ready</span> : null}
                    </div>
                    <div className="mt-5 grid gap-4 xl:grid-cols-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Device and issue</p>
                        <p className="mt-3 text-lg font-semibold text-white">{getRepairTitle(selectedRepair)}</p>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{selectedRepair.issueDescription}</p>
                        <div className="mt-4 space-y-2 text-sm text-slate-400">
                          <p>Type: {selectedRepair.device?.type || "Not set"}</p>
                          <p>Serial: {selectedRepair.device?.serialNumber || "Not set"}</p>
                          <p>Accessories: {selectedRepair.device?.accessories || "Not listed"}</p>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact and ownership</p>
                        <div className="mt-3 space-y-3 text-sm text-slate-300">
                          <p>Customer: {selectedRepair.customer?.name || selectedRepair.customer?.email || "Customer"}</p>
                          <p>Primary contact: {selectedRepair.contactNumber || "Not set"}</p>
                          <p>Alternate: {selectedRepair.alternateContact || "Not provided"}</p>
                          <p>Assigned by: {selectedRepair.assignedBy?.name || selectedRepair.assignedBy?.email || "System"}</p>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invoice and warranty</p>
                        <div className="mt-3 space-y-3 text-sm text-slate-300">
                          <p>Approved amount: {getRepairPaymentLabel(selectedRepair)}</p>
                          <p>Payment status: {selectedRepair.quote?.paymentStatus || "unpaid"}</p>
                          <p>SLA window: {selectedRepair.slaHours || 0} hours</p>
                          <p>Due by: {selectedRepair.dueAt ? formatRepairDateTime(selectedRepair.dueAt) : "To be confirmed"}</p>
                          <p>Warranty: {selectedRepair.warranty?.expiresAt ? `Until ${formatRepairDateTime(selectedRepair.warranty.expiresAt, { month: "short", day: "numeric", year: "numeric" })}` : "No warranty expiry yet"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </SectionCard>

              {!isCustomerMode ? (
                <SectionCard
                  sectionId="repair-queue-intelligence"
                  eyebrow="Queue intelligence"
                  title={isAdminMode ? "Oversight signals for this repair" : "Daily desk signals for this repair"}
                  description={isAdminMode
                    ? "Use these status signals to decide whether this booking needs assignment, intervention, or a faster handoff."
                    : "These signals keep your store focused on the next operational step without mixing in admin-only controls."}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {queueSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className={classNames(
                          "rounded-[22px] border p-4",
                          signal.tone === "rose"
                            ? "border-rose-400/20 bg-rose-500/10"
                            : signal.tone === "amber"
                              ? "border-amber-400/20 bg-amber-500/10"
                              : signal.tone === "emerald"
                                ? "border-emerald-400/20 bg-emerald-500/10"
                                : "border-white/10 bg-white/5"
                        )}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{signal.label}</p>
                        <p className="mt-3 text-sm font-semibold text-white">{signal.value}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              <div className="grid gap-6">
                <div className="space-y-6">
                  {isCustomerMode ? (
                    <SectionCard
                      sectionId="repair-customer-actions"
                      eyebrow="What you can do now"
                      title="Follow the next step without guessing"
                      description="Tap the action you need now, from estimate approval to booking your schedule, messaging the repair desk, claiming your device, or rating the service."
                      className={isNativeApp ? "rounded-[28px] p-4" : ""}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedRepairSuggestedActions.length ? selectedRepairSuggestedActions.map((action) => {
                          const customerCopy = getCustomerActionCopy(action);

                          return (
                            <button
                              key={action.key}
                              type="button"
                              onClick={() => handleSuggestedAction(action.key)}
                              className={classNames(
                                "rounded-[24px] border px-5 py-5 text-left transition",
                                action.tone === "brand" ? "border-brand-400/30 bg-brand-500/10 text-white hover:bg-brand-500/20" : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                              )}
                            >
                              <p className="text-base font-semibold">{customerCopy.label}</p>
                              {customerCopy.description ? <p className="mt-3 text-sm leading-7 text-slate-300">{customerCopy.description}</p> : null}
                              <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-400">
                                {action.tone === "brand" ? "Recommended now" : "Open this step"}
                              </p>
                            </button>
                          );
                        }) : (
                          <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-6 text-sm leading-7 text-slate-300">
                            You do not need to do anything right now. If you want an update, you can still message the repair desk anytime.
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  ) : null}

                  {isSellerMode ? (
                    <SectionCard
                      sectionId="repair-seller-workflow"
                      eyebrow="Seller workflow"
                      title="Your store handles the repair job"
                      description="Focus on diagnosis, quote accuracy, slot planning, uploads, and completion. Admin handles assignment, escalation, and final intervention."
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          "Upload diagnosis proof before quoting so the customer sees real findings.",
                          "Keep slots realistic and block unavailable time to avoid overlap.",
                          "Finalize the repair with parts, payment, warranty, and release notes.",
                          "Use repair chat for clarifications instead of sending customers away from the booking."
                        ].map((tip) => (
                          <div key={tip} className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                            {tip}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}

                  {isSellerMode && canManageWorkflowStatus ? (
                    <SectionCard
                      sectionId="repair-seller-stage"
                      eyebrow="Workflow stage"
                      title="Move the repair through seller stages"
                      description="This seller-only control handles operational stages like triage, in-progress work, waiting parts, and pickup readiness. Hard overrides stay with admin."
                    >
                      <form
                        className="space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-4"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          await runAction(
                            "repair-workflow-stage",
                            () => updateRepairStatus(selectedRepair._id, { status: workflowStatusValue, note: workflowStatusNote }),
                            "Repair workflow stage updated."
                          );
                        }}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Seller workflow status">
                            <select value={workflowStatusValue} onChange={(event) => setWorkflowStatusValue(event.target.value)} className={inputClassName()}>
                              <option value="reviewing">Reviewing / triage</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In progress</option>
                              <option value="waiting_parts">Waiting parts</option>
                              <option value="ready_for_pickup">Ready for pickup</option>
                            </select>
                          </Field>
                          <Field label="Desk note">
                            <input value={workflowStatusNote} onChange={(event) => setWorkflowStatusNote(event.target.value)} className={inputClassName()} placeholder="Board opened, waiting LCD stock, testing after repair" />
                          </Field>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={busyKey === "repair-workflow-stage"}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === "repair-workflow-stage" ? <LoaderCircle size={15} className="animate-spin" /> : <Settings2 size={15} />}
                            Update seller stage
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                  ) : null}

                  {isAdminMode ? (
                    <SectionCard
                      sectionId="repair-admin-controls"
                      eyebrow="Admin controls"
                      title="Assign, reassign, override, and intervene"
                      description="This panel is intentionally admin-only so your oversight tools stay separate from the seller’s repair workflow."
                    >
                      <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Current assignment</p>
                          <p className="mt-3 text-sm font-semibold text-white">{selectedRepair.seller?.storeName || selectedRepair.seller?.name || "Unassigned"}</p>
                          <p className="mt-2 text-sm text-slate-400">{selectedRepair.branchLabel || "No branch or service point selected yet."}</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Escalation state</p>
                          <p className="mt-3 text-sm font-semibold text-white">{selectedRepair.dispute?.status === "open" ? "Needs intervention" : "No active escalation"}</p>
                          <p className="mt-2 text-sm text-slate-400">{selectedRepair.dispute?.status === "open" ? "Resolve the dispute or add an admin note before the repair moves on." : "Assignment and status tools are ready if the workflow needs intervention."}</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Override impact</p>
                          <p className="mt-3 text-sm font-semibold text-white">Admin-only</p>
                          <p className="mt-2 text-sm text-slate-400">Use hard override only for disputes, corrections, or recovery after a workflow mistake.</p>
                        </div>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <form
                          className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-assign",
                              () => assignRepairRequest(selectedRepair._id, assignForm),
                              selectedRepair.seller ? "Repair request reassigned." : "Repair request assigned."
                            );
                          }}
                        >
                          <p className="text-sm font-semibold text-white">Seller assignment</p>
                          <div className="mt-4 space-y-4">
                            <Field label="Seller">
                              <select value={assignForm.sellerId} onChange={(event) => setAssignForm((current) => ({ ...current, sellerId: event.target.value }))} className={inputClassName()}>
                                <option value="">Choose seller</option>
                                {(options.sellers || []).map((seller) => <option key={seller._id} value={seller._id}>{seller.label}</option>)}
                              </select>
                            </Field>
                            <Field label="Service point">
                              <div className="space-y-3">
                                {assignServicePoints.length ? (
                                  <select value={assignServicePoints.includes(assignForm.branchLabel) ? assignForm.branchLabel : ""} onChange={(event) => setAssignForm((current) => ({ ...current, branchLabel: event.target.value }))} className={inputClassName()}>
                                    <option value="">Choose a saved service point</option>
                                    {assignServicePoints.map((servicePoint) => <option key={servicePoint} value={servicePoint}>{servicePoint}</option>)}
                                  </select>
                                ) : null}
                                <input value={assignForm.branchLabel} onChange={(event) => setAssignForm((current) => ({ ...current, branchLabel: event.target.value }))} className={inputClassName()} placeholder="Desk A, Main branch, pickup booth" />
                              </div>
                            </Field>
                            <div className="flex justify-end">
                              <button type="submit" disabled={busyKey === "repair-assign" || !assignForm.sellerId || !canAssignRepair} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === "repair-assign" ? <LoaderCircle size={15} className="animate-spin" /> : <UserRound size={15} />}
                                {selectedRepair.seller ? "Reassign repair" : "Assign repair"}
                              </button>
                            </div>
                          </div>
                        </form>

                        <form
                          className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-status-override",
                              () => updateRepairStatus(selectedRepair._id, { status: statusOverrideValue, note: statusNote }),
                              "Repair status overridden."
                            );
                          }}
                        >
                          <p className="text-sm font-semibold text-white">Hard status override</p>
                          <div className="mt-4 space-y-4">
                            <Field label="Next status">
                              <select value={statusOverrideValue} onChange={(event) => setStatusOverrideValue(event.target.value)} className={inputClassName()}>
                                {REPAIR_STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Admin note">
                              <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Explain why the override is needed, especially for disputes or urgent recovery." />
                            </Field>
                            <div className="flex justify-end">
                              <button type="submit" disabled={busyKey === "repair-status-override" || !canOverrideStatus} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                                {busyKey === "repair-status-override" ? <LoaderCircle size={15} className="animate-spin" /> : <Settings2 size={15} />}
                                Apply override
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </SectionCard>
                  ) : null}

                  {(isAdminMode || isSellerMode) && canManageServicePoints ? (
                    <SectionCard
                      sectionId="repair-service-points"
                      eyebrow="Branch management"
                      title={isAdminMode ? "Seller service points" : "Your repair service points"}
                      description={isAdminMode
                        ? "Keep seller branch names, desks, and pickup points standardized so assignment, scheduling, and reporting stay consistent."
                        : "Maintain your visible repair desks and pickup points here so customers stop creating inconsistent branch labels."}
                    >
                      <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                        {isAdminMode ? (
                          <Field label="Seller">
                            <select value={managedServicePointSellerId} onChange={(event) => setServicePointSellerId(event.target.value)} className={inputClassName()}>
                              <option value="">Choose seller</option>
                              {(options.sellers || []).map((seller) => <option key={seller._id} value={seller._id}>{seller.label}</option>)}
                            </select>
                          </Field>
                        ) : null}

                        {managedServicePointSeller ? (
                          <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const payload = { servicePoints: parseServicePoints(servicePointDraft) };
                              const result = await runAction(
                                "repair-service-points",
                                () => updateRepairServicePoints(payload, isAdminMode ? managedServicePointSellerId : ""),
                                "Repair service points updated."
                              );

                              if (result?.servicePoints) {
                                setOptions((current) => ({
                                  ...current,
                                  sellers: (current.sellers || []).map((seller) => (
                                    String(seller._id) === String(managedServicePointSellerId)
                                      ? { ...seller, servicePoints: result.servicePoints }
                                      : seller
                                  ))
                                }));
                                setServicePointDraft(buildServicePointDraft(result.servicePoints));
                              }
                            }}
                          >
                            <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4">
                              <p className="text-sm font-semibold text-white">{managedServicePointSeller.storeName || managedServicePointSeller.displayName || managedServicePointSeller.label}</p>
                              <p className="mt-2 text-sm text-slate-400">Add one service point per line. These values appear in repair booking, assignment, and schedule flows.</p>
                              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{servicePointDraftEntries.length} saved point{servicePointDraftEntries.length === 1 ? "" : "s"} in this list</p>
                            </div>
                            <Field label="Service point list" helper="Examples: Main branch, Repair Desk A, Pickup counter, Home service staging area">
                              <textarea
                                value={servicePointDraft}
                                onChange={(event) => setServicePointDraft(event.target.value)}
                                rows={6}
                                className={inputClassName("min-h-[180px]")}
                                placeholder={"Main branch\nRepair Desk A\nPickup counter"}
                              />
                            </Field>
                            {selectedRepair?.branchLabel && !servicePointDraftEntries.includes(selectedRepair.branchLabel) ? (
                              <div className="rounded-[20px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                                The current repair is using <span className="font-semibold text-white">{selectedRepair.branchLabel}</span>, but it is not yet part of this seller&apos;s saved service points.
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => setServicePointDraft((current) => buildServicePointDraft([...parseServicePoints(current), selectedRepair.branchLabel]))}
                                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                                  >
                                    Add current repair branch
                                  </button>
                                </div>
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              {servicePointDraftEntries.length ? servicePointDraftEntries.map((servicePoint) => (
                                <span key={servicePoint} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                                  {servicePoint}
                                </span>
                              )) : (
                                <span className="text-sm text-slate-400">No saved service points yet.</span>
                              )}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setServicePointDraft(buildServicePointDraft(managedServicePoints))}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                Reset list
                              </button>
                              <button
                                type="submit"
                                disabled={busyKey === "repair-service-points"}
                                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyKey === "repair-service-points" ? <LoaderCircle size={15} className="animate-spin" /> : <MapPin size={15} />}
                                Save service points
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                            Choose a seller first to manage service points.
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  ) : null}

                  <SectionCard
                    sectionId="repair-quote"
                    eyebrow="Quotation"
                    title={isCustomerMode ? "Estimate and your approval" : "Repair estimate and customer approval"}
                    description={canManageQuote ? "Sellers or admin can prepare the estimate here. Customers approve or reject it from the same booking." : isCustomerMode ? "Check the latest estimate, see the total amount, and approve or reject it here when your decision is needed." : "Review the latest repair estimate and respond if approval is waiting."}
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <DetailMeta label="Quote status" value={selectedRepair.quote?.status || "none"} icon={CreditCard} />
                      <DetailMeta label="Approved amount" value={peso(selectedRepair.quote?.approvedAmount || selectedRepair.quote?.total || 0)} icon={FileText} />
                      <DetailMeta label="Estimated completion" value={selectedRepair.quote?.estimatedCompletionAt ? formatRepairDateTime(selectedRepair.quote.estimatedCompletionAt) : "Not set"} icon={CalendarRange} />
                      <DetailMeta label="Prepared by" value={selectedRepair.quote?.preparedBy?.name || selectedRepair.quote?.preparedBy?.email || "No quote yet"} icon={UserRound} />
                    </div>

                    {selectedRepair.quote?.notes ? (
                      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                        {selectedRepair.quote.notes}
                      </div>
                    ) : null}

                    {canManageQuote ? (
                      <form
                        className="mt-5 space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-4"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          await runAction(
                            "repair-quote-save",
                            () => submitRepairQuote(selectedRepair._id, quoteForm),
                            "Repair quote saved."
                          );
                        }}
                      >
                        <p className="text-sm font-semibold text-white">Prepare or update quote</p>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <Field label="Labor fee">
                            <input type="number" min="0" step="0.01" value={quoteForm.laborFee} onChange={(event) => setQuoteForm((current) => ({ ...current, laborFee: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Parts fee">
                            <input type="number" min="0" step="0.01" value={quoteForm.partsFee} onChange={(event) => setQuoteForm((current) => ({ ...current, partsFee: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Other fee">
                            <input type="number" min="0" step="0.01" value={quoteForm.otherFee} onChange={(event) => setQuoteForm((current) => ({ ...current, otherFee: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Draft total">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm font-semibold text-white">
                              {peso(draftQuoteTotal)}
                            </div>
                          </Field>
                          <Field label="Estimated completion">
                            <input type="datetime-local" value={quoteForm.estimatedCompletionAt} onChange={(event) => setQuoteForm((current) => ({ ...current, estimatedCompletionAt: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Payment status">
                            <select value={quoteForm.paymentStatus} onChange={(event) => setQuoteForm((current) => ({ ...current, paymentStatus: event.target.value }))} className={inputClassName()}>
                              {paymentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </Field>
                          <Field label="Payment method">
                            <select value={quoteForm.paymentMethod} onChange={(event) => setQuoteForm((current) => ({ ...current, paymentMethod: event.target.value }))} className={inputClassName()}>
                              {paymentMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </Field>
                          <Field label="Payment reference">
                            <input value={quoteForm.paymentReference} onChange={(event) => setQuoteForm((current) => ({ ...current, paymentReference: event.target.value }))} className={inputClassName()} placeholder="Receipt, transfer, memo" />
                          </Field>
                        </div>
                        <Field label="Quote note">
                          <textarea value={quoteForm.notes} onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Explain labor scope, expected replacement parts, and what the customer should approve." />
                        </Field>
                        <Field label="Technician note">
                          <textarea value={quoteForm.technicianNotes} onChange={(event) => setQuoteForm((current) => ({ ...current, technicianNotes: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Internal note or diagnosis summary before quote approval." />
                        </Field>
                        <div className="flex justify-end">
                          <button type="submit" disabled={busyKey === "repair-quote-save"} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
                            {busyKey === "repair-quote-save" ? <LoaderCircle size={15} className="animate-spin" /> : <CreditCard size={15} />}
                            Save quote
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {canCustomerRespondQuote ? (
                      <div className="mt-5 rounded-[26px] border border-brand-400/20 bg-brand-500/10 p-5">
                        <p className="text-base font-semibold text-white">Your approval is needed</p>
                        <p className="mt-2 text-sm leading-7 text-slate-200">Review the estimate below, then approve it so the repair can continue or reject it if you want the repair desk to revise the quote.</p>
                        <Field label="Optional note" helper="Use this if you want to explain why you approved or rejected the estimate.">
                          <textarea value={quoteResponseNote} onChange={(event) => setQuoteResponseNote(event.target.value)} rows={4} className={inputClassName("min-h-[120px] mt-3")} placeholder="Approved, please continue with the repair. / Please revise the quote first." />
                        </Field>
                        <div className="mt-4 flex flex-wrap justify-end gap-3">
                          <button
                            type="button"
                            disabled={busyKey === "repair-quote-approve"}
                            onClick={() => runAction("repair-quote-approve", () => respondRepairQuote(selectedRepair._id, { decision: "approve", note: quoteResponseNote }), "Repair quote approved.")}
                            className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === "repair-quote-approve" ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            Approve quote
                          </button>
                          <button
                            type="button"
                            disabled={busyKey === "repair-quote-reject"}
                            onClick={() => runAction("repair-quote-reject", () => respondRepairQuote(selectedRepair._id, { decision: "reject", note: quoteResponseNote }), "Repair quote rejected.")}
                            className="inline-flex min-h-[56px] items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-6 py-3 text-base font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === "repair-quote-reject" ? <LoaderCircle size={15} className="animate-spin" /> : <X size={15} />}
                            Reject quote
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </SectionCard>

                  {(canManageSlots || (isCustomerMode && availableSlots.length)) ? (
                    <SectionCard
                      sectionId="repair-schedule"
                      eyebrow="Schedule"
                      title={isCustomerMode ? "Choose your repair time" : "Scheduling and booking slots"}
                      description={isCustomerMode ? "Once the estimate is approved, choose the available repair time that works best for you." : "Sellers or admin can offer, block, edit, or cancel time slots. Overlap protection is enforced on the server, and customers can book the exact slot that matches the approved repair flow."}
                    >
                      {canManageSlots ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                            <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/80">Available</p>
                            <p className="mt-3 text-2xl font-semibold text-white">{slotStatusSummary.available}</p>
                            <p className="mt-2 text-sm text-emerald-50/90">Open slots customers can still book.</p>
                          </div>
                          <div className="rounded-[22px] border border-brand-400/20 bg-brand-500/10 p-4">
                            <p className="text-xs uppercase tracking-[0.28em] text-brand-100/80">Booked</p>
                            <p className="mt-3 text-2xl font-semibold text-white">{slotStatusSummary.booked}</p>
                            <p className="mt-2 text-sm text-brand-50/90">Customer-selected slots already tied to this repair.</p>
                          </div>
                          <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/10 p-4">
                            <p className="text-xs uppercase tracking-[0.28em] text-amber-100/80">Blocked</p>
                            <p className="mt-3 text-2xl font-semibold text-white">{slotStatusSummary.unavailable}</p>
                            <p className="mt-2 text-sm text-amber-50/90">Seller or admin unavailable windows.</p>
                          </div>
                          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Cancelled</p>
                            <p className="mt-3 text-2xl font-semibold text-white">{slotStatusSummary.cancelled}</p>
                            <p className="mt-2 text-sm text-slate-400">Inactive slots kept only for audit history.</p>
                          </div>
                        </div>
                      ) : null}

                      {canManageSlots ? (
                        <div className="mt-4 rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-7 text-cyan-100">
                          Overlap protection is active. Conflicting seller slots and duplicate scheduled times are blocked automatically, so use unavailable slots when the desk is off-site, closed, or fully booked.
                        </div>
                      ) : null}

                      {canManageSlots ? (
                        <form
                          className="mt-5 space-y-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-schedule",
                              () => updateRepairSchedule(selectedRepair._id, scheduleForm),
                              "Repair schedule updated."
                            );
                          }}
                        >
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Confirmed schedule">
                              <input type="datetime-local" value={scheduleForm.scheduledAt} onChange={(event) => setScheduleForm((current) => ({ ...current, scheduledAt: event.target.value }))} className={inputClassName()} />
                            </Field>
                            <Field label="Schedule note">
                              <input value={scheduleForm.scheduleNotes} onChange={(event) => setScheduleForm((current) => ({ ...current, scheduleNotes: event.target.value }))} className={inputClassName()} placeholder="Arrival window, branch desk note, pickup reminder" />
                            </Field>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={busyKey === "repair-schedule"}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-schedule" ? <LoaderCircle size={15} className="animate-spin" /> : <CalendarRange size={15} />}
                              Save schedule
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {canManageSlots ? (
                        <form
                          className="mt-5 space-y-4 rounded-[24px] border border-white/10 bg-white/5 p-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            const result = await runAction(
                              "repair-slot-add",
                              () => addRepairSlot(selectedRepair._id, slotForm),
                              slotForm.status === "unavailable" ? "Unavailable time saved." : "Repair slot added."
                            );
                            if (result?.repairRequest) {
                              setSlotForm(initialSlotForm);
                            }
                          }}
                        >
                          <p className="text-sm font-semibold text-white">Offer a slot or block seller availability</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedRepair?.preferredScheduleAt ? (
                              <button
                                type="button"
                                onClick={() => applySlotPreset("preferred")}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                              >
                                Use customer preferred time
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => applySlotPreset("block-next-hour")}
                              className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                            >
                              Block next hour
                            </button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <Field label="Slot label">
                              <input value={slotForm.label} onChange={(event) => setSlotForm((current) => ({ ...current, label: event.target.value }))} className={inputClassName()} placeholder="Morning slot, Desk A, Home pickup" />
                            </Field>
                            <Field label="Start">
                              <input type="datetime-local" value={slotForm.startAt} onChange={(event) => setSlotForm((current) => ({ ...current, startAt: event.target.value }))} className={inputClassName()} />
                            </Field>
                            <Field label="End">
                              <input type="datetime-local" value={slotForm.endAt} onChange={(event) => setSlotForm((current) => ({ ...current, endAt: event.target.value }))} className={inputClassName()} />
                            </Field>
                            <Field label="Slot type">
                              <select value={slotForm.status} onChange={(event) => setSlotForm((current) => ({ ...current, status: event.target.value }))} className={inputClassName()}>
                                <option value="available">Available</option>
                                <option value="unavailable">Unavailable / blocked</option>
                              </select>
                            </Field>
                            <Field label="Note">
                              <input value={slotForm.note} onChange={(event) => setSlotForm((current) => ({ ...current, note: event.target.value }))} className={inputClassName()} placeholder="Lunch break, off-site visit, priority window" />
                            </Field>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={busyKey === "repair-slot-add"}
                              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-slot-add" ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
                              Add slot
                            </button>
                          </div>
                        </form>
                      ) : null}

                      <div className="mt-5 space-y-3">
                        {(selectedRepair.availableSlots || []).length ? (
                          selectedRepair.availableSlots.map((slot) => {
                            const isAvailable = slot.status === "available";
                            const isSelected = selectedSlotId === slot._id;
                            const isEditing = editingSlotId === slot._id;
                            const slotDraft = slotDrafts[slot._id] || {
                              label: slot.label || "",
                              startAt: toDateTimeInputValue(slot.startAt),
                              endAt: toDateTimeInputValue(slot.endAt),
                              note: slot.note || ""
                            };

                            return (
                              <div
                                key={slot._id}
                                className={classNames(
                                  "rounded-[22px] border p-4 transition",
                                  isSelected ? "border-brand-400/40 bg-brand-500/10" : "border-white/10 bg-white/5"
                                )}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-white">{slot.label || "Repair slot"}</p>
                                      <span className={classNames(
                                        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
                                        slot.status === "available"
                                          ? "bg-emerald-500/10 text-emerald-100"
                                          : slot.status === "unavailable"
                                            ? "bg-amber-500/10 text-amber-100"
                                            : slot.status === "booked"
                                              ? "bg-brand-500/10 text-brand-100"
                                              : "bg-white/10 text-slate-300"
                                      )}>
                                        {slot.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-300">{formatRepairDateTime(slot.startAt)}{slot.endAt ? ` - ${formatRepairDateTime(slot.endAt)}` : ""}</p>
                                    <p className="text-xs text-slate-500">Created by {slot.createdBy?.name || slot.createdBy?.email || "System"}</p>
                                    {slot.bookedBy ? <p className="text-xs text-slate-500">Booked by {slot.bookedBy?.name || slot.bookedBy?.email || "Customer"}</p> : null}
                                    {slot.note ? <p className="text-xs leading-6 text-slate-400">{slot.note}</p> : null}
                                  </div>
                                  {isCustomerMode && isAvailable ? (
                                    <input type="radio" name="repair-slot" checked={isSelected} onChange={() => setSelectedSlotId(slot._id)} className="mt-1 h-4 w-4 accent-brand-500" />
                                  ) : null}
                                </div>

                                {canManageSlots ? (
                                  <div className="mt-4 space-y-4">
                                    {isEditing ? (
                                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <Field label="Label">
                                          <input value={slotDraft.label} onChange={(event) => updateSlotDraft(slot._id, "label", event.target.value)} className={inputClassName()} />
                                        </Field>
                                        <Field label="Start">
                                          <input type="datetime-local" value={slotDraft.startAt} onChange={(event) => updateSlotDraft(slot._id, "startAt", event.target.value)} className={inputClassName()} />
                                        </Field>
                                        <Field label="End">
                                          <input type="datetime-local" value={slotDraft.endAt} onChange={(event) => updateSlotDraft(slot._id, "endAt", event.target.value)} className={inputClassName()} />
                                        </Field>
                                        <Field label="Note">
                                          <input value={slotDraft.note} onChange={(event) => updateSlotDraft(slot._id, "note", event.target.value)} className={inputClassName()} />
                                        </Field>
                                      </div>
                                    ) : null}
                                    <div className="flex flex-wrap justify-end gap-2">
                                      {isEditing ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={busyKey === `repair-slot-save-${slot._id}`}
                                            onClick={() => runAction(`repair-slot-save-${slot._id}`, () => updateRepairSlot(selectedRepair._id, slot._id, { action: "update", ...slotDraft }), "Repair slot updated.").then((result) => { if (result?.repairRequest) setEditingSlotId(""); })}
                                            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            {busyKey === `repair-slot-save-${slot._id}` ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                            Save slot
                                          </button>
                                          <button type="button" onClick={() => setEditingSlotId("")} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                                            Cancel edit
                                          </button>
                                        </>
                                      ) : (
                                        <button type="button" onClick={() => setEditingSlotId(slot._id)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                                          {slot.status === "booked" ? "Reschedule slot" : "Edit slot"}
                                        </button>
                                      )}
                                      {slot.status === "available" || slot.status === "unavailable" ? (
                                        <button
                                          type="button"
                                          disabled={busyKey === `repair-slot-toggle-${slot._id}`}
                                          onClick={() => runAction(`repair-slot-toggle-${slot._id}`, () => updateRepairSlot(selectedRepair._id, slot._id, { action: slot.status === "available" ? "mark_unavailable" : "mark_available", note: slot.note }), slot.status === "available" ? "Slot marked unavailable." : "Slot reopened.")}
                                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {slot.status === "available" ? "Mark unavailable" : "Reopen slot"}
                                        </button>
                                      ) : slot.status === "booked" ? (
                                        <span className="rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-100">
                                          Booked by customer
                                        </span>
                                      ) : (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                                          Cancelled slot
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        disabled={busyKey === `repair-slot-cancel-${slot._id}`}
                                        onClick={() => runAction(`repair-slot-cancel-${slot._id}`, () => updateRepairSlot(selectedRepair._id, slot._id, { action: "cancel", note: slot.note }), "Repair slot cancelled.").then((result) => { if (result?.repairRequest) setEditingSlotId(""); })}
                                        className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancel slot
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                            No repair slots have been offered yet.
                          </div>
                        )}
                      </div>

                      {isCustomerMode && availableSlots.length ? (
                        <div className="mt-5 rounded-[26px] border border-brand-400/20 bg-brand-500/10 p-5">
                          <p className="text-base font-semibold text-white">Book your repair schedule</p>
                          <p className="mt-2 text-sm leading-7 text-slate-200">Pick one of the available time slots above, then confirm it here so the repair desk can reserve your visit.</p>
                          <Field label="Optional booking note" helper="Use this for arrival reminders or a contact preference before your appointment.">
                            <textarea value={slotBookingNote} onChange={(event) => setSlotBookingNote(event.target.value)} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Please text me 30 minutes before pickup." />
                          </Field>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              disabled={busyKey === "repair-slot-book" || !selectedSlotId}
                              onClick={() => runAction("repair-slot-book", () => bookRepairSlot(selectedRepair._id, selectedSlotId, { note: slotBookingNote }), "Repair slot booked.")}
                              className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-slot-book" ? <LoaderCircle size={15} className="animate-spin" /> : <CalendarRange size={15} />}
                              Book this time
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </SectionCard>
                  ) : null}

                  {visibleUploadGroups.length ? (
                    <SectionCard
                      sectionId="repair-uploads"
                      eyebrow="Uploads"
                      title={isCustomerMode ? "Add more photos or videos" : "Repair proof uploads"}
                      description={isCustomerMode ? "Use this only when you want to send extra issue photos or videos to help the repair desk." : "Add fresh media during diagnosis, before or after work, or completion so the repair record stays easy to verify."}
                    >
                      {isCustomerMode ? (
                        <CollapsiblePanel title="Extra uploads" description="Open this only when you want to add more damage photos, issue videos, or follow-up proof.">
                          <div className="space-y-4">
                            {visibleUploadGroups.map((group) => (
                              <AttachmentUploadCard
                                key={group.key}
                                title={group.label}
                                category={group.uploadCategory}
                                disabled={!selectedRepair?._id}
                                busy={busyKey === `upload-${group.uploadCategory}`}
                                helper={
                                  group.uploadCategory === "reported_issue"
                                    ? "Use this for additional damage photos, issue videos, or customer follow-up proof."
                                    : group.uploadCategory === "before_repair"
                                      ? "Capture the device state before work begins."
                                      : group.uploadCategory === "diagnosis"
                                        ? "Upload technician findings, board photos, or test evidence."
                                        : group.uploadCategory === "after_repair"
                                          ? "Show the repaired device after the fix is finished."
                                          : "Use this for final receipts, release photos, or pickup proof."
                                }
                                onUpload={(files) => handleAttachmentUpload(group.uploadCategory, files)}
                              />
                            ))}
                          </div>
                        </CollapsiblePanel>
                      ) : (
                        <div className="space-y-4">
                          {visibleUploadGroups.map((group) => (
                            <AttachmentUploadCard
                              key={group.key}
                              title={group.label}
                              category={group.uploadCategory}
                              disabled={!selectedRepair?._id}
                              busy={busyKey === `upload-${group.uploadCategory}`}
                              helper={
                                group.uploadCategory === "reported_issue"
                                  ? "Use this for additional damage photos, issue videos, or customer follow-up proof."
                                  : group.uploadCategory === "before_repair"
                                    ? "Capture the device state before work begins."
                                    : group.uploadCategory === "diagnosis"
                                      ? "Upload technician findings, board photos, or test evidence."
                                      : group.uploadCategory === "after_repair"
                                        ? "Show the repaired device after the fix is finished."
                                        : "Use this for final receipts, release photos, or pickup proof."
                              }
                              onUpload={(files) => handleAttachmentUpload(group.uploadCategory, files)}
                            />
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  ) : null}

                  {canManageCompletion ? (
                    <SectionCard sectionId="repair-completion" eyebrow="Completion" title="Finalize repair, warranty, and release details" description="Complete the repair summary, log parts used, define the warranty, and generate the pickup-ready state or mark the job completed.">
                      <form
                        className="space-y-4"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          await runAction(
                            "repair-finalize",
                            () => finalizeRepairRequest(selectedRepair._id, finalizeForm),
                            "Repair work updated."
                          );
                        }}
                      >
                        <Field label="Technician notes">
                          <textarea value={finalizeForm.technicianNotes} onChange={(event) => setFinalizeForm((current) => ({ ...current, technicianNotes: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Board issue isolated, battery replaced, hinge alignment checked." />
                        </Field>
                        <Field label="Final repair summary">
                          <textarea value={finalizeForm.finalSummary} onChange={(event) => setFinalizeForm((current) => ({ ...current, finalSummary: event.target.value }))} rows={5} className={inputClassName("min-h-[150px]")} placeholder="Summarize the diagnosis, parts replaced, tests performed, and customer-facing outcome." />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Payment status">
                            <select value={finalizeForm.paymentStatus} onChange={(event) => setFinalizeForm((current) => ({ ...current, paymentStatus: event.target.value }))} className={inputClassName()}>
                              {paymentStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Payment method">
                            <select value={finalizeForm.paymentMethod} onChange={(event) => setFinalizeForm((current) => ({ ...current, paymentMethod: event.target.value }))} className={inputClassName()}>
                              {paymentMethodOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Payment reference">
                            <input value={finalizeForm.paymentReference} onChange={(event) => setFinalizeForm((current) => ({ ...current, paymentReference: event.target.value }))} className={inputClassName()} placeholder="Receipt number, cash memo, transfer ref" />
                          </Field>
                          <Field label="Due at / SLA deadline">
                            <input type="datetime-local" value={finalizeForm.dueAt} onChange={(event) => setFinalizeForm((current) => ({ ...current, dueAt: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Warranty duration (days)">
                            <input type="number" min="0" value={finalizeForm.warrantyDurationDays} onChange={(event) => setFinalizeForm((current) => ({ ...current, warrantyDurationDays: event.target.value }))} className={inputClassName()} />
                          </Field>
                          <Field label="Next state after save">
                            <select value={finalizeForm.status} onChange={(event) => setFinalizeForm((current) => ({ ...current, status: event.target.value }))} className={inputClassName()}>
                              <option value="ready_for_pickup">Ready for pickup</option>
                              <option value="completed">Completed</option>
                            </select>
                          </Field>
                        </div>
                        <Field label="Warranty note">
                          <textarea value={finalizeForm.warrantyNote} onChange={(event) => setFinalizeForm((current) => ({ ...current, warrantyNote: event.target.value }))} rows={3} className={inputClassName("min-h-[110px]")} placeholder="30-day service warranty. Excludes accidental drops and liquid damage." />
                        </Field>
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Parts and inventory links</p>
                          <div className="mt-3">
                            <PartEditor value={finalizeForm.partsUsed} onChange={(nextParts) => setFinalizeForm((current) => ({ ...current, partsUsed: nextParts }))} productOptions={catalogProducts} />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={busyKey === "repair-finalize"}
                            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === "repair-finalize" ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            Save repair summary
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                  ) : null}

                  {selectedRepair.claim?.otp ? (
                    <SectionCard sectionId="repair-claim" eyebrow="Pickup" title={isCustomerMode ? "Claim your repaired device" : "Claim code and release verification"} description={isCustomerMode ? "When your device is ready, use this code to verify pickup quickly and securely." : "Use the claim code for secure pickup. Both the customer and the release desk can verify the code from this booking."}>
                      <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/80">Claim code</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[0.18em] text-white">{selectedRepair.claim.otp}</p>
                        <p className="mt-3 text-sm leading-6 text-cyan-100/90">
                          Expires {selectedRepair.claim?.expiresAt ? formatRepairDateTime(selectedRepair.claim.expiresAt) : "when picked up"}.
                        </p>
                      </div>
                      {(isCustomerMode || canOperatorManage) && selectedRepair.status !== "completed" ? (
                        <div className="mt-4 space-y-4">
                          <Field label={isCustomerMode ? "Enter claim code" : "Verify customer claim code"}>
                            <input value={claimCode} onChange={(event) => setClaimCode(event.target.value)} className={inputClassName()} placeholder="Enter the 6-digit pickup code" />
                          </Field>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={busyKey === "repair-claim" || !claimCode.trim()}
                              onClick={() => runAction("repair-claim", () => claimRepairRequest(selectedRepair._id, { otp: claimCode }), "Repair item claimed successfully.")}
                              className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-claim" ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                              {isCustomerMode ? "Verify and claim my device" : "Verify release"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </SectionCard>
                  ) : null}

                  {(canCustomerRate || selectedRepair.rating?.createdAt) ? (
                    <SectionCard sectionId="repair-rating" eyebrow="Feedback" title={isCustomerMode ? "Rate your repair experience" : "Customer repair rating"} description={isCustomerMode ? "Once the repair is complete, leave a quick rating and review here." : "Capture the service score and written feedback after the repair is completed."}>
                      {selectedRepair.rating?.createdAt ? (
                        <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                          <p className="text-sm font-semibold text-white">Already rated {selectedRepair.rating.rating}/5</p>
                          <p className="mt-2 text-sm leading-6 text-amber-50/90">{selectedRepair.rating.comment || "No written review."}</p>
                        </div>
                      ) : null}
                      {canCustomerRate ? (
                        <form
                          className="mt-4 space-y-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-rating",
                              () => submitRepairRating(selectedRepair._id, { rating: Number(ratingForm.rating), comment: ratingForm.comment }),
                              "Repair rating submitted."
                            );
                          }}
                        >
                          <Field label="Star rating">
                            <select value={ratingForm.rating} onChange={(event) => setRatingForm((current) => ({ ...current, rating: event.target.value }))} className={inputClassName()}>
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={String(value)}>
                                  {value} / 5
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Review">
                            <textarea value={ratingForm.comment} onChange={(event) => setRatingForm((current) => ({ ...current, comment: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Tell us about turnaround time, quality of the repair, and communication." />
                          </Field>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={busyKey === "repair-rating"}
                              className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-rating" ? <LoaderCircle size={15} className="animate-spin" /> : <Star size={15} />}
                              Submit rating
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </SectionCard>
                  ) : null}

                  {(canCustomerDispute || canSellerDispute || isAdminMode || selectedRepair.dispute?.status === "open" || selectedRepair.dispute?.status === "resolved") ? (
                    <SectionCard sectionId="repair-dispute" eyebrow="Dispute desk" title="Repair dispute and admin intervention" description="Use this section when a quote, schedule, seller handling, or final outcome needs a formal review. Admin can close the dispute and leave a resolution note.">
                      {selectedRepair.dispute?.status === "resolved" ? (
                        <div className="mb-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                          <p className="font-semibold text-white">Dispute resolved</p>
                          <p className="mt-2 leading-6">{selectedRepair.dispute.resolutionNote || "Admin resolved this dispute."}</p>
                        </div>
                      ) : null}

                      {selectedRepair.dispute?.status === "open" ? (
                        <div className="mb-4 rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                          <p className="font-semibold text-white">Open dispute</p>
                          <p className="mt-2">{selectedRepair.dispute.reason || "Needs admin review"}</p>
                          {selectedRepair.dispute.message ? <p className="mt-2 leading-6">{selectedRepair.dispute.message}</p> : null}
                        </div>
                      ) : null}

                      {(canCustomerDispute || canSellerDispute) && selectedRepair.dispute?.status !== "open" ? (
                        <form
                          className="space-y-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-dispute-open",
                              () => updateRepairDispute(selectedRepair._id, { action: "open", reason: disputeForm.reason, message: disputeForm.message }),
                              "Repair dispute opened."
                            );
                          }}
                        >
                          <Field label="Reason">
                            <input value={disputeForm.reason} onChange={(event) => setDisputeForm((current) => ({ ...current, reason: event.target.value }))} className={inputClassName()} placeholder="Needs admin review, pricing issue, quality concern" />
                          </Field>
                          <Field label="Details">
                            <textarea value={disputeForm.message} onChange={(event) => setDisputeForm((current) => ({ ...current, message: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Explain what happened and why you need admin intervention." />
                          </Field>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={busyKey === "repair-dispute-open"}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-dispute-open" ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                              Open dispute
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {isAdminMode && selectedRepair.dispute?.status === "open" ? (
                        <form
                          className="space-y-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await runAction(
                              "repair-dispute-resolve",
                              () => updateRepairDispute(selectedRepair._id, { action: "resolve", resolutionNote: disputeForm.resolutionNote }),
                              "Repair dispute resolved."
                            );
                          }}
                        >
                          <Field label="Admin resolution note">
                            <textarea value={disputeForm.resolutionNote} onChange={(event) => setDisputeForm((current) => ({ ...current, resolutionNote: event.target.value }))} rows={4} className={inputClassName("min-h-[120px]")} placeholder="Summarize the decision, what was approved, and any follow-up needed." />
                          </Field>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={busyKey === "repair-dispute-resolve"}
                              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyKey === "repair-dispute-resolve" ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                              Resolve dispute
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </SectionCard>
                  ) : null}

                  <SectionCard
                    sectionId="repair-chat"
                    eyebrow="Repair chat"
                    title={isCustomerMode ? "Message your repair desk" : "Chat without losing the repair context"}
                    description={isCustomerMode ? "Send a message here without leaving this repair booking." : "Open the repair chat with the device and request details already attached."}
                    className={isNativeApp ? "rounded-[28px] p-4" : ""}
                    actions={
                      <>
                        <button type="button" onClick={() => openRepairChat(selectedRepair)} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                          <MessageSquare size={15} />
                          {isCustomerMode ? "Open chat" : "Repair chat"}
                        </button>
                        <Link to={selectedRepair.links?.chat || "/messages"} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                          <ArrowUpRight size={15} />
                          {isNativeApp ? "Inbox" : isCustomerMode ? "Open full messages page" : "Full inbox page"}
                        </Link>
                      </>
                    }
                  >
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">{getRepairTitle(selectedRepair)}</p>
                      <p className="mt-2 text-sm text-slate-300">{selectedRepair.requestNumber} • {selectedRepair.branchLabel || humanizePickupMethod(selectedRepair.pickupMethod)}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        Use chat for clarifications about symptoms, parts approval, schedule changes, release status, and dispute follow-ups.
                      </p>
                    </div>
                  </SectionCard>

                  {attachmentGalleryGroups.length ? (
                    <SectionCard sectionId="repair-media" eyebrow="Media record" title={isCustomerMode ? "Photos, videos, and repair proof" : "Repair attachments and visual proof"} description={isCustomerMode ? "Open this only when you want to review the images and videos attached to your repair booking." : "All uploads remain grouped by purpose so the repair stays easy to audit and verify later."} className={isNativeApp ? "rounded-[28px] p-4" : ""}>
                      {isCustomerMode ? (
                        <CollapsiblePanel title="View photos and videos" description="See the media uploaded for your repair only when you need to review it." defaultOpen={!isNativeApp}>
                          <div className="space-y-4">
                            {attachmentGalleryGroups.map((group) => (
                              <AttachmentGallery key={group.key} title={group.label} attachments={group.attachments} />
                            ))}
                          </div>
                        </CollapsiblePanel>
                      ) : (
                        <div className="space-y-4">
                          {attachmentGalleryGroups.map((group) => (
                            <AttachmentGallery key={group.key} title={group.label} attachments={group.attachments} />
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  ) : null}

                  <SectionCard sectionId="repair-history" eyebrow="History" title={isCustomerMode ? "Timeline and repair record" : "Timeline, archive, and service record"} description={isCustomerMode ? "Open this when you want to review older updates, the archived summary, and your repair record." : "Review how the repair moved from intake to release, including branch handoff, approvals, and recent updates."} className={isNativeApp ? "rounded-[28px] p-4" : ""}>
                    {isCustomerMode ? (
                      <CollapsiblePanel title="Older updates and service record" description="This keeps the page lighter by hiding older timeline entries and archive details until you need them." defaultOpen={!isNativeApp}>
                        {["completed", "cancelled"].includes(selectedRepair.status) ? (
                      <div className="mb-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                        <p className="font-semibold text-white">Archived repair snapshot</p>
                        <p className="mt-2">
                          {selectedRepair.status === "completed"
                            ? `Completed ${selectedRepair.completedAt ? formatRepairDateTime(selectedRepair.completedAt) : "recently"} with warranty ${selectedRepair.warranty?.expiresAt ? `until ${formatRepairDateTime(selectedRepair.warranty.expiresAt, { month: "short", day: "numeric", year: "numeric" })}` : "not specified"}.`
                            : `Cancelled ${selectedRepair.cancelledAt ? formatRepairDateTime(selectedRepair.cancelledAt) : "recently"}.`}
                        </p>
                        <p className="mt-2 text-emerald-50/90">
                          Parts used total: {peso(selectedRepair.invoice?.partsUsedTotal || 0)} • Payment {selectedRepair.invoice?.paymentStatus || "unpaid"}
                        </p>
                      </div>
                        ) : null}

                        <HistoryList title="Recent timeline" items={(selectedRepair.timeline || []).slice().reverse()} emptyLabel="No timeline updates yet." />
                      </CollapsiblePanel>
                    ) : (
                      <>
                        {["completed", "cancelled"].includes(selectedRepair.status) ? (
                          <div className="mb-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
                            <p className="font-semibold text-white">Archived repair snapshot</p>
                            <p className="mt-2">
                              {selectedRepair.status === "completed"
                                ? `Completed ${selectedRepair.completedAt ? formatRepairDateTime(selectedRepair.completedAt) : "recently"} with warranty ${selectedRepair.warranty?.expiresAt ? `until ${formatRepairDateTime(selectedRepair.warranty.expiresAt, { month: "short", day: "numeric", year: "numeric" })}` : "not specified"}.`
                                : `Cancelled ${selectedRepair.cancelledAt ? formatRepairDateTime(selectedRepair.cancelledAt) : "recently"}.`}
                            </p>
                            <p className="mt-2 text-emerald-50/90">
                              Parts used total: {peso(selectedRepair.invoice?.partsUsedTotal || 0)} - Payment {selectedRepair.invoice?.paymentStatus || "unpaid"}
                            </p>
                          </div>
                        ) : null}

                        <HistoryList title="Recent timeline" items={(selectedRepair.timeline || []).slice().reverse()} emptyLabel="No timeline updates yet." />

                        {isAdminMode ? (
                          <div className="mt-4">
                            <HistoryList title="Admin audit trail" items={(selectedRepair.auditTrail || []).slice().reverse()} emptyLabel="No audit entries yet." tone="audit" />
                          </div>
                        ) : null}
                      </>
                    )}
                  </SectionCard>
                </div>
              </div>
            </>
          ) : (
            <SectionCard eyebrow="Repair detail" title="Choose a repair request" description="Open a repair request from the queue to see the quote, chat, schedule, attachments, and admin controls.">
              <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center text-sm text-slate-400">
                Pick a repair request from the left queue to start working.
              </div>
            </SectionCard>
          )}
        </main>
      </div>
    </div>
  );
}
