import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { StoreSettingsProvider } from "./context/StoreSettingsContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoreSettingsProvider>
          <NotificationProvider>
            <WishlistProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </WishlistProvider>
          </NotificationProvider>
        </StoreSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
