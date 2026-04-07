import { registerSW } from "virtual:pwa-register";

export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {}
  });
}
