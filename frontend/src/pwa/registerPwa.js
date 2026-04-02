import { registerSW } from "virtual:pwa-register";

export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  registerSW({
    immediate: true
  });
}
