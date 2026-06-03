import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const PUSH_TOKEN_KEY = "shopverse-push-token";

export function getStoredPushTokenSync() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PUSH_TOKEN_KEY) || "";
}

export async function hydrateStoredPushToken() {
  if (typeof window === "undefined") {
    return "";
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: PUSH_TOKEN_KEY });
      if (value) {
        window.localStorage.setItem(PUSH_TOKEN_KEY, value);
        return value;
      }
    } catch {
      // Ignore native storage failures and fall back to local storage.
    }
  }

  return getStoredPushTokenSync();
}

export async function persistPushToken(token) {
  const safeToken = String(token || "").trim();

  if (typeof window !== "undefined") {
    if (safeToken) {
      window.localStorage.setItem(PUSH_TOKEN_KEY, safeToken);
    } else {
      window.localStorage.removeItem(PUSH_TOKEN_KEY);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      if (safeToken) {
        await Preferences.set({ key: PUSH_TOKEN_KEY, value: safeToken });
      } else {
        await Preferences.remove({ key: PUSH_TOKEN_KEY });
      }
    } catch {
      // Native persistence is best-effort only.
    }
  }

  return safeToken;
}

export async function clearStoredPushToken() {
  return persistPushToken("");
}
