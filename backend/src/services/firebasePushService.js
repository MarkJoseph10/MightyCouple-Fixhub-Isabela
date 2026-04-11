import admin from "firebase-admin";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument"
]);

let cachedApp = null;
let cachedServiceAccount = null;

function parseFirebaseServiceAccount() {
  if (cachedServiceAccount) {
    return cachedServiceAccount;
  }

  try {
    if (env.firebaseServiceAccountBase64) {
      cachedServiceAccount = JSON.parse(Buffer.from(env.firebaseServiceAccountBase64, "base64").toString("utf8"));
      return cachedServiceAccount;
    }

    if (env.firebaseServiceAccountJson) {
      cachedServiceAccount = JSON.parse(env.firebaseServiceAccountJson);
      return cachedServiceAccount;
    }
  } catch {
    cachedServiceAccount = null;
  }

  return null;
}

export function isFirebasePushConfigured() {
  return Boolean(parseFirebaseServiceAccount());
}

function getFirebaseMessaging() {
  if (cachedApp) {
    return admin.messaging(cachedApp);
  }

  const serviceAccount = parseFirebaseServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  if (admin.apps.length) {
    cachedApp = admin.app();
    return admin.messaging(cachedApp);
  }

  cachedApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || env.firebaseProjectId || undefined
  });

  return admin.messaging(cachedApp);
}

function stringifyPushData(data = {}) {
  const serialized = {};

  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === "string") {
      serialized[key] = value;
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      serialized[key] = String(value);
      return;
    }

    serialized[key] = JSON.stringify(value);
  });

  return serialized;
}

function getUniquePushTokens(user) {
  return [...new Set((user?.pushTokens || []).map((entry) => String(entry?.token || "").trim()).filter(Boolean))];
}

async function cleanupInvalidTokens(userId, invalidTokens = []) {
  if (!userId || !invalidTokens.length) {
    return;
  }

  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        pushTokens: {
          token: { $in: invalidTokens }
        }
      }
    }
  ).catch(() => {});
}

function buildPushPayload(notification) {
  return {
    notification: {
      title: String(notification.title || "").trim(),
      body: String(notification.message || "").trim()
    },
    data: {
      notificationId: String(notification._id || ""),
      type: String(notification.type || "info"),
      link: String(notification.link || ""),
      path: String(notification.link || ""),
      payload: JSON.stringify(notification.data || {}),
      ...stringifyPushData(notification.data || {})
    },
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        clickAction: "FCM_PLUGIN_ACTIVITY"
      }
    }
  };
}

export async function sendPushNotificationsForNotifications(notifications = []) {
  const messaging = getFirebaseMessaging();

  if (!messaging || !notifications.length) {
    return { skipped: true, sentCount: 0 };
  }

  const explicitUserIds = [...new Set(notifications.map((notification) => String(notification.recipientUser || "")).filter(Boolean))];
  const roleRecipients = [...new Set(notifications.filter((notification) => !notification.recipientUser && notification.recipientRole).map((notification) => String(notification.recipientRole || "")).filter(Boolean))];

  if (!explicitUserIds.length && !roleRecipients.length) {
    return { skipped: true, sentCount: 0 };
  }

  const userQuery = {
    "pushTokens.0": { $exists: true },
    $or: [
      explicitUserIds.length ? { _id: { $in: explicitUserIds } } : null,
      roleRecipients.length ? { role: { $in: roleRecipients } } : null
    ].filter(Boolean)
  };

  const users = await User.find(userQuery).select("_id role pushTokens").lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const usersByRole = new Map();

  users.forEach((user) => {
    const key = String(user.role || "").trim().toLowerCase();
    if (!key) {
      return;
    }

    const current = usersByRole.get(key) || [];
    current.push(user);
    usersByRole.set(key, current);
  });

  let sentCount = 0;

  for (const notification of notifications) {
    const targetUsers = notification.recipientUser
      ? [usersById.get(String(notification.recipientUser))].filter(Boolean)
      : usersByRole.get(String(notification.recipientRole || "").trim().toLowerCase()) || [];

    if (!targetUsers.length) {
      continue;
    }

    const payload = buildPushPayload(notification);

    for (const user of targetUsers) {
      const tokens = getUniquePushTokens(user);

      if (!tokens.length) {
        continue;
      }

      try {
        const response = await messaging.sendEachForMulticast({
          ...payload,
          tokens
        });

        sentCount += response.successCount || 0;

        const invalidTokens = [];
        (response.responses || []).forEach((result, index) => {
          const errorCode = result?.error?.code || "";
          if (result?.success !== false) {
            return;
          }

          if (INVALID_TOKEN_CODES.has(errorCode)) {
            invalidTokens.push(tokens[index]);
          }
        });

        if (invalidTokens.length) {
          await cleanupInvalidTokens(user._id, invalidTokens);
        }
      } catch {
        // Keep push delivery best-effort only so normal notifications continue to work.
      }
    }
  }

  return { skipped: false, sentCount };
}
