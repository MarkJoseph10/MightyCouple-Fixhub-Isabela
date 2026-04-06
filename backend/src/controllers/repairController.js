import crypto from "crypto";
import { isCloudinaryConfigured } from "../config/cloudinary.js";
import { Conversation } from "../models/Conversation.js";
import { uploadBufferToCloudinary } from "./uploadController.js";
import { createNotifications } from "../services/notificationService.js";
import { recordActivity } from "../services/activityLogService.js";
import { RepairRequest } from "../models/RepairRequest.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const REPAIR_POPULATE = [
  { path: "customer", select: "name email avatar phone role" },
  { path: "seller", select: "name email avatar role sellerProfile.storeName sellerProfile.displayName sellerProfile.avatar sellerProfile.servicePoints" },
  { path: "assignedBy", select: "name email role" },
  { path: "timeline.actorUser", select: "name email role" },
  { path: "auditTrail.actorUser", select: "name email role" },
  { path: "quote.preparedBy", select: "name email role" },
  { path: "dispute.openedBy", select: "name email role" },
  { path: "dispute.resolvedBy", select: "name email role" },
  { path: "availableSlots.createdBy", select: "name email role" },
  { path: "availableSlots.bookedBy", select: "name email role" },
  { path: "partsUsed.linkedProduct", select: "name slug category price stock images" }
];

const REPAIR_STATUSES = new Set([
  "pending",
  "reviewing",
  "quoted",
  "approved",
  "rejected",
  "scheduled",
  "in_progress",
  "waiting_parts",
  "ready_for_pickup",
  "completed",
  "cancelled"
]);

const SELLER_WORKFLOW_STATUSES = new Set([
  "reviewing",
  "scheduled",
  "in_progress",
  "waiting_parts",
  "ready_for_pickup"
]);

const CATEGORY_FIELD_MAP = {
  reported_issue: "reportedIssueAttachments",
  before_repair: "beforeRepairAttachments",
  diagnosis: "diagnosisAttachments",
  after_repair: "afterRepairAttachments",
  proof_of_completion: "proofOfCompletionAttachments"
};

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function trimText(value = "") {
  return String(value || "").trim();
}

function toDateOrNull(value) {
  if (!value) {
    return null;
  }

  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function serializeParticipant(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    avatar: user.avatar || user.sellerProfile?.avatar || "",
    storeName: user.sellerProfile?.storeName || "",
    displayName: user.sellerProfile?.displayName || "",
    servicePoints: sanitizeServicePoints(user.sellerProfile?.servicePoints || [])
  };
}

function serializeAttachment(attachment) {
  return {
    _id: attachment._id,
    type: attachment.type,
    url: attachment.url,
    originalName: attachment.originalName || "",
    mimeType: attachment.mimeType || "",
    sizeBytes: Number(attachment.sizeBytes || 0),
    width: attachment.width ?? null,
    height: attachment.height ?? null,
    durationSeconds: Number(attachment.durationSeconds || 0)
  };
}

function getSellerLabel(user) {
  if (!user) {
    return "Repair desk";
  }

  return user.sellerProfile?.storeName || user.sellerProfile?.displayName || user.name || user.email || "Repair desk";
}

function sanitizeServicePoints(points = []) {
  return [...new Set(
    (Array.isArray(points) ? points : [])
      .map((point) => trimText(point))
      .filter(Boolean)
  )];
}

function isApprovedRepairTechnician(user) {
  return user?.role === "seller" && user?.sellerProfile?.isActive !== false && user?.technicianApplication?.status === "approved";
}

async function registerSellerServicePoint(sellerId, branchLabel) {
  const nextLabel = trimText(branchLabel);
  if (!sellerId || !nextLabel) {
    return;
  }

  const seller = await User.findById(sellerId).select("sellerProfile.servicePoints");
  if (!seller) {
    return;
  }

  const nextServicePoints = sanitizeServicePoints([
    ...(seller.sellerProfile?.servicePoints || []),
    nextLabel
  ]);

  seller.sellerProfile = {
    ...(seller.sellerProfile || {}),
    servicePoints: nextServicePoints
  };
  await seller.save();
}

function buildRepairLink(role, repairId) {
  if (role === "admin") {
    return `/admin/repairs?repair=${repairId}`;
  }

  if (role === "seller") {
    return `/seller/repairs?repair=${repairId}`;
  }

  return `/repairs?repair=${repairId}`;
}

function buildRepairChatLink(role, repairId) {
  if (role === "admin") {
    return `/admin/messages?repairId=${repairId}`;
  }

  if (role === "seller") {
    return `/seller/messages?repairId=${repairId}`;
  }

  return `/messages?repairId=${repairId}`;
}

function getOverlapWindow(startAt, endAt) {
  const nextStart = startAt instanceof Date ? startAt : new Date(startAt);
  const nextEnd = endAt ? (endAt instanceof Date ? endAt : new Date(endAt)) : new Date(nextStart.getTime() + 60 * 60 * 1000);
  return {
    startAt: nextStart,
    endAt: nextEnd
  };
}

function slotRangesOverlap(leftStartAt, leftEndAt, rightStartAt, rightEndAt) {
  const left = getOverlapWindow(leftStartAt, leftEndAt);
  const right = getOverlapWindow(rightStartAt, rightEndAt);
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

async function assertNoSlotOverlap(repairRequest, startAt, endAt, excludeSlotId = null) {
  const hasConflictInRequest = (repairRequest.availableSlots || []).some((slot) => {
    if (excludeSlotId && String(slot._id) === String(excludeSlotId)) {
      return false;
    }

    if (slot.status === "cancelled") {
      return false;
    }

    return slotRangesOverlap(slot.startAt, slot.endAt, startAt, endAt);
  });

  if (hasConflictInRequest) {
    throw new ApiError(400, "This slot overlaps with another slot already saved for the request");
  }

  if (!repairRequest.seller) {
    return;
  }

  const siblingRepairs = await RepairRequest.find({
    _id: { $ne: repairRequest._id },
    seller: repairRequest.seller,
    status: { $nin: ["completed", "cancelled"] }
  }).select("requestNumber availableSlots scheduledAt");

  const conflictingSiblingSlot = siblingRepairs.find((otherRepair) =>
    (otherRepair.availableSlots || []).some((slot) => {
      if (slot.status === "cancelled") {
        return false;
      }

      return slotRangesOverlap(slot.startAt, slot.endAt, startAt, endAt);
    })
  );

  if (conflictingSiblingSlot) {
    throw new ApiError(400, `This slot overlaps with a saved slot in repair ${conflictingSiblingSlot.requestNumber}`);
  }

  const overlapWindow = getOverlapWindow(startAt, endAt);
  const conflictingRepair = await RepairRequest.findOne({
    _id: { $ne: repairRequest._id },
    seller: repairRequest.seller,
    status: { $nin: ["completed", "cancelled"] },
    scheduledAt: {
      $gte: overlapWindow.startAt,
      $lt: overlapWindow.endAt
    }
  }).select("_id requestNumber scheduledAt");

  if (conflictingRepair) {
    throw new ApiError(400, `This slot overlaps with scheduled repair ${conflictingRepair.requestNumber}`);
  }
}

function getRepairQueueFlags(repairRequest) {
  const now = Date.now();
  const dueAt = repairRequest.dueAt ? new Date(repairRequest.dueAt).getTime() : 0;
  const isClosed = ["completed", "cancelled"].includes(repairRequest.status);

  return {
    isUnassigned: !repairRequest.seller,
    isOverdue: Boolean(dueAt && dueAt < now && !isClosed),
    isWaitingCustomerApproval: repairRequest.status === "quoted",
    isWaitingParts: repairRequest.status === "waiting_parts",
    isReadyForPickup: repairRequest.status === "ready_for_pickup",
    isDisputed: repairRequest.dispute?.status === "open"
  };
}

function buildRepairSuggestedActions(repairRequest, currentUser = null) {
  const actions = [];

  if (currentUser?.role === "customer") {
    if (repairRequest.quote?.status === "pending_customer") {
      actions.push({
        key: "approve_quote",
        label: "Approve or reject the quote",
        description: "Review the estimate, payment notes, and labor scope before the seller proceeds.",
        tone: "brand"
      });
    }
    if ((repairRequest.availableSlots || []).some((slot) => slot.status === "available")) {
      actions.push({
        key: "book_slot",
        label: "Book a repair slot",
        description: "Choose the exact repair or pickup window that fits your approved booking.",
        tone: "white"
      });
    }
    actions.push({
      key: "upload_proof",
      label: "Upload more issue photos or videos",
      description: "Send clearer damage proof if the seller or admin needs more context before quoting.",
      tone: "white"
    });
    actions.push({
      key: "open_chat",
      label: "Open repair chat",
      description: "Ask questions without leaving the booking so everyone stays tied to the same repair record.",
      tone: "white"
    });
    if (repairRequest.claimOtp && repairRequest.status !== "completed") {
      actions.push({
        key: "claim_with_otp",
        label: "Claim with OTP",
        description: "Use the secure pickup code when the repair desk is ready to release your device.",
        tone: "brand"
      });
    }
    if (repairRequest.status === "completed" && !repairRequest.rating?.createdAt) {
      actions.push({
        key: "rate_service",
        label: "Rate the repair service",
        description: "Leave a score and written feedback after the device has been released.",
        tone: "white"
      });
    }
  }

  if (currentUser?.role === "seller") {
    actions.push({
      key: "update_workflow_stage",
      label: "Update workflow stage",
      description: "Move the repair between triage, in-progress, waiting parts, and pickup-ready without using admin override.",
      tone: "brand"
    });
    actions.push({
      key: "update_diagnosis",
      label: "Upload diagnosis or repair proof",
      description: "Add technician findings, before photos, or after-repair proof to keep the job auditable.",
      tone: "white"
    });
    actions.push({
      key: "prepare_quote",
      label: "Prepare or update quote",
      description: "Set labor, parts, payment notes, and estimated completion so the customer can respond.",
      tone: "brand"
    });
    actions.push({
      key: "manage_slots",
      label: "Offer or adjust booking slots",
      description: "Open availability, block unavailable hours, or adjust an existing repair window.",
      tone: "white"
    });
    actions.push({
      key: "manage_service_points",
      label: "Manage service points",
      description: "Keep your branch, desk, and pickup point list clean so customers stop typing inconsistent labels.",
      tone: "white"
    });
  }

  if (currentUser?.role === "admin") {
    actions.push({
      key: "assign_repair",
      label: "Assign or reassign seller",
      description: "Route the booking to the right service desk and keep branch ownership accurate.",
      tone: "brand"
    });
    actions.push({
      key: "override_status",
      label: "Override repair status",
      description: "Intervene when a dispute, urgent escalation, or correction needs admin authority.",
      tone: "white"
    });
    actions.push({
      key: "review_audit",
      label: "Review audit trail",
      description: "Check timeline, notes, and seller handling before resolving the next admin action.",
      tone: "white"
    });
    actions.push({
      key: "manage_service_points",
      label: "Manage seller service points",
      description: "Standardize branch and service point names so assignment, scheduling, and reporting stay consistent.",
      tone: "white"
    });
  }

  return actions;
}

function appendTimeline(repairRequest, actor, status, label, message = "") {
  repairRequest.timeline.push({
    status,
    label,
    message,
    actorUser: actor?._id || null,
    actorName: actor?.name || actor?.email || "System",
    actorRole: actor?.role || "system",
    createdAt: new Date()
  });
}

function appendAudit(repairRequest, actor, action, title, message, metadata = {}) {
  repairRequest.auditTrail.push({
    action,
    title,
    message,
    actorUser: actor?._id || null,
    actorName: actor?.name || actor?.email || "System",
    actorRole: actor?.role || "system",
    metadata,
    createdAt: new Date()
  });
}

async function recordRepairActivity(repairRequest, actor, action, title, message, metadata = {}, severity = "info") {
  await recordActivity({
    actor,
    action,
    title,
    message,
    category: "repair",
    subjectType: "repair_request",
    subjectId: String(repairRequest._id),
    severity,
    link: buildRepairLink("admin", repairRequest._id),
    metadata: {
      requestNumber: repairRequest.requestNumber,
      ...metadata
    }
  });
}

async function notifyRepairParticipants({
  repairRequest,
  actor,
  type,
  title,
  message,
  includeCustomer = true,
  includeSeller = true,
  includeAdmin = true,
  data = {}
}) {
  const recipients = [];

  if (includeCustomer && repairRequest.customer) {
    recipients.push({
      userId: repairRequest.customer._id || repairRequest.customer,
      title,
      message,
      link: buildRepairLink("customer", repairRequest._id),
      data: { repairId: repairRequest._id, requestNumber: repairRequest.requestNumber, ...data }
    });
  }

  if (includeSeller && repairRequest.seller) {
    recipients.push({
      userId: repairRequest.seller._id || repairRequest.seller,
      title,
      message,
      link: buildRepairLink("seller", repairRequest._id),
      data: { repairId: repairRequest._id, requestNumber: repairRequest.requestNumber, ...data }
    });
  }

  if (includeAdmin) {
    recipients.push({
      role: "admin",
      title,
      message,
      link: buildRepairLink("admin", repairRequest._id),
      data: { repairId: repairRequest._id, requestNumber: repairRequest.requestNumber, ...data }
    });
  }

  await createNotifications({
    recipients,
    type,
    title,
    message,
    link: buildRepairLink("customer", repairRequest._id),
    createdBy: actor?._id || null,
    data: {
      repairId: repairRequest._id,
      requestNumber: repairRequest.requestNumber,
      ...data
    }
  });
}

function canAccessRepair(user, repairRequest) {
  if (!user || !repairRequest) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "seller") {
    return isApprovedRepairTechnician(user) && Boolean(repairRequest.seller) && String(repairRequest.seller._id || repairRequest.seller) === String(user._id);
  }

  return Boolean(repairRequest.customer) && String(repairRequest.customer._id || repairRequest.customer) === String(user._id);
}

function assertRepairAccess(user, repairRequest) {
  if (!canAccessRepair(user, repairRequest)) {
    throw new ApiError(403, "You do not have access to this repair request");
  }
}

function assertSellerOrAdmin(user) {
  if (!user || !["seller", "admin"].includes(user.role)) {
    throw new ApiError(403, "Only sellers or admin can perform this action");
  }

  if (user.role === "seller" && !isApprovedRepairTechnician(user)) {
    throw new ApiError(403, "Apply as a technician and wait for admin approval before using repair tools");
  }
}

function assertAdmin(user) {
  if (!user || user.role !== "admin") {
    throw new ApiError(403, "Only admin can perform this action");
  }
}

function serializeRepairRequest(repairRequest, currentUser = null) {
  const quoteTotal = roundMoney(
    Number(repairRequest.quote?.laborFee || 0)
      + Number(repairRequest.quote?.partsFee || 0)
      + Number(repairRequest.quote?.otherFee || 0)
  );

  const canApproveQuote = currentUser?.role === "customer" && repairRequest.quote?.status === "pending_customer";
  const canRate = currentUser?.role === "customer" && repairRequest.status === "completed" && !repairRequest.rating?.createdAt;
  const canSubmitDispute = ["customer", "seller"].includes(currentUser?.role) && repairRequest.dispute?.status !== "open";
  const queueFlags = getRepairQueueFlags(repairRequest);

  return {
    _id: repairRequest._id,
    requestNumber: repairRequest.requestNumber,
    serviceType: repairRequest.serviceType,
    status: repairRequest.status,
    customer: serializeParticipant(repairRequest.customer),
    seller: serializeParticipant(repairRequest.seller),
    assignedBy: serializeParticipant(repairRequest.assignedBy),
    branchLabel: repairRequest.branchLabel || "",
    pickupMethod: repairRequest.pickupMethod || "drop_off",
    contactNumber: repairRequest.contactNumber || "",
    alternateContact: repairRequest.alternateContact || "",
    device: {
      type: repairRequest.device?.type || "",
      brand: repairRequest.device?.brand || "",
      model: repairRequest.device?.model || "",
      serialNumber: repairRequest.device?.serialNumber || "",
      color: repairRequest.device?.color || "",
      accessories: repairRequest.device?.accessories || ""
    },
    issueDescription: repairRequest.issueDescription || "",
    preferredScheduleAt: repairRequest.preferredScheduleAt || null,
    scheduledAt: repairRequest.scheduledAt || null,
    scheduleNotes: repairRequest.scheduleNotes || "",
    availableSlots: (repairRequest.availableSlots || []).map((slot) => ({
      _id: slot._id,
      label: slot.label || "",
      startAt: slot.startAt,
      endAt: slot.endAt || null,
      status: slot.status,
      note: slot.note || "",
      createdBy: serializeParticipant(slot.createdBy),
      bookedBy: serializeParticipant(slot.bookedBy),
      bookedAt: slot.bookedAt || null,
      cancelledAt: slot.cancelledAt || null,
      updatedAt: slot.updatedAt || null
    })),
    attachments: {
      reportedIssue: (repairRequest.reportedIssueAttachments || []).map(serializeAttachment),
      beforeRepair: (repairRequest.beforeRepairAttachments || []).map(serializeAttachment),
      diagnosis: (repairRequest.diagnosisAttachments || []).map(serializeAttachment),
      afterRepair: (repairRequest.afterRepairAttachments || []).map(serializeAttachment),
      proofOfCompletion: (repairRequest.proofOfCompletionAttachments || []).map(serializeAttachment)
    },
    quote: {
      status: repairRequest.quote?.status || "none",
      laborFee: Number(repairRequest.quote?.laborFee || 0),
      partsFee: Number(repairRequest.quote?.partsFee || 0),
      otherFee: Number(repairRequest.quote?.otherFee || 0),
      total: quoteTotal,
      approvedAmount: Number(repairRequest.quote?.approvedAmount || quoteTotal),
      estimatedCompletionAt: repairRequest.quote?.estimatedCompletionAt || null,
      notes: repairRequest.quote?.notes || "",
      paymentStatus: repairRequest.quote?.paymentStatus || "unpaid",
      paymentMethod: repairRequest.quote?.paymentMethod || "",
      paymentReference: repairRequest.quote?.paymentReference || "",
      paidAt: repairRequest.quote?.paidAt || null,
      preparedBy: serializeParticipant(repairRequest.quote?.preparedBy),
      preparedAt: repairRequest.quote?.preparedAt || null,
      customerRespondedAt: repairRequest.quote?.customerRespondedAt || null,
      customerResponseNote: repairRequest.quote?.customerResponseNote || ""
    },
    partsUsed: (repairRequest.partsUsed || []).map((part) => ({
      _id: part._id,
      name: part.name || "",
      quantity: Number(part.quantity || 0),
      cost: Number(part.cost || 0),
      note: part.note || "",
      linkedProduct: part.linkedProduct
        ? {
            _id: part.linkedProduct._id,
            name: part.linkedProduct.name || "",
            slug: part.linkedProduct.slug || "",
            category: part.linkedProduct.category || "",
            price: Number(part.linkedProduct.price || 0),
            stock: Number(part.linkedProduct.stock || 0),
            image: part.linkedProduct.images?.[0]?.url || ""
          }
        : null
    })),
    slaHours: Number(repairRequest.slaHours || 0),
    dueAt: repairRequest.dueAt || null,
    technicianNotes: repairRequest.technicianNotes || "",
    finalSummary: repairRequest.finalSummary || "",
    warranty: {
      durationDays: Number(repairRequest.warranty?.durationDays || 0),
      expiresAt: repairRequest.warranty?.expiresAt || null,
      note: repairRequest.warranty?.note || ""
    },
    rating: {
      rating: repairRequest.rating?.rating || null,
      comment: repairRequest.rating?.comment || "",
      createdAt: repairRequest.rating?.createdAt || null
    },
    dispute: {
      status: repairRequest.dispute?.status || "none",
      reason: repairRequest.dispute?.reason || "",
      message: repairRequest.dispute?.message || "",
      openedBy: serializeParticipant(repairRequest.dispute?.openedBy),
      openedByRole: repairRequest.dispute?.openedByRole || null,
      openedAt: repairRequest.dispute?.openedAt || null,
      resolvedBy: serializeParticipant(repairRequest.dispute?.resolvedBy),
      resolvedAt: repairRequest.dispute?.resolvedAt || null,
      resolutionNote: repairRequest.dispute?.resolutionNote || ""
    },
    claim: {
      otp: repairRequest.claimOtp || "",
      expiresAt: repairRequest.claimOtpExpiresAt || null,
      pickedUpAt: repairRequest.pickedUpAt || null
    },
    completedAt: repairRequest.completedAt || null,
    cancelledAt: repairRequest.cancelledAt || null,
    timeline: (repairRequest.timeline || []).map((entry) => ({
      _id: entry._id,
      status: entry.status,
      label: entry.label,
      message: entry.message || "",
      actor: serializeParticipant(entry.actorUser),
      actorName: entry.actorName || "",
      actorRole: entry.actorRole || "system",
      createdAt: entry.createdAt
    })),
    auditTrail: (repairRequest.auditTrail || []).map((entry) => ({
      _id: entry._id,
      action: entry.action,
      title: entry.title,
      message: entry.message,
      actor: serializeParticipant(entry.actorUser),
      actorName: entry.actorName || "",
      actorRole: entry.actorRole || "system",
      metadata: entry.metadata || {},
      createdAt: entry.createdAt
    })),
    invoice: {
      requestNumber: repairRequest.requestNumber,
      approvedAmount: Number(repairRequest.quote?.approvedAmount || quoteTotal),
      paymentStatus: repairRequest.quote?.paymentStatus || "unpaid",
      paymentMethod: repairRequest.quote?.paymentMethod || "",
      paymentReference: repairRequest.quote?.paymentReference || "",
      summary: repairRequest.finalSummary || repairRequest.issueDescription || "",
      partsUsedTotal: roundMoney((repairRequest.partsUsed || []).reduce((sum, part) => sum + Number(part.quantity || 0) * Number(part.cost || 0), 0)),
      warrantyNote: repairRequest.warranty?.note || "",
      warrantyExpiresAt: repairRequest.warranty?.expiresAt || null
    },
    queueFlags,
    suggestedActions: buildRepairSuggestedActions(repairRequest, currentUser),
    permissions: {
      canApproveQuote,
      canRejectQuote: canApproveQuote,
      canRate,
      canSubmitDispute,
      canOpenChat: true,
      canAssign: currentUser?.role === "admin",
      canOverrideStatus: currentUser?.role === "admin",
      canManageWorkflowStatus: ["admin", "seller"].includes(currentUser?.role),
      canManageQuote: ["admin", "seller"].includes(currentUser?.role),
      canManageSlots: ["admin", "seller"].includes(currentUser?.role),
      canManageCompletion: ["admin", "seller"].includes(currentUser?.role),
      canManageServicePoints: ["admin", "seller"].includes(currentUser?.role),
      canResolveDispute: currentUser?.role === "admin" && repairRequest.dispute?.status === "open"
    },
    links: {
      detail: buildRepairLink(currentUser?.role || "customer", repairRequest._id),
      chat: buildRepairChatLink(currentUser?.role || "customer", repairRequest._id)
    },
    createdAt: repairRequest.createdAt,
    updatedAt: repairRequest.updatedAt
  };
}

async function loadRepairRequest(id) {
  if (!id) {
    return null;
  }

  return RepairRequest.findById(id).populate(REPAIR_POPULATE);
}

async function uploadRepairFiles(files = [], folder) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const type = file.mimetype.startsWith("video/") ? "video" : "image";
      const result = await uploadBufferToCloudinary(file, type, {
        folder: `shopverse/repairs/${folder}`
      });

      return {
        type,
        url: result?.secure_url || "",
        originalName: file.originalname || "",
        mimeType: file.mimetype || "",
        sizeBytes: Number(file.size || 0),
        publicId: result?.public_id || "",
        width: result?.width ?? null,
        height: result?.height ?? null,
        durationSeconds: Number(result?.duration || 0)
      };
    })
  );

  return uploads.filter((item) => item.url);
}

async function getRepairSellerOptions() {
  const sellers = await User.find({
    role: "seller",
    "sellerProfile.isActive": true,
    "technicianApplication.status": "approved"
  })
    .select("name email sellerProfile.storeName sellerProfile.displayName sellerProfile.avatar sellerProfile.servicePoints")
    .sort({ "sellerProfile.storeName": 1, name: 1 });

  const branchRows = await RepairRequest.aggregate([
    {
      $match: {
        seller: { $in: sellers.map((seller) => seller._id) },
        branchLabel: { $type: "string", $ne: "" }
      }
    },
    {
      $group: {
        _id: "$seller",
        branchLabels: { $addToSet: "$branchLabel" }
      }
    }
  ]);

  const branchMap = new Map(branchRows.map((row) => [String(row._id), sanitizeServicePoints(row.branchLabels)]));

  return sellers.map((seller) => {
    const servicePoints = sanitizeServicePoints([
      ...(seller.sellerProfile?.servicePoints || []),
      ...(branchMap.get(String(seller._id)) || [])
    ]);

    return {
      _id: seller._id,
      label: getSellerLabel(seller),
      storeName: seller.sellerProfile?.storeName || "",
      displayName: seller.sellerProfile?.displayName || seller.name || "",
      email: seller.email || "",
      avatar: seller.avatar || seller.sellerProfile?.avatar || "",
      servicePoints
    };
  });
}

async function syncRepairConversationSeller(repairRequest) {
  if (!repairRequest?._id) {
    return;
  }

  await Conversation.updateMany(
    { repairRequest: repairRequest._id },
    {
      $set: {
        seller: repairRequest.seller || null
      }
    }
  );
}

export const getRepairBookingOptions = asyncHandler(async (_req, res) => {
  const sellers = await getRepairSellerOptions();

  res.json({
    sellers,
    pickupMethods: [
      { value: "drop_off", label: "Drop-off" },
      { value: "pickup", label: "Pickup request" }
    ],
    statuses: [...REPAIR_STATUSES]
  });
});

export const updateRepairServicePoints = asyncHandler(async (req, res) => {
  const requestedSellerId = trimText(req.params.sellerId || req.body.sellerId);
  const targetSellerId = req.user.role === "admin" ? requestedSellerId : String(req.user._id || "");

  if (req.user.role === "seller" && !isApprovedRepairTechnician(req.user)) {
    throw new ApiError(403, "Apply as a technician and wait for admin approval before updating repair service points");
  }

  if (!targetSellerId) {
    throw new ApiError(400, "Seller is required");
  }

  if (req.user.role === "seller" && String(req.user._id) !== String(targetSellerId)) {
    throw new ApiError(403, "Sellers can only update their own service points");
  }

  const seller = await User.findOne({
    _id: targetSellerId,
    role: "seller",
    "sellerProfile.isActive": true,
    "technicianApplication.status": "approved"
  }).select("name email sellerProfile.storeName sellerProfile.displayName sellerProfile.avatar sellerProfile.servicePoints role");

  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  const servicePoints = sanitizeServicePoints(req.body.servicePoints);

  seller.sellerProfile = {
    ...(seller.sellerProfile || {}),
    servicePoints
  };
  await seller.save();

  res.json({
    message: "Repair service points updated successfully.",
    seller: serializeParticipant(seller),
    servicePoints
  });
});

export const createRepairRequest = asyncHandler(async (req, res) => {
  const sellerId = trimText(req.body.sellerId);
  const deviceType = trimText(req.body.deviceType);
  const brand = trimText(req.body.brand);
  const model = trimText(req.body.model);
  const issueDescription = trimText(req.body.issueDescription);
  const contactNumber = trimText(req.body.contactNumber);

  if (!deviceType || !issueDescription || !contactNumber) {
    throw new ApiError(400, "Device type, issue description, and contact number are required");
  }

  let seller = null;
  if (sellerId) {
    seller = await User.findOne({
      _id: sellerId,
      role: "seller",
      "sellerProfile.isActive": true,
      "technicianApplication.status": "approved"
    }).select("name email sellerProfile.storeName sellerProfile.displayName sellerProfile.avatar role");

    if (!seller) {
      throw new ApiError(404, "Selected repair seller not found");
    }
  }

  const reportedFiles = Array.isArray(req.files) ? req.files : [];

  if (reportedFiles.length && !isCloudinaryConfigured) {
    throw new ApiError(500, "Cloudinary is not configured on the server");
  }

  const reportedIssueAttachments = reportedFiles.length ? await uploadRepairFiles(reportedFiles, "reported-issue") : [];
  const preferredScheduleAt = toDateOrNull(req.body.preferredDateTime);
  const pickupMethod = trimText(req.body.pickupMethod) || "drop_off";
  const branchLabel = trimText(req.body.branchLabel) || getSellerLabel(seller);

  const repairRequest = await RepairRequest.create({
    customer: req.user._id,
    seller: seller?._id || null,
    assignedBy: null,
    serviceType: "repair",
    status: "pending",
    branchLabel,
    pickupMethod,
    contactNumber,
    alternateContact: trimText(req.body.alternateContact),
    device: {
      type: deviceType,
      brand,
      model,
      serialNumber: trimText(req.body.serialNumber),
      color: trimText(req.body.color),
      accessories: trimText(req.body.accessories)
    },
    issueDescription,
    preferredScheduleAt,
    reportedIssueAttachments,
    slaHours: Number(req.body.slaHours || 72)
  });

  if (seller?._id && branchLabel) {
    await registerSellerServicePoint(seller._id, branchLabel);
  }

  if (seller?._id && branchLabel) {
    await registerSellerServicePoint(seller._id, branchLabel);
  }

  appendTimeline(
    repairRequest,
    req.user,
    "pending",
    "Repair booking submitted",
    `Customer submitted a repair request for ${brand || deviceType} ${model}`.trim()
  );
  appendAudit(
    repairRequest,
    req.user,
    "repair_request_created",
    "Repair booking submitted",
    "Customer created a new repair booking request.",
    {
      sellerId: seller?._id || null,
      branchLabel,
      preferredScheduleAt
    }
  );
  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_request_submitted",
    title: `New repair request ${repairRequest.requestNumber}`,
    message: `${req.user.name || req.user.email} submitted a repair booking for ${brand || deviceType} ${model}`.trim(),
    includeCustomer: false,
    includeSeller: Boolean(repairRequest.seller),
    includeAdmin: true
  });
  await recordRepairActivity(
    repairRequest,
    req.user,
    "repair_request_created",
    "Repair booking submitted",
    "Customer created a new repair booking request.",
    {
      sellerId: seller?._id || null,
      branchLabel
    },
    "success"
  );

  res.status(201).json({
    message: "Repair booking submitted successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

function buildRepairAccessFilter(user, query = {}) {
  const filter = {};

  if (user.role === "seller") {
    filter.seller = user._id;
  } else if (user.role === "customer") {
    filter.customer = user._id;
  }

  const status = trimText(query.status).toLowerCase();
  if (status && REPAIR_STATUSES.has(status)) {
    filter.status = status;
  }

  const search = trimText(query.q);
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { requestNumber: pattern },
      { "device.type": pattern },
      { "device.brand": pattern },
      { "device.model": pattern },
      { issueDescription: pattern },
      { branchLabel: pattern },
      { contactNumber: pattern }
    ];
  }

  if (trimText(query.sellerId)) {
    filter.seller = trimText(query.sellerId);
  }

  return filter;
}

async function listRepairRequests(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = buildRepairAccessFilter(req.user, req.query);

  const [repairRequests, total] = await Promise.all([
    RepairRequest.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(REPAIR_POPULATE),
    RepairRequest.countDocuments(filter)
  ]);

  res.json({
    repairRequests: repairRequests.map((item) => serializeRepairRequest(item, req.user)),
    page,
    limit,
    total,
    hasMore: page * limit < total
  });
}

export const getMyRepairRequests = asyncHandler(listRepairRequests);
export const getSellerRepairRequests = asyncHandler(async (req, res) => {
  assertSellerOrAdmin(req.user);
  await listRepairRequests(req, res);
});
export const getAllRepairRequests = asyncHandler(async (req, res) => {
  assertAdmin(req.user);
  await listRepairRequests(req, res);
});

export const getRepairRequestById = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  res.json({
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const assignRepairRequest = asyncHandler(async (req, res) => {
  assertAdmin(req.user);

  const repairRequest = await loadRepairRequest(req.params.id);
  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  const sellerId = trimText(req.body.sellerId);
  if (!sellerId) {
    throw new ApiError(400, "Seller is required");
  }

  const seller = await User.findOne({
    _id: sellerId,
    role: "seller",
    "sellerProfile.isActive": true,
    "technicianApplication.status": "approved"
  }).select("name email sellerProfile.storeName sellerProfile.displayName sellerProfile.avatar sellerProfile.servicePoints role");

  if (!seller) {
    throw new ApiError(404, "Seller not found");
  }

  repairRequest.seller = seller._id;
  repairRequest.assignedBy = req.user._id;
  repairRequest.branchLabel = trimText(req.body.branchLabel) || getSellerLabel(seller);

  await registerSellerServicePoint(seller._id, repairRequest.branchLabel);

  appendTimeline(repairRequest, req.user, repairRequest.status, "Repair request assigned", `Assigned to ${getSellerLabel(seller)}.`);
  appendAudit(repairRequest, req.user, "repair_request_assigned", "Repair request assigned", `Admin assigned the request to ${getSellerLabel(seller)}.`, {
    sellerId: seller._id
  });

  await repairRequest.save();
  await syncRepairConversationSeller(repairRequest);
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_request_assigned",
    title: `Repair request ${repairRequest.requestNumber} assigned`,
    message: `${getSellerLabel(seller)} is now handling this repair booking.`,
    includeCustomer: true,
    includeSeller: true,
    includeAdmin: false
  });
  await recordRepairActivity(
    repairRequest,
    req.user,
    "repair_request_assigned",
    "Repair request assigned",
    `Admin assigned the request to ${getSellerLabel(seller)}.`,
    { sellerId: seller._id },
    "success"
  );

  res.json({
    message: "Repair request assigned successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const updateRepairStatus = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  const nextStatus = trimText(req.body.status).toLowerCase();
  if (!REPAIR_STATUSES.has(nextStatus)) {
    throw new ApiError(400, "Invalid repair status");
  }

  if (req.user.role === "customer" && !["cancelled"].includes(nextStatus)) {
    throw new ApiError(403, "Customers can only cancel their repair request from this action");
  }

  if (req.user.role === "seller" && !SELLER_WORKFLOW_STATUSES.has(nextStatus)) {
    throw new ApiError(403, "Sellers can only update workflow stages from their repair desk");
  }

  if (req.user.role === "seller" && nextStatus === "scheduled" && !repairRequest.scheduledAt) {
    throw new ApiError(400, "Set or book a repair schedule before moving this request to scheduled");
  }

  const previousStatus = repairRequest.status;
  repairRequest.status = nextStatus;

  if (nextStatus === "cancelled") {
    repairRequest.cancelledAt = new Date();
  }

  if (nextStatus === "completed") {
    repairRequest.completedAt = new Date();
  }

  if (nextStatus === "ready_for_pickup" && !repairRequest.claimOtp) {
    repairRequest.claimOtp = crypto.randomInt(100000, 999999).toString();
    repairRequest.claimOtpExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const note = trimText(req.body.note);
  appendTimeline(
    repairRequest,
    req.user,
    nextStatus,
    `Repair status changed to ${nextStatus.replaceAll("_", " ")}`,
    note || `Status moved from ${previousStatus.replaceAll("_", " ")} to ${nextStatus.replaceAll("_", " ")}.`
  );
  appendAudit(
    repairRequest,
    req.user,
    "repair_status_updated",
    "Repair status updated",
    `Status moved from ${previousStatus} to ${nextStatus}.`,
    { previousStatus, nextStatus, note }
  );

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_status_updated",
    title: `Repair status updated: ${repairRequest.requestNumber}`,
    message: note || `Repair status is now ${nextStatus.replaceAll("_", " ")}.`,
    includeCustomer: true,
    includeSeller: req.user.role !== "seller",
    includeAdmin: req.user.role !== "admin"
  });
  await recordRepairActivity(
    repairRequest,
    req.user,
    "repair_status_updated",
    "Repair status updated",
    `Status moved from ${previousStatus} to ${nextStatus}.`,
    { previousStatus, nextStatus, note },
    nextStatus === "cancelled" ? "warning" : "info"
  );

  res.json({
    message: "Repair status updated successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const submitRepairQuote = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);
  assertSellerOrAdmin(req.user);

  const laborFee = roundMoney(req.body.laborFee);
  const partsFee = roundMoney(req.body.partsFee);
  const otherFee = roundMoney(req.body.otherFee);
  const estimatedCompletionAt = toDateOrNull(req.body.estimatedCompletionAt);
  const notes = trimText(req.body.notes);
  const total = roundMoney(laborFee + partsFee + otherFee);

  repairRequest.quote = {
    ...repairRequest.quote?.toObject?.(),
    status: "pending_customer",
    laborFee,
    partsFee,
    otherFee,
    approvedAmount: total,
    estimatedCompletionAt,
    notes,
    preparedBy: req.user._id,
    preparedByRole: req.user.role,
    preparedAt: new Date(),
    customerRespondedAt: null,
    customerResponseNote: "",
    paymentStatus: trimText(req.body.paymentStatus) || repairRequest.quote?.paymentStatus || "unpaid",
    paymentMethod: trimText(req.body.paymentMethod),
    paymentReference: trimText(req.body.paymentReference),
    paidAt: repairRequest.quote?.paidAt || null
  };
  repairRequest.status = "quoted";
  repairRequest.dueAt = estimatedCompletionAt || repairRequest.dueAt;
  repairRequest.technicianNotes = trimText(req.body.technicianNotes) || repairRequest.technicianNotes || "";

  appendTimeline(repairRequest, req.user, "quoted", "Repair quote prepared", `A repair estimate for ${total} is now waiting for customer approval.`);
  appendAudit(repairRequest, req.user, "repair_quote_prepared", "Repair quote prepared", "Seller or admin prepared a repair quotation.", {
    laborFee,
    partsFee,
    otherFee,
    total,
    estimatedCompletionAt
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_quote_ready",
    title: `Repair quote ready: ${repairRequest.requestNumber}`,
    message: `Your repair quote is ready for approval. Estimated total: ${total}.`,
    includeCustomer: true,
    includeSeller: false,
    includeAdmin: true
  });
  await recordRepairActivity(
    repairRequest,
    req.user,
    "repair_quote_prepared",
    "Repair quote prepared",
    "Seller or admin prepared a repair quotation.",
    { laborFee, partsFee, otherFee, total },
    "success"
  );

  res.json({
    message: "Repair quote saved successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const respondRepairQuote = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  if (req.user.role !== "customer") {
    throw new ApiError(403, "Only the customer can respond to the quote");
  }

  if (repairRequest.quote?.status !== "pending_customer") {
    throw new ApiError(400, "There is no pending repair quote to respond to");
  }

  const decision = trimText(req.body.decision).toLowerCase();
  const note = trimText(req.body.note);

  if (!["approve", "reject"].includes(decision)) {
    throw new ApiError(400, "Decision must be approve or reject");
  }

  repairRequest.quote.status = decision === "approve" ? "approved" : "rejected";
  repairRequest.quote.customerRespondedAt = new Date();
  repairRequest.quote.customerResponseNote = note;
  repairRequest.status = decision === "approve" ? "approved" : "rejected";

  appendTimeline(
    repairRequest,
    req.user,
    repairRequest.status,
    decision === "approve" ? "Customer approved quote" : "Customer rejected quote",
    note || `Customer chose to ${decision} the repair estimate.`
  );
  appendAudit(
    repairRequest,
    req.user,
    "repair_quote_responded",
    decision === "approve" ? "Repair quote approved" : "Repair quote rejected",
    `Customer ${decision}d the repair quotation.`,
    { decision, note }
  );

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: decision === "approve" ? "repair_quote_approved" : "repair_quote_rejected",
    title: `Repair quote ${decision}d: ${repairRequest.requestNumber}`,
    message: note || `Customer ${decision}d the repair estimate.`,
    includeCustomer: false,
    includeSeller: true,
    includeAdmin: true
  });

  res.json({
    message: decision === "approve" ? "Repair quote approved." : "Repair quote rejected.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const addRepairAvailableSlot = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);
  assertSellerOrAdmin(req.user);

  const startAt = toDateOrNull(req.body.startAt);
  const endAt = toDateOrNull(req.body.endAt);

  if (!startAt) {
    throw new ApiError(400, "A valid slot start date is required");
  }

  if (endAt && endAt <= startAt) {
    throw new ApiError(400, "Slot end time must be later than the start time");
  }

  await assertNoSlotOverlap(repairRequest, startAt, endAt);
  const slotStatus = trimText(req.body.status).toLowerCase() === "unavailable" ? "unavailable" : "available";

  repairRequest.availableSlots.push({
    label: trimText(req.body.label),
    startAt,
    endAt,
    status: slotStatus,
    note: trimText(req.body.note),
    createdBy: req.user._id,
    createdByRole: req.user.role,
    updatedAt: new Date()
  });

  appendTimeline(repairRequest, req.user, repairRequest.status, "Repair slot offered", "A repair schedule slot was added for customer booking.");
  appendAudit(repairRequest, req.user, slotStatus === "unavailable" ? "repair_slot_unavailable" : "repair_slot_added", slotStatus === "unavailable" ? "Repair slot blocked" : "Repair slot offered", slotStatus === "unavailable" ? "Seller or admin blocked time in the repair calendar." : "Seller or admin added an available repair slot.", {
    startAt,
    endAt,
    label: trimText(req.body.label),
    status: slotStatus
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: slotStatus === "unavailable" ? "repair_slot_updated" : "repair_slot_added",
    title: slotStatus === "unavailable" ? `Repair calendar blocked: ${repairRequest.requestNumber}` : `Repair slot available: ${repairRequest.requestNumber}`,
    message: slotStatus === "unavailable" ? "A repair time block was marked unavailable." : "A repair schedule slot is now available for booking.",
    includeCustomer: slotStatus !== "unavailable",
    includeSeller: false,
    includeAdmin: req.user.role !== "admin"
  });

  res.json({
    message: "Repair slot added successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const updateRepairSlot = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);
  assertSellerOrAdmin(req.user);

  const slot = (repairRequest.availableSlots || []).find((entry) => String(entry._id) === String(req.params.slotId));
  if (!slot) {
    throw new ApiError(404, "Repair slot not found");
  }

  const action = trimText(req.body.action).toLowerCase() || "update";
  const note = trimText(req.body.note);
  const actorLabel = req.user.role === "admin" ? "Admin" : "Seller";

  if (action === "cancel") {
    slot.status = "cancelled";
    slot.cancelledAt = new Date();
    slot.updatedAt = new Date();
    slot.note = note || slot.note || "";

    if (repairRequest.scheduledAt && new Date(repairRequest.scheduledAt).getTime() === new Date(slot.startAt).getTime()) {
      repairRequest.scheduledAt = null;
      repairRequest.status = repairRequest.quote?.status === "approved" ? "approved" : repairRequest.status === "scheduled" ? "reviewing" : repairRequest.status;
    }

    appendTimeline(repairRequest, req.user, repairRequest.status, "Repair slot cancelled", `${actorLabel} cancelled a repair slot.`);
    appendAudit(repairRequest, req.user, "repair_slot_cancelled", "Repair slot cancelled", `${actorLabel} cancelled a repair slot.`, {
      slotId: slot._id,
      note
    });
  } else if (action === "mark_unavailable" || action === "mark_available") {
    if (slot.status === "booked") {
      throw new ApiError(400, "Booked slots cannot be reopened or blocked. Reschedule or cancel the slot instead.");
    }

    slot.status = action === "mark_unavailable" ? "unavailable" : "available";
    slot.updatedAt = new Date();
    slot.note = note || slot.note || "";
    if (action === "mark_available") {
      slot.cancelledAt = null;
    }

    appendTimeline(
      repairRequest,
      req.user,
      repairRequest.status,
      action === "mark_unavailable" ? "Repair slot blocked" : "Repair slot reopened",
      action === "mark_unavailable" ? `${actorLabel} marked a slot as unavailable.` : `${actorLabel} marked a slot as available again.`
    );
    appendAudit(
      repairRequest,
      req.user,
      action === "mark_unavailable" ? "repair_slot_unavailable" : "repair_slot_reopened",
      action === "mark_unavailable" ? "Repair slot marked unavailable" : "Repair slot reopened",
      action === "mark_unavailable" ? `${actorLabel} blocked a repair slot.` : `${actorLabel} reopened a repair slot.`,
      { slotId: slot._id, note }
    );
  } else {
    const startAt = toDateOrNull(req.body.startAt);
    const endAt = toDateOrNull(req.body.endAt);
    const previousStartAt = slot.startAt ? new Date(slot.startAt) : null;

    if (!startAt) {
      throw new ApiError(400, "A valid slot start date is required");
    }

    if (endAt && endAt <= startAt) {
      throw new ApiError(400, "Slot end time must be later than the start time");
    }

    await assertNoSlotOverlap(repairRequest, startAt, endAt, slot._id);

    slot.label = trimText(req.body.label) || slot.label || "";
    slot.startAt = startAt;
    slot.endAt = endAt;
    slot.note = note || slot.note || "";
    slot.updatedAt = new Date();

    if (
      slot.status === "booked" &&
      previousStartAt &&
      repairRequest.scheduledAt &&
      new Date(repairRequest.scheduledAt).getTime() === previousStartAt.getTime()
    ) {
      repairRequest.scheduledAt = startAt;
    }

    if (slot.status === "cancelled") {
      slot.status = "available";
      slot.cancelledAt = null;
    }

    appendTimeline(repairRequest, req.user, repairRequest.status, "Repair slot updated", `${actorLabel} updated the repair slot schedule.`);
    appendAudit(repairRequest, req.user, "repair_slot_updated", "Repair slot updated", `${actorLabel} updated the repair slot schedule.`, {
      slotId: slot._id,
      startAt,
      endAt,
      label: slot.label,
      note
    });
  }

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_slot_updated",
    title: `Repair slot updated: ${repairRequest.requestNumber}`,
    message: note || "A repair schedule slot was updated.",
    includeCustomer: true,
    includeSeller: req.user.role !== "seller",
    includeAdmin: req.user.role !== "admin",
    data: { slotId: req.params.slotId, action }
  });

  res.json({
    message: "Repair slot updated successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const bookRepairSlot = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  const slot = (repairRequest.availableSlots || []).find((entry) => String(entry._id) === String(req.params.slotId));
  if (!slot) {
    throw new ApiError(404, "Repair slot not found");
  }

  if (req.user.role !== "customer") {
    throw new ApiError(403, "Only the customer can book a repair slot");
  }

  if (slot.status !== "available") {
    throw new ApiError(400, "This slot is no longer available");
  }

  slot.status = "booked";
  slot.bookedBy = req.user._id;
  slot.bookedAt = new Date();
  repairRequest.scheduledAt = slot.startAt;
  repairRequest.status = "scheduled";
  repairRequest.scheduleNotes = trimText(req.body.note) || repairRequest.scheduleNotes || "";

  appendTimeline(repairRequest, req.user, "scheduled", "Repair slot booked", "Customer selected a repair schedule slot.");
  appendAudit(repairRequest, req.user, "repair_slot_booked", "Repair slot booked", "Customer booked an available repair slot.", {
    slotId: slot._id,
    startAt: slot.startAt,
    endAt: slot.endAt
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_booking_scheduled",
    title: `Repair booking scheduled: ${repairRequest.requestNumber}`,
    message: "The customer booked a repair slot.",
    includeCustomer: false,
    includeSeller: true,
    includeAdmin: true
  });

  res.json({
    message: "Repair slot booked successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const updateRepairSchedule = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);
  assertSellerOrAdmin(req.user);

  const scheduledAt = toDateOrNull(req.body.scheduledAt);
  if (!scheduledAt) {
    throw new ApiError(400, "A valid schedule is required");
  }

  if (repairRequest.seller) {
    const scheduledConflict = await RepairRequest.findOne({
      _id: { $ne: repairRequest._id },
      seller: repairRequest.seller,
      status: { $nin: ["completed", "cancelled"] },
      scheduledAt
    }).select("requestNumber");

    if (scheduledConflict) {
      throw new ApiError(400, `This schedule overlaps with repair ${scheduledConflict.requestNumber}`);
    }
  }

  repairRequest.scheduledAt = scheduledAt;
  repairRequest.scheduleNotes = trimText(req.body.scheduleNotes) || repairRequest.scheduleNotes || "";
  repairRequest.status = "scheduled";

  appendTimeline(repairRequest, req.user, "scheduled", "Repair schedule updated", "Seller or admin updated the confirmed repair schedule.");
  appendAudit(repairRequest, req.user, "repair_schedule_updated", "Repair schedule updated", "Seller or admin updated the repair schedule.", {
    scheduledAt,
    scheduleNotes: repairRequest.scheduleNotes
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_booking_rescheduled",
    title: `Repair schedule updated: ${repairRequest.requestNumber}`,
    message: "Your repair booking schedule was updated.",
    includeCustomer: true,
    includeSeller: req.user.role !== "seller",
    includeAdmin: req.user.role !== "admin"
  });

  res.json({
    message: "Repair schedule updated successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const uploadRepairAttachments = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  const category = trimText(req.params.category).toLowerCase();
  const fieldName = CATEGORY_FIELD_MAP[category];
  if (!fieldName) {
    throw new ApiError(400, "Invalid repair attachment category");
  }

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    throw new ApiError(400, "At least one file is required");
  }

  if (!isCloudinaryConfigured) {
    throw new ApiError(500, "Cloudinary is not configured on the server");
  }

  const uploads = await uploadRepairFiles(files, category);
  repairRequest[fieldName] = [...(repairRequest[fieldName] || []), ...uploads];

  appendTimeline(
    repairRequest,
    req.user,
    repairRequest.status,
    "Repair attachments uploaded",
    `${uploads.length} file(s) added to ${category.replaceAll("_", " ")}.`
  );
  appendAudit(
    repairRequest,
    req.user,
    "repair_attachments_uploaded",
    "Repair attachments uploaded",
    `${uploads.length} file(s) added to ${category.replaceAll("_", " ")}.`,
    { category, uploadsCount: uploads.length }
  );

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: "repair_attachments_uploaded",
    title: `Repair files updated: ${repairRequest.requestNumber}`,
    message: `${uploads.length} new ${category.replaceAll("_", " ")} file(s) were uploaded.`,
    includeCustomer: req.user.role !== "customer",
    includeSeller: req.user.role !== "seller",
    includeAdmin: true
  });

  res.json({
    message: "Repair attachments uploaded successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const finalizeRepairRequest = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);
  assertSellerOrAdmin(req.user);

  const partsUsed = Array.isArray(req.body.partsUsed) ? req.body.partsUsed : [];
  repairRequest.partsUsed = partsUsed.map((part) => ({
    name: trimText(part.name),
    quantity: Number(part.quantity || 1),
    cost: roundMoney(part.cost),
    note: trimText(part.note),
    linkedProduct: trimText(part.linkedProductId) || null
  }));
  repairRequest.technicianNotes = trimText(req.body.technicianNotes) || repairRequest.technicianNotes || "";
  repairRequest.finalSummary = trimText(req.body.finalSummary) || repairRequest.finalSummary || "";
  repairRequest.quote.paymentStatus = trimText(req.body.paymentStatus) || repairRequest.quote?.paymentStatus || "unpaid";
  repairRequest.quote.paymentMethod = trimText(req.body.paymentMethod) || repairRequest.quote?.paymentMethod || "";
  repairRequest.quote.paymentReference = trimText(req.body.paymentReference) || repairRequest.quote?.paymentReference || "";
  repairRequest.quote.paidAt = repairRequest.quote.paymentStatus === "paid" ? new Date() : repairRequest.quote?.paidAt || null;

  const warrantyDurationDays = Number(req.body.warrantyDurationDays || 0);
  const warrantyExpiresAt = warrantyDurationDays > 0
    ? new Date(Date.now() + warrantyDurationDays * 24 * 60 * 60 * 1000)
    : repairRequest.warranty?.expiresAt || null;

  repairRequest.warranty = {
    durationDays: warrantyDurationDays,
    expiresAt: warrantyExpiresAt,
    note: trimText(req.body.warrantyNote)
  };
  repairRequest.dueAt = toDateOrNull(req.body.dueAt) || repairRequest.dueAt || null;
  repairRequest.status = trimText(req.body.status).toLowerCase() || repairRequest.status;

  if (!REPAIR_STATUSES.has(repairRequest.status)) {
    repairRequest.status = "ready_for_pickup";
  }

  if (repairRequest.status === "ready_for_pickup" && !repairRequest.claimOtp) {
    repairRequest.claimOtp = crypto.randomInt(100000, 999999).toString();
    repairRequest.claimOtpExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (repairRequest.status === "completed") {
    repairRequest.completedAt = new Date();
  }

  appendTimeline(repairRequest, req.user, repairRequest.status, "Repair work updated", "Repair summary, warranty, and invoice details were updated.");
  appendAudit(repairRequest, req.user, "repair_finalized", "Repair work updated", "Seller or admin updated the repair summary, payment, and warranty details.", {
    partsUsedCount: repairRequest.partsUsed.length,
    status: repairRequest.status,
    paymentStatus: repairRequest.quote.paymentStatus
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: repairRequest.status === "ready_for_pickup" ? "repair_ready_for_pickup" : "repair_completed",
    title: `Repair updated: ${repairRequest.requestNumber}`,
    message: repairRequest.status === "ready_for_pickup"
      ? "Your item is ready for pickup."
      : "Your repair request was updated with final findings and invoice details.",
    includeCustomer: true,
    includeSeller: req.user.role !== "seller",
    includeAdmin: req.user.role !== "admin"
  });

  res.json({
    message: "Repair details updated successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const submitRepairRating = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  if (req.user.role !== "customer") {
    throw new ApiError(403, "Only the customer can rate a repair request");
  }

  if (repairRequest.status !== "completed") {
    throw new ApiError(400, "You can only rate a completed repair request");
  }

  const rating = Number(req.body.rating || 0);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  repairRequest.rating = {
    rating,
    comment: trimText(req.body.comment),
    createdAt: new Date()
  };

  appendTimeline(repairRequest, req.user, repairRequest.status, "Customer left a repair rating", "Customer submitted a repair service rating.");
  appendAudit(repairRequest, req.user, "repair_rating_submitted", "Repair rating submitted", "Customer rated the completed repair service.", {
    rating,
    comment: trimText(req.body.comment)
  });

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  res.json({
    message: "Repair rating submitted successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const updateRepairDispute = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  const action = trimText(req.body.action).toLowerCase() || "open";

  if (action === "resolve") {
    assertAdmin(req.user);
    repairRequest.dispute = {
      ...repairRequest.dispute?.toObject?.(),
      status: "resolved",
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      resolutionNote: trimText(req.body.resolutionNote)
    };
    appendTimeline(repairRequest, req.user, repairRequest.status, "Repair dispute resolved", "Admin resolved the repair dispute.");
    appendAudit(repairRequest, req.user, "repair_dispute_resolved", "Repair dispute resolved", "Admin resolved the repair dispute.", {
      resolutionNote: trimText(req.body.resolutionNote)
    });
  } else {
    repairRequest.dispute = {
      status: "open",
      reason: trimText(req.body.reason) || "Needs admin review",
      message: trimText(req.body.message),
      openedBy: req.user._id,
      openedByRole: req.user.role,
      openedAt: new Date(),
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: ""
    };
    appendTimeline(repairRequest, req.user, repairRequest.status, "Repair dispute opened", "A dispute was opened for admin review.");
    appendAudit(repairRequest, req.user, "repair_dispute_opened", "Repair dispute opened", "Customer or seller opened a repair dispute.", {
      reason: repairRequest.dispute.reason,
      message: repairRequest.dispute.message
    });
  }

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  await notifyRepairParticipants({
    repairRequest,
    actor: req.user,
    type: action === "resolve" ? "repair_dispute_resolved" : "repair_dispute_opened",
    title: action === "resolve" ? `Repair dispute resolved: ${repairRequest.requestNumber}` : `Repair dispute opened: ${repairRequest.requestNumber}`,
    message: action === "resolve" ? "The repair dispute has been resolved." : "A repair dispute now needs admin review.",
    includeCustomer: true,
    includeSeller: Boolean(repairRequest.seller),
    includeAdmin: true
  });

  res.json({
    message: action === "resolve" ? "Repair dispute resolved." : "Repair dispute opened.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});

export const claimRepairRequest = asyncHandler(async (req, res) => {
  const repairRequest = await loadRepairRequest(req.params.id);

  if (!repairRequest) {
    throw new ApiError(404, "Repair request not found");
  }

  assertRepairAccess(req.user, repairRequest);

  const otp = trimText(req.body.otp);
  if (!otp) {
    throw new ApiError(400, "Claim code is required");
  }

  if (!repairRequest.claimOtp || otp !== repairRequest.claimOtp) {
    throw new ApiError(400, "Invalid claim code");
  }

  if (repairRequest.claimOtpExpiresAt && new Date(repairRequest.claimOtpExpiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "Claim code has expired");
  }

  repairRequest.pickedUpAt = new Date();
  repairRequest.status = "completed";
  repairRequest.completedAt = repairRequest.completedAt || new Date();

  appendTimeline(repairRequest, req.user, "completed", "Repair item claimed", "The customer successfully claimed the repaired item.");
  appendAudit(repairRequest, req.user, "repair_item_claimed", "Repair item claimed", "Claim code was verified and the repaired item was claimed.", {});

  await repairRequest.save();
  await repairRequest.populate(REPAIR_POPULATE);

  res.json({
    message: "Repair item claim verified successfully.",
    repairRequest: serializeRepairRequest(repairRequest, req.user)
  });
});
