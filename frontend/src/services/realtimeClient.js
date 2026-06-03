import api from "../api/client";
import { resolveApiBaseUrl } from "../api/baseUrl";

const listeners = new Set();
let eventSource = null;
let activeToken = "";

function buildRealtimeUrl(token) {
  const configuredBase = String(api.defaults.baseURL || resolveApiBaseUrl()).trim();
  const fallbackBase = resolveApiBaseUrl();
  const apiBase = configuredBase || fallbackBase;
  const url = new URL(`${apiBase.replace(/\/+$/, "")}/realtime/stream`, typeof window !== "undefined" ? window.location.origin : undefined);

  url.searchParams.set("token", token);

  return url.toString();
}

function dispatchRealtimeEvent(type, payload = null) {
  listeners.forEach((listener) => {
    try {
      listener({ type, payload });
    } catch {
      // Keep other listeners alive even if one fails.
    }
  });
}

function attachEvent(source, eventName) {
  source.addEventListener(eventName, (event) => {
    let payload = null;

    try {
      payload = event.data ? JSON.parse(event.data) : null;
    } catch {
      payload = null;
    }

    dispatchRealtimeEvent(eventName, payload);
  });
}

export function startRealtimeClient(token) {
  const nextToken = String(token || "").trim();

  if (!nextToken) {
    stopRealtimeClient();
    return null;
  }

  if (eventSource && activeToken === nextToken) {
    return eventSource;
  }

  stopRealtimeClient();
  activeToken = nextToken;
  eventSource = new EventSource(buildRealtimeUrl(nextToken));

  eventSource.onopen = () => {
    dispatchRealtimeEvent("connection.open");
  };

  eventSource.onerror = () => {
    dispatchRealtimeEvent("connection.error");
  };

  ["connected", "ping", "conversation.updated", "notification.created", "presence.updated"].forEach((eventName) => {
    attachEvent(eventSource, eventName);
  });

  return eventSource;
}

export function stopRealtimeClient() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = null;
  activeToken = "";
}

export function subscribeRealtime(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
