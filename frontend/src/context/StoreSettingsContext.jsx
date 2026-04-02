import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { resolveMediaUrl } from "../utils/media";

const StoreSettingsContext = createContext(null);

const fallbackSettings = {
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

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(fallbackSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const faviconHref = resolveMediaUrl(settings.favicon?.url || fallbackSettings.favicon.url);
    const faviconType = faviconHref.endsWith(".ico")
      ? "image/x-icon"
      : faviconHref.endsWith(".svg")
        ? "image/svg+xml"
        : "image/png";

    document.title = settings.seo?.title || (settings.storeName ? `${settings.storeName} Commerce Platform` : "Mighty Couple Commerce Platform");

    let favicon = document.querySelector("link[data-store-favicon='true']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("data-store-favicon", "true");
      document.head.appendChild(favicon);
    }

    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("type", faviconType);
    favicon.setAttribute("href", faviconHref);
  }, [settings.favicon?.url, settings.storeName]);

  async function refreshSettings() {
    try {
      const { data } = await api.get("/settings/public");
      setSettings(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSettings().catch(() => {
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      setSettings,
      refreshSettings
    }),
    [loading, settings]
  );

  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
