import { Conversation } from "../models/Conversation.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { RepairRequest } from "../models/RepairRequest.js";
import { User } from "../models/User.js";
import { isCloudinaryConfigured } from "../config/cloudinary.js";
import { uploadBufferToCloudinary } from "./uploadController.js";
import { createNotifications } from "../services/notificationService.js";
import { sendEmailAlert } from "../services/emailAlertService.js";
import { publishRealtimeToMany } from "../services/realtimeService.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const TYPING_WINDOW_MS = 8 * 1000;
const CHAT_USER_SELECT = [
  "name",
  "email",
  "avatar",
  "role",
  "lastLoginAt",
  "presence.lastActiveAt",
  "chatPreferences.emailAlertsEnabled",
  "sellerProfile.storeName",
  "sellerProfile.displayName",
  "sellerProfile.avatar"
].join(" ");

const conversationPopulate = [
  { path: "product", select: "name slug images price vendorType owner category" },
  {
    path: "order",
    select: "orderNumber status orderType pricing.total createdAt items shippingAddress.fullName user",
    populate: { path: "user", select: "name email" }
  },
  {
    path: "repairRequest",
    select: "requestNumber status branchLabel pickupMethod scheduledAt preferredScheduleAt issueDescription device quote reportedIssueAttachments seller customer",
    populate: [
      { path: "customer", select: "name email" },
      { path: "seller", select: CHAT_USER_SELECT }
    ]
  },
  { path: "customer", select: CHAT_USER_SELECT },
  { path: "seller", select: CHAT_USER_SELECT },
  { path: "messages.sender", select: CHAT_USER_SELECT },
  { path: "escalation.createdBy", select: CHAT_USER_SELECT },
  { path: "escalation.resolvedBy", select: CHAT_USER_SELECT },
  { path: "moderation.reports.reporter", select: CHAT_USER_SELECT },
  { path: "moderation.reports.resolvedBy", select: CHAT_USER_SELECT }
];

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatRelativeTime(value) {
  if (!value) {
    return "just now";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "just now";
  }

  const diffMs = Math.max(0, Date.now() - timestamp.getTime());
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function isUserOnline(user) {
  const lastActiveAt = user?.presence?.lastActiveAt || user?.lastLoginAt;

  if (!lastActiveAt) {
    return false;
  }

  const timestamp = new Date(lastActiveAt);

  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  return Date.now() - timestamp.getTime() <= ONLINE_WINDOW_MS;
}

function getPresenceSnapshot(user) {
  const lastActiveAt = user?.presence?.lastActiveAt || user?.lastLoginAt || null;
  const online = isUserOnline(user);

  return {
    isOnline: online,
    lastActiveAt,
    label: online ? "Online" : lastActiveAt ? `Active ${formatRelativeTime(lastActiveAt)}` : "Offline"
  };
}

function serializeProduct(product) {
  if (!product) {
    return null;
  }

  return {
    _id: product._id || null,
    name: product.name || "",
    slug: product.slug || "",
    image: product.images?.[0]?.url || product.image || "",
    price: Number(product.price || 0),
    category: product.category || "",
    vendorType: product.vendorType || "admin"
  };
}

function serializeOrder(order) {
  if (!order) {
    return null;
  }

  const firstItem = Array.isArray(order.items) ? order.items[0] : null;

  return {
    _id: order._id || null,
    orderNumber: order.orderNumber || "",
    status: order.status || "pending",
    orderType: order.orderType || "regular",
    total: Number(order.pricing?.total || 0),
    createdAt: order.createdAt || null,
    customerName: order.user?.name || order.shippingAddress?.fullName || "",
    itemCount: Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
    itemName: firstItem?.name || "Order item",
    image: firstItem?.image || "",
    slug: "",
    category: "Order"
  };
}

function serializeRepairRequest(repairRequest) {
  if (!repairRequest) {
    return null;
  }

  const title = [repairRequest.device?.brand, repairRequest.device?.model]
    .filter(Boolean)
    .join(" ")
    .trim()
    || repairRequest.device?.type
    || repairRequest.requestNumber
    || "Repair request";
  const quoteTotal = Number(repairRequest.quote?.approvedAmount || repairRequest.quote?.laborFee || 0)
    + Number(repairRequest.quote?.partsFee || 0)
    + Number(repairRequest.quote?.otherFee || 0);

  return {
    _id: repairRequest._id || null,
    requestNumber: repairRequest.requestNumber || "",
    status: repairRequest.status || "pending",
    branchLabel: repairRequest.branchLabel || "",
    pickupMethod: repairRequest.pickupMethod || "drop_off",
    scheduledAt: repairRequest.scheduledAt || null,
    preferredScheduleAt: repairRequest.preferredScheduleAt || null,
    issueDescription: repairRequest.issueDescription || "",
    device: {
      type: repairRequest.device?.type || "",
      brand: repairRequest.device?.brand || "",
      model: repairRequest.device?.model || ""
    },
    title,
    sellerName: repairRequest.seller?.sellerProfile?.storeName || repairRequest.seller?.name || "",
    customerName: repairRequest.customer?.name || repairRequest.customer?.email || "",
    total: Number(quoteTotal || 0),
    image: repairRequest.reportedIssueAttachments?.[0]?.url || "",
    category: "Repair"
  };
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
    presence: getPresenceSnapshot(user)
  };
}

function getRoleUnreadCount(conversation, user) {
  if (!conversation || !user) {
    return 0;
  }

  if (user.role === "admin") {
    return Number(conversation.unread?.admin || 0);
  }

  if (user.role === "seller") {
    return Number(conversation.unread?.seller || 0);
  }

  return Number(conversation.unread?.customer || 0);
}

function getParticipantLabel(user) {
  if (!user) {
    return "Support";
  }

  return user.sellerProfile?.storeName || user.sellerProfile?.displayName || user.name || user.email || "Support";
}

function getAttachmentSummary(attachments = []) {
  const items = attachments.filter(Boolean);

  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0].type === "video" ? "Sent a video" : "Sent an image";
  }

  return `Sent ${items.length} attachments`;
}

function buildLastMessagePreview(text, attachments = []) {
  const trimmed = String(text || "").trim();

  if (trimmed) {
    return trimmed.slice(0, 180);
  }

  return getAttachmentSummary(attachments);
}

function getWaitingOnRole(conversation) {
  if (conversation.status === "blocked") {
    return "blocked";
  }

  if (conversation.status === "resolved") {
    return "resolved";
  }

  if (conversation.status === "waiting_customer") {
    return "customer";
  }

  if (conversation.status === "waiting_seller") {
    return "seller";
  }

  if (conversation.status === "waiting_admin") {
    return "admin";
  }

  if (conversation.escalation?.active) {
    return "admin";
  }

  if (conversation.lastMessageSenderRole === "customer") {
    return conversation.seller ? "seller" : "admin";
  }

  if (["seller", "admin"].includes(conversation.lastMessageSenderRole)) {
    return "customer";
  }

  return "";
}

function hasActiveTyping(slot) {
  if (!slot?.isTyping || !slot?.updatedAt) {
    return false;
  }

  const timestamp = new Date(slot.updatedAt);

  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  return Date.now() - timestamp.getTime() <= TYPING_WINDOW_MS;
}

function serializeTypingState(conversation, user) {
  return Object.entries(conversation.typing || {})
    .filter(([role, slot]) => role !== user.role && hasActiveTyping(slot))
    .map(([role, slot]) => ({
      role,
      userId: slot.user || null,
      updatedAt: slot.updatedAt,
      label: role === "seller" ? "Seller is typing..." : role === "admin" ? "Admin is typing..." : "Customer is typing..."
    }));
}

function hasOtherPartySeenMessage(message, conversation) {
  if (!message?.createdAt) {
    return false;
  }

  const createdAt = new Date(message.createdAt).getTime();

  if (Number.isNaN(createdAt)) {
    return false;
  }

  const readAt = conversation.lastReadAt || {};

  if (message.senderRole === "customer") {
    return [readAt.seller, readAt.admin].some((value) => value && new Date(value).getTime() >= createdAt);
  }

  return Boolean(readAt.customer && new Date(readAt.customer).getTime() >= createdAt);
}

function serializeMessage(message, conversation, user) {
  const sender = serializeParticipant(message.sender);
  const mine = message.senderRole === user.role;

  return {
    _id: message._id,
    text: message.text,
    attachments: (message.attachments || []).map((attachment) => ({
      type: attachment.type,
      url: attachment.url,
      originalName: attachment.originalName || "",
      mimeType: attachment.mimeType || "",
      sizeBytes: Number(attachment.sizeBytes || 0),
      publicId: attachment.publicId || "",
      width: attachment.width ?? null,
      height: attachment.height ?? null,
      durationSeconds: Number(attachment.durationSeconds || 0)
    })),
    senderRole: message.senderRole,
    createdAt: message.createdAt,
    sender,
    deliveryStatus: mine ? (hasOtherPartySeenMessage(message, conversation) ? "seen" : "delivered") : null
  };
}

function serializeReport(report) {
  return {
    _id: report._id,
    reporter: serializeParticipant(report.reporter),
    reporterRole: report.reporterRole,
    reason: report.reason || "",
    message: report.message || "",
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt || null,
    resolvedBy: serializeParticipant(report.resolvedBy),
    resolutionNote: report.resolutionNote || ""
  };
}

function serializeConversation(conversation, user, { includeMessages = false } = {}) {
  const waitingOnRole = getWaitingOnRole(conversation);
  const unresolvedReports = (conversation.moderation?.reports || []).filter((report) => !report.resolvedAt);

  return {
    _id: conversation._id,
    contextType: conversation.contextType || "product",
    subject: conversation.subject || "",
    status: conversation.status || "open",
    product: serializeProduct(conversation.product),
    order: serializeOrder(conversation.order),
    repairRequest: serializeRepairRequest(conversation.repairRequest),
    customer: serializeParticipant(conversation.customer),
    seller: serializeParticipant(conversation.seller),
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview || "",
    lastMessageSenderRole: conversation.lastMessageSenderRole || "",
    unreadCount: getRoleUnreadCount(conversation, user),
    messagesCount: Array.isArray(conversation.messages) ? conversation.messages.length : 0,
    hasAttachments: Boolean(conversation.hasAttachments),
    waitingOnRole,
    needsReply: waitingOnRole === user.role,
    isEscalated: Boolean(conversation.escalation?.active),
    isBlocked: Boolean(conversation.moderation?.blockedAt),
    escalation: {
      active: Boolean(conversation.escalation?.active),
      reason: conversation.escalation?.reason || "",
      createdAt: conversation.escalation?.createdAt || null,
      createdBy: serializeParticipant(conversation.escalation?.createdBy),
      resolvedAt: conversation.escalation?.resolvedAt || null,
      resolvedBy: serializeParticipant(conversation.escalation?.resolvedBy)
    },
    moderation: {
      blockedAt: conversation.moderation?.blockedAt || null,
      blockedBy: serializeParticipant(conversation.moderation?.blockedBy),
      blockReason: conversation.moderation?.blockReason || "",
      unresolvedReportsCount: unresolvedReports.length,
      reports: (conversation.moderation?.reports || []).map(serializeReport)
    },
    typingParticipants: serializeTypingState(conversation, user),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: includeMessages ? (conversation.messages || []).map((message) => serializeMessage(message, conversation, user)) : undefined
  };
}

function buildRealtimeRecipients(conversation) {
  const recipients = [];

  if (conversation.customer) {
    recipients.push({
      userId: conversation.customer._id || conversation.customer,
      role: "customer"
    });
  }

  if (conversation.seller) {
    recipients.push({
      userId: conversation.seller._id || conversation.seller,
      role: "seller"
    });
  }

  recipients.push({ role: "admin" });

  return recipients;
}

function getRealtimeUserContext(conversation, recipient) {
  if (recipient.role === "customer") {
    return conversation.customer || { _id: recipient.userId, role: "customer" };
  }

  if (recipient.role === "seller") {
    return conversation.seller || { _id: recipient.userId, role: "seller" };
  }

  return {
    _id: null,
    role: "admin"
  };
}

function emitConversationRealtimeUpdate(conversation) {
  publishRealtimeToMany({
    recipients: buildRealtimeRecipients(conversation),
    event: "conversation.updated",
    dataFactory: (recipient) => ({
      conversation: serializeConversation(conversation, getRealtimeUserContext(conversation, recipient), {
        includeMessages: true
      })
    })
  });
}

function canAccessOrder(user, order) {
  if (!user || !order) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "seller") {
    return (order.items || []).some((item) => String(item.sellerId || "") === String(user._id));
  }

  return Boolean(order.user) && String(order.user._id || order.user) === String(user._id);
}

function canAccessConversation(conversation, user) {
  if (!conversation || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "seller") {
    return Boolean(conversation.seller) && String(conversation.seller._id || conversation.seller) === String(user._id);
  }

  return Boolean(conversation.customer) && String(conversation.customer._id || conversation.customer) === String(user._id);
}

function canAccessRepairRequest(user, repairRequest) {
  if (!user || !repairRequest) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "seller") {
    return Boolean(repairRequest.seller) && String(repairRequest.seller._id || repairRequest.seller) === String(user._id);
  }

  return Boolean(repairRequest.customer) && String(repairRequest.customer._id || repairRequest.customer) === String(user._id);
}

function buildAccessFilter(user, query = {}) {
  const filter = {
    "messages.0": { $exists: true }
  };

  if (user.role === "seller") {
    filter.seller = user._id;
  } else if (user.role !== "admin") {
    filter.customer = user._id;
  }

  const contextType = String(query.contextType || "").trim().toLowerCase();
  if (["product", "order", "repair"].includes(contextType)) {
    filter.contextType = contextType;
  }

  const status = String(query.status || "").trim().toLowerCase();
  if (["open", "waiting_customer", "waiting_seller", "waiting_admin", "resolved", "blocked"].includes(status)) {
    filter.status = status;
  }

  if (String(query.productId || "").trim()) {
    filter.product = String(query.productId).trim();
  }

  if (String(query.orderId || "").trim()) {
    filter.order = String(query.orderId).trim();
  }

  if (String(query.repairId || "").trim()) {
    filter.repairRequest = String(query.repairId).trim();
  }

  if (String(query.unreadOnly || "false").toLowerCase() === "true") {
    const unreadKey = user.role === "admin" ? "unread.admin" : user.role === "seller" ? "unread.seller" : "unread.customer";
    filter[unreadKey] = { $gt: 0 };
  }

  if (String(query.withAttachments || "false").toLowerCase() === "true") {
    filter.hasAttachments = true;
  }

  if (String(query.escalatedOnly || "false").toLowerCase() === "true") {
    filter["escalation.active"] = true;
  }

  if (String(query.reportedOnly || "false").toLowerCase() === "true") {
    filter["moderation.reports"] = { $elemMatch: { resolvedAt: null } };
  }

  if (String(query.needsReply || "false").toLowerCase() === "true") {
    filter.status = user.role === "admin" ? "waiting_admin" : user.role === "seller" ? "waiting_seller" : "waiting_customer";
  }

  const search = String(query.q || "").trim();

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ subject: pattern }, { lastMessagePreview: pattern }];
  }

  return filter;
}

function buildConversationLink(role, conversationId) {
  if (role === "admin") {
    return `/admin/messages?conversation=${conversationId}`;
  }

  if (role === "seller") {
    return `/seller/messages?conversation=${conversationId}`;
  }

  return `/messages?conversation=${conversationId}`;
}

async function uploadConversationAttachments(files = []) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const type = file.mimetype.startsWith("video/") ? "video" : "image";
      const result = await uploadBufferToCloudinary(file, type, {
        folder: type === "video" ? "shopverse/chat/videos" : "shopverse/chat/images"
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

  return uploads.filter((attachment) => attachment.url);
}

function applyUnreadUpdate(conversation, senderRole, timestamp) {
  const at = timestamp || new Date();
  const nextUnread = {
    customer: Number(conversation.unread?.customer || 0),
    seller: Number(conversation.unread?.seller || 0),
    admin: Number(conversation.unread?.admin || 0)
  };
  const nextReadAt = {
    customer: conversation.lastReadAt?.customer || null,
    seller: conversation.lastReadAt?.seller || null,
    admin: conversation.lastReadAt?.admin || null
  };

  if (senderRole === "customer") {
    nextUnread.customer = 0;
    nextUnread.admin += 1;
    nextReadAt.customer = at;

    if (conversation.seller) {
      nextUnread.seller += 1;
    }
  } else if (senderRole === "seller") {
    nextUnread.seller = 0;
    nextUnread.admin += 1;
    nextUnread.customer += 1;
    nextReadAt.seller = at;
  } else {
    nextUnread.admin = 0;
    nextUnread.customer += 1;
    nextReadAt.admin = at;

    if (conversation.seller) {
      nextUnread.seller += 1;
    }
  }

  conversation.unread = nextUnread;
  conversation.lastReadAt = nextReadAt;
}

function updateConversationStatusAfterMessage(conversation, senderRole) {
  if (conversation.moderation?.blockedAt) {
    conversation.status = "blocked";
    return;
  }

  if (conversation.escalation?.active && senderRole !== "admin") {
    conversation.status = "waiting_admin";
    return;
  }

  if (senderRole === "customer") {
    conversation.status = conversation.seller ? "waiting_seller" : "waiting_admin";
    return;
  }

  conversation.status = "waiting_customer";
}

function setTypingState(conversation, user, isTyping) {
  const slotKey = user.role === "admin" ? "admin" : user.role === "seller" ? "seller" : "customer";
  conversation.typing = conversation.typing || {};
  conversation.typing[slotKey] = {
    isTyping: Boolean(isTyping),
    user: Boolean(isTyping) ? user._id : null,
    role: Boolean(isTyping) ? user.role : null,
    updatedAt: new Date()
  };
}

async function touchPresence(userId) {
  if (!userId) {
    return;
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "presence.lastActiveAt": new Date()
      }
    }
  );
}

async function emitPresenceRealtimeUpdate(user) {
  if (!user?._id) {
    return;
  }

  const linkedConversations = await Conversation.find({
    $or: [{ customer: user._id }, { seller: user._id }]
  })
    .select("customer seller")
    .limit(80)
    .lean();

  const recipients = [{ role: "admin" }];

  linkedConversations.forEach((conversation) => {
    if (conversation.customer && String(conversation.customer) !== String(user._id)) {
      recipients.push({
        userId: conversation.customer,
        role: "customer"
      });
    }

    if (conversation.seller && String(conversation.seller) !== String(user._id)) {
      recipients.push({
        userId: conversation.seller,
        role: "seller"
      });
    }
  });

  publishRealtimeToMany({
    recipients,
    event: "presence.updated",
    dataFactory: {
      userId: String(user._id),
      role: user.role,
      presence: getPresenceSnapshot(user)
    }
  });
}

function resolveOrderConversationSeller(order) {
  const sellerIds = [...new Set(
    (order.items || [])
      .filter((item) => item.vendorType === "seller" && item.sellerId)
      .map((item) => String(item.sellerId))
  )];

  if (sellerIds.length === 1) {
    return sellerIds[0];
  }

  return null;
}

function buildConversationContextSummary({ product, order, repairRequest }) {
  if (order) {
    return `Order ${order.orderNumber || order._id}`;
  }

  if (repairRequest) {
    return `Repair ${repairRequest.requestNumber || repairRequest._id}`;
  }

  return product?.name || "Product inquiry";
}

async function sendConversationEmailAlerts({ conversation, sender }) {
  const senderName = getParticipantLabel(sender);
  const contextSummary = buildConversationContextSummary({
    product: conversation.product,
    order: conversation.order,
    repairRequest: conversation.repairRequest
  });
  const emailTasks = [];

  if (
    sender.role !== "customer" &&
    conversation.customer?.email &&
    conversation.customer?.chatPreferences?.emailAlertsEnabled !== false &&
    !isUserOnline(conversation.customer)
  ) {
    emailTasks.push(
      sendEmailAlert({
        to: conversation.customer.email,
        subject: `New reply about ${contextSummary}`,
        text: `${senderName} sent a new chat message about ${contextSummary}. Open ${buildConversationLink("customer", conversation._id)}`
      }).catch(() => {})
    );
  }

  if (
    sender.role !== "seller" &&
    conversation.seller?.email &&
    conversation.seller?.chatPreferences?.emailAlertsEnabled !== false &&
    !isUserOnline(conversation.seller)
  ) {
    emailTasks.push(
      sendEmailAlert({
        to: conversation.seller.email,
        subject: `Customer chat update for ${contextSummary}`,
        text: `${senderName} sent a new chat message about ${contextSummary}. Open ${buildConversationLink("seller", conversation._id)}`
      }).catch(() => {})
    );
  }

  await Promise.all(emailTasks);
}

async function sendConversationNotifications({ conversation, sender }) {
  const senderRole = sender.role;
  const senderName = getParticipantLabel(sender);
  const contextSummary = buildConversationContextSummary({
    product: conversation.product,
    order: conversation.order,
    repairRequest: conversation.repairRequest
  });
  const baseData = {
    conversationId: conversation._id,
    productId: conversation.product?._id || null,
    orderId: conversation.order?._id || null,
    repairId: conversation.repairRequest?._id || null,
    contextType: conversation.contextType || "product"
  };
  const recipients = [];

  if (senderRole !== "customer" && conversation.customer) {
    recipients.push({
      userId: conversation.customer._id || conversation.customer,
      title: `New reply about ${contextSummary}`,
      message: `${senderName} sent a new message in your chat.`,
      link: buildConversationLink("customer", conversation._id),
      data: baseData
    });
  }

  if (senderRole !== "seller" && conversation.seller) {
    recipients.push({
      userId: conversation.seller._id || conversation.seller,
      title: `${conversation.contextType === "order" ? "Order" : conversation.contextType === "repair" ? "Repair" : "Product"} chat updated`,
      message: `${senderName} sent a new message about ${contextSummary}.`,
      link: buildConversationLink("seller", conversation._id),
      data: baseData
    });
  }

  if (senderRole !== "admin") {
    recipients.push({
      role: "admin",
      title: `Inbox update for ${contextSummary}`,
      message: `${senderName} sent a new marketplace chat message.`,
      link: buildConversationLink("admin", conversation._id),
      data: baseData
    });
  }

  await createNotifications({
    recipients,
    type: conversation.contextType === "order" ? "chat_order_message" : "chat_message",
    title: `New chat message about ${contextSummary}`,
    message: `${senderName} sent a new message.`,
    link: buildConversationLink("customer", conversation._id),
    data: baseData,
    createdBy: sender._id
  });

  await sendConversationEmailAlerts({ conversation, sender });
}

async function appendMessage(conversation, sender, text, attachments = []) {
  const createdAt = new Date();

  conversation.messages.push({
    sender: sender._id,
    senderRole: sender.role,
    text,
    attachments,
    createdAt
  });
  conversation.lastMessageAt = createdAt;
  conversation.lastMessagePreview = buildLastMessagePreview(text, attachments);
  conversation.lastMessageSenderRole = sender.role;
  conversation.hasAttachments = conversation.hasAttachments || attachments.length > 0;
  applyUnreadUpdate(conversation, sender.role, createdAt);
  updateConversationStatusAfterMessage(conversation, sender.role);
  setTypingState(conversation, sender, false);
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);
  await sendConversationNotifications({ conversation, sender });
  return conversation;
}

async function loadConversationById(id) {
  if (!id) {
    return null;
  }

  return Conversation.findById(id).populate(conversationPopulate);
}

function validateSendAccess(conversation, user) {
  if (conversation.moderation?.blockedAt && user.role !== "admin") {
    throw new ApiError(403, "This conversation is blocked and can only be reopened by admin");
  }
}

function buildOpenConversationFilter({ productId, orderId, repairRequestId, user }) {
  const filter = {};

  if (repairRequestId) {
    filter.repairRequest = repairRequestId;
  } else if (orderId) {
    filter.order = orderId;
  } else {
    filter.product = productId;
  }

  if (user.role === "customer") {
    filter.customer = user._id;
  }

  return filter;
}

export const getMyConversations = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const filter = buildAccessFilter(req.user, req.query);

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(conversationPopulate),
    Conversation.countDocuments(filter)
  ]);

  res.json({
    conversations: conversations.map((conversation) => serializeConversation(conversation, req.user)),
    total,
    page,
    limit,
    hasMore: page * limit < total
  });
});

export const createOrOpenConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const productId = String(req.body.productId || "").trim();
  const orderId = String(req.body.orderId || "").trim();
  const repairRequestId = String(req.body.repairRequestId || "").trim();
  const createIfMissing = String(req.body.createIfMissing ?? "true").toLowerCase() !== "false";

  if (!productId && !orderId && !repairRequestId) {
    throw new ApiError(400, "A product, order, or repair request is required");
  }

  let product = null;
  let order = null;
  let repairRequest = null;

  if (orderId) {
    order = await Order.findById(orderId).populate("user", CHAT_USER_SELECT);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (!canAccessOrder(req.user, order)) {
      throw new ApiError(403, "You cannot access chat for this order");
    }
  }

  if (productId) {
    product = await Product.findById(productId).populate("owner", CHAT_USER_SELECT);

    if (!product || product.status !== "active" || product.approvalStatus !== "approved") {
      throw new ApiError(404, "Product not found");
    }
  }

  if (repairRequestId) {
    repairRequest = await RepairRequest.findById(repairRequestId)
      .populate("customer", CHAT_USER_SELECT)
      .populate("seller", CHAT_USER_SELECT);

    if (!repairRequest) {
      throw new ApiError(404, "Repair request not found");
    }

    if (!canAccessRepairRequest(req.user, repairRequest)) {
      throw new ApiError(403, "You cannot access chat for this repair request");
    }
  }

  const filter = buildOpenConversationFilter({
    productId: product?._id || productId || order?.items?.[0]?.product || "",
    orderId: order?._id || orderId || "",
    repairRequestId: repairRequest?._id || repairRequestId || "",
    user: req.user
  });

  let conversation = await Conversation.findOne(filter).sort({ lastMessageAt: -1 }).populate(conversationPopulate);

  if (!conversation && createIfMissing) {
    if (req.user.role !== "customer") {
      throw new ApiError(403, "Only customers can start a new chat thread");
    }

    const resolvedProductId = product?._id || order?.items?.find((item) => item.product)?.product || null;
    const sellerId = repairRequest
      ? (repairRequest.seller?._id || repairRequest.seller || null)
      : order
        ? resolveOrderConversationSeller(order)
        : (product?.vendorType === "seller" ? product.owner?._id || product.owner : null);

    conversation = await Conversation.create({
      contextType: repairRequest ? "repair" : order ? "order" : "product",
      product: resolvedProductId,
      order: order?._id || null,
      repairRequest: repairRequest?._id || null,
      customer: req.user._id,
      seller: sellerId || null,
      subject: repairRequest
        ? `Repair ${repairRequest.requestNumber || repairRequest._id.toString()}`
        : order
          ? `Order ${order.orderNumber || order._id.toString()}`
          : (product?.name || "Product inquiry"),
      status: "open",
      lastMessageAt: new Date()
    });

    conversation = await loadConversationById(conversation._id);
  }

  res.json({
    message: conversation ? "Conversation ready" : "No conversation started yet",
    conversation: conversation ? serializeConversation(conversation, req.user, { includeMessages: true }) : null
  });
});

export const getConversationById = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot access this conversation");
  }

  res.json({
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const sendConversationMessage = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const text = String(req.body.message || "").trim();
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];

  if (!text && !uploadedFiles.length) {
    throw new ApiError(400, "Message or attachment is required");
  }

  if (uploadedFiles.length > 4) {
    throw new ApiError(400, "You can send up to 4 attachments at a time");
  }

  if (uploadedFiles.length && !isCloudinaryConfigured) {
    throw new ApiError(500, "Cloudinary is not configured on the server");
  }

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot reply to this conversation");
  }

  validateSendAccess(conversation, req.user);

  const attachments = uploadedFiles.length ? await uploadConversationAttachments(uploadedFiles) : [];
  const updatedConversation = await appendMessage(conversation, req.user, text, attachments);

  res.status(201).json({
    message: "Message sent",
    conversation: serializeConversation(updatedConversation, req.user, { includeMessages: true })
  });
});

export const markConversationRead = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot access this conversation");
  }

  const at = new Date();

  if (req.user.role === "admin") {
    conversation.unread.admin = 0;
    conversation.lastReadAt.admin = at;
  } else if (req.user.role === "seller") {
    conversation.unread.seller = 0;
    conversation.lastReadAt.seller = at;
  } else {
    conversation.unread.customer = 0;
    conversation.lastReadAt.customer = at;
  }

  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  res.json({
    message: "Conversation marked as read",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const updateConversationTyping = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot update typing for this conversation");
  }

  validateSendAccess(conversation, req.user);
  setTypingState(conversation, req.user, String(req.body.isTyping ?? "false").toLowerCase() === "true" || req.body.isTyping === true);
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  res.json({
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const heartbeatConversationPresence = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id);
  const realtimeUser = {
    ...req.user.toObject?.(),
    role: req.user.role,
    _id: req.user._id,
    presence: {
      ...(req.user.presence || {}),
      lastActiveAt: new Date()
    }
  };
  await emitPresenceRealtimeUpdate(realtimeUser).catch(() => {});

  res.json({
    message: "Presence updated",
    presence: getPresenceSnapshot({
      ...realtimeUser
    })
  });
});

export const escalateConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot escalate this conversation");
  }

  const reason = String(req.body.reason || "").trim();

  conversation.escalation = {
    active: true,
    reason,
    createdAt: new Date(),
    createdBy: req.user._id,
    createdByRole: req.user.role,
    resolvedAt: null,
    resolvedBy: null
  };
  conversation.status = "waiting_admin";
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  await createNotifications({
    recipients: [
      {
        role: "admin",
        title: "Chat escalated to admin",
        message: `${getParticipantLabel(req.user)} escalated a ${conversation.contextType} chat for admin review.`,
        link: buildConversationLink("admin", conversation._id),
        data: {
          conversationId: conversation._id,
          contextType: conversation.contextType,
          orderId: conversation.order?._id || null,
          productId: conversation.product?._id || null
        }
      }
    ],
    type: "chat_escalated",
    title: "Chat escalated",
    message: `${getParticipantLabel(req.user)} escalated a conversation.`,
    link: buildConversationLink("admin", conversation._id),
    createdBy: req.user._id
  });

  res.json({
    message: "Conversation escalated to admin",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const reportConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot report this conversation");
  }

  const hasExistingOpenReport = (conversation.moderation?.reports || []).some(
    (report) => String(report.reporter?._id || report.reporter) === String(req.user._id) && !report.resolvedAt
  );

  if (hasExistingOpenReport) {
    throw new ApiError(400, "You already reported this conversation. Please wait for admin review.");
  }

  const reason = String(req.body.reason || "").trim() || "Needs admin review";
  const message = String(req.body.message || "").trim();

  conversation.moderation = conversation.moderation || {};
  conversation.moderation.reports = conversation.moderation.reports || [];
  conversation.moderation.reports.push({
    reporter: req.user._id,
    reporterRole: req.user.role,
    reason,
    message,
    createdAt: new Date()
  });
  conversation.escalation = {
    active: true,
    reason: conversation.escalation?.reason || reason,
    createdAt: conversation.escalation?.createdAt || new Date(),
    createdBy: conversation.escalation?.createdBy || req.user._id,
    createdByRole: conversation.escalation?.createdByRole || req.user.role,
    resolvedAt: null,
    resolvedBy: null
  };
  conversation.status = "waiting_admin";
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  await createNotifications({
    recipients: [
      {
        role: "admin",
        title: "Chat reported",
        message: `${getParticipantLabel(req.user)} reported a ${conversation.contextType} conversation.`,
        link: buildConversationLink("admin", conversation._id),
        data: {
          conversationId: conversation._id,
          reason,
          contextType: conversation.contextType
        }
      }
    ],
    type: "chat_reported",
    title: "Chat reported",
    message: `${getParticipantLabel(req.user)} reported a conversation.`,
    link: buildConversationLink("admin", conversation._id),
    createdBy: req.user._id
  });

  res.json({
    message: "Conversation reported to admin",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const blockConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, req.user)) {
    throw new ApiError(403, "You cannot block this conversation");
  }

  const reason = String(req.body.reason || "").trim() || "Blocked for safety";

  conversation.moderation = conversation.moderation || {};
  conversation.moderation.blockedAt = new Date();
  conversation.moderation.blockedBy = req.user._id;
  conversation.moderation.blockedByRole = req.user.role;
  conversation.moderation.blockReason = reason;
  conversation.status = "blocked";
  setTypingState(conversation, req.user, false);
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  await createNotifications({
    recipients: [
      {
        role: "admin",
        title: "Chat blocked",
        message: `${getParticipantLabel(req.user)} blocked a conversation for review.`,
        link: buildConversationLink("admin", conversation._id),
        data: {
          conversationId: conversation._id,
          reason,
          contextType: conversation.contextType
        }
      }
    ],
    type: "chat_blocked",
    title: "Chat blocked",
    message: `${getParticipantLabel(req.user)} blocked a conversation.`,
    link: buildConversationLink("admin", conversation._id),
    createdBy: req.user._id
  });

  res.json({
    message: "Conversation blocked",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const unblockConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can unblock a conversation");
  }

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  conversation.moderation.blockedAt = null;
  conversation.moderation.blockedBy = null;
  conversation.moderation.blockedByRole = null;
  conversation.moderation.blockReason = "";
  conversation.status = conversation.escalation?.active ? "waiting_admin" : "open";
  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  res.json({
    message: "Conversation unblocked",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});

export const resolveConversation = asyncHandler(async (req, res) => {
  await touchPresence(req.user._id).catch(() => {});

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can resolve conversations");
  }

  const conversation = await loadConversationById(req.params.id);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const reopen = String(req.body.reopen || "false").toLowerCase() === "true" || req.body.reopen === true;
  const note = String(req.body.note || "").trim();

  if (reopen) {
    conversation.status = "open";
    conversation.escalation.active = false;
    conversation.escalation.reason = "";
    conversation.escalation.resolvedAt = null;
    conversation.escalation.resolvedBy = null;
  } else {
    conversation.status = "resolved";
    conversation.escalation.active = false;
    conversation.escalation.resolvedAt = new Date();
    conversation.escalation.resolvedBy = req.user._id;
    (conversation.moderation?.reports || []).forEach((report) => {
      if (!report.resolvedAt) {
        report.resolvedAt = new Date();
        report.resolvedBy = req.user._id;
        report.resolutionNote = note;
      }
    });
  }

  await conversation.save();
  await conversation.populate(conversationPopulate);
  emitConversationRealtimeUpdate(conversation);

  res.json({
    message: reopen ? "Conversation reopened" : "Conversation resolved",
    conversation: serializeConversation(conversation, req.user, { includeMessages: true })
  });
});
