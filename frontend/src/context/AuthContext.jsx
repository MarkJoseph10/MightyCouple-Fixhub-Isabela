import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("shopverse-token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("shopverse-token");
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
      isSeller: user?.role === "seller" && user?.sellerProfile?.isActive !== false,
      async login(credentials) {
        const { data } = await api.post("/auth/login", credentials);
        localStorage.setItem("shopverse-token", data.token);
        setUser(data.user);
        return data;
      },
      async register(payload) {
        const { data } = await api.post("/auth/register", payload);
        localStorage.setItem("shopverse-token", data.token);
        setUser(data.user);
        return data;
      },
      async loginWithGoogle(payload) {
        const { data } = await api.post("/auth/google", payload);
        localStorage.setItem("shopverse-token", data.token);
        setUser(data.user);
        return data;
      },
      refreshUser,
      setUserData(nextUser) {
        setUser(nextUser);
      },
      logout() {
        localStorage.removeItem("shopverse-token");
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
