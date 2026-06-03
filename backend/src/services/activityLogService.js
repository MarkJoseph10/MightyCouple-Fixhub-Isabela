import { ActivityLog } from "../models/ActivityLog.js";

function toTrimmedString(value) {
  return String(value || "").trim();
}

export async function recordActivity({
  actor = null,
  action,
  title,
  message,
  link = "",
  category = "system",
  subjectType = "",
  subjectId = "",
  severity = "info",
  metadata = {}
}) {
  const nextAction = toTrimmedString(action);
  const nextTitle = toTrimmedString(title);
  const nextMessage = toTrimmedString(message);

  if (!nextAction || !nextTitle || !nextMessage) {
    return null;
  }

  return ActivityLog.create({
    actorUser: actor?._id || null,
    actorName: actor?.name || actor?.email || "System",
    actorRole: actor?.role || "system",
    action: nextAction,
    title: nextTitle,
    message: nextMessage,
    link: toTrimmedString(link),
    category: toTrimmedString(category) || "system",
    subjectType: toTrimmedString(subjectType),
    subjectId: toTrimmedString(subjectId),
    severity,
    metadata
  });
}
