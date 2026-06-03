import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      setLoading(true);

      if (!isAuthenticated) {
        setWishlistIds([]);
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/users/wishlist");
        setWishlistIds(data.map((item) => item._id));
      } catch {
        setWishlistIds([]);
      } finally {
        setLoading(false);
      }
    }

    loadWishlist();
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      wishlistIds,
      loading,
      isWishlisted(productId) {
        return wishlistIds.includes(productId);
      },
      async toggleWishlist(productId) {
        if (!isAuthenticated) {
          return { ok: false, requiresAuth: true };
        }

        const { data } = await api.post(`/users/wishlist/${productId}`);

        setWishlistIds((current) =>
          data.wished ? [...new Set([...current, productId])] : current.filter((item) => item !== productId)
        );
        return { ok: true, wished: data.wished };
      }
    }),
    [isAuthenticated, loading, wishlistIds]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
