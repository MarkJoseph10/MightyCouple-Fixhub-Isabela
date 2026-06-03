import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getOrCreateStoreSettings,
  serializeStoreSettings
} from "../services/storeSettingsService.js";
import { recordActivity } from "../services/activityLogService.js";

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
    backgroundImage,
    favicon,
    backgroundOverlay,
    paymentOptions,
    paymentDetails,
    orderRules,
    promotions,
    content,
    seo,
    socialLinks,
    notifications,
    mobileApp,
    policyLinks,
    maintenance,
    metrics,
    installment
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

  if (backgroundImage) {
    settings.backgroundImage = {
      url: backgroundImage.url || "",
      alt: backgroundImage.alt || `${settings.storeName} storefront background`
    };
  }

  if (favicon) {
    settings.favicon = {
      url: favicon.url || "",
      alt: favicon.alt || `${settings.storeName} favicon`
    };
  }

  if (backgroundOverlay !== undefined) {
    const overlayValue = Number(backgroundOverlay);

    if (Number.isNaN(overlayValue) || overlayValue < 0.4 || overlayValue > 0.6) {
      throw new ApiError(400, "Background overlay must be between 0.4 and 0.6");
    }

    settings.backgroundOverlay = overlayValue;
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

    if (orderRules.refundWindowDays !== undefined) {
      settings.orderRules.refundWindowDays = Number(orderRules.refundWindowDays || 0);
    }

    if (Array.isArray(orderRules.refundEligibleStatuses)) {
      settings.orderRules.refundEligibleStatuses = orderRules.refundEligibleStatuses
        .map((status) => String(status || "").trim().toLowerCase())
        .filter((status) => ["paid", "delivered"].includes(status));
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

  if (content) {
    settings.content = {
      ...settings.content,
      announcement: content.announcement ?? settings.content.announcement,
      heroEyebrow: content.heroEyebrow ?? settings.content.heroEyebrow,
      heroTitle: content.heroTitle ?? settings.content.heroTitle,
      heroDescription: content.heroDescription ?? settings.content.heroDescription,
      primaryCtaLabel: content.primaryCtaLabel ?? settings.content.primaryCtaLabel,
      secondaryCtaLabel: content.secondaryCtaLabel ?? settings.content.secondaryCtaLabel,
      featuredEyebrow: content.featuredEyebrow ?? settings.content.featuredEyebrow,
      featuredTitle: content.featuredTitle ?? settings.content.featuredTitle,
      featuredCaption: content.featuredCaption ?? settings.content.featuredCaption,
      nextStepTitle: content.nextStepTitle ?? settings.content.nextStepTitle,
      nextStepDescription: content.nextStepDescription ?? settings.content.nextStepDescription
    };
  }

  if (seo) {
    settings.seo = {
      ...settings.seo,
      title: seo.title ?? settings.seo.title,
      description: seo.description ?? settings.seo.description,
      socialImage: seo.socialImage ?? settings.seo.socialImage
    };
  }

  if (socialLinks) {
    settings.socialLinks = {
      ...settings.socialLinks,
      facebook: socialLinks.facebook ?? settings.socialLinks.facebook,
      instagram: socialLinks.instagram ?? settings.socialLinks.instagram,
      twitter: socialLinks.twitter ?? settings.socialLinks.twitter,
      linkedin: socialLinks.linkedin ?? settings.socialLinks.linkedin
    };
  }

  if (notifications) {
    settings.notifications = {
      ...settings.notifications,
      orderPlaced: notifications.orderPlaced ?? settings.notifications.orderPlaced,
      paymentReceived: notifications.paymentReceived ?? settings.notifications.paymentReceived,
      installmentDue: notifications.installmentDue ?? settings.notifications.installmentDue,
      sellerSuspended: notifications.sellerSuspended ?? settings.notifications.sellerSuspended,
      appealSubmitted: notifications.appealSubmitted ?? settings.notifications.appealSubmitted,
      appealResolved: notifications.appealResolved ?? settings.notifications.appealResolved
    };
  }

  if (mobileApp) {
    settings.mobileApp = {
      ...settings.mobileApp,
      androidLatestVersion:
        mobileApp.androidLatestVersion ?? settings.mobileApp.androidLatestVersion,
      androidMinimumVersion:
        mobileApp.androidMinimumVersion ?? settings.mobileApp.androidMinimumVersion,
      androidUpdateUrl: mobileApp.androidUpdateUrl ?? settings.mobileApp.androidUpdateUrl,
      androidUpdateMessage:
        mobileApp.androidUpdateMessage ?? settings.mobileApp.androidUpdateMessage
    };
  }

  if (policyLinks) {
    settings.policyLinks = {
      ...settings.policyLinks,
      privacyPolicyUrl: policyLinks.privacyPolicyUrl ?? settings.policyLinks.privacyPolicyUrl,
      shippingPolicyUrl: policyLinks.shippingPolicyUrl ?? settings.policyLinks.shippingPolicyUrl,
      returnPolicyUrl: policyLinks.returnPolicyUrl ?? settings.policyLinks.returnPolicyUrl,
      installmentTermsUrl: policyLinks.installmentTermsUrl ?? settings.policyLinks.installmentTermsUrl
    };
  }

  if (maintenance) {
    settings.maintenance = {
      ...settings.maintenance,
      enabled: maintenance.enabled ?? settings.maintenance.enabled,
      message: maintenance.message ?? settings.maintenance.message,
      readOnly: maintenance.readOnly ?? settings.maintenance.readOnly
    };
  }

  if (metrics?.lowStockThreshold !== undefined) {
    settings.metrics.lowStockThreshold = Number(metrics.lowStockThreshold || 0);
  }

  if (installment) {
    if (installment.enabled !== undefined) {
      settings.installment.enabled = Boolean(installment.enabled);
    }

    if (installment.frequency) {
      settings.installment.frequency = installment.frequency === "monthly" ? "monthly" : "weekly";
    }

    if (installment.paymentCount !== undefined) {
      settings.installment.paymentCount = Math.max(1, Number(installment.paymentCount || 1));
    }

    if (installment.downPaymentPercent !== undefined) {
      settings.installment.downPaymentPercent = Math.max(0, Number(installment.downPaymentPercent || 0));
    }

    if (installment.serviceFeePercent !== undefined) {
      settings.installment.serviceFeePercent = Math.max(0, Number(installment.serviceFeePercent || 0));
    }

    if (installment.gracePeriodDays !== undefined) {
      settings.installment.gracePeriodDays = Math.max(0, Number(installment.gracePeriodDays || 0));
    }

    if (installment.releaseCondition) {
      settings.installment.releaseCondition = installment.releaseCondition === "admin_approved_early_release"
        ? "admin_approved_early_release"
        : "after_full_payment";
    }
  }

  await settings.save();

  await recordActivity({
    actor: req.user,
    category: "system",
    action: "store_settings_updated",
    title: "Store settings updated",
    message: "Admin updated store branding, operations, policies, or notification settings.",
    link: "/admin/settings",
    subjectType: "store_settings",
    subjectId: settings._id.toString(),
    severity: "info",
    metadata: {
      changedSections: [
        storeName ? "storeName" : null,
        shipping ? "shipping" : null,
        logo ? "logo" : null,
        banner ? "banner" : null,
        heroImage ? "heroImage" : null,
        backgroundImage ? "backgroundImage" : null,
        favicon ? "favicon" : null,
        paymentOptions ? "paymentOptions" : null,
        paymentDetails ? "paymentDetails" : null,
        orderRules ? "orderRules" : null,
        promotions ? "promotions" : null,
        content ? "content" : null,
        seo ? "seo" : null,
        socialLinks ? "socialLinks" : null,
        notifications ? "notifications" : null,
        mobileApp ? "mobileApp" : null,
        policyLinks ? "policyLinks" : null,
        maintenance ? "maintenance" : null,
        metrics ? "metrics" : null,
        installment ? "installment" : null
      ].filter(Boolean)
    }
  }).catch(() => {});

  res.json({
    message: "Store settings updated successfully",
    settings: serializeStoreSettings(settings)
  });
});
