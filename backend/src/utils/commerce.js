const PAYMENT_OPTION_MAP = {
  stripe: "stripe",
  paypal: "paypal",
  gcash: "gcash",
  maya: "maya",
  bank_transfer: "bankTransfer",
  cod: "cod"
};

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function splitKeywords(value) {
  return String(value || "")
    .split(",")
    .map((keyword) => normalizeKeyword(keyword))
    .filter(Boolean);
}

export function formatVariantLabel(variant) {
  return [variant?.name, variant?.color, variant?.storage, variant?.model].filter(Boolean).join(" | ");
}

export function resolveLocationShippingFee(shippingSettings = {}, shippingAddress = {}) {
  const mode = shippingSettings.mode || "fixed";
  const fixedFee = Number(shippingSettings.fixedFee || 0);

  if (mode !== "location") {
    return {
      fee: fixedFee,
      matchedLocation: "Nationwide"
    };
  }

  const haystack = [
    shippingAddress.province,
    shippingAddress.city,
    shippingAddress.country,
    shippingAddress.line1
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchedRule = (shippingSettings.locationFees || []).find((entry) => {
    const keywords = splitKeywords(entry.keyword);
    return keywords.some((keyword) => haystack.includes(keyword));
  });

  return {
    fee: Number(matchedRule?.fee ?? fixedFee),
    matchedLocation: matchedRule?.label || matchedRule?.keyword || "Nationwide"
  };
}

export function getEnabledPaymentMethods(paymentOptions = {}) {
  return Object.entries(PAYMENT_OPTION_MAP)
    .filter(([method, optionKey]) => paymentOptions[optionKey] !== false)
    .map(([method]) => method);
}

export function isPaymentMethodEnabled(paymentOptions = {}, method = "stripe") {
  const optionKey = PAYMENT_OPTION_MAP[method];
  return Boolean(optionKey && paymentOptions[optionKey] !== false);
}

export function calculateCartDiscounts({ items, settings, promoCode }) {
  const normalizedPromoCode = String(promoCode || "").trim().toUpperCase();
  const promotions = settings.promotions || {};
  const now = new Date();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const eligibleBundleItems = items.filter((item) => item.bundleEligible);
  const eligibleBundleQty = eligibleBundleItems.reduce((sum, item) => sum + item.quantity, 0);
  const eligibleBundleSubtotal = eligibleBundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let bundleDiscount = 0;
  let limitedOfferDiscount = 0;
  let promoDiscount = 0;
  const labels = [];

  if (promotions.bundle?.enabled && eligibleBundleQty >= Number(promotions.bundle.minQuantity || 2)) {
    bundleDiscount = eligibleBundleSubtotal * (Number(promotions.bundle.discountPercent || 0) / 100);
    if (bundleDiscount > 0) {
      labels.push(promotions.bundle.label || "Bundle deal");
    }
  }

  const limitedOfferEndsAt = promotions.limitedOffer?.endsAt ? new Date(promotions.limitedOffer.endsAt) : null;

  if (
    promotions.limitedOffer?.enabled &&
    limitedOfferEndsAt &&
    Number.isFinite(limitedOfferEndsAt.getTime()) &&
    limitedOfferEndsAt > now
  ) {
    limitedOfferDiscount = subtotal * (Number(promotions.limitedOffer.discountPercent || 0) / 100);
    if (limitedOfferDiscount > 0) {
      labels.push(promotions.limitedOffer.title || "Limited time offer");
    }
  }

  const matchedPromo = (promotions.promoCodes || []).find(
    (promo) => promo.active !== false && normalizeKeyword(promo.code).toUpperCase() === normalizedPromoCode
  );

  if (matchedPromo) {
    promoDiscount =
      matchedPromo.type === "fixed"
        ? Number(matchedPromo.value || 0)
        : subtotal * (Number(matchedPromo.value || 0) / 100);
    if (promoDiscount > 0) {
      labels.push(`Promo code ${matchedPromo.code}`);
    }
  }

  const discount = Math.min(subtotal, bundleDiscount + limitedOfferDiscount + promoDiscount);

  return {
    subtotal,
    discount: Number(discount.toFixed(2)),
    bundleDiscount: Number(bundleDiscount.toFixed(2)),
    limitedOfferDiscount: Number(limitedOfferDiscount.toFixed(2)),
    promoDiscount: Number(promoDiscount.toFixed(2)),
    matchedPromoCode: matchedPromo?.code || "",
    promoApplied: Boolean(matchedPromo),
    appliedLabels: labels
  };
}
