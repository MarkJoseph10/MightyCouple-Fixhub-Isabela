import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
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
  const page = Math.max(1, Number(req.query.page || 1));
  const status = String(req.query.status || "all").trim().toLowerCase();
  const group = String(req.query.group || "all").trim().toLowerCase();
  const type = String(req.query.type || "").trim().toLowerCase();
  const filter = notificationAccessFilter(req.user);

  if (status === "read") {
    filter.readAt = { $ne: null };
  } else if (status === "unread") {
    filter.readAt = null;
  }

  if (type) {
    filter.type = type;
  } else if (group && group !== "all") {
    const groupPatterns = {
      order: /^order_/i,
      installment: /^installment_/i,
      refund: /^refund_/i,
      seller: /^seller_/i,
      payout: /^seller_payout_/i,
      system: /^system_/i,
      account: /^(auth_|account_|profile_)/i
    };

    if (groupPatterns[group]) {
      filter.type = groupPatterns[group];
    }
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments({ ...filter, readAt: null })
  ]);
  const total = await Notification.countDocuments(filter);

  res.json({
    notifications: notifications.map(serializeNotification),
    unreadCount,
    page,
    limit,
    total,
    hasMore: page * limit < total
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

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const platform = String(req.body?.platform || "android").trim().toLowerCase();
  const deviceId = String(req.body?.deviceId || "").trim();

  if (!token) {
    throw new ApiError(400, "Push token is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (token) {
    await User.updateMany(
      { _id: { $ne: user._id } },
      {
        $pull: {
          pushTokens: {
            token
          }
        }
      }
    );
  }

  if (deviceId) {
    await User.updateMany(
      { _id: { $ne: user._id } },
      {
        $pull: {
          pushTokens: {
            deviceId
          }
        }
      }
    );
  }

  const nextTokens = (user.pushTokens || []).filter((entry) => {
    if (!entry?.token) {
      return false;
    }

    if (String(entry.token) === token) {
      return false;
    }

    if (deviceId && String(entry.deviceId || "") === deviceId) {
      return false;
    }

    return true;
  });

  nextTokens.push({
    token,
    platform: platform || "android",
    deviceId,
    updatedAt: new Date()
  });

  user.pushTokens = nextTokens.slice(-8);
  await user.save();

  res.json({
    message: "Device registered for native notifications",
    registeredCount: user.pushTokens.length
  });
});

export const unregisterDeviceToken = asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const deviceId = String(req.body?.deviceId || "").trim();

  if (!token && !deviceId) {
    throw new ApiError(400, "Push token or device ID is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.pushTokens = (user.pushTokens || []).filter((entry) => {
    const tokenMatch = token && String(entry?.token || "") === token;
    const deviceMatch = deviceId && String(entry?.deviceId || "") === deviceId;

    return !(tokenMatch || deviceMatch);
  });

  await user.save();

  res.json({
    message: "Device removed from native notifications",
    registeredCount: user.pushTokens.length
  });
});
