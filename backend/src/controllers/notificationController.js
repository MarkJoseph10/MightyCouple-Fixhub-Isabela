import { Notification } from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notificationAccessFilter } from "../services/notificationService.js";

function serializeNotification(notification) {
  return {
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
  };
}

function canAccessNotification(notification, user) {
  if (!notification || !user) {
    return false;
  }

  const sameUser = notification.recipientUser && String(notification.recipientUser) === String(user._id);
  const sameRole = notification.recipientRole && String(notification.recipientRole) === String(user.role);

  return sameUser || sameRole;
}

export const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 15)));
  const filter = notificationAccessFilter(req.user);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ ...filter, readAt: null })
  ]);

  res.json({
    notifications: notifications.map(serializeNotification),
    unreadCount
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (!canAccessNotification(notification, req.user)) {
    throw new ApiError(403, "You cannot access this notification");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  res.json({
    message: "Notification marked as read",
    notification: serializeNotification(notification)
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const filter = notificationAccessFilter(req.user);
  const result = await Notification.updateMany({ ...filter, readAt: null }, { $set: { readAt: new Date() } });

  res.json({
    message: "All notifications marked as read",
    modifiedCount: result.modifiedCount ?? result.nModified ?? 0
  });
});
