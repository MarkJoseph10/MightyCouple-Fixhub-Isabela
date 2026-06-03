import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { getStoredPushDeviceIdSync } from "../utils/pushDeviceStorage";
import { clearStoredAuthToken, hydrateStoredAuthToken, persistAuthToken } from "../utils/authStorage";
import { getStoredPushTokenSync } from "../utils/pushTokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = await hydrateStoredAuthToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        await clearStoredAuthToken();
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  async function refreshUser() {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      isSellerAccount: user?.role === "seller",
      isSeller: user?.role === "seller" && user?.sellerProfile?.isActive !== false,
      isRepairTechnician:
        user?.role === "seller" &&
        user?.sellerProfile?.isActive !== false &&
        user?.technicianApplication?.status === "approved",
      async login(credentials) {
        const { data } = await api.post("/auth/login", credentials);
        await persistAuthToken(data.token);
        setUser(data.user);
        return data;
      },
      async register(payload) {
        const { data } = await api.post("/auth/register", payload);
        await persistAuthToken(data.token);
        setUser(data.user);
        return data;
      },
      async loginWithGoogle(payload) {
        const { data } = await api.post("/auth/google", payload);
        await persistAuthToken(data.token);
        setUser(data.user);
        return data;
      },
      async loginWithFacebook(payload) {
        const { data } = await api.post("/auth/facebook", payload);
        await persistAuthToken(data.token);
        setUser(data.user);
        return data;
      },
      refreshUser,
      setUserData(nextUser) {
        setUser(nextUser);
      },
      async logout() {
        const pushToken = getStoredPushTokenSync();
        const deviceId = getStoredPushDeviceIdSync();

        if (pushToken || deviceId) {
          await api.delete("/notifications/device", {
            data: {
              token: pushToken,
              deviceId
            }
          }).catch(() => {});
        }

        await clearStoredAuthToken();
        setUser(null);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
