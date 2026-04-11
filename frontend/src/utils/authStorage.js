import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const AUTH_TOKEN_KEY = "shopverse-token";

function canUseWindow() {
  return typeof window !== "undefined";
}

export function getStoredAuthTokenSync() {
  if (!canUseWindow()) {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export async function hydrateStoredAuthToken() {
  const existing = getStoredAuthTokenSync();
  if (existing) {
    return existing;
  }

  if (!Capacitor.isNativePlatform()) {
    return "";
  }

  const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
  if (value && canUseWindow()) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, value);
  }

  return value || "";
}

export async function persistAuthToken(token) {
  if (canUseWindow()) {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  if (Capacitor.isNativePlatform()) {
    if (token) {
      await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
    } else {
      await Preferences.remove({ key: AUTH_TOKEN_KEY });
    }
  }
}

export async function clearStoredAuthToken() {
  await persistAuthToken("");
}
