import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import {
  calculateDiscountPreview,
  getEnabledPaymentMethods,
  peso,
  resolveShippingPreview
} from "../../utils/commerce";

const initialAddress = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Philippines"
};

const paymentDescriptions = {
  stripe: "Card checkout powered by Stripe sandbox.",
  paypal: "Manual PayPal sandbox flow for testing.",
  gcash: "Pay directly to the configured GCash account.",
  maya: "Accept Maya wallet or transfer payment.",
  bank_transfer: "Transfer to the configured bank account, then send proof of payment.",
  cod: "Cash on Delivery for customers who prefer to pay when the item arrives."
};

function getPaymentInstructionBlock(settings, method) {
  const autoCancelHours = Number(settings.orderRules?.autoCancelUnpaidHours || 24);

  if (method === "gcash") {
    return {
      title: "GCash payment details",
      lines: [
        `Name: ${settings.paymentDetails?.gcash?.accountName || "Not set"}`,
        `Number: ${settings.paymentDetails?.gcash?.number || "Not set"}`,
        settings.paymentDetails?.proofOfPaymentRequired?.gcash
          ? `Proof of payment required within ${autoCancelHours} hours.`
          : "Proof of payment is not required."
      ]
    };
  }

  if (method === "bank_transfer") {
    return {
      title: "Bank transfer details",
      lines: [
        `Bank: ${settings.paymentDetails?.bankTransfer?.bankName || "Not set"}`,
        `Account name: ${settings.paymentDetails?.bankTransfer?.accountName || "Not set"}`,
        `Account number: ${settings.paymentDetails?.bankTransfer?.accountNumber || "Not set"}`,
        settings.paymentDetails?.proofOfPaymentRequired?.bankTransfer
          ? `Proof of payment required within ${autoCancelHours} hours.`
          : "Proof of payment is not required."
      ]
    };
  }

  if (method === "cod") {
    return {
      title: "Cash on Delivery",
      lines: ["Payment is collected upon delivery.", "No proof of payment is required for COD."]
    };
  }

  return null;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useStoreSettings();
  const paymentMethods = useMemo(() => getEnabledPaymentMethods(settings), [settings]);
  const visiblePaymentMethods = paymentMethods;
  const [address, setAddress] = useState({
    ...initialAddress,
    fullName: user?.name || "",
    email: user?.email || ""
  });
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.value || "cod");
  const [promoCode, setPromoCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPaymentMethod((current) => {
      const enabledValues = visiblePaymentMethods.map((item) => item.value);
      return enabledValues.includes(current) ? current : enabledValues[0] || "cod";
    });
  }, [visiblePaymentMethods]);

  useEffect(() => {
    setAddress((current) => ({
      ...current,
      fullName: current.fullName || user?.name || "",
      email: current.email || user?.email || ""
    }));
  }, [user?.email, user?.name]);

  const paymentInstructionBlock = useMemo(
    () => getPaymentInstructionBlock(settings, paymentMethod),
    [paymentMethod, settings]
  );

  const discountSummary = useMemo(
    () => calculateDiscountPreview(items, settings, promoCode),
    [items, promoCode, settings]
  );

  const shippingSummary = useMemo(
    () => resolveShippingPreview(settings, address, items.length > 0),
    [address, items.length, settings]
  );

  const summary = useMemo(() => {
    const shipping = Number(shippingSummary.fee || 0);
    const taxableAmount = Math.max(0, subtotal - Number(discountSummary.discount || 0));
    const tax = taxableAmount * 0.02;

    return {
      shipping,
      tax,
      total: taxableAmount + shipping + tax
    };
  }, [discountSummary.discount, shippingSummary.fee, subtotal]);

  async function handleCheckout(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatusMessage("");

    try {
      const { data: order } = await api.post("/orders", {
        items: items.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          variantId: item.variantId || undefined
        })),
        shippingAddress: address,
        paymentMethod,
        promoCode
      });

      let paymentMessage = order.paymentMessage || "Order created successfully.";

      if (paymentMethod === "stripe") {
        const { data: payment } = await api.post("/payments/intent", {
          orderId: order._id
        });

        paymentMessage = payment.message || paymentMessage;
      }

      setStatusMessage(paymentMessage);
      clearCart();

      setTimeout(() => {
        navigate("/orders");
      }, 1400);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form onSubmit={handleCheckout} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-white">Checkout</h1>
            <p className="text-sm text-slate-400">
              Finish your order with secure account-based checkout, flexible payments, and a live shipping preview.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Object.entries(address).map(([key, value]) => (
              <input
                key={key}
                required
                value={value}
                onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={key.replace(/([A-Z])/g, " $1")}
                className={`rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none ${key === "line1" ? "md:col-span-2" : ""}`}
              />
            ))}
          </div>

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Payment method</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {visiblePaymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition duration-300 ${
                    paymentMethod === method.value
                      ? "border-brand-400 bg-brand-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-white">{method.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{paymentDescriptions[method.value]}</p>
                </button>
              ))}
            </div>
          </div>

          {paymentInstructionBlock && (
            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">{paymentInstructionBlock.title}</p>
              <div className="mt-2 space-y-2">
                {paymentInstructionBlock.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="Promo code"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {discountSummary.matchedPromoCode ? `Applied: ${discountSummary.matchedPromoCode}` : "Promo will apply if valid"}
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
              Buy {settings.promotions.freeGift.buyQuantity} item(s) and a free gift will be added automatically if the promo is active.
            </div>
          )}

          {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
          {statusMessage && <div className="mt-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{statusMessage}</div>}

          <button
            disabled={!items.length || submitting}
            className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Processing..." : paymentMethod === "cod" ? "Place COD order" : "Place order"}
          </button>
        </form>

        <aside className="glass-panel h-fit rounded-[32px] p-6 shadow-ambient">
          <h2 className="text-xl font-semibold text-white">Order summary</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            {items.map((item) => (
              <div key={item.cartKey || `${item._id}-${item.variantId || "default"}`} className="flex justify-between gap-3">
                <div>
                  <span>{item.name} x {item.quantity}</span>
                  {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                </div>
                <span>{peso(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-white/10 pt-3">
              <span>Subtotal</span>
              <span>{peso(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{peso(discountSummary.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{peso(summary.shipping)}</span>
            </div>
            <div className="text-xs text-slate-500">Shipping zone: {shippingSummary.matchedLocation}</div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{peso(summary.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-white">
              <span>Total</span>
              <span>{peso(summary.total)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">{visiblePaymentMethods.find((item) => item.value === paymentMethod)?.label}</p>
            <p className="mt-2">{paymentDescriptions[paymentMethod]}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
