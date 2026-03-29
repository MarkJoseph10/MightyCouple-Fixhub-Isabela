import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("shopverse-cart");
    const parsed = saved ? JSON.parse(saved) : [];

    return parsed.map((item) => ({
      ...item,
      cartKey: item.cartKey || (item.variantId ? `${item._id}:${item.variantId}` : item._id),
      variantId: item.variantId || "",
      variantLabel: item.variantLabel || "",
      bundleEligible: item.bundleEligible !== false
    }));
  });

  useEffect(() => {
    localStorage.setItem("shopverse-cart", JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      async addToCart(product, quantity = 1, options = {}) {
        if (!isAuthenticated) {
          return { ok: false, requiresAuth: true };
        }

        if (Number(options.variant?.stock ?? product.stock ?? 0) <= 0) {
          return { ok: false, outOfStock: true };
        }

        const selectedVariant = options.variant || null;
        const cartKey = selectedVariant?._id ? `${product._id}:${selectedVariant._id}` : product._id;

        setItems((current) => {
          const existing = current.find((item) => item.cartKey === cartKey);

          if (existing) {
            return current.map((item) =>
              item.cartKey === cartKey ? { ...item, quantity: item.quantity + quantity } : item
            );
          }

          return [
            ...current,
            {
              cartKey,
              _id: product._id,
              name: product.name,
              slug: product.slug,
              image: product.images?.[0]?.url || "",
              price: Number(selectedVariant?.price || product.price),
              variantId: selectedVariant?._id || "",
              variantLabel: [selectedVariant?.name, selectedVariant?.color, selectedVariant?.storage, selectedVariant?.model]
                .filter(Boolean)
                .join(" | "),
              bundleEligible: product.bundleEligible !== false,
              quantity
            }
          ];
        });

        api.post("/analytics/cart-add").catch(() => null);
        return { ok: true };
      },
      updateQuantity(cartKey, quantity) {
        setItems((current) =>
          current
            .map((item) => (item.cartKey === cartKey ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0)
        );
      },
      removeItem(cartKey) {
        setItems((current) => current.filter((item) => item.cartKey !== cartKey));
      },
      clearCart() {
        setItems([]);
      }
    }),
    [isAuthenticated, items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
