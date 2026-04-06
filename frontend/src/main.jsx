import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { StoreSettingsProvider } from "./context/StoreSettingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { registerPwa } from "./pwa/registerPwa";
import "./index.css";

if (import.meta.env.PROD) {
  registerPwa();
}

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
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
        </AuthProvider>
    </Router>
  </React.StrictMode>
);
