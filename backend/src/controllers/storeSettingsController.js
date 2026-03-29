import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getOrCreateStoreSettings,
  serializeStoreSettings
} from "../services/storeSettingsService.js";

export const getPublicStoreSettings = asyncHandler(async (_, res) => {
  const settings = await getOrCreateStoreSettings();
  res.json(serializeStoreSettings(settings));
});

export const getAdminStoreSettings = asyncHandler(async (_, res) => {
  const settings = await getOrCreateStoreSettings();
  res.json(serializeStoreSettings(settings));
});

export const updateStoreSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateStoreSettings();
  const {
    storeName,
    shipping,
    logo,
    banner,
    heroImage,
    paymentOptions,
    paymentDetails,
    orderRules,
    promotions,
    metrics
  } = req.body;

  if (typeof storeName === "string" && storeName.trim()) {
    settings.storeName = storeName.trim();
  }

  if (shipping?.fixedFee !== undefined) {
    const fixedFee = Number(shipping.fixedFee);

    if (Number.isNaN(fixedFee) || fixedFee < 0) {
      throw new ApiError(400, "Shipping fee must be a valid number");
    }

    settings.shipping.fixedFee = fixedFee;
  }

  if (shipping?.mode) {
    settings.shipping.mode = shipping.mode;
  }

  if (Array.isArray(shipping?.locationFees)) {
    settings.shipping.locationFees = shipping.locationFees
      .map((item) => ({
        label: item.label || "",
        keyword: item.keyword || "",
        fee: Number(item.fee || 0)
      }))
      .filter((item) => item.keyword);
  }

  if (logo) {
    settings.logo = {
      url: logo.url || "",
      alt: logo.alt || `${settings.storeName} logo`
    };
  }

  if (banner) {
    settings.banner = {
      url: banner.url || "",
      alt: banner.alt || `${settings.storeName} banner`
    };
  }

  if (heroImage) {
    settings.heroImage = {
      url: heroImage.url || "",
      alt: heroImage.alt || `${settings.storeName} hero image`
    };
  }

  if (paymentOptions) {
    settings.paymentOptions = {
      ...settings.paymentOptions,
      stripe: paymentOptions.stripe ?? settings.paymentOptions.stripe,
      paypal: paymentOptions.paypal ?? settings.paymentOptions.paypal,
      gcash: paymentOptions.gcash ?? settings.paymentOptions.gcash,
      maya: paymentOptions.maya ?? settings.paymentOptions.maya,
      bankTransfer: paymentOptions.bankTransfer ?? settings.paymentOptions.bankTransfer,
      cod: paymentOptions.cod ?? settings.paymentOptions.cod
    };
  }

  if (paymentDetails) {
    settings.paymentDetails = {
      ...settings.paymentDetails,
      gcash: {
        ...settings.paymentDetails.gcash,
        ...(paymentDetails.gcash || {})
      },
      bankTransfer: {
        ...settings.paymentDetails.bankTransfer,
        ...(paymentDetails.bankTransfer || {})
      },
      proofOfPaymentRequired: {
        ...settings.paymentDetails.proofOfPaymentRequired,
        ...(paymentDetails.proofOfPaymentRequired || {})
      }
    };
  }

  if (orderRules) {
    if (orderRules.autoCancelUnpaidHours !== undefined) {
      settings.orderRules.autoCancelUnpaidHours = Number(orderRules.autoCancelUnpaidHours || 0);
    }

    if (Array.isArray(orderRules.guestCheckoutMethods)) {
      settings.orderRules.guestCheckoutMethods = orderRules.guestCheckoutMethods
        .map((method) => String(method || "").trim())
        .filter(Boolean);
    }
  }

  if (promotions) {
    if (promotions.bundle) {
      settings.promotions.bundle = {
        ...settings.promotions.bundle,
        ...promotions.bundle,
        minQuantity: Number(promotions.bundle.minQuantity ?? settings.promotions.bundle.minQuantity),
        discountPercent: Number(promotions.bundle.discountPercent ?? settings.promotions.bundle.discountPercent)
      };
    }

    if (promotions.freeGift) {
      settings.promotions.freeGift = {
        ...settings.promotions.freeGift,
        ...promotions.freeGift,
        buyQuantity: Number(promotions.freeGift.buyQuantity ?? settings.promotions.freeGift.buyQuantity)
      };
    }

    if (promotions.limitedOffer) {
      settings.promotions.limitedOffer = {
        ...settings.promotions.limitedOffer,
        ...promotions.limitedOffer,
        discountPercent: Number(promotions.limitedOffer.discountPercent ?? settings.promotions.limitedOffer.discountPercent)
      };
    }

    if (Array.isArray(promotions.promoCodes)) {
      settings.promotions.promoCodes = promotions.promoCodes
        .map((promo) => ({
          code: String(promo.code || "").trim().toUpperCase(),
          type: promo.type === "fixed" ? "fixed" : "percent",
          value: Number(promo.value || 0),
          active: promo.active !== false
        }))
        .filter((promo) => promo.code);
    }
  }

  if (metrics?.lowStockThreshold !== undefined) {
    settings.metrics.lowStockThreshold = Number(metrics.lowStockThreshold || 0);
  }

  await settings.save();

  res.json({
    message: "Store settings updated successfully",
    settings: serializeStoreSettings(settings)
  });
});
