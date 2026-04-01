import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { calculateDiscountPreview, peso, resolveShippingPreview } from "../../utils/commerce";

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const {
    items,
    selectedCartKeys,
    selectedItems,
    selectedSubtotal,
    toggleSelected,
    selectAll,
    clearSelection,
    updateQuantity,
    removeItem
  } = useCart();
  const { settings } = useStoreSettings();
  const discountSummary = calculateDiscountPreview(
    selectedItems,
    settings,
    ""
  );
  const shipping = resolveShippingPreview(settings, {}, selectedItems.length > 0).fee;
  const tax = Math.max(0, selectedSubtotal - discountSummary.discount) * 0.02;
  const total = selectedSubtotal - discountSummary.discount + shipping + tax;
  const allSelected = items.length > 0 && selectedCartKeys.length === items.length;

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <h1 className="text-3xl font-semibold text-white">Your cart</h1>
          {!!items.length && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => (allSelected ? clearSelection() : selectAll())}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200"
              >
                {allSelected ? "Unselect all" : "Select all"}
              </button>
              <span className="text-slate-400">
                {selectedItems.length} of {items.length} item{items.length === 1 ? "" : "s"} selected for checkout
              </span>
            </div>
          )}
          <div className="mt-6 space-y-4">
            {!items.length && (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">
                Your cart is empty. Browse affordable gadgets and add something worth upgrading to.
              </div>
            )}
            {items.map((item) => (
              <div
                key={item.cartKey || `${item._id}-${item.variantId || "default"}`}
                className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedCartKeys.includes(item.cartKey)}
                    onChange={() => toggleSelected(item.cartKey)}
                    className="h-5 w-5 rounded border-white/20 bg-slate-950/40 text-brand-500"
                  />
                  <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                    <p className="text-sm text-slate-400">{peso(item.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.cartKey, Number(event.target.value))}
                    className="w-20 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                  />
                  <button onClick={() => removeItem(item.cartKey)} className="rounded-2xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-panel h-fit rounded-[32px] p-6 shadow-ambient">
          <h2 className="text-xl font-semibold text-white">Summary</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span>{peso(selectedSubtotal)}</span></div>
            <div className="flex justify-between"><span>Bundle / promo savings</span><span>-{peso(discountSummary.discount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{peso(shipping)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{peso(tax)}</span></div>
            <div className="flex justify-between border-t border-white/10 pt-4 text-base font-semibold text-white">
              <span>Total</span>
              <span>{peso(total)}</span>
            </div>
          </div>
          {!!discountSummary.appliedLabels.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {discountSummary.appliedLabels.map((label) => (
                <span key={label} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  {label}
                </span>
              ))}
            </div>
          )}
          {settings.promotions?.freeGift?.enabled && (
            <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
              Buy {settings.promotions.freeGift.buyQuantity} selected items to unlock the free gift offer.
            </div>
          )}
          {!isAuthenticated && selectedItems.length > 0 && (
            <div className="mt-4 rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-50">
              Please log in to continue to checkout.
            </div>
          )}
          {items.length > 0 && !selectedItems.length && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Select at least one cart item before continuing to checkout.
            </div>
          )}
          <Link
            to={selectedItems.length ? (isAuthenticated ? "/checkout" : "/auth") : "/cart"}
            state={selectedItems.length && !isAuthenticated ? { from: "/checkout", message: "Please log in to continue to checkout." } : undefined}
            className={`mt-6 inline-flex w-full justify-center rounded-2xl px-5 py-3 font-semibold text-white ${
              selectedItems.length ? "bg-brand-500" : "cursor-not-allowed bg-slate-700"
            }`}
          >
            {selectedItems.length ? (isAuthenticated ? "Continue to checkout" : "Sign in to checkout") : "Select items to checkout"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
