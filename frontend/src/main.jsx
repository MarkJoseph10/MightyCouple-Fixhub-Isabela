import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { NetworkProvider } from "./context/NetworkContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { StoreSettingsProvider } from "./context/StoreSettingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { resolveApiOrigin } from "./api/baseUrl";
import "./index.css";

if (typeof document !== "undefined") {
  const isNativeApp = Capacitor.isNativePlatform();
  document.documentElement.classList.toggle("native-app", isNativeApp);
  document.body.classList.toggle("native-app", isNativeApp);

  if (!isNativeApp && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});

    if ("caches" in window) {
      window.caches.keys()
        .then((cacheKeys) => Promise.all(cacheKeys.map((key) => window.caches.delete(key))))
        .catch(() => {});
    }
  }

  if (isNativeApp) {
    const viewportMeta = document.querySelector('meta[name="viewport"]');

    if (viewportMeta) {
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
      );
    }
  }

  const apiBaseUrl = resolveApiOrigin();
  const hintOrigins = [window.location.origin, apiBaseUrl, "https://res.cloudinary.com"].filter(Boolean);

  hintOrigins.forEach((origin) => {
    if (!document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      if (origin !== window.location.origin) {
        link.crossOrigin = "anonymous";
      }
      document.head.appendChild(link);
    }

    if (!document.head.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
      const dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      document.head.appendChild(dnsPrefetch);
    }
  });
}

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <NetworkProvider>
          <StoreSettingsProvider>
            <NotificationProvider>
              <ChatProvider>
                <WishlistProvider>
                  <CartProvider>
                    <App />
                  </CartProvider>
                </WishlistProvider>
              </ChatProvider>
            </NotificationProvider>
          </StoreSettingsProvider>
        </NetworkProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
