import { Capacitor } from "@capacitor/core";
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
import { calculateInstallmentPlan, formatInstallmentBreakdown } from "../../utils/installments";

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
  const { items, selectedItems, selectedSubtotal, clearSelectedItems } = useCart();
  const { settings } = useStoreSettings();
  const paymentMethods = useMemo(() => getEnabledPaymentMethods(settings), [settings]);
  const [address, setAddress] = useState({
    ...initialAddress,
    fullName: user?.name || "",
    email: user?.email || ""
  });
  const [purchaseMode, setPurchaseMode] = useState("full");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.value || "cod");
  const [promoCode, setPromoCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [installmentAgreementAccepted, setInstallmentAgreementAccepted] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    setAddress((current) => ({
      ...current,
      fullName: current.fullName || user?.name || "",
      email: current.email || user?.email || ""
    }));
  }, [user?.email, user?.name]);

  const discountSummary = useMemo(
    () => calculateDiscountPreview(selectedItems, settings, promoCode),
    [selectedItems, promoCode, settings]
  );

  const shippingSummary = useMemo(
    () => resolveShippingPreview(settings, address, selectedItems.length > 0),
    [address, selectedItems.length, settings]
  );

  const summary = useMemo(() => {
    const shipping = Number(shippingSummary.fee || 0);
    const taxableAmount = Math.max(0, selectedSubtotal - Number(discountSummary.discount || 0));
    const tax = taxableAmount * 0.02;

    return {
      shipping,
      tax,
      total: taxableAmount + shipping + tax
    };
  }, [discountSummary.discount, selectedSubtotal, shippingSummary.fee]);
  const installmentPlan = useMemo(
    () => calculateInstallmentPlan(summary.total, settings),
    [settings, summary.total]
  );
  const containsSellerItems = useMemo(
    () => selectedItems.some((item) => String(item.vendorType || "").toLowerCase() === "seller"),
    [selectedItems]
  );
  const canUseInstallment = selectedItems.length > 0 && installmentPlan.enabled && !containsSellerItems;
  const visiblePaymentMethods = useMemo(() => {
    if (purchaseMode !== "installment") {
      return paymentMethods;
    }

    return paymentMethods.filter((method) => method.value !== "cod");
  }, [paymentMethods, purchaseMode]);
  const paymentInstructionBlock = useMemo(
    () => purchaseMode === "installment"
      ? {
          title: "Installment reminder",
          lines: [
            `Submit the non-refundable down payment of ${peso(installmentPlan.downPaymentAmount)} for admin verification.`,
            `Remaining plan: ${peso(installmentPlan.installmentAmount)} every ${installmentPlan.frequency === "monthly" ? "month" : "week"} for ${installmentPlan.paymentCount} schedule(s).`,
            "Payments made are non-refundable under the installment agreement."
          ]
        }
      : getPaymentInstructionBlock(settings, paymentMethod),
    [installmentPlan.downPaymentAmount, installmentPlan.frequency, installmentPlan.installmentAmount, installmentPlan.paymentCount, paymentMethod, purchaseMode, settings]
  );

  useEffect(() => {
    setPaymentMethod((current) => {
      const enabledValues = visiblePaymentMethods.map((item) => item.value);
      return enabledValues.includes(current) ? current : enabledValues[0] || "cod";
    });
  }, [visiblePaymentMethods]);

  useEffect(() => {
    if (purchaseMode === "installment" && !canUseInstallment) {
      setPurchaseMode("full");
      setInstallmentAgreementAccepted(false);
    }
  }, [canUseInstallment, purchaseMode]);

  async function handleCheckout(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatusMessage("");

    if (purchaseMode === "installment" && !installmentAgreementAccepted) {
      setError("Please accept the non-refundable installment agreement before continuing.");
      setSubmitting(false);
      return;
    }

    if (purchaseMode === "installment" && !canUseInstallment) {
      setError(
        containsSellerItems
          ? "Seller marketplace products are not eligible for installment checkout."
          : "Installment is not available for the current cart."
      );
      setSubmitting(false);
      return;
    }

    try {
      const { data: order } = await api.post("/orders", {
        items: selectedItems.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          variantId: item.variantId || undefined
        })),
        shippingAddress: address,
        paymentMethod,
        promoCode,
        purchaseMode,
        installmentAgreementAccepted
      });

      let paymentMessage = order.paymentMessage || "Order created successfully.";

      if (paymentMethod === "stripe") {
        const { data: payment } = await api.post("/payments/intent", {
          orderId: order._id
        });

        paymentMessage = payment.message || paymentMessage;
      }

      setStatusMessage(paymentMessage);
      clearSelectedItems();
      navigate(`/checkout/success/${encodeURIComponent(order.orderNumber)}`, {
        state: {
          order,
          paymentMessage
        }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`page-shell py-10 ${isNativeApp ? "py-3 pb-28" : ""}`}>
      <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] ${isNativeApp ? "gap-4" : ""}`}>
        <form id="checkout-form" onSubmit={handleCheckout} className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[32px] p-6"}`}>
          <div className="flex flex-col gap-2">
            <h1 className={`font-semibold text-white ${isNativeApp ? "text-[1.55rem]" : "text-3xl"}`}>Checkout</h1>
            <p className="text-sm text-slate-400">Finish your order with secure account-based checkout, flexible payments, and a live shipping preview.</p>
          </div>

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Purchase option</p>
            <div className={`mt-3 grid gap-3 ${isNativeApp ? "grid-cols-1" : "md:grid-cols-2"}`}>
              <button
                type="button"
                onClick={() => {
                  setPurchaseMode("full");
                  setInstallmentAgreementAccepted(false);
                }}
                className={`border text-left transition duration-300 ${isNativeApp ? "rounded-[18px] px-3 py-3" : "rounded-[24px] px-4 py-4"} ${
                  purchaseMode === "full"
                    ? "border-brand-400 bg-brand-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="font-semibold text-white">Full payment</p>
                <p className="mt-1 text-sm text-slate-400">Pay the full amount during this checkout flow using your selected payment method.</p>
              </button>
              <button
                type="button"
                disabled={!canUseInstallment}
                onClick={() => setPurchaseMode("installment")}
                className={`border text-left transition duration-300 ${isNativeApp ? "rounded-[18px] px-3 py-3" : "rounded-[24px] px-4 py-4"} ${
                  purchaseMode === "installment"
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                } ${!canUseInstallment ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <p className="font-semibold text-white">Installment / Paluwagan</p>
                <p className="mt-1 text-sm text-slate-400">
                  {canUseInstallment
                    ? formatInstallmentBreakdown(installmentPlan)
                    : !selectedItems.length
                      ? "Add items to your cart first to calculate the installment plan."
                    : containsSellerItems
                      ? "Seller marketplace products are not eligible for installment checkout."
                    : installmentPlan.configured
                      ? "Installment needs a valid down payment and schedule before checkout can use it."
                      : "Installment is currently disabled by the store admin."}
                </p>
              </button>
            </div>
          </div>

          {items.length > 0 && !selectedItems.length ? (
            <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Select at least one cart item first before using checkout.
            </div>
          ) : null}

          <div className={`mt-6 grid gap-4 md:grid-cols-2 ${isNativeApp ? "gap-3" : ""}`}>
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
            <div className={`mt-3 grid gap-3 ${isNativeApp ? "grid-cols-1" : "md:grid-cols-2"}`}>
              {visiblePaymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`border px-4 text-left transition duration-300 ${isNativeApp ? "rounded-[18px] py-3" : "rounded-[24px] py-4"} ${
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
            <div className={`mt-4 border border-white/10 bg-white/5 text-slate-300 ${isNativeApp ? "rounded-[20px] p-3 text-[12px]" : "rounded-[28px] p-4 text-sm"}`}>
              <p className="font-semibold text-white">{paymentInstructionBlock.title}</p>
              <div className="mt-2 space-y-2">
                {paymentInstructionBlock.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {purchaseMode === "installment" && canUseInstallment && (
            <div className={`mt-4 border border-cyan-400/20 bg-cyan-500/10 text-cyan-50 ${isNativeApp ? "rounded-[20px] p-3 text-[12px]" : "rounded-[28px] p-4 text-sm"}`}>
              <p className="font-semibold text-white">Installment summary</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>Total with service fee: {peso(installmentPlan.totalWithServiceFee)}</p>
                <p>Down payment: {peso(installmentPlan.downPaymentAmount)}</p>
                <p>Service fee: {peso(installmentPlan.serviceFeeAmount)}</p>
                <p>{installmentPlan.frequency === "monthly" ? "Monthly" : "Weekly"} plan: {peso(installmentPlan.installmentAmount)} x {installmentPlan.paymentCount}</p>
                <p>Grace period: {installmentPlan.gracePeriodDays} day(s)</p>
                <p>
                  Release: {installmentPlan.releaseCondition === "admin_approved_early_release"
                    ? "Admin can approve early release"
                    : "Ship after full payment"}
                </p>
              </div>
              <label className="mt-4 flex items-start gap-3 rounded-[22px] border border-white/10 bg-slate-950/25 px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={installmentAgreementAccepted}
                  onChange={(event) => setInstallmentAgreementAccepted(event.target.checked)}
                  className="mt-1"
                />
                <span>I understand and agree that installment payments are non-refundable.</span>
              </label>
            </div>
          )}

          <div className={`mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px] ${isNativeApp ? "gap-3" : ""}`}>
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

          {!isNativeApp ? (
            <button
            disabled={!selectedItems.length || submitting}
            className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting
              ? "Processing..."
              : purchaseMode === "installment"
                ? "Start installment order"
                : paymentMethod === "cod"
                ? "Place COD order"
                : "Place order"}
            </button>
          ) : null}
        </form>

        <aside className={`glass-panel h-fit shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[32px] p-6"}`}>
          <h2 className="text-xl font-semibold text-white">Order summary</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            {selectedItems.map((item) => (
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
              <span>{peso(selectedSubtotal)}</span>
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

          <div className={`mt-6 border border-white/10 bg-white/5 text-slate-300 ${isNativeApp ? "rounded-[20px] p-3 text-[12px]" : "rounded-[28px] p-4 text-sm"}`}>
            <p className="font-semibold text-white">
              {purchaseMode === "installment" ? "Installment plan" : visiblePaymentMethods.find((item) => item.value === paymentMethod)?.label}
            </p>
            <p className="mt-2">
              {purchaseMode === "installment"
                ? formatInstallmentBreakdown(installmentPlan)
                : paymentDescriptions[paymentMethod]}
            </p>
          </div>
        </aside>
      </div>
      {isNativeApp ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Order total</p>
              <p className="text-lg font-semibold text-white">{peso(summary.total)}</p>
              <p className="text-xs text-slate-400">
                {purchaseMode === "installment" ? "Installment checkout" : visiblePaymentMethods.find((item) => item.value === paymentMethod)?.label || "Payment method"}
              </p>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={!selectedItems.length || submitting}
              className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Processing..." : purchaseMode === "installment" ? "Start plan" : "Place order"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
