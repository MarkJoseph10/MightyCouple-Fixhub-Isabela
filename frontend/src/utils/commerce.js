export function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function resolveShippingPreview(settings, address = {}, hasItems = true) {
  if (!hasItems) {
    return {
      fee: 0,
      matchedLocation: "Nationwide"
    };
  }

  const shipping = settings.shipping || {};

  if (shipping.mode !== "location") {
    return {
      fee: Number(shipping.fixedFee || 0),
      matchedLocation: "Nationwide"
    };
  }

  const haystack = [address.province, address.city, address.country, address.line1]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchedRule = (shipping.locationFees || []).find((entry) =>
    String(entry.keyword || "")
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean)
      .some((keyword) => haystack.includes(keyword))
  );

  return {
    fee: Number(matchedRule?.fee ?? shipping.fixedFee ?? 0),
    matchedLocation: matchedRule?.label || matchedRule?.keyword || "Nationwide"
  };
}

export function calculateDiscountPreview(items, settings, promoCode) {
  const promotions = settings.promotions || {};
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const eligibleItems = items.filter((item) => item.bundleEligible !== false && !item.isFreeGift);
  const eligibleQty = eligibleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  let bundleDiscount = 0;
  let limitedOfferDiscount = 0;
  let promoDiscount = 0;
  const labels = [];

  if (promotions.bundle?.enabled && eligibleQty >= Number(promotions.bundle.minQuantity || 2)) {
    bundleDiscount = eligibleSubtotal * (Number(promotions.bundle.discountPercent || 0) / 100);
    if (bundleDiscount > 0) {
      labels.push(promotions.bundle.label || "Bundle deal");
    }
  }

  if (promotions.limitedOffer?.enabled && promotions.limitedOffer?.endsAt) {
    const endDate = new Date(promotions.limitedOffer.endsAt);

    if (Number.isFinite(endDate.getTime()) && endDate > new Date()) {
      limitedOfferDiscount = subtotal * (Number(promotions.limitedOffer.discountPercent || 0) / 100);
      if (limitedOfferDiscount > 0) {
        labels.push(promotions.limitedOffer.title || "Limited time offer");
      }
    }
  }

  const normalizedCode = String(promoCode || "").trim().toUpperCase();
  const matchedPromo = (promotions.promoCodes || []).find(
    (promo) => promo.active !== false && String(promo.code || "").trim().toUpperCase() === normalizedCode
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

  return {
    subtotal,
    bundleDiscount,
    limitedOfferDiscount,
    promoDiscount,
    discount: Math.min(subtotal, bundleDiscount + limitedOfferDiscount + promoDiscount),
    matchedPromoCode: matchedPromo?.code || "",
    appliedLabels: labels
  };
}

export function getEnabledPaymentMethods(settings) {
  const paymentOptions = settings.paymentOptions || {};
  const paymentMethods = [
    { value: "stripe", label: "Stripe card checkout", enabled: paymentOptions.stripe !== false },
    { value: "paypal", label: "PayPal sandbox", enabled: paymentOptions.paypal !== false },
    { value: "gcash", label: "GCash", enabled: paymentOptions.gcash !== false },
    { value: "maya", label: "Maya", enabled: paymentOptions.maya !== false },
    { value: "bank_transfer", label: "Bank transfer", enabled: paymentOptions.bankTransfer !== false },
    { value: "cod", label: "Cash on Delivery", enabled: paymentOptions.cod !== false }
  ];

  return paymentMethods.filter((method) => method.enabled);
}
