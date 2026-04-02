import { StoreSettings } from "../models/StoreSettings.js";

const defaultSettings = {
  storeName: "Mighty Couple",
  logo: {
    url: "",
    alt: "Mighty Couple logo"
  },
  banner: {
    url: "",
    alt: "Mighty Couple banner"
  },
  heroImage: {
    url: "",
    alt: "Mighty Couple hero image"
  },
  backgroundImage: {
    url: "/branding/default-background.jpg",
    alt: "Mighty Couple storefront background"
  },
  favicon: {
    url: "/favicon.svg",
    alt: "Mighty Couple favicon"
  },
  backgroundOverlay: 0.5,
  shipping: {
    mode: "fixed",
    fixedFee: 180,
    locationFees: [],
    currency: "PHP"
  },
  paymentOptions: {
    stripe: true,
    paypal: true,
    gcash: true,
    maya: true,
    bankTransfer: true,
    cod: true
  },
  paymentDetails: {
    gcash: {
      accountName: "",
      number: "",
      qrUrl: ""
    },
    bankTransfer: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      qrUrl: ""
    },
    proofOfPaymentRequired: {
      gcash: true,
      bankTransfer: true,
      maya: true,
      paypal: false,
      stripe: false,
      cod: false
    }
  },
  orderRules: {
    autoCancelUnpaidHours: 24,
    refundWindowDays: 7,
    refundEligibleStatuses: ["delivered", "paid"],
    guestCheckoutMethods: []
  },
  promotions: {
    bundle: {
      enabled: false,
      minQuantity: 2,
      discountPercent: 10,
      label: "Bundle deal"
    },
    freeGift: {
      enabled: false,
      buyQuantity: 2,
      giftProductId: ""
    },
    limitedOffer: {
      enabled: false,
      title: "Limited time offer",
      endsAt: "",
      discountPercent: 0
    },
    promoCodes: []
  },
  content: {
    announcement: "Affordable gadget deals are live.",
    heroEyebrow: "Affordable gadgets for every budget",
    heroTitle: "Mighty Couple makes phones, laptops, and trending tech feel reachable.",
    heroDescription:
      "Sell brand-new or budget-friendly gadgets with stronger trust signals: ratings, real buyer counts, promo timers, flexible payments, and COD for Philippine customers.",
    primaryCtaLabel: "Shop gadgets",
    secondaryCtaLabel: "Track an order",
    featuredEyebrow: "Featured categories",
    featuredTitle: "Browse by gadget type",
    featuredCaption: "Jump into the categories customers search for most.",
    nextStepTitle: "Turn Mighty Couple into a gadget brand people trust",
    nextStepDescription:
      "Build trust with clear shipping policies, flexible payments, strong product pages, and a support channel buyers can rely on."
  },
  seo: {
    title: "Mighty Couple Commerce Platform",
    description: "Shop phones, laptops, gadgets, and installment-ready deals from Mighty Couple.",
    socialImage: ""
  },
  socialLinks: {
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    twitter: "https://x.com/",
    linkedin: "https://www.linkedin.com/"
  },
  notifications: {
    orderPlaced: true,
    paymentReceived: true,
    installmentDue: true,
    sellerSuspended: true,
    appealSubmitted: true,
    appealResolved: true
  },
  policyLinks: {
    privacyPolicyUrl: "/privacy-policy",
    shippingPolicyUrl: "/shipping-policy",
    returnPolicyUrl: "/return-policy",
    installmentTermsUrl: "/installments"
  },
  maintenance: {
    enabled: false,
    message: "We are making improvements and will be back shortly.",
    readOnly: false
  },
  metrics: {
    cartAdds: 0,
    lowStockThreshold: 5
  },
  installment: {
    enabled: true,
    frequency: "weekly",
    paymentCount: 8,
    downPaymentPercent: 10,
    serviceFeePercent: 0,
    gracePeriodDays: 3,
    releaseCondition: "after_full_payment",
    allowDeliveredOrdersRefund: false
  }
};

export async function getOrCreateStoreSettings() {
  let settings = await StoreSettings.findOne();

  if (!settings) {
    settings = await StoreSettings.create(defaultSettings);
  }

  return settings;
}

function readMedia(media, fallback) {
  return {
    url: media?.url || fallback.url,
    alt: media?.alt || fallback.alt
  };
}

export function serializeStoreSettings(settings) {
  return {
    id: settings._id,
    storeName: settings.storeName,
    logo: readMedia(settings.logo, defaultSettings.logo),
    banner: readMedia(settings.banner, defaultSettings.banner),
    heroImage: readMedia(settings.heroImage, defaultSettings.heroImage),
    backgroundImage: readMedia(settings.backgroundImage, defaultSettings.backgroundImage),
    favicon: readMedia(settings.favicon, defaultSettings.favicon),
    backgroundOverlay: Number(settings.backgroundOverlay ?? defaultSettings.backgroundOverlay),
    shipping: {
      mode: settings.shipping?.mode || defaultSettings.shipping.mode,
      fixedFee: Number(settings.shipping?.fixedFee ?? defaultSettings.shipping.fixedFee),
      locationFees: (settings.shipping?.locationFees || []).map((item) => ({
        label: item.label || "",
        keyword: item.keyword || "",
        fee: Number(item.fee || 0)
      })),
      currency: settings.shipping?.currency || defaultSettings.shipping.currency
    },
    paymentOptions: {
      stripe: settings.paymentOptions?.stripe ?? defaultSettings.paymentOptions.stripe,
      paypal: settings.paymentOptions?.paypal ?? defaultSettings.paymentOptions.paypal,
      gcash: settings.paymentOptions?.gcash ?? defaultSettings.paymentOptions.gcash,
      maya: settings.paymentOptions?.maya ?? defaultSettings.paymentOptions.maya,
      bankTransfer: settings.paymentOptions?.bankTransfer ?? defaultSettings.paymentOptions.bankTransfer,
      cod: settings.paymentOptions?.cod ?? defaultSettings.paymentOptions.cod
    },
    paymentDetails: {
      gcash: {
        accountName: settings.paymentDetails?.gcash?.accountName || defaultSettings.paymentDetails.gcash.accountName,
        number: settings.paymentDetails?.gcash?.number || defaultSettings.paymentDetails.gcash.number,
        qrUrl: settings.paymentDetails?.gcash?.qrUrl || defaultSettings.paymentDetails.gcash.qrUrl
      },
      bankTransfer: {
        bankName: settings.paymentDetails?.bankTransfer?.bankName || defaultSettings.paymentDetails.bankTransfer.bankName,
        accountName: settings.paymentDetails?.bankTransfer?.accountName || defaultSettings.paymentDetails.bankTransfer.accountName,
        accountNumber: settings.paymentDetails?.bankTransfer?.accountNumber || defaultSettings.paymentDetails.bankTransfer.accountNumber,
        qrUrl: settings.paymentDetails?.bankTransfer?.qrUrl || defaultSettings.paymentDetails.bankTransfer.qrUrl
      },
      proofOfPaymentRequired: {
        gcash: settings.paymentDetails?.proofOfPaymentRequired?.gcash ?? defaultSettings.paymentDetails.proofOfPaymentRequired.gcash,
        bankTransfer: settings.paymentDetails?.proofOfPaymentRequired?.bankTransfer ?? defaultSettings.paymentDetails.proofOfPaymentRequired.bankTransfer,
        maya: settings.paymentDetails?.proofOfPaymentRequired?.maya ?? defaultSettings.paymentDetails.proofOfPaymentRequired.maya,
        paypal: settings.paymentDetails?.proofOfPaymentRequired?.paypal ?? defaultSettings.paymentDetails.proofOfPaymentRequired.paypal,
        stripe: settings.paymentDetails?.proofOfPaymentRequired?.stripe ?? defaultSettings.paymentDetails.proofOfPaymentRequired.stripe,
        cod: settings.paymentDetails?.proofOfPaymentRequired?.cod ?? defaultSettings.paymentDetails.proofOfPaymentRequired.cod
      }
    },
    orderRules: {
      autoCancelUnpaidHours: Number(settings.orderRules?.autoCancelUnpaidHours ?? defaultSettings.orderRules.autoCancelUnpaidHours),
      refundWindowDays: Number(settings.orderRules?.refundWindowDays ?? defaultSettings.orderRules.refundWindowDays),
      refundEligibleStatuses: settings.orderRules?.refundEligibleStatuses?.length
        ? settings.orderRules.refundEligibleStatuses
        : defaultSettings.orderRules.refundEligibleStatuses,
      guestCheckoutMethods: settings.orderRules?.guestCheckoutMethods?.length
        ? settings.orderRules.guestCheckoutMethods
        : defaultSettings.orderRules.guestCheckoutMethods
    },
    promotions: {
      bundle: {
        enabled: settings.promotions?.bundle?.enabled ?? defaultSettings.promotions.bundle.enabled,
        minQuantity: Number(settings.promotions?.bundle?.minQuantity ?? defaultSettings.promotions.bundle.minQuantity),
        discountPercent: Number(settings.promotions?.bundle?.discountPercent ?? defaultSettings.promotions.bundle.discountPercent),
        label: settings.promotions?.bundle?.label || defaultSettings.promotions.bundle.label
      },
      freeGift: {
        enabled: settings.promotions?.freeGift?.enabled ?? defaultSettings.promotions.freeGift.enabled,
        buyQuantity: Number(settings.promotions?.freeGift?.buyQuantity ?? defaultSettings.promotions.freeGift.buyQuantity),
        giftProductId: settings.promotions?.freeGift?.giftProductId || defaultSettings.promotions.freeGift.giftProductId
      },
      limitedOffer: {
        enabled: settings.promotions?.limitedOffer?.enabled ?? defaultSettings.promotions.limitedOffer.enabled,
        title: settings.promotions?.limitedOffer?.title || defaultSettings.promotions.limitedOffer.title,
        endsAt: settings.promotions?.limitedOffer?.endsAt || defaultSettings.promotions.limitedOffer.endsAt,
        discountPercent: Number(settings.promotions?.limitedOffer?.discountPercent ?? defaultSettings.promotions.limitedOffer.discountPercent)
      },
      promoCodes: (settings.promotions?.promoCodes || defaultSettings.promotions.promoCodes).map((promo) => ({
        code: promo.code || "",
        type: promo.type === "fixed" ? "fixed" : "percent",
        value: Number(promo.value || 0),
        active: promo.active !== false
      }))
    },
    content: {
      announcement: settings.content?.announcement || defaultSettings.content.announcement,
      heroEyebrow: settings.content?.heroEyebrow || defaultSettings.content.heroEyebrow,
      heroTitle: settings.content?.heroTitle || defaultSettings.content.heroTitle,
      heroDescription: settings.content?.heroDescription || defaultSettings.content.heroDescription,
      primaryCtaLabel: settings.content?.primaryCtaLabel || defaultSettings.content.primaryCtaLabel,
      secondaryCtaLabel: settings.content?.secondaryCtaLabel || defaultSettings.content.secondaryCtaLabel,
      featuredEyebrow: settings.content?.featuredEyebrow || defaultSettings.content.featuredEyebrow,
      featuredTitle: settings.content?.featuredTitle || defaultSettings.content.featuredTitle,
      featuredCaption: settings.content?.featuredCaption || defaultSettings.content.featuredCaption,
      nextStepTitle: settings.content?.nextStepTitle || defaultSettings.content.nextStepTitle,
      nextStepDescription: settings.content?.nextStepDescription || defaultSettings.content.nextStepDescription
    },
    seo: {
      title: settings.seo?.title || defaultSettings.seo.title,
      description: settings.seo?.description || defaultSettings.seo.description,
      socialImage: settings.seo?.socialImage || defaultSettings.seo.socialImage
    },
    socialLinks: {
      facebook: settings.socialLinks?.facebook || defaultSettings.socialLinks.facebook,
      instagram: settings.socialLinks?.instagram || defaultSettings.socialLinks.instagram,
      twitter: settings.socialLinks?.twitter || defaultSettings.socialLinks.twitter,
      linkedin: settings.socialLinks?.linkedin || defaultSettings.socialLinks.linkedin
    },
    notifications: {
      orderPlaced: settings.notifications?.orderPlaced ?? defaultSettings.notifications.orderPlaced,
      paymentReceived: settings.notifications?.paymentReceived ?? defaultSettings.notifications.paymentReceived,
      installmentDue: settings.notifications?.installmentDue ?? defaultSettings.notifications.installmentDue,
      sellerSuspended: settings.notifications?.sellerSuspended ?? defaultSettings.notifications.sellerSuspended,
      appealSubmitted: settings.notifications?.appealSubmitted ?? defaultSettings.notifications.appealSubmitted,
      appealResolved: settings.notifications?.appealResolved ?? defaultSettings.notifications.appealResolved
    },
    policyLinks: {
      privacyPolicyUrl: settings.policyLinks?.privacyPolicyUrl || defaultSettings.policyLinks.privacyPolicyUrl,
      shippingPolicyUrl: settings.policyLinks?.shippingPolicyUrl || defaultSettings.policyLinks.shippingPolicyUrl,
      returnPolicyUrl: settings.policyLinks?.returnPolicyUrl || defaultSettings.policyLinks.returnPolicyUrl,
      installmentTermsUrl: settings.policyLinks?.installmentTermsUrl || defaultSettings.policyLinks.installmentTermsUrl
    },
    maintenance: {
      enabled: settings.maintenance?.enabled ?? defaultSettings.maintenance.enabled,
      message: settings.maintenance?.message || defaultSettings.maintenance.message,
      readOnly: settings.maintenance?.readOnly ?? defaultSettings.maintenance.readOnly
    },
    metrics: {
      cartAdds: Number(settings.metrics?.cartAdds ?? defaultSettings.metrics.cartAdds),
      lowStockThreshold: Number(settings.metrics?.lowStockThreshold ?? defaultSettings.metrics.lowStockThreshold)
    },
    installment: {
      enabled: settings.installment?.enabled ?? defaultSettings.installment.enabled,
      frequency: settings.installment?.frequency || defaultSettings.installment.frequency,
      paymentCount: Number(settings.installment?.paymentCount ?? defaultSettings.installment.paymentCount),
      downPaymentPercent: Number(settings.installment?.downPaymentPercent ?? defaultSettings.installment.downPaymentPercent),
      serviceFeePercent: Number(settings.installment?.serviceFeePercent ?? defaultSettings.installment.serviceFeePercent),
      gracePeriodDays: Number(settings.installment?.gracePeriodDays ?? defaultSettings.installment.gracePeriodDays),
      releaseCondition: settings.installment?.releaseCondition || defaultSettings.installment.releaseCondition,
      allowDeliveredOrdersRefund: settings.installment?.allowDeliveredOrdersRefund ?? defaultSettings.installment.allowDeliveredOrdersRefund
    }
  };
}
