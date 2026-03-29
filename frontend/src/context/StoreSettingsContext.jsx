import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

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
  metrics: {
    cartAdds: 0,
    lowStockThreshold: 5
  }
};

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(fallbackSettings);
  const [loading, setLoading] = useState(true);

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
