import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const PUSH_DEVICE_ID_KEY = "shopverse-push-device-id";

function buildDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getStoredPushDeviceIdSync() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PUSH_DEVICE_ID_KEY) || "";
}

async function persistPushDeviceId(deviceId) {
  const safeDeviceId = String(deviceId || "").trim();

  if (typeof window !== "undefined") {
    if (safeDeviceId) {
      window.localStorage.setItem(PUSH_DEVICE_ID_KEY, safeDeviceId);
    } else {
      window.localStorage.removeItem(PUSH_DEVICE_ID_KEY);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      if (safeDeviceId) {
        await Preferences.set({ key: PUSH_DEVICE_ID_KEY, value: safeDeviceId });
      } else {
        await Preferences.remove({ key: PUSH_DEVICE_ID_KEY });
      }
    } catch {
      // Native persistence is best-effort only.
    }
  }

  return safeDeviceId;
}

export async function getOrCreatePushDeviceId() {
  const fromStorage = getStoredPushDeviceIdSync();

  if (fromStorage) {
    return fromStorage;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: PUSH_DEVICE_ID_KEY });
      if (value) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(PUSH_DEVICE_ID_KEY, value);
        }
        return value;
      }
    } catch {
      // Fall back to generating a device id.
    }
  }

  return persistPushDeviceId(buildDeviceId());
}
