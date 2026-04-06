import crypto from "crypto";

const clients = new Map();
const KEEP_ALIVE_INTERVAL_MS = 25000;

function normalizeRecipient(recipient = {}) {
  const userId = recipient.userId ? String(recipient.userId) : "";
  const role = recipient.role ? String(recipient.role).trim().toLowerCase() : "";

  if (!userId && !role) {
    return null;
  }

  return {
    userId: userId || null,
    role: role || null
  };
}

function writeEvent(connection, event, payload) {
  if (!connection?.res || connection.res.writableEnded) {
    return false;
  }

  try {
    connection.res.write(`event: ${event}\n`);
    connection.res.write(`data: ${JSON.stringify(payload || {})}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function removeConnection(connectionId) {
  const connection = clients.get(connectionId);

  if (!connection) {
    return;
  }

  clearInterval(connection.keepAliveTimer);
  clients.delete(connectionId);
}

export function registerRealtimeClient({ userId, role, res }) {
  const connectionId = crypto.randomUUID();
  const connection = {
    id: connectionId,
    userId: String(userId || ""),
    role: String(role || "").trim().toLowerCase(),
    res,
    keepAliveTimer: null
  };

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write("retry: 3000\n\n");
  clients.set(connectionId, connection);

  connection.keepAliveTimer = setInterval(() => {
    if (!writeEvent(connection, "ping", { timestamp: new Date().toISOString() })) {
      removeConnection(connectionId);
    }
  }, KEEP_ALIVE_INTERVAL_MS);

  writeEvent(connection, "connected", {
    connectionId,
    connectedAt: new Date().toISOString()
  });

  return () => {
    removeConnection(connectionId);

    try {
      if (!res.writableEnded) {
        res.end();
      }
    } catch {
      // Swallow disconnect cleanup errors.
    }
  };
}

export function publishRealtimeEvent({ userId = null, role = null, event, data = {} }) {
  const userIdString = userId ? String(userId) : "";
  const roleString = role ? String(role).trim().toLowerCase() : "";

  for (const [connectionId, connection] of clients.entries()) {
    const matchesUser = userIdString && connection.userId === userIdString;
    const matchesRole = roleString && connection.role === roleString;

    if (!matchesUser && !matchesRole) {
      continue;
    }

    if (!writeEvent(connection, event, data)) {
      removeConnection(connectionId);
    }
  }
}

export function publishRealtimeToMany({ recipients = [], event, dataFactory = {} }) {
  const uniqueRecipients = [];
  const seen = new Set();

  recipients.map(normalizeRecipient).filter(Boolean).forEach((recipient) => {
    const key = `${recipient.userId || ""}:${recipient.role || ""}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueRecipients.push(recipient);
  });

  uniqueRecipients.forEach((recipient) => {
    const payload = typeof dataFactory === "function" ? dataFactory(recipient) : dataFactory;
    publishRealtimeEvent({
      userId: recipient.userId,
      role: recipient.role,
      event,
      data: payload
    });
  });
}

