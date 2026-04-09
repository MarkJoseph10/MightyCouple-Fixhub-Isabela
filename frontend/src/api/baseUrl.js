import { Capacitor } from "@capacitor/core";

const DEFAULT_WEB_API_URL = "http://localhost:5000/api";
const NATIVE_APP_API_URL = "https://shopverse-api-5uui.onrender.com/api";

function isCapacitorWebView() {
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const { protocol, hostname, port } = window.location;

  if (protocol === "capacitor:" || protocol === "ionic:") {
    return true;
  }

  // Capacitor Android apps commonly serve bundled assets from http://localhost
  // without a dev-server port. Treat that shell as native so it uses the live API.
  return hostname === "localhost" && !port;
}

function getConfiguredApiUrl() {
  if (isCapacitorWebView()) {
    return NATIVE_APP_API_URL;
  }

  return import.meta.env.VITE_API_URL || DEFAULT_WEB_API_URL;
}

function parseApiUrl(value) {
  try {
    return new URL(value);
  } catch {
    if (typeof window !== "undefined") {
      return new URL(value, window.location.origin);
    }

    return new URL(DEFAULT_WEB_API_URL);
  }
}

export function resolveApiBaseUrl() {
  const url = parseApiUrl(getConfiguredApiUrl());

  return url.toString().replace(/\/+$/, "");
}

export function resolveApiOrigin() {
  return resolveApiBaseUrl().replace(/\/api\/?$/, "");
}
