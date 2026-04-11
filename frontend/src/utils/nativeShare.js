import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export async function shareContent({ title = "", text = "", url = "", dialogTitle = "" } = {}) {
  const payload = {
    title,
    text,
    url,
    dialogTitle: dialogTitle || title || "Share"
  };

  if (Capacitor.isNativePlatform()) {
    await Share.share(payload);
    return { shared: true };
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share(payload);
    return { shared: true };
  }

  const fallback = [title, text, url].filter(Boolean).join("\n");

  if (fallback && navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(fallback);
    return { shared: false, copied: true };
  }

  return { shared: false, copied: false };
}
