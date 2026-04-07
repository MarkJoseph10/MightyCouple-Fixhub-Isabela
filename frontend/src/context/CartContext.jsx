import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { resolveMediaUrl } from "../utils/media";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

function resolveProductStock(product, variant = null) {
  const normalizedVariants = Array.isArray(product?.variants) ? product.variants : [];
  const hasMeaningfulVariantStock = normalizedVariants.some((item) => Number(item?.stock || 0) > 0);

  if (variant && hasMeaningfulVariantStock) {
    return Number(variant.stock || 0);
  }

  return Number(product?.stock || 0);
}

export function CartProvider({ children }) {
  const storedSelectionRaw = localStorage.getItem("shopverse-cart-selected");
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
  const [selectedCartKeys, setSelectedCartKeys] = useState(() => {
    const parsed = storedSelectionRaw ? JSON.parse(storedSelectionRaw) : null;
    return Array.isArray(parsed) ? parsed : [];
  });
  const [selectionInitialized, setSelectionInitialized] = useState(() => Boolean(storedSelectionRaw));

  useEffect(() => {
    localStorage.setItem("shopverse-cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const availableKeys = new Set(items.map((item) => item.cartKey));
    const filteredKeys = selectedCartKeys.filter((key) => availableKeys.has(key));

    if (!filteredKeys.length && items.length && !selectionInitialized) {
      setSelectedCartKeys(items.map((item) => item.cartKey));
      setSelectionInitialized(true);
      return;
    }

    if (filteredKeys.length !== selectedCartKeys.length) {
      setSelectedCartKeys(filteredKeys);
    }
  }, [items, selectedCartKeys, selectionInitialized]);

  useEffect(() => {
    localStorage.setItem("shopverse-cart-selected", JSON.stringify(selectedCartKeys));
  }, [selectedCartKeys]);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      selectedCartKeys,
      selectedItems: items.filter((item) => selectedCartKeys.includes(item.cartKey)),
      selectedItemCount: items
        .filter((item) => selectedCartKeys.includes(item.cartKey))
        .reduce((sum, item) => sum + item.quantity, 0),
      selectedSubtotal: items
        .filter((item) => selectedCartKeys.includes(item.cartKey))
        .reduce((sum, item) => sum + item.price * item.quantity, 0),
      async addToCart(product, quantity = 1, options = {}) {
        if (!isAuthenticated) {
          return { ok: false, requiresAuth: true };
        }

        if (resolveProductStock(product, options.variant) <= 0) {
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
              image: resolveMediaUrl(product.images?.[0]?.url || ""),
              price: Number(selectedVariant?.price || product.price),
              vendorType: product.vendorType || "admin",
              sellerId: product.owner || "",
              variantId: selectedVariant?._id || "",
              variantLabel: [selectedVariant?.name, selectedVariant?.color, selectedVariant?.storage, selectedVariant?.model]
                .filter(Boolean)
                .join(" | "),
              bundleEligible: product.bundleEligible !== false,
              quantity
            }
          ];
        });
        setSelectedCartKeys((current) => (current.includes(cartKey) ? current : [...current, cartKey]));

        api.post("/analytics/cart-add").catch(() => null);
        return { ok: true, cartKey };
      },
      toggleSelected(cartKey) {
        setSelectedCartKeys((current) =>
          current.includes(cartKey) ? current.filter((key) => key !== cartKey) : [...current, cartKey]
        );
      },
      setSelectedOnly(cartKeys = []) {
        const normalized = [...new Set(cartKeys.filter(Boolean))];
        setSelectedCartKeys(normalized);
      },
      selectAll() {
        setSelectedCartKeys(items.map((item) => item.cartKey));
      },
      clearSelection() {
        setSelectionInitialized(true);
        setSelectedCartKeys([]);
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
        setSelectedCartKeys((current) => current.filter((key) => key !== cartKey));
      },
      clearSelectedItems() {
        setItems((current) => current.filter((item) => !selectedCartKeys.includes(item.cartKey)));
        setSelectedCartKeys([]);
      },
      clearCart() {
        setItems([]);
        setSelectedCartKeys([]);
      }
    }),
    [isAuthenticated, items, selectedCartKeys]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
