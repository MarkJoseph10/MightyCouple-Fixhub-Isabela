import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getRuntimeNetworkState, setRuntimeNetworkState } from "../utils/runtimeNetworkState";

const NetworkContext = createContext(null);

function getEffectiveType() {
  if (typeof navigator === "undefined") {
    return "";
  }

  return navigator.connection?.effectiveType || "";
}

function buildSnapshot(connected, connectionType = "unknown") {
  const effectiveType = getEffectiveType();
  const isWeakConnection = !connected || ["slow-2g", "2g"].includes(String(effectiveType || "").toLowerCase());

  return {
    connected,
    connectionType,
    effectiveType,
    isWeakConnection
  };
}

export function NetworkProvider({ children }) {
  const [networkState, setNetworkState] = useState(() => {
    const initial = buildSnapshot(typeof navigator === "undefined" ? true : navigator.onLine, "unknown");
    setRuntimeNetworkState(initial);
    return initial;
  });

  useEffect(() => {
    let removeListener = null;

    async function syncFromNative() {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        const status = await Network.getStatus();
        const next = buildSnapshot(Boolean(status.connected), status.connectionType || "unknown");
        setRuntimeNetworkState(next);
        setNetworkState(next);
      } catch {
        // Keep current state on failures.
      }
    }

    function handleBrowserState(connected) {
      const next = buildSnapshot(connected, getRuntimeNetworkState().connectionType || "unknown");
      setRuntimeNetworkState(next);
      setNetworkState(next);
    }

    syncFromNative().catch(() => {});

    const handleOnline = () => handleBrowserState(true);
    const handleOffline = () => handleBrowserState(false);
    const handleConnectionChange = () => handleBrowserState(typeof navigator === "undefined" ? true : navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.connection?.addEventListener?.("change", handleConnectionChange);

    if (Capacitor.isNativePlatform()) {
      Network.addListener("networkStatusChange", (status) => {
        const next = buildSnapshot(Boolean(status.connected), status.connectionType || "unknown");
        setRuntimeNetworkState(next);
        setNetworkState(next);
      }).then((listener) => {
        removeListener = () => listener.remove();
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.connection?.removeEventListener?.("change", handleConnectionChange);
      removeListener?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      ...networkState,
      isOffline: !networkState.connected
    }),
    [networkState]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus() {
  return useContext(NetworkContext);
}
