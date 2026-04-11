import { Notification } from "../models/Notification.js";
import { sendPushNotificationsForNotifications } from "./firebasePushService.js";
import { publishRealtimeEvent } from "./realtimeService.js";

function normalizeRecipient(recipient = {}) {
  const userId = recipient.userId ? String(recipient.userId) : "";
  const role = recipient.role ? String(recipient.role).trim().toLowerCase() : "";

  if (!userId && !role) {
    return null;
  }

  return {
    recipientUser: userId || null,
    recipientRole: role || null,
    title: String(recipient.title || "").trim(),
    message: String(recipient.message || "").trim(),
    link: String(recipient.link || "").trim(),
    data: recipient.data || {}
  };
}

export function isNotificationEnabled(settings, settingKey) {
  if (!settingKey) {
    return true;
  }

  return settings?.notifications?.[settingKey] !== false;
}

export async function createNotifications({
  recipients = [],
  type,
  title,
  message,
  link = "",
  data = {},
  createdBy = null,
  settings = null,
  settingKey = ""
}) {
  if (!isNotificationEnabled(settings, settingKey)) {
    return [];
  }

  const docs = recipients
    .map(normalizeRecipient)
    .filter(Boolean)
    .filter((recipient) => recipient.recipientUser || recipient.recipientRole)
    .map((recipient) => ({
      recipientUser: recipient.recipientUser || null,
      recipientRole: recipient.recipientRole || null,
      type: String(type || "info").trim(),
      title: recipient.title || String(title || "").trim(),
      message: recipient.message || String(message || "").trim(),
      link: recipient.link || String(link || "").trim(),
      data: recipient.data || data || {},
      createdBy
    }))
    .filter((doc) => doc.title && doc.message);

  if (!docs.length) {
    return [];
  }

  const insertedDocs = await Notification.insertMany(docs);

  insertedDocs.forEach((notification) => {
    publishRealtimeEvent({
      userId: notification.recipientUser || null,
      role: notification.recipientRole || null,
      event: "notification.created",
      data: {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link || "",
          data: notification.data || {},
          recipientRole: notification.recipientRole || null,
          readAt: notification.readAt || null,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      }
    });
  });

  await sendPushNotificationsForNotifications(insertedDocs).catch(() => {});

  return insertedDocs;
}

export function notifyUser(userId, payload = {}) {
  return createNotifications({
    recipients: [{ userId, ...payload }],
    ...payload
  });
}

export function notifyRole(role, payload = {}) {
  return createNotifications({
    recipients: [{ role, ...payload }],
    ...payload
  });
}

export function notificationAccessFilter(user) {
  return {
    $or: [{ recipientUser: user._id }, { recipientRole: user.role }]
  };
}
