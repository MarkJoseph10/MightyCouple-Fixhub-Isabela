import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    alt: String
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["fixed", "location"],
      default: "fixed"
    },
    fixedFee: {
      type: Number,
      default: 180
    },
    locationFees: [
      {
        label: String,
        keyword: String,
        fee: Number
      }
    ],
    currency: {
      type: String,
      default: "PHP"
    }
  },
  { _id: false }
);

const paymentOptionsSchema = new mongoose.Schema(
  {
    stripe: { type: Boolean, default: true },
    paypal: { type: Boolean, default: true },
    gcash: { type: Boolean, default: true },
    maya: { type: Boolean, default: true },
    bankTransfer: { type: Boolean, default: true },
    cod: { type: Boolean, default: true }
  },
  { _id: false }
);

const walletDetailsSchema = new mongoose.Schema(
  {
    accountName: String,
    number: String,
    qrUrl: String
  },
  { _id: false }
);

const bankTransferDetailsSchema = new mongoose.Schema(
  {
    bankName: String,
    accountName: String,
    accountNumber: String,
    qrUrl: String
  },
  { _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    gcash: {
      type: walletDetailsSchema,
      default: () => ({})
    },
    bankTransfer: {
      type: bankTransferDetailsSchema,
      default: () => ({})
    },
    proofOfPaymentRequired: {
      gcash: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: true },
      maya: { type: Boolean, default: true },
      paypal: { type: Boolean, default: false },
      stripe: { type: Boolean, default: false },
      cod: { type: Boolean, default: false }
    }
  },
  { _id: false }
);

const orderRulesSchema = new mongoose.Schema(
  {
    autoCancelUnpaidHours: {
      type: Number,
      default: 24
    },
    refundWindowDays: {
      type: Number,
      default: 7
    },
    refundEligibleStatuses: {
      type: [String],
      default: ["delivered", "paid"]
    },
    guestCheckoutMethods: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const promoCodeSchema = new mongoose.Schema(
  {
    code: String,
    type: {
      type: String,
      enum: ["fixed", "percent"],
      default: "percent"
    },
    value: Number,
    active: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const promotionSchema = new mongoose.Schema(
  {
    bundle: {
      enabled: { type: Boolean, default: false },
      minQuantity: { type: Number, default: 2 },
      discountPercent: { type: Number, default: 10 },
      label: { type: String, default: "Bundle deal" }
    },
    freeGift: {
      enabled: { type: Boolean, default: false },
      buyQuantity: { type: Number, default: 2 },
      giftProductId: { type: String, default: "" }
    },
    limitedOffer: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: "Limited time offer" },
      endsAt: Date,
      discountPercent: { type: Number, default: 0 }
    },
    promoCodes: [promoCodeSchema]
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    announcement: { type: String, default: "Affordable gadget deals are live." },
    heroEyebrow: { type: String, default: "Affordable gadgets for every budget" },
    heroTitle: {
      type: String,
      default: "Mighty Couple makes phones, laptops, and trending tech feel reachable."
    },
    heroDescription: {
      type: String,
      default:
        "Sell brand-new or budget-friendly gadgets with stronger trust signals: ratings, real buyer counts, promo timers, flexible payments, and COD for Philippine customers."
    },
    primaryCtaLabel: { type: String, default: "Shop gadgets" },
    secondaryCtaLabel: { type: String, default: "Track an order" },
    featuredEyebrow: { type: String, default: "Featured categories" },
    featuredTitle: { type: String, default: "Browse by gadget type" },
    featuredCaption: {
      type: String,
      default: "Jump into the categories customers search for most."
    },
    nextStepTitle: {
      type: String,
      default: "Turn Mighty Couple into a gadget brand people trust"
    },
    nextStepDescription: {
      type: String,
      default:
        "Build trust with clear shipping policies, flexible payments, strong product pages, and a support channel buyers can rely on."
    }
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Mighty Couple Commerce Platform" },
    description: {
      type: String,
      default:
        "Shop phones, laptops, gadgets, and installment-ready deals from Mighty Couple."
    },
    socialImage: { type: String, default: "" }
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    orderPlaced: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    installmentDue: { type: Boolean, default: true },
    sellerSuspended: { type: Boolean, default: true },
    appealSubmitted: { type: Boolean, default: true },
    appealResolved: { type: Boolean, default: true }
  },
  { _id: false }
);

const policyLinksSchema = new mongoose.Schema(
  {
    privacyPolicyUrl: { type: String, default: "/privacy-policy" },
    shippingPolicyUrl: { type: String, default: "/shipping-policy" },
    returnPolicyUrl: { type: String, default: "/return-policy" },
    installmentTermsUrl: { type: String, default: "/installments" }
  },
  { _id: false }
);

const maintenanceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    message: {
      type: String,
      default: "We are making improvements and will be back shortly."
    },
    readOnly: { type: Boolean, default: false }
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    cartAdds: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 }
  },
  { _id: false }
);

const installmentSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      default: "weekly"
    },
    paymentCount: {
      type: Number,
      default: 8
    },
    downPaymentPercent: {
      type: Number,
      default: 10
    },
    serviceFeePercent: {
      type: Number,
      default: 0
    },
    gracePeriodDays: {
      type: Number,
      default: 3
    },
    releaseCondition: {
      type: String,
      enum: ["after_full_payment", "admin_approved_early_release"],
      default: "after_full_payment"
    },
    allowDeliveredOrdersRefund: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: "Mighty Couple",
      trim: true
    },
    logo: mediaSchema,
    banner: mediaSchema,
    heroImage: mediaSchema,
    backgroundImage: mediaSchema,
    favicon: mediaSchema,
    backgroundOverlay: {
      type: Number,
      default: 0.5
    },
    shipping: {
      type: shippingSchema,
      default: () => ({})
    },
    paymentOptions: {
      type: paymentOptionsSchema,
      default: () => ({})
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({})
    },
    orderRules: {
      type: orderRulesSchema,
      default: () => ({})
    },
    promotions: {
      type: promotionSchema,
      default: () => ({})
    },
    content: {
      type: contentSchema,
      default: () => ({})
    },
    seo: {
      type: seoSchema,
      default: () => ({})
    },
    notifications: {
      type: notificationSchema,
      default: () => ({})
    },
    policyLinks: {
      type: policyLinksSchema,
      default: () => ({})
    },
    maintenance: {
      type: maintenanceSchema,
      default: () => ({})
    },
    metrics: {
      type: metricsSchema,
      default: () => ({})
    },
    installment: {
      type: installmentSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);
