import { env } from "../config/env.js";
import { notifyRole } from "./notificationService.js";
import { recordActivity } from "./activityLogService.js";

const recentErrorSignatures = new Map();
const ERROR_THROTTLE_MS = 5 * 60 * 1000;
const MAX_SIGNATURE_CACHE = 250;

function toSafeText(value) {
  return String(value || "").trim();
}

function buildSignature(error, req) {
  return [
    req?.method || "UNKNOWN",
    req?.originalUrl || req?.url || "UNKNOWN",
    error?.name || "Error",
    error?.statusCode || error?.status || 500,
    error?.message || "Unknown error"
  ]
    .map((part) => toSafeText(part).slice(0, 160))
    .join("|");
}

function buildRuntimeSignature(error, label) {
  return [
    "runtime",
    label || "runtime",
    error?.name || "Error",
    error?.message || "Unknown error"
  ]
    .map((part) => toSafeText(part).slice(0, 160))
    .join("|");
}

function shouldReport(signature) {
  const now = Date.now();
  const lastReportedAt = recentErrorSignatures.get(signature) || 0;

  if (now - lastReportedAt < ERROR_THROTTLE_MS) {
    return false;
  }

  recentErrorSignatures.set(signature, now);

  if (recentErrorSignatures.size > MAX_SIGNATURE_CACHE) {
    const cutoff = now - ERROR_THROTTLE_MS;

    for (const [key, timestamp] of recentErrorSignatures.entries()) {
      if (timestamp < cutoff) {
        recentErrorSignatures.delete(key);
      }
    }
  }

  return true;
}

export async function reportServerError({ error, req, user = null }) {
  if (!env.monitorErrors) {
    return null;
  }

  const statusCode = Number(error?.statusCode || error?.status || 500);
  if (statusCode < 500) {
    return null;
  }

  const signature = buildSignature(error, req);
  if (!shouldReport(signature)) {
    return null;
  }

  const method = req?.method || "UNKNOWN";
  const route = req?.originalUrl || req?.url || "unknown route";
  const title = `Server error on ${method} ${route}`;
  const message = toSafeText(error?.message) || "An unexpected error occurred on the server.";
  const safeStack = env.nodeEnv === "production" ? "" : toSafeText(error?.stack);

  const payload = {
    actor: user,
    action: "server_error",
    title,
    message: `${method} ${route}: ${message}`,
    link: "/admin/reports",
    category: "system",
    subjectType: "route",
    subjectId: route,
    severity: "danger",
    metadata: {
      statusCode,
      method,
      route,
      name: error?.name || "Error",
      stack: safeStack || undefined,
      requestId: req?.id || req?.requestId || null
    }
  };

  await Promise.allSettled([
    recordActivity(payload),
    notifyRole("admin", {
      type: "system_error",
      title: `System alert: ${method} ${route}`,
      message: `${message} (${statusCode})`,
      link: "/admin/reports",
      data: {
        statusCode,
        method,
        route,
        message
      }
    })
  ]);

  return null;
}

export async function reportRuntimeError({ error, label = "runtime" }) {
  if (!env.monitorErrors) {
    return null;
  }

  const statusCode = Number(error?.statusCode || error?.status || 500);
  if (statusCode < 500) {
    return null;
  }

  const signature = buildRuntimeSignature(error, label);
  if (!shouldReport(signature)) {
    return null;
  }

  const title = `Runtime error: ${label}`;
  const message = toSafeText(error?.message) || "An unexpected runtime error occurred.";
  const safeStack = env.nodeEnv === "production" ? "" : toSafeText(error?.stack);

  await Promise.allSettled([
    recordActivity({
      actor: null,
      action: "runtime_error",
      title,
      message,
      link: "/admin/reports",
      category: "system",
      subjectType: "runtime",
      subjectId: label,
      severity: "danger",
      metadata: {
        label,
        statusCode,
        name: error?.name || "Error",
        stack: safeStack || undefined
      }
    }),
    notifyRole("admin", {
      type: "system_error",
      title,
      message,
      link: "/admin/reports",
      data: {
        label,
        statusCode,
        message
      }
    })
  ]);

  return null;
}
